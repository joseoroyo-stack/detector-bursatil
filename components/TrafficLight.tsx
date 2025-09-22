// components/TrafficLight.tsx
"use client";

import React from "react";

export function TrafficLight({ level }: { level: "green" | "amber" | "red" }) {
  const cls =
    level === "green"
      ? "bg-emerald-500"
      : level === "red"
      ? "bg-rose-500"
      : "bg-amber-500";
  const label = level === "green" ? "Verde" : level === "red" ? "Roja" : "Naranja";
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${cls}`} />
      <span className="text-xs text-neutral-600">{label}</span>
    </div>
  );
}
