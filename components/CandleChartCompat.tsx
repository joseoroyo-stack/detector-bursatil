// components/CandleChartCompat.tsx
"use client";

import React from "react";
import AdvancedCandleChart from "@/components/CandleChart";

type Bar = { time:number; open:number; high:number; low:number; close:number; volume:number };

type LegacyProps = {
  data: Bar[];
  className?: string;
  height?: number;
  sma20?: boolean;
  sma50?: boolean;
  sma200?: boolean;
  sr?: null | { lookback?: number; strength?: number; maxLevels?: number };
  riskPlan?: null | { entry: number; stop: number | null };
};

export default function CandleChartCompat({
  data,
  className,
  height,
  sma20,
  sma50,
  sma200,
  sr,
  riskPlan,
}: LegacyProps) {
  const sma = { p20: sma20 ?? true, p50: sma50 ?? true, p200: sma200 ?? true };

  const entryPrice = riskPlan?.entry;
  const stopAbs = typeof riskPlan?.stop === "number" && Number.isFinite(riskPlan.stop) ? (riskPlan!.stop as number) : null;

  return (
    <AdvancedCandleChart
      data={data}
      className={className}
      height={height}
      sma={sma}
      supports={sr ?? undefined}
      entryPrice={entryPrice}
      stopAbs={stopAbs}
      rMultiples={[1, 2, 3]}
    />
  );
}
