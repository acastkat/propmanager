import UpdateHistory from '../components/UpdateHistory'

const sample = [
  {
    id: 'a1',
    update_date: '2026-05-01',
    new_amount: 620000,
    previous_amount: 600000,
    index_used: 'IPC',
    notes: 'Ajuste anual según IPC'
  },
  {
    id: 'a2',
    update_date: '2025-11-01',
    new_amount: 600000,
    previous_amount: 580000,
    index_used: 'Contrato',
    notes: ''
  }
]

export default function UpdateHistoryDemo() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Demo: Historial de actualizaciones</h1>
      <UpdateHistory initialUpdates={sample} />
    </div>
  )
}
