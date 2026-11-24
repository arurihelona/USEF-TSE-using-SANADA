import React from "react";
import { ArrowUp } from "lucide-react";
import Logo from "./Logo";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-surface-0)] pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] text-xs font-sans text-[var(--text-secondary)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Logo size="small" />
            <span className="text-[var(--border-strong)]">|</span>
            <span className="font-editorial italic text-xs text-[var(--text-secondary)]">
              Isolate the voice you want to hear
            </span>
          </div>

          {/* Back to top */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer min-h-[40px] active:scale-95"
            >
              <span>Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]/50 text-center sm:text-left text-[11px] text-[var(--text-muted)] font-mono">
          <span>USEF-TSE • Target Speaker Extraction</span>
        </div>
      </div>
    </footer>
  );
}