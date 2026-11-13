import { BookOpen, Users, Sparkles } from 'lucide-react'
import { BookCatalog } from '../../types'

interface BookCardProps {
  book: BookCatalog
  onViewDetail: (book: BookCatalog) => void
}

export default function BookCard({ book, onViewDetail }: BookCardProps) {
  const available = book.available_copies > 0
  const hasDigital = !!book.pdf_path

  return (
    <button
      type="button"
      onClick={() => onViewDetail(book)}
      className="w-full cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden flex flex-col border border-slate-200/80 text-left"
    >
      <div className="relative h-44 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        ) : <BookOpen className="h-14 w-14 text-brand-300" />}
        <span className={`absolute left-3 top-3 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm ${
          available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
        }`}>
          {available ? 'Available' : 'Unavailable'}
        </span>
        {book.waiting_count > 0 && (
          <span className="absolute right-3 top-3 text-xs text-slate-700 bg-white/90 rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
            <Users className="h-3.5 w-3.5" /> {book.waiting_count} waiting
          </span>
        )}
      </div>

      {/* Title & Author */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <h3 className="font-semibold text-slate-800 leading-snug line-clamp-2">{book.title}</h3>
        </div>
        <p className="text-sm text-slate-500">{book.author}</p>
      </div>

      {/* Year / Edition */}
      {(book.pub_year || book.edition) && (
        <p className="px-4 text-xs text-slate-400">
          {[book.pub_year, book.edition ? `${book.edition} ed.` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {/* Pricing / Badges */}
      <div className="mt-auto px-4 py-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-brand-700">
            {book.price_per_day} ETB
          </span>
          <span className="text-xs text-slate-400"> / day</span>
        </div>
        {hasDigital && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <Sparkles className="h-3 w-3 text-emerald-500" /> eBook
          </span>
        )}
      </div>
    </button>
  )
}
