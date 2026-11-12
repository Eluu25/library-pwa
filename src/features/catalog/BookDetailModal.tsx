import { useState, useEffect } from 'react'
import { X, BookOpen, Users, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import LoanRequestModal from '../loans/LoanRequestModal'

// Types mirrored from src/types/index.ts
interface BookCatalog {
  id: string; title: string; author: string; pub_year: number | null
  edition: string | null; price_per_day: number; replacement_price: number
  total_copies: number; cover_url: string | null; created_at: string
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

interface BookDetailModalProps {
  book: BookCatalog
  onClose: () => void
  profile: Profile | null
  onRefresh: () => void
}

type ActionState = 'idle' | 'loading' | 'success' | 'error'

export default function BookDetailModal({ book, onClose, profile, onRefresh }: BookDetailModalProps) {
  const [onWaitlist, setOnWaitlist] = useState(false)
  const [hasActiveLoan, setHasActiveLoan] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [actionMsg, setActionMsg] = useState('')
  const [showLoanModal, setShowLoanModal] = useState(false)

  useEffect(() => {
    if (!profile) { setCheckingStatus(false); return }
    async function checkUserStatus() {
      setCheckingStatus(true)
      const [waitlistRes, loanRes] = await Promise.all([
        supabase
          .from('waitlist')
          .select('id')
          .eq('book_id', book.id)
          .eq('user_id', profile!.id)
          .in('status', ['waiting', 'notified'])
          .maybeSingle(),
        supabase
          .from('loans_detailed')
          .select('id')
          .eq('book_id', book.id)
          .eq('user_id', profile!.id)
          .in('status', ['active', 'requested'])
          .maybeSingle(),
      ])
      setOnWaitlist(!!waitlistRes.data)
      setHasActiveLoan(!!loanRes.data)
      setCheckingStatus(false)
    }
    checkUserStatus()
  }, [book.id, profile])

  async function handleWaitlistJoin() {
    setActionState('loading')
    const { error } = await supabase.rpc('join_waitlist', { p_book: book.id })
    if (error) {
      setActionState('error')
      setActionMsg(error.message)
    } else {
      setActionState('success')
      setActionMsg('You joined the waitlist!')
      setOnWaitlist(true)
      onRefresh()
    }
  }

  async function handleWaitlistLeave() {
    setActionState('loading')
    const { error } = await supabase.rpc('leave_waitlist', { p_book: book.id })
    if (error) {
      setActionState('error')
      setActionMsg(error.message)
    } else {
      setActionState('success')
      setActionMsg('You left the waitlist.')
      setOnWaitlist(false)
      onRefresh()
    }
  }

  const isApproved = profile?.status === 'approved'
  const canBorrow = isApproved && book.available_copies > 0 && !hasActiveLoan
  const canJoinWaitlist = isApproved && book.available_copies === 0 && !onWaitlist && !hasActiveLoan

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-slate-100 z-10">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-500" />
              <span className="font-bold text-brand-700">Book Details</span>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="p-4 space-y-4 pb-8 sm:pb-4">
            {book.cover_url && (
              <img
                src={book.cover_url}
                alt={`Cover of ${book.title}`}
                className="h-52 w-full rounded-2xl bg-brand-50 object-cover"
              />
            )}
            {/* Title & Author */}
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-snug">{book.title}</h2>
              <p className="text-slate-500 mt-1">{book.author}</p>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Year</p>
                <p className="font-semibold text-slate-700 mt-0.5">{book.pub_year ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Edition</p>
                <p className="font-semibold text-slate-700 mt-0.5">{book.edition ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Price / Day</p>
                <p className="font-semibold text-brand-700 mt-0.5">{book.price_per_day} ETB</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Replacement</p>
                <p className="font-semibold text-slate-700 mt-0.5">{book.replacement_price} ETB</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Available</p>
                <p className={`font-semibold mt-0.5 ${book.available_copies > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {book.available_copies} / {book.total_copies}
                </p>
              </div>
              {book.waiting_count > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Waitlist</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    <p className="font-semibold text-slate-700">{book.waiting_count}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Feedback messages */}
            {actionState === 'success' && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionMsg}</span>
              </div>
            )}
            {actionState === 'error' && (
              <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{actionMsg}</span>
              </div>
            )}

            {/* Action buttons */}
            {!checkingStatus && profile && (
              <div className="space-y-2 pb-2">
                {canBorrow && !hasActiveLoan && (
                  <button
                    onClick={() => setShowLoanModal(true)}
                    className="w-full bg-brand-700 text-white rounded-xl py-3 font-semibold text-sm active:opacity-80"
                  >
                    Borrow this Book
                  </button>
                )}
                {hasActiveLoan && (
                  <div className="text-center text-sm text-slate-500 bg-slate-50 rounded-xl py-3">
                    You already have an active or pending loan for this book.
                  </div>
                )}
                {canJoinWaitlist && (
                  <button
                    onClick={handleWaitlistJoin}
                    disabled={actionState === 'loading'}
                    className="w-full border-2 border-brand-500 text-brand-700 rounded-xl py-3 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {actionState === 'loading' && (
                      <div className="animate-spin h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent" />
                    )}
                    Join Waitlist
                  </button>
                )}
                {onWaitlist && (
                  <button
                    onClick={handleWaitlistLeave}
                    disabled={actionState === 'loading'}
                    className="w-full border-2 border-red-300 text-red-600 rounded-xl py-3 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {actionState === 'loading' && (
                      <div className="animate-spin h-4 w-4 rounded-full border-2 border-red-400 border-t-transparent" />
                    )}
                    Leave Waitlist
                  </button>
                )}
                {!isApproved && (
                  <div className="text-center text-sm text-slate-400 bg-slate-50 rounded-xl py-3">
                    Your membership must be approved to borrow books.
                  </div>
                )}
              </div>
            )}

            {checkingStatus && profile && (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            )}
          </div>
        </div>
      </div>

      {showLoanModal && profile && (
        <LoanRequestModal
          book={book}
          profile={profile}
          onClose={() => setShowLoanModal(false)}
          onSuccess={() => { setShowLoanModal(false); onRefresh(); onClose() }}
        />
      )}
    </>
  )
}
