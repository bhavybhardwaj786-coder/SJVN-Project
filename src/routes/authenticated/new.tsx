import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Plus, Trash2, GripVertical, Loader2, ArrowLeft, ArrowRight, Check,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { formsService } from "@/services";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { motion } from "framer-motion";

export const Route = createFileRoute("/authenticated/new")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { edit?: string } => {
    return {
      edit: typeof search.edit === 'string' ? search.edit : undefined,
    };
  },
  component: NewForm,
});

const ICON_OPTIONS = [
  "Droplet", "Wind", "Trash2", "AlertTriangle", "Wallet", "Trees",
  "Fuel", "Volume2", "Waves", "CloudRain", "Leaf", "MapPinned",
];

const FIELD_TYPES = [
  { value: "number", label: "Number (with unit)" },
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Yes / No" },
];

const COMMON_UNITS = [
  "mg/L", "mg/m³", "µg/m³", "KL", "kL/day", "m³", "m³/day",
  "kg", "tonnes", "tCO2e", "dB", "dB(A)", "%", "ppm", "°C", "kWh", "INR",
];

type FieldOption = { label: string; value: string };
type CustomMetaAttribute = { key: string; label: string; type: "text" | "select"; options?: string };

type FormField = {
  key: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  options?: FieldOption[];
  metaAttributes?: CustomMetaAttribute[]; // 👈 ADD THIS LINE ONLY
};

type SiteRow = { id: string; name: string; code: string };

let fieldCounter = 0;
function newFieldKey() {
  fieldCounter += 1;
  return `field_${Date.now()}_${fieldCounter}`;
}

function slugifyKey(label: string) {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || newFieldKey()
  );
}

const STEPS = [
  { id: 1, label: "Form Details" },
  { id: 2, label: "Questions" },
  { id: 3, label: "Site Visibility" },
] as const;

function NewForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const search = Route.useSearch();
  const editId = search.edit;

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — form details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [frequency, setFrequency] = useState("monthly");
  const [isActive, setIsActive] = useState(true);

  // Step 2 — questions
  const [fields, setFields] = useState<FormField[]>([]);

  // Step 3 — visibility
  const [visibilityMode, setVisibilityMode] = useState<"all" | "specific">("all");
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());

  // 1. Fetch data when editId is available
  const { data: existingForm, isLoading: isFormLoading } = useQuery({
    queryKey: ["form-to-edit", editId],
    queryFn: async () => {
      if (!editId) return null;
      const res = await formsService.getFormById(editId);
      return res.data;
    },
    enabled: !!editId,
  });

  // 2. Hydrate state values when edit query resolves successfully
  useEffect(() => {
    if (existingForm) {
      setTitle(existingForm.title || "");
      setDescription(existingForm.description || "");
      setFrequency(existingForm.frequency || "monthly");
      setIsActive(existingForm.is_active ?? true);
      
      if (existingForm.schema) {
        setIcon(existingForm.schema.icon || ICON_OPTIONS[0]);
        setFields(existingForm.schema.fields || []);
      }
      
      if (existingForm.site_ids && existingForm.site_ids.length > 0) {
        setVisibilityMode("specific");
        setSelectedSiteIds(new Set(existingForm.site_ids));
      } else {
        setVisibilityMode("all");
      }
    }
  }, [existingForm]);

  const { data: sitesResult, isLoading: sitesLoading } = useQuery({
    queryKey: ["all-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return data as SiteRow[];
    },
    enabled: step === 3,
  });
  const sites = sitesResult || [];

  // ---- Validations ----
  const validateStep1 = (): string | null => {
    if (!title.trim()) return "Form name is required.";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (fields.length === 0) return "Add at least one question.";
    for (const f of fields) {
      if (!f.label.trim()) return "Every question needs text.";
      if (f.type === "select" && (!f.options || f.options.filter((o) => o.label.trim()).length === 0)) {
        return `Dropdown question "${f.label}" needs at least one option.`;
      }
    }
    const keys = fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) return "Question keys must be unique.";
    return null;
  };

  const validateStep3 = (): string | null => {
    if (visibilityMode === "specific" && selectedSiteIds.size === 0) {
      return 'Select at least one site, or switch to "All Sites".';
    }
    return null;
  };

  // ---- Step helpers ----
  const addField = () => {
    setFields((prev) => [
      ...prev,
      { key: newFieldKey(), label: "", type: "number", unit: "", required: true },
    ]);
  };

  const updateField = (index: number, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const addOption = (fieldIndex: number) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === fieldIndex
          ? { ...f, options: [...(f.options || []), { label: "", value: "" }] }
          : f
      )
    );
  };

  const updateOption = (fieldIndex: number, optIndex: number, patch: Partial<FieldOption>) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== fieldIndex) return f;
        const options = (f.options || []).map((o, j) => (j === optIndex ? { ...o, ...patch } : o));
        return { ...f, options };
      })
    );
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== fieldIndex) return f;
        return { ...f, options: (f.options || []).filter((_, j) => j !== optIndex) };
      })
    );
  };

  const goNext = () => {
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  };

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  // ---- Create / Update Form Mutation Handling ----
  const submitMutation = useMutation({
    mutationFn: async () => {
      const cleanFields = fields.map((f) => ({
        key: f.key,
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        ...(f.type === "number" && f.unit?.trim() ? { unit: f.unit.trim() } : {}),
        ...(f.type === "select"
          ? { options: (f.options || []).filter((o) => o.label.trim() && o.value.trim()) }
          : {}),
      }));

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        schema: { icon, fields: cleanFields },
        is_active: isActive,
        frequency,
        site_ids: visibilityMode === "all" ? null : Array.from(selectedSiteIds),
      };

      // Branch evaluation logic dynamically relative to transactional state context
      if (editId) {
        return formsService.updateForm(editId, payload);
      } else {
        return formsService.createForm(payload);
      }
    },
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error.message || "Failed to preserve form definitions");
        return;
      }

      toast.success(editId ? "Form configurations updated successfully!" : "Form created successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-all-forms"] });
      navigate({ to: "/authenticated/app" });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to apply mutations to structural data records");
    },
  });

  const handleSubmit = () => {
    const err = validateStep3();
    if (err) {
      toast.error(err);
      return;
    }
    submitMutation.mutate();
  };

  if (editId && isFormLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading form settings...</span>
        </div>
      </AppShell>
    );
  }

  return (
  <motion.div
  initial={{opacity:0}}
  animate={{opacity:1}}
  exit={{opacity:0}}
  transition={{duration:0.5}}
  >
    <AppShell>
      <button
        onClick={() => navigate({ to: "/authenticated/app" })}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </button>

      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step === s.id
                    ? "bg-primary text-primary-foreground"
                    : step > s.id
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={`text-sm ${step === s.id ? "font-medium" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-2 h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Form Details */}
        {step === 1 && (
          <motion.div
          initial={{opacity:0,y:40}}
          animate={{opacity:1,y:0}}
          transition={{
            duration:0.5,
            ease:"easeOut"
            }}
            >
          <Card>
            <CardHeader>
              <CardTitle>{editId ? "Modify Form Parameters" : "Name the Form"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Start with what this form is for. You'll add the actual questions next.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Form Name *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Noise Level Monitoring"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this form for? Shown to site users."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Icon</Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>How Often?</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="one_time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-1.5">
                  <Checkbox
                    id="is-active"
                    checked={isActive}
                    onCheckedChange={(v) => setIsActive(!!v)}
                  />
                  <Label htmlFor="is-active" className="cursor-pointer text-sm">
                    Active immediately
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>What data should sites fill in?</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add each question, pick the type of answer, and set a unit for numeric readings.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No questions yet. Click "Add Question" to start.
                  </p>
                </div>
              )}
              {fields.map((field, index) => (
                <div key={field.key} className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Question {index + 1} *</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="e.g. Total Water Withdrawn"
                        />
                      </div>

                      <div className={`grid gap-3 ${field.type === "number" ? "grid-cols-2" : "grid-cols-1"}`}>
                        <div className="space-y-1">
                          <Label className="text-xs">Answer Type</Label>
                          <Select value={field.type} onValueChange={(v) => updateField(index, { type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {field.type === "number" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Unit</Label>
                            <Input
                              list="unit-suggestions"
                              value={field.unit ?? ""}
                              onChange={(e) => updateField(index, { unit: e.target.value })}
                              placeholder="e.g. KL, mg/L"
                            />
                          </div>
                        )}
                      </div>

                      {field.type === "select" && (
                        <div className="space-y-2 rounded-md bg-muted/40 p-3">
                          <Label className="text-xs">Dropdown Options</Label>
                          {(field.options || []).map((opt, optIndex) => (
                            <div key={optIndex} className="flex gap-2">
                              <Input
                                className="h-8 text-xs"
                                placeholder="Option label"
                                value={opt.label}
                                onChange={(e) =>
                                  updateOption(index, optIndex, {
                                    label: e.target.value,
                                    value: slugifyKey(e.target.value),
                                  })
                                }
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={() => removeOption(index, optIndex)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => addOption(index)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Option
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`required-${field.key}`}
                          checked={field.required}
                          onCheckedChange={(v) => updateField(index, { required: !!v })}
                        />
                        <Label htmlFor={`required-${field.key}`} className="cursor-pointer text-xs">
                          Required
                        </Label>
                      </div>
                      {/* Dynamic Sub-Column Attribute Section Block */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="text-blue-600 font-bold p-0 h-auto text-xs"
                          onClick={() => {
                            const updatedFields = [...fields];
                            if (!updatedFields[index].metaAttributes) updatedFields[index].metaAttributes = [];
                            updatedFields[index].metaAttributes!.push({ key: `meta_${Date.now()}`, label: "", type: "text", options: "" });
                            setFields(updatedFields);
                          }}
                        >
                          + Add Extra Sub-Column Property (e.g., Classification, Disposal Method)
                        </Button>

                        {field.metaAttributes?.map((meta, mIdx) => (
                          <div key={meta.key} className="ml-2 p-2 border border-dashed rounded bg-slate-50 flex flex-wrap sm:flex-nowrap items-center gap-2 animate-in fade-in duration-150">
                            <Input
                              placeholder="Sub-column Title (e.g. Classification)"
                              value={meta.label}
                              onChange={e => {
                                const updatedFields = [...fields];
                                updatedFields[index].metaAttributes![mIdx].label = e.target.value;
                                setFields(updatedFields);
                              }}
                              className="h-8 text-xs bg-white flex-1 min-w-[120px]"
                            />
                            
                            <select
                              value={meta.type}
                              onChange={e => {
                                const updatedFields = [...fields];
                                updatedFields[index].metaAttributes![mIdx].type = e.target.value as any;
                                setFields(updatedFields);
                              }}
                              className="h-8 border rounded text-xs bg-white px-2 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="text">Text Field</option>
                              <option value="select">Dropdown Choice</option>
                            </select>

                            {meta.type === "select" && (
                              <Input
                                placeholder="Options (comma-separated: e.g. Hazardous, Non-Hazardous)"
                                value={meta.options || ""}
                                onChange={e => {
                                  const updatedFields = [...fields];
                                  updatedFields[index].metaAttributes![mIdx].options = e.target.value;
                                  setFields(updatedFields);
                                }}
                                className="h-8 text-xs bg-white flex-1 min-w-[200px]"
                              />
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 hover:bg-red-50 shrink-0"
                              onClick={() => {
                                const updatedFields = [...fields];
                                updatedFields[index].metaAttributes = updatedFields[index].metaAttributes!.filter((_, i) => i !== mIdx);
                                setFields(updatedFields);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeField(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              <datalist id="unit-suggestions">
                {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
              </datalist>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Site Visibility */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Who should see this form?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="visibility-mode"
                    checked={visibilityMode === "all"}
                    onChange={() => setVisibilityMode("all")}
                  />
                  All Sites
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="visibility-mode"
                    checked={visibilityMode === "specific"}
                    onChange={() => setVisibilityMode("specific")}
                  />
                  Specific Sites
                </label>
              </div>

              {visibilityMode === "specific" && (
                <div>
                  <div className="mb-2 flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedSiteIds(new Set(sites.map(s => s.id)))}>
                      Select All
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedSiteIds(new Set())}>
                      Clear
                    </Button>
                  </div>
                  {sitesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {sites.map((site) => (
                        <label
                          key={site.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedSiteIds.has(site.id)}
                            onCheckedChange={() => {
                              setSelectedSiteIds(prev => {
                                const next = new Set(prev);
                                if (next.has(site.id)) next.delete(site.id);
                                else next.add(site.id);
                                return next;
                              });
                            }}
                          />
                          <span>{site.name} <span className="text-xs text-muted-foreground">({site.code})</span></span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {visibilityMode === "all"
                  ? "This form will appear on every site's dashboard."
                  : "This form will only appear on the dashboards of the sites you select."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
      <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
      duration: 0.5,
      ease: "easeOut",
      }}>
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={step === 1 ? () => navigate({ to: "/authenticated/app" }) : goBack}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < 3 ? (
            <Button onClick={goNext}>
              Next
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editId ? "Save Changes" : "Create & Publish Form"}
            </Button>
          )}
        </div>
        </motion.div>
      </div>
    </AppShell>
  </motion.div>
  );
}