import { LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import BottomNav from './BottomNav'
import InstallButton from './InstallButton'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-paper font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 px-4 sm:px-6 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 p-1 shadow-sm border border-slate-700/50">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Liora" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">Liora</span>
        </div>
        <div className="flex items-center gap-2">
          <InstallButton />
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
