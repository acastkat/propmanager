import { supabase } from '../lib/supabase'

export default function AccountPaused() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-blue-900">PropManager</p>
          <p className="text-sm text-stone-400 mt-1">Gestión de propiedades</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏸</span>
          </div>
          <h1 className="text-lg font-medium text-stone-800 mb-2">
            Tu cuenta está pausada
          </h1>
          <p className="text-sm text-stone-500 mb-6">
            No podés acceder a la app en este momento. Contactá al administrador
            de tu cuenta para más información.
          </p>

          <button
            onClick={handleLogout}
            className="w-full border border-stone-200 text-stone-500 rounded-lg py-2.5 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}