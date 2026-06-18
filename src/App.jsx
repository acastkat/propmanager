import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import Payments from './pages/Payments'
import Services from './pages/Services'
import Alerts from './pages/Alerts'
import AdminUsers from './pages/AdminUsers'
import Demo from './pages/Demo'
import UpdateHistoryDemo from './pages/UpdateHistoryDemo'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay una sesión activa al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      // Temporary debug log to inspect session in browser console
      // Remove this after debugging
      console.log('DEBUG SESSION', session)
    })

    // Escuchar cambios de sesión (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <p className="text-stone-400 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <Routes>
      {/* Ruta pública — demo sin login */}
      <Route path="/demo" element={<Demo />} />
      <Route path="/update-history-demo" element={<UpdateHistoryDemo />} />

      {/* Ruta de login */}
      <Route
        path="/login"
        element={session ? <Navigate to="/inicio" /> : <Login />}
      />

      {/* Rutas protegidas — requieren login */}
      <Route
        path="/inicio"
        element={session ? <Dashboard session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/propiedades"
        element={session ? <Properties session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/propiedades/:id"
        element={session ? <Properties session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/servicios"
        element={session ? <Services session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/servicios/:id"
        element={session ? <Services session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/pagos"
        element={session ? <Payments session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/pagos/:id"
        element={session ? <Payments session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/alertas"
        element={session ? <Alerts session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/admin/usuarios"
        element={session ? <AdminUsers session={session} /> : <Navigate to="/login" />}
      />

      {/* Ruta raíz — redirigir según estado */}
      <Route
        path="/"
        element={<Navigate to={session ? "/inicio" : "/login"} />}
      />

      {/* Ruta Pagos */}
      <Route
        path="/pagos"
        element={session ? <Payments session={session} /> : <Navigate to="/login" />}
/>
    </Routes>
  )
}

export default App