-- =====================================================================
-- LIBRARY MANAGEMENT SYSTEM: Supabase schema (PostgreSQL)
-- Run ONCE on a fresh project: Supabase -> SQL Editor -> New query -> Run
--
-- Design rules
--   1. Clients can READ through RLS, but all important WRITES go through
--      SECURITY DEFINER functions (RPC). Members can never edit their own
--      role, status, loans, fees or penalties directly.
--   2. Money rules (10 ETB/day penalty, max days) live in `settings`,
--      so they can be changed without redeploying the app.
--   3. Files are private. Path convention: <user_id>/<filename>.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. OPTIONAL RESET (only if you ran the earlier Stage 1 schema).
--    Un-comment, run, then run the rest of the file.
-- ---------------------------------------------------------------------
-- drop view if exists public.book_availability cascade;
-- drop table if exists public.loans, public.books, public.profiles cascade;
-- drop policy if exists "upload own files" on storage.objects;
-- drop policy if exists "read own or admin" on storage.objects;

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS AND ENUMS
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;  -- fast search

create type public.user_role       as enum ('member', 'admin');
create type public.member_status   as enum ('pending', 'approved', 'rejected');
create type public.loan_status     as enum ('requested', 'active', 'returned', 'lost', 'rejected');
create type public.payment_type    as enum ('membership', 'loan', 'penalty');
create type public.payment_status  as enum ('pending', 'confirmed', 'rejected');
create type public.waitlist_status as enum ('waiting', 'notified', 'fulfilled', 'cancelled', 'expired');

-- ---------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------
create table public.settings (
  key         text primary key,
  value       text not null,
  description text
);
insert into public.settings(key, value, description) values
  ('penalty_per_day',     '10',  'Overdue penalty in ETB per day'),
  ('max_loan_days',       '14',  'Maximum days for one loan'),
  ('waitlist_hold_hours', '24',  'Hours a notified member can claim a returned book');

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text not null default '',
  phone           text not null default '',
  address         text not null default '',
  emergency_name  text not null default '',
  emergency_phone text not null default '',
  fayda_path      text,                                -- Storage path of the Fayda ID photo
  role            public.user_role     not null default 'member',
  status          public.member_status not null default 'pending',
  reject_reason   text,
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);
create unique index uniq_profiles_phone on public.profiles(phone) where phone <> '';

create table public.books (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  author            text not null,
  pub_year          int check (pub_year between 1000 and 2100),
  edition           text,                               -- '1st', '2nd', ...
  cover_url         text,
  price_per_day     numeric(10,2) not null default 0 check (price_per_day >= 0),
  replacement_price numeric(10,2) not null default 0 check (replacement_price >= 0),
  total_copies      int not null default 1 check (total_copies >= 0),
  created_at        timestamptz not null default now()
);
alter table public.books add column if not exists cover_url text;
create index idx_books_title_trgm  on public.books using gin (title  extensions.gin_trgm_ops);
create index idx_books_author_trgm on public.books using gin (author extensions.gin_trgm_ops);

create table public.loans (
  id             uuid primary key default gen_random_uuid(),
  book_id        uuid not null references public.books(id)    on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  days_requested int  not null check (days_requested >= 1),
  rental_fee     numeric(10,2) not null,
  status         public.loan_status not null default 'requested',
  requested_at   timestamptz not null default now(),
  start_date     date,              -- set when the admin confirms payment
  due_date       date,
  returned_at    date,
  penalty_amount numeric(10,2) not null default 0,   -- fixed when returned or lost
  penalty_settled boolean not null default false
);
-- a member can have only one open loan
create unique index one_open_loan_per_member on public.loans(user_id) where status in ('requested','active');
create index idx_loans_book_status on public.loans(book_id, status);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  loan_id       uuid references public.loans(id) on delete cascade,
  type          public.payment_type not null,
  amount        numeric(10,2) not null check (amount >= 0),
  method        text not null default 'mobile',        -- 'mobile' or 'cash'
  txn_id        text,
  proof_path    text,                                  -- Storage path of the screenshot
  status        public.payment_status not null default 'pending',
  reject_reason text,
  created_at    timestamptz not null default now(),
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz
);
-- the same transaction ID cannot be reused (rejected payments are ignored)
create unique index uniq_payment_txn on public.payments(lower(txn_id)) where txn_id is not null and status <> 'rejected';
create index idx_payments_status on public.payments(status);

