interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-800',
    active: 'bg-emerald-100 text-emerald-800',
    confirmed: 'bg-emerald-100 text-emerald-800',
    returned: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    requested: 'bg-amber-100 text-amber-800',
    waiting: 'bg-amber-100 text-amber-800',
    notified: 'bg-amber-100 text-amber-800',
    rejected: 'bg-red-100 text-red-800',
    lost: 'bg-red-100 text-red-800',
  }

  const colorClass = colorMap[status] ?? 'bg-gray-100 text-gray-700'
  const label = status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
