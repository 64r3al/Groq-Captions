import { Badge } from "../ui/Badge";
import type { BadgeVariant } from "../ui/Badge";

export type StatusPillTone = "neutral" | "success" | "warning" | "danger";

const TONE_VARIANT: Record<StatusPillTone, BadgeVariant> = {
  neutral: "default",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export interface StatusPillProps {
  label: string;
  tone?: StatusPillTone;
}

/** The small dotted status pills in the panel header (selection / API key / ffmpeg state) -
 * a thin, semantically-named wrapper over Badge so call sites read as app status rather than
 * generic design-system markup. */
export const StatusPill = ({ label, tone = "neutral" }: StatusPillProps) => (
  <Badge variant={TONE_VARIANT[tone]} dot>
    {label}
  </Badge>
);
