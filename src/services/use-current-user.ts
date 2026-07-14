import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      return user; // Returns mapped type: id, full_name, role, site_id, designation
    },
    staleTime: 1000 * 60 * 5, // Cache profile state for 5 minutes
    retry: false,
  });
}