import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authService } from "@/services/auth";
import { ChevronDown, Sliders } from "lucide-react";

export const Route = createFileRoute("/authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const user = await authService.getCurrentUser();
    
    // Drop execution if the user session does not exist
    if (!user) {
      throw redirect({ to: "/auth" });
    }
    
    // Support access for both standard Administrators and Master Super Admins
    const hasAdminAccess = user.role === "admin" || user.role === "super_admin";
    if (!hasAdminAccess) {
      throw redirect({ to: "/authenticated/site" });
    }
  },
  component: () => <Outlet />,
});