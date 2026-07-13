import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Home, ShieldCheck } from "lucide-react"; 

import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// 1. IMPORT YOUR IMAGES HERE
import sjvnLogo from "../assets/sjvn-logo.jpeg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

// --- Redesigned Header Component ---
function SjvnHeader() {
  return (
    <header className="w-full flex flex-col font-sans shadow-sm">
      {/* 1. Top Dark Teal Bar */}
      <div className="bg-[#14647f] py-2 px-4 md:px-8 flex justify-end items-center h-8">
      </div>

      {/* 2. Middle Light Blue Branding Bar */}
      <div className="bg-gradient-to-r from-white to-[#dceaf0] py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-white p-1.5 rounded border border-gray-200 shadow-sm flex-shrink-0">
            <img 
              src={sjvnLogo} 
              alt="SJVN Logo" 
              className="w-16 h-16 md:w-[72px] md:h-[72px] object-contain" 
            />
          </div>
          <div className="flex flex-col text-gray-800">
            <h1 className="text-2xl md:text-[28px] font-extrabold text-[#095a7d] tracking-tight leading-tight">
              SJVN Limited
            </h1>
            <p className="text-xs md:text-sm font-semibold mt-0.5 text-gray-700">
              (A Joint Venture of Govt. of India & Govt. of Himachal Pradesh)
            </p>
            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">
              A Navratna PSU · ISO 9001:2015 Certified · CIN: L40101HP1988GOI008409
            </p>
          </div>
        </div>

        <div className="hidden md:flex">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full py-1.5 px-4 shadow-sm text-sm font-semibold text-gray-800">
            <ShieldCheck size={16} className="text-[#095a7d]" />
            A Navratna PSU
          </div>
        </div>
      </div>

      {/* 3. Bottom Navigation Bar */}
      <div className="bg-[#227b96] px-4 md:px-8 flex justify-between items-center h-12">
        {/* Left: Functional Home Link */}
        <div className="h-full flex items-center pr-4 border-r border-[#3a8da6]">
          <Link to="/" className="text-white hover:text-gray-200 transition-colors" aria-label="Go to Home">
            <Home size={20} />
          </Link>
        </div>
        
        {/* Right: Sign in Button (Already on Auth page, but kept for design consistency) */}
        <div>
          <button className="bg-[#ffb600] cursor-default text-black font-bold py-1.5 px-6 rounded text-sm shadow-sm opacity-90">
            Sign in
          </button>
        </div>
      </div>
    </header>
  );
}

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
      
      // Role checking logic...
      const { data: superAdmin } = await supabase.from("super_admins").select("id, full_name").eq("id", userId).single();
      if (superAdmin) { navigate({ to: "/authenticated/app" }); return; }

      const { data: admin } = await supabase.from("admins").select("id, full_name").eq("id", userId).single();
      if (admin) { navigate({ to: "/authenticated/app" }); return; }

      const { data: siteUser } = await supabase.from("site_users").select("id, full_name").eq("id", userId).single();
      if (siteUser) { navigate({ to: "/authenticated/site" }); return; }

      toast.error("No role assigned to this account.");
      await supabase.auth.signOut();
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SjvnHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <img src={sjvnLogo} alt="SJVN Logo" className="mx-auto w-16 h-16 object-contain mb-4 rounded" />
            <h4 className="text-xl font-bold text-[#095a7d]">Sign in to SJVN EMEMP</h4>
          </div>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid w-full grid-cols-1 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nathpa@sjvn.com" required className="mt-1.5 focus-visible:ring-[#227b96]" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1.5 focus-visible:ring-[#227b96]" />
                </div>
                <Button type="submit" className="w-full bg-[#227b96] hover:bg-[#1a6279] text-white mt-2" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground mt-6 pt-6 border-t">
            Having trouble? <a href="#" className="text-[#227b96] hover:underline font-medium">Contact System Admin</a>
          </p>
        </div>
      </div>
    </div>
  );
}