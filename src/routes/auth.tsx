import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Home, ShieldCheck, User as UserIcon, Mail, Lock, ArrowRight, Fingerprint, AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/client";

// IMPORT YOUR IMAGES HERE
import sjvnLogo from "../assets/sjvn-logo.jpeg";
import heroBackground from "../assets/hero-transmission.jpeg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type Status = "idle" | "authenticating" | "denied";

// --- Header (unchanged from backend version) ---
function SjvnHeader() {
  return (
    <header className="w-full flex flex-col font-sans shadow-sm z-20 relative">
      

      <div className="bg-gradient-to-r from-slate-950 via-[#0d2436] to-[#1a2942] py-1 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 gap-4">
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
    </header>
  );
}

// --- Glassmorphic Login Card (UI from LoginCard.tsx, wired to real Supabase auth) ---
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
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="relative w-full max-w-md z-10"
    >
      {/* Animated glowing border halo */}
      <motion.div
        className="absolute -inset-px rounded-[28px] opacity-60 blur-md"
        style={{
          background:
            "linear-gradient(130deg, rgba(10,132,255,0.5), rgba(16,185,129,0.3), rgba(10,132,255,0.1))",
        }}
        animate={{ opacity: [0.35, 0.65, 0.35], rotate: [0, 2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="glass glow-border relative rounded-[26px] p-8 sm:p-10">
        {/* Header */}
        <div className="mb-2 flex items-center justify-center">
          <img
            src={sjvnLogo}
            alt="SJVN Logo"
            className="w-14 h-14 object-contain rounded-lg mr-3"
          />
        </div>
        <div className="mb-7 text-center">
          <h2 className="font-display text-lg font-semibold text-white">Welcome to SJVN EMEMP</h2>
          <p className="mt-1 text-xs text-white/45">Enter your official credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="group">
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Username
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-electric-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@sjvn.com"
                autoComplete="username"
                required
                className="glass-input w-full rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="group">
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-electric-300" />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                className="glass-input w-full rounded-xl py-3 pl-11 pr-16 text-sm text-white placeholder-white/25 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-white/40 transition hover:text-electric-300"
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={status === "authenticating"}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className="group relative mt-2 w-full overflow-hidden rounded-xl py-3.5 font-medium text-white shadow-glow transition disabled:opacity-80"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-electric-600 via-electric-500 to-emerald2-500 bg-[length:200%_100%] animate-gradient-pan" />
            <span className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-r from-emerald2-500 via-electric-500 to-electric-600 bg-[length:200%_100%] animate-gradient-pan" />
            <span className="relative flex items-center justify-center gap-2 text-sm tracking-wide">
              <AnimatePresence mode="wait" initial={false}>
                {status === "authenticating" ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2"
                  >
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </motion.button>
        </form>

        {/* Denied notice */}
        <AnimatePresence>
          {status === "denied" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-200/90"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {errorMsg || "Access denied. Credentials could not be verified."}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restricted access notice */}
        <div className="mt-7 border-t border-white/10 pt-5">
          <div className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
                Restricted Access
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/45">
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

// --- Page shell (unchanged structure from backend version) ---
function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 overflow-hidden">
      <SjvnHeader />

      <div
        className="flex-1 flex items-start justify-center px-4 py-8 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        {/* Cinematic rich dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-950/70 to-blue-900/35" />

        <LoginCard />
      </div>
    </div>
  );
}