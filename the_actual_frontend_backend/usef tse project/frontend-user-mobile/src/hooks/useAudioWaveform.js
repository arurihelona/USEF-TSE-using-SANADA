import { useState, useEffect } from "react";

// In-memory cache for decoded peak data by URL
const waveformCache = new Map();

let sharedAudioCtx = null;
function getAudioContext() {
  if (!sharedAudioCtx && typeof window !== "undefined") {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  return sharedAudioCtx;
}

/**
 * Custom hook to decode REAL audio data into normalized waveform amplitude peaks.
 * Uses Web Audio API PCM analysis.
 */
export function useAudioWaveform(audioUrl, barCount = 28) {
  const [peaks, setPeaks] = useState([]);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!audioUrl) {
      setPeaks([]);
      setDuration(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${audioUrl}_${barCount}`;
    if (waveformCache.has(cacheKey)) {
      const cached = waveformCache.get(cacheKey);
      setPeaks(cached.peaks);
      setDuration(cached.duration);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    async function extractRealWaveform() {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const audioCtx = getAudioContext();
        if (!audioCtx) {
          throw new Error("Web Audio API not supported");
        }

        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (isCancelled) return;

        const rawData = audioBuffer.getChannelData(0);
        const totalSamples = rawData.length;
        const blockSize = Math.floor(totalSamples / barCount);
        const computedPeaks = [];
        let maxVal = 0;

        for (let i = 0; i < barCount; i++) {
          const start = i * blockSize;
          const end = Math.min(start + blockSize, totalSamples);
          let sumSquares = 0;
          let peakVal = 0;

          for (let j = start; j < end; j++) {
            const val = Math.abs(rawData[j]);
            if (val > peakVal) peakVal = val;
            sumSquares += val * val;
          }

          const rms = Math.sqrt(sumSquares / (end - start || 1));
          const amplitude = rms * 0.65 + peakVal * 0.35;
          computedPeaks.push(amplitude);
          if (amplitude > maxVal) {
            maxVal = amplitude;
          }
        }

        const normalizedPeaks = computedPeaks.map((val) => {
          if (maxVal === 0) return 0.2;
          const norm = val / maxVal;
          return Math.max(0.15, Math.min(1.0, norm));
        });

        if (!isCancelled) {
          waveformCache.set(cacheKey, {
            peaks: normalizedPeaks,
            duration: audioBuffer.duration,
          });
          setPeaks(normalizedPeaks);
          setDuration(audioBuffer.duration);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Waveform decode failed:", err);
          setError(err.message);
          // Fallback smooth pseudo peaks if decode error
          const fallback = Array.from({ length: barCount }, (_, i) => {
            return 0.25 + 0.5 * Math.sin((i / barCount) * Math.PI);
          });
          setPeaks(fallback);
          setIsLoading(false);
        }
      }
    }

    extractRealWaveform();

    return () => {
      isCancelled = true;
    };
  }, [audioUrl, barCount]);

  return { peaks, duration, isLoading, error };
}
