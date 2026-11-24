import React, { useState } from "react";
import { Download, RotateCcw, Volume2, CheckCircle2, Clock, SlidersHorizontal } from "lucide-react";
import MobileAudioPlayer from "./MobileAudioPlayer";

export default function MobileOutputSection({
  result,
  mixedAudioUrl,
  mixedFile,
  onReset,
}) {
  const [activeTab, setActiveTab] = useState("extracted"); // "extracted" | "comparison"

  if (!result) {
    return (
      <div className="w-full bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-[var(--shadow-card)] my-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] flex items-center justify-center mb-2 text-[var(--text-muted)]">
          <Volume2 className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-sans font-bold text-[var(--text-primary)] mb-0.5">
          Extraction Output
        </h4>
        <p className="text-[11px] text-[var(--text-secondary)] font-sans max-w-xs">
          Select mixture & reference recordings above, then tap Extract to hear the isolated speaker.
        </p>
      </div>
    );
  }

  const handleDownload = () => {
    if (!result.download_url) return;
    const link = document.createElement("a");
    link.href = result.download_url;
    link.download = result.output_filename || "extracted_target_speaker.wav";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="output-result"
      className="w-full bg-[var(--bg-surface-1)] border-2 border-[var(--accent-gold)]/70 rounded-2xl p-4 shadow-[0_4px_24px_-4px_var(--accent-gold-glow)] relative overflow-hidden transition-all duration-300 my-4 animate-fadeInSlideUp"
    >
      {/* Top Gold Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-gold)]" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/40 shadow-xs shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-sans font-bold text-[var(--text-primary)] truncate">
              Extracted Target Speech
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)] truncate">
              Voice isolated by USEF-TFGridNet
            </p>
          </div>
        </div>

        {/* Metrics chips: Duration & Latency */}
        <div className="flex items-center gap-1.5 shrink-0">
          {result.extracted_duration !== undefined && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--accent-gold-dim)] border border-[var(--accent-gold)]/30 text-[10px] font-mono text-[var(--accent-gold)] font-bold">
              <span>{result.extracted_duration}s</span>
            </div>
          )}
          {result.processing_time !== undefined && result.processing_time !== null && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-primary)]">
              <Clock className="w-3 h-3 text-[var(--accent-gold)]" />
              <span>{result.processing_time}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Switcher: Isolated vs Before & After */}
      {mixedAudioUrl && (
        <div className="flex items-center gap-1 mb-3.5 p-1 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] w-full text-xs font-sans">
          <button
            type="button"
            onClick={() => setActiveTab("extracted")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all text-center min-h-[34px] text-[11px] cursor-pointer ${
              activeTab === "extracted"
                ? "btn-gold shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Isolated Voice
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comparison")}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 min-h-[34px] text-[11px] cursor-pointer ${
              activeTab === "comparison"
                ? "btn-gold shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Before &amp; After</span>
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "extracted" || !mixedAudioUrl ? (
        /* Single Extracted Track Player */
        <div className="p-3 rounded-xl bg-[var(--bg-surface-2)]/60 border border-[var(--border-subtle)] mb-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] mb-2">
            <span className="font-bold text-[var(--accent-gold)]">Clean Target Voice</span>
            <span className="text-[10px] text-[var(--text-muted)]">{result.sample_rate || 8000} Hz</span>
          </div>
          <MobileAudioPlayer
            audioUrl={result.output_url}
            title={result.output_filename}
            mode="extracted"
          />
        </div>
      ) : (
        /* Before & After Stacked Cards (Vertical for Mobile) */
        <div className="space-y-3 mb-4">
          {/* 1. Original Mixture */}
          <div className="p-3 rounded-xl bg-[var(--bg-surface-2)]/70 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] mb-1.5">
              <span className="font-bold text-[var(--text-primary)]">1. Original Mixture</span>
              <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-surface-3)]/60 px-1.5 py-0.2 rounded">
                Multi-Speaker
              </span>
            </div>
            <MobileAudioPlayer
              audioUrl={mixedAudioUrl}
              title={mixedFile?.name || "Original Mixture"}
              mode="mixture"
            />
          </div>

          {/* 2. Isolated Target Voice */}
          <div className="p-3 rounded-xl bg-[var(--accent-gold-dim)]/50 border border-[var(--accent-gold)]/40 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] mb-1.5">
              <span className="font-bold text-[var(--accent-gold)]">2. Extracted Target Voice</span>
              <span className="text-[9px] font-bold text-[var(--accent-gold)] bg-[var(--accent-gold-dim)] px-1.5 py-0.2 rounded border border-[var(--accent-gold)]/30">
                Clean Output
              </span>
            </div>
            <MobileAudioPlayer
              audioUrl={result.output_url}
              title={result.output_filename}
              mode="extracted"
            />
          </div>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
        {/* Full-width Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          className="btn-gold w-full py-3 px-4 rounded-xl font-sans text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[46px] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Download Extracted Audio (.WAV)</span>
        </button>

        {/* Reset / Extract Another Button */}
        <button
          type="button"
          onClick={onReset}
          className="w-full py-2.5 px-4 rounded-xl font-sans text-xs font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[42px] active:scale-[0.98]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Extract Another Audio</span>
        </button>
      </div>
    </div>
  );
}
