import { useEffect, useState, useCallback } from 'react'
import {
  Eye, UserCheck, UserX, Clock, IdCard, User, Phone, MapPin,
  HeartHandshake, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Check, Trash2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ToastProvider'

type MemberStatus = 'pending' | 'approved' | 'rejected'

interface Profile {
  id: string
  email: string
  full_name: string
  phone: string
  address: string
  emergency_name: string
  emergency_phone: string
  fayda_path: string | null
  role: 'member' | 'admin'
  status: MemberStatus
  reject_reason: string | null
  approved_at: string | null
  approved_by: string | null
  created_at: string
}

type FilterTab = 'all' | MemberStatus

const TABS: { key: FilterTab; label: string; color: string }[] = [
  { key: 'all',      label: 'All Members',  color: '' },
  { key: 'pending',  label: 'Pending',       color: 'text-amber-700' },
  { key: 'approved', label: 'Approved',      color: 'text-green-700' },
  { key: 'rejected', label: 'Rejected',      color: 'text-red-700'   },
]

function StatusPill({ status, hasFayda }: { status: MemberStatus; hasFayda: boolean }) {
  if (status === 'pending' && !hasFayda) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
        <Clock className="h-3.5 w-3.5" /> Awaiting ID Upload
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
        <Clock className="h-3.5 w-3.5" /> Ready for Review
      </span>
    )
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
        <UserCheck className="h-3.5 w-3.5" /> Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
      <UserX className="h-3.5 w-3.5" /> Rejected
    </span>
  )
}

