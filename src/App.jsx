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
import ForcePasswordChange from './pages/ForcePasswordChange'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Cada vez que cambia la sesión, verificamos si ese usuario
  // tiene pendiente el cambio obligatorio de contraseña
  useEffect(() => {
    if (!session?.user?.id) {
      setMustChangePassword(false)
      setCheckingProfile(false)
      return
    }

    setCheckingProfile(true)
    supabase
      .from('profiles')
      .select('must_change_password')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setMustChangePassword(!!data?.must_change_password)
        setCheckingProfile(false)
      })
  }, [session])

  if (loading || (session && checkingProfile)) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <p className="text-stone-400 text-sm">Cargando...</p>
      </div>
    )
  }

  // Si el usuario está logueado pero tiene pendiente el cambio
  // de contraseña, lo interceptamos antes de mostrar cualquier
  // otra cosa — no puede navegar a ningún lado hasta cambiarla
  if (session && mustChangePassword) {
    return (
      <ForcePasswordChange
        session={session}
        onPasswordChanged={() => setMustChangePassword(false)}
      />
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
    </Routes>
  )
}

export default App