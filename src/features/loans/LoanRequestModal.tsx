import { useState, useRef } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Types mirrored from src/types/index.ts
interface BookCatalog {
  id: string; title: string; author: string; pub_year: number | null
  edition: string | null; price_per_day: number; replacement_price: number
  total_copies: number; created_at: string
  available_copies: number; waiting_count: number
}

interface Profile {
  id: string; email: string; full_name: string; phone: string
  address: string; emergency_name: string; emergency_phone: string
  fayda_path: string | null; role: 'member' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null; approved_at: string | null
  approved_by: string | null; created_at: string
}

interface LoanRequestModalProps {
  book: BookCatalog
  profile: Profile
  onClose: () => void
  onSuccess: () => void
}

export default function LoanRequestModal({ book, profile, onClose, onSuccess }: LoanRequestModalProps) {
  const [days, setDays] = useState(1)
  const [txnId, setTxnId] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const rentalFee = days * book.price_per_day

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!proofFile) { setError('Please attach a payment screenshot.'); return }
    if (!txnId.trim()) { setError('Transaction ID is required.'); return }
    if (days < 1 || days > 14) { setError('Days must be between 1 and 14.'); return }

    setLoading(true)
    setError(null)

    try {
      // 1. Upload proof
      const path = `${profile.id}/${Date.now()}_${proofFile.name}`
      const { error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, proofFile)
      if (uploadErr) throw new Error(uploadErr.message)

      // 2. Request loan via RPC
      const { error: rpcErr } = await supabase.rpc('request_loan', {
        p_book: book.id,
        p_days: days,
        p_txn: txnId.trim(),
        p_proof: path,
      })
      if (rpcErr) throw new Error(rpcErr.message)

      setSuccess(true)
      setTimeout(() => { onSuccess(); onClose() }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-brand-700">Borrow Book</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Book summary */}
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="font-semibold text-slate-800 text-sm line-clamp-2">{book.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{book.author}</p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-green-700 font-semibold">Request submitted!</p>
              <p className="text-xs text-slate-500 text-center">Awaiting admin approval.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Days */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Number of Days (1–14)
                </label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Rental fee preview */}
              <div className="bg-green-50 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-sm text-slate-600">Rental Fee</span>
                <span className="font-bold text-brand-700">{rentalFee} ETB</span>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={txnId}
                  onChange={e => setTxnId(e.target.value)}
                  placeholder="e.g. TXN-123456"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Proof file */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Screenshot
                </label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-lg px-3 py-3 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-700 transition-colors text-left"
                >
                  {proofFile ? proofFile.name : 'Tap to attach screenshot…'}
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
                <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-700 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && (
                  <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                )}
                {loading ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
