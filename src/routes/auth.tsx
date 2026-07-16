import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { 
  Mail,
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/client";

import sjvnLogo from "../assets/sjvn-logo.jpeg";
import heroBackground from "../assets/hero-transmission.jpeg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type Status = "idle" | "authenticating" | "denied";

// --- Header ---
function SjvnHeader() {
  return (
    <header className="w-full flex flex-col font-sans shadow-sm z-20 relative shrink-0">
      {/* National tricolour strip, consistent with the rest of the site */}
      <div className="flex h-[3px] w-full">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="bg-[#0B4F86] py-2 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center border-b border-black/10 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-4 w-full md:w-auto"
        >
          <div className="bg-white p-1.5 rounded border border-white/20 shadow-sm flex-shrink-0">
            <img
              src={sjvnLogo}
              alt="SJVN Logo"
              className="w-14 h-14 md:w-16 md:h-16 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
              SJVN Limited
            </h1>
            <p className="text-xs md:text-sm font-medium mt-0.5 text-white/75">
              (A Joint Venture of Govt. of India &amp; Govt. of Himachal Pradesh)
            </p>
            <p className="text-[10px] md:text-xs text-white/50 mt-0.5">
              ISO 9001:2015 Certified &middot; CIN: L40101HP1988GOI008409
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden md:flex"
        >
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full py-1.5 px-4 text-sm font-medium text-white">
            <ShieldCheck size={16} className="text-white" />
            A Navratna PSU
          </div>
        </motion.div>
      </div>
    </header>
  );
}

// --- Login Card ---
function LoginCard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "authenticating") return;

    setStatus("authenticating");
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
        setStatus("denied");
        setTimeout(() => setStatus("idle"), 2600);
        return;
      }

      const userId = data.user.id;

      const { data: superAdmin } = await supabase
        .from("super_admins")
        .select("id, full_name")
        .eq("id", userId)
        .single();
      if (superAdmin) {
        navigate({ to: "/authenticated/supadmin" });
        return;
      }

      const { data: admin } = await supabase
        .from("admins")
        .select("id, full_name")
        .eq("id", userId)
        .single();
      if (admin) {
        navigate({ to: "/authenticated/app" });
        return;
      }

      const { data: siteUser } = await supabase
        .from("site_users")
        .select("id, full_name")
        .eq("id", userId)
        .single();
      if (siteUser) {
        navigate({ to: "/authenticated/site" });
        return;
      }


      const { data: contractor } = await supabase
        .from("contractors")
        .select("id, full_name")
        .eq("id", userId)
        .single();
      if (contractor) {
        navigate({ to: "/authenticated/contractor" });
        return;
      }

      setErrorMsg("No role assigned to this account.");
      toast.error("No role assigned to this account.");
      setStatus("denied");
      setTimeout(() => setStatus("idle"), 2600);
      await supabase.auth.signOut();
    } catch (err) {
      setErrorMsg("Something went wrong");
      toast.error("Something went wrong");
      setStatus("denied");
      setTimeout(() => setStatus("idle"), 2600);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-md z-10"
    >
      {/* Optimized padding (p-6 sm:p-7) to preserve dynamic viewport real estate */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-2xl sm:p-7">
        {/* Header */}
        <div className="mb-1 flex items-center justify-center">
          <img
            src={sjvnLogo}
            alt="SJVN Logo"
            className="w-12 h-12 object-contain rounded-lg bg-white/90 p-1"
          />
        </div>
        <div className="mb-4 text-center">
          <h2 className="text-base font-semibold text-white sm:text-lg">Welcome to SJVN EMEMP</h2>
          <p className="mt-0.5 text-xs text-white/50">Enter your official credentials to continue</p>
        </div>

        {/* Form elements with condensed space-y-3.5 spacing */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email */}
          <div className="group">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">
              Username
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition-colors duration-150 group-focus-within:text-[#3FC1A0]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@sjvn.com"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors duration-150 focus:border-[#3FC1A0]/60"
              />
            </div>
          </div>

          {/* Password */}
          <div className="group">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 transition-colors duration-150 group-focus-within:text-[#3FC1A0]" />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-11 pr-16 text-sm text-white placeholder-white/30 outline-none transition-colors duration-150 focus:border-[#3FC1A0]/60"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-white/45 transition-colors duration-150 hover:text-[#3FC1A0]"
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "authenticating"}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F8B6C] py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#12A17E] disabled:opacity-70"
          >
            <AnimatePresence mode="wait" initial={false}>
              {status === "authenticating" ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </form>

        {/* Denied notice */}
        <AnimatePresence>
          {status === "denied" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs text-amber-200/90"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {errorMsg || "Access denied. Credentials could not be verified."}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restricted access notice */}
        <div className="mt-4 border-t border-white/10 pt-3.5">
          <div className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
                Restricted Access
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                This portal is exclusively intended for authorized SJVN personnel. Unauthorized
                access is prohibited and may be monitored.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Page shell ---
function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 overflow-hidden">
      <SjvnHeader />

      <div
        className="flex-1 flex items-start justify-center px-4 py-10 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/80 to-[#0B4F86]/50" />
        <LoginCard />
        </div>
    </div>
  );
}