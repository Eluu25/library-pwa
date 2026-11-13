import { useState, useEffect } from 'react'
import { Search, RefreshCw, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import BookCard from './BookCard'
import BookDetailModal from './BookDetailModal'
import { BookCatalog } from '../../types'

export default function CatalogPage() {
  const { profile } = useAuth()
  const [books, setBooks] = useState<BookCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState<BookCatalog | null>(null)

  // 300ms debounce for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  async function fetchBooks() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('books_catalog')
        .select('*')
        .order('title')

      if (err) throw err
      setBooks(data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch catalog.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const filteredBooks = books.filter(book => {
    if (!debouncedSearch.trim()) return true
    const term = debouncedSearch.toLowerCase().trim()
    const matchesTitle = book.title?.toLowerCase().includes(term)
    const matchesAuthor = book.author?.toLowerCase().includes(term)
    return matchesTitle || matchesAuthor
  })

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Explore the library</h1>
        <p className="mt-1 text-sm text-slate-500">Find your next read from the community collection.</p>
      </div>
      {/* Top Bar / Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by title or author..."
            aria-label="Search books by title or author"
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-3 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>

        <button
          onClick={fetchBooks}
          disabled={loading}
          aria-label="Refresh catalog"
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading catalog...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-2xl p-6 text-center space-y-2">
          <p className="font-semibold text-sm">Failed to load catalog</p>
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={fetchBooks}
            className="mt-2 text-xs font-semibold underline text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 bg-white rounded-2xl border border-slate-100 p-8">
          <BookOpen className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No books found</p>
          <p className="text-xs text-slate-400">
            {searchTerm ? 'Try a different search term.' : 'The catalog is currently empty.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onViewDetail={setSelectedBook}
            />
          ))}
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          profile={profile}
          onClose={() => setSelectedBook(null)}
          onRefresh={fetchBooks}
        />
      )}
    </div>
  )
}
