import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MainLayout from '../layouts/MainLayout'
import UpdateHistory from '../components/UpdateHistory'

const DIAS_ANTICIPACION = 15

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

// Calcula la fecha de actualización de monto que corresponde al ciclo vigente
function calcNextUpdate(contract) {
  if (!contract.update_months || !contract.start_date) return null
  const base = contract.last_update_date
    ? new Date(contract.last_update_date)
    : new Date(contract.start_date)
  let next = new Date(base)
  const today = new Date()
  let currentDue = null

  while (next <= today) {
    currentDue = new Date(next)
    next.setMonth(next.getMonth() + contract.update_months)
  }

  return currentDue || next
}

// Modal para registrar actualización de monto
function UpdateAmountModal({ alert, onConfirm, onClose }) {
  const [newAmount, setNewAmount] = useState('')
  const [newAmountDisplay, setNewAmountDisplay] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newAmount) return
    setLoading(true)
    await onConfirm({
      newAmount: parseFloat(newAmount),
      notes,
      updateDate: new Date().toISOString().split('T')[0],
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
        <p className="text-lg font-semibold text-stone-800 mb-1">
          Registrar actualización de monto
        </p>
        <p className="text-sm text-stone-500 mb-6">
          {alert.propName} · {alert.tenantName}
        </p>

        <div className="bg-stone-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-stone-400">Monto actual</span>
            <span className="text-sm font-medium text-stone-800">
              {formatCurrency(alert.currentAmount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-stone-400">Índice</span>
            <span className="text-sm font-medium text-stone-800">{alert.indexUsed || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-stone-400">Fecha de actualización</span>
            <span className="text-sm font-medium text-stone-800">{formatDate(alert.nextUpdateDate)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-stone-500 block mb-1">
              Nuevo monto mensual ($) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={newAmountDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9,]/g, '')
                setNewAmount(raw.replace(',', '.'))
                setNewAmountDisplay(raw)
              }}
              onBlur={() => {
                if (!newAmount) return
                const num = parseFloat(newAmount)
                if (isNaN(num)) return
                setNewAmountDisplay(num.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }))
              }}
              onFocus={() => setNewAmountDisplay(newAmount || '')}
              placeholder="Ej: 750000"
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">
              Notas <span className="text-stone-300">(opcional)</span>
            </label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Actualización por ICL trimestral"
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || !newAmount}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Registrar actualización'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-stone-200 text-stone-500 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// UpdateHistory moved to components/UpdateHistory

