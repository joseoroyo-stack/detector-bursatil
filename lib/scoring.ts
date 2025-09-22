// lib/scoring.ts
export type OHLC = { time:number; open:number; high:number; low:number; close:number; volume:number };

// ========= Yahoo fetch unificado =========
function toYahoo(interval: "1d"|"1w"|"1mo", range: "1M"|"3M"|"6M"|"1A"|"MAX") {
  const mapInt: Record<string,string> = { "1d":"1d", "1w":"1wk", "1mo":"1mo" };
  const mapRange: Record<string,string> = { "1M":"1mo","3M":"3mo","6M":"6mo","1A":"1y","MAX":"max" };
  return { interval: mapInt[interval], range: mapRange[range] };
}

export async function fetchYahooBars(symbol:string, tf:"1d"|"1w"|"1mo", range:"1M"|"3M"|"6M"|"1A"|"MAX"):Promise<OHLC[]> {
  const { interval, range: r } = toYahoo(tf, range);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${r}`;
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo ${symbol} ${res.status}`);
  const j = await res.json();
  const result = j?.chart?.result?.[0];
  const t:number[] = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0] ?? {};
  const o:number[] = q.open ?? [], h:number[] = q.high ?? [], l:number[] = q.low ?? [], c:number[] = q.close ?? [], v:number[] = q.volume ?? [];
  const out:OHLC[] = [];
  for (let i=0;i<t.length;i++) {
    const open=o[i], high=h[i], low=l[i], close=c[i], vol=v[i];
    if ([open,high,low,close].some(x=>x==null||Number.isNaN(x))) continue;
    out.push({ time:t[i], open, high, low, close, volume:vol??0 });
  }
  return out;
}

// ========= Indicadores y scoring compartido =========
function sma(v:number[],p:number){const out:(number|null)[]=Array(v.length).fill(null);let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)out[i]=s/p;}return out;}
function ema(v:number[],p:number){const out:(number|null)[]=Array(v.length).fill(null),k=2/(p+1);let prev:number|null=null;for(let i=0;i<v.length;i++){if(i<p-1)continue;if(prev==null){const seed=v.slice(i-(p-1),i+1).reduce((a,b)=>a+b,0)/p;out[i]=seed;prev=seed;}else{prev=v[i]*k+prev*(1-k);out[i]=prev;}}return out;}
function macdCalc(c:number[],f=12,s=26,g=9){
  const ef=ema(c,f), es=ema(c,s);
  const macdLine:(number|null)[]=c.map((_,i)=>ef[i]!=null&&es[i]!=null?(ef[i]! - es[i]!):null);
  const vals:number[]=macdLine.map(x=>x==null?NaN:x).filter(x=>!Number.isNaN(x));
  const sig=ema(vals,g);
  const signalLine:(number|null)[]=Array(macdLine.length).fill(null);
  let j=0;for(let i=0;i<macdLine.length;i++){if(macdLine[i]!=null){signalLine[i]=sig[j]??null;j++;}}
  return{macdLine,signalLine};
}

function periodsForTF(tf:"1d"|"1w"|"1mo"){
  switch(tf){
    case "1w":  return { pFast:12,pSlow:26,pSig:9, smaFast:30,  smaSlow:120, minBars:150 };
    case "1mo": return { pFast:6, pSlow:12,pSig:5, smaFast:12,  smaSlow:48,  minBars:60  };
    default:    return { pFast:12,pSlow:26,pSig:9, smaFast:50,  smaSlow:200, minBars:200 };
  }
}

/** Devuelve un score ~[-1..+1] por TF (trend+momentum) */
export function techScoreByTF(data:OHLC[], tf:"1d"|"1w"|"1mo"){
  const closes=data.map(d=>d.close);
  const {pFast,pSlow,pSig,smaFast,smaSlow,minBars}=periodsForTF(tf);
  if (closes.length < minBars) return { score:null as number|null };

  const smaF=sma(closes,smaFast), smaS=sma(closes,smaSlow);
  const {macdLine, signalLine}=macdCalc(closes,pFast,pSlow,pSig);
  const i=closes.length-1;

  let trend=0;
  if(smaF[i]&&smaS[i]) trend += smaF[i]! > smaS[i]! ? 1 : -1;
  if(smaS[i]&&closes[i]>smaS[i]!) trend += 0.5;
  if(i>0 && smaF[i]!=null && smaF[i-1]!=null && smaF[i]!>smaF[i-1]!) trend += 0.25;

  let momentum=0;
  if(i>0&&macdLine[i-1]!=null&&signalLine[i-1]!=null&&macdLine[i]!=null&&signalLine[i]!=null){
    const prev=(macdLine[i-1]!-signalLine[i-1]!), now=(macdLine[i]!-signalLine[i]!);
    if(prev<=0 && now>0) momentum+=1;
  }

  const score = 0.6*trend + 0.4*momentum;
  const norm = Math.max(-1, Math.min(1, score));
  return { score: norm };
}

/** Score total mezclando corto (tf elegido) + largo (1mo) */
export function totalScore(shortScore:number|null, longScore:number|null){
  if(shortScore==null || longScore==null) return null;
  return 0.6*shortScore + 0.4*longScore;
}

/** Mapa de color semáforo unificado */
export function colorByScore(total:number){
  if(total >= 0.60) return "green" as const;
  if(total >= 0.30) return "orange" as const;
  return "red" as const;
}
