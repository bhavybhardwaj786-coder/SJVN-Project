import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplet,
  Wind,
  Trash2,
  AlertTriangle,
  Wallet,
  Trees,
  Fuel,
  Volume2,
  Waves,
  CloudRain,
  Leaf,
  MapPinned,
  FileText,
  Loader2,
  Plus,
  Pencil,
  Eye,
  UserPlus,
  ArrowUpRight,
  Filter,
  Calendar,
  Layers,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { formsService } from "@/services";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ICONS: Record<string, LucideIcon> = {
  Droplet,
  Wind,
  Trash2,
  AlertTriangle,
  Wallet,
  Trees,
  Fuel,
  Volume2,
  Waves,
  CloudRain,
  Leaf,
  MapPinned,
};

export const Route = createFileRoute("/authenticated/supadmin")({
  ssr: false,
  component: AdminDashboard,
});

type SiteRow = { id: string; name: string; code: string };

type SubmissionRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  form_id: string;
  site_id: string;
  user_id: string;
  forms: { id: string; title: string } | null;
  sites: { id: string; name: string; code: string } | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

function AdminDashboard() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [formFilter, setFormFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const reportingMonthDate = `${selectedMonth}-01`;

  const { data: formsResult, isLoading: formsLoading } = useQuery({
    queryKey: ["admin-all-forms"],
    queryFn: () => formsService.getAllForms(),
  });
  const forms = formsResult?.data || [];
  const activeForms = forms.filter((f: any) => f.is_active);

  const { data: sitesResult } = useQuery({
    queryKey: ["all-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, code")
        .order("name");

      if (error) throw error;
      return data as SiteRow[];
    },
  });
  const sites = sitesResult || [];

  const { data: submissionsResult, isLoading: submissionsLoading } = useQuery({
    queryKey: ["admin-submissions-by-month", reportingMonthDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          id,
          status,
          submitted_at,
          updated_at,
          form_id,
          site_id,
          user_id,
          forms(id, title),
          sites(id, name, code)
        `)
        .eq("reporting_month", reportingMonthDate)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as unknown as SubmissionRow[];
    },
  });
  const submissions = submissionsResult || [];

  const { data: siteUsersResult } = useQuery({
    queryKey: ["all-site-users-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_users")
        .select("id, full_name");

      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
  });

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (siteUsersResult || []).forEach((u) => map.set(u.id, u.full_name));
    return map;
  }, [siteUsersResult]);

  const submissionMap = useMemo(() => {
    const map = new Map<string, SubmissionRow>();
    submissions.forEach((s) => {
      if (s.site_id && s.form_id) {
        map.set(`${s.site_id}__${s.form_id}`, s);
      }
    });
    return map;
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (siteFilter !== "all" && s.site_id !== siteFilter) return false;
      if (formFilter !== "all" && s.form_id !== formFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [submissions, siteFilter, formFilter, statusFilter]);

  const totalSites = sites.length;
  const totalForms = activeForms.length;
  const totalExpected = totalSites * totalForms;
  const totalSubmitted = submissions.filter(
    (s) => s.status === "submitted"
  ).length;
  const complianceRate =
    totalExpected > 0
      ? Math.round((totalSubmitted / totalExpected) * 100)
      : 0;

  const deleteMutation = useMutation({
    mutationFn: (formId: string) => formsService.deleteForm(formId),
    onSuccess: () => {
      toast.success("Form deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-all-forms"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete form");
    },
  });

  const handleDelete = (formId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(formId);
  };

return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8 p-1 text-slate-900 dynamic-dark-mode-support"
      >
        {/* SJVN Hydro-Green Premium Banner */}
        <motion.section 
          variants={itemVariants}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2545] via-[#134074] to-[#0B2545] p-6 text-white shadow-2xl ring-1 ring-cyan-500/20 sm:p-8"
        >
          {/* Hydro and Clean Energy Fluid Glow Effects */}
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
          <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl" />
          
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 0.85, x: 0 }}
              className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300 flex items-center gap-1.5"
            >
              <Waves className="h-3.5 w-3.5 text-cyan-400 animate-bounce" />
              SJVN Environmental Monitoring Core
            </motion.div>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
              {currentUser?.full_name ?? "Administrator Panel"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300/90 leading-relaxed">
              Centralized security and personnel management portal. Provision, modify, and monitor operational access tiers across the platform.
            </p>

            {isSuperAdmin && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/authenticated/users"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 shadow-xl backdrop-blur-md transition-colors hover:bg-cyan-500/20 hover:border-cyan-400/50"
                >
                  <UserPlus className="h-4 w-4 text-cyan-400" />
                  Manage Project Operators & Admins
                </Link>
              </motion.div>
            )}
          </div>
        </motion.section>
      </motion.div>
    </AppShell>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const badgeConfig = useMemo(() => {
    switch(status) {
      case "submitted":
        return "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40";
      case "draft":
        return "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40";
      case "not_submitted":
        return "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40";
      default:
        return "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40";
    }
  }, [status]);

  const label = status === "not_submitted" ? "Missing" : status;

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${badgeConfig}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}