export default function Alerts({ session }) {
  const navigate = useNavigate()
  const [profile, setProfile]       = useState(null)
  const [alerts, setAlerts]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [updateModal, setUpdateModal] = useState(null)
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { fetchData() }, [refreshKey])

  const fetchData = async () => {
    setLoading(true)

    let { data: profileData } = await supabase
      .from('profiles').select('*')
      .eq('id', session.user.id).single()

    if (!profileData && session?.user?.email) {
      const { data: profileByEmail } = await supabase
        .from('profiles').select('*')
        .eq('email', session.user.email).single()
      profileData = profileByEmail
    }

    const { data: properties } = await supabase
      .from('properties').select('*')
      .eq('user_id', session.user.id)

    const propIds = (properties || []).map(p => p.id)
    if (propIds.length === 0) {
      setProfile(profileData)
      setAlerts([])
      setLoading(false)
      return
    }

    const today    = new Date()
    const alertList = []

    // ── 1. Contratos por vencer ──────────────────────────
    const { data: contracts } = await supabase
      .from('contracts')
      .select('*, properties(name)')
      .in('property_id', propIds)

    for (const contract of contracts || []) {
      if (!contract.end_date) continue
      const endDate  = new Date(contract.end_date)
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))

      if (daysLeft <= 60 && daysLeft > 0) {
        alertList.push({
          id:         `contract-${contract.id}`,
          level:      daysLeft <= DIAS_ANTICIPACION ? 'urgente' : 'proxima',
          icon:       '📅',
          type:       'contrato_vence',
          title:      'Contrato por vencer',
          sub:        `${contract.properties?.name} · ${contract.tenant_name}`,
          pill:       daysLeft <= DIAS_ANTICIPACION
            ? `Vence en ${daysLeft} días`
            : `Vence en ${daysLeft} días`,
          date:       contract.end_date,
          contractId: contract.id,
          propertyId: contract.property_id,
          propName:   contract.properties?.name,
          actionLabel:'Ir a propiedades',
          actionPath: '/propiedades',
        })
      }

      // ── 2. Actualización de monto pendiente ─────────────
      if (contract.update_months) {
        const nextUpdate = calcNextUpdate(contract)
        if (!nextUpdate) continue
        const daysToUpdate = Math.ceil((nextUpdate - today) / (1000 * 60 * 60 * 24))

        if (daysToUpdate <= DIAS_ANTICIPACION) {
          alertList.push({
            id:             `update-${contract.id}`,
            level:          daysToUpdate <= 0 ? 'urgente' : 'proxima',
            icon:           '📈',
            type:           'actualizacion_monto',
            title:          daysToUpdate <= 0
              ? 'Actualización de alquiler vencida'
              : 'Próxima actualización de alquiler',
            sub:            `${contract.properties?.name} · ${contract.tenant_name}`,
            pill:           daysToUpdate <= 0
              ? `Venció hace ${Math.abs(daysToUpdate)} días`
              : `En ${daysToUpdate} días`,
            date:           nextUpdate.toISOString().split('T')[0],
            contractId:     contract.id,
            propertyId:     contract.property_id,
            propName:       contract.properties?.name,
            tenantName:     contract.tenant_name,
            currentAmount:  contract.last_update_amount || contract.monthly_rent,
            indexUsed:      contract.update_index,
            nextUpdateDate: nextUpdate.toISOString().split('T')[0],
            actionLabel:    'Ver contrato',
            actionPath:     `/propiedades/${contract.property_id}`,
          })
        }
      }
    }

    // ── 3. Pagos vencidos sin cobrar ─────────────────────
    const { data: payments } = await supabase
      .from('payments')
      .select('*, properties(name)')
      .in('property_id', propIds)
      .eq('status', 'pendiente')

    for (const payment of payments || []) {
      if (!payment.payment_date) continue
      const dueDate  = new Date(payment.payment_date)
      const daysLate = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))
      if (daysLate > 0) {
        alertList.push({
          id:         `payment-${payment.id}`,
          level:      'urgente',
          icon:       '🧾',
          type:       'pago_vencido',
          title:      'Pago no recibido',
          sub:        `${payment.type} · ${payment.properties?.name}`,
          pill:       `${daysLate} día${daysLate > 1 ? 's' : ''} de retraso`,
          date:       payment.payment_date,
          paymentId:  payment.id,
          actionLabel:'Ir a pagos',
          actionPath: '/pagos',
        })
      }
    }

    // ── 4. Servicios vencidos o por vencer ───────────────
    const { data: services } = await supabase
      .from('services')
      .select('*, properties(name)')
      .in('property_id', propIds)
      .or('paid_by_tenant.eq.false,paid_by_tenant.is.null')

    for (const svc of services || []) {
      if (!svc.due_date) continue
      const dueDate  = new Date(svc.due_date)
      const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

      if (daysLeft <= DIAS_ANTICIPACION) {
        const isOverdue = daysLeft <= 0
        const dueTitle = svc.paid_by_owner
          ? 'Servicio pagado por el dueño, falta inquilino'
          : 'Servicio adeudado'
        alertList.push({
          id:           `service-${svc.id}`,
          level:        isOverdue ? 'urgente' : 'proxima',
          icon:         '⚡',
          type:         svc.paid_by_owner
            ? 'servicio_falta_inquilino'
            : 'servicio_adeudado',
          title:        dueTitle,
          sub:          `${svc.type} · ${svc.properties?.name}`,
          pill:         isOverdue
            ? `Venció hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) > 1 ? 's' : ''}`
            : `Vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`,
          date:         svc.due_date,
          serviceId:    svc.id,
          serviceStatus: svc.status,
          actionLabel:  'Ir a servicios',
          actionPath:   '/servicios',
        })
      }
    }

    // Ordenar: urgentes primero, después por fecha
    alertList.sort((a, b) => {
      if (a.level === 'urgente' && b.level !== 'urgente') return -1
      if (a.level !== 'urgente' && b.level === 'urgente') return 1
      return new Date(a.date) - new Date(b.date)
    })

    setProfile(profileData)
    setAlerts(alertList)
    setLoading(false)
  }

  // Registrar actualización de monto
  const handleUpdateAmount = async ({ newAmount, notes, updateDate }) => {
    const alert = updateModal

    // Insertar en historial
    await supabase.from('contract_updates').insert({
      contract_id:     alert.contractId,
      property_id:     alert.propertyId,
      previous_amount: alert.currentAmount,
      new_amount:      newAmount,
      update_date:     updateDate,
      index_used:      alert.indexUsed,
      notes,
    })

    // Actualizar el contrato con el nuevo monto y fecha de última actualización
    await supabase.from('contracts').update({
      monthly_rent:       newAmount,
      last_update_date:   updateDate,
      last_update_amount: newAmount,
    }).eq('id', alert.contractId)

    setUpdateModal(null)
    setRefreshKey(k => k + 1)
  }

  const handleAlertAction = (alert) => {
    if (alert.type === 'actualizacion_monto') {
      setUpdateModal(alert)
      return
    }

    if (alert.actionPath) {
      if (alert.serviceId) {
        navigate(`/servicios/${alert.serviceId}`, { state: {
          serviceId: alert.serviceId,
          paymentId: alert.paymentId,
          contractId: alert.contractId,
          propertyId: alert.propertyId,
        } })
      } else if (alert.paymentId) {
        navigate(`/pagos/${alert.paymentId}`, { state: {
          serviceId: alert.serviceId,
          paymentId: alert.paymentId,
          contractId: alert.contractId,
          propertyId: alert.propertyId,
        } })
      } else if (alert.propertyId) {
        navigate(`/propiedades/${alert.propertyId}`, { state: {
          serviceId: alert.serviceId,
          paymentId: alert.paymentId,
          contractId: alert.contractId,
          propertyId: alert.propertyId,
        } })
      } else {
        navigate(alert.actionPath, { state: {
          serviceId: alert.serviceId,
          paymentId: alert.paymentId,
          contractId: alert.contractId,
          propertyId: alert.propertyId,
        } })
      }
      return
    }
  }

  const levelStyles = {
    urgente: {
      card: 'bg-red-50 border-red-200',
      pill: 'bg-white text-red-700 border border-red-200',
      icon: 'bg-red-100',
      label: 'text-red-600',
    },
    proxima: {
      card: 'bg-amber-50 border-amber-200',
      pill: 'bg-white text-amber-700 border border-amber-200',
      icon: 'bg-amber-100',
      label: 'text-amber-600',
    },
  }

  const urgentes = alerts.filter(a => a.level === 'urgente')
  const proximas = alerts.filter(a => a.level === 'proxima')

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-stone-400 text-sm">Cargando...</p>
    </div>
  )

  const AlertCard = ({ alert }) => {
    const styles = levelStyles[alert.level] || levelStyles.proxima
    return (
      <div className={`border rounded-xl px-6 py-4 flex items-start gap-4 ${styles.card}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5 ${styles.icon}`}>
          {alert.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-stone-800">{alert.title}</p>
          <p className="text-xs text-stone-500 mt-0.5">{alert.sub}</p>
          {alert.serviceStatus && (
            <p className="text-xs text-stone-400 mt-1">Estado: <span className="font-medium text-stone-800">{alert.serviceStatus}</span></p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${styles.pill}`}>
              {alert.pill}
            </span>
            {alert.actionLabel && (
              <button
                onClick={() => handleAlertAction(alert)}
                className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                {alert.actionLabel} →
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="text-xs text-stone-400">{formatDate(alert.date)}</p>
          {/* Ver historial para actualizaciones */}
          {alert.type === 'actualizacion_monto' && (
            <button
              onClick={() => setSelectedHistory(
                selectedHistory === alert.contractId ? null : alert.contractId
              )}
              className="text-xs text-blue-600 hover:underline"
            >
              {selectedHistory === alert.contractId ? 'Ocultar historial' : 'Ver historial'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <MainLayout session={session} role={profile?.role}>
      <div className="p-8">

        {/* Modal actualización de monto */}
        {updateModal && (
          <UpdateAmountModal
            alert={updateModal}
            onConfirm={handleUpdateAmount}
            onClose={() => setUpdateModal(null)}
          />
        )}

        {/* Header */}
        <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-8">
          <h1 className="text-2xl font-semibold text-blue-900">Alertas</h1>
          <p className={`text-sm mt-1 ${urgentes.length > 0 ? 'text-red-500' : 'text-blue-600'}`}>
            {urgentes.length > 0
              ? `${urgentes.length} requieren atención inmediata`
              : 'Todo en orden'}
          </p>
        </div>

        {/* Stats */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { val: urgentes.length, lbl: 'Urgentes',  accent: 'bg-red-500'   },
              { val: proximas.length, lbl: 'Próximas',  accent: 'bg-amber-500' },
              { val: alerts.filter(a => a.type === 'actualizacion_monto').length, lbl: 'Actualizaciones de monto', accent: 'bg-blue-600' },
            ].map((st, i) => (
              <div key={i} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center gap-4">
                <div className={`w-1 h-10 rounded-full ${st.accent}`} />
                <div>
                  <p className="text-2xl font-semibold text-stone-800">{st.val}</p>
                  <p className="text-sm text-stone-400">{st.lbl}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 px-6 py-16 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-medium text-stone-700">Todo en orden</p>
            <p className="text-xs text-stone-400 mt-1">
              No hay alertas pendientes por ahora
            </p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Urgentes */}
            {urgentes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 uppercase tracking-wider mb-3">
                  🔴 Urgentes — requieren atención
                </p>
                <div className="space-y-3">
                  {urgentes.map(alert => (
                    <div key={alert.id}>
                      <AlertCard alert={alert} />
                      {/* Historial inline */}
                      {alert.type === 'actualizacion_monto' && selectedHistory === alert.contractId && (
                        <div className="bg-white border border-stone-200 border-t-0 rounded-b-xl px-6 py-4 -mt-1">
                          <h3 className="text-sm font-medium text-stone-700 mb-4">Historial de actualizaciones</h3>
                          <UpdateHistory
                            contractId={alert.contractId}
                            propertyId={alert.propertyId}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximas */}
            {proximas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-3">
                  🟡 Próximas — en los próximos {DIAS_ANTICIPACION} días
                </p>
                <div className="space-y-3">
                  {proximas.map(alert => (
                    <div key={alert.id}>
                      <AlertCard alert={alert} />
                      {alert.type === 'actualizacion_monto' && selectedHistory === alert.contractId && (
                        <div className="bg-white border border-stone-200 border-t-0 rounded-b-xl px-6 py-4 -mt-1">
                          <h3 className="text-sm font-medium text-stone-700 mb-4">Historial de actualizaciones</h3>
                          <UpdateHistory
                            contractId={alert.contractId}
                            propertyId={alert.propertyId}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </MainLayout>
  )
}