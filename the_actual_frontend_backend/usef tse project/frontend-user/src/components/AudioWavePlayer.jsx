import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useAudioWaveform } from "../hooks/useAudioWaveform";

export default function AudioWavePlayer({
  audioUrl,
  mode = "mixture", // "mixture" | "reference" | "extracted"
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Responsive bar count: 32 bars on mobile screens (<640px), 46 on desktop
  const [barCount, setBarCount] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 640 ? 32 : 46
  );

  useEffect(() => {
    const handleResize = () => {
      setBarCount(window.innerWidth < 640 ? 32 : 46);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Extract genuine waveform peaks from actual audio file using Web Audio API
  const { peaks, duration: decodedDuration } = useAudioWaveform(
    audioUrl,
    barCount
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
          console.warn("Playback prevented or audio error:", err);
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

  // Handle clicking directly on waveform bar to seek
  const handleBarClick = (index) => {
    if (!audioRef.current || peaks.length === 0 || effectiveDuration <= 0) return;
    const targetTime = (index / peaks.length) * effectiveDuration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const isExtracted = mode === "extracted";
  const isReference = mode === "reference";

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Real Waveform Visualizer Display */}
      <div
        className={`relative w-full h-16 rounded-xl px-3 py-2 flex items-center justify-between gap-1 border transition-all duration-200 select-none ${
          isExtracted
            ? "bg-[var(--accent-gold-dim)] border-[var(--accent-gold)]/40 shadow-[0_0_15px_var(--accent-gold-glow)]"
            : isReference
            ? "bg-[var(--accent-gold-dim)]/40 border-[var(--border-subtle)]"
            : "bg-[var(--bg-surface-2)]/60 border-[var(--border-subtle)]"
        }`}
      >
        {/* Waveform Bars */}
        <div className="w-full h-full flex items-center justify-between gap-[2px] sm:gap-[3px] py-1 cursor-pointer">
          {peaks.map((peak, idx) => {
            const barRatio = idx / peaks.length;
            const isPassed = barRatio <= progressRatio;

            // Height normalized to percent
            const heightPercent = Math.max(12, Math.round(peak * 100));

            return (
              <div
                key={idx}
                onClick={() => handleBarClick(idx)}
                className="flex-1 flex items-center justify-center h-full group"
                title={`Seek to ${formatTime(barRatio * effectiveDuration)}`}
              >
                <div
                  className={`w-full rounded-full transition-all duration-150 ${
                    isExtracted
                      ? isPassed
                        ? "bg-[var(--accent-gold)] shadow-[0_0_6px_var(--accent-gold-glow)]"
                        : "bg-[var(--accent-gold)]/30 group-hover:bg-[var(--accent-gold)]/60"
                      : isReference
                      ? isPassed
                        ? "bg-[var(--accent-gold)] shadow-[0_0_5px_var(--accent-gold-glow)]"
                        : "bg-[var(--accent-gold)]/30 group-hover:bg-[var(--accent-gold)]/60"
                      : isPassed
                      ? "bg-[var(--accent-purple)] shadow-[0_0_5px_var(--accent-purple-glow)]"
                      : "bg-[var(--text-muted)]/35 group-hover:bg-[var(--text-muted)]/60"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback Controls Row */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className={`w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
              isExtracted
                ? "btn-gold"
                : isReference
                ? "bg-[var(--accent-gold)] text-[var(--accent-gold-text)] hover:opacity-90"
                : "bg-[var(--accent-purple)] text-white hover:opacity-90"
            }`}
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Reset / Restart */}
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer active:scale-95"
            title="Restart to beginning"
            aria-label="Restart audio track"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Mute toggle */}
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer active:scale-95"
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

        {/* Timestamp */}
        <div className="text-[11px] font-mono text-[var(--text-secondary)] select-none">
          <span className="font-semibold text-[var(--text-primary)]">{formatTime(currentTime)}</span>
          <span className="mx-1 text-[var(--text-muted)]">/</span>
          <span>{formatTime(effectiveDuration)}</span>
        </div>
      </div>
    </div>
  );
}
