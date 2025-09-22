// components/SectionCard.tsx
"use client";

import { ReactNode } from "react";

export default function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        rounded-2xl border border-white/50 bg-white/60 
        shadow-lg backdrop-blur-md
        dark:border-white/10 dark:bg-slate-900/30
        transition hover:shadow-xl hover:scale-[1.01]
      "
    >
      {children}
    </div>
  );
}
