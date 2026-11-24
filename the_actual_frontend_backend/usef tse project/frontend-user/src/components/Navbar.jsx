import React from "react";
import { Sun, Moon, ArrowDownCircle, Download } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "../context/ThemeContext";
import { usePWA } from "../hooks/usePWA";

export default function Navbar() {
  const { toggleTheme, isDark } = useTheme();
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall } = usePWA();

  const scrollToWorkspace = () => {
    const el = document.getElementById("workspace");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("To install on iOS: Tap the Share button in Safari, then select 'Add to Home Screen'.");
    } else {
      await promptInstall();
    }
  };

  const showInstallBtn = (isInstallable || isIOS) && !isStandalone && !isInstalled;

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--bg-page)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-lg group"
        >
          <Logo />
        </a>

        {/* Right side controls: PWA install, Extract button, theme toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {showInstallBtn && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/40 hover:bg-[var(--accent-gold)] hover:text-[#090a10] transition-all cursor-pointer shadow-sm min-h-[38px]"
              title="Install USEF-TSE as a mobile app"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Install App</span>
            </button>
          )}

          {/* Quick link to Extraction Section */}
          <button
            type="button"
            onClick={scrollToWorkspace}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-sans font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-gold)]/50 transition-all cursor-pointer shadow-sm min-h-[38px]"
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span className="hidden sm:inline">Extract a Speaker</span>
            <span className="sm:hidden">Extract</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer shadow-sm flex items-center justify-center min-h-[40px] min-w-[40px]"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-purple-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
