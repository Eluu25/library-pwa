import { lazy, Suspense, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import Spinner from './components/Spinner'
import Layout from './components/Layout'
import { supabase } from './lib/supabase'
import { ToastProvider, useToast } from './components/ToastProvider'

// Lazy imports for all feature pages
const AuthPage = lazy(() => import('./features/auth/AuthPage'))
const ProfileSetupPage = lazy(() => import('./features/auth/ProfileSetupPage'))
const CatalogPage = lazy(() => import('./features/catalog/CatalogPage'))
const MyLoansPage = lazy(() => import('./features/loans/MyLoansPage'))
const AdminLayout = lazy(() => import('./features/admin/AdminLayout'))
const DashboardPage = lazy(() => import('./features/admin/DashboardPage'))
const MembersPage = lazy(() => import('./features/admin/MembersPage'))
const LoansPage = lazy(() => import('./features/admin/LoansPage'))
const PaymentsPage = lazy(() => import('./features/admin/PaymentsPage'))
const BooksPage = lazy(() => import('./features/admin/BooksPage'))

function ProfilePage() {
  const { profile } = useAuth()
  return (
    <Layout>
      <div className="p-4 space-y-3">
        <h2 className="text-xl font-bold text-brand-700">My Profile</h2>
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2 text-sm">
          <p><span className="font-medium">Name:</span> {profile?.full_name}</p>
          <p><span className="font-medium">Email:</span> {profile?.email}</p>
          <p><span className="font-medium">Phone:</span> {profile?.phone}</p>
          <p><span className="font-medium">Address:</span> {profile?.address}</p>
          <p><span className="font-medium">Status:</span> {profile?.status}</p>
        </div>
      </div>
    </Layout>
  )
}

function AppRoutes() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const { notify } = useToast()
  const previousStatus = useRef<{ userId: string; status: string } | null>(null)
  // useLocation is consumed here to satisfy react-router context
  useLocation()

  useEffect(() => {
    if (!session?.user.id || profile?.id !== session.user.id || !profile.status) return

    const previous = previousStatus.current
    if (previous?.userId === profile.id && previous.status === 'pending') {
      if (profile.status === 'approved') {
        notify('success', 'Application approved', 'Your account is approved. You can now borrow books.')
      } else if (profile.status === 'rejected') {
        notify('error', 'Application update', profile.reject_reason || 'Your application was not approved.')
      }
    }

    previousStatus.current = { userId: profile.id, status: profile.status }
  }, [notify, profile, session?.user.id])

  useEffect(() => {
    if (!session?.user.id || profile?.status !== 'pending') return
    const timer = window.setInterval(() => { void refreshProfile() }, 30000)
    return () => window.clearInterval(timer)
  }, [profile?.status, refreshProfile, session?.user.id])

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // 2. No session — only /auth accessible
  if (!session) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    )
  }

  // 3. Session but profile not yet submitted (no fayda_path)
  if (profile?.status === 'pending' && !profile?.fayda_path) {
    return (
      <Routes>
        <Route path="/setup" element={<ProfileSetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  // 4. Pending with fayda uploaded — Under Review
  if (profile?.status === 'pending' && profile?.fayda_path) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-5xl">⏳</div>
        <h1 className="text-2xl font-bold text-brand-700">Application Under Review</h1>
        <p className="text-slate-600 text-center">
          Your membership application is being reviewed. We'll notify you soon.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-brand-500 underline text-sm"
        >
          Sign out
        </button>
      </div>
    )
  }

  // 5. Rejected
  if (profile?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-5xl">❌</div>
        <h1 className="text-2xl font-bold text-red-700">Application Rejected</h1>
        <p className="text-slate-600 text-center">
          {profile.reject_reason ?? 'Your application was not approved.'}
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-brand-500 underline text-sm"
        >
          Sign out
        </button>
      </div>
    )
  }

  // 6. Approved admin
  if (profile?.role === 'admin' && profile?.status === 'approved') {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="books" element={<BooksPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  // 7. Approved member
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <CatalogPage />
          </Layout>
        }
      />
      <Route
        path="/loans"
        element={
          <Layout>
            <MyLoansPage />
          </Layout>
        }
      />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="min-h-screen bg-paper flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          }
        >
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </ToastProvider>
  )
}
