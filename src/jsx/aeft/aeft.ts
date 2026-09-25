import type { SelectedAudioLayerInfo } from "../../shared/types";

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
