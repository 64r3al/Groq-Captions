import type {
  BuildCaptionsResult,
  CaptionGroupData,
  CaptionStyle,
  SelectedAudioLayerInfo,
} from "../../shared/types";

// Phase 1 host surface: read the AE project/comp/layer model (only ExtendScript can do this)
// and hand plain data back to the panel. Everything CPU/IO heavy (ffmpeg, the Groq call) runs
// in the panel's Node context instead, so the host never blocks on network or child processes.

export const getSelectedAudioLayerInfo = (): SelectedAudioLayerInfo => {
  const comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    throw new Error("Open a composition first.");
  }
  if (comp.selectedLayers.length !== 1) {
    throw new Error("Select exactly one layer that contains the voice.");
  }
  const layer = comp.selectedLayers[0];
  if (!(layer instanceof AVLayer)) {
    throw new Error(
      "Select a footage or audio layer (not a shape, text, camera, or light layer)."
    );
  }
  if (!layer.hasAudio) {
    throw new Error("The selected layer has no audio.");
  }
  if (layer.timeRemapEnabled) {
    throw new Error(
      "Time remapping is enabled on this layer. Disable it or pre-render the audio first."
    );
  }
  if (layer.stretch <= 0) {
    throw new Error("Reversed layers (negative stretch) are not supported.");
  }
  const source = layer.source;
  if (!(source instanceof FootageItem) || !source.file) {
    throw new Error(
      "This layer has no source file (precomp or solid). Select the original video/audio layer instead."
    );
  }

  const stretch = layer.stretch / 100;
  const inPoint = Math.max(layer.inPoint, 0);
  const outPoint = Math.min(layer.outPoint, comp.duration);
  if (outPoint <= inPoint) {
    throw new Error("This layer has no visible time in the current composition.");
  }
  const sourceInSeconds = Math.max(0, (inPoint - layer.startTime) / stretch);
  const sourceDurationSeconds = (outPoint - inPoint) / stretch;

  return {
    compId: comp.id,
    compName: comp.name,
    compWidth: comp.width,
    compHeight: comp.height,
    compFrameRate: comp.frameRate,
    compDuration: comp.duration,
    layerIndex: layer.index,
    layerName: layer.name,
    sourceFilePath: source.file.fsName,
    sourceFileName: source.file.name,
    sourceFileSizeBytes: source.file.length,
    startTime: layer.startTime,
    stretchPercent: layer.stretch,
    inPoint: inPoint,
    outPoint: outPoint,
    sourceInSeconds: sourceInSeconds,
    sourceDurationSeconds: sourceDurationSeconds,
  };
};

/** Opens AE's native file-picker dialog so the user can point at an ffmpeg binary manually
 * when auto-detection fails. Uses ExtendScript's File.openDialog rather than a Node dialog
 * since CEP's Node integration has no built-in native file picker. */
export const pickFfmpegExecutable = (): string | null => {
  const f = File.openDialog("Locate the ffmpeg executable", "", false);
  return f ? f.fsName : null;
};

// ---------------------------------------------------------------------------------------
// Phase 2: comp/caption building.
//
// AE's property model is dynamic (arbitrary matchName strings, resolved only at runtime;
// see docs/ARCHITECTURE.md) in a way types-for-adobe's static types can't fully capture -
// PropertyGroup.addProperty()/Property.setValue() etc. aren't available on the generic
// `_PropertyClasses` union every `.property(name)` call returns. `p()` steps a property
// chain to `any` at exactly the points that need it (matching how the proven ScriptUI
// prototype this is ported from worked, since ExtendScript itself has no static types at
// all), while everything that IS ours - CaptionGroupData, CaptionStyle, loop control - stays
// properly typed.
// ---------------------------------------------------------------------------------------

const p = (obj: any, name: string | number): any => obj.property(name);

/** Mirrored from shared/constants.ts's POSITION_Y_FRACTIONS (see the file-header comment on
 * why cross-bundle runtime imports from src/shared/ into the ES3 host build aren't used here). */
const POSITION_Y_FRACTIONS = [0.82, 0.7, 0.5, 0.16];

const intToRgb = (n: number): [number, number, number] => [
  ((n >> 16) & 255) / 255,
  ((n >> 8) & 255) / 255,
  (n & 255) / 255,
];

const fmtArr = (arr: number[]): string => {
  const parts: string[] = [];
  for (let i = 0; i < arr.length; i++) parts.push(arr[i].toFixed(4));
  return parts.join(",");
};

