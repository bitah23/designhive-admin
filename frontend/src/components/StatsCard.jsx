export default function StatsCard({ label, value, icon: Icon, color, sub }) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-emerald-50 text-emerald-600',
    red:    'bg-red-50 text-red-500',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color] ?? colorMap.blue}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900 leading-tight">
          {value ?? <span className="inline-block w-12 h-7 bg-slate-100 rounded animate-pulse" />}
        </p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
