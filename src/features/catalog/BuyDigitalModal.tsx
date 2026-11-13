import { useState, useRef } from 'react'
import { X, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ToastProvider'
import { BookCatalog, Profile } from '../../types'

interface BuyDigitalModalProps {
  book: BookCatalog
  profile: Profile
  onClose: () => void
  onSuccess: () => void
}

export default function BuyDigitalModal({
  book,
  profile,
  onClose,
  onSuccess,
}: BuyDigitalModalProps) {
  const { notify } = useToast()
  const [txnId, setTxnId] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!txnId.trim()) {
      setError('Transaction ID is required.')
      return
    }
    if (!proofFile) {
      setError('Please attach your payment screenshot.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Upload payment screenshot to private payment-proofs bucket
      const ext = proofFile.name.split('.').pop() || 'jpg'
      const path = `${profile.id}/${Date.now()}_digital_${book.id}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, proofFile)

      if (uploadErr) throw new Error(uploadErr.message)

      // 2. Call RPC to request digital access
      const { error: rpcErr } = await supabase.rpc('request_digital_access', {
        p_book: book.id,
        p_txn: txnId.trim(),
        p_proof: path,
      })

      if (rpcErr) throw new Error(rpcErr.message)

      setSuccess(true)
      notify('success', 'Payment submitted', 'Your digital reading request is waiting for admin confirmation.')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[75] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2 text-emerald-800">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold">Unlock eBook Edition</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Book Summary */}
          <div className="bg-slate-50 rounded-xl p-3 flex gap-3 items-center">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-12 h-16 object-cover rounded-md shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-12 h-16 bg-slate-200 rounded-md shrink-0 flex items-center justify-center text-slate-400 text-xs">
                Book
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">{book.title}</h3>
              <p className="text-xs text-slate-500">{book.author}</p>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                <ShieldCheck className="h-3 w-3" /> Lifetime In-App Access
              </div>
            </div>
          </div>

          {/* Pricing Highlight */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex justify-between items-center">
            <div>
              <span className="text-xs text-emerald-800 block font-medium">One-Time Digital Fee</span>
              <span className="text-[11px] text-emerald-600">No time limit • Read anytime</span>
            </div>
            <span className="text-lg font-bold text-emerald-700">{book.digital_price} ETB</span>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
              <p className="text-slate-800 font-bold text-base">Payment Submitted!</p>
              <p className="text-xs text-slate-500 max-w-xs">
                As soon as the admin confirms your payment, this book will be unlocked in your account forever.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Payment instructions */}
              <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 space-y-1 border border-slate-100">
                <p className="font-semibold text-slate-700">Payment Instructions:</p>
                <p>Transfer <strong className="text-emerald-700">{book.digital_price} ETB</strong> via Telebirr or CBE Birr to the library account and enter the reference number below.</p>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Transaction / Reference ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TXN-892341"
                  value={txnId}
                  onChange={e => setTxnId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Proof screenshot */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Payment Screenshot *
                </label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-3 text-sm text-slate-600 hover:border-emerald-500 hover:bg-emerald-50/20 transition text-left flex items-center justify-between"
                >
                  <span className="truncate">
                    {proofFile ? proofFile.name : 'Choose screenshot image...'}
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold shrink-0 ml-2">Browse</span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl p-2.5 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />}
                  {loading ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
