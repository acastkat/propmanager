import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'

// Datos de ejemplo fijos — no vienen de Supabase
const demoSession = {
  user: { email: 'demo@propmanager.com' }
}

const demoProfile = {
  full_name: 'Martin (Demo)',
  role: 'demo',
}

const demoProperties = [
  { id: '1', name: 'Depto Palermo',     address: 'Zona Palermo, CABA',    status: 'alquilada', type: 'depto' },
  { id: '2', name: 'Casa Villa Urquiza',address: 'Villa Urquiza, CABA',   status: 'alquilada', type: 'casa'  },
  { id: '3', name: 'Local Flores',      address: 'Flores, CABA',          status: 'vacia',     type: 'local' },
]

const demoPayments = [
  { id: '1', type: 'alquiler', status: 'pagado',    amount: 620000, payment_date: '2026-05-01', payment_method: 'transferencia', notes: null,                    properties: { name: 'Depto Palermo'      } },
  { id: '2', type: 'alquiler', status: 'pendiente', amount: 620000, payment_date: '2026-05-10', payment_method: null,            notes: 'Sin confirmar pago',     properties: { name: 'Casa Villa Urquiza' } },
  { id: '3', type: 'gas',      status: 'pagado',    amount: 18500,  payment_date: '2026-05-03', payment_method: null,            notes: 'Abonado por inquilino',  properties: { name: 'Depto Palermo'      } },
  { id: '4', type: 'luz',      status: 'vencido',   amount: 23800,  payment_date: '2026-05-05', payment_method: null,            notes: 'Pendiente de pago',      properties: { name: 'Casa Villa Urquiza' } },
]

const demoAlerts = [
  { id: '1', level: 'urgente', icon: '📅', title: 'Contrato por vencer',   sub: 'Casa Villa Urquiza · Carlos Lopez', pill: 'Vence en 22 días'    },
  { id: '2', level: 'urgente', icon: '🧾', title: 'Pago no recibido',      sub: 'Alquiler mayo · Casa Villa Urquiza',pill: '5 días de retraso'   },
  { id: '3', level: 'proxima', icon: '📈', title: 'Actualización de cuota',sub: 'Depto Palermo · ICL julio',          pill: 'En 54 días'          },
  { id: '4', level: 'proxima', icon: '⚡', title: 'Servicio por vencer',   sub: 'Luz · Depto Palermo',               pill: 'Vence 15 may'        },
]

const demoServices = [
  { id: '1', type: 'Gas',      status: 'pagado',    amount: 18500, due_date: '2026-05-10', paid_by_tenant: true,  properties: { name: 'Depto Palermo'      } },
  { id: '2', type: 'Luz',      status: 'vencido',   amount: 23800, due_date: '2026-05-05', paid_by_tenant: false, properties: { name: 'Casa Villa Urquiza' } },
  { id: '3', type: 'Expensas', status: 'pagado',    amount: 24000, due_date: '2026-05-15', paid_by_tenant: false, properties: { name: 'Depto Palermo'      } },
  { id: '4', type: 'Luz',      status: 'pendiente', amount: 23800, due_date: '2026-05-20', paid_by_tenant: false, properties: { name: 'Depto Palermo'      } },
]

// ── Componentes internos de la demo ──────────────────────────

function DemoBanner({ navigate }) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center justify-between">
      <p className="text-sm text-amber-700">
        🎯 Estás viendo la <strong>versión demo</strong> con datos de ejemplo
      </p>
      <button
        onClick={() => navigate('/login')}
        className="bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
      >
        Quiero mi cuenta →
      </button>
    </div>
  )
}

