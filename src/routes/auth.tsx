import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const userId = data.user.id;
    console.log("🔍 Logged in User ID:", userId);

    // Check Super Admin first (highest privilege)
    const { data: superAdmin, error: superAdminError } = await supabase
      .from("super_admins")
      .select("id, full_name")
      .eq("id", userId)
      .single();

    if (superAdmin) {
      toast.success(`Welcome, ${superAdmin.full_name ?? "Super Admin"}`);
      navigate({ to: "/authenticated/app" });
      return;
    }

    // Check Admin next
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id, full_name")
      .eq("id", userId)
      .single();

    if (admin) {
      toast.success(`Welcome, ${admin.full_name ?? "Admin"}`);
      navigate({ to: "/authenticated/app" });
      return;
    }

    // Check Site User last
    const { data: siteUser, error: siteError } = await supabase
      .from("site_users")
      .select("id, full_name")
      .eq("id", userId)
      .single();

    if (siteUser) {
      toast.success(`Welcome, ${siteUser.full_name}`);
      navigate({ to: "/authenticated/site" });
      return;
    }

    // No matching role record found for this authenticated user
    console.error("No role record found for user:", userId, {
      superAdminError,
      adminError,
      siteError,
    });
    toast.error("No role assigned to this account. Contact your administrator.");
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Login Error:", err);
    toast.error("Something went wrong");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mb-4">
            <Leaf className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to SJVN EMEMP Portal</p>
        </div>

        <Tabs defaultValue="login" className="mt-6">
          <TabsList className="grid w-full grid-cols-1 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nathpa@sjvn.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Having trouble? Contact System Admin
        </p>
      </div>
    </div>
  );
}