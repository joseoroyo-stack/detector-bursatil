"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import CandleChart from "@/components/CandleChart";

/* =================== HOOKS & HELPERS =================== */
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial);
  React.useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw != null) setValue(JSON.parse(raw)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue] as const;
}
function useIsMounted(){ const [m,setM]=React.useState(false); React.useEffect(()=>{setM(true);},[]); return m; }

type Bar = { time:number; open:number; high:number; low:number; close:number; volume:number };
function sma(vals:number[], p:number){ const out:(number|null)[]=Array(vals.length).fill(null); let s=0; for(let i=0;i<vals.length;i++){ s+=vals[i]; if(i>=p) s-=vals[i-p]; if(i>=p-1) out[i]=s/p; } return out; }

async function fetchBars(symbol:string, tf:"1d"|"1w"|"1mo", rangeDays:number):Promise<Bar[]>{
  const r = await fetch(`/api/prices?symbol=${encodeURIComponent(symbol)}&tf=${tf}&rangeDays=${rangeDays}`, { cache: "no-store" });
  const j = await r.json(); if(!j.ok || !Array.isArray(j.data)) return []; return j.data as Bar[];
}

/* ===== Alertas locales ===== */
type AlertRule = { id:string; symbol:string; type:"price_above"|"price_below"; threshold:number; enabled:boolean; oneShot:boolean; lastNotified?:number|null };
function loadAlerts():AlertRule[]{ try { return JSON.parse(localStorage.getItem("alerts")||"[]"); } catch { return []; } }
function saveAlerts(list:AlertRule[]){ try { localStorage.setItem("alerts", JSON.stringify(list)); } catch {} }
async function ensureNotificationPermission(){ if(typeof window==="undefined"||typeof Notification==="undefined") return false; if(Notification.permission==="granted") return true; if(Notification.permission==="denied") return false; const p=await Notification.requestPermission(); return p==="granted"; }
function notifyNow(title:string, body:string){ try{ if(typeof Notification!=="undefined"&&Notification.permission==="granted"){ new Notification(title,{body}); } else { alert(`${title}\n\n${body}`); } }catch{ alert(`${title}\n\n${body}`); } }
async function fetchLastClose(symbol:string){ try{ const r=await fetch(`/api/prices?symbol=${encodeURIComponent(symbol)}&tf=1d&rangeDays=7`,{cache:"no-store"}); const j=await r.json(); if(!j.ok||!Array.isArray(j.data)||j.data.length===0) return null; const last=j.data[j.data.length-1]; return typeof last?.close==="number"? last.close: null; }catch{ return null; } }
function ruleTriggered(rule:AlertRule, last:number){ return rule.type==="price_above"? last>=rule.threshold : last<=rule.threshold; }
async function addQuickAlert(symbol:string){
  const t=symbol.trim().toUpperCase(); if(!t) return;
  const dir=window.prompt(`Tipo de alerta para ${t}:\n"up" precio ≥ X, "down" precio ≤ X`,"up"); if(!dir) return;
  const thrStr=window.prompt(`Umbral de precio para ${t}?`,"100"); if(!thrStr) return;
  const threshold=Number(thrStr.replace(",", ".")); if(!Number.isFinite(threshold)) { alert("Umbral inválido"); return; }
  const type:AlertRule["type"]=dir.toLowerCase().startsWith("u")? "price_above":"price_below";
  const list=loadAlerts(); const rule:AlertRule={ id:`${t}-${type}-${threshold}-${Date.now()}`, symbol:t, type, threshold, enabled:true, oneShot:true, lastNotified:null };
  saveAlerts([rule, ...list]); alert(`Alerta creada: ${t} ${type==="price_above"?"≥":"≤"} ${threshold}`);
}
function useAlertChecker(){
  React.useEffect(()=>{
    let active=true; let timer:any=null;
    const tick=async()=>{
      if(!active) return;
      await ensureNotificationPermission();
      const list=loadAlerts().filter(a=>a.enabled);
      if(list.length===0){ schedule(); return; }
      const symbols=Array.from(new Set(list.map(a=>a.symbol)));
      const priceMap=new Map<string, number|null>();
      for(const s of symbols){ priceMap.set(s, await fetchLastClose(s)); }
      const now=Date.now();
      let changed=false;
      const updated=loadAlerts().map(rule=>{
        if(!rule.enabled) return rule;
        const last=priceMap.get(rule.symbol); if(last==null) return rule;
        const recently=rule.lastNotified && (now - rule.lastNotified < 30*60*1000);
        if(!recently && ruleTriggered(rule, last)){ notifyNow(`Alerta ${rule.symbol}`, `${rule.symbol}: ${last.toFixed(2)} ha ${rule.type==="price_above"?"superado":"caído por debajo de"} ${rule.threshold}`); changed=true; return {...rule, lastNotified: now, enabled: rule.oneShot? false: true}; }
        return rule;
      });
      if(changed) saveAlerts(updated);
      schedule();
    };
    const schedule=()=>{ if(!active) return; timer=setTimeout(tick, 2*60*1000); };
    tick(); return ()=>{ active=false; if(timer) clearTimeout(timer); };
  },[]);
}

