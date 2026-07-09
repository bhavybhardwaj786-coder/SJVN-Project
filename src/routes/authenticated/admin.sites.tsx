import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { supabase } from "@/integrations/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/authenticated/admin/sites")({
  ssr: false,
  component: AdminSites,
});

type Site = { id: string; code: string; name: string; location: string | null; active: boolean };

function AdminSites() {
  const qc = useQueryClient();
  const { data: sites } = useQuery({
    queryKey: ["admin-sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("code");
      if (error) throw error;
      return data as Site[];
    },
  });

  const [editing, setEditing] = useState<Partial<Site> | null>(null);

  async function save() {
    if (!editing) return;
    if (!editing.code || !editing.name) return toast.error("Code and name are required.");
    const payload = {
      code: editing.code,
      name: editing.name,
      location: editing.location ?? null,
      active: editing.active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("sites").update(payload).eq("id", editing.id)
      : await supabase.from("sites").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-sites"] });
  }

  async function toggle(site: Site) {
    const { error } = await supabase
      .from("sites")
      .update({ active: !site.active })
      .eq("id", site.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-sites"] });
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sites</h1>
          <p className="text-sm text-muted-foreground">Manage SJVN project sites.</p>
        </div>
        <Dialog
          open={!!editing}
          onOpenChange={(o) => (o ? setEditing(editing ?? {}) : setEditing(null))}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({})}>
              <Plus className="h-4 w-4 mr-1" /> Add Site
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Edit Site" : "Add Site"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={editing?.code ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editing?.name ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={editing?.location ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, location: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editing?.active ?? true}
                  onCheckedChange={(v) => setEditing((s) => ({ ...s, active: v }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sites?.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.location ?? "—"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggle(s)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.active ? "Active" : "Disabled"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
