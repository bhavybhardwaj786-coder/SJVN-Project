import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) throw new Error('Unauthorized operational request')

    // Confirm execution origin holds administrative privileges
    const { data: isSuperAdmin } = await supabaseClient.from('super_admins').select('id').eq('id', user.id).maybeSingle()
    const { data: isAdmin } = await supabaseClient.from('admins').select('id').eq('id', user.id).maybeSingle()
    
    if (!isSuperAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { role, email, password, full_name, site_id, designation } = await req.json()

    // 1. Register base user authentication credentials
    const { data: authUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createError) throw createError

    // 2. Map structural profiles based on administrative targets
    if (role === 'admin') {
      const { error } = await supabaseClient.from('admins').insert({ id: authUser.user.id, full_name, is_active: true })
      if (error) throw error
    } else if (role === 'site_user') {
      const { error } = await supabaseClient.from('site_users').insert({ 
        id: authUser.user.id, 
        full_name, 
        site_id, 
        designation,
        is_active: true 
      })
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true, userId: authUser.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})