import React from "react";
import { Sun, Moon, Download } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "../context/ThemeContext";
import { usePWA } from "../hooks/usePWA";

export default function MobileHeader() {
  const { toggleTheme, isDark } = useTheme();
  const { isInstallable, isIOS, isStandalone, promptInstall } = usePWA();

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("To install on iOS: Tap the Share button in Safari, then select 'Add to Home Screen'.");
    } else if (isInstallable) {
      await promptInstall();
    } else {
      alert("To install this app on your phone:\n1. Open your browser menu (⋮ or Share)\n2. Tap 'Add to Home screen' or 'Install App'");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-page)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-4 py-3 transition-colors duration-200">
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Brand identity with official USEF-TSE logo */}
        <Logo />

        {/* Right Action Controls: Download Mobile App & Theme Switcher */}
        <div className="flex items-center gap-1.5">
          {/* Download Mobile App Button (PWA Installation) */}
          {!isStandalone && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-9 h-9 rounded-xl bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-black border border-[var(--accent-gold)]/40 flex items-center justify-center cursor-pointer active:scale-95 transition-all min-h-[36px] min-w-[36px]"
              title="Download Mobile App (Install PWA)"
              aria-label="Download Mobile App"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Light / Dark Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform min-h-[36px] min-w-[36px]"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Light Mode" : "Dark Mode"}
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
