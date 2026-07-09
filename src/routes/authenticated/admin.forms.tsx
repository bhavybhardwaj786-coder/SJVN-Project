import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

import { supabase } from "@/integrations/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Form = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  sort_order: number;
};
type Field = {
  id: string;
  form_id: string;
  label: string;
  field_key: string;
  field_type: string;
  unit: string | null;
  required: boolean;
  sort_order: number;
};

export const Route = createFileRoute("/authenticated/admin/forms")({
  ssr: false,
  component: AdminForms,
});

function AdminForms() {
  const qc = useQueryClient();
  const { data: forms } = useQuery({
    queryKey: ["admin-forms"],
    queryFn: async () => {
      const { data } = await supabase.from("forms").select("*").order("sort_order");
      return (data ?? []) as Form[];
    },
  });

  const [selected, setSelected] = useState<Form | null>(null);
  const [editing, setEditing] = useState<Partial<Form> | null>(null);

  async function saveForm() {
    if (!editing?.code || !editing.name) return toast.error("Code and name are required");
    const payload = {
      code: editing.code,
      name: editing.name,
      description: editing.description ?? null,
      icon: editing.icon ?? null,
      active: editing.active ?? true,
      sort_order: editing.sort_order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("forms").update(payload).eq("id", editing.id)
      : await supabase.from("forms").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-forms"] });
  }

  async function deleteForm(id: string) {
    if (!confirm("Delete this form and all its fields?")) return;
    const { error } = await supabase.from("forms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (selected?.id === id) setSelected(null);
    qc.invalidateQueries({ queryKey: ["admin-forms"] });
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-sm text-muted-foreground">
            Create dynamic environmental forms and configure their fields.
          </p>
        </div>
        <Button onClick={() => setEditing({})}>
          <Plus className="h-4 w-4 mr-1" /> Add Form
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border bg-card shadow-card">
          <ul className="divide-y">
            {forms?.map((f) => (
              <li
                key={f.id}
                className={`flex items-center justify-between gap-2 px-4 py-3 ${
                  selected?.id === f.id ? "bg-primary-soft" : ""
                }`}
              >
                <button
                  onClick={() => setSelected(f)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {f.code} · {f.active ? "active" : "disabled"}
                  </div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => setEditing(f)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteForm(f.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {selected ? (
            <FieldsEditor form={selected} />
          ) : (
            <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-card">
              Select a form on the left to configure its parameters.
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Form" : "New Form"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={editing?.code ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={editing?.sort_order ?? 0}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, sort_order: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editing?.name ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editing?.description ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (lucide name)</Label>
              <Input
                placeholder="e.g. Wind, Droplets"
                value={editing?.icon ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s, icon: e.target.value }))}
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
            <Button onClick={saveForm}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function FieldsEditor({ form }: { form: Form }) {
  const qc = useQueryClient();
  const { data: fields } = useQuery({
    queryKey: ["form-fields", form.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", form.id)
        .order("sort_order");
      return (data ?? []) as Field[];
    },
  });

  const [draft, setDraft] = useState<Partial<Field>>({
    field_type: "text",
    required: false,
    sort_order: 0,
  });

  async function addField() {
    if (!draft.label || !draft.field_key)
      return toast.error("Label and key are required");
    const { error } = await supabase.from("form_fields").insert({
      form_id: form.id,
      label: draft.label,
      field_key: draft.field_key,
      field_type: (draft.field_type ?? "text") as "text" | "number" | "date" | "textarea" | "select" | "file",
      unit: draft.unit ?? null,
      required: draft.required ?? false,
      sort_order: draft.sort_order ?? (fields?.length ?? 0) + 1,
    });
    if (error) return toast.error(error.message);
    toast.success("Field added");
    setDraft({ field_type: "text", required: false, sort_order: 0 });
    qc.invalidateQueries({ queryKey: ["form-fields", form.id] });
  }

  async function removeField(id: string) {
    const { error } = await supabase.from("form_fields").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["form-fields", form.id] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Configuring
          </div>
          <div className="text-lg font-semibold">{form.name}</div>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Req</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {fields?.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{f.label}</td>
                  <td className="px-3 py-2 font-mono text-xs">{f.field_key}</td>
                  <td className="px-3 py-2">{f.field_type}</td>
                  <td className="px-3 py-2">{f.unit ?? "—"}</td>
                  <td className="px-3 py-2">{f.required ? "Yes" : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeField(f.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!fields?.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    No fields yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-3 text-sm font-semibold">Add field</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Label</Label>
            <Input
              value={draft.label ?? ""}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Key</Label>
            <Input
              value={draft.field_key ?? ""}
              onChange={(e) => setDraft({ ...draft, field_key: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select
              value={draft.field_type ?? "text"}
              onValueChange={(v) => setDraft({ ...draft, field_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["text", "number", "date", "textarea", "select", "file"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unit</Label>
            <Input
              value={draft.unit ?? ""}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.required ?? false}
                onCheckedChange={(v) => setDraft({ ...draft, required: v })}
              />
              <Label className="text-xs">Required</Label>
            </div>
            <Button onClick={addField} size="sm" className="ml-auto">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
