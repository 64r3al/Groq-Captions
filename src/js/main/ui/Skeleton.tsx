export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  /** Renders as a circle (e.g. for an avatar placeholder). */
  circle?: boolean;
}

export const Skeleton = ({ width = "100%", height = 12, className, circle }: SkeletonProps) => (
  <div
    className={`gc-skeleton ${className || ""}`}
    style={{ width, height, borderRadius: circle ? "50%" : undefined }}
    aria-hidden="true"
  />
);
