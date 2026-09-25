import { useMemo } from "react";
import { FileText } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import type { TranscriptWord } from "../../../shared/types";

export interface TranscriptEditorProps {
  words: TranscriptWord[];
}

const DISPLAY_CHUNK_SIZE = 8;
const SENTENCE_END = /[.!?…]$/;

const fmtTimestamp = (n: number): string => {
  const m = Math.floor(n / 60);
  const s = (n % 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
};

/** Chunks the flat word list into short, readable rows for display - purely a reading aid, not
 * the actual on-screen caption grouping (see shared/captions.ts#buildGroups for that, which
 * also needs a synced/comp-time word list this component never receives). */
const chunkForDisplay = (words: TranscriptWord[]): TranscriptWord[][] => {
  const rows: TranscriptWord[][] = [];
  let current: TranscriptWord[] = [];
  for (const word of words) {
    current.push(word);
    if (current.length >= DISPLAY_CHUNK_SIZE || SENTENCE_END.test(word.text)) {
      rows.push(current);
      current = [];
    }
  }
  if (current.length) rows.push(current);
  return rows;
};

/** A read-only, word-chip view of the transcript. Rows use `content-visibility: auto` (see
 * ui/../features.scss) so the browser skips layout/paint for off-screen rows entirely - the
 * simplest reliable way to keep a 30-minute transcript (thousands of words) scrolling smoothly
 * without hand-rolled scroll-position virtualization. Editing and AE-playhead sync are Phase 3
 * work (per the redesign brief's scoping decision) - this is intentionally view-only for now. */
export const TranscriptEditor = ({ words }: TranscriptEditorProps) => {
  const rows = useMemo(() => chunkForDisplay(words), [words]);

  if (!rows.length) {
    return (
      <EmptyState
        icon={<FileText size={24} />}
        title="No transcript yet"
        description="Generate a transcript above to see it here."
      />
    );
  }

  return (
    <div className="gc-transcript">
      {rows.map((row, i) => (
        <div className="gc-transcript-row" key={i}>
          <span className="gc-transcript-time gc-num">{fmtTimestamp(row[0].start)}</span>
          <span className="gc-transcript-words">
            {row.map((w, wi) => (
              <span className="gc-transcript-chip" key={wi}>
                {w.text}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
};
