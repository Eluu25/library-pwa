import { useState, useEffect } from 'react'
import {
  X, BookOpen, Users, AlertCircle, CheckCircle2,
  Sparkles, ShieldCheck, Clock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { BookCatalog, Profile } from '../../types'
import LoanRequestModal from '../loans/LoanRequestModal'
import BuyDigitalModal from './BuyDigitalModal'
import SecurePdfReader from './SecurePdfReader'

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
  const [hasDigitalAccess, setHasDigitalAccess] = useState(false)
  const [hasPendingDigitalPayment, setHasPendingDigitalPayment] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [actionMsg, setActionMsg] = useState('')

  // Modals state
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [showBuyDigitalModal, setShowBuyDigitalModal] = useState(false)
  const [showPdfReader, setShowPdfReader] = useState(false)
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null)
  const [openingReader, setOpeningReader] = useState(false)

  useEffect(() => {
    if (!profile) {
      setCheckingStatus(false)
      return
    }

    async function checkUserStatus() {
      setCheckingStatus(true)
      try {
        const [waitlistRes, loanRes, digitalRes, pendingPayRes] = await Promise.all([
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
          supabase
            .from('digital_access')
            .select('id')
            .eq('book_id', book.id)
            .eq('user_id', profile!.id)
            .maybeSingle(),
          supabase
            .from('payments')
            .select('id')
            .eq('book_id', book.id)
            .eq('user_id', profile!.id)
            .eq('type', 'digital')
            .eq('status', 'pending')
            .maybeSingle(),
        ])

        setOnWaitlist(!!waitlistRes.data)
        setHasActiveLoan(!!loanRes.data)
        setHasDigitalAccess(!!digitalRes.data || profile!.role === 'admin')
        setHasPendingDigitalPayment(!!pendingPayRes.data)
      } catch (e) {
        console.error('Error checking user status:', e)
      } finally {
        setCheckingStatus(false)
      }
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

  async function handleOpenReader() {
    if (!book.pdf_path) return
    setOpeningReader(true)
    setActionState('idle')

    try {
      // Get a short-lived signed URL (valid for 15 minutes)
      const { data, error } = await supabase.storage
        .from('book-pdfs')
        .createSignedUrl(book.pdf_path, 900)

      if (error) throw error
      if (!data?.signedUrl) throw new Error('Could not retrieve digital book URL')

      setSignedPdfUrl(data.signedUrl)
      setShowPdfReader(true)
    } catch (err: unknown) {
      setActionState('error')
      setActionMsg(err instanceof Error ? err.message : 'Could not open book reader.')
    } finally {
      setOpeningReader(false)
    }
  }

  const isApproved = profile?.status === 'approved'
  const canBorrow = isApproved && book.available_copies > 0 && !hasActiveLoan
  const canJoinWaitlist = isApproved && book.available_copies === 0 && !onWaitlist && !hasActiveLoan
  const hasDigitalEdition = !!book.pdf_path

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
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
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
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-800 leading-snug">{book.title}</h2>
                {hasDigitalEdition && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    <Sparkles className="h-3 w-3" /> eBook Available
                  </span>
                )}
              </div>
              <p className="text-slate-500 mt-1">{book.author}</p>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Year</p>
                <p className="font-semibold text-slate-700 mt-0.5">{book.pub_year ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Edition</p>
                <p className="font-semibold text-slate-700 mt-0.5">{book.edition ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Physical Fee</p>
                <p className="font-semibold text-brand-700 mt-0.5">{book.price_per_day} ETB / day</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Replacement</p>
                <p className="font-semibold text-slate-700 mt-0.5">{book.replacement_price} ETB</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Shelf Copies</p>
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

            {/* 1. DIGITAL READING SECTION */}
            {hasDigitalEdition && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span>Online Digital Edition</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200">
                    {book.digital_price} ETB (Lifetime)
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Read directly inside the app on your phone or computer. Download and screenshots disabled. Pay once, read forever without time limits.
                </p>

                {checkingStatus ? (
                  <div className="py-2 flex justify-center">
                    <div className="animate-spin h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                ) : hasDigitalAccess ? (
                  <button
                    onClick={handleOpenReader}
                    disabled={openingReader}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
                  >
                    {openingReader ? (
                      <div className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    {openingReader ? 'Loading eBook...' : 'Read Online Now'}
                  </button>
                ) : hasPendingDigitalPayment ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-100/80 border border-amber-300 rounded-xl p-3">
                    <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Your digital payment is pending admin approval. You will be able to read once confirmed.</span>
                  </div>
                ) : isApproved ? (
                  <button
                    onClick={() => setShowBuyDigitalModal(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" /> Unlock eBook ({book.digital_price} ETB)
                  </button>
                ) : (
                  <div className="text-center text-xs text-slate-500 bg-white/70 rounded-xl py-2 border border-emerald-100">
                    Membership approval required to unlock digital editions.
                  </div>
                )}
              </div>
            )}

            {/* 2. PHYSICAL BORROWING SECTION */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">Physical Library Book</span>
                <span className="text-xs text-slate-500">{book.price_per_day} ETB / day</span>
              </div>

              {!checkingStatus && profile && (
                <div className="space-y-2">
                  {canBorrow && !hasActiveLoan && (
                    <button
                      onClick={() => setShowLoanModal(true)}
                      className="w-full bg-brand-700 hover:bg-brand-600 text-white rounded-xl py-3 font-semibold text-sm active:opacity-80 transition"
                    >
                      Borrow Physical Copy
                    </button>
                  )}
                  {hasActiveLoan && (
                    <div className="text-center text-xs text-slate-500 bg-white rounded-xl py-2.5 border border-slate-200">
                      You already have an active or requested loan for this book.
                    </div>
                  )}
                  {canJoinWaitlist && (
                    <button
                      onClick={handleWaitlistJoin}
                      disabled={actionState === 'loading'}
                      className="w-full border-2 border-brand-500 text-brand-700 hover:bg-brand-50 rounded-xl py-2.5 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition"
                    >
                      {actionState === 'loading' && (
                        <div className="animate-spin h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent" />
                      )}
                      Join Waitlist for Physical Copy
                    </button>
                  )}
                  {onWaitlist && (
                    <button
                      onClick={handleWaitlistLeave}
                      disabled={actionState === 'loading'}
                      className="w-full border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-xl py-2.5 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition"
                    >
                      {actionState === 'loading' && (
                        <div className="animate-spin h-4 w-4 rounded-full border-2 border-red-400 border-t-transparent" />
                      )}
                      Leave Physical Waitlist
                    </button>
                  )}
                  {!isApproved && (
                    <div className="text-center text-xs text-slate-500 bg-white rounded-xl py-2.5 border border-slate-200">
                      Your membership must be approved to borrow books.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loan Modal */}
      {showLoanModal && profile && (
        <LoanRequestModal
          book={book}
          profile={profile}
          onClose={() => setShowLoanModal(false)}
          onSuccess={() => {
            setShowLoanModal(false)
            onRefresh()
            onClose()
          }}
        />
      )}

      {/* Buy Digital Access Modal */}
      {showBuyDigitalModal && profile && (
        <BuyDigitalModal
          book={book}
          profile={profile}
          onClose={() => setShowBuyDigitalModal(false)}
          onSuccess={() => {
            setShowBuyDigitalModal(false)
            setHasPendingDigitalPayment(true)
            onRefresh()
          }}
        />
      )}

      {/* In-App Protected PDF Reader */}
      {showPdfReader && signedPdfUrl && profile && (
        <SecurePdfReader
          pdfUrl={signedPdfUrl}
          bookTitle={book.title}
          userName={profile.full_name || 'Member'}
          userEmail={profile.email}
          onClose={() => {
            setShowPdfReader(false)
            setSignedPdfUrl(null)
          }}
        />
      )}
    </>
  )
}
