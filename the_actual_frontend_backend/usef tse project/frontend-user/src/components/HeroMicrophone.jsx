import React from "react";

/**
 * HeroMicrophone Component
 *
 * Renders the realistic metallic condenser microphone asset with dynamic studio lighting.
 */
export default function HeroMicrophone({ className = "" }) {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      aria-label="Studio condenser microphone visual"
    >
      {/* Dynamic Ambient Lighting Halo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[400px] sm:w-[380px] sm:h-[480px] rounded-full pointer-events-none opacity-80 blur-[70px] transition-all duration-500"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--mic-glow-1) 0%, var(--mic-glow-2) 45%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle floor contact shadow for realistic grounding */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-44 h-7 rounded-full blur-md opacity-40 dark:opacity-70 pointer-events-none transition-opacity"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Realistic Metallic Microphone Asset */}
      <div className="relative z-10 w-full max-w-[240px] sm:max-w-[300px] md:max-w-[340px] lg:max-w-[380px] animate-mic-float flex items-center justify-center">
        <img
          src="/microphone.png"
          alt="Professional Studio Condenser Microphone"
          className="w-full h-auto object-contain filter drop-shadow-[0_15px_35px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_20px_45px_rgba(0,0,0,0.65)] transition-all duration-300"
          loading="eager"
        />
      </div>
    </div>
  );
}
