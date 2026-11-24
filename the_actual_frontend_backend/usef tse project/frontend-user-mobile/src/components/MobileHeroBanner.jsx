import React from "react";

export default function MobileHeroBanner() {
  return (
    <div className="pt-4 pb-1 px-1">
      {/* Editorial Headline */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-purple-dim)] text-[var(--accent-purple)] border border-[var(--accent-purple)]/30">
          Neural Audio Studio
        </span>
      </div>

      <h1 className="text-2xl font-sans font-bold tracking-tight text-[var(--text-primary)] leading-tight">
        Isolate Any Voice <br />
        <span className="font-editorial italic font-normal text-gold-gradient text-2xl">
          From Mixed Audio
        </span>
      </h1>

      <p className="mt-1.5 text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
        Upload a conversation and a short voice reference to extract clean speech using deep cross-attention.
      </p>
    </div>
  );
}
