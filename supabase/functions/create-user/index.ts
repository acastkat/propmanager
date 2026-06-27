// supabase/functions/create-user/index.ts
//
// Edge Function que crea un usuario nuevo de forma segura.
// La service_role key vive solo acá, nunca en el frontend.
//
// Flujo:
// 1. Verifica que quien llama esté logueado y sea admin u owner
// 2. Crea el usuario en Supabase Auth con una contraseña temporal
// 3. Crea el perfil en la tabla profiles, marcado como "debe cambiar password"
// 4. Devuelve éxito o el error correspondiente

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Responder a la verificación CORS que hace el browser antes del POST real
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cliente con permisos de administrador (usa la service_role key,
    // disponible automáticamente como variable de entorno en Supabase)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Cliente que respeta el token del usuario que está llamando,
    // para verificar quién es y qué permisos tiene
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } }
    )

    // 1. Verificar que quien llama está logueado
    const { data: { user: callingUser }, error: authError } =
      await supabaseClient.auth.getUser()

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verificar que quien llama es admin u owner
    const { data: callingProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callingUser.id)
      .single()

    if (!callingProfile || (callingProfile.role !== 'admin' && callingProfile.role !== 'owner')) {
      return new Response(
        JSON.stringify({ error: 'No tenés permisos para crear usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Leer los datos del nuevo usuario desde el body de la petición
    const { email, password, first_name, last_name, role } = await req.json()

    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fullName = `${first_name} ${last_name}`.trim()

    // 4. Crear el usuario en Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !newUser?.user) {
      return new Response(
        JSON.stringify({ error: createError?.message || 'No se pudo crear el usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Crear el perfil correspondiente, marcado para forzar cambio de password
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        full_name: fullName,
        role: role || 'owner',
        must_change_password: true,
      })

    if (profileError) {
      // El usuario en Auth ya se creó, pero el perfil falló — lo borramos
      // para no dejar un usuario "fantasma" sin perfil asociado
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: 'No se pudo crear el perfil del usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})