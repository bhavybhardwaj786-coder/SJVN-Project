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
import { usersService } from "@/services/users-service"
import { Button } from "@/components/ui/button";

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
        <motion.div variants={itemVariants} className="flex">
          <div className="inline-block rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-5 shadow-sm sm:px-8 sm:py-6">
            <p className="text-xs font-medium uppercase tracking-wider text-sky-100">
              Super Admin Portal
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
              Identity & Access Management
            </h1>
            <p className="mt-1 max-w-md text-sm text-sky-50">
              Manage administrators, site operators, and project access.
            </p>
          </div>
        </motion.div>

        {/* Global Directory Overview Grid */}
        <motion.section variants={itemVariants} className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 ring-1 ring-indigo-100 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-700">System Administrators</span>
              <ShieldCheck className="h-4 w-4 text-indigo-700" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-indigo-700">{totalAdmins}</p>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-100 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">Site Operators</span>
              <Users className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{totalSiteUsers}</p>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 ring-1 ring-sky-100 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-sky-700">Mapped Projects</span>
              <MapPinned className="h-4 w-4 text-sky-700" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-sky-700">{totalSites}</p>
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
                search={{ action: "create" }} 
                className="group flex flex-col p-8 transition-all duration-300 hover:bg-slate-50/60"
              >
                {/* Micro-animated Icon Circle Container */}
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner"
                >
                  <UserPlus className="h-5 w-5" />
                </motion.div>
                
                <h3 className="text-lg font-bold text-slate-900">Provision New Account</h3>
                <p className="mb-6 mt-2 text-sm text-slate-500 leading-relaxed">
                  Create new credentials for System Administrators or assign new operators to specific project sites.
                </p>
                
                {/* Interactive Button Component replacing text link */}
                <div className="mt-auto">
                  <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-5 shadow-sm transition-all duration-200 group-hover:shadow-md flex items-center justify-center gap-1.5 rounded-lg">
                    Open Directory 
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </div>
              </Link>

              <Link 
                to="/authenticated/users" 
                className="group flex flex-col p-8 transition-all duration-300 hover:bg-slate-50/60"
              >
                {/* Micro-animated Icon Circle Container */}
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner"
                >
                  <KeyRound className="h-5 w-5" />
                </motion.div>
                
                <h3 className="text-lg font-bold text-slate-900">Security & Overwrites</h3>
                <p className="mb-6 mt-2 text-sm text-slate-500 leading-relaxed">
                  Suspend active accounts, view active employee mappings, or overwrite passwords for users who lost access.[cite: 7]
                </p>
                
                {/* Interactive Button Component replacing text link */}
                <div className="mt-auto">
                  <Button variant="outline" className="w-full sm:w-auto border-amber-200 hover:border-amber-300 bg-white hover:bg-amber-50 text-amber-700 font-bold text-xs h-10 px-5 shadow-sm transition-all duration-200 group-hover:shadow-md flex items-center justify-center gap-1.5 rounded-lg">
                    Manage Security 
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </div>
              </Link>

            </div>
          </div>
        </motion.section>

      </motion.div>
    </AppShell>
  );
}