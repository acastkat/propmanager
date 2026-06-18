import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MainLayout from '../layouts/MainLayout'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [properties, setProperties] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Traer perfil del usuario
    let { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!profileData && session?.user?.email) {
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', session.user.email)
        .single()
      profileData = profileByEmail
    }

    // Traer propiedades
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', session.user.id)

    // Traer pagos del mes actual
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*, properties(name)')
      .gte('created_at', firstDay)
      .lte('created_at', lastDay)

    setProfile(profileData)
    setProperties(propertiesData || [])
    setPayments(paymentsData || [])
    setLoading(false)
  }

  // Calcular totales
  const totalCobrado = payments
    .filter(p => p.status === 'pagado' && p.type === 'alquiler')
    .reduce((acc, p) => acc + p.amount, 0)

  const pendientes = payments.filter(p => p.status === 'pendiente').length

  const mes = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' })

  const statusColors = {
    pagado:    { dot: 'bg-green-600',  text: 'text-green-700',  bg: 'bg-green-50'  },
    pendiente: { dot: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50'  },
    vencido:   { dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50'    },
  }

  const propStatusColors = {
    alquilada: { text: 'text-green-700', bg: 'bg-green-50',  label: 'Alquilada' },
    vacia:     { text: 'text-stone-500', bg: 'bg-stone-100', label: 'Vacía'     },
    propia:    { text: 'text-blue-700',  bg: 'bg-blue-50',   label: 'Mi vivienda'},
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-stone-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <MainLayout session={session} role={profile?.role}>
      <div className="p-8">

        {/* Header */}
        <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-8">
          <h1 className="text-2xl font-semibold text-blue-900">
            Hola, {profile?.full_name || session.user.email} 👋
          </h1>
          <p className="text-sm text-blue-600 mt-1">
            {properties.length} propiedades · {mes}
          </p>
        </div>

        {/* Stat cards */}
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

        {/* Bloque este mes */}
        <div className="bg-white rounded-xl border border-stone-200 mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h2 className="text-sm font-medium text-stone-700 capitalize">{mes}</h2>
            <span className="text-xs text-blue-600 cursor-pointer hover:underline">
              Ver todo →
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-stone-400">No hay movimientos este mes todavía</p>
            </div>
          ) : (
            payments.map((payment, i) => {
              const colors = statusColors[payment.status] || statusColors.pendiente
              return (
                <div
                  key={payment.id}
                  className={`flex items-center gap-4 px-6 py-4 ${i < payments.length - 1 ? 'border-b border-stone-100' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">
                      {payment.type === 'alquiler' ? 'Alquiler' : payment.type} — {payment.properties?.name}
                    </p>
                    <p className="text-xs text-stone-400">{payment.notes || payment.payment_method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-stone-800">
                      ${payment.amount.toLocaleString('es-AR')}
                    </p>
                    <p className="text-xs text-stone-400">
                      {payment.payment_date || 'Sin fecha'}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors.text} ${colors.bg}`}>
                    {payment.status}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Mis propiedades */}
        <div>
          <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">
            Mis propiedades
          </h2>
          <div className="space-y-3">
            {properties.length === 0 ? (
              <div className="bg-white rounded-xl border border-stone-200 px-6 py-8 text-center">
                <p className="text-sm text-stone-400">Todavía no tenés propiedades cargadas</p>
              </div>
            ) : (
              properties.map(prop => {
                const colors = propStatusColors[prop.status] || propStatusColors.vacia
                return (
                  <div
                    key={prop.id}
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
              })
            )}

            {/* Botón agregar */}
            <button className="w-full border border-dashed border-blue-300 rounded-xl py-3 text-sm text-blue-600 hover:bg-blue-50 transition-colors">
              + Agregar propiedad
            </button>
          </div>
        </div>

      </div>
    </MainLayout>
  )
}