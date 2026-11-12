import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Clock, User } from 'lucide-react'

const tabs = [
  { label: 'Catalog', icon: BookOpen, path: '/' },
  { label: 'My Loans', icon: Clock, path: '/loans' },
  { label: 'Profile', icon: User, path: '/profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-gray-200 flex items-center z-30">
      {tabs.map(({ label, icon: Icon, path }) => {
        const isActive = location.pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-500' : 'text-gray-400'
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