create table public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id)    on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      public.waitlist_status not null default 'waiting',
  created_at  timestamptz not null default now(),
  notified_at timestamptz
);
create unique index one_active_waitlist_entry on public.waitlist(book_id, user_id) where status in ('waiting','notified');
create index idx_waitlist_queue on public.waitlist(book_id, status, created_at);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor      uuid,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.setting_num(k text) returns numeric
language sql stable security definer set search_path = public as
$$ select value::numeric from public.settings where key = k $$;

create or replace function public.log_action(p_action text, p_entity text, p_id uuid, p_details jsonb default null)
returns void language sql security definer set search_path = public as
$$ insert into public.audit_log(actor, action, entity, entity_id, details) values (auth.uid(), p_action, p_entity, p_id, p_details) $$;

-- Copies on the shelf = total - open loans - copies held for notified waiters
create or replace function public.free_copies(p_book uuid) returns int
language sql stable security definer set search_path = public as $$
  select greatest(
    b.total_copies
    - (select count(*) from public.loans l where l.book_id = b.id and l.status in ('requested','active'))
    - (select count(*) from public.waitlist w where w.book_id = b.id and w.status = 'notified'
         and w.notified_at > now() - make_interval(hours => public.setting_num('waitlist_hold_hours')::int)),
    0)::int
  from public.books b where b.id = p_book
$$;

-- Expire old holds, then notify the next waiters while copies are free
create or replace function public.advance_waitlist(p_book uuid) returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  update public.waitlist set status = 'expired'
   where book_id = p_book and status = 'notified'
     and notified_at <= now() - make_interval(hours => public.setting_num('waitlist_hold_hours')::int);
  loop
    exit when public.free_copies(p_book) < 1;
    select * into w from public.waitlist
     where book_id = p_book and status = 'waiting' order by created_at limit 1 for update skip locked;
    exit when not found;
    update public.waitlist set status = 'notified', notified_at = now() where id = w.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. VIEWS (what the app reads)
-- ---------------------------------------------------------------------
-- Catalog with live availability. Runs with owner rights on purpose, so members
-- can see aggregate counts without being able to read other members' loans.
create or replace view public.books_catalog as
select b.*,
       public.free_copies(b.id) as available_copies,
       (select count(*) from public.waitlist w where w.book_id = b.id and w.status = 'waiting')::int as waiting_count
from public.books b;

-- Loans with the live penalty. security_invoker => RLS of the caller applies.
create or replace view public.loans_detailed with (security_invoker = true) as
select l.*, b.title, b.author,
       case when l.status = 'active'
            then greatest(0, current_date - l.due_date) * public.setting_num('penalty_per_day')
            else l.penalty_amount end as penalty_due,
       (l.status = 'active' and l.due_date < current_date) as is_overdue
from public.loans l join public.books b on b.id = l.book_id;

-- ---------------------------------------------------------------------
-- 5. SIGN-UP TRIGGER (profile is created automatically)
--    The admin email below becomes the Admin/Librarian automatically.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare is_adm boolean := lower(new.email) = 'elihamsiraj369@gmail.com';
begin
  insert into public.profiles(id, email, full_name, phone, address, emergency_name, emergency_phone, role, status)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'phone', ''),
          coalesce(new.raw_user_meta_data->>'address', ''),
          coalesce(new.raw_user_meta_data->>'emergency_name', ''),
          coalesce(new.raw_user_meta_data->>'emergency_phone', ''),
          case when is_adm then 'admin'::public.user_role else 'member'::public.user_role end,
          case when is_adm then 'approved'::public.member_status else 'pending'::public.member_status end);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. MEMBER RPCs
