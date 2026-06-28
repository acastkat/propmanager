import { useState } from 'react'
import { supabase } from '../lib/supabase'

function checkPasswordRules(password) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  }
}

function isPasswordValid(password) {
  const rules = checkPasswordRules(password)
  return rules.length && rules.upper && rules.lower && rules.number
}

export default function ForcePasswordChange({ session, onPasswordChanged }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const rules = checkPasswordRules(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid(password)) {
      setError('La contraseña no cumple con los requisitos de seguridad')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    // 1. Actualizar la contraseña en Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('No se pudo actualizar la contraseña: ' + updateError.message)
      setLoading(false)
      return
    }

    // 2. Marcar en el perfil que ya no necesita cambiar la contraseña
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', session.user.id)

    setLoading(false)

    if (profileError) {
      setError('La contraseña se cambió, pero hubo un error al actualizar tu perfil: ' + profileError.message)
      return
    }

    onPasswordChanged()
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-blue-900">PropManager</p>
          <p className="text-sm text-stone-400 mt-1">Gestión de propiedades</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
          <h1 className="text-lg font-medium text-stone-800 mb-2">
            Creá tu contraseña
          </h1>
          <p className="text-sm text-stone-500 mb-6">
            Por seguridad, necesitás definir una contraseña propia antes de continuar.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-xs text-stone-500 block mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Creá una contraseña segura"
                required
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-stone-50"
              />

              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className={`text-xs flex items-center gap-1.5 ${rules.length ? 'text-green-600' : 'text-stone-400'}`}>
                    <span>{rules.length ? '✓' : '○'}</span> Mínimo 8 caracteres
                  </p>
                  <p className={`text-xs flex items-center gap-1.5 ${rules.upper ? 'text-green-600' : 'text-stone-400'}`}>
                    <span>{rules.upper ? '✓' : '○'}</span> Al menos una mayúscula
                  </p>
                  <p className={`text-xs flex items-center gap-1.5 ${rules.lower ? 'text-green-600' : 'text-stone-400'}`}>
                    <span>{rules.lower ? '✓' : '○'}</span> Al menos una minúscula
                  </p>
                  <p className={`text-xs flex items-center gap-1.5 ${rules.number ? 'text-green-600' : 'text-stone-400'}`}>
                    <span>{rules.number ? '✓' : '○'}</span> Al menos un número
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-stone-500 block mb-1">
                Repetir contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repetí la contraseña"
                required
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-stone-50"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña y continuar'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}