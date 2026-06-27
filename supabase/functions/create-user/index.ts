import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    const serviceRoleKey = secretKeys.service_role ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const rawSecretKeys = Deno.env.get('SUPABASE_SECRET_KEYS') ?? 'NO EXISTE'
console.log('DEBUG — SUPABASE_SECRET_KEYS crudo (primeros 50 chars):', rawSecretKeys.substring(0, 50))
console.log('DEBUG — SUPABASE_SERVICE_ROLE_KEY existe:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
console.log('DEBUG — serviceRoleKey final existe:', !!serviceRoleKey, 'longitud:', serviceRoleKey.length)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    )

    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } }
    )

    const { data: { user: callingUser }, error: authError } =
      await supabaseClient.auth.getUser()

    console.log('DEBUG — authError:', authError, 'callingUser.id:', callingUser?.id)

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'No autorizado', debug: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callingProfile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callingUser.id)
      .single()

    console.log('DEBUG — profileFetchError:', profileFetchError, 'callingProfile:', callingProfile)

    if (!callingProfile || (callingProfile.role !== 'admin' && callingProfile.role !== 'owner')) {
      return new Response(
        JSON.stringify({
          error: 'No tenés permisos para crear usuarios',
          debug: {
            callingUserId: callingUser.id,
            callingProfile,
            profileFetchError: profileFetchError?.message,
          },
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, first_name, last_name, role } = await req.json()

    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fullName = `${first_name} ${last_name}`.trim()

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
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: 'No se pudo crear el perfil del usuario', debug: profileError.message }),
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