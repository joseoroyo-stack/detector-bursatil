// app/api/top-picks/route.ts
import { NextResponse } from "next/server";
import us from "@/data/universe-us.json";
import sp500 from "@/data/universe-sp500.json";
import eu from "@/data/universe-eu.json";

/* ========= Utilidades ========= */
function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

type OHLC = { time: number; open: number; high: number; low: number; close: number; volume: number };

function toYahoo(interval: "1d"|"1w"|"1mo", range: "1M"|"3M"|"6M"|"1A"|"MAX") {
  const mapInt: Record<string,string> = { "1d":"1d", "1w":"1wk", "1mo":"1mo" };
  const mapRange: Record<string,string> = { "1M":"1mo","3M":"3mo","6M":"6mo","1A":"1y","MAX":"max" };
  return { interval: mapInt[interval], range: mapRange[range] };
}

async function fetchYahooBars(symbol:string, tf:"1d"|"1w"|"1mo", range:"1M"|"3M"|"6M"|"1A"|"MAX"):Promise<OHLC[]> {
  const { interval, range: r } = toYahoo(tf, range);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${r}`;
  const res = await fetch(url, { headers: { "accept":"application/json" }, cache:"no-store" });
  if (!res.ok) throw new Error(`Yahoo ${symbol} ${res.status}`);
  const j = await res.json();
  const result = j?.chart?.result?.[0];
  const t:number[] = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0] ?? {};
  const o:number[] = q.open ?? [], h:number[] = q.high ?? [], l:number[] = q.low ?? [], c:number[] = q.close ?? [], v:number[] = q.volume ?? [];
  const out:OHLC[] = [];
  for (let i=0;i<t.length;i++) {
    const open=o[i], high=h[i], low=l[i], close=c[i], vol=v[i];
    if ([open,high,low,close].some(x => x==null||Number.isNaN(x))) continue;
    out.push({ time:t[i], open, high, low, close, volume:vol??0 });
  }
  return out;
}

/* ========= Indicadores ========= */
function sma(v:number[],p:number){const out:(number|null)[]=Array(v.length).fill(null);let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)out[i]=s/p;}return out;}
function ema(v:number[],p:number){const out:(number|null)[]=Array(v.length).fill(null),k=2/(p+1);let prev:number|null=null;for(let i=0;i<v.length;i++){if(i<p-1)continue;if(prev==null){const seed=v.slice(i-(p-1),i+1).reduce((a,b)=>a+b,0)/p;out[i]=seed;prev=seed;}else{prev=v[i]*k+prev*(1-k);out[i]=prev;}}return out;}
function macdCalc(c:number[],f=12,s=26,g=9){const ef=ema(c,f),es=ema(c,s);const macdLine:(number|null)[]=c.map((_,i)=>ef[i]!=null&&es[i]!=null?(ef[i]! - es[i]!):null);const mv:number[]=macdLine.map(x=>x==null?NaN:x).filter(x=>!Number.isNaN(x));const sig=ema(mv,g);const signalLine:(number|null)[]=Array(macdLine.length).fill(null);let j=0;for(let i=0;i<macdLine.length;i++){if(macdLine[i]!=null){signalLine[i]=sig[j]??null;j++;}}return{macdLine,signalLine};}
function periodsForTF(tf:"1d"|"1w"|"1mo"){switch(tf){case"1w":return{pFast:12,pSlow:26,pSig:9,smaFast:30,smaSlow:120,minBars:150};case"1mo":return{pFast:6,pSlow:12,pSig:5,smaFast:12,smaSlow:48,minBars:60};default:return{pFast:12,pSlow:26,pSig:9,smaFast:50,smaSlow:200,minBars:200};}}
function techScoreByTF(data:OHLC[],tf:"1d"|"1w"|"1mo"){const closes=data.map(d=>d.close);const {pFast,pSlow,pSig,smaFast,smaSlow,minBars}=periodsForTF(tf);if(closes.length<minBars)return{score:null as number|null};const smaF=sma(closes,smaFast),smaS=sma(closes,smaSlow);const {macdLine,signalLine}=macdCalc(closes,pFast,pSlow,pSig);const i=closes.length-1;let trend=0;if(smaF[i]&&smaS[i])trend+=smaF[i]!>smaS[i]!?1:-1;if(smaS[i]&&closes[i]>smaS[i]!)trend+=0.5;if(i>0&&smaF[i]!=null&&smaF[i-1]!=null&&smaF[i]!>smaF[i-1]!)trend+=0.25;let momentum=0;if(i>0&&macdLine[i-1]!=null&&signalLine[i-1]!=null&&macdLine[i]!=null&&signalLine[i]!=null){const prev=(macdLine[i-1]!-signalLine[i-1]!),now=(macdLine[i]!-signalLine[i]!);if(prev<=0&&now>0)momentum+=1;}const score=0.6*trend+0.4*momentum;return{score};}

/* ========= API Handler ========= */
export async function GET(req:Request) {
  try {
    const { searchParams } = new URL(req.url);
    const market = (searchParams.get("market") as "us50"|"sp500"|"eu") || "us50";
    const tf = (searchParams.get("tf") as "1d"|"1w"|"1mo") || "1mo";
    const range = (searchParams.get("range") as "1M"|"3M"|"6M"|"1A"|"MAX") || "MAX";
    const levelParam = (searchParams.get("level") as "alta"|"media"|"baja") || "alta";

    let universe:string[] = [];
    if(market==="us50")universe=(us as string[]);
    else if(market==="sp500")universe=(sp500 as string[]);
    else universe=(eu as string[]);

    const symbols = universe.slice(0,120);
    const concurrency=6;
    const chunks:string[][]=[];
    for(let i=0;i<symbols.length;i+=concurrency)chunks.push(symbols.slice(i,i+concurrency));

    const scored:any[]=[];
    for(const batch of chunks){
      const batchRes=await Promise.allSettled(batch.map(async(sym)=>{
        const dataShort=await fetchYahooBars(sym,tf,range);
        const sShort=techScoreByTF(dataShort,tf);
        if(sShort.score==null)return null;
        const dataLong=await fetchYahooBars(sym,"1mo","MAX");
        const sLong=techScoreByTF(dataLong,"1mo");
        if(sLong.score==null)return null;
        const newsAdj=0;
        const total=0.6*(sShort.score as number)+0.4*(sLong.score as number)+newsAdj;
        return{symbol:sym,total:+total.toFixed(3),score:+(sShort.score as number).toFixed(3),longScore:+(sLong.score as number).toFixed(3),newsAdj};
      }));
      for(const r of batchRes){if(r.status==="fulfilled"&&r.value)scored.push(r.value);}
    }

    // === Umbrales según nivel ===
    const thr1 = levelParam === "alta" ? 0.60 : levelParam === "media" ? 0.40 : 0.20;
    const thr2 = levelParam === "alta" ? 0.40 : levelParam === "media" ? 0.30 : 0.10;
    const thr3 = levelParam === "alta" ? 0.20 : levelParam === "media" ? 0.10 : 0.00;

    // 1) Estricto
    let candidates=scored.filter(x=>x.total>=thr1&&x.score>0&&x.longScore>0);

    // 2) Relajado
    if(candidates.length<5){
      const relaxed=scored.filter(x=>x.total>=thr2&&(x.score>0||x.longScore>0));
      const map=new Map(candidates.map(c=>[c.symbol,c]));
      for(const r of relaxed)if(!map.has(r.symbol))map.set(r.symbol,r);
      candidates=Array.from(map.values());
    }

    // 3) Fallback
    if(candidates.length<5){
      const fallback=[...scored].filter(x=>x.total>=thr3).sort((a,b)=>b.total-a.total).slice(0,5);
      const map=new Map(candidates.map(c=>[c.symbol,c]));
      for(const f of fallback)if(!map.has(f.symbol))map.set(f.symbol,f);
      candidates=Array.from(map.values());
    }

    // 4) Último recurso: top absoluto
    if(candidates.length<5){
      const top=[...scored].sort((a,b)=>b.total-a.total).slice(0,5);
      const map=new Map(candidates.map(c=>[c.symbol,c]));
      for(const f of top)if(!map.has(f.symbol))map.set(f.symbol,f);
      candidates=Array.from(map.values());
    }

    candidates.sort((a,b)=>b.total-a.total);
    const picks=candidates.slice(0,5).map(p=>({
      symbol:p.symbol,
      total:p.total,
      score:p.score,
      newsAdj:p.newsAdj,
      rationale:
        p.total>=thr1?`Nivel ${levelParam}: verde (total ≥ ${thr1})`:
        p.total>=thr2?`Nivel ${levelParam}: candidato (total ≥ ${thr2})`:
        `Nivel ${levelParam}: top relativo`,
    }));

    return json({
      ok:true,
      picks,
      updatedAt:new Date().toISOString(),
      meta:{market,tf,range,level:levelParam,scanned:scored.length}
    },200);
  } catch(e:any){
    return json({ ok:false, error:e?.message??"Error inesperado" },200);
  }
}
