import React from "react";
import { Play } from "lucide-react";
import HeroMicrophone from "./HeroMicrophone";

export default function HeroSection({ onStartExtracting }) {
  return (
    <section id="hero" className="relative pt-10 pb-12 sm:pt-16 sm:pb-20 overflow-hidden border-b border-[var(--border-subtle)]">
      {/* Background Ambient Lighting */}
      <div
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-20 bg-[var(--accent-purple)]"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[450px] h-[300px] rounded-full blur-[110px] pointer-events-none opacity-25 bg-[var(--accent-gold)]"
        aria-hidden="true"
      />

      {/* Decorative Wave Ribbons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-35">
        <svg
          viewBox="0 0 1440 450"
          className="w-full h-full object-cover animate-float-slow"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M -100 220 C 300 120, 600 350, 1000 180 C 1200 90, 1400 240, 1600 190"
            stroke="url(#heroRibbonGrad1)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          <path
            d="M -50 250 C 350 150, 650 380, 1050 210 C 1250 120, 1450 270, 1650 220"
            stroke="url(#heroRibbonGrad2)"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="heroRibbonGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="var(--accent-purple)" stopOpacity="0.8" />
              <stop offset="80%" stopColor="var(--accent-gold)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="heroRibbonGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0.2" />
              <stop offset="40%" stopColor="var(--accent-purple)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Heading, Subtitle & Action Button */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Tagline Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--accent-gold-dim)] border border-[var(--accent-gold)]/30 text-[var(--text-primary)] text-xs font-medium mb-4">
              <span>Target Speaker Extraction</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold tracking-tight text-[var(--text-primary)] leading-[1.18]">
              Isolate the Voice <br />
              <span className="font-normal">You Want to </span>
              <span className="font-editorial italic font-normal text-gold-gradient tracking-normal">
                Hear.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl font-sans">
              Upload a conversation and a voice reference to isolate the target speaker from the mixture.
            </p>

            {/* Action Button */}
            <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onStartExtracting}
                className="btn-gold w-full sm:w-auto px-7 py-3 rounded-full text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg min-h-[44px] active:scale-98 transition-transform"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Extracting</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Microphone */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <HeroMicrophone />
          </div>
        </div>
      </div>
    </section>
  );
}
