import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export default function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('usef_pwa_banner_dismissed') === 'true';
  });
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('usef_pwa_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      await promptInstall();
    }
  };

  // Do not show if already installed in standalone mode, or dismissed, or neither installable nor iOS
  if (isStandalone || isInstalled || dismissed) {
    return null;
  }

  // Only show on iOS if not in standalone mode, or when beforeinstallprompt fired (Android/desktop)
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Mobile-Friendly Fixed Floating Install Banner */}
      <aside
        aria-label="App installation banner"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-fadeInSlideUp"
      >
        <div className="relative p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-1)] border-2 border-[var(--accent-gold)]/60 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {/* Top subtle highlight */}
          <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[var(--accent-gold)] to-transparent opacity-80" />

          <div className="flex items-start justify-between gap-3">
            {/* App Icon */}
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--accent-gold)]/40 p-1 flex items-center justify-center shrink-0 shadow-sm">
              <img src="/icons/icon-192.png" alt="USEF-TSE Icon" className="w-full h-full object-contain rounded-lg" />
            </div>

            {/* Info Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-sm text-[var(--text-primary)] tracking-tight">
                  Install USEF-TSE App
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30">
                  <Sparkles className="w-2.5 h-2.5" /> Fast PWA
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans leading-relaxed">
                Install as a standalone mobile app for instant speech separation with full offline caching.
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
              aria-label="Dismiss installation banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="mt-3.5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3.5 py-2 rounded-xl text-xs font-sans font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer min-h-[40px] flex items-center justify-center"
            >
              Maybe later
            </button>

            <button
              type="button"
              onClick={handleInstallClick}
              className="btn-gold px-4 py-2 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 cursor-pointer shadow-md min-h-[40px] active:scale-95 transition-transform"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'How to Install' : 'Install Now'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Step-by-Step Instructions Modal */}
      {showIOSInstructions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[var(--accent-gold)]" />
                <h3 id="ios-install-title" className="font-sans font-bold text-base text-[var(--text-primary)]">
                  Install on iOS Safari
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close iOS install instructions"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="space-y-4 text-xs font-sans text-[var(--text-secondary)]">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-surface-2)] text-[var(--accent-gold)] font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Open in Safari</p>
                  <p className="mt-0.5">Ensure you are viewing this page in Safari on your iPhone or iPad.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-surface-2)] text-[var(--accent-gold)] font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    Tap the Share Button <Share2 className="w-4 h-4 text-blue-400 inline" />
                  </p>
                  <p className="mt-0.5">Located in Safari&apos;s bottom toolbar (or top right on iPad).</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-surface-2)] text-[var(--accent-gold)] font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    Select &ldquo;Add to Home Screen&rdquo; <PlusSquare className="w-4 h-4 text-[var(--accent-gold)] inline" />
                  </p>
                  <p className="mt-0.5">Scroll down in the share sheet and tap &ldquo;Add to Home Screen&rdquo;.</p>
                </div>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="btn-gold w-full mt-6 py-2.5 rounded-xl font-sans text-xs font-bold text-center cursor-pointer min-h-[44px] flex items-center justify-center"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
