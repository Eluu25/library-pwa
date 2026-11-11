# Library PWA: Step 2 setup

## 1. Create the Vite project (first time only)
```bash
npm create vite@latest library-pwa -- --template react-ts
cd library-pwa
npm install
npm install react-router-dom @supabase/supabase-js lucide-react
npm install tailwindcss @tailwindcss/vite
npm install -D vite-plugin-pwa
```

## 2. Copy the files from this folder INTO the project
Overwrite when asked: `vite.config.ts`, `index.html`, `src/index.css`, `src/vite-env.d.ts`,
`src/main.tsx`, `src/App.tsx`. Also copy `src/lib/`, the empty `src/` folders,
`supabase/`, `.github/`, and `.env.example`.

## 3. Environment
Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.

## 4. Icons
Put `pwa-192.png` and `pwa-512.png` in `public/` (rename icon-192.png and icon-512.png
from your decision-spinner repo).

## 5. Run
```bash
npm run dev       # should show "Setup works."
npm run build     # must pass with no errors
npm run preview   # check the PWA install button
```

## 6. Deploy
- Repo name must match `BASE` in `vite.config.ts` (default `library-pwa`).
- GitHub -> Settings -> Secrets and variables -> Actions: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- GitHub -> Settings -> Pages -> Source: **GitHub Actions**.
- Supabase -> Authentication -> URL Configuration: set Site URL to `https://eluu25.github.io/library-pwa/`.
