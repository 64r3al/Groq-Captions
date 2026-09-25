import { Fragment } from "react";
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

/** The status indicator for a multi-stage pipeline (e.g. Extracting -> Transcribing -> Syncing
 * -> Building), shown in the sticky action bar while a generation run is in progress. Only the
 * current step's label is shown as text - a dot per step never has room for four full labels
 * side by side at a 280px panel width, so the dots carry the "where in the pipeline" signal and
 * the label carries the "what's happening now" one. */
export const StagedProgress = ({ steps, activeKey }: StagedProgressProps) => {
  const activeIndex = steps.findIndex((s) => s.key === activeKey);
  const activeStep = steps[activeIndex];
  return (
    <div className="gc-staged-progress">
      <div className="gc-staged-steps">
        {steps.map((step, i) => {
          const done = activeIndex >= 0 && i < activeIndex;
          const active = i === activeIndex;
          const state = done ? "gc-staged-dot--done" : active ? "gc-staged-dot--active" : "";
          return (
            <Fragment key={step.key}>
              <span className={`gc-staged-dot ${state}`}>{done && <Check size={8} strokeWidth={3} />}</span>
              {i < steps.length - 1 && <span className="gc-staged-connector" />}
            </Fragment>
          );
        })}
      </div>
      {activeStep && <span className="gc-staged-label">{activeStep.label}…</span>}
    </div>
  );
};
