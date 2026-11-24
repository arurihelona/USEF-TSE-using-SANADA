import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Activity } from "lucide-react";
import { useAudioWaveform } from "../hooks/useAudioWaveform";

export default function MobileAudioPlayer({
  audioUrl,
  mode = "mixture", // "mixture" | "reference" | "extracted"
  title,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // 26 bars on mobile for optimal thumb tap accuracy and clean spacing
  const { peaks, duration: decodedDuration, isLoading: isWaveformLoading } = useAudioWaveform(
    audioUrl,
    26
  );

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Playback prevented:", err);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const effectiveDuration = audioDuration || decodedDuration || 0;
  const progressRatio = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;

  const handleBarClick = (index) => {
    if (!audioRef.current || peaks.length === 0 || effectiveDuration <= 0) return;
    const targetTime = (index / peaks.length) * effectiveDuration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const isExtracted = mode === "extracted";
  const isReference = mode === "reference";

  return (
    <div className="w-full flex flex-col gap-2 pt-1 select-none">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Waveform Visualization Box */}
      <div
        className={`relative w-full h-14 rounded-xl px-2.5 py-1.5 flex items-center justify-between border transition-all duration-200 ${
          isExtracted
            ? "bg-[var(--accent-gold-dim)] border-[var(--accent-gold)]/40 shadow-[0_0_12px_var(--accent-gold-glow)]"
            : isReference
            ? "bg-[var(--accent-gold-dim)]/40 border-[var(--border-subtle)]"
            : "bg-[var(--bg-surface-2)]/60 border-[var(--border-subtle)]"
        }`}
      >
        {isWaveformLoading ? (
          <div className="w-full flex items-center justify-center gap-1.5 text-xs font-mono text-[var(--text-muted)]">
            <Activity className="w-3.5 h-3.5 animate-spin text-[var(--accent-gold)]" />
            <span className="text-[11px]">Loading waveform...</span>
          </div>
        ) : peaks.length > 0 ? (
          <div className="w-full h-full flex items-center justify-between gap-[3px]">
            {peaks.map((peak, idx) => {
              const barProgress = idx / peaks.length;
              const hasPlayed = barProgress <= progressRatio;
              const heightPct = Math.max(16, Math.round(peak * 100));

              let barColor = "bg-[var(--text-dim)]/40";
              if (isExtracted) {
                barColor = hasPlayed
                  ? "bg-[var(--accent-gold)] shadow-[0_0_6px_var(--accent-gold)] opacity-100"
                  : "bg-[var(--accent-gold)]/35";
              } else if (isReference) {
                barColor = hasPlayed
                  ? "bg-[var(--accent-gold)] opacity-100"
                  : "bg-[var(--accent-gold)]/35";
              } else {
                barColor = hasPlayed
                  ? "bg-[var(--accent-purple)] opacity-100"
                  : "bg-[var(--accent-purple)]/35";
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleBarClick(idx)}
                  style={{ height: `${heightPct}%` }}
                  className={`flex-1 rounded-full transition-all duration-75 cursor-pointer ${barColor}`}
                  title={`Seek to ${formatTime((idx / peaks.length) * effectiveDuration)}`}
                  aria-label={`Seek to ${formatTime((idx / peaks.length) * effectiveDuration)}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="w-full flex items-center justify-center text-[10px] font-mono text-[var(--text-muted)]">
            Audio loaded
          </div>
        )}
      </div>

      {/* Scrub range slider for precision seeking */}
      <div className="relative flex items-center px-0.5">
        <input
          type="range"
          min="0"
          max={effectiveDuration || 1}
          step="0.05"
          value={currentTime}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setCurrentTime(val);
            if (audioRef.current) audioRef.current.currentTime = val;
          }}
          className="w-full h-1 bg-[var(--border-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-gold)]"
          aria-label="Audio playback seeker"
        />
      </div>

      {/* Playback Controls & Timestamp */}
      <div className="flex items-center justify-between pt-0.5 px-0.5">
        <div className="flex items-center gap-2">
          {/* Prominent Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center font-bold transition-all cursor-pointer shadow-md active:scale-95 ${
              isExtracted
                ? "bg-[var(--accent-gold)] text-[#090a10]"
                : isReference
                ? "bg-[var(--accent-gold)] text-[var(--accent-gold-text)]"
                : "bg-[var(--accent-purple)] text-white"
            }`}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Time display */}
          <div className="text-[11px] font-mono text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">{formatTime(currentTime)}</span>
            <span className="mx-1 text-[var(--text-muted)]">/</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>

        {/* Volume & Restart Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer active:scale-95 min-h-[32px] min-w-[32px]"
            title="Restart"
            aria-label="Restart audio track"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer active:scale-95 min-h-[32px] min-w-[32px]"
            title={isMuted ? "Unmute" : "Mute"}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
