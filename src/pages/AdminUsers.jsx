import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MainLayout from '../layouts/MainLayout'

export default function AdminUsers({ session }) {
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    // Si no es admin, no debería estar acá
    if (profileData?.role !== 'admin') {
      window.location.href = '/inicio'
      return
    }

    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    setProfile(profileData)
    setUsers(usersData || [])
    setLoading(false)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)
    setSuccess(null)

    // Crear usuario en Supabase Auth
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true,
    })

    if (authError) {
      setError('No se pudo crear el usuario: ' + authError.message)
      setFormLoading(false)
      return
    }

    // Crear perfil en la tabla profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: form.email,
        full_name: form.full_name,
        role: 'owner',
      })

    if (profileError) {
      setError('Usuario creado pero hubo un error al guardar el perfil')
      setFormLoading(false)
      return
    }

    setSuccess(`Usuario ${form.email} creado correctamente`)
    setForm({ email: '', full_name: '', password: '' })
    setShowForm(false)
    setFormLoading(false)
    fetchData()
  }

  const roleColors = {
    admin: { text: 'text-blue-700',  bg: 'bg-blue-50'  },
    owner: { text: 'text-stone-600', bg: 'bg-stone-100' },
    demo:  { text: 'text-amber-700', bg: 'bg-amber-50'  },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-stone-400 text-sm">Cargando...</p>
    </div>
  )

  return (
    <MainLayout session={session} role={profile?.role}>
      <div className="p-8">

        {/* Header */}
        <div className="bg-blue-50 rounded-2xl px-8 py-6 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-blue-900">Usuarios</h1>
            <p className="text-sm text-blue-600 mt-1">
              {users.length} usuarios registrados
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nuevo usuario
          </button>
        </div>

        {/* Mensaje de éxito */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 mb-6">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-8">
            <h2 className="text-sm font-medium text-stone-700 mb-6">
              Crear nuevo usuario
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Martin Garcia"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="martin@email.com"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">
                  Contraseña inicial
                </label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {formLoading ? 'Creando...' : 'Crear usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-stone-200 text-stone-500 px-6 py-2.5 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de usuarios */}
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">
              Todos los usuarios
            </p>
          </div>
          {users.map((user, i) => {
            const colors = roleColors[user.role] || roleColors.owner
            return (
              <div
                key={user.id}
                className={`flex items-center gap-4 px-6 py-4 ${i < users.length - 1 ? 'border-b border-stone-100' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-medium text-sm">
                  {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-800">
                    {user.full_name || '—'}
                  </p>
                  <p className="text-xs text-stone-400">{user.email}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${colors.text} ${colors.bg}`}>
                  {user.role}
                </span>
                <p className="text-xs text-stone-400">
                  {new Date(user.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>
            )
          })}
        </div>

      </div>
    </MainLayout>
  )
}