/* ===== Patrones de velas ===== */
type Candle = { open:number; high:number; low:number; close:number };
const isBullish=(c:Candle)=> c.close>c.open;
const isBearish=(c:Candle)=> c.close<c.open;
const body=(c:Candle)=> Math.abs(c.close-c.open);
const upperWick=(c:Candle)=> c.high-Math.max(c.open,c.close);
const lowerWick=(c:Candle)=> Math.min(c.open,c.close)-c.low;
const range=(c:Candle)=> c.high-c.low;
function isDoji(c:Candle){ const r=range(c); if(r<=0) return false; return body(c)/r<=0.1; }
function isHammer(c:Candle){ const r=range(c); if(r<=0) return false; return lowerWick(c)>=body(c)*2 && upperWick(c)<=body(c) && isBullish(c); }
function isShootingStar(c:Candle){ const r=range(c); if(r<=0) return false; return upperWick(c)>=body(c)*2 && lowerWick(c)<=body(c) && isBearish(c); }
function engulfUp(prev:Candle, cur:Candle){ if(!isBearish(prev)||!isBullish(cur)) return false; const pmin=Math.min(prev.open,prev.close), pmax=Math.max(prev.open,prev.close); const cmin=Math.min(cur.open,cur.close), cmax=Math.max(cur.open,cur.close); return cmin<=pmin && cmax>=pmax; }
function engulfDn(prev:Candle, cur:Candle){ if(!isBullish(prev)||!isBearish(cur)) return false; const pmin=Math.min(prev.open,prev.close), pmax=Math.max(prev.open,prev.close); const cmin=Math.min(cur.open,cur.close), cmax=Math.max(cur.open,cur.close); return cmin<=pmin && cmax>=pmax; }
function detectCandlePatterns(data:Candle[], lastN=5){
  const n=Math.min(lastN, data.length); if(n<2) return { list:[] as string[], bias:0 };
  const slice=data.slice(-n); const list:string[]=[]; let bias=0;
  for(let i=1;i<slice.length;i++){
    const prev=slice[i-1], cur=slice[i];
    if(engulfUp(prev,cur)){ list.push("Envolvente alcista"); bias+=0.1; }
    if(engulfDn(prev,cur)){ list.push("Envolvente bajista"); bias-=0.1; }
    if(isHammer(cur)){ list.push("Martillo (posible giro alcista)"); bias+=0.1; }
    if(isShootingStar(cur)){ list.push("Shooting star (posible giro bajista)"); bias-=0.1; }
    if(isDoji(cur)){ list.push("Doji (indecisión)"); }
  }
  return { list: Array.from(new Set(list)), bias };
}
/* =================== COMPONENTES UI =================== */

