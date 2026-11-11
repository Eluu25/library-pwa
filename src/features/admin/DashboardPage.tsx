import { useEffect, useState, useCallback } from 'react'
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

function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-1">
      <div className="text-2xl">{emoji}</div>
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-brand-700">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-700">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard emoji="📚" label="Titles" value={stats.total_titles} />
        <StatCard emoji="📖" label="Copies" value={stats.total_copies} />
        <StatCard emoji="🔄" label="Active Loans" value={stats.active_loans} />
        <StatCard emoji="⚠️" label="Overdue" value={stats.overdue_loans} />
        <StatCard emoji="👥" label="Members" value={stats.members} />
        <StatCard emoji="⏳" label="Pending Members" value={stats.pending_members} />
        <StatCard emoji="💳" label="Pending Payments" value={stats.pending_payments} />
        <StatCard emoji="💵" label="Rental Income" value={`${fmt(stats.rental_income)} ETB`} />
        <StatCard emoji="🏷️" label="Collected Penalties" value={`${fmt(stats.penalties_collected)} ETB`} />
        <StatCard emoji="📉" label="Outstanding" value={`${fmt(stats.penalties_outstanding)} ETB`} />
      </div>

      {stats.checked_at && (
        <p className="text-xs text-slate-400 text-right">
          Last updated: {new Date(stats.checked_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}
