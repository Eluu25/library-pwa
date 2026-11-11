import { useEffect, useState, useCallback } from 'react'
import { Eye, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

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

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

function StatusBadge({ status }: { status: MemberStatus }) {
  const cls =
    status === 'approved'
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

export default function MembersPage() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
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
    const { data, error: err } = await supabase.storage
      .from('fayda-ids')
      .createSignedUrl(faydaPath, 60)
    if (err) { alert('Could not get signed URL: ' + err.message); return }
    window.open(data.signedUrl, '_blank')
  }

  const approve = async (id: string) => {
    setActionLoading(id + '_approve')
    const { error: err } = await supabase.rpc('review_member', { p_user: id, p_approve: true })
    if (err) alert('Error: ' + err.message)
    setActionLoading(null)
    fetchMembers()
  }

  const reject = async (id: string) => {
    const reason = window.prompt('Enter rejection reason:')
    if (reason === null) return
    setActionLoading(id + '_reject')
    const { error: err } = await supabase.rpc('review_member', {
      p_user: id,
      p_approve: false,
      p_reason: reason,
    })
    if (err) alert('Error: ' + err.message)
    setActionLoading(null)
    fetchMembers()
  }

  const filtered = tab === 'all' ? members : members.filter(m => m.status === tab)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-700">Members</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
        <div className="text-slate-500 text-sm bg-white rounded-xl p-6 text-center">No members found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">{m.full_name}</div>
                  <div className="text-sm text-slate-500">{m.email}</div>
                  <div className="text-sm text-slate-500">{m.phone}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={m.status} />
                  <span className="text-xs text-slate-400">
                    {new Date(m.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {m.reject_reason && (
                <p className="text-xs text-red-600 bg-red-50 rounded p-2">
                  Reason: {m.reject_reason}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {m.fayda_path && (
                  <button
                    onClick={() => viewID(m.fayda_path!)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" /> View ID
                  </button>
                )}
                {m.status === 'pending' && m.fayda_path && (
                  <>
                    <button
                      onClick={() => approve(m.id)}
                      disabled={actionLoading === m.id + '_approve'}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === m.id + '_approve' ? (
                        <span className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-green-600 border-t-transparent inline-block" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => reject(m.id)}
                      disabled={actionLoading === m.id + '_reject'}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === m.id + '_reject' ? (
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
          ))}
        </div>
      )}
    </div>
  )
}
