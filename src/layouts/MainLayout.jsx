import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const navItems = [
  { path: '/inicio',      label: 'Inicio'    },
  { path: '/propiedades', label: 'Registro de propiedades'     },
  { path: '/pagos', label: 'Pago de alquileres' },
  { path: '/servicios',   label: 'Gestión de servicios' },
  { path: '/alertas',     label: 'Alertas'   },

]

export default function MainLayout({ children, session, role }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-stone-50">

      {/* Sidebar */}
      <aside className="w-64 bg-stone-100 border-r border-stone-200 flex flex-col">

        {/* Logo */}
        <div className="px-6 py-6 border-b border-stone-200">
          <p className="text-lg font-bold text-blue-900">PropManager</p>
          <p className="text-sm text-stone-400">Gestión de propiedades</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-medium border-l-4 border-blue-600'
                    : 'text-stone-500 hover:bg-stone-200'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {/* Solo visible para admin */}
          {role === 'admin' && (
            <NavLink
              to="/admin/usuarios"
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-medium border-l-4 border-blue-600'
                    : 'text-stone-500 hover:bg-stone-200'
                }`
              }
            >
              Usuarios
            </NavLink>
          )}
        </nav>

        {/* Usuario y logout */}
        <div className="px-6 py-4 border-t border-stone-200">
          <p className="text-sm font-medium text-stone-700">
            {session?.user?.email}
          </p>
          <p className="text-xs text-stone-400 mb-3">{role}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-stone-400 hover:text-red-500 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

    </div>
  )
}