# 📚 Community Library PWA

A modern, mobile-first **Progressive Web Application (PWA)** for community library management and digital reading. Built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL with Row-Level Security & Storage)**.

Combines traditional **physical book borrowing** with a secure, **in-app digital eBook reader** equipped with anti-screenshot watermarking and download prevention.

---

## ✨ Features

### 👤 Member Portal
- **Browse & Search Catalog:** Real-time search across physical books and digital editions with live copy availability and eBook badges.
- **Physical Book Borrowing:** Select loan duration (1–14 days), calculate daily rental fees dynamically, and submit mobile payment confirmation screenshots.
- **Smart Waitlist:** Join a waiting list when physical copies run out. Automatic FIFO hold system triggers when books are returned.
- **📖 Secure In-App eBook Reading:**
  - One-time digital fee unlocks **lifetime access** with no time limits.
  - Read directly inside the PWA on any device (phone, tablet, desktop).
  - Built-in full-screen reader with zoom controls, page jumps, and keyboard navigation.
- **Active Loans & Overdue Tracking:** Real-time tracking of due dates and automated daily penalty calculations for overdue returns.
- **Penalty Settlement:** In-app penalty payment submission with proof upload or cash payment recording by admins.
- **Account Verification:** Member signup with national Fayda ID photo submission for admin verification (no membership fee required).

### 🛠️ Admin Dashboard
- **Analytics & Key Metrics:** Live overview of total titles, active loans, overdue returns, member count, pending approvals, and rental/penalty/digital income.
- **Book & eBook Management:** Add, edit, and delete books with cover images and optional eBook PDF attachments (up to 50 MB) with custom digital pricing.
- **Payment Approvals:** Confirm payment receipts to activate loans or grant permanent digital eBook access.
- **Member Review & Verification:** View uploaded Fayda ID photos, approve new applications, reject with feedback, or remove accounts.
- **Returns & Lost Books:** Process returns, compute overdue penalties automatically, mark lost books with replacement charges, and record desk cash settlements.

---

## 🛡️ DRM & eBook Security Protections

To protect authors and publishers while keeping reading completely in-app:
- **Canvas-Based Rendering:** PDFs are rendered directly onto an HTML5 `<canvas>` via `pdfjs-dist` instead of native browser PDF viewers, eliminating browser "Save", "Download", and "Print" buttons.
- **Dynamic Watermarking:** Every page canvas is permanently burned with the member's full name, email, and *"Community Library • Non-Transferable"*. Any screenshot or camera photograph is tied directly to their personal identity.
- **Copy & Shortcut Blocking:** Right-click context menus (`onContextMenu`), text selection (`select-none`), and keyboard shortcuts (`Ctrl+P`, `Ctrl+S`, `Ctrl+U`) are blocked inside the reader.
- **Private Storage RLS:** The `book-pdfs` bucket is strictly private. Row-Level Security policies only permit signed URL generation for users with verified, confirmed digital purchases.

---

## 🏗️ Architecture & Storage

- **Row-Level Security (RLS):** All table operations are strictly protected. Client queries can only read permitted data.
- **Security Definer RPCs:** Critical operations (requesting loans, waitlist processing, payment approvals, digital access requests, loan returns) run via secure PostgreSQL server functions.
- **Storage Buckets:**
  - `book-covers`: Public read bucket for book cover images with admin-only upload permissions.
  - `book-pdfs`: Private bucket for eBook PDFs accessible only by confirmed purchasers via temporary signed URLs.
  - `fayda-ids`: Private, encrypted user folder storage for sensitive identification documents.
  - `payment-proofs`: Private storage for transaction screenshots accessible only by the owner and librarians.

---

## 🚀 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **eBook Reader:** PDF.js (`pdfjs-dist`) with HTML5 Canvas & security overlays
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
git clone https://github.com/Eluu25/library-pwa.git
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
   - `20261112000000_book_covers.sql` (Creates public book-covers storage bucket)
   - `20261112131800_member_identity_without_fee.sql` (Configures Fayda ID storage and verification RPCs)
   - `20261112163000_delete_member.sql` (Adds member removal capability for admins)
   - `20261113000000_digital_books.sql` (Enables eBook PDFs, digital access table, and security policies)
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
   https://eluu25.github.io/library-pwa/
   ```

---

## 📄 License
MIT