// Expression Selector "Amount" expressions: textIndex is 1-based, t[] holds each word's reveal
// time (comp-time seconds). 100 = animator fully applied to that word, 0 = not applied.
const exprHideUntilSpoken = (times: number[]): string =>
  "var t=[" + fmtArr(times) + "];\nvar i=textIndex-1;\n(i<t.length && time<t[i]-0.0001) ? 100 : 0;";

const exprPop = (times: number[], durationSeconds: number): string =>
  "var t=[" + fmtArr(times) + "];\nvar d=" + durationSeconds + ";\nvar i=textIndex-1;\n" +
  "var p=(i<t.length)?(time-t[i])/d:1;\np<0 ? 100 : (p>=1 ? 0 : 100*(1-p)*(1-p));";

const exprActiveWord = (times: number[], endTime: number): string =>
  "var t=[" + fmtArr(times) + "];\nvar e=" + endTime.toFixed(4) + ";\nvar i=textIndex-1;\n" +
  "var a=(i<t.length)?t[i]:1e9;\nvar b=(i+1<t.length)?t[i+1]:e;\n" +
  "(time>=a-0.0001 && time<b-0.0001) ? 100 : 0;";

const textAnimatorsOf = (lyr: any): any => p(p(lyr, "ADBE Text Properties"), "ADBE Text Animators");

/** "Based On: Words" is matchName "ADBE Text Range Type2" = 3 on modern AE; older/localized
 * builds have needed a name-based fallback search, so this tries both (ported as-is from the
 * prototype, which proved this combination necessary). */
const setBasedOnWords = (sel: any): boolean => {
  try {
    sel.property("ADBE Text Range Type2").setValue(3);
    return true;
  } catch (e) {
    // fall through to the search below
  }
  for (let k = 1; k <= sel.numProperties; k++) {
    const prop = sel.property(k);
    if (String(prop.matchName).indexOf("Range Type") !== -1 || prop.name === "Based On") {
      try {
        prop.setValue(3);
        return true;
      } catch (e2) {
        // try the next candidate
      }
    }
  }
  return false;
};

/** Adds a Text Animator with one property (tried against several candidate value shapes,
 * since e.g. "ADBE Text Fill Color" wants a 4-value RGBA array on some AE builds and a
 * 3-value RGB array on others) and an Expression-Selector-driven Amount, based on words. */
const addWordAnimator = (
  lyr: any,
  name: string,
  propMatch: string,
  values: unknown[],
  expr: string
): void => {
  const animators = textAnimatorsOf(lyr);
  const animator = animators.addProperty("ADBE Text Animator");
  const animatorIndex = animator.propertyIndex;
  animator.name = name;
  const getAnimator = () => textAnimatorsOf(lyr).property(animatorIndex);

  getAnimator().property("ADBE Text Animator Properties").addProperty(propMatch);
  const prop = getAnimator().property("ADBE Text Animator Properties").property(propMatch);
  let ok = false;
  for (let v = 0; v < values.length && !ok; v++) {
    try {
      prop.setValue(values[v]);
      ok = true;
    } catch (e) {
      // try the next candidate value shape
    }
  }

  getAnimator().property("ADBE Text Selectors").addProperty("ADBE Text Expressible Selector");
  let selector = getAnimator().property("ADBE Text Selectors").property(1);
  if (!setBasedOnWords(selector)) {
    throw new Error("Could not set the Expression Selector to 'Based On: Words'.");
  }
  // Re-fetch: addProperty()/setValue() calls above can invalidate sibling property references.
  selector = getAnimator().property("ADBE Text Selectors").property(1);
  selector.property("ADBE Text Expressible Amount").expression = expr;
};

/** Per-word reveal times for one caption's word-by-word animation: leadInFrames early, never
 * before the caption's own start. Mirrors shared/captions.ts#revealTimes exactly, kept as a
 * tiny local copy rather than a cross-bundle import - see the file-header comment above. */
const revealTimesFor = (group: CaptionGroupData, leadInFrames: number, fps: number): number[] => {
  const leadInSeconds = leadInFrames / fps;
  const times: number[] = [];
  for (let i = 0; i < group.words.length; i++) {
    times.push(Math.max(group.start, group.words[i].start - leadInSeconds));
  }
  return times;
};

