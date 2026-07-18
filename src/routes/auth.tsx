import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { toast } from "sonner";
import { 
  Mail,
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import { authService } from "@/services/auth";

import sjvnLogo from "../assets/sjvn-logo.jpeg";
import loginBg from "../assets/hero-transmission.jpeg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type Status = "idle" | "authenticating" | "denied";

// --- Header ---
// --- Header ---
function SjvnHeader() {
  return (
    <header className="w-full flex flex-col font-sans z-20 relative shrink-0 bg-slate-900/40 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Keep the logo container white so the logo is clearly visible */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-lg shrink-0 overflow-hidden">
            <img src={sjvnLogo} alt="SJVN Logo" className="h-full w-full object-contain p-1" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">SJVN Limited</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300 ring-1 ring-cyan-500/30">
                BRSR Portal
              </span>
            </div>
            <p className="text-xs text-white/60">
              A Joint Venture of Govt. of India &amp; Govt. of Himachal Pradesh
            </p>
          </div>
        </div>
        
        {/* The Secure/Encrypted badge has been removed from here */}

      </div>
      
      {/* Subtle glowing bottom line matching the cyan button */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
    </header>
  );
}

// --- Background Animation (Grid + Particles) ---
function BackgroundAnimation() {
  const [dimensions, setDimensions] = useState({ width: 1000, height: 1000 });

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Floating Glowing Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.8)]"
          initial={{
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
            opacity: Math.random() * 0.5 + 0.2
          }}
          animate={{
            y: [null, Math.random() * -200 - 100],
            opacity: [null, Math.random() * 0.8 + 0.4, 0]
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
}

// --- Login Card ---
function LoginCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "authenticating") return;

    setStatus("authenticating");
    setErrorMsg(null);

    try {
      const user = await authService.login(email, password, keepSignedIn);

      // Replaces the old onAuthStateChange listener — invalidate now that we
      // have a fresh session, so dashboards fetch with the new identity.
      queryClient.invalidateQueries();

      const redirectByRole: Record<string, string> = {
        super_admin: "/authenticated/supadmin",
        admin: "/authenticated/app",
        site_user: "/authenticated/site",
        contractor: "/authenticated/contractor",
      };
      navigate({ to: redirectByRole[user.role] || "/authenticated/site" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(message);
      toast.error(message);
      setStatus("denied");
      setTimeout(() => setStatus("idle"), 2600);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-md z-10 px-4 sm:px-0"
    >
      {/* Dark frosted glass container matching the new design */}
      {/* Fully transparent container */}
      <div className="p-8 text-center">
        
        {/* Logo Container */}
        <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white shadow-lg overflow-hidden">
          <img src={sjvnLogo} alt="SJVN Logo" className="h-full w-full object-contain p-2" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Welcome to SJVN</h2>
        <p className="mt-2 text-sm text-white/70">Business Responsibility and Sustainability Reporting Portal</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-7 text-left">
          {/* Email */}
          <div className="group">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              Username
            </label>
            <div className="relative flex items-center border-b border-white/20 pb-2 transition-colors duration-300 group-focus-within:border-cyan-400">
              <Mail className="h-4 w-4 text-white/40 mr-3 shrink-0 transition-colors group-focus-within:text-cyan-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username@sjvn.com"
                autoComplete="username"
                required
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="group">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              Password
            </label>
            <div className="relative flex items-center border-b border-white/20 pb-2 transition-colors duration-300 group-focus-within:border-cyan-400">
              <Lock className="h-4 w-4 text-white/40 mr-3 shrink-0 transition-colors group-focus-within:text-cyan-400" />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
                className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-0 text-white/40 transition-colors duration-150 hover:text-white"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Keep signed in + Forgot password */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setKeepSignedIn((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors duration-300 ${
                  keepSignedIn ? "bg-[#8b5cf6]" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ${
                    keepSignedIn ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs font-medium text-white/80">Keep me signed in</span>
            </div>
            <a href="#" className="text-xs font-medium text-[#c084fc] hover:text-[#d8b4fe] transition-colors">
              Forgot password?
            </a>
          </div>

          {/* Glowing Outline Submit Button */}
          <button
            type="submit"
            disabled={status === "authenticating"}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-cyan-500/50 bg-cyan-950/30 py-3.5 text-sm font-semibold text-cyan-50 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all hover:bg-cyan-900/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-70 backdrop-blur-sm"
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

        {/* Denied Notice */}
        <AnimatePresence>
          {status === "denied" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-red-500/20 border border-red-500/50 px-3 py-2.5 text-xs font-medium text-red-200 backdrop-blur-md"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span className="truncate">{errorMsg || "Access denied."}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-white/40">
          <ShieldCheck className="h-3.5 w-3.5" />
          Protected by end-to-end encryption
        </div>
      </div>
    </motion.div>
  );
}

// --- Page Shell ---
function AuthPage() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden select-none bg-slate-950">
      <SjvnHeader />

      <div 
        className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden px-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        {/* Background Darkening Overlay */}
        <div className="absolute inset-0 bg-slate-950/40 pointer-events-none z-0" />
        
        {/* Animated Grid and Particles */}
        <BackgroundAnimation />
        
        <LoginCard />
      </div>

      <footer className="w-full bg-slate-900 border-t border-white/10 px-6 py-3 flex items-center justify-between text-[11px] text-white/40 shrink-0 z-10 relative">
        <span>© 2026 SJVN Limited. All Rights Reserved.</span>
        <span>Business Responsibility &amp; Sustainability Reporting Portal</span>
      </footer>
    </div>
  );
}