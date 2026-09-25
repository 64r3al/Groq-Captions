import { Check } from "lucide-react";

export interface ProgressProps {
  /** 0-100. Omit (or pass undefined) for an indeterminate track. */
  value?: number;
  "aria-label"?: string;
}

export const Progress = ({ value, ...rest }: ProgressProps) => {
  const indeterminate = value === undefined;
  return (
    <div
      className="gc-progress-track"
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <div
        className={`gc-progress-fill${indeterminate ? " gc-progress-fill--indeterminate" : ""}`}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};

export interface StagedProgressStep {
  key: string;
  label: string;
}

export interface StagedProgressProps {
  steps: StagedProgressStep[];
  /** Key of the currently active step. Steps before it are marked done. */
  activeKey: string;
}

/** The header-strip indicator for a multi-stage pipeline (e.g. Extracting -> Transcribing ->
 * Syncing -> Building) shown in the sticky action bar while a generation run is in progress. */
export const StagedProgress = ({ steps, activeKey }: StagedProgressProps) => {
  const activeIndex = steps.findIndex((s) => s.key === activeKey);
  return (
    <div className="gc-staged-progress">
      <div className="gc-staged-steps">
        {steps.map((step, i) => {
          const done = activeIndex >= 0 && i < activeIndex;
          const active = i === activeIndex;
          const state = done ? "gc-staged-step--done" : active ? "gc-staged-step--active" : "";
          return (
            <>
              <span key={step.key} className={`gc-staged-step ${state}`}>
                <span className="gc-staged-dot">{done && <Check size={6} strokeWidth={3} />}</span>
                {step.label}
              </span>
              {i < steps.length - 1 && <span key={`${step.key}-connector`} className="gc-staged-connector" />}
            </>
          );
        })}
      </div>
    </div>
  );
};
