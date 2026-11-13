-- =====================================================================
-- DIGITAL BOOKS (eBooks) & LIFETIME IN-APP READING ACCESS
-- =====================================================================

-- 1. Add pdf_path and digital_price to books
alter table public.books
  add column if not exists pdf_path text,
  add column if not exists digital_price numeric(10,2) not null default 0 check (digital_price >= 0);

-- 2. Add book_id to payments table (for digital purchases)
alter table public.payments
  add column if not exists book_id uuid references public.books(id) on delete set null;

-- 3. Update payment_type enum to include 'digital'
alter type public.payment_type add value if not exists 'digital';

-- 4. Create table for permanent digital access
create table if not exists public.digital_access (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  book_id    uuid not null references public.books(id)    on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  granted_at timestamptz not null default now(),
  constraint one_digital_access_per_user_book unique(user_id, book_id)
);

create index if not exists idx_digital_access_user on public.digital_access(user_id);
create index if not exists idx_digital_access_book on public.digital_access(book_id);

alter table public.digital_access enable row level security;

drop policy if exists "digital_access read own or admin" on public.digital_access;
create policy "digital_access read own or admin" on public.digital_access
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- 5. Recreate books_catalog view to expose pdf_path and digital_price
drop view if exists public.books_catalog cascade;
create or replace view public.books_catalog as
select b.*,
       public.free_copies(b.id) as available_copies,
       (select count(*) from public.waitlist w where w.book_id = b.id and w.status = 'waiting')::int as waiting_count
from public.books b;

grant select on public.books_catalog to authenticated;

-- 6. Setup private storage bucket for PDFs
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-pdfs',
  'book-pdfs',
  false,
  52428800, -- 50 MB
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies:
-- Admins can insert, update, delete PDFs
drop policy if exists "book pdfs: admin write" on storage.objects;
create policy "book pdfs: admin write" on storage.objects for all to authenticated
  using (bucket_id = 'book-pdfs' and public.is_admin())
  with check (bucket_id = 'book-pdfs' and public.is_admin());

-- Members can only select/read if they have confirmed digital_access (or if admin)
drop policy if exists "book pdfs: read for permitted users" on storage.objects;
create policy "book pdfs: read for permitted users" on storage.objects for select to authenticated
  using (
    bucket_id = 'book-pdfs' and (
      public.is_admin() or
      exists (
        select 1 from public.digital_access da
        join public.books b on b.id = da.book_id
        where da.user_id = auth.uid()
          and b.pdf_path = storage.objects.name
      )
    )
  );

-- 7. RPC to request digital access (one-time purchase)
create or replace function public.request_digital_access(p_book uuid, p_txn text, p_proof text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare me public.profiles; b public.books; v_pay uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null or me.status <> 'approved' then
    raise exception 'Your account is not approved yet';
  end if;

  select * into b from public.books where id = p_book;
  if not found then
    raise exception 'Book not found';
  end if;

  if b.pdf_path is null then
    raise exception 'This book does not have an online digital edition';
  end if;

  if exists(select 1 from public.digital_access where user_id = me.id and book_id = p_book) then
    raise exception 'You already have lifetime online access to this book';
  end if;

  if exists(
    select 1 from public.payments
     where user_id = me.id and book_id = p_book and type = 'digital' and status = 'pending'
  ) then
    raise exception 'You already have a pending payment for this book. Please wait for admin approval.';
  end if;

  insert into public.payments(user_id, book_id, type, amount, txn_id, proof_path)
  values (me.id, p_book, 'digital', b.digital_price, p_txn, p_proof)
  returning id into v_pay;

  perform public.log_action('digital_access_requested', 'book', p_book, jsonb_build_object('payment_id', v_pay, 'amount', b.digital_price));
  return v_pay;
end $$;

revoke all on function public.request_digital_access(uuid, text, text) from public, anon;
grant execute on function public.request_digital_access(uuid, text, text) to authenticated;

-- 8. Update review_payment to handle 'digital' type
create or replace function public.review_payment(p_payment uuid, p_approve boolean, p_reason text default null)
returns void
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

  if pay.type = 'loan' then
    select * into l from public.loans where id = pay.loan_id;
    if p_approve then
      update public.loans set status = 'active', start_date = current_date,
             due_date = current_date + days_requested where id = l.id;
    else
      update public.loans set status = 'rejected' where id = l.id;
      perform public.advance_waitlist(l.book_id);
    end if;
  elsif pay.type = 'penalty' and p_approve then
    update public.loans set penalty_settled = true where id = pay.loan_id;
  elsif pay.type = 'digital' and p_approve then
    insert into public.digital_access(user_id, book_id, payment_id)
    values (pay.user_id, pay.book_id, pay.id)
    on conflict (user_id, book_id) do update set payment_id = excluded.payment_id;
  end if;

  perform public.log_action('payment_reviewed', 'payment', p_payment, jsonb_build_object('approved', p_approve, 'type', pay.type));
end $$;