export default function MembersPage() {
  const { notify } = useToast()
  const [members, setMembers]           = useState<Profile[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [tab, setTab]                   = useState<FilterTab>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [rejectInput, setRejectInput]   = useState<{ id: string; reason: string } | null>(null)
  const [idPreview, setIdPreview]       = useState<{ id: string; url: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'member')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setMembers((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const viewID = async (faydaPath: string) => {
    setError(null)
    const { data, error: err } = await supabase.storage
      .from('fayda-ids')
      .createSignedUrl(faydaPath, 60)
    if (err) {
      setError(`Could not load Fayda ID image: ${err.message}`)
      return
    }
    const member = members.find(item => item.fayda_path === faydaPath)
    if (member) setIdPreview({ id: member.id, url: data.signedUrl })
  }

  const approve = async (id: string) => {
    setActionLoading(id + '_approve')
    const { error: err } = await supabase.rpc('review_member', { p_user: id, p_approve: true })
    if (err) {
      setError(`Could not approve member: ${err.message}`)
      notify('error', 'Approval failed', err.message)
      setActionLoading(null)
      return
    }
    await fetchMembers()
    notify('success', 'Member approved', 'The member can now sign in and borrow books.')
    setActionLoading(null)
  }

  const startReject = (id: string) => setRejectInput({ id, reason: '' })

  const confirmReject = async () => {
    if (!rejectInput) return
    if (!rejectInput.reason.trim()) {
      setError('Please enter a rejection reason.')
      return
    }
    setActionLoading(rejectInput.id + '_reject')
    const { error: err } = await supabase.rpc('review_member', {
      p_user: rejectInput.id,
      p_approve: false,
      p_reason: rejectInput.reason.trim(),
    })
    if (err) {
      setError(`Could not reject member: ${err.message}`)
      notify('error', 'Rejection failed', err.message)
      setActionLoading(null)
      return
    }
    setActionLoading(null)
    setRejectInput(null)
    await fetchMembers()
    notify('success', 'Application rejected', 'The member application was updated.')
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    setActionLoading(deleteConfirm.id + '_delete')
    const { error: err } = await supabase.rpc('delete_member', { p_user: deleteConfirm.id })
    if (err) {
      setError(`Could not delete member: ${err.message}`)
      notify('error', 'Delete failed', err.message)
      setActionLoading(null)
      return
    }
    setActionLoading(null)
    setDeleteConfirm(null)
    await fetchMembers()
    notify('success', 'Member deleted', 'The member account has been permanently removed.')
  }

  const filtered = tab === 'all' ? members : members.filter(m => m.status === tab)
  const counts   = {
    all:      members.length,
    pending:  members.filter(m => m.status === 'pending').length,
    approved: members.filter(m => m.status === 'approved').length,
    rejected: members.filter(m => m.status === 'rejected').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <User className="h-5 w-5 text-brand-600" /> Members
          </h1>
          <p className="mt-1 text-sm text-slate-500">Review member details and verify new applications.</p>
        </div>
        <button
          onClick={fetchMembers}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700 px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
              tab === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-slate-500 text-sm bg-white rounded-2xl p-8 text-center border border-slate-200/80">
          <User className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          No members found in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const isExpanded = expanded === m.id
            const canApprove = m.status === 'pending' && !!m.fayda_path

            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                {/* Card header */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : m.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {m.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{m.full_name}</div>
                      <div className="text-xs text-slate-500 truncate">{m.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusPill status={m.status} hasFayda={!!m.fayda_path} />
                    <span className="text-xs text-slate-400 hidden sm:inline">{new Date(m.created_at).toLocaleDateString()}</span>
                    {canApprove && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); approve(m.id) }}
                          disabled={actionLoading === m.id + '_approve'}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                        >
                          {actionLoading === m.id + '_approve'
                            ? <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent" />
                            : <Check className="h-3.5 w-3.5" />}
                          Approve
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); startReject(m.id) }}
                          disabled={actionLoading === m.id + '_reject'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <UserX className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 space-y-4 bg-slate-50">
                    {/* Info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{m.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{m.address || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <HeartHandshake className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{m.emergency_name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{m.emergency_phone || '—'}</span>
                      </div>
                    </div>

                    {/* Fayda status banner */}
                    {!m.fayda_path && m.status === 'pending' && (
                      <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <IdCard className="h-4 w-4 shrink-0" />
                        <span>No Fayda ID is linked yet. Ask the member to sign in and submit their Fayda ID before reviewing the application.</span>
                      </div>
                    )}

                    {m.reject_reason && (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                        <strong>Rejection reason:</strong> {m.reject_reason}
                      </div>
                    )}

                    {m.approved_at && (
                      <div className="text-xs text-slate-400">
                        Approved on {new Date(m.approved_at).toLocaleString()}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.fayda_path && (
                        <button
                          onClick={() => {
                            if (idPreview?.id === m.id) setIdPreview(null)
                            else viewID(m.fayda_path!)
                          }}
                          className="flex items-center gap-1.5 text-sm px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium transition-colors shadow-sm"
                        >
                          <IdCard className="h-4 w-4" /> {idPreview?.id === m.id ? 'Hide Fayda ID' : 'View Fayda ID'}
                        </button>
                      )}

                      {m.status === 'pending' && !m.fayda_path && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                          <Eye className="h-3.5 w-3.5" /> Waiting for the member to submit their Fayda ID.
                        </div>
                      )}

                      {/* Delete member button */}
                      <button
                        onClick={() => setDeleteConfirm({ id: m.id, name: m.full_name })}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 text-sm px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 font-medium transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" /> Delete Member
                      </button>
                    </div>
                    {idPreview?.id === m.id && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-3">
                        <img
                          src={idPreview.url}
                          alt={`${m.full_name}'s Fayda ID`}
                          className="mx-auto max-h-[28rem] max-w-full rounded-xl object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <UserX className="h-5 w-5" />
              <h3 className="font-bold text-lg">Reject Member</h3>
            </div>
            <p className="text-sm text-slate-600">Please provide a reason for rejection. The member will see this.</p>
            <textarea
              aria-label="Rejection reason"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              rows={3}
              placeholder="e.g. ID photo is unclear, please resubmit..."
              value={rejectInput.reason}
              onChange={e => setRejectInput(r => r ? { ...r, reason: e.target.value } : null)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectInput(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={actionLoading?.includes('_reject')}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading?.includes('_reject') ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              <h3 className="font-bold text-lg">Delete Member</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>? This will remove their account, profile, and all related data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading?.includes('_delete')}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading?.includes('_delete') ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