function WatchlistCard({ onPick }:{ onPick:(t:string)=>void }){
  const [items, setItems] = useLocalStorage<string[]>("watchlist", []);
  const [newTicker, setNewTicker] = React.useState("");
  const mounted = useIsMounted();
  const add = ()=>{ const t=newTicker.trim().toUpperCase(); if(!t) return; if(!items.includes(t)) setItems([t, ...items]); setNewTicker(""); };
  const remove=(t:string)=> setItems(items.filter(x=>x!==t));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
        <CardDescription>Guarda tickers y crea alertas locales de precio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Añadir ticker (p.ej. AAPL, SAN.MC)" value={newTicker}
                 onChange={(e)=>setNewTicker(e.target.value.toUpperCase())}
                 onKeyDown={(e)=>{ if(e.key==="Enter") add(); }} />
          <Button onClick={add}>Añadir</Button>
        </div>
        {!mounted ? <div className="text-sm text-neutral-600">Cargando…</div> : items.length===0 ? (
          <div className="text-sm text-neutral-600">Aún no hay tickers guardados.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((t,idx)=>(
              <div key={`${t}-${idx}`} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                <div className="font-medium">{t}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={()=>onPick(t)}>Analizar</Button>
                  <Button size="sm" variant="secondary" onClick={()=>addQuickAlert(t)}>Alerta</Button>
                  <Button size="sm" variant="destructive" onClick={()=>remove(t)}>Quitar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type AlertRule = { id:string; symbol:string; type:"price_above"|"price_below"; threshold:number; enabled:boolean; oneShot:boolean; lastNotified?:number|null };
function AlertCenter(){
  const [list, setList] = React.useState<AlertRule[]>([]);
  const mounted = useIsMounted();
  const reload=()=> setList(loadAlerts());
  React.useEffect(()=>{ reload(); },[]);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Centro de alertas</CardTitle>
            <CardDescription>Gestiona tus alertas locales.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={async()=>{ const ok=await ensureNotificationPermission(); if(!ok) alert("Concede permisos de notificación."); else notifyNow("Prueba","Notificaciones activadas"); }}>Probar notificación</Button>
            <Button variant="outline" onClick={reload}>Refrescar</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!mounted ? <div className="text-sm text-neutral-600">Cargando…</div> : list.length===0 ? (
          <div className="text-sm text-neutral-600">No tienes alertas. Úsalas desde la Watchlist.</div>
        ) : (
          <div className="space-y-2">
            {list.map((rule, idx)=>(
              <div key={`${rule.id}-${idx}`} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{rule.symbol} — {rule.type==="price_above"?"Precio ≥":"Precio ≤"} {rule.threshold}</div>
                  <div className="text-xs text-neutral-500">{rule.enabled? "Activa":"Pausada"} · {rule.oneShot? "1 disparo":"Recurrente"} {rule.lastNotified? `· última: ${new Date(rule.lastNotified).toLocaleString()}`:""}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={()=>{ const cur=loadAlerts(); const upd=cur.map(r=> r.id===rule.id ? {...r, enabled:!r.enabled}: r); saveAlerts(upd); setList(upd); }}>{rule.enabled? "Pausar":"Reanudar"}</Button>
                  <Button size="sm" variant="outline" onClick={()=>{ const cur=loadAlerts(); const upd=cur.map(r=> r.id===rule.id ? {...r, oneShot:!r.oneShot}: r); saveAlerts(upd); setList(upd); }}>{rule.oneShot? "Recurrente":"1 disparo"}</Button>
                  <Button size="sm" variant="destructive" onClick={()=>{ const cur=loadAlerts(); const upd=cur.filter(r=> r.id!==rule.id); saveAlerts(upd); setList(upd); }}>Eliminar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* Top-5 (resumen; si tu backend ya existe, esto lo consume tal cual) */
function PremiumTopPicks(){
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState<string|null>(null);
  const [picks,setPicks]=React.useState<{symbol:string; total:number; score:number; newsAdj:number; rationale:string}[]>([]);
  const [updatedAt,setUpdatedAt]=React.useState<string|null>(null);
  const [tf,setTf]=React.useState<"1d"|"1w"|"1mo">("1mo");
  const [range,setRange]=React.useState<"1M"|"3M"|"6M"|"1A"|"MAX">("MAX");
  const [market,setMarket]=React.useState<"us50"|"sp500"|"eu">("sp500");
  const [level,setLevel]=React.useState<"alta"|"media"|"baja">("alta");
  const mounted=useIsMounted();
  const fetchPicks=async(m=market,t=tf,r=range,L=level)=>{
    try{
      setLoading(true); setError(null);
      const res=await fetch(`/api/top-picks?market=${m}&tf=${t}&range=${r}&level=${L}`,{cache:"no-store"});
      const j=await res.json(); if(!j.ok) throw new Error(j.error||"No disponible");
      setPicks(j.picks||[]); setUpdatedAt(j.updatedAt||null);
    }catch(e:any){ setError(e?.message??"Error"); } finally{ setLoading(false); }
  };
  React.useEffect(()=>{ fetchPicks(); },[]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 — luz verde (Premium)</CardTitle>
        <CardDescription>Acciones “verdes” según mercado, timeframe, rango y exigencia.{mounted&&updatedAt&& <span> Actualizado: {new Date(updatedAt).toLocaleString()}</span>}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className="border rounded-md px-2 py-1 text-sm" value={market} onChange={(e)=>{ const m=e.target.value as any; setMarket(m); fetchPicks(m,tf,range,level); }}>
            <option value="us50">USA (Top 50)</option><option value="sp500">S&P 500</option><option value="eu">Europa (IBEX + DAX)</option>
          </select>
          <select className="border rounded-md px-2 py-1 text-sm" value={tf} onChange={(e)=>{ const t=e.target.value as any; setTf(t); fetchPicks(market,t,range,level); }}>
            <option value="1d">1D</option><option value="1w">1W</option><option value="1mo">1M</option>
          </select>
          <select className="border rounded-md px-2 py-1 text-sm" value={range} onChange={(e)=>{ const r=e.target.value as any; setRange(r); fetchPicks(market,tf,r,level); }}>
            <option value="1M">1M</option><option value="3M">3M</option><option value="6M">6M</option><option value="1A">1A</option><option value="MAX">Máx</option>
          </select>
          <select className="border rounded-md px-2 py-1 text-sm" value={level} onChange={(e)=>{ const L=e.target.value as any; setLevel(L); fetchPicks(market,tf,range,L); }}>
            <option value="alta">Exigencia: Alta</option><option value="media">Exigencia: Media</option><option value="baja">Exigencia: Baja</option>
          </select>
          <Button onClick={()=>fetchPicks(market,tf,range,level)} disabled={loading}>{loading? "Actualizando…":"Actualizar"}</Button>
          <Link href="/landing"><Button variant="outline">Hacerse Premium</Button></Link>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!error && picks.length===0 && <div className="text-sm text-neutral-600">No hay candidatos verdes ahora mismo.</div>}
        <div className="grid md:grid-cols-2 gap-3">
          {picks.map((p,idx)=>(
            <div key={`${p.symbol}-${idx}`} className="rounded-xl border bg-white p-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{p.symbol}</div>
                <div className="text-xs text-neutral-500">total={p.total} · techScore={p.score}{p.newsAdj?` · newsAdj=${p.newsAdj}`:""}</div>
                <div className="text-[11px] text-neutral-500">{p.rationale}</div>
              </div>
              <div className="flex gap-2">
                <Link href={`/?ticker=${p.symbol}&fromTop=1&tf=${tf}&range=${range}`}><Button variant="outline" size="sm">Analizar</Button></Link>
                <a href={process.env.NEXT_PUBLIC_AFFILIATE_URL || "#"} target="_blank" rel="noreferrer"><Button size="sm">Operar</Button></a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PremiumATHPicks(){
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState<string|null>(null);
  const [picks,setPicks]=React.useState<any[]>([]);
  const [updatedAt,setUpdatedAt]=React.useState<string|null>(null);
  const [market,setMarket]=React.useState<"us50"|"sp500"|"eu">("sp500");
  const [tf,setTf]=React.useState<"1d"|"1w"|"1mo">("1d");
  const [range,setRange]=React.useState<"1M"|"3M"|"6M"|"1A"|"MAX">("MAX");
  const [strict,setStrict]=React.useState(true);
  const [tolPct,setTolPct]=React.useState(0.5);
  const [lookback,setLookback]=React.useState(60);
  const [recentDays,setRecentDays]=React.useState(30);
  const mounted=useIsMounted();
  const fetchPicks=async()=>{
    try{
      setLoading(true); setError(null);
      const url=`/api/ath-picks?market=${market}&tf=${tf}&range=${range}&tolPct=${tolPct}&lookback=${lookback}&strict=${strict}&recentDays=${recentDays}`;
      const r=await fetch(url,{cache:"no-store"}); const j=await r.json();
      if(!j.ok) throw new Error(j.error||"No disponible");
      setPicks(j.picks||[]); setUpdatedAt(j.updatedAt||null);
    }catch(e:any){ setError(e?.message??"Error"); } finally{ setLoading(false); }
  };
  React.useEffect(()=>{ fetchPicks(); },[]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Máximos históricos (ATH) + soporte</CardTitle>
        <CardDescription>Muestra valores en nuevo máximo o cerca del máximo con soporte.{mounted&&updatedAt&& <span> Actualizado: {new Date(updatedAt).toLocaleString()}</span>}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className="border rounded-md px-2 py-1 text-sm" value={market} onChange={(e)=>setMarket(e.target.value as any)}>
            <option value="us50">USA (Top 50)</option><option value="sp500">S&P 500</option><option value="eu">Europa (IBEX + DAX)</option>
          </select>
          <select className="border rounded-md px-2 py-1 text-sm" value={tf} onChange={(e)=>setTf(e.target.value as any)}>
            <option value="1d">1D</option><option value="1w">1W</option><option value="1mo">1M</option>
          </select>
          <select className="border rounded-md px-2 py-1 text-sm" value={range} onChange={(e)=>setRange(e.target.value as any)}>
            <option value="1M">1M</option><option value="3M">3M</option><option value="6M">6M</option><option value="1A">1A</option><option value="MAX">Máx</option>
          </select>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={strict} onChange={(e)=>setStrict(e.target.checked)} /> Solo ATH</label>
          {!strict && (<div className="flex items-center gap-1 text-sm"><span>tolerancia (%)</span><input type="number" className="border rounded px-2 py-1 w-20" min={0.1} step={0.1} value={tolPct} onChange={(e)=>setTolPct(parseFloat(e.target.value||"0.5"))}/></div>)}
          <div className="flex items-center gap-1 text-sm"><span>ATH reciente (días)</span><input type="number" className="border rounded px-2 py-1 w-24" min={0} step={5} value={recentDays} onChange={(e)=>setRecentDays(parseInt(e.target.value||"30",10))}/></div>
          <div className="flex items-center gap-1 text-sm"><span>lookback soporte</span><input type="number" className="border rounded px-2 py-1 w-24" min={10} step={5} value={lookback} onChange={(e)=>setLookback(parseInt(e.target.value||"60",10))}/></div>
          <Button onClick={fetchPicks} disabled={loading}>{loading? "Buscando…":"Buscar"}</Button>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!error && picks.length===0 && <div className="text-sm text-neutral-600">Sin candidatos con los criterios actuales.</div>}
        <div className="grid md:grid-cols-2 gap-3">
          {picks.map((p,idx)=>(
            <div key={`${p.symbol}-${idx}`} className="rounded-xl border bg-white p-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{p.symbol}</div>
                <div className="text-xs text-neutral-500">close={p.lastClose} · ATH={p.maxClose} · dd={p.ddPct}% · soporte={p.lastSwingLow}</div>
                <div className="text-xs">{p.rationale}</div>
              </div>
              <div className="flex gap-2">
                <Link href={`/?ticker=${p.symbol}&fromTop=1&tf=${tf}&range=${range}`}><Button variant="outline" size="sm">Analizar</Button></Link>
                <a href={process.env.NEXT_PUBLIC_AFFILIATE_URL || "#"} target="_blank" rel="noreferrer"><Button size="sm">Operar</Button></a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
/* =================== PÁGINA PRINCIPAL =================== */

type IntervalTF = "1d"|"1w"|"1mo";

export default function StockSignalApp(){
  const [ticker, setTicker] = useState("AAPL");
  const [intervalTF, setIntervalTF] = useState<IntervalTF>("1d");
  const [rangeDays, setRangeDays] = useState<number>(365);
  const [mode, setMode] = useState<"tech"|"mix"|"fund">("tech");

  const [shortBars, setShortBars] = useState<Bar[]>([]);
  const [analysisShort, setAnalysisShort] = useState<any>(null);

  const [capital, setCapital] = useState<number>(10000);
  const [riskPct, setRiskPct] = useState<number>(1);
  const [stopMethod, setStopMethod] = useState<"atr"|"percent">("percent");
  const [pctStop, setPctStop] = useState<number>(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [conclusion, setConclusion] = useState<any>(null);

  const searchParams = useSearchParams();

  useAlertChecker();

  React.useEffect(()=>{ const urlTicker=searchParams.get("ticker"); if(urlTicker) setTicker(urlTicker.toUpperCase()); },[searchParams]);

  const analyze = async ()=>{
    try{
      setLoading(true); setError(null);
      const bars = await fetchBars(ticker, intervalTF, rangeDays);
      setShortBars(bars);
      if(bars.length===0){ setAnalysisShort(null); setConclusion(null); setError("Símbolo no encontrado o sin datos."); return; }

      const closes = bars.map(b=>b.close);
      const _sma20 = sma(closes,20), _sma50=sma(closes,50), _sma200=sma(closes,200);
      const i = closes.length-1;

      const patternRes = detectCandlePatterns(bars.map(b=>({open:b.open,high:b.high,low:b.low,close:b.close})), 5);

      // --- Cálculo de tendencia numérica (sin booleanos) ---
      const has20 = typeof _sma20[i] === "number";
      const has50 = typeof _sma50[i] === "number";
      const has200 = typeof _sma200[i] === "number";
      const v20 = has20 ? (_sma20[i] as number) : null;
      const v50 = has50 ? (_sma50[i] as number) : null;
      const v200 = has200 ? (_sma200[i] as number) : null;
      const lastClose = closes[i];

      const t1 = (has50 && has200) ? (v50! > v200! ? 1 : -1) : 0;         // 50 vs 200
      const t2 = (has20 && has50) ? (v20! > v50! ? 0.5 : -0.5) : 0;         // 20 vs 50
      const t3 = has200 ? (lastClose > v200! ? 0.5 : -0.5) : 0;             // precio vs 200
      const trendUp = t1 + t2 + t3;

      const baseTechScore = Math.max(-2, Math.min(2, trendUp))/2 + (patternRes.bias||0); // ~[-1..+1]
      const urlFromTop = (typeof window!=="undefined") ? (new URLSearchParams(window.location.search).get("fromTop")==="1") : false;
      const contextBias = urlFromTop ? 0.2 : 0;
      const techScoreBiased = Math.max(-1, Math.min(1, (baseTechScore + contextBias)));

      setAnalysisShort({
        sma20: _sma20[i] ?? null, sma50: _sma50[i] ?? null, sma200: _sma200[i] ?? null,
        last: lastClose, patterns: patternRes.list, patternBias: patternRes.bias||0, techScore: +techScoreBiased.toFixed(2),
      });

      let color:"red"|"orange"|"green" = "orange";
      if(techScoreBiased >= 0.35) color="green"; else if(techScoreBiased <= -0.25) color="red";
      let baseText = color==="green" ? "Operación factible (técnico favorable)" : color==="red" ? "Operación poco recomendable (técnico débil)" : "Operación con riesgo (señales mixtas)";
      if(mode==="fund") baseText += " · Basado en noticias (prototipo).";
      if(mode==="mix")  baseText += " · Mixto (técnico + fundamentales).";
      setConclusion({ color, text: baseText });
    }catch(e:any){
      setError(e?.message??"Error");
    }finally{ setLoading(false); }
  };

  const mounted = useIsMounted();
  const chartData = useMemo(()=>shortBars, [shortBars]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Detector bursátil</h1>

      {/* Parámetros */}
      <Card>
        <CardHeader><CardTitle>Parámetros</CardTitle><CardDescription>Introduce un ticker y pulsa “Analizar”.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-2">
            <Input placeholder="Ticker (ej. AAPL, MSFT, SAN.MC)" value={ticker} onChange={(e)=>setTicker(e.target.value.toUpperCase())}/>
            <select className="border rounded-md px-2 py-1 text-sm" value={intervalTF} onChange={(e)=>setIntervalTF(e.target.value as IntervalTF)}>
              <option value="1d">1D</option><option value="1w">1W</option><option value="1mo">1M</option>
            </select>
            <select className="border rounded-md px-2 py-1 text-sm" value={rangeDays} onChange={(e)=>setRangeDays(parseInt(e.target.value,10))}>
              <option value={180}>6 meses</option><option value={365}>1 año</option><option value={365*2}>2 años</option>
              <option value={365*5}>5 años</option><option value={365*10}>10 años</option><option value={365*20}>20 años</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-neutral-600">Modo:</span>
            <select className="border rounded-md px-2 py-1 text-sm" value={mode} onChange={(e)=>setMode(e.target.value as any)}>
              <option value="tech">Técnico</option><option value="mix">Mixto</option><option value="fund">Noticias</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={analyze} disabled={loading}>{loading? "Cargando…":"Analizar"}</Button>
            <Button variant="secondary" onClick={()=>addQuickAlert(ticker)}>Crear alerta rápida</Button>
          </div>
          {error && <div className="text-sm text-red-600">Error: {error}</div>}
        </CardContent>
      </Card>

      {/* Gráfico */}
      <Card>
        <CardHeader><CardTitle>Gráfico (velas)</CardTitle><CardDescription>{ticker} · {intervalTF} · {rangeDays} días</CardDescription></CardHeader>
        <CardContent>
          {mounted && chartData.length>0 ? (
            <CandleChart
              data={chartData}
              sma20 sma50 sma200
              sr={null}
              riskPlan={(analysisShort?.last && Number.isFinite(analysisShort.last)) ? {
                entry: analysisShort.last as number,
                stop: stopMethod==="percent" ? +( (analysisShort.last as number) * (1 - pctStop/100)).toFixed(2) : null
              } : null}
            />
          ) : <div className="text-sm text-neutral-600">Introduce un ticker y pulsa “Analizar”.</div>}
        </CardContent>
      </Card>

      {/* Gestión de riesgo */}
      <Card>
        <CardHeader><CardTitle>Gestión de riesgo</CardTitle><CardDescription>Calcula tamaño de posición y dibuja entrada/stop.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-4 gap-2">
            <div><div className="text-xs text-neutral-600 mb-1">Capital (€)</div>
              <Input type="number" min={100} step={100} value={capital} onChange={(e)=>setCapital(parseFloat(e.target.value||"0"))}/></div>
            <div><div className="text-xs text-neutral-600 mb-1">% riesgo</div>
              <Input type="number" min={0.1} step={0.1} value={riskPct} onChange={(e)=>setRiskPct(parseFloat(e.target.value||"0"))}/></div>
            <div><div className="text-xs text-neutral-600 mb-1">Método stop</div>
              <select className="border rounded-md px-2 py-1 text-sm w-full" value={stopMethod} onChange={(e)=>setStopMethod(e.target.value as any)}>
                <option value="percent">Porcentaje</option><option value="atr" disabled>ATR (pronto)</option>
              </select></div>
            <div><div className="text-xs text-neutral-600 mb-1">% stop (si %)</div>
              <Input type="number" min={0.5} step={0.5} value={pctStop} onChange={(e)=>setPctStop(parseFloat(e.target.value||"0"))}/></div>
          </div>

          {analysisShort?.last && Number.isFinite(analysisShort.last) && (()=> {
            const entry = analysisShort.last as number;
            const stop = stopMethod==="percent" ? +(entry*(1-pctStop/100)).toFixed(2) : null;
            const riskPerShare = stop? +(entry - stop).toFixed(2) : null;
            const riskCash = +(capital*(riskPct/100)).toFixed(2);
            const qty = (riskPerShare && riskPerShare>0)? Math.floor(riskCash / riskPerShare) : 0;
            const tgt1 = stop? +(entry + (entry-stop)).toFixed(2) : null;
            const tgt2 = stop? +(entry + 2*(entry-stop)).toFixed(2) : null;
            return (
              <div className="text-sm">
                Entrada aprox: <b>{entry.toFixed(2)}</b>
                {stop && <> · Stop: <b>{stop.toFixed(2)}</b> (−{pctStop}%)</>}
                {riskPerShare && <> · Riesgo/acción: <b>{riskPerShare.toFixed(2)}</b></>}
                <br/>
                Riesgo total: <b>{riskCash}€</b> · Tamaño: <b>{qty}</b> acciones
                {tgt1 && <> · Objetivo 1R: <b>{tgt1.toFixed(2)}</b></>}
                {tgt2 && <> · Objetivo 2R: <b>{tgt2.toFixed(2)}</b></>}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Señales técnicas */}
      <Card>
        <CardHeader><CardTitle>Señales técnicas</CardTitle><CardDescription>Patrones, medias y semáforo.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Patrones de velas (últimas)</div>
            {analysisShort?.patterns?.length ? (
              <ul className="list-disc pl-5 text-sm">
                {analysisShort.patterns.map((p:string,idx:number)=>(<li key={`${p}-${idx}`}>{p}</li>))}
              </ul>
            ) : <div className="text-sm text-neutral-600">Sin patrones destacados.</div>}
          </div>
          {analysisShort && (
            <div className="text-sm">
              Último: <b>{analysisShort.last?.toFixed?.(2) ?? analysisShort.last}</b> ·
              SMA20: <b>{analysisShort.sma20?.toFixed?.(2) ?? "–"}</b> ·
              SMA50: <b>{analysisShort.sma50?.toFixed?.(2) ?? "–"}</b> ·
              SMA200: <b>{analysisShort.sma200?.toFixed?.(2) ?? "–"}</b> ·
              TechScore: <b>{analysisShort.techScore}</b>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              conclusion?.color==="green" ? "bg-green-500" :
              conclusion?.color==="red" ? "bg-red-500" : "bg-amber-500"
            }`} />
            <div className="text-sm">{conclusion?.text ?? "Sin evaluación aún."}</div>
          </div>

          {/* Botón broker afiliado */}
          <div className="mt-2">
            <a
              href={process.env.NEXT_PUBLIC_AFFILIATE_URL || "#"}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-white font-semibold shadow hover:bg-green-700 transition"
            >
              Operar con Broker
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist + Alertas */}
      <WatchlistCard onPick={(t)=>{ setTicker(t); }} />
      <AlertCenter />

      {/* Top-5 y ATH */}
      <PremiumTopPicks />
      <PremiumATHPicks />

      <Alert className="mt-4"><AlertTitle>Aviso</AlertTitle><AlertDescription>Prototipo educativo — no es asesoramiento financiero.</AlertDescription></Alert>
    </div>
  );
}
