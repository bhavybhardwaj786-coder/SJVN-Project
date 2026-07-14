import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization")!;
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { data: superAdmin } = await anonClient
      .from("super_admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!superAdmin) return json({ error: "Forbidden: super_admin only" }, 403);

    const { user_id, new_password } = await req.json();
    if (!user_id || !new_password || new_password.length < 8) {
      return json({ error: "user_id and a password of at least 8 characters are required" }, 400);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });
    if (error) return json({ error: error.message }, 400);

    return json({ success: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}