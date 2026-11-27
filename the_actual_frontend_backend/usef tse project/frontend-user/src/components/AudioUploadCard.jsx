import React, { useRef, useState } from "react";
import { UploadCloud, FileAudio, Trash2, RefreshCw, CheckCircle2, AlertCircle, Volume2, User } from "lucide-react";
import AudioWavePlayer from "./AudioWavePlayer";

export default function AudioUploadCard({
  id,
  label,
  channelCode,
  description,
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

  const allowedExtensions = [".wav", ".mp3", ".flac", ".ogg"];

  const validateAndSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFormatError(null);

    const name = selectedFile.name.toLowerCase();
    if (name.endsWith(".m4a")) {
      setFormatError("M4A is not supported by the server audio decoder. Please convert to WAV, MP3, FLAC, or OGG.");
      return;
    }

    const isValid = allowedExtensions.some((ext) => name.endsWith(ext));

    if (!isValid) {
      setFormatError("Unsupported audio format. Please upload WAV, MP3, FLAC, or OGG.");
      return;
    }

    onFileSelect(selectedFile);
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

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
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
      className={`flex-1 flex flex-col bg-[var(--bg-surface-1)] border rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-[var(--shadow-card)] relative ${
        isDragging
          ? "border-[var(--accent-gold)] bg-[var(--accent-gold-dim)] shadow-[0_0_24px_var(--accent-gold-glow)]"
          : file
          ? "border-[var(--border-subtle)]"
          : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept=".wav,.mp3,.flac,.ogg,audio/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={isExtracting}
      />

      {/* Card Header */}
      <div className="flex items-start justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
              isMixture
                ? "bg-[var(--accent-purple-dim)] text-[var(--accent-purple)] border-[var(--accent-purple)]/30"
                : "bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border-[var(--accent-gold)]/30"
            }`}
          >
            {isMixture ? <Volume2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-bold text-[var(--text-primary)] text-sm tracking-tight">
                {label}
              </h3>
              {channelCode && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface-2)] text-[var(--text-secondary)] font-medium">
                  {channelCode}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans leading-normal">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        {file ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Loaded</span>
          </span>
        ) : (
          <span className="text-[11px] font-sans text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-2 py-0.5 rounded-full">
            Required
          </span>
        )}
      </div>

      {/* Format Error Notice */}
      {formatError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{formatError}</span>
        </div>
      )}

      {/* Main Content: Upload Drop Zone OR Loaded Audio Player */}
      {!file ? (
        /* Dropzone view */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isExtracting && fileInputRef.current?.click()}
          className={`flex-1 min-h-[170px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 group ${
            isDragging
              ? "border-[var(--accent-gold)] bg-[var(--accent-gold-dim)]/50"
              : "border-[var(--border-subtle)] hover:border-[var(--accent-gold)]/60 hover:bg-[var(--bg-surface-2)]/40"
          } ${isExtracting ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 duration-200 ${
              isMixture
                ? "bg-[var(--accent-purple-dim)] text-[var(--accent-purple)]"
                : "bg-[var(--accent-gold-dim)] text-[var(--accent-gold)]"
            }`}
          >
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-xs font-sans font-semibold text-[var(--text-primary)]">
            Click to upload or drag &amp; drop
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">
            WAV, MP3, FLAC, or OGG
          </p>

          {hint && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 italic font-sans max-w-xs">
              {hint}
            </p>
          )}
        </div>
      ) : (
        /* Loaded File + Player View */
        <div className="flex-1 flex flex-col justify-between space-y-4">
          {/* File Meta Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-2)]/70 border border-[var(--border-subtle)] text-xs">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <FileAudio className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
              <div className="min-w-0">
                <p className="font-sans font-semibold text-[var(--text-primary)] truncate text-xs">
                  {file.name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">
                  {formatFileSize(file.size)} • {formatDuration(duration)}
                </p>
              </div>
            </div>

            {/* Replace / Remove Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!isExtracting && fileInputRef.current) {
                    fileInputRef.current.value = "";
                    fileInputRef.current.click();
                  }
                }}
                disabled={isExtracting}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                title="Replace recording"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  onRemove();
                }}
                disabled={isExtracting}
                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                title="Remove recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Real Audio Wave Player */}
          {audioUrl && (
            <AudioWavePlayer
              audioUrl={audioUrl}
              mode={isMixture ? "mixture" : "reference"}
            />
          )}
        </div>
      )}
    </div>
  );
}
