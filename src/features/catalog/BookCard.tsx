// Types mirrored from src/types/index.ts
interface BookCatalog {
  id: string; title: string; author: string; pub_year: number | null
  edition: string | null; price_per_day: number; replacement_price: number
  total_copies: number; created_at: string
  available_copies: number; waiting_count: number
}

interface BookCardProps {
  book: BookCatalog
  onViewDetail: (book: BookCatalog) => void
}

export default function BookCard({ book, onViewDetail }: BookCardProps) {
  const available = book.available_copies > 0

  return (
    <div
      onClick={() => onViewDetail(book)}
      className="cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-2 border border-slate-100 active:scale-95 transition-transform"
    >
      {/* Availability badge */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            available
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {available ? 'Available' : 'Unavailable'}
        </span>
        {book.waiting_count > 0 && (
          <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {book.waiting_count} waiting
          </span>
        )}
      </div>

      {/* Title & Author */}
      <div>
        <h3 className="font-semibold text-slate-800 leading-snug line-clamp-2">{book.title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{book.author}</p>
      </div>

      {/* Year / Edition */}
      {(book.pub_year || book.edition) && (
        <p className="text-xs text-slate-400">
          {[book.pub_year, book.edition ? `${book.edition} ed.` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {/* Price */}
      <div className="mt-auto pt-2 border-t border-slate-100">
        <span className="text-sm font-semibold text-brand-700">
          {book.price_per_day} ETB
        </span>
        <span className="text-xs text-slate-400"> / day</span>
      </div>
    </div>
  )
}
