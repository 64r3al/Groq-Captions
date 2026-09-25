export interface WaveformPreviewProps {
  /** Anything that should reproduce the same-looking bars for the same clip (e.g. the source
   * file name) - this is decorative, not a real waveform, so it only needs to look plausible
   * and stay stable across re-renders. */
  seed?: string | number;
  bars?: number;
  className?: string;
}

const hashString = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
};

/** A tiny deterministic PRNG (Lehmer/Park-Miller) - good enough to turn a seed into stable,
 * non-uniform-looking bar heights without pulling in a dependency. */
const pseudoRandom = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

/** Decorative waveform shown next to the selected audio layer - no audio is decoded, it's just
 * a stable-looking texture derived from the source file name. */
export const WaveformPreview = ({ seed = "groq-captions", bars = 40, className }: WaveformPreviewProps) => {
  const seedNum = typeof seed === "number" ? Math.abs(Math.trunc(seed)) || 1 : hashString(seed);
  const next = pseudoRandom(seedNum);
  const heights = Array.from({ length: bars }, () => 16 + next() * 84);

  return (
    <div className={`gc-waveform ${className || ""}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span key={i} className="gc-waveform-bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
};
