import { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle, BookCopy, BookOpen, CreditCard, DollarSign,
  Library, Users, Wallet, Clock3
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface AdminStats {
  total_titles: number
  total_copies: number
  active_loans: number
  overdue_loans: number
  members: number
  pending_members: number
  pending_payments: number
  penalties_collected: number
  penalties_outstanding: number
  rental_income: number
  checked_at: string
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Library
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        </div>
        <div className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {sub && <div className="mt-2 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

function fmt(n: number) {
  return n.toLocaleString('en-ET', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      await supabase.rpc('keep_alive')
      const { data, error: err } = await supabase.rpc('admin_stats')
      if (err) throw err
      setStats(data as AdminStats)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60_000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-5 w-5 rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-600 p-4 bg-red-50 rounded-xl">{error}</div>
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">A live overview of library activity and member requests.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        <StatCard icon={Library} label="Book titles" value={stats.total_titles} />
        <StatCard icon={BookCopy} label="Total copies" value={stats.total_copies} />
        <StatCard icon={BookOpen} label="Active loans" value={stats.active_loans} />
        <StatCard icon={AlertTriangle} label="Overdue loans" value={stats.overdue_loans} />
        <StatCard icon={Users} label="Members" value={stats.members} />
        <StatCard icon={Clock3} label="Pending members" value={stats.pending_members} />
        <StatCard icon={CreditCard} label="Pending payments" value={stats.pending_payments} />
        <StatCard icon={DollarSign} label="Rental income" value={`${fmt(stats.rental_income)} ETB`} />
        <StatCard icon={Wallet} label="Penalties collected" value={`${fmt(stats.penalties_collected)} ETB`} />
        <StatCard icon={Wallet} label="Penalties outstanding" value={`${fmt(stats.penalties_outstanding)} ETB`} />
      </div>

      {stats.checked_at && (
        <p className="text-xs text-slate-400 text-right">
          Last updated: {new Date(stats.checked_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}
