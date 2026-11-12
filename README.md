# 📚 Community Library PWA

A modern, mobile-first **Progressive Web Application (PWA)** for community library management. Built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL with Row-Level Security)**.

---

## ✨ Features

### 👤 Member Portal
- **Browse & Search Catalog:** Real-time search across book titles, authors, and editions with live copy availability counts.
- **Book Details & Cover Art:** View book metadata, daily rental fees, replacement costs, and cover previews.
- **Borrowing Workflow:** Select borrowing duration (1–14 days), calculate rental fees dynamically, and submit mobile payment confirmation screenshots.
- **Active Loans & Overdue Tracking:** Real-time tracking of due dates, active status, and automated daily penalty calculations for overdue returns.
- **Smart Waitlist:** Join a waiting list when copies run out. Automatic FIFO hold system triggers when books are returned.
- **Penalty Settlement:** In-app penalty payment submission with proof upload or cash payment recording by admins.
- **Account Verification:** Member signup with national Fayda ID photo submission for admin verification (no membership fee required).

### 🛠️ Admin Dashboard
- **Analytics & Key Metrics:** Live overview of total titles, active loans, overdue returns, member count, pending approvals, and rental/penalty income.
- **Book Catalog Management:** Add, edit, and delete books with cover images uploaded to secure Supabase Storage.
- **Member Review & Identity Verification:** View uploaded Fayda ID photos, approve new applications, reject with feedback, or remove accounts.
- **Loan Approvals:** Confirm payment receipts to activate loans, reject unverified payments, and track active borrowers.
- **Returns & Lost Books:** Process returns, compute overdue penalties automatically, mark lost books with replacement charges, and record desk cash settlements.

---

## 🏗️ Architecture & Security

- **Row-Level Security (RLS):** All table operations are strictly protected. Client queries can only read permitted data.
- **Security Definer RPCs:** Critical operations (requesting loans, waitlist processing, payment approvals, loan returns) run via secure PostgreSQL server functions.
- **Private & Public Storage Buckets:**
  - `book-covers`: Public read bucket for book cover images with admin-only upload permissions.
  - `fayda-ids`: Private, encrypted user folder storage for sensitive identification documents.
  - `payment-proofs`: Private storage for transaction screenshots accessible only by the owner and librarians.

---

## 🚀 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Lucide Icons
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **PWA Support:** Vite Plugin PWA with offline caching & installable web manifest

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- A **Supabase** project account ([supabase.com](https://supabase.com))

### 2. Installation
```bash
git clone https://github.com/YOUR_USERNAME/library-pwa.git
cd library-pwa
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Database Setup (Supabase)
1. Open your project on **Supabase Dashboard → SQL Editor**.
2. Run `supabase/schema.sql` to initialize tables, types, RLS policies, and RPC functions.
3. Run each migration file in `supabase/migrations/` in chronological order:
   - `20261112000000_book_covers.sql` (Creates the `book-covers` storage bucket and cover policies)
   - `20261112131800_member_identity_without_fee.sql` (Configures Fayda ID storage and verification RPCs)
   - `20261112163000_delete_member.sql` (Adds member removal capability for admins)
4. In **Supabase → Authentication → Providers → Email**, turn off **Confirm email**.

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173/library-pwa/](http://localhost:5173/library-pwa/) in your browser.

---

## 🌐 Deployment to GitHub Pages

This project is pre-configured with a GitHub Actions workflow (`.github/workflows/deploy.yml`) to automatically build and deploy the PWA to GitHub Pages on every push to `main`.

1. Go to your repository settings on GitHub: **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Under **Settings → Secrets and variables → Actions**, add your repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Supabase Dashboard: **Authentication → URL Configuration**, add your GitHub Pages deployment URL to **Redirect URLs**:
   ```
   https://YOUR_USERNAME.github.io/library-pwa/
   ```

---

## 📄 License
MIT
