export default function DetailCards({ rows, columns = 'grid-cols-2', className = '' }) {
  return (
    <div className={`grid ${columns} gap-4 ${className}`}>
      {rows.filter(Boolean).map((row, index) => (
        <div key={index} className="bg-stone-50 rounded-3xl px-5 py-4">
          <p className="text-xs font-medium text-stone-700 mb-2">{row.label}</p>
          <p className="text-sm font-medium text-stone-900 leading-6">{row.value ?? '—'}</p>
        </div>
      ))}
    </div>
  )
}