function DemoHome() {
  const totalCobrado = demoPayments
    .filter(p => p.status === 'pagado' && p.type === 'alquiler')
    .reduce((acc, p) => acc + p.amount, 0)

  const pendientes = demoPayments.filter(p => p.status === 'pendiente').length

  const statusColors = {
    pagado:    { dot: 'bg-green-600', text: 'text-green-700', bg: 'bg-green-50'  },
    pendiente: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50'  },
    vencido:   { dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50'    },
  }

  const propColors = {
    alquilada: { text: 'text-green-700', bg: 'bg-green-50',  label: 'Alquilada'  },
    vacia:     { text: 'text-stone-500', bg: 'bg-stone-100', label: 'Vacía'      },
    propia:    { text: 'text-blue-700',  bg: 'bg-blue-50',   label: 'Mi vivienda'},
  }

  return (
    <div className="p-8">
      <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-8">
        <h1 className="text-2xl font-semibold text-blue-900">
          Hola, Martin 👋
        </h1>
        <p className="text-sm text-blue-600 mt-1">
          3 propiedades · mayo 2026
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-6 flex items-center gap-4">
          <div className="w-1 h-12 bg-blue-600 rounded-full" />
          <div>
            <p className="text-2xl font-semibold text-stone-800">
              ${totalCobrado.toLocaleString('es-AR')}
            </p>
            <p className="text-sm text-stone-400 mt-1">Cobrado este mes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-6 flex items-center gap-4">
          <div className="w-1 h-12 bg-amber-500 rounded-full" />
          <div>
            <p className="text-2xl font-semibold text-stone-800">{pendientes}</p>
            <p className="text-sm text-stone-400 mt-1">Pagos pendientes</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-sm font-medium text-stone-700">Mayo 2026</h2>
          <span className="text-xs text-blue-600">Ver todo →</span>
        </div>
        {demoPayments.map((payment, i) => {
          const colors = statusColors[payment.status]
          return (
            <div key={payment.id}
              className={`flex items-center gap-4 px-6 py-4 ${i < demoPayments.length - 1 ? 'border-b border-stone-100' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-800">
                  {payment.type === 'alquiler' ? 'Alquiler' : payment.type} — {payment.properties.name}
                </p>
                <p className="text-xs text-stone-400">{payment.notes || payment.payment_method}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-stone-800">
                  ${payment.amount.toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-stone-400">{payment.payment_date}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors.text} ${colors.bg}`}>
                {payment.status}
              </span>
            </div>
          )
        })}
      </div>

      <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">
        Mis propiedades
      </h2>
      <div className="space-y-3">
        {demoProperties.map(prop => {
          const colors = propColors[prop.status]
          return (
            <div key={prop.id}
              className="bg-white rounded-xl border border-stone-200 px-6 py-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-lg">
                ⌂
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-800">{prop.name}</p>
                <p className="text-xs text-stone-400">{prop.address}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors.text} ${colors.bg}`}>
                {colors.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Página principal Demo ─────────────────────────────────────
export default function Demo() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('inicio')

  const tabs = [
    { id: 'inicio',    label: 'Inicio'    },
    { id: 'servicios', label: 'Servicios' },
    { id: 'alertas',   label: 'Alertas'   },
  ]

  const statusColors = {
    pagado:    { dot: 'bg-green-600', text: 'text-green-700', bg: 'bg-green-50' },
    pendiente: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    vencido:   { dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50'   },
  }

  const levelStyles = {
    urgente: { card: 'bg-red-50 border-red-200',   pill: 'bg-white text-red-700',   icon: 'bg-red-100'   },
    proxima: { card: 'bg-amber-50 border-amber-200',pill: 'bg-white text-amber-700', icon: 'bg-amber-100' },
  }

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      <DemoBanner navigate={navigate} />
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar demo */}
        <aside className="w-64 bg-stone-100 border-r border-stone-200 flex flex-col">
          <div className="px-6 py-6 border-b border-stone-200">
            <p className="text-lg font-bold text-blue-900">PropManager</p>
            <p className="text-sm text-stone-400">Gestión de propiedades</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left flex items-center px-4 py-3 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-900 font-medium border-l-4 border-blue-600'
                    : 'text-stone-500 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="px-6 py-4 border-t border-stone-200">
            <p className="text-sm font-medium text-stone-700">Martin (Demo)</p>
            <p className="text-xs text-stone-400 mb-3">demo</p>
            <button
              onClick={() => navigate('/login')}
              className="text-xs text-blue-600 hover:underline"
            >
              Crear mi cuenta →
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'inicio' && <DemoHome />}

          {activeTab === 'servicios' && (
            <div className="p-8">
              <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-8">
                <h1 className="text-2xl font-semibold text-blue-900">Servicios</h1>
                <p className="text-sm text-blue-600 mt-1">Todas las propiedades</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200">
                {demoServices.map((svc, i) => {
                  const colors = statusColors[svc.status]
                  return (
                    <div key={svc.id}
                      className={`flex items-center gap-4 px-6 py-4 ${i < demoServices.length - 1 ? 'border-b border-stone-100' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-800">
                          {svc.type} — {svc.properties.name}
                        </p>
                        <p className="text-xs text-stone-400">
                          Vence {svc.due_date}
                          {svc.paid_by_tenant && ' · Abonado por inquilino'}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-stone-800">
                        ${svc.amount.toLocaleString('es-AR')}
                      </p>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors.text} ${colors.bg}`}>
                        {svc.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'alertas' && (
            <div className="p-8">
              <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-8">
                <h1 className="text-2xl font-semibold text-blue-900">Alertas</h1>
                <p className="text-sm text-red-500 mt-1">2 requieren atención</p>
              </div>
              <div className="space-y-3">
                {demoAlerts.map(alert => {
                  const styles = levelStyles[alert.level]
                  return (
                    <div key={alert.id}
                      className={`border rounded-xl px-6 py-4 flex items-center gap-4 ${styles.card}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${styles.icon}`}>
                        {alert.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-800">{alert.title}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{alert.sub}</p>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium mt-2 inline-block ${styles.pill}`}>
                          {alert.pill}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}