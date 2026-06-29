// supabase/functions/delete-user/index.ts
//
// Edge Function que elimina un usuario de forma segura.
// Solo admin u owner pueden ejecutar esta acción.
//
// Flujo:
// 1. Verifica que quien llama esté logueado y sea admin u owner
// 2. Verifica que no se esté intentando eliminar a sí mismo
// 3. Elimina el usuario de Supabase Auth
//    (el perfil se borra solo, por el "on delete cascade" de la tabla profiles)

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
    const serviceRoleKey =
      secretKeys.service_role ??
      secretKeys.default ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      ''

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
        JSON.stringify({ error: 'No tenés permisos para eliminar usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Leer el ID del usuario a eliminar
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Falta el ID del usuario a eliminar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. No permitir que alguien se elimine a sí mismo
    if (userId === callingUser.id) {
      return new Response(
        JSON.stringify({ error: 'No podés eliminar tu propia cuenta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Eliminar el usuario de Auth
    // (la fila de profiles se borra sola por el ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})