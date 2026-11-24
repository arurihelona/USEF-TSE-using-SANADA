import React from "react";
import { Loader2, AlertCircle, XCircle, RotateCcw, AudioWaveform } from "lucide-react";

export default function MobileExtractionAction({
  canExtract,
  isExtracting,
  hasMixedFile,
  hasRefFile,
  modelStatus,
  onExtract,
  error,
  onClearError,
}) {
  const isModelReady = modelStatus?.status === "ready";
  const isModelLoading = modelStatus?.status === "loading" || (!modelStatus && hasMixedFile && hasRefFile);
  const isBackendError = modelStatus?.status === "error";

  // Determine button label and subtitle
  let buttonTitle = "Extract Target Speaker";
  let buttonSubtitle = "Tap to isolate the target voice";
  let buttonIcon = <AudioWaveform className="w-4 h-4" />;

  if (isExtracting) {
    buttonTitle = "Extracting Speaker...";
    buttonSubtitle = "Isolating voice from mixed audio...";
    buttonIcon = <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-gold-text)]" />;
  } else if (!hasMixedFile && !hasRefFile) {
    buttonSubtitle = "Upload Mixture & Reference Audio above";
  } else if (!hasMixedFile) {
    buttonSubtitle = "Upload Mixture Audio recording above";
  } else if (!hasRefFile) {
    buttonSubtitle = "Upload Target Voice Reference snippet above";
  } else if (isModelLoading) {
    buttonTitle = "AI Model Initializing...";
    buttonSubtitle = "Loading neural network weights, please wait...";
    buttonIcon = <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-gold)]" />;
  } else if (isBackendError) {
    buttonTitle = "Backend Reconnecting...";
    buttonSubtitle = "Waiting for backend on port 8000";
    buttonIcon = <AlertCircle className="w-4 h-4 text-amber-400" />;
  }

  const handleClick = (e) => {
    e.preventDefault();
    if (!canExtract || isExtracting) return;
    onExtract();
  };

  return (
    <div className="w-full flex flex-col items-center my-4 space-y-3 relative z-10">
      {/* Primary Extraction Trigger Button */}
      <div className="w-full flex flex-col items-center">
        <button
          type="button"
          onClick={handleClick}
          disabled={!canExtract || isExtracting}
          className={`w-full py-3.5 px-5 rounded-2xl font-sans text-sm font-bold flex flex-col items-center justify-center gap-0.5 transition-all duration-150 min-h-[56px] shadow-md ${
            isExtracting
              ? "btn-gold cursor-wait brightness-95 pointer-events-none"
              : canExtract
              ? "btn-gold cursor-pointer active:scale-[0.98] shadow-[0_4px_20px_-2px_var(--accent-gold-glow)]"
              : isModelLoading && hasMixedFile && hasRefFile
              ? "bg-[var(--bg-surface-2)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/40 cursor-wait animate-pulse"
              : "bg-[var(--bg-surface-2)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed opacity-65"
          }`}
          aria-label={buttonTitle}
        >
          <div className="flex items-center gap-2">
            {buttonIcon}
            <span
              className={`text-sm font-bold ${
                isExtracting
                  ? "text-[var(--accent-gold-text)]"
                  : canExtract
                  ? "text-[var(--accent-gold-text)]"
                  : isModelLoading && hasMixedFile && hasRefFile
                  ? "text-[var(--accent-gold)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {buttonTitle}
            </span>
          </div>
          <span
            className={`text-[10px] font-normal opacity-90 ${
              isExtracting || canExtract
                ? "text-[var(--accent-gold-text)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            {buttonSubtitle}
          </span>
        </button>
      </div>

      {/* Error alert notice with retry action */}
      {error && (
        <div className="w-full p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-sans flex items-start justify-between gap-2 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-rose-200 text-xs">Extraction Failed</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5 leading-snug break-words">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canExtract && (
              <button
                type="button"
                onClick={handleClick}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/40 text-[10px] font-bold cursor-pointer active:scale-95 hover:bg-rose-500/30 min-h-[30px]"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={onClearError}
              className="p-1 rounded text-rose-400 hover:text-white cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center"
              aria-label="Dismiss error"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
