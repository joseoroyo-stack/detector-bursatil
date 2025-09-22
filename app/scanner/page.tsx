// components/ScannerEmbedded.tsx
"use client";

import React from "react";
import Link from "next/link";
import { TrafficLight } from "@/components/TrafficLight";

type Tf = "1d" | "1w" | "1mo";
type Range = "1M" | "3M" | "6M" | "1A" | "MAX";
type Market = "us50" | "sp500" | "eu";
type Level = "alta" | "media" | "baja";
type Tab = "top" | "ath";

type TopPick = { symbol: string; total: number; score: number; newsAdj?: number; rationale: string; };
type AthPick = { symbol: string; lastClose: number; maxClose: number; ddPct: number; lastSwingLow: number | null; rationale: string; };

/* Hook localStorage simple */
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial);
  React.useEffect(() => { try { const raw = localStorage.getItem(key); if (raw != null) setValue(JSON.parse(raw)); } catch {} }, []);
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue] as const;
}

export default function ScannerEmbedded() {
  // Filtros compartidos
  const [market, setMarket] = useLocalStorage<Market>("scanner:market", "sp500");
  const [tf, setTf] = useLocalStorage<Tf>("scanner:tf", "1d");
  const [range, setRange] = useLocalStorage<Range>("scanner:range", "3M");
  const [tab, setTab] = useLocalStorage<Tab>("scanner:tab", "top");

  // Top Picks
  const [level, setLevel] = useLocalStorage<Level>("scanner:level", "alta");
  const [topLoading, setTopLoading] = React.useState(false);
  const [topError, setTopError] = React.useState<string | null>(null);
  const [picks, setPicks] = React.useState<TopPick[]>([]);
  const [topUpdated, setTopUpdated] = React.useState<string | null>(null);

  // Near ATH
  const [strict, setStrict] = useLocalStorage<boolean>("scanner:strict", true);
  const [tolPct, setTolPct] = useLocalStorage<number>("scanner:tolPct", 0.5);
  const [recentDays, setRecentDays] = useLocalStorage<number>("scanner:recentDays", 30);
  const [lookback, setLookback] = useLocalStorage<number>("scanner:lookback", 60);
  const [athLoading, setAthLoading] = React.useState(false);
  const [athError, setAthError] = React.useState<string | null>(null);
  const [athPicks, setAthPicks] = React.useState<AthPick[]>([]);
  const [athUpdated, setAthUpdated] = React.useState<string | null>(null);

  const linkToChart = (sym: string) => `/?ticker=${encodeURIComponent(sym)}&fromTop=1&tf=${tf}&range=${range}`;

  function levelFromTotal(total: number, lvl: Level): "green" | "amber" | "red" {
    const thr1 = lvl === "alta" ? 0.6 : lvl === "media" ? 0.4 : 0.2;
    const thr2 = lvl === "alta" ? 0.4 : lvl === "media" ? 0.3 : 0.1;
    if (total >= thr1) return "green";
    if (total >= thr2) return "amber";
    return "red";
  }

  async function loadTop() {
    try {
      setTopLoading(true); setTopError(null);
      const url = `/api/top-picks?market=${market}&tf=${tf}&range=${range}&level=${level}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error");
      setPicks(j.picks || []); setTopUpdated(j.updatedAt || null);
    } catch (e:any) { setTopError(e?.message || "Error"); setPicks([]); setTopUpdated(null); }
    finally { setTopLoading(false); }
  }
  async function loadAth() {
    try {
      setAthLoading(true); setAthError(null);
      const url = `/api/ath-picks?market=${market}&tf=${tf}&range=${range}&strict=${strict}&tolPct=${tolPct}&recentDays=${recentDays}&lookback=${lookback}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error");
      setAthPicks(j.picks || []); setAthUpdated(j.updatedAt || null);
    } catch (e:any) { setAthError(e?.message || "Error"); setAthPicks([]); setAthUpdated(null); }
    finally { setAthLoading(false); }
  }

  React.useEffect(() => { tab === "top" ? loadTop() : loadAth(); }, [tab]);
  React.useEffect(() => { if (tab === "top") loadTop(); if (tab === "ath") loadAth(); },
    [market, tf, range, level, strict, tolPct, recentDays, lookback, tab]);

  /* Ordenación Top */
  type SortKeyTop = "symbol" | "total" | "score";
  type SortDir = "asc" | "desc";
  const [sortKeyTop, setSortKeyTop] = useLocalStorage<SortKeyTop>("scanner:top:sortKey", "total");
  const [sortDirTop, setSortDirTop] = useLocalStorage<SortDir>("scanner:top:sortDir", "desc");
  function toggleSortTop(k: SortKeyTop){ if (sortKeyTop===k) setSortDirTop(sortDirTop==="asc"?"desc":"asc"); else { setSortKeyTop(k); setSortDirTop(k==="symbol"?"asc":"desc"); } }
  const picksSorted = React.useMemo(()=> {
    const arr=[...picks]; const dir=sortDirTop==="asc"?1:-1;
    arr.sort((a,b)=>{ const va = sortKeyTop==="symbol"?a.symbol:sortKeyTop==="total"?a.total:a.score;
                      const vb = sortKeyTop==="symbol"?b.symbol:sortKeyTop==="total"?b.total:b.score;
                      return va<vb?-1*dir:va>vb?1*dir:0; });
    return arr;
  },[picks,sortKeyTop,sortDirTop]);

  /* Ordenación ATH */
  type SortKeyAth = "symbol" | "lastClose" | "maxClose" | "ddPct" | "lastSwingLow";
  const [sortKeyAth, setSortKeyAth] = useLocalStorage<SortKeyAth>("scanner:ath:sortKey", "ddPct");
  const [sortDirAth, setSortDirAth] = useLocalStorage<SortDir>("scanner:ath:sortDir", "asc");
  function toggleSortAth(k: SortKeyAth){ if (sortKeyAth===k) setSortDirAth(sortDirAth==="asc"?"desc":"asc"); else { setSortKeyAth(k); setSortDirAth(k==="symbol"?"asc":"asc"); } }
  const athSorted = React.useMemo(()=> {
    const arr=[...athPicks]; const dir=sortDirAth==="asc"?1:-1;
    arr.sort((a,b)=>{ const va = sortKeyAth==="symbol"?a.symbol:sortKeyAth==="lastClose"?a.lastClose:sortKeyAth==="maxClose"?a.maxClose:sortKeyAth==="ddPct"?a.ddPct:(a.lastSwingLow ?? -Infinity);
                      const vb = sortKeyAth==="symbol"?b.symbol:sortKeyAth==="lastClose"?b.lastClose:sortKeyAth==="maxClose"?b.maxClose:sortKeyAth==="ddPct"?b.ddPct:(b.lastSwingLow ?? -Infinity);
                      return va<vb?-1*dir:va>vb?1*dir:0; });
    return arr;
  },[athPicks,sortKeyAth,sortDirAth]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Scanner (Top Picks & Near ATH)</h2>
        <p className="text-sm text-neutral-600">
          Todo en la home: filtros con memoria, ordenación y acceso directo al gráfico.
          {tab==="top" && topUpdated && <span className="ml-2 text-xs text-neutral-500">Actualizado: {new Date(topUpdated).toLocaleString()}</span>}
          {tab==="ath" && athUpdated && <span className="ml-2 text-xs text-neutral-500">Actualizado: {new Date(athUpdated).toLocaleString()}</span>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`px-3 py-2 rounded border text-sm ${tab==="top"?"bg-white shadow":"bg-transparent"}`} onClick={()=>setTab("top")}>Top Picks</button>
        <button className={`px-3 py-2 rounded border text-sm ${tab==="ath"?"bg-white shadow":"bg-transparent"}`} onClick={()=>setTab("ath")}>Near ATH</button>
      </div>

      {/* Filtros */}
      <section className="grid gap-3 md:grid-cols-5">
        <div className="space-y-1">
          <label className="text-sm font-medium">Mercado</label>
          <select className="border rounded px-2 py-1 w-full" value={market} onChange={(e)=>setMarket(e.target.value as Market)}>
            <option value="us50">USA (Top 50)</option><option value="sp500">S&P 500</option><option value="eu">Europa (IBEX + DAX)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Timeframe</label>
          <select className="border rounded px-2 py-1 w-full" value={tf} onChange={(e)=>setTf(e.target.value as Tf)}>
            <option value="1d">1D</option><option value="1w">1W</option><option value="1mo">1M</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Rango</label>
          <select className="border rounded px-2 py-1 w-full" value={range} onChange={(e)=>setRange(e.target.value as Range)}>
            <option value="1M">1M</option><option value="3M">3M</option><option value="6M">6M</option><option value="1A">1A</option><option value="MAX">MAX</option>
          </select>
        </div>

        {tab==="top" && (
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Exigencia</label>
            <select className="border rounded px-2 py-1 w-full" value={level} onChange={(e)=>setLevel(e.target.value as Level)}>
              <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
            </select>
          </div>
        )}

        {tab==="ath" && (
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Filtros ATH</label>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={strict} onChange={(e)=>setStrict(e.target.checked)} /> Solo ATH</label>
              {!strict && (
                <div className="flex items-center gap-2 text-sm">
                  <span>tol %</span>
                  <input type="number" min={0.1} step={0.1} className="border rounded px-2 py-1 w-20" value={tolPct} onChange={(e)=>setTolPct(parseFloat(e.target.value||"0.5"))}/>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span>reciente (d)</span>
                <input type="number" min={0} step={5} className="border rounded px-2 py-1 w-24" value={recentDays} onChange={(e)=>setRecentDays(parseInt(e.target.value||"30",10))}/>
              </div>
              <div className="flex items-center gap-2 text-sm col-span-3">
                <span>lookback soporte</span>
                <input type="number" min={10} step={5} className="border rounded px-2 py-1 w-28" value={lookback} onChange={(e)=>setLookback(parseInt(e.target.value||"60",10))}/>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* TOP PICKS */}
      {tab==="top" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border text-sm" onClick={loadTop} disabled={topLoading}>
              {topLoading ? "Actualizando…" : "Actualizar Top Picks"}
            </button>
            {topError && <span className="text-sm text-rose-600">Error: {topError}</span>}
          </div>

          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="text-left px-3 py-2">Ticker</th>
                  <th className="text-left px-3 py-2">Semáforo</th>
                  <th className="text-right px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSortTop("total")}>
                    Total {sortKeyTop==="total" ? (sortDirTop==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-right px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSortTop("score")}>
                    TechScore {sortKeyTop==="score" ? (sortDirTop==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-left px-3 py-2">Rationale</th>
                  <th className="text-right px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {picksSorted.length===0 && !topLoading && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-neutral-500">No hay candidatos con los filtros actuales.</td></tr>
                )}
                {picksSorted.map((p,idx)=>{
                  const tl=levelFromTotal(p.total,level);
                  return (
                    <tr key={`${p.symbol}-${idx}`} className="border-t">
                      <td className="px-3 py-2 font-semibold">{p.symbol}</td>
                      <td className="px-3 py-2"><TrafficLight level={tl} /></td>
                      <td className="px-3 py-2 text-right">{p.total.toFixed(3)}</td>
                      <td className="px-3 py-2 text-right">{p.score.toFixed(3)}</td>
                      <td className="px-3 py-2">{p.rationale}</td>
                      <td className="px-3 py-2 text-right">
                        <Link href={linkToChart(p.symbol)} className="px-2 py-1 border rounded hover:bg-neutral-50">Analizar</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* NEAR ATH */}
      {tab==="ath" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border text-sm" onClick={loadAth} disabled={athLoading}>
              {athLoading ? "Buscando…" : "Actualizar Near ATH"}
            </button>
            {athError && <span className="text-sm text-rose-600">Error: {athError}</span>}
          </div>

          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="text-left px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSortAth("symbol")}>
                    Ticker {sortKeyAth==="symbol" ? (sortDirAth==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-right px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSortAth("lastClose")}>
                    Último {sortKeyAth==="lastClose" ? (sortDirAth==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-right px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSortAth("maxClose")}>
                    ATH {sortKeyAth==="maxClose" ? (sortDirAth==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-right px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSortAth("ddPct")}>
                    Drawdown % {sortKeyAth==="ddPct" ? (sortDirAth==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-right px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSortAth("lastSwingLow")}>
                    Soporte {sortKeyAth==="lastSwingLow" ? (sortDirAth==="asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="text-left px-3 py-2">Rationale</th>
                  <th className="text-right px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {athSorted.length===0 && !athLoading && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-neutral-500">Sin resultados con los filtros actuales.</td></tr>
                )}
                {athSorted.map((p,idx)=>(
                  <tr key={`${p.symbol}-${idx}`} className="border-t">
                    <td className="px-3 py-2 font-semibold">{p.symbol}</td>
                    <td className="px-3 py-2 text-right">{p.lastClose.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{p.maxClose.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{p.ddPct.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{p.lastSwingLow!=null ? p.lastSwingLow.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2">{p.rationale}</td>
                    <td className="px-3 py-2 text-right">
                      <Link href={linkToChart(p.symbol)} className="px-2 py-1 border rounded hover:bg-neutral-50">Analizar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
