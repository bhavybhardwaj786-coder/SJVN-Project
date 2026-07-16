import { supabase } from "@/integrations/client";

async function authedFetch(fnName: string, body: unknown) {
  const { data: sessionData } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session?.access_token}`,
      },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Failed to call ${fnName}`);
  return json;
}

export const usersService = {
  async listAdmins() {
    return supabase.from("admins").select("*").order("full_name");
  },

  async listSiteUsers() {
    return supabase
      .from("site_users")
      .select("*, sites(id, name, code)")
      .order("full_name");
  },

   async listContractors() {
    return supabase
      .from("contractors")
      .select("*, sites(id, name, code)")
      .order("full_name");
  },

  createUser(payload: {
    role: "admin" | "site_user" | "contractor";
    email: string;
    password: string;
    full_name: string;
    site_id?: string;
    designation?: string;
  }) {
    return authedFetch("create-user", payload);
  },

  resetPassword(user_id: string, new_password: string) {
    return authedFetch("reset-password", { user_id, new_password });
  },

  setActive(table: "admins" | "site_users", id: string, is_active: boolean) {
    return supabase.from(table).update({ is_active }).eq("id", id);
  },
};