const createCaptionLayer = (
  comp: CompItem,
  group: CaptionGroupData,
  index: number,
  style: CaptionStyle
): TextLayer => {
  // shared/captions.ts's wrapLines joins wrapped lines with "\n" (a host-agnostic choice, so
  // the same CaptionGroupData is usable for a future panel-side preview too); AE's
  // TextDocument.text specifically wants "\r" as its paragraph line break, a long-standing
  // ExtendScript quirk, so that conversion happens here and only here.
  const aeText = group.text.replace(/\n/g, "\r");
  const lyr = comp.layers.addText(aeText);
  const label = group.text.replace(/\r|\n/g, " ");
  const numberPrefix = index < 10 ? "00" : index < 100 ? "0" : "";
  lyr.name = "CAP " + numberPrefix + index + "  " + label.substr(0, 24);

  const srcProp = p(p(lyr, "ADBE Text Properties"), "ADBE Text Document");
  const doc: TextDocument = srcProp.value;
  try {
    doc.resetCharStyle();
  } catch (e0) {
    // not fatal - some AE versions/fonts don't support a full style reset
  }
  doc.text = aeText;
  try {
    doc.font = style.font;
  } catch (e1) {
    // invalid/missing PostScript font name - fall back to whatever font AE already picked
  }
  doc.fontSize = style.size;
  doc.applyFill = true;
  doc.fillColor = intToRgb(style.textColor);
  if (style.strokeWidth > 0) {
    doc.applyStroke = true;
    doc.strokeColor = intToRgb(style.strokeColor);
    doc.strokeWidth = style.strokeWidth;
    doc.strokeOverFill = false;
  } else {
    doc.applyStroke = false;
  }
  doc.justification = ParagraphJustification.CENTER_JUSTIFY;
  srcProp.setValue(doc);

  lyr.inPoint = group.start;
  lyr.outPoint = group.end;

  // Word-based anchor grouping so per-word scale pops from each word's own center.
  try {
    p(p(lyr, "ADBE Text Properties"), "ADBE Text More Options")
      .property("ADBE Text Anchor Point Option")
      .setValue(2);
  } catch (e2) {
    // cosmetic only - pop animation still works, just anchored at the layer's default point
  }

  const transform = lyr.property("ADBE Transform Group");
  p(transform, "ADBE Anchor Point").expression =
    "var r=sourceRectAtTime(outPoint-thisComp.frameDuration,false);\n[r.left+r.width/2, r.top+r.height/2];";
  p(transform, "ADBE Position").setValue([
    comp.width / 2,
    comp.height * POSITION_Y_FRACTIONS[style.posIndex],
  ]);

  const times = revealTimesFor(group, style.leadInFrames, comp.frameRate);

  if (style.highlight) {
    const hc = intToRgb(style.highlightColor);
    addWordAnimator(
      lyr,
      "Active Word",
      "ADBE Text Fill Color",
      [[hc[0], hc[1], hc[2], 1], hc],
      exprActiveWord(times, group.end)
    );
  }
  if (style.pop) {
    addWordAnimator(lyr, "Pop In", "ADBE Text Scale 3D", [[70, 70, 100], [70, 70]], exprPop(times, 0.12));
  }
  if (style.reveal) {
    addWordAnimator(lyr, "Reveal (synced)", "ADBE Text Opacity", [0], exprHideUntilSpoken(times));
  }
  if (style.shadow) {
    try {
      const fx = p(lyr, "ADBE Effect Parade").addProperty("ADBE Drop Shadow");
      p(fx, "ADBE Drop Shadow-0004").setValue(6);
      p(fx, "ADBE Drop Shadow-0005").setValue(14);
    } catch (e3) {
      // drop shadow is cosmetic - skip it rather than fail the whole build
    }
  }
  return lyr;
};

/** Builds every caption layer and precomposes them, in one undo step. `groups` must already
 * be fully computed (comp-time, frame-quantized, grouped) by the panel - see
 * src/shared/sync.ts and src/shared/captions.ts - so this function is pure AE-object-model
 * work and never needs to re-derive timing. */
export const buildCaptions = (
  compId: number,
  groups: CaptionGroupData[],
  style: CaptionStyle
): BuildCaptionsResult => {
  const comp = app.project.activeItem;
  if (!(comp instanceof CompItem) || comp.id !== compId) {
    throw new Error("Open the same composition you generated the transcript in.");
  }
  if (!groups.length) {
    throw new Error("No words to build captions from.");
  }

  let wordCount = 0;
  for (let i = 0; i < groups.length; i++) wordCount += groups[i].words.length;

  const precompName = "Captions - " + comp.name;
  app.beginUndoGroup("Groq Captions");
  try {
    const layers: TextLayer[] = [];
    for (let i = 0; i < groups.length; i++) {
      layers.push(createCaptionLayer(comp, groups[i], i + 1, style));
    }
    const indices: number[] = [];
    for (let j = 0; j < layers.length; j++) indices.push(layers[j].index);
    const pre = comp.layers.precompose(indices, precompName, true);
    pre.comment = "Generated by Groq Captions";
  } finally {
    app.endUndoGroup();
  }

  return { words: wordCount, captions: groups.length, precompName: precompName };
};
