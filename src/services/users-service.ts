import { apiClient } from "@/lib/apiClient";

export const usersService = {
  listAdmins() {
    return apiClient.get("/users?role=admin") as Promise<{ data: any[] | null; error: string | null }>;
  },

  listSiteUsers() {
    return apiClient.get("/users?role=site_user") as Promise<{ data: any[] | null; error: string | null }>;
  },

  listContractors() {
    return apiClient.get("/users?role=contractor") as Promise<{ data: any[] | null; error: string | null }>;
  },

  createUser(payload: {
    role: "super_admin" | "admin" | "site_user" | "contractor";
    email: string;
    password: string;
    full_name: string;
    site_id?: string;
    designation?: string;
  }) {
    return apiClient.post("/users", payload);
  },

  resetPassword(user_id: string, new_password: string) {
    return apiClient.post(`/users/${user_id}/reset-password`, { new_password });
  },

  // 'table' is kept only so existing call sites in users.tsx don't need to change —
  // the unified backend has a single users table now, so this parameter is unused.
  // 'table' is kept only so existing call sites in users.tsx don't need to change —
  // the unified backend has a single users table now, so this parameter is unused.
  setActive(table: "admins" | "site_users" | "contractors", id: string, is_active: boolean) {
    return apiClient.patch(`/users/${id}/active`, { is_active });
  },

  deleteUser(id: string) {
    return apiClient.delete(`/users/${id}`);
  },

  getUsersByIds(ids: string[]) {
    const params = new URLSearchParams({ ids: ids.join(",") });
    return apiClient.get(`/users/by-ids?${params.toString()}`) as Promise<{ data: any[] | null; error: string | null }>;
  },
};