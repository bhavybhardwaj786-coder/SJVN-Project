import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
}