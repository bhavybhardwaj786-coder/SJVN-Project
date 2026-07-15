import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Home, ShieldCheck, Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// IMPORT YOUR IMAGES HERE
import sjvnLogo from "../assets/sjvn-logo.jpeg";
import heroBackground from "../assets/hero-transmission.jpeg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const cardContainerVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      when: "beforeChildren",
      staggerChildren: 0.08,
    }
  }
};

const childVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: "easeOut" } 
  }
};

// --- Redesigned Header Component ---
function SjvnHeader() {
  return (
    <header className="w-full flex flex-col font-sans shadow-sm z-20 relative">
      <div className="bg-[#14647f] py-2 px-4 md:px-8 flex justify-end items-center h-8"></div>

      <div className="bg-gradient-to-r from-white to-[#dceaf0] py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 w-full md:w-auto"
        >
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
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden md:flex"
        >
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full py-1.5 px-4 shadow-sm text-sm font-semibold text-gray-800">
            <ShieldCheck size={16} className="text-[#095a7d]" />
            A Navratna PSU
          </div>
        </motion.div>
      </div>

      <div className="bg-[#227b96] px-4 md:px-8 flex justify-between items-center h-12">
        <div className="h-full flex items-center pr-4 border-r border-[#3a8da6]">
          <Link to="/" className="text-white hover:text-gray-200 transition-colors" aria-label="Go to Home">
            <Home size={20} />
          </Link>
        </div>
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
  const [showPassword, setShowPassword] = useState(false); // Toggle Password visibility State

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

      const { data: superAdmin } = await supabase.from("super_admins").select("id, full_name").eq("id", userId).single();
      if (superAdmin) { navigate({ to: "/authenticated/supadmin" }); return; }

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
    <div className="min-h-screen flex flex-col bg-slate-900 overflow-hidden">
      <SjvnHeader />
      
      <div
        className="flex-1 flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        {/* Cinematic rich dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-950/70 to-blue-900/35" />

        {/* Animated Login Glass Card with dynamic border color shifting */}
        <motion.div 
          variants={cardContainerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-[0_20px_50px_rgba(9,90,125,0.25)] border border-white/60 relative z-10"
        >
          {/* Card Header Section */}
          <div className="text-center mb-6">
            <motion.div 
              variants={childVariants}
              whileHover={{ rotate: 360, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 120, damping: 15 }}
              className="inline-block cursor-pointer"
            >
              <motion.img 
                src={sjvnLogo} 
                alt="SJVN Logo" 
                className="mx-auto w-16 h-16 object-contain mb-3 rounded-xl shadow-md border-2 border-transparent"
                animate={{ 
                  borderColor: ["#227b96", "#ffb600", "#095a7d", "#227b96"] 
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              />
            </motion.div>
            
            {/* Smooth color-changing title gradient */}
            <motion.h4 
              variants={childVariants}
              className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#095a7d] via-[#227b96] to-[#095a7d] tracking-tight"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ backgroundSize: "200% auto" }}
            >
              Welcome to SJVN EMEMP
            </motion.h4>
            <motion.p 
              variants={childVariants}
              className="text-xs text-muted-foreground mt-1"
            >
              Environmental Management & Monitoring Portal
            </motion.p>
          </div>

          <motion.div variants={childVariants}>
            <Tabs defaultValue="login" className="mt-4">
              <TabsList className="grid w-full grid-cols-1 mb-6 bg-slate-100/80 p-1 rounded-lg">
                <TabsTrigger 
                  value="login" 
                  className="rounded-md font-semibold text-sm py-2"
                >
                  Secure Access
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Username Field with active color glow */}
                  <div className="space-y-1.5 relative">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Email or Username
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <motion.div
                        whileFocus={{ scale: 1.01 }}
                        className="rounded-lg"
                      >
                        <Input 
                          id="email" 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="username@sjvn.nic.in" 
                          required 
                          className="pl-10 h-11 border-slate-200 focus-visible:ring-[#227b96] focus-visible:ring-2 focus-visible:border-transparent transition-all rounded-lg" 
                        />
                      </motion.div>
                    </div>
                  </div>

                  {/* Password Field with active color glow & Eye show/hide trigger */}
                  <div className="space-y-1.5 relative">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <motion.div
                        whileFocus={{ scale: 1.01 }}
                        className="rounded-lg"
                      >
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="••••••••" 
                          required 
                          className="pl-10 pr-10 h-11 border-slate-200 focus-visible:ring-[#227b96] focus-visible:ring-2 focus-visible:border-transparent transition-all rounded-lg" 
                        />
                      </motion.div>
                      
                      {/* Password Visibility Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={showPassword ? "eye-open" : "eye-closed"}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </motion.div>
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Color-shifting Gradient Login Button */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                    className="pt-2"
                  >
                    <motion.button 
                      type="submit" 
                      className="w-full h-11 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#227b96] via-[#095a7d] to-[#14647f]"
                      style={{ backgroundSize: "200% auto" }}
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Authenticating...
                        </>
                      ) : (
                        "Sign In to Account"
                      )}
                    </motion.button>
                  </motion.div>
                </form>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Footer Assistance Block with shifting links */}
          <motion.p 
            variants={childVariants}
            className="text-center text-xs text-slate-400 mt-6 pt-5 border-t border-slate-100"
          >
            Authorized Access Only. Having trouble?{" "}
            <motion.a 
              href="#" 
              className="text-[#227b96] font-semibold transition-colors inline-block"
              whileHover={{ scale: 1.05, color: "#ffb600" }}
            >
              Contact System Admin
            </motion.a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}