-- ---------------------------------------------------------------------
-- Submit identity verification. Membership has no fee; payment is collected per loan.
create or replace function public.submit_member_verification(p_fayda text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in before submitting identity verification'; end if;
  if p_fayda is null or (storage.foldername(p_fayda))[1] <> auth.uid()::text then
    raise exception 'Fayda ID path must belong to the signed-in user';
  end if;
  if not exists (
    select 1 from storage.objects
     where bucket_id = 'fayda-ids' and name = p_fayda
  ) then
    raise exception 'Fayda ID file was not found in private storage';
  end if;
  update public.profiles
     set fayda_path = p_fayda, status = 'pending', reject_reason = null
   where id = auth.uid() and role = 'member' and status <> 'approved';
  if not found then raise exception 'Member profile not found or already approved'; end if;
  perform public.log_action('identity_submitted', 'profile', auth.uid());
end $$;

create or replace function public.request_loan(p_book uuid, p_days int, p_txn text, p_proof text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me public.profiles; b public.books; v_loan uuid; v_hold uuid; v_free int;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.status <> 'approved' then raise exception 'Your account is not approved yet'; end if;
  if p_days < 1 or p_days > public.setting_num('max_loan_days') then raise exception 'Invalid number of days'; end if;
  if exists(select 1 from public.loans where user_id = me.id and status in ('requested','active')) then
    raise exception 'You already have a book'; end if;
  if exists(select 1 from public.loans where user_id = me.id and status in ('returned','lost')
            and penalty_amount > 0 and not penalty_settled) then
    raise exception 'Settle your penalty first'; end if;

  select * into b from public.books where id = p_book for update;
  if not found then raise exception 'Book not found'; end if;

  select id into v_hold from public.waitlist
   where book_id = p_book and user_id = me.id and status = 'notified'
     and notified_at > now() - make_interval(hours => public.setting_num('waitlist_hold_hours')::int);
  v_free := public.free_copies(p_book) + case when v_hold is not null then 1 else 0 end;
  if v_free < 1 then raise exception 'No copies available. Join the waiting list.'; end if;

  insert into public.loans(book_id, user_id, days_requested, rental_fee)
  values (p_book, me.id, p_days, p_days * b.price_per_day) returning id into v_loan;
  insert into public.payments(user_id, loan_id, type, amount, txn_id, proof_path)
  values (me.id, v_loan, 'loan', p_days * b.price_per_day, p_txn, p_proof);
  if v_hold is not null then update public.waitlist set status = 'fulfilled' where id = v_hold; end if;
  perform public.log_action('loan_requested', 'loan', v_loan);
  return v_loan;
end $$;

create or replace function public.join_waitlist(p_book uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from public.profiles where id = auth.uid() and status = 'approved') then
    raise exception 'Your account is not approved yet'; end if;
  if public.free_copies(p_book) > 0 then raise exception 'Copies are available. Borrow it instead.'; end if;
  insert into public.waitlist(book_id, user_id) values (p_book, auth.uid());
end $$;

create or replace function public.leave_waitlist(p_book uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.waitlist set status = 'cancelled'
   where book_id = p_book and user_id = auth.uid() and status in ('waiting','notified');
  perform public.advance_waitlist(p_book);
end $$;

create or replace function public.submit_penalty_payment(p_loan uuid, p_txn text, p_proof text) returns void
language plpgsql security definer set search_path = public as $$
declare l public.loans;
begin
  select * into l from public.loans where id = p_loan and user_id = auth.uid();
  if not found or l.penalty_amount <= 0 or l.penalty_settled then raise exception 'No penalty to pay'; end if;
  insert into public.payments(user_id, loan_id, type, amount, txn_id, proof_path)
  values (auth.uid(), p_loan, 'penalty', l.penalty_amount, p_txn, p_proof);
end $$;

-- ---------------------------------------------------------------------
-- 7. ADMIN RPCs
-- ---------------------------------------------------------------------
create or replace function public.review_member(p_user uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles
     set status = (case when p_approve then 'approved' else 'rejected' end)::public.member_status,
         reject_reason = case when p_approve then null else p_reason end,
         approved_at = case when p_approve then now() end,
         approved_by = auth.uid()
   where id = p_user and role = 'member' and fayda_path is not null;
  if not found then raise exception 'Member not found or no ID uploaded'; end if;
  perform public.log_action(case when p_approve then 'member_approved' else 'member_rejected' end, 'profile', p_user, jsonb_build_object('reason', p_reason));
end $$;

-- Confirm or reject a loan payment or a penalty payment.
-- Confirming a LOAN payment starts the loan: start_date = today.
create or replace function public.review_payment(p_payment uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare pay public.payments; l public.loans;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into pay from public.payments where id = p_payment for update;
  if not found or pay.status <> 'pending' then raise exception 'Payment not found or already reviewed'; end if;
  if pay.type = 'membership' then raise exception 'Legacy membership payments are not supported'; end if;
  update public.payments
     set status = (case when p_approve then 'confirmed' else 'rejected' end)::public.payment_status,
         reject_reason = case when p_approve then null else p_reason end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_payment;
  select * into l from public.loans where id = pay.loan_id;
  if pay.type = 'loan' then
    if p_approve then
      update public.loans set status = 'active', start_date = current_date,
             due_date = current_date + days_requested where id = l.id;
    else
      update public.loans set status = 'rejected' where id = l.id;
      perform public.advance_waitlist(l.book_id);
    end if;
  elsif pay.type = 'penalty' and p_approve then
    update public.loans set penalty_settled = true where id = l.id;
  end if;
  perform public.log_action('payment_reviewed', 'payment', p_payment, jsonb_build_object('approved', p_approve));
end $$;

create or replace function public.return_loan(p_loan uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare l public.loans; pen numeric;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into l from public.loans where id = p_loan and status = 'active' for update;
  if not found then raise exception 'Active loan not found'; end if;
  pen := greatest(0, current_date - l.due_date) * public.setting_num('penalty_per_day');
  update public.loans set status = 'returned', returned_at = current_date,
         penalty_amount = pen, penalty_settled = (pen = 0) where id = p_loan;
  perform public.advance_waitlist(l.book_id);
  perform public.log_action('loan_returned', 'loan', p_loan, jsonb_build_object('penalty', pen));
  return pen;
end $$;

create or replace function public.mark_lost(p_loan uuid) returns numeric
language plpgsql security definer set search_path = public as $$
declare l public.loans; b public.books; pen numeric;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into l from public.loans where id = p_loan and status = 'active' for update;
  if not found then raise exception 'Active loan not found'; end if;
  select * into b from public.books where id = l.book_id for update;
  pen := b.replacement_price + greatest(0, current_date - l.due_date) * public.setting_num('penalty_per_day');
  update public.loans set status = 'lost', returned_at = current_date, penalty_amount = pen, penalty_settled = false where id = p_loan;
  update public.books set total_copies = greatest(total_copies - 1, 0) where id = b.id;
  perform public.advance_waitlist(b.id);
  perform public.log_action('loan_lost', 'loan', p_loan, jsonb_build_object('penalty', pen));
  return pen;
end $$;

-- Member paid the penalty in cash at the desk
create or replace function public.settle_penalty(p_loan uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l public.loans;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into l from public.loans where id = p_loan and penalty_amount > 0 and not penalty_settled for update;
  if not found then raise exception 'No unpaid penalty on this loan'; end if;
  insert into public.payments(user_id, loan_id, type, amount, method, status, reviewed_by, reviewed_at)
  values (l.user_id, l.id, 'penalty', l.penalty_amount, 'cash', 'confirmed', auth.uid(), now());
  update public.loans set penalty_settled = true where id = l.id;
  perform public.log_action('penalty_settled', 'loan', l.id);
end $$;

-- Dashboard numbers in one call
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare rate numeric := public.setting_num('penalty_per_day');
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'total_titles',        (select count(*) from public.books),
    'total_copies',        (select coalesce(sum(total_copies), 0) from public.books),
    'active_loans',        (select count(*) from public.loans where status = 'active'),
    'overdue_loans',       (select count(*) from public.loans where status = 'active' and due_date < current_date),
    'members',             (select count(*) from public.profiles where role = 'member' and status = 'approved'),
    'pending_members',     (select count(*) from public.profiles where role = 'member' and status = 'pending' and fayda_path is not null),
    'pending_payments',    (select count(*) from public.payments where status = 'pending' and type <> 'membership'),
    'penalties_collected', (select coalesce(sum(amount), 0) from public.payments where type = 'penalty' and status = 'confirmed'),
    'penalties_outstanding', (select coalesce(sum(case when status = 'active' then greatest(0, current_date - due_date) * rate else penalty_amount end), 0)
                               from public.loans where status = 'active' or (status in ('returned','lost') and penalty_amount > 0 and not penalty_settled)),
    'rental_income',       (select coalesce(sum(amount), 0) from public.payments where type = 'loan' and status = 'confirmed'),
    'checked_at',          now());
end $$;

-- Keep-alive: a tiny query the dashboard (or a scheduled GitHub Action) can call.
-- Also processes expired waiting-list holds.
create or replace function public.keep_alive() returns timestamptz
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select distinct book_id from public.waitlist where status in ('waiting','notified') loop
    perform public.advance_waitlist(r.book_id);
  end loop;
  return now();
end $$;

-- ---------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
--    RLS on + no INSERT/UPDATE policies on profiles, loans, payments and
--    waitlist = clients cannot write them directly. Only the RPCs above can.
-- ---------------------------------------------------------------------
alter table public.settings  enable row level security;
alter table public.profiles  enable row level security;
alter table public.books     enable row level security;
alter table public.loans     enable row level security;
alter table public.payments  enable row level security;
alter table public.waitlist  enable row level security;
alter table public.audit_log enable row level security;

create policy "settings read"       on public.settings  for select to authenticated using (true);
create policy "settings admin edit" on public.settings  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "profiles read own or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "books read"        on public.books for select to authenticated using (true);
create policy "books admin write" on public.books for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "loans read own or admin"    on public.loans    for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "payments read own or admin" on public.payments for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "waitlist read own or admin" on public.waitlist for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "audit admin read"           on public.audit_log for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 9. STORAGE BUCKETS
-- ---------------------------------------------------------------------
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('fayda-ids',      'fayda-ids',      false, 2097152, array['image/jpeg','image/png','image/webp']),
  ('payment-proofs', 'payment-proofs', false, 2097152, array['image/jpeg','image/png','image/webp']),
  ('book-covers',    'book-covers',    true,  2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "files: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('fayda-ids','payment-proofs') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "files: read own or admin" on storage.objects for select to authenticated
  using (bucket_id in ('fayda-ids','payment-proofs') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "files: admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('fayda-ids','payment-proofs') and public.is_admin());
create policy "book covers: public read" on storage.objects for select
  using (bucket_id = 'book-covers');
create policy "book covers: admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers' and public.is_admin());
create policy "book covers: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'book-covers' and public.is_admin())
  with check (bucket_id = 'book-covers' and public.is_admin());
create policy "book covers: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and public.is_admin());

-- ---------------------------------------------------------------------
-- 10. PERMISSIONS
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all functions in schema public from public, anon;
grant select on public.books_catalog, public.loans_detailed to authenticated;
grant execute on all functions in schema public to authenticated;
-- internal helpers: only other functions may call these
revoke execute on function public.log_action(text, text, uuid, jsonb) from authenticated;
revoke execute on function public.advance_waitlist(uuid)              from authenticated;
revoke execute on function public.handle_new_user()                   from authenticated;
grant execute on function public.submit_member_verification(text)      to authenticated;
-- the keep-alive ping may also be called without logging in
grant execute on function public.keep_alive() to anon;
