import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-AR')
}

function formatCurrency(value) {
  if (!value && value !== 0) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return '$ ' + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function UpdateHistory({ contractId, initialUpdates }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If `initialUpdates` is provided (test/demo), use it and skip Supabase fetch
    if (initialUpdates) {
      setUpdates(initialUpdates)
      setLoading(false)
      return
    }

    if (!contractId) {
      setUpdates([])
      setLoading(false)
      return
    }

    supabase
      .from('contract_updates')
      .select('*')
      .eq('contract_id', contractId)
      .order('update_date', { ascending: false })
      .then(({ data }) => {
        setUpdates(data || [])
        setLoading(false)
      })
  }, [contractId])

  if (loading) return <p className="text-xs text-stone-400 p-4">Cargando historial...</p>
  if (updates.length === 0) return (
    <p className="text-xs text-stone-400 p-4">Sin actualizaciones registradas todavía.</p>
  )

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left mb-2">
        <thead>
          <tr className="text-xs text-stone-700 ">
            <th className="px-3 py-2">Fecha de actualización</th>
            <th className="px-3 py-2">Monto</th>
            <th className="px-3 py-2">Actualiza por</th>
            <th className="px-3 py-2">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {updates.map((u) => (
            <tr key={u.id} className="border-t border-stone-100 last:border-b">
              <td className="px-3 py-3 align-top text-stone-600">{formatDate(u.update_date)}</td>
              <td className="px-3 py-3 align-top font-medium text-stone-800">{formatCurrency(u.new_amount)}</td>
              <td className="px-3 py-3 align-top text-stone-600">{u.index_used || '—'}</td>
              <td className="px-3 py-3 align-top text-stone-600">{u.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
