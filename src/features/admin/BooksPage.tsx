import { useEffect, useState, useCallback, FormEvent, useRef } from 'react'
import { Plus, Pencil, Trash2, Library, X, Image, BookOpen, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ToastProvider'

interface Book {
  id: string
  title: string
  author: string
  pub_year: number | null
  edition: string | null
  price_per_day: number
  replacement_price: number
  total_copies: number
  cover_url: string | null
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
  const { notify } = useToast()
  const [books, setBooks]           = useState<BookCatalog[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState<BookFormData>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [coverFile, setCoverFile]   = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const openAdd = () => {
    setError(null)
    setEditingId(null)
    setForm(initialForm)
    setCoverFile(null)
    setCoverPreview(null)
    setExistingCoverUrl(null)
    setIsModalOpen(true)
  }

  const openEdit = (b: BookCatalog) => {
    setError(null)
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
    setCoverFile(null)
    setCoverPreview(null)
    setExistingCoverUrl(b.cover_url ?? null)
    setIsModalOpen(true)
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) {
      setError('Book covers must be JPG, PNG, or WebP images no larger than 2 MB.')
      e.target.value = ''
      setCoverFile(null)
      setCoverPreview(null)
      return
    }
    setError(null)
    setCoverFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = ev => setCoverPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setCoverPreview(null)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    const { error: err } = await supabase.from('books').delete().eq('id', id)
    if (err) notify('error', 'Could not delete book', err.message)
    else {
      notify('success', 'Book deleted', `"${title}" was removed from the catalog.`)
      fetchBooks()
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const year = form.pub_year.trim() ? Number(form.pub_year) : null
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.author.trim()) { setError('Author is required.'); return }
    if (!Number.isInteger(form.total_copies) || form.total_copies < 1) {
      setError('Copies must be a whole number greater than zero.')
      return
    }
    if (!Number.isFinite(form.price_per_day) || form.price_per_day < 0 ||
        !Number.isFinite(form.replacement_price) || form.replacement_price < 0) {
      setError('Fees and replacement price must be valid non-negative amounts.')
      return
    }
    if (year !== null && (!Number.isInteger(year) || year < 1000 || year > 2100)) {
      setError('Publication year must be between 1000 and 2100.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      let coverUrlFinal: string | null = existingCoverUrl ?? null

      if (coverFile) {
        const ext = coverFile.type === 'image/jpeg' ? 'jpg' : coverFile.type.split('/')[1]
        const path = `covers/${Date.now()}_${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('book-covers')
          .upload(path, coverFile, { upsert: true })
        if (uploadErr) throw new Error('Cover upload failed: ' + uploadErr.message)
        const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(path)
        coverUrlFinal = urlData.publicUrl
      }

      const payload = {
        title:             form.title.trim(),
        author:            form.author.trim(),
        pub_year:          year,
        edition:           form.edition.trim() ? form.edition.trim() : null,
        total_copies:      Number(form.total_copies),
        price_per_day:     Number(form.price_per_day),
        replacement_price: Number(form.replacement_price),
        cover_url:         coverUrlFinal,
      }

      if (editingId) {
        const { error: err } = await supabase.from('books').update(payload).eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('books').insert(payload)
        if (err) throw err
      }

      setIsModalOpen(false)
      notify('success', editingId ? 'Book updated' : 'Book added', `${payload.title} was saved to the catalog.`)
      fetchBooks()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(
        message.toLowerCase().includes('bucket not found')
          ? 'Supabase setup required: the "book-covers" storage bucket is missing. In Supabase, open SQL Editor, run supabase/migrations/20261112000000_book_covers.sql, then retry. Your book details and selected image are still here.'
          : 'Error saving book: ' + message
      )
    } finally {
      setSubmitting(false)
    }
  }

  const displayedBooks = books.filter(b =>
    !searchQuery ||
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Library className="h-5 w-5 text-brand-600" /> Books
          </h1>
          <p className="mt-1 text-sm text-slate-500">Manage titles, cover art, copies, and borrowing fees.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Book
        </button>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search by title or author…"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        aria-label="Search books by title or author"
        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
      />

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : displayedBooks.length === 0 ? (
        <div className="text-slate-500 text-sm bg-white rounded-xl p-8 text-center border border-slate-100">
          <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          {searchQuery ? 'No books match your search.' : 'No books yet. Click "Add Book" to get started.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedBooks.map(b => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              {/* Cover image */}
              <div className="relative h-40 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center overflow-hidden">
                {b.cover_url ? (
                  <img
                    src={b.cover_url}
                    alt={b.title}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <BookOpen className="h-14 w-14 text-brand-300" />
                )}
                {/* Copy badge */}
                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ${
                  b.available_copies > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {b.available_copies}/{b.total_copies}
                </span>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1 gap-2">
                <div>
                  <h2 className="font-bold text-slate-800 leading-tight line-clamp-2">{b.title}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">by {b.author}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-1">
                    {b.pub_year && <span>{b.pub_year}</span>}
                    {b.edition && <span>• {b.edition}</span>}
                  </div>
                </div>

                <div className="flex gap-3 text-xs mt-auto pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Fee/Day</span>
                    <span className="font-semibold text-slate-700">{b.price_per_day} ETB</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Replace</span>
                    <span className="font-semibold text-slate-700">{b.replacement_price} ETB</span>
                  </div>
                  {b.waiting_count > 0 && (
                    <div>
                      <span className="text-slate-400 block">Waiting</span>
                      <span className="font-semibold text-amber-600">{b.waiting_count}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEdit(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-medium transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b.id, b.title)}
                    className="flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-brand-700">
                {editingId ? 'Edit Book' : 'Add New Book'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {/* Cover image upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Book Cover Photo
                </label>
                <button
                  type="button"
                  aria-label="Choose a book cover image"
                  className="relative w-full border-2 border-dashed border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-brand-400 transition-colors group text-left"
                  style={{ height: '140px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {coverPreview || existingCoverUrl ? (
                    <>
                      <img
                        src={coverPreview ?? existingCoverUrl ?? ''}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium flex items-center gap-1.5">
                          <Image className="h-4 w-4" /> Change Cover
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                      <Image className="h-8 w-8" />
                      <span className="text-sm">Click to upload cover image</span>
                      <span className="text-xs">JPG, PNG up to 2MB</span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
                {coverFile && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Image className="h-3 w-3" /> {coverFile.name}
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Oromay"
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Author *</label>
                <input
                  type="text"
                  required
                  value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Baalu Girma"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Year</label>
                  <input
                    type="number"
                    value={form.pub_year}
                    onChange={e => setForm({ ...form, pub_year: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. 1983"
                    min={1000}
                    max={2100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Edition</label>
                  <input
                    type="text"
                    value={form.edition}
                    onChange={e => setForm({ ...form, edition: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. 1st"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Copies *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.total_copies}
                    onChange={e => setForm({ ...form, total_copies: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Fee/Day *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={form.price_per_day}
                    onChange={e => setForm({ ...form, price_per_day: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wide">Replace *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={form.replacement_price}
                    onChange={e => setForm({ ...form, replacement_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  className="px-5 py-2 text-sm font-semibold bg-brand-700 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50"
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
