// components/ScannerEmbedded.tsx
"use client";

import React from "react";
import Link from "next/link";

type Tf = "1d" | "1w" | "1mo";
type Range = "1M" | "3M" | "6M" | "1A" | "MAX";
type Market = "us50" | "sp500" | "eu";
type Level = "alta" | "media" | "baja";
type Tab = "top" | "ath";

type TopPick = {
  symbol: string;
  total: number;
  score: number;
  newsAdj?: number;
  rationale: string;
};

type AthPick = {
  symbol: string;
  lastClose: number;
  maxClose: number;
  ddPct: number;
  lastSwingLow: number | null;
  rationale: string;
};

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

function riskBadge(score: number) {
  if (score >= 0.35)
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold text-white bg-green-600">
        Oportunidad favorable (riesgo bajo)
      </span>
    );
  if (score <= -0.25)
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold text-white bg-rose-600">
        Alto riesgo (técnico débil)
      </span>
    );
  return (
    <span className="px-2 py-1 rounded-full text-xs font-semibold text-white bg-amber-500">
      Riesgo moderado (señales mixtas)
    </span>
  );
}

/** Proxy de riesgo para Near ATH combinando ddPct + buffer sobre soporte */
function proxyScoreATH(
  ddPct: number,
  lastClose: number,
  lastSwingLow: number | null
): number {
  let s1 = 0;
  if (ddPct <= 2) s1 = 0.45;
  else if (ddPct <= 5) s1 = 0.25;
  else if (ddPct <= 10) s1 = 0.0;
  else if (ddPct <= 20) s1 = -0.2;
  else s1 = -0.4;

  let s2 = 0;
  if (
    typeof lastSwingLow === "number" &&
    Number.isFinite(lastSwingLow) &&
    lastSwingLow > 0
  ) {
    const bufferPct = ((lastClose - lastSwingLow) / lastClose) * 100;
    if (bufferPct >= 12) s2 = 0.25;
    else if (bufferPct >= 8) s2 = 0.15;
    else if (bufferPct >= 4) s2 = 0.05;
    else if (bufferPct >= 2) s2 = -0.05;
    else s2 = -0.15;
  }
  const score = 0.6 * s1 + 0.4 * s2;
  return Math.max(-1, Math.min(1, score));
}

