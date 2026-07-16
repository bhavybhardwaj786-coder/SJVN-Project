import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { 
  Mail,
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
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
// Make sure this is the only SjvnHeader defined in your file!
function SjvnHeader() {
  return (
    <header className="w-full flex flex-col font-sans shadow-sm z-20 relative shrink-0">
      {/* Your Sjvn Header Content goes here */}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[340px] xs:max-w-sm sm:max-w-md z-10 px-4 sm:px-0"
    >
      {/* Snug layout to fit perfectly on short/narrow device viewports */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 xs:p-5 sm:p-6 shadow-2xl backdrop-blur-2xl">
        {/* Header Section */}
        <div className="mb-1 flex items-center justify-center">
          <img
            src={sjvnLogo}
            alt="SJVN Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg bg-white/90 p-1"
          />
        </div>
        <div className="mb-3 text-center">
          <h2 className="text-sm font-semibold text-white sm:text-base tracking-wide">Welcome to SJVN EMEMP</h2>
          <p className="mt-0.5 text-[10px] sm:text-xs text-white/50">Enter your credentials to continue</p>
        </div>

        {/* Tight Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3.5">
          {/* Email */}
          <div className="group">
            <label className="mb-1 block text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
              Username
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40 transition-colors duration-150 group-focus-within:text-[#3FC1A0]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@sjvn.com"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 sm:py-2 pl-9 pr-4 text-xs sm:text-sm text-white placeholder-white/30 outline-none transition-colors duration-150 focus:border-[#3FC1A0]/60"
              />
            </div>
          </div>

          {/* Password */}
          <div className="group">
            <label className="mb-1 block text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40 transition-colors duration-150 group-focus-within:text-[#3FC1A0]" />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 sm:py-2 pl-9 pr-12 text-xs sm:text-sm text-white placeholder-white/30 outline-none transition-colors duration-150 focus:border-[#3FC1A0]/60"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-medium uppercase tracking-wider text-white/45 transition-colors duration-150 hover:text-[#3FC1A0]"
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "authenticating"}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F8B6C] py-2 text-xs sm:text-sm font-medium text-white transition-colors duration-150 hover:bg-[#12A17E] disabled:opacity-70"
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </form>

        {/* Denied Notice */}
        <AnimatePresence>
          {status === "denied" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[10px] text-amber-200/90"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">{errorMsg || "Access denied."}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restricted Access Info */}
        <div className="mt-3 border-t border-white/10 pt-2">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3 w-3 shrink-0 text-amber-300/80" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
                Restricted Access
              </p>
              <p className="mt-0.5 text-[9px] sm:text-[10px] leading-relaxed text-white/40">
                This portal is exclusively intended for authorized SJVN personnel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Page Shell ---
// Exactly ONE 'AuthPage' declaration in the entire file
function AuthPage() {
  return (
    <div className="h-dvh w-screen flex flex-col bg-slate-950 overflow-hidden select-none">
      <SjvnHeader />

      <div
        className="flex-1 min-h-0 w-full flex items-center justify-center bg-cover bg-center bg-no-repeat relative overflow-y-auto"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-[#0B4F86]/80" />
        <LoginCard />
      </div>
    </div>
  );
}