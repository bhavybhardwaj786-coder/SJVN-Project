import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WizardStep = {
  id: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
};

export function FormStepper({
  steps,
  currentIndex,
  onStepClick,
}: {
  steps: WizardStep[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
      {steps.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        const clickable = !!onStepClick;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStepClick?.(i)}
            className={`flex flex-1 items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all ${
              isActive
                ? "border-transparent bg-gradient-to-r from-sky-400 via-sky-500 to-blue-500 shadow-md shadow-sky-200/60"
                : "border-slate-200 bg-white/70 hover:bg-slate-50"
            } ${clickable ? "cursor-pointer" : "cursor-default"}`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                isActive
                  ? "bg-white/20 text-white"
                  : isDone
                  ? "bg-sky-100 text-sky-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isDone && !isActive ? <Check className="h-4 w-4" /> : <step.Icon className="h-4 w-4" />}
            </span>
            <span>
              <span
                className={`block text-[11px] font-semibold uppercase tracking-wider ${
                  isActive ? "text-sky-50" : "text-slate-400"
                }`}
              >
                Step {i + 1}
              </span>
              <span className={`block text-sm font-bold ${isActive ? "text-white" : "text-slate-700"}`}>
                {step.title}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}