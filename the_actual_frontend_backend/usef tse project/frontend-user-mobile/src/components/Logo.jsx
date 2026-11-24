import React from "react";

export default function Logo({ size = "default", className = "" }) {
  const isSmall = size === "small";
  const isLarge = size === "large";

  const iconDims = isSmall ? "w-6 h-6" : isLarge ? "w-10 h-10" : "w-8 h-8";

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Brand Icon */}
      <div
        className={`relative ${iconDims} rounded-xl flex items-center justify-center overflow-hidden bg-[var(--bg-surface-2)] border border-[var(--accent-gold)]/40 p-1 shadow-sm transition-all duration-200`}
      >
        <img
          src="/logo.png"
          alt="USEF-TSE"
          className="w-full h-full object-contain"
          style={{ filter: "var(--logo-filter, none)" }}
        />
      </div>

      {/* Brand Typography */}
      <div className="flex items-center gap-1.5">
        <span
          className={`font-mono font-bold tracking-tight text-[var(--text-primary)] ${
            isLarge ? "text-xl" : "text-sm"
          }`}
        >
          USEF-TSE
        </span>
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--accent-gold-dim)] text-[var(--accent-gold)] border border-[var(--accent-gold)]/30">
          MOBILE
        </span>
      </div>
    </div>
  );
}
