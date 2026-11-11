import { useEffect, useState, useCallback, FormEvent } from 'react'
import { Plus, Pencil, Trash2, Library, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Book {
  id: string
  title: string
  author: string
  pub_year: number | null
  edition: string | null
  price_per_day: number
  replacement_price: number
  total_copies: number
  created_at: string
}

interface BookCatalog extends Book {
  available_copies: number
  waiting_count: number
}

interface BookFormData {
  title: string
  author: string
  pub_year: string
  edition: string
  total_copies: number
  price_per_day: number
  replacement_price: number
}

const initialForm: BookFormData = {
  title: '',
  author: '',
  pub_year: '',
  edition: '',
  total_copies: 1,
  price_per_day: 10,
  replacement_price: 300,
}

export default function BooksPage() {
  const [books, setBooks] = useState<BookCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BookFormData>(initialForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('books_catalog')
      .select('*')
      .order('title')
    if (err) setError(err.message)
    else setBooks((data as BookCatalog[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  const openAdd = () => {
    setEditingId(null)
    setForm(initialForm)
    setIsModalOpen(true)
  }

  const openEdit = (b: BookCatalog) => {
    setEditingId(b.id)
    setForm({
      title: b.title,
      author: b.author,
      pub_year: b.pub_year !== null && b.pub_year !== undefined ? String(b.pub_year) : '',
      edition: b.edition ?? '',
      total_copies: b.total_copies,
      price_per_day: b.price_per_day,
      replacement_price: b.replacement_price,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return
    const { error: err } = await supabase.from('books').delete().eq('id', id)
    if (err) {
      alert('Error deleting book: ' + err.message)
    } else {
      fetchBooks()
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      pub_year: form.pub_year.trim() ? parseInt(form.pub_year.trim(), 10) : null,
      edition: form.edition.trim() ? form.edition.trim() : null,
      total_copies: Number(form.total_copies),
      price_per_day: Number(form.price_per_day),
      replacement_price: Number(form.replacement_price),
    }

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('books')
          .update(payload)
          .eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('books')
          .insert(payload)
        if (err) throw err
      }

      setIsModalOpen(false)
      fetchBooks()
    } catch (err: unknown) {
      alert('Error saving book: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700 flex items-center gap-2">
          <Library className="h-5 w-5" /> Books Management
        </h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Book
        </button>
      </div>

      {error && <div className="text-red-600 bg-red-50 rounded-xl p-3 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-5 w-5 rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-slate-500 text-sm bg-white rounded-xl p-6 text-center">
          No books found in the catalog. Click "Add Book" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {books.map(b => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-800 text-base">{b.title}</h2>
                  <div className="text-sm text-slate-500">by {b.author}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-1">
                    {b.pub_year && <span>Published: {b.pub_year}</span>}
                    {b.edition && <span>• Edition: {b.edition}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(b)}
                    className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Book"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id, b.title)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Book"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block">Available / Total:</span>
                  <span className="font-semibold text-slate-700">
                    <span className={b.available_copies > 0 ? 'text-green-600' : 'text-red-500'}>
                      {b.available_copies}
                    </span>{' '}
                    / {b.total_copies}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Waiting Count:</span>
                  <span className="font-medium text-slate-700">{b.waiting_count ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Price / Day:</span>
                  <span className="font-medium text-slate-700">{b.price_per_day} ETB</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Replacement:</span>
                  <span className="font-medium text-slate-700">{b.replacement_price} ETB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-brand-700">
                {editingId ? 'Edit Book' : 'Add New Book'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Oromay"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Author *
                </label>
                <input
                  type="text"
                  required
                  value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Baalu Girma"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    value={form.pub_year}
                    onChange={e => setForm({ ...form, pub_year: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. 1983"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Edition
                  </label>
                  <input
                    type="text"
                    value={form.edition}
                    onChange={e => setForm({ ...form, edition: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. 1st or Hardcover"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Copies *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.total_copies}
                    onChange={e => setForm({ ...form, total_copies: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fee / Day (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={form.price_per_day}
                    onChange={e => setForm({ ...form, price_per_day: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Replace (ETB) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={form.replacement_price}
                    onChange={e => setForm({ ...form, replacement_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-brand-700 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Book' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
