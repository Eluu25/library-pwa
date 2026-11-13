import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Users, BookOpen, CreditCard, Library, LogOut, Menu, X, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import InstallButton from '../../components/InstallButton'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/admin/members', label: 'Members', icon: Users, end: false },
  { to: '/admin/loans', label: 'Loans', icon: BookOpen, end: false },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard, end: false },
  { to: '/admin/books', label: 'Books', icon: Library, end: false },
]

function NavItems({ onClose }: { onClose?: () => void }) {
  return (
    <>
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-50 text-brand-800 shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </>
  )
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            onClick={() => setDrawerOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold tracking-tight text-slate-900">Community Library</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Administration</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InstallButton />
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 p-4 shrink-0">
          <p className="px-3.5 pb-3 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
          <nav className="flex flex-col gap-1">
            <NavItems />
          </nav>
          <div className="mt-auto rounded-2xl bg-brand-50 p-4">
            <ShieldCheck className="h-5 w-5 text-brand-700" />
            <p className="mt-2 text-sm font-semibold text-slate-800">Member-first library</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Review identity documents before approving new applications.</p>
          </div>
        </aside>

        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="relative z-10 flex flex-col w-72 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between px-2 pb-5">
                <span className="font-bold text-slate-900">Navigation</span>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                <NavItems onClose={() => setDrawerOpen(false)} />
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
          <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
