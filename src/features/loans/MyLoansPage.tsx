import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Clock, AlertCircle, BookOpen, RefreshCw, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import PenaltyPayModal from './PenaltyPayModal'

// Types mirrored from src/types/index.ts
type LoanStatus = 'requested' | 'active' | 'returned' | 'lost' | 'rejected'

interface LoanDetailed {
  id: string; book_id: string; user_id: string; days_requested: number
  rental_fee: number; status: LoanStatus; requested_at: string
  start_date: string | null; due_date: string | null; returned_at: string | null
  penalty_amount: number; penalty_settled: boolean
  title: string; author: string; penalty_due: number; is_overdue: boolean
}

export default function MyLoansPage() {
  const { profile } = useAuth()
  const [loans, setLoans] = useState<LoanDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLoanForPenalty, setSelectedLoanForPenalty] = useState<LoanDetailed | null>(null)

  const fetchLoans = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('loans_detailed')
        .select('*')
        .eq('user_id', profile.id)
        .order('requested_at', { ascending: false })

      if (err) throw err
      setLoans((data as LoanDetailed[]) ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch loans.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  function getStatusBadge(status: LoanStatus) {
    switch (status) {
      case 'active':
        return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
      case 'requested':
        return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Requested</span>
      case 'rejected':
        return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-600">Rejected</span>
      case 'returned':
        return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">Returned</span>
      case 'lost':
        return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">Lost</span>
      default:
        return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{status}</span>
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-700">My Loans</h1>
          <p className="text-xs text-slate-500">Track your borrowed books and requests</p>
        </div>
        <button
          onClick={fetchLoans}
          disabled={loading}
          aria-label="Refresh loans"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your loans...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-2xl p-6 text-center space-y-2">
          <p className="font-semibold text-sm">Failed to load loans</p>
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={fetchLoans}
            className="mt-2 text-xs font-semibold underline text-red-700 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      ) : loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          <BookOpen className="h-12 w-12 text-slate-300" />
          <div className="space-y-1">
            <p className="font-medium text-slate-700">No loans yet</p>
            <p className="text-xs text-slate-400">Browse the catalog to borrow a book.</p>
          </div>
          <Link
            to="/"
            className="mt-2 px-4 py-2 bg-brand-700 text-white rounded-xl text-sm font-semibold hover:bg-brand-800 transition-colors"
          >
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map(loan => {
            const needsPenaltyPayment =
              (loan.status === 'returned' || loan.status === 'lost') &&
              loan.penalty_amount > 0 &&
              !loan.penalty_settled

            return (
              <div
                key={loan.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3"
              >
                {/* Overdue Banner */}
                {loan.is_overdue && (
                  <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>OVERDUE</span>
                  </div>
                )}

                {/* Main Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-base leading-snug">
                      {loan.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{loan.author}</p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(loan.status)}</div>
                </div>

                {/* Status-specific details */}
                <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl">
                  {loan.status === 'requested' && (
                    <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Awaiting admin approval</span>
                    </div>
                  )}

                  {loan.status === 'active' && loan.due_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Due Date:</span>
                      <span className={`font-bold text-sm ${loan.is_overdue ? 'text-red-600' : 'text-brand-700'}`}>
                        {formatDate(loan.due_date)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span>Requested duration:</span>
                    <span className="font-medium text-slate-700">{loan.days_requested} days</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Rental fee:</span>
                    <span className="font-medium text-slate-700">{loan.rental_fee} ETB</span>
                  </div>

                  {loan.penalty_amount > 0 && (
                    <div className="flex items-center justify-between text-red-600 font-medium pt-1">
                      <span>Penalty:</span>
                      <span>
                        {loan.penalty_amount} ETB {loan.penalty_settled ? '(Settled)' : '(Due)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action for penalty payment */}
                {needsPenaltyPayment && (
                  <div className="pt-1">
                    <button
                      onClick={() => setSelectedLoanForPenalty(loan)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Pay Penalty ({loan.penalty_amount} ETB)</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Penalty Pay Modal */}
      {selectedLoanForPenalty && (
        <PenaltyPayModal
          loan={selectedLoanForPenalty}
          onClose={() => setSelectedLoanForPenalty(null)}
          onSuccess={() => {
            setSelectedLoanForPenalty(null)
            fetchLoans()
          }}
        />
      )}
    </div>
  )
}
