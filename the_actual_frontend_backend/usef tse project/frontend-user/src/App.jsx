import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles } from "lucide-react";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import AudioUploadCard from "./components/AudioUploadCard";
import ExtractionAction from "./components/ExtractionAction";
import OutputSection from "./components/OutputSection";
import Footer from "./components/Footer";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { ThemeProvider } from "./context/ThemeContext";
import { apiUrl } from "./config/api";

function MainApp() {
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

  const workspaceRef = useRef(null);

  // Check backend model status on mount
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/status"));
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data);
      } else {
        setModelStatus({
          status: "error",
          detail: "Backend responded with error status",
        });
      }
    } catch (err) {
      console.warn("Backend status check failed:", err);
      setModelStatus({
        status: "error",
        detail: "Cannot connect to backend server. Please verify the API URL or backend status.",
      });
    }
  }, []);

  useEffect(() => {
    checkStatus();
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

  // Extract another: completely resets the workspace to accept new files without reloading
  const handleReset = () => {
    if (mixedAudioUrl) URL.revokeObjectURL(mixedAudioUrl);
    if (refAudioUrl) URL.revokeObjectURL(refAudioUrl);
    setMixedFile(null);
    setMixedAudioUrl(null);
    setMixedDuration(0);
    setRefFile(null);
    setRefAudioUrl(null);
    setRefDuration(0);
    setExtractionResult(null);
    setError(null);

    // Smooth scroll back to workspace upload cards
    const el = document.getElementById("workspace");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Load demo sample recordings from backend
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
        const samplesRes = await fetch(apiUrl("/api/samples"));
        if (samplesRes.ok) {
          const samplesData = await samplesRes.json();
          if (samplesData.mixed?.url) mixUrl = samplesData.mixed.url;
          if (samplesData.mixed?.name) mixFilename = samplesData.mixed.name;
          if (samplesData.reference?.url) refUrl = samplesData.reference.url;
          else if (samplesData.speaker_a?.url) refUrl = samplesData.speaker_a.url;
          if (samplesData.reference?.name) refFilename = samplesData.reference.name;
          else if (samplesData.speaker_a?.name) refFilename = samplesData.speaker_a.name;
        }
      } catch (metaErr) {
        console.warn("Falling back to direct demo endpoints:", metaErr);
      }

      const [mixRes, refRes] = await Promise.all([
        fetch(apiUrl(mixUrl)),
        fetch(apiUrl(refUrl)),
      ]);

      if (!mixRes.ok) {
        throw new Error(`Failed to load mixture recording from ${mixUrl} (${mixRes.status})`);
      }
      if (!refRes.ok) {
        throw new Error(`Failed to load reference recording from ${refUrl} (${refRes.status})`);
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
    } catch (err) {
      console.error("Error loading demo samples:", err);
      setError("Failed to fetch demo samples: " + err.message);
    }
  };

  const handleExtract = async () => {
    if (!mixedFile || !refFile) {
      setError("Please provide both a conversation recording and a voice reference.");
      return;
    }

    setError(null);
    setIsExtracting(true);
    setExtractionResult(null);

    const formData = new FormData();
    formData.append("mixed_audio", mixedFile);
    formData.append("reference_audio", refFile);

    try {
      const response = await fetch(apiUrl("/api/extract"), {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Speaker extraction failed on server.");
      }

      setExtractionResult({
        ...data,
        output_url: apiUrl(data.output_url),
        download_url: apiUrl(data.download_url),
      });

      // Smooth scroll to output
      setTimeout(() => {
        const outEl = document.getElementById("output-result");
        if (outEl) outEl.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Extraction error:", err);
      setError(err.message || "Failed to process target speaker extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  const scrollToWorkspace = () => {
    const el = document.getElementById("workspace");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const canExtract = Boolean(
    mixedFile && refFile && (!modelStatus || modelStatus.status === "ready")
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-200">
      {/* 1. Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* 2. Hero Section */}
        <HeroSection onStartExtracting={scrollToWorkspace} />

        {/* 3. Extraction Section */}
        <section
          id="workspace"
          ref={workspaceRef}
          className="py-12 sm:py-16 relative"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Section Header with Load Demo Sample action */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-[var(--text-primary)]">
                  Speaker Extraction
                </h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)] font-sans">
                  Upload your audio files below to extract the target speaker.
                </p>
              </div>

              {/* Load Demo Sample Button */}
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isExtracting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-gold)]/50 transition-all cursor-pointer disabled:opacity-50 shadow-sm w-fit self-start sm:self-auto"
                title="Fill in with demo sample recordings"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Load Demo Sample</span>
              </button>
            </div>

            {/* Two Side-by-Side Audio Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Upload Conversation (Mixed Audio) */}
              <AudioUploadCard
                id="mixture-audio-input"
                label="Upload Conversation"
                channelCode="MIX"
                description="Upload an audio file containing multiple speakers."
                variant="mixture"
                file={mixedFile}
                audioUrl={mixedAudioUrl}
                duration={mixedDuration}
                onFileSelect={handleSelectMixed}
                onRemove={handleRemoveMixed}
                isExtracting={isExtracting}
              />

              {/* Card 2: Upload Voice Reference (Target Reference) */}
              <AudioUploadCard
                id="reference-audio-input"
                label="Upload Voice Reference"
                channelCode="REF"
                description="Upload an audio recording of the speaker whose voice you want to extract."
                variant="reference"
                file={refFile}
                audioUrl={refAudioUrl}
                duration={refDuration}
                onFileSelect={handleSelectRef}
                onRemove={handleRemoveRef}
                isExtracting={isExtracting}
              />
            </div>

            {/* 4. Extraction Button */}
            <ExtractionAction
              canExtract={canExtract}
              isExtracting={isExtracting}
              onExtract={handleExtract}
              error={error}
              onClearError={() => setError(null)}
            />

            {/* 5. Extraction Result Output Section */}
            <div id="output-result" className="mt-8">
              <OutputSection
                result={extractionResult}
                mixedAudioUrl={mixedAudioUrl}
                mixedFile={mixedFile}
                onReset={handleReset}
              />
            </div>
          </div>
        </section>
      </main>

      {/* 6. Simple Footer */}
      <Footer />

      {/* 7. PWA Installation Banner & Mobile Support */}
      <PWAInstallBanner />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
