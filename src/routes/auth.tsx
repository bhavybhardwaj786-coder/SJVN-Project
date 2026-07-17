import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { 
  Mail,
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Flame,
  ShieldCheck,
  Eye,
  EyeOff,
  Home,
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
    <header className="w-full flex flex-col font-sans z-20 relative shrink-0 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-sky-100 shrink-0 overflow-hidden">
            <img src={sjvnLogo} alt="SJVN Logo" className="h-full w-full object-contain p-1" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-blue-700">SJVN Limited</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200">
                BRSR Portal
              </span>
            </div>
            <p className="text-xs text-slate-500">
              A Joint Venture of Govt. of India &amp; Govt. of Himachal Pradesh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Secure · Encrypted
            </span>
          </div>
        </div>
      </div>

      <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
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
  const [keepSignedIn, setKeepSignedIn] = useState(true);

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
    className="relative w-full max-w-md z-10 px-4 sm:px-0"
  >
    <div className="rounded-2xl bg-white ring-1 ring-sky-100 shadow-lg p-6 sm:p-8 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white ring-1 ring-sky-100 overflow-hidden">
        <img src={sjvnLogo} alt="SJVN Logo" className="h-full w-full object-contain p-1.5" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Welcome to SJVN </h2>
      <p className="mt-2 text-sm text-slate-500">Business Responsibility and Sustainability Reporting Portal</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 text-left">
        {/* Email */}
        <div className="group">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Username
          </label>
          <div className="relative flex items-center border-b border-slate-200 pb-2 transition-colors duration-150 group-focus-within:border-sky-500">
            <Mail className="h-4 w-4 text-slate-400 mr-3 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@sjvn.com"
              autoComplete="username"
              required
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div className="group">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Password
          </label>
          <div className="relative flex items-center border-b border-slate-200 pb-2 transition-colors duration-150 group-focus-within:border-sky-500">
            <Lock className="h-4 w-4 text-slate-400 mr-3 shrink-0" />
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              required
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-0 text-slate-400 transition-colors duration-150 hover:text-sky-600"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Keep signed in + Forgot password */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setKeepSignedIn((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
              keepSignedIn ? "bg-gradient-to-r from-sky-500 to-indigo-500" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                keepSignedIn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs text-slate-600 -ml-2">Keep me signed in</span>
          <a href="#" className="text-xs font-medium text-sky-600 hover:text-sky-700">
            Forgot password?
          </a>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "authenticating"}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-600 hover:to-indigo-600 disabled:opacity-70"
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
            className="mt-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{errorMsg || "Access denied."}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Protected by end-to-end encryption
      </div>
    </div>
  </motion.div>
);
}

// --- Page Shell ---
// Exactly ONE 'AuthPage' declaration in the entire file
function AuthPage() {
  return (
    <div className="h-dvh w-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-sky-50/40 overflow-hidden select-none">
      <SjvnHeader />

      <div className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-y-auto px-4">
        <LoginCard />
      </div>

      <footer className="w-full bg-white border-t border-sky-100 px-6 py-3 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <span>© 2026 SJVN Limited. All Rights Reserved.</span>
        <span>Business Responsibility &amp; Sustainability Reporting Portal</span>
      </footer>
    </div>
  );
}