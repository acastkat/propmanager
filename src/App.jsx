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
import AccountPaused from './pages/AccountPaused'
import Footer from "./components/Footer";

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
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

  // Cada vez que cambia la sesión, verificamos si el usuario
  // tiene pendiente el cambio obligatorio de contraseña o está pausado
  useEffect(() => {
    if (!session?.user?.id) {
      setMustChangePassword(false)
      setIsPaused(false)
      setCheckingProfile(false)
      return
    }

    setCheckingProfile(true)
    supabase
      .from('profiles')
      .select('must_change_password, is_paused')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setMustChangePassword(!!data?.must_change_password)
        setIsPaused(!!data?.is_paused)
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

  // Si la cuenta está pausada, interceptamos antes que cualquier
  // otra cosa — ni siquiera mostramos la pantalla de cambio de password
  if (session && isPaused) {
    return <AccountPaused />
  }

  // Si tiene pendiente el cambio obligatorio de contraseña
  if (session && mustChangePassword) {
    return (
      <ForcePasswordChange
        session={session}
        onPasswordChanged={() => setMustChangePassword(false)}
      />
    )
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/demo" element={<Demo />} />
          <Route path="/update-history-demo" element={<UpdateHistoryDemo />} />

          <Route
            path="/login"
            element={session ? <Navigate to="/inicio" /> : <Login />}
          />

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

          <Route
            path="/"
            element={<Navigate to={session ? "/inicio" : "/login"} />}
          />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App