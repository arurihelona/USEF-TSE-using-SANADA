import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileAudio,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Volume2,
  User,
  Mic,
  AudioWaveform,
} from "lucide-react";
import MobileAudioPlayer from "./MobileAudioPlayer";

export default function MobileAudioCard({
  id,
  label,
  channelCode,
  subtitle,
  hint,
  variant = "mixture", // "mixture" | "reference"
  file,
  audioUrl,
  duration,
  onFileSelect,
  onRemove,
  isExtracting,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formatError, setFormatError] = useState(null);

  const allowedExtensions = [".wav", ".mp3", ".flac", ".ogg", ".m4a"];

  const validateAndSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFormatError(null);

    const name = selectedFile.name.toLowerCase();
    const isValid = allowedExtensions.some((ext) => name.endsWith(ext));

    if (!isValid) {
      setFormatError("Unsupported format. Please upload WAV, MP3, FLAC, OGG, or M4A.");
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isExtracting) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isExtracting) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDuration = (secs) => {
    if (!secs || isNaN(secs)) return "--:--";
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  const isMixture = variant === "mixture";

  return (
    <div
      className={`w-full rounded-2xl p-4 bg-[var(--bg-surface-1)] border transition-all duration-200 shadow-[var(--shadow-card)] relative ${
        file
          ? "border-[var(--border-subtle)]"
          : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept=".wav,.mp3,.flac,.ogg,.m4a,audio/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={isExtracting}
      />

      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs shrink-0 ${
              isMixture
                ? "bg-[var(--accent-purple-dim)] text-[var(--accent-purple)] border-[var(--accent-purple)]/30"
                : "bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border-[var(--accent-gold)]/30"
            }`}
          >
            {isMixture ? <Volume2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-sans font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                {label}
              </h3>
              {channelCode && (
                <span className="font-mono text-[9px] font-bold text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-1.5 py-0.2 rounded shrink-0">
                  {channelCode}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">{subtitle}</p>
          </div>
        </div>

        {/* State Badge */}
        {file ? (
          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-[var(--accent-gold)] bg-[var(--accent-gold-dim)] border border-[var(--accent-gold)]/30 px-2 py-0.5 rounded-full shrink-0">
            <CheckCircle2 className="w-3 h-3" /> READY
          </span>
        ) : (
          <span className="font-mono text-[9px] text-[var(--text-muted)] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full shrink-0">
            SELECT
          </span>
        )}
      </div>

      {/* Body Area */}
      {file && audioUrl ? (
        /* Loaded File State */
        <div className="flex flex-col space-y-3">
          {/* Metadata chip */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <FileAudio className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
              <span className="truncate font-semibold text-[var(--text-primary)] text-[11px]" title={file.name}>
                {file.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] shrink-0 font-mono">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span className="text-[var(--text-primary)] font-bold">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Embedded Mobile Waveform Player */}
          <MobileAudioPlayer
            audioUrl={audioUrl}
            mode={variant}
            title={file.name}
          />

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                  fileInputRef.current.click();
                }
              }}
              disabled={isExtracting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer active:scale-95 disabled:opacity-50 min-h-[36px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = "";
                onRemove();
              }}
              disabled={isExtracting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 cursor-pointer active:scale-95 disabled:opacity-50 min-h-[36px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty Upload Zone: Centered, responsive icon and dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isExtracting && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-5 sm:p-6 border-2 border-dashed rounded-xl transition-all duration-150 cursor-pointer text-center group active:scale-[0.99] min-h-[145px] ${
            isDragging
              ? "border-[var(--accent-gold)] bg-[var(--accent-gold-dim)]/50 scale-[1.01]"
              : "border-[var(--border-subtle)] hover:border-[var(--accent-gold)]/60 bg-[var(--bg-surface-0)]/40 hover:bg-[var(--bg-surface-2)]/30"
          } ${isExtracting ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
        >
          {/* Centered, responsive, non-overflowing icon */}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105 shadow-xs shrink-0 ${
              isMixture
                ? "bg-[var(--accent-purple-dim)] text-[var(--accent-purple)] border border-[var(--accent-purple)]/30"
                : "bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30"
            }`}
          >
            {isMixture ? (
              <AudioWaveform className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </div>

          <h4 className="text-xs font-sans font-bold text-[var(--text-primary)]">
            Tap or drop to select audio
          </h4>
          <p className="text-[10px] text-[var(--accent-gold)] font-mono font-medium mt-0.5">
            WAV, MP3, FLAC, OGG, M4A
          </p>

          {hint && (
            <p className="text-[10px] text-[var(--text-muted)] max-w-xs mt-1.5 leading-tight px-2">
              {hint}
            </p>
          )}
        </div>
      )}

      {/* Format Error Notice */}
      {formatError && (
        <div className="mt-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-mono flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{formatError}</span>
        </div>
      )}
    </div>
  );
}
