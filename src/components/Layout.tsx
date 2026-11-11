import { LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import BottomNav from './BottomNav'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-paper font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 h-14 px-4 bg-brand-700 text-white flex items-center justify-between shadow-sm">
        <span className="font-semibold text-base">📚 Community Library</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={20} />
        </button>
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
