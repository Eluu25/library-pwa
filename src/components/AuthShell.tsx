import { ReactNode } from 'react'
import { Search, BookMarked, Clock, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from './ui'

export type AuthTab = 'signin' | 'signup'

export interface AuthShellProps {
  activeTab: AuthTab
  onTabChange: (tab: AuthTab) => void
  children: ReactNode
}

export default function AuthShell({
  activeTab,
  onTabChange,
  children,
}: AuthShellProps) {
  const features = [
    {
      icon: <Search className="w-5 h-5 text-brand-200" />,
      title: 'Catalog Search',
      desc: 'Browse hundreds of physical books with live copy availability on the shelf.',
    },
    {
      icon: <BookMarked className="w-5 h-5 text-gold-300" />,
      title: 'Easy Borrowing',
      desc: 'Quick loan requests and transparent daily rates for members.',
    },
    {
      icon: <Clock className="w-5 h-5 text-emerald-300" />,
      title: 'Due Dates & Renewals',
      desc: 'Clear loan tracking, automatic return dates, and fair penalty notifications.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-gold-200" />,
      title: 'Verified Members',
      desc: 'A secure, trusted community platform verified with Fayda National ID.',
    },
  ]

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row selection:bg-brand-500 selection:text-white">
      {/* ================================================================= */}
      {/* LEFT / TOP BRAND PANEL                                            */}
      {/* On desktop: full left panel. On mobile: compact top header.       */}
      {/* ================================================================= */}
      <aside className="w-full md:w-5/12 lg:w-1/2 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 text-white flex flex-col justify-between p-6 sm:p-8 lg:p-12 relative overflow-hidden shrink-0">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand logo & tagline */}
        <div className="relative z-10">
          <Logo size="md" light showSubtitle={false} />
          
          <div className="mt-6 md:mt-10 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-gold-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Community Lending Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Borrow, read, and grow with your community.
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-brand-100/90 leading-relaxed hidden sm:block">
              Making knowledge, textbooks, and literature accessible to every neighborhood reader.
            </p>
          </div>
        </div>

        {/* 4 Feature Points (shown on desktop, compact on mobile) */}
        <div className="relative z-10 my-8 hidden md:block">
          <div className="grid grid-cols-1 gap-4 max-w-lg">
            {features.map((feat, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-colors"
              >
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  {feat.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-brand-100/80 mt-0.5 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info (Desktop only) */}
        <div className="relative z-10 pt-4 border-t border-white/10 hidden md:flex items-center justify-between text-xs text-brand-200/70">
          <span>© 2026 Community Library</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Catalog & PWA Offline Ready
          </span>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* RIGHT / MAIN CARD CONTAINER                                       */}
      {/* ================================================================= */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Flag-colored strip: Green, Gold, Red */}
          <div className="flex h-2.5 w-full">
            <div className="flex-1 bg-brand-500" title="Green" />
            <div className="flex-1 bg-gold-500" title="Gold" />
            <div className="flex-1 bg-red-500" title="Red" />
          </div>

          <div className="p-6 sm:p-8">
            {/* Sign in / Sign up Switch */}
            <div className="flex p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/50">
              <button
                type="button"
                onClick={() => onTabChange('signin')}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 select-none ${
                  activeTab === 'signin'
                    ? 'bg-white text-brand-900 shadow-sm shadow-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onTabChange('signup')}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 select-none ${
                  activeTab === 'signup'
                    ? 'bg-white text-brand-900 shadow-sm shadow-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Dynamic Form Content */}
            <div>{children}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
