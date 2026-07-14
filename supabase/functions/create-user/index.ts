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

    const { role, email, password, full_name, site_id } = await req.json();
    if (!["admin", "site_user"].includes(role)) return json({ error: "Invalid role" }, 400);
    if (!email || !password || !full_name) return json({ error: "Missing fields" }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);

    const table = role === "admin" ? "admins" : "site_users";
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) return json({ error: createErr.message }, 400);

    const profileRow: Record<string, unknown> = {
      id: created.user.id,
      full_name,
      email,
      is_active: true,
    };
    if (role === "site_user") {
      if (!site_id) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return json({ error: "site_id is required for site users" }, 400);
      }
      profileRow.site_id = site_id;
    }

    const { error: insertErr } = await adminClient.from(table).insert(profileRow);
    if (insertErr) {
      await adminClient.auth.admin.deleteUser(created.user.id); // rollback orphaned auth user
      return json({ error: insertErr.message }, 400);
    }

    return json({ success: true, id: created.user.id });
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