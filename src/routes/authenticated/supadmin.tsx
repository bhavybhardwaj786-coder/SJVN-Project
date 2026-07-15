import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  UserPlus,
  ShieldCheck,
  Users,
  MapPinned,
  ArrowRight,
  KeyRound
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/client";
import { usersService } from "@/services/users-service";

export const Route = createFileRoute("/authenticated/supadmin")({
  ssr: false,
  component: SuperAdminDashboard,
});

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

function SuperAdminDashboard() {
  const { data: currentUser } = useCurrentUser();

  // Fetch counts for the stat cards
  const { data: sitesResult } = useQuery({
    queryKey: ["all-sites-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sites")
        .select("*", { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: admins } = useQuery({
    queryKey: ["manage-admins-count"],
    queryFn: () => usersService.listAdmins().then((r) => r.data || []),
  });

  const { data: siteUsers } = useQuery({
    queryKey: ["manage-site-users-count"],
    queryFn: () => usersService.listSiteUsers().then((r) => r.data || []),
  });

  const totalAdmins = admins?.length || 0;
  const totalSiteUsers = siteUsers?.length || 0;
  const totalSites = sitesResult || 0;

  return (
    <AppShell>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl space-y-8 p-2 sm:p-4 text-slate-900"
      >
        {/* Simple, clean text header */}
        <motion.div variants={itemVariants} className="mb-2">
          <h1 className="font-display text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Super Admin
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500">
            Identity & Access Management Portal
          </p>
        </motion.div>

        {/* Global Directory Overview Grid */}
        <motion.section variants={itemVariants} className="grid gap-5 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
            <div>
              <p className="text-3xl font-black text-slate-900">{totalAdmins}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">System Administrators</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
            <div>
              <p className="text-3xl font-black text-emerald-600">{totalSiteUsers}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">Site Operators</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-inner">
              <Users className="h-6 w-6" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
            <div>
              <p className="text-3xl font-black text-blue-600">{totalSites}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">Mapped Projects</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner">
              <MapPinned className="h-6 w-6" />
            </div>
          </div>
        </motion.section>

        {/* Quick Action Navigation */}
        <motion.section variants={itemVariants}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                Access Management Tools
              </h2>
            </div>
            
            <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              
              <Link 
                to="/authenticated/users" 
                className="group flex flex-col p-8 transition-colors hover:bg-slate-50/50"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-transform group-hover:scale-110">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Provision New Account</h3>
                <p className="mb-6 mt-2 text-sm text-slate-500">
                  Create new credentials for System Administrators or assign new operators to specific project sites.
                </p>
                <div className="mt-auto flex items-center text-sm font-bold text-blue-600 transition-colors group-hover:text-blue-700">
                  Open Directory <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </Link>

              <Link 
                to="/authenticated/users" 
                className="group flex flex-col p-8 transition-colors hover:bg-slate-50/50"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition-transform group-hover:scale-110">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Security & Overwrites</h3>
                <p className="mb-6 mt-2 text-sm text-slate-500">
                  Suspend active accounts, view active employee mappings, or overwrite passwords for users who lost access.
                </p>
                <div className="mt-auto flex items-center text-sm font-bold text-amber-600 transition-colors group-hover:text-amber-700">
                  Manage Security <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </Link>

            </div>
          </div>
        </motion.section>

      </motion.div>
    </AppShell>
  );
}