/* ===== util de ordenación ===== */
type SortDir = "asc" | "desc";
function useSortState(
  storageKey: string,
  initialBy: string,
  initialDir: SortDir = "desc"
) {
  const [by, setBy] = useLocalStorage<string>(`${storageKey}:by`, initialBy);
  const [dir, setDir] = useLocalStorage<SortDir>(
    `${storageKey}:dir`,
    initialDir
  );
  const toggle = (nextBy: string) => {
    if (by === nextBy) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setBy(nextBy);
      setDir("desc");
    }
  };
  return { by, dir, toggle } as const;
}
function sorter<T extends Record<string, any>>(by: string, dir: SortDir) {
  return (a: T, b: T) => {
    const av = a[by],
      bv = b[by];
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  };
}
function ThSort({
  label,
  field,
  activeBy,
  dir,
  onClick,
}: {
  label: string;
  field: string;
  activeBy: string;
  dir: SortDir;
  onClick: () => void;
}) {
  const active = activeBy === field;
  return (
    <th
      onClick={onClick}
      title="Ordenar"
      className={`px-3 py-2 text-left select-none cursor-pointer ${
        active ? "text-sky-600" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-xs">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </span>
    </th>
  );
}

/* ===================== COMPONENTE ===================== */
export default function ScannerEmbedded() {
  const [tab, setTab] = useLocalStorage<Tab>("scanner:tab", "top");

  // filtros comunes
  const [market, setMarket] = useLocalStorage<Market>("scanner:market", "sp500");
  const [tf, setTf] = useLocalStorage<Tf>("scanner:tf", "1d");
  const [range, setRange] = useLocalStorage<Range>("scanner:range", "6M");

  // top picks
  const [level, setLevel] = useLocalStorage<Level>("scanner:level", "media");
  const [topData, setTopData] = React.useState<TopPick[]>([]);
  const [topLoading, setTopLoading] = React.useState(false);
  const [topError, setTopError] = React.useState<string | null>(null);
  const topSort = useSortState("scanner:top:sort", "total", "desc");

  // ath
  const [strict, setStrict] = useLocalStorage<boolean>("scanner:strict", true);
  const [tolPct, setTolPct] = useLocalStorage<number>("scanner:tolPct", 0.5);
  const [lookback, setLookback] = useLocalStorage<number>("scanner:lookback", 60);
  const [recentDays, setRecentDays] = useLocalStorage<number>(
    "scanner:recentDays",
    30
  );
  const [athData, setAthData] = React.useState<AthPick[]>([]);
  const [athLoading, setAthLoading] = React.useState(false);
  const [athError, setAthError] = React.useState<string | null>(null);
  const athSort = useSortState("scanner:ath:sort", "ddPct", "asc");

  async function loadTop() {
    try {
      setTopLoading(true);
      setTopError(null);
      const url = `/api/top-picks?market=${market}&tf=${tf}&range=${range}&level=${level}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error");
      setTopData(j.picks || []);
    } catch (e: any) {
      setTopError(e.message || "Error desconocido");
      setTopData([]);
    } finally {
      setTopLoading(false);
    }
  }

  async function loadAth() {
    try {
      setAthLoading(true);
      setAthError(null);
      const url = `/api/ath-picks?market=${market}&tf=${tf}&range=${range}&strict=${strict}&tolPct=${tolPct}&lookback=${lookback}&recentDays=${recentDays}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error");
      setAthData(j.picks || []);
    } catch (e: any) {
      setAthError(e.message || "Error desconocido");
      setAthData([]);
    } finally {
      setAthLoading(false);
    }
  }

  React.useEffect(() => {
    tab === "top" ? loadTop() : loadAth();
  }, [tab]);

  const linkToChart = (sym: string) =>
    `/?ticker=${encodeURIComponent(sym)}&fromTop=1&tf=${tf}&range=${range}`;

  const topRows = React.useMemo(
    () => [...topData].sort(sorter<TopPick>(topSort.by, topSort.dir)),
    [topData, topSort.by, topSort.dir]
  );
  const athRows = React.useMemo(
    () => [...athData].sort(sorter<AthPick>(athSort.by, athSort.dir)),
    [athData, athSort.by, athSort.dir]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Cabecera */}
      <div className="px-4 pt-4">
        <h3 className="text-lg font-semibold">Scanner bursátil</h3>
        <p className="text-slate-600">
          Ranking unificado: Top Picks y Máximos Históricos (ATH) con evaluación
          de riesgo.
        </p>
      </div>

      <div className="px-4 pb-4">
        {/* Tabs (con color visible) */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setTab("top")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold shadow transition
              ${
                tab === "top"
                  ? "text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:brightness-110"
                  : "bg-white border border-slate-300 hover:bg-slate-50"
              }`}
          >
            Top Picks
          </button>
          <button
            onClick={() => setTab("ath")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold shadow transition
              ${
                tab === "ath"
                  ? "text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:brightness-110"
                  : "bg-white border border-slate-300 hover:bg-slate-50"
              }`}
          >
            Near ATH
          </button>
        </div>

        {/* Filtros */}
        <div className="grid md:grid-cols-4 gap-2 mt-4">
          <select
            className="border rounded-md px-3 py-2 bg-white"
            value={market}
            onChange={(e) => setMarket(e.target.value as Market)}
          >
            <option value="us50">USA Top 50</option>
            <option value="sp500">S&P 500</option>
            <option value="eu">Europa (IBEX + DAX)</option>
          </select>

          <select
            className="border rounded-md px-3 py-2 bg-white"
            value={tf}
            onChange={(e) => setTf(e.target.value as Tf)}
          >
            <option value="1d">1D</option>
            <option value="1w">1W</option>
            <option value="1mo">1M</option>
          </select>

          <select
            className="border rounded-md px-3 py-2 bg-white"
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
          >
            <option value="1M">1M</option>
            <option value="3M">3M</option>
            <option value="6M">6M</option>
            <option value="1A">1A</option>
            <option value="MAX">MAX</option>
          </select>

          {tab === "top" && (
            <select
              className="border rounded-md px-3 py-2 bg-white"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
            >
              <option value="alta">Exigencia alta</option>
              <option value="media">Exigencia media</option>
              <option value="baja">Exigencia baja</option>
            </select>
          )}
        </div>

        {/* Extra ATH */}
        {tab === "ath" && (
          <div className="grid md:grid-cols-4 gap-2 mt-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={strict}
                onChange={(e) => setStrict(e.target.checked)}
              />
              Solo ATH
            </label>

            <div className="flex items-center gap-2">
              <span>Reciente (días)</span>
              <input
                type="number"
                value={recentDays}
                onChange={(e) => setRecentDays(parseInt(e.target.value || "30"))}
                className="border rounded-md px-2 py-1 w-24 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span>Lookback</span>
              <input
                type="number"
                value={lookback}
                onChange={(e) => setLookback(parseInt(e.target.value || "60"))}
                className="border rounded-md px-2 py-1 w-24 bg-white"
              />
            </div>

            {!strict && (
              <div className="flex items-center gap-2">
                <span>Tolerancia %</span>
                <input
                  type="number"
                  step={0.1}
                  value={tolPct}
                  onChange={(e) => setTolPct(parseFloat(e.target.value || "0.5"))}
                  className="border rounded-md px-2 py-1 w-24 bg-white"
                />
              </div>
            )}
          </div>
        )}

        {/* Actualizar (con color) */}
        <div className="mt-3">
          <button
            onClick={tab === "top" ? loadTop : loadAth}
            disabled={topLoading || athLoading}
            className="rounded-xl px-5 py-2 font-semibold text-white shadow bg-gradient-to-r from-teal-500 to-emerald-600 hover:brightness-110 disabled:opacity-60"
          >
            {topLoading || athLoading ? "Cargando…" : "Actualizar"}
          </button>
        </div>

        {/* Listas */}
        {tab === "top" ? (
          <div className="overflow-x-auto mt-4">
            {topError && (
              <div className="text-rose-600 text-sm mb-2">Error: {topError}</div>
            )}
            <table className="w-full text-sm border rounded-xl overflow-hidden bg-white">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <ThSort
                    label="Ticker"
                    field="symbol"
                    activeBy={topSort.by}
                    dir={topSort.dir}
                    onClick={() => topSort.toggle("symbol")}
                  />
                  <ThSort
                    label="Total"
                    field="total"
                    activeBy={topSort.by}
                    dir={topSort.dir}
                    onClick={() => topSort.toggle("total")}
                  />
                  <ThSort
                    label="TechScore"
                    field="score"
                    activeBy={topSort.by}
                    dir={topSort.dir}
                    onClick={() => topSort.toggle("score")}
                  />
                  <th className="px-3 py-2 text-left">Riesgo</th>
                  <th className="px-3 py-2 text-left">Rationale</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((r, idx) => (
                  <tr
                    key={idx}
                    className="border-t hover:bg-slate-50 transition"
                  >
                    <td className="px-3 py-2 font-semibold">{r.symbol}</td>
                    <td className="px-3 py-2 text-right">
                      {r.total.toFixed?.(3) ?? r.total}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.score.toFixed?.(3) ?? r.score}
                    </td>
                    <td className="px-3 py-2">{riskBadge(r.score)}</td>
                    <td className="px-3 py-2">{r.rationale}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={linkToChart(r.symbol)}
                        className="inline-flex items-center rounded-lg px-3 py-1.5 text-white bg-gradient-to-r from-sky-500 to-teal-500 shadow hover:brightness-110"
                      >
                        Analizar
                      </Link>
                    </td>
                  </tr>
                ))}
                {topRows.length === 0 && !topLoading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-6 text-slate-500"
                    >
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            {athError && (
              <div className="text-rose-600 text-sm mb-2">Error: {athError}</div>
            )}
            <table className="w-full text-sm border rounded-xl overflow-hidden bg-white">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <ThSort
                    label="Ticker"
                    field="symbol"
                    activeBy={athSort.by}
                    dir={athSort.dir}
                    onClick={() => athSort.toggle("symbol")}
                  />
                  <ThSort
                    label="Close"
                    field="lastClose"
                    activeBy={athSort.by}
                    dir={athSort.dir}
                    onClick={() => athSort.toggle("lastClose")}
                  />
                  <ThSort
                    label="ATH"
                    field="maxClose"
                    activeBy={athSort.by}
                    dir={athSort.dir}
                    onClick={() => athSort.toggle("maxClose")}
                  />
                  <ThSort
                    label="DD %"
                    field="ddPct"
                    activeBy={athSort.by}
                    dir={athSort.dir}
                    onClick={() => athSort.toggle("ddPct")}
                  />
                  <ThSort
                    label="Soporte"
                    field="lastSwingLow"
                    activeBy={athSort.by}
                    dir={athSort.dir}
                    onClick={() => athSort.toggle("lastSwingLow")}
                  />
                  <th className="px-3 py-2 text-left">Riesgo</th>
                  <th className="px-3 py-2 text-left">Rationale</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {athRows.map((r, idx) => {
                  const score = proxyScoreATH(
                    r.ddPct,
                    r.lastClose,
                    r.lastSwingLow
                  );
                  return (
                    <tr
                      key={idx}
                      className="border-t hover:bg-slate-50 transition"
                    >
                      <td className="px-3 py-2 font-semibold">{r.symbol}</td>
                      <td className="px-3 py-2 text-right">
                        {r.lastClose.toFixed?.(2) ?? r.lastClose}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.maxClose.toFixed?.(2) ?? r.maxClose}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.ddPct.toFixed?.(2) ?? r.ddPct}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.lastSwingLow != null
                          ? (r.lastSwingLow as number).toFixed?.(2) ??
                            r.lastSwingLow
                          : "–"}
                      </td>
                      <td className="px-3 py-2">{riskBadge(score)}</td>
                      <td className="px-3 py-2">{r.rationale}</td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={linkToChart(r.symbol)}
                          className="inline-flex items-center rounded-lg px-3 py-1.5 text-white bg-gradient-to-r from-sky-500 to-teal-500 shadow hover:brightness-110"
                        >
                          Analizar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {athRows.length === 0 && !athLoading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-6 text-slate-500"
                    >
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
