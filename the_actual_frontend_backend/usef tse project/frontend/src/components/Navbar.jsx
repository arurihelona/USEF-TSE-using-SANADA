import React, { useState, useEffect } from "react";
import { Sun, Moon, Sparkles, Menu, X, ArrowUpRight, Download } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "../context/ThemeContext";
import { usePWA } from "../hooks/usePWA";

export default function Navbar({
  onLoadSample,
  isExtracting,
}) {
  const { toggleTheme, isDark } = useTheme();
  const { isInstallable, isInstalled, isIOS, isStandalone, promptInstall } = usePWA();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("hero");

  const scrollTo = (id) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Close mobile drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert("To install on iOS: Tap the Share button in Safari, then select 'Add to Home Screen'.");
    } else {
      await promptInstall();
    }
  };

  const showInstallBtn = (isInstallable || isIOS) && !isStandalone && !isInstalled;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[var(--bg-page)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollTo("hero");
            }}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-lg group"
          >
            <Logo />
          </a>

          {/* Desktop Nav Links */}
          <nav aria-label="Desktop navigation" className="hidden md:flex items-center gap-8 text-xs font-sans font-medium text-[var(--text-secondary)]">
            <button
              onClick={() => scrollTo("hero")}
              className={`relative py-1 transition-colors cursor-pointer ${
                activeNav === "hero"
                  ? "text-[var(--text-primary)] font-semibold"
                  : "hover:text-[var(--text-primary)]"
              }`}
            >
              <span>Home</span>
              {activeNav === "hero" && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-[var(--accent-gold)] rounded-full" />
              )}
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className={`relative py-1 transition-colors cursor-pointer ${
                activeNav === "how-it-works"
                  ? "text-[var(--text-primary)] font-semibold"
                  : "hover:text-[var(--text-primary)]"
              }`}
            >
              <span>How It Works</span>
              {activeNav === "how-it-works" && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-[var(--accent-gold)] rounded-full" />
              )}
            </button>
            <button
              onClick={() => scrollTo("workspace")}
              className={`relative py-1 transition-colors cursor-pointer ${
                activeNav === "workspace"
                  ? "text-[var(--text-primary)] font-semibold"
                  : "hover:text-[var(--text-primary)]"
              }`}
            >
              <span>Extract Audio</span>
              {activeNav === "workspace" && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-[var(--accent-gold)] rounded-full" />
              )}
            </button>
            <button
              onClick={() => scrollTo("process")}
              className={`relative py-1 transition-colors cursor-pointer ${
                activeNav === "process"
                  ? "text-[var(--text-primary)] font-semibold"
                  : "hover:text-[var(--text-primary)]"
              }`}
            >
              <span>Inside the Process</span>
              {activeNav === "process" && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-[var(--accent-gold)] rounded-full" />
              )}
            </button>
            <button
              onClick={() => scrollTo("research")}
              className={`relative py-1 transition-colors cursor-pointer ${
                activeNav === "research"
                  ? "text-[var(--text-primary)] font-semibold"
                  : "hover:text-[var(--text-primary)]"
              }`}
            >
              <span>About</span>
              {activeNav === "research" && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-[var(--accent-gold)] rounded-full" />
              )}
            </button>
          </nav>

          {/* Action Controls & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PWA Install Button (Desktop & Tablet) */}
            {showInstallBtn && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/40 hover:bg-[var(--accent-gold)] hover:text-[#090a10] transition-all duration-150 cursor-pointer shadow-sm"
                title="Install USEF-TSE as a desktop or mobile application"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}

            {/* Quick Demo Sample Action */}
            <button
              type="button"
              onClick={onLoadSample}
              disabled={isExtracting}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-gold)]/40 transition-all duration-150 disabled:opacity-50 cursor-pointer shadow-sm min-h-[38px]"
              title="Load demo audio recordings"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span>Load Demo</span>
            </button>

            {/* Theme Toggle Pill */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-10 h-10 rounded-full bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] flex items-center justify-center shadow-sm"
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-purple-700 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => scrollTo("workspace")}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-sans font-bold btn-gold shadow-md cursor-pointer min-h-[38px]"
            >
              <span>Start Extracting</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile menu toggle with 44px min touch target */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="w-11 h-11 rounded-xl md:hidden bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)] px-5 py-5 space-y-4 shadow-2xl animate-fadeInSlideDown relative z-50">
            <div className="flex flex-col space-y-1 text-sm font-sans font-medium text-[var(--text-secondary)]">
              <button
                onClick={() => scrollTo("hero")}
                className="text-left py-3 px-2 rounded-lg hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] flex items-center"
              >
                Home
              </button>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="text-left py-3 px-2 rounded-lg hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] flex items-center"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollTo("workspace")}
                className="text-left py-3 px-2 rounded-lg text-[var(--accent-gold)] font-bold hover:bg-[var(--bg-surface-2)] transition-colors min-h-[44px] flex items-center"
              >
                Extract Audio
              </button>
              <button
                onClick={() => scrollTo("process")}
                className="text-left py-3 px-2 rounded-lg hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] flex items-center"
              >
                Inside the Extraction Process
              </button>
              <button
                onClick={() => scrollTo("research")}
                className="text-left py-3 px-2 rounded-lg hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] flex items-center"
              >
                About
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2.5 border-t border-[var(--border-subtle)]">
              {showInstallBtn && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleInstallClick();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-mono font-bold bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/50 cursor-pointer min-h-[44px] active:scale-98 transition-transform"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Mobile App (PWA)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLoadSample();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-mono font-semibold bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer min-h-[44px] active:scale-98 transition-transform"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Load Demo Audio</span>
              </button>

              <button
                type="button"
                onClick={() => scrollTo("workspace")}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-sans font-bold btn-gold shadow-md cursor-pointer min-h-[44px] active:scale-98 transition-transform"
              >
                <span>Start Extracting</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}
    </>
  );
}
