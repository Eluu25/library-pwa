import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Users, BookOpen, CreditCard, Library, LogOut, Menu, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

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
            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-500 text-white' : 'text-white/80 hover:bg-white/10'
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
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top bar */}
      <header className="bg-brand-700 text-white px-4 py-3 flex items-center justify-between shadow-md z-30">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-1 rounded hover:bg-white/10"
            onClick={() => setDrawerOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-bold text-base tracking-tight">📚 Community Library — Admin</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 bg-brand-700 py-4 px-3 gap-1 shrink-0">
          <NavItems />
        </aside>

        {/* Mobile drawer overlay */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-20 flex">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="relative z-10 flex flex-col w-56 bg-brand-700 py-4 px-3 gap-1 shadow-xl">
              <NavItems onClose={() => setDrawerOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
