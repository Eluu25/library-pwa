import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Eye, CheckCircle2, XCircle, CreditCard, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type PaymentType = 'membership' | 'loan' | 'penalty'
type PaymentStatus = 'pending' | 'confirmed' | 'rejected'

interface Payment {
  id: string
  user_id: string
  loan_id: string | null
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
  const [payments, setPayments] = useState<Payment[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileSimple>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [paymentsRes, profilesRes] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email'),
      ])

      if (paymentsRes.error) throw paymentsRes.error
      if (profilesRes.error) throw profilesRes.error

      setPayments((paymentsRes.data as Payment[]) ?? [])

      const pMap: Record<string, ProfileSimple> = {}
      ;(profilesRes.data as ProfileSimple[])?.forEach(p => {
        pMap[p.id] = p
      })
      setProfiles(pMap)
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
      alert('Could not get signed URL: ' + err.message)
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Confirm this payment?')) return
    setActionLoading(id + '_confirm')
    const { error: err } = await supabase.rpc('review_payment', { p_payment: id, p_approve: true })
    if (err) {
      alert('Error confirming payment: ' + err.message)
    } else {
      fetchData()
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
      alert('Error rejecting payment: ' + err.message)
    } else {
      fetchData()
    }
    setActionLoading(null)
  }

  const filtered = payments.filter(p => {
    if (tab === 'pending') return p.status === 'pending'
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-700 flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> Payments Management
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('pending')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'pending'
              ? 'bg-brand-700 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'all'
              ? 'bg-brand-700 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
            const isMembership = p.type === 'membership'
            const isPendingLoanOrPenalty = p.status === 'pending' && !isMembership

            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={p.type} />
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
                </div>

                {p.reject_reason && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5">
                    <strong>Rejection reason:</strong> {p.reject_reason}
                  </div>
                )}

                {isMembership && p.status === 'pending' && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Membership payment approval is handled together with member application in the{' '}
                      <Link to="/admin/members" className="font-semibold underline">
                        Members page
                      </Link>
                      .
                    </span>
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

                  {isPendingLoanOrPenalty && (
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
