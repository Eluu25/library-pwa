import { useEffect, useState, useCallback } from 'react'
import { Eye, CheckCircle2, XCircle, CreditCard, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ToastProvider'
import { PaymentType, PaymentStatus } from '../../types'

interface Payment {
  id: string
  user_id: string
  loan_id: string | null
  book_id?: string | null
  type: PaymentType
  amount: number
  method: string
  txn_id: string | null
  proof_path: string | null
  status: PaymentStatus
  reject_reason: string | null
  created_at: string
  reviewed_by: string | null
  reviewed_at: string | null
}

interface ProfileSimple {
  id: string
  full_name: string
  email: string
}

interface BookSimple {
  id: string
  title: string
  author: string
}

type FilterTab = 'pending' | 'all'

function StatusBadge({ status }: { status: PaymentStatus }) {
  const cls =
    status === 'confirmed'
      ? 'bg-green-100 text-green-700'
      : status === 'rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: PaymentType }) {
  if (type === 'digital') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
        <Sparkles className="h-3 w-3" /> eBook Access
      </span>
    )
  }
  const cls =
    type === 'membership'
      ? 'bg-purple-100 text-purple-700'
      : type === 'penalty'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-blue-100 text-blue-700'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {type}
    </span>
  )
}

export default function PaymentsPage() {
  const { notify } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileSimple>>({})
  const [books, setBooks] = useState<Record<string, BookSimple>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [paymentsRes, profilesRes, booksRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('books').select('id, title, author'),
      ])

      if (paymentsRes.error) throw paymentsRes.error
      if (profilesRes.error) throw profilesRes.error

      setPayments((paymentsRes.data as Payment[]) ?? [])

      const pMap: Record<string, ProfileSimple> = {}
      ;(profilesRes.data as ProfileSimple[])?.forEach(p => {
        pMap[p.id] = p
      })
      setProfiles(pMap)

      const bMap: Record<string, BookSimple> = {}
      ;(booksRes.data as BookSimple[])?.forEach(b => {
        bMap[b.id] = b
      })
      setBooks(bMap)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch payments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const viewProof = async (path: string) => {
    const { data, error: err } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(path, 60)
    if (err) {
      notify('error', 'Could not open payment proof', err.message)
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Confirm this payment?')) return
    setActionLoading(id + '_confirm')
    const { error: err } = await supabase.rpc('review_payment', { p_payment: id, p_approve: true })
    if (err) {
      notify('error', 'Could not confirm payment', err.message)
    } else {
      notify('success', 'Payment confirmed', 'The payment has been approved and access granted.')
      await fetchData()
    }
    setActionLoading(null)
  }

  const handleReject = async (id: string) => {
    const reason = window.prompt('Enter rejection reason:')
    if (reason === null) return
    setActionLoading(id + '_reject')
    const { error: err } = await supabase.rpc('review_payment', {
      p_payment: id,
      p_approve: false,
      p_reason: reason,
    })
    if (err) {
      notify('error', 'Could not reject payment', err.message)
    } else {
      notify('success', 'Payment rejected', 'The payment has been rejected.')
      await fetchData()
    }
    setActionLoading(null)
  }

  const filtered = payments.filter(p => {
    if (tab === 'pending') return p.status === 'pending'
    return true
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-brand-600" /> Payments
        </h1>
        <p className="mt-1 text-sm text-slate-500">Review payments for book loans, eBook digital access, and penalties.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('pending')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'pending'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          All Payments
        </button>
      </div>

      {error && <div className="text-red-600 bg-red-50 rounded-xl p-3 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-5 w-5 rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-sm bg-white rounded-xl p-6 text-center">
          No {tab === 'pending' ? 'pending' : ''} payments found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const member = profiles[p.user_id]
            const book = p.book_id ? books[p.book_id] : null
            const isLegacyMembership = p.type === 'membership'
            const isPendingValid = p.status === 'pending' && !isLegacyMembership

            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isLegacyMembership
                        ? <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Legacy record</span>
                        : <TypeBadge type={p.type} />}
                      <span className="text-lg font-bold text-slate-800">{p.amount} ETB</span>
                    </div>
                    <div className="text-sm font-medium text-slate-700">
                      {member ? (
                        <>
                          <span>{member.full_name}</span>{' '}
                          <span className="text-slate-400 font-normal">({member.email})</span>
                        </>
                      ) : (
                        <span className="text-slate-400">User ID: {p.user_id}</span>
                      )}
                    </div>
                    {book && (
                      <div className="text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                        eBook: <strong>{book.title}</strong> by {book.author}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Method:</span>
                    <span className="font-medium text-slate-700 capitalize">{p.method || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Transaction ID:</span>
                    <span className="font-mono text-slate-700">{p.txn_id || '—'}</span>
                  </div>
                  {p.loan_id && (
                    <div>
                      <span className="text-slate-400 block">Loan ID:</span>
                      <span className="font-mono text-slate-600 truncate block">{p.loan_id}</span>
                    </div>
                  )}
                  {p.book_id && (
                    <div>
                      <span className="text-slate-400 block">Digital Book ID:</span>
                      <span className="font-mono text-slate-600 truncate block">{p.book_id}</span>
                    </div>
                  )}
                </div>

                {p.reject_reason && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
                    <strong>Rejection reason:</strong> {p.reject_reason}
                  </div>
                )}

                {isLegacyMembership && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                    Legacy membership record. Members do not pay a membership fee; payments are only for borrowing books, eBook digital access, or settling penalties.
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                  {p.proof_path && (
                    <button
                      onClick={() => viewProof(p.proof_path!)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Proof
                    </button>
                  )}

                  {isPendingValid && (
                    <>
                      <button
                        onClick={() => handleConfirm(p.id)}
                        disabled={actionLoading === p.id + '_confirm'}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === p.id + '_confirm' ? (
                          <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-green-600 border-t-transparent inline-block" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Confirm
                      </button>
                      <button
                        onClick={() => handleReject(p.id)}
                        disabled={actionLoading === p.id + '_reject'}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === p.id + '_reject' ? (
                          <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-red-600 border-t-transparent inline-block" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
