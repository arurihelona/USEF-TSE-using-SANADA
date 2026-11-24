import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export default function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('usef_pwa_mobile_dismissed') === 'true';
  });
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('usef_pwa_mobile_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      await promptInstall();
    }
  };

  if (isStandalone || isInstalled || dismissed) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Mobile-Friendly Floating Install Banner */}
      <aside
        aria-label="Mobile app installation banner"
        className="fixed bottom-4 left-3 right-3 max-w-md mx-auto z-30 animate-fadeInSlideUp"
      >
        <div className="relative p-3.5 rounded-2xl bg-[var(--bg-surface-1)] border-2 border-[var(--accent-gold)]/60 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--accent-gold)]/40 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/logo.png"
                alt="USEF-TSE"
                className="w-full h-full object-contain"
                style={{ filter: "var(--logo-filter, none)" }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-xs text-[var(--text-primary)] truncate">
                  Install USEF-TSE App
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold bg-[var(--accent-gold-dim)] text-[var(--accent-gold)]">
                  <Sparkles className="w-2.5 h-2.5" /> PWA
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                Add to your home screen for quick offline access and full-screen studio mode.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-sans text-[var(--text-secondary)] min-h-[36px]"
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="btn-gold px-3.5 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1 min-h-[36px] active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'Instructions' : 'Install'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Safari Instructions Sheet */}
      {showIOSInstructions && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowIOSInstructions(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] p-5 shadow-2xl relative animate-fadeInSlideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[var(--accent-gold)]" />
                <h3 className="font-sans font-bold text-sm text-[var(--text-primary)]">
                  Add to iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3 text-xs font-sans text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[var(--bg-surface-2)] text-[var(--accent-gold)] font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Open Safari</p>
                  <p className="text-[11px] mt-0.5">Make sure you are browsing in Safari on your iPhone.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[var(--bg-surface-2)] text-[var(--accent-gold)] font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                    Tap Share <Share2 className="w-3.5 h-3.5 text-blue-400 inline" />
                  </p>
                  <p className="text-[11px] mt-0.5">Tap the bottom share icon in Safari&apos;s toolbar.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[var(--bg-surface-2)] text-[var(--accent-gold)] font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                    Tap &ldquo;Add to Home Screen&rdquo; <PlusSquare className="w-3.5 h-3.5 text-[var(--accent-gold)] inline" />
                  </p>
                  <p className="text-[11px] mt-0.5">Scroll down in the action sheet and select &ldquo;Add to Home Screen&rdquo;.</p>
                </div>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="btn-gold w-full mt-4 py-2.5 rounded-xl font-sans text-xs font-bold text-center cursor-pointer min-h-[42px]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
