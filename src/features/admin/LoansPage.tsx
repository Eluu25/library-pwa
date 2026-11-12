import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, RotateCcw, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ToastProvider'

type LoanStatus = 'requested' | 'active' | 'returned' | 'lost' | 'rejected'

interface LoanDetailed {
  id: string
  book_id: string
  user_id: string
  days_requested: number
  rental_fee: number
  status: LoanStatus
  requested_at: string
  start_date: string | null
  due_date: string | null
  returned_at: string | null
  penalty_amount: number
  penalty_settled: boolean
  title: string
  author: string
  penalty_due: number
  is_overdue: boolean
}

interface ProfileSimple {
  id: string
  full_name: string
  email: string
}

type FilterTab = 'all' | 'active' | 'requested' | 'overdue' | 'returned' | 'lost'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'requested', label: 'Requested' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
  { key: 'lost', label: 'Lost' },
]

function StatusBadge({ status, isOverdue }: { status: LoanStatus; isOverdue?: boolean }) {
  if (isOverdue && status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="h-3 w-3" /> Overdue
      </span>
    )
  }

  const map: Record<LoanStatus, string> = {
    active: 'bg-green-100 text-green-700',
    requested: 'bg-yellow-100 text-yellow-700',
    returned: 'bg-blue-100 text-blue-700',
    lost: 'bg-red-100 text-red-700',
    rejected: 'bg-slate-100 text-slate-700',
  }

  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

export default function LoansPage() {
  const { notify } = useToast()
  const [loans, setLoans] = useState<LoanDetailed[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileSimple>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [loansRes, profilesRes] = await Promise.all([
        supabase.from('loans_detailed').select('*').order('requested_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'member'),
      ])

      if (loansRes.error) throw loansRes.error
      if (profilesRes.error) throw profilesRes.error

      setLoans((loansRes.data as LoanDetailed[]) ?? [])

      const pMap: Record<string, ProfileSimple> = {}
      ;(profilesRes.data as ProfileSimple[])?.forEach(p => {
        pMap[p.id] = p
      })
      setProfiles(pMap)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch loans')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleReturn = async (id: string) => {
    if (!window.confirm('Confirm returning this book?')) return
    setActionLoading(id + '_return')
    const { data, error: err } = await supabase.rpc('return_loan', { p_loan: id })
    if (err) {
      notify('error', 'Could not return loan', err.message)
    } else {
      if (data && typeof data === 'object' && 'penalty' in (data as Record<string, unknown>)) {
        notify('warning', 'Loan returned', `Penalty assessed: ${(data as Record<string, unknown>).penalty} ETB.`)
      } else if (data !== undefined && data !== null && typeof data === 'number' && data > 0) {
        notify('warning', 'Loan returned', `Penalty assessed: ${data} ETB.`)
      } else {
        notify('success', 'Loan returned', 'The book was marked as returned.')
      }
      await fetchData()
    }
    setActionLoading(null)
  }

  const handleMarkLost = async (id: string) => {
    if (!window.confirm('Mark this loan as lost? Replacement penalty will be applied.')) return
    setActionLoading(id + '_lost')
    const { error: err } = await supabase.rpc('mark_lost', { p_loan: id })
    if (err) {
      notify('error', 'Could not mark loan as lost', err.message)
    } else {
      notify('success', 'Loan marked as lost', 'The replacement penalty has been applied.')
      await fetchData()
    }
    setActionLoading(null)
  }

  const handleSettlePenalty = async (id: string) => {
    if (!window.confirm('Confirm settlement of penalty with cash?')) return
    setActionLoading(id + '_settle')
    const { error: err } = await supabase.rpc('settle_penalty', { p_loan: id })
    if (err) {
      notify('error', 'Could not settle penalty', err.message)
    } else {
      notify('success', 'Penalty settled', 'The penalty payment was recorded.')
      await fetchData()
    }
    setActionLoading(null)
  }

  const filtered = loans.filter(loan => {
    if (tab === 'all') return true
    if (tab === 'active') return loan.status === 'active'
    if (tab === 'requested') return loan.status === 'requested'
    if (tab === 'overdue') return loan.is_overdue
    if (tab === 'returned') return loan.status === 'returned'
    if (tab === 'lost') return loan.status === 'lost'
    return true
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <BookOpen className="h-5 w-5 text-brand-600" /> Loans
        </h1>
        <p className="mt-1 text-sm text-slate-500">Track requests, active checkouts, returns, and overdue books.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="text-red-600 bg-red-50 rounded-xl p-3 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-5 w-5 rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-sm bg-white rounded-xl p-6 text-center">No loans found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(loan => {
            const member = profiles[loan.user_id]
            const hasUnsettledPenalty =
              (loan.status === 'returned' || loan.status === 'lost') &&
              !loan.penalty_settled &&
              (loan.penalty_amount > 0 || loan.penalty_due > 0)

            return (
              <div key={loan.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-slate-800 text-base">{loan.title}</h2>
                    <div className="text-xs text-slate-500">by {loan.author}</div>
                    <div className="text-sm font-medium text-slate-700 mt-1">
                      {member ? (
                        <>
                          <span>{member.full_name}</span>{' '}
                          <span className="text-slate-400 font-normal">({member.email})</span>
                        </>
                      ) : (
                        <span className="text-slate-400">User ID: {loan.user_id}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={loan.status} isOverdue={loan.is_overdue} />
                    <span className="text-xs text-slate-400">
                      Req: {new Date(loan.requested_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Start Date:</span>
                    <span className="font-medium text-slate-700">
                      {loan.start_date ? new Date(loan.start_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Due Date:</span>
                    <span className="font-medium text-slate-700">
                      {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Rental Fee:</span>
                    <span className="font-medium text-slate-700">{loan.rental_fee} ETB</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Penalty Due:</span>
                    <span className={`font-semibold ${loan.penalty_due > 0 || (loan.penalty_amount > 0 && !loan.penalty_settled) ? 'text-red-600' : 'text-slate-700'}`}>
                      {loan.penalty_due ?? loan.penalty_amount ?? 0} ETB
                      {loan.penalty_settled && <span className="text-green-600 ml-1">(Settled)</span>}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                  {loan.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleReturn(loan.id)}
                        disabled={actionLoading === loan.id + '_return'}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === loan.id + '_return' ? (
                          <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-green-600 border-t-transparent inline-block" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Return
                      </button>
                      <button
                        onClick={() => handleMarkLost(loan.id)}
                        disabled={actionLoading === loan.id + '_lost'}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === loan.id + '_lost' ? (
                          <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-red-600 border-t-transparent inline-block" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Mark Lost
                      </button>
                    </>
                  )}

                  {hasUnsettledPenalty && (
                    <button
                      onClick={() => handleSettlePenalty(loan.id)}
                      disabled={actionLoading === loan.id + '_settle'}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === loan.id + '_settle' ? (
                        <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-amber-600 border-t-transparent inline-block" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Settle Cash
                    </button>
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
