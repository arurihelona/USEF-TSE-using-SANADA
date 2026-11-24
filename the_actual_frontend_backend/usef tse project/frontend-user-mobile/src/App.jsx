import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles } from "lucide-react";
import MobileHeader from "./components/MobileHeader";
import MobileHeroBanner from "./components/MobileHeroBanner";
import MobileAudioCard from "./components/MobileAudioCard";
import MobileExtractionAction from "./components/MobileExtractionAction";
import MobileOutputSection from "./components/MobileOutputSection";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { ThemeProvider } from "./context/ThemeContext";

function MobileAppStudio() {
  const [mixedFile, setMixedFile] = useState(null);
  const [mixedAudioUrl, setMixedAudioUrl] = useState(null);
  const [mixedDuration, setMixedDuration] = useState(0);

  const [refFile, setRefFile] = useState(null);
  const [refAudioUrl, setRefAudioUrl] = useState(null);
  const [refDuration, setRefDuration] = useState(0);

  const [modelStatus, setModelStatus] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [error, setError] = useState(null);

  const topRef = useRef(null);

  // Check backend model status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data);
        return data.status === "ready";
      } else {
        setModelStatus({
          status: "error",
          detail: "Backend responded with error",
        });
        return false;
      }
    } catch (err) {
      setModelStatus({
        status: "connecting",
        detail: "Connecting to backend server on port 8000...",
      });
      return false;
    }
  }, []);

  // Poll until model status is ready, then slow down
  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    const runCheck = async () => {
      const ready = await checkStatus();
      if (isMounted) {
        // Poll every 1.5s while loading/connecting; every 10s once ready to detect dropouts
        const interval = ready ? 10000 : 1500;
        timerId = setTimeout(runCheck, interval);
      }
    };

    runCheck();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [checkStatus]);

  // Helper to extract duration and create URL from File
  const getAudioDuration = (file) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.onloadedmetadata = () => {
        resolve({ duration: audio.duration, url });
      };
      audio.onerror = () => {
        resolve({ duration: 0, url });
      };
    });
  };

  const handleSelectMixed = async (file) => {
    setError(null);
    if (!file) return;
    if (mixedAudioUrl) URL.revokeObjectURL(mixedAudioUrl);
    const { duration, url } = await getAudioDuration(file);
    setMixedFile(file);
    setMixedAudioUrl(url);
    setMixedDuration(duration);
  };

  const handleRemoveMixed = () => {
    if (mixedAudioUrl) URL.revokeObjectURL(mixedAudioUrl);
    setMixedFile(null);
    setMixedAudioUrl(null);
    setMixedDuration(0);
    setExtractionResult(null);
  };

  const handleSelectRef = async (file) => {
    setError(null);
    if (!file) return;
    if (refAudioUrl) URL.revokeObjectURL(refAudioUrl);
    const { duration, url } = await getAudioDuration(file);
    setRefFile(file);
    setRefAudioUrl(url);
    setRefDuration(duration);
  };

  const handleRemoveRef = () => {
    if (refAudioUrl) URL.revokeObjectURL(refAudioUrl);
    setRefFile(null);
    setRefAudioUrl(null);
    setRefDuration(0);
    setExtractionResult(null);
  };

  const handleLoadSample = async () => {
    try {
      setError(null);
      setIsExtracting(false);
      setExtractionResult(null);

      let mixUrl = "/api/samples/mixed_speaker.wav";
      let refUrl = "/api/samples/speaker_a_ref.wav";
      let mixFilename = "mixed_speaker.wav";
      let refFilename = "speaker_a_ref.wav";

      try {
        const samplesRes = await fetch("/api/samples");
        if (samplesRes.ok) {
          const samplesData = await samplesRes.json();
          if (samplesData.mixed?.url) mixUrl = samplesData.mixed.url;
          if (samplesData.mixed?.name) mixFilename = samplesData.mixed.name;
          if (samplesData.reference?.url) refUrl = samplesData.reference.url;
          else if (samplesData.speaker_a?.url) refUrl = samplesData.speaker_a.url;
          if (samplesData.reference?.name) refFilename = samplesData.reference.name;
          else if (samplesData.speaker_a?.name) refFilename = samplesData.reference.name;
        }
      } catch (metaErr) {
        console.warn("Falling back to default demo endpoints:", metaErr);
      }

      const [mixRes, refRes] = await Promise.all([
        fetch(mixUrl),
        fetch(refUrl),
      ]);

      if (!mixRes.ok) {
        throw new Error(`Failed to load mixture recording (${mixRes.status})`);
      }
      if (!refRes.ok) {
        throw new Error(`Failed to load reference recording (${refRes.status})`);
      }

      const mixBlob = await mixRes.blob();
      const refBlob = await refRes.blob();

      const sampleMixFile = new File([mixBlob], mixFilename, {
        type: "audio/wav",
      });
      const sampleRefFile = new File([refBlob], refFilename, {
        type: "audio/wav",
      });

      await handleSelectMixed(sampleMixFile);
      await handleSelectRef(sampleRefFile);

      window.scrollTo({ top: 120, behavior: "smooth" });
    } catch (err) {
      console.error("Error loading demo samples:", err);
      setError("Failed to fetch demo samples: " + err.message);
    }
  };

  const handleExtract = async () => {
    if (!mixedFile || !refFile) {
      setError("Please provide both a Mixture Audio recording and a Target Voice Reference sample.");
      return;
    }

    if (isExtracting) return;

    setError(null);
    setIsExtracting(true);
    setExtractionResult(null);

    const formData = new FormData();
    formData.append("mixed_audio", mixedFile);
    formData.append("reference_audio", refFile);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Speaker extraction failed on server.");
      }

      setExtractionResult(data);

      setTimeout(() => {
        const outEl = document.getElementById("output-result");
        if (outEl) outEl.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err) {
      console.error("Extraction error:", err);
      setError(err.message || "Failed to process target speaker extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReset = () => {
    setExtractionResult(null);
    setError(null);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isModelReady = modelStatus?.status === "ready";
  const canExtract = Boolean(
    mixedFile && refFile && isModelReady && !isExtracting
  );

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col max-w-md mx-auto shadow-2xl relative transition-colors duration-200">
      <div ref={topRef} />

      {/* 1. Mobile App Top Bar */}
      <MobileHeader />

      {/* 2. Main Mobile Vertical Body */}
      <main className="flex-1 px-4 pt-1 pb-10 flex flex-col space-y-4">
        {/* Introduction */}
        <MobileHeroBanner />

        {/* 3. Audio Upload Section Header & Single Demo Sample Entry Point */}
        <div className="flex items-center justify-between pt-1 pb-0 px-1">
          <div>
            <h2 className="text-sm font-sans font-bold text-[var(--text-primary)] tracking-tight">
              Your Audio Files
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] font-sans">
              Provide mixture and reference audio
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isExtracting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-gold)]/60 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-xs min-h-[34px]"
            title="Load demo audio recordings"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span className="text-[11px] font-sans font-semibold">Try Demo Sample</span>
          </button>
        </div>

        {/* 4. Card 1: Mixture Audio */}
        <MobileAudioCard
          id="mixture-audio-mobile"
          label="Mixture Audio"
          channelCode="CH-MIX"
          subtitle="Multi-speaker recording"
          hint="Audio containing overlapping voices in the same space."
          variant="mixture"
          file={mixedFile}
          audioUrl={mixedAudioUrl}
          duration={mixedDuration}
          onFileSelect={handleSelectMixed}
          onRemove={handleRemoveMixed}
          isExtracting={isExtracting}
        />

        {/* 5. Card 2: Target Voice Reference */}
        <MobileAudioCard
          id="reference-audio-mobile"
          label="Target Voice Reference"
          channelCode="REF"
          subtitle="Sample of voice to isolate"
          hint="Clean 1 to 5 second audio snippet of the target speaker."
          variant="reference"
          file={refFile}
          audioUrl={refAudioUrl}
          duration={refDuration}
          onFileSelect={handleSelectRef}
          onRemove={handleRemoveRef}
          isExtracting={isExtracting}
        />

        {/* 6. Main Extraction Action Button */}
        <MobileExtractionAction
          canExtract={canExtract}
          isExtracting={isExtracting}
          hasMixedFile={Boolean(mixedFile)}
          hasRefFile={Boolean(refFile)}
          modelStatus={modelStatus}
          onExtract={handleExtract}
          error={error}
          onClearError={() => setError(null)}
        />

        {/* 7 & 8 & 9. Extracted Audio Output & Before-and-After Comparison */}
        <MobileOutputSection
          result={extractionResult}
          mixedAudioUrl={mixedAudioUrl}
          mixedFile={mixedFile}
          onReset={handleReset}
        />
      </main>

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MobileAppStudio />
    </ThemeProvider>
  );
}