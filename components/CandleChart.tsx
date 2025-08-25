"use client";
import React from "react";
import { createChart, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";

type Bar = { time:number; open:number; high:number; low:number; close:number; volume:number };
type RiskPlan = { entry:number; stop:number|null } | null;

type Props = {
  data: Bar[];
  sma20?: boolean;
  sma50?: boolean;
  sma200?: boolean;
  sr?: { support?: number|null; resistance?: number|null } | null;
  riskPlan?: RiskPlan;
};

function sma(vals:number[], p:number){
  const out:(number|null)[] = Array(vals.length).fill(null);
  let s=0;
  for(let i=0;i<vals.length;i++){
    s+=vals[i];
    if(i>=p) s-=vals[i-p];
    if(i>=p-1) out[i]=s/p;
  }
  return out;
}

export default function CandleChart({ data, sma20, sma50, sma200, sr, riskPlan }: Props){
  const containerRef = React.useRef<HTMLDivElement|null>(null);
  const chartRef = React.useRef<IChartApi|null>(null);
  const candleRef = React.useRef<ISeriesApi<"Candlestick">|null>(null);
  const ma20Ref = React.useRef<ISeriesApi<"Line">|null>(null);
  const ma50Ref = React.useRef<ISeriesApi<"Line">|null>(null);
  const ma200Ref = React.useRef<ISeriesApi<"Line">|null>(null);
  const srLinesRef = React.useRef<ISeriesApi<"Line">[]>([]);
  const rsLinesRef = React.useRef<ISeriesApi<"Line">[]>([]);
  const resizeObsRef = React.useRef<ResizeObserver|null>(null);

  React.useEffect(()=>{
    if(!containerRef.current) return;

    // crear chart si no existe
    if(!chartRef.current){
      chartRef.current = createChart(containerRef.current, {
        layout: { background:{ type: ColorType.Solid, color:"#ffffff" }, textColor:"#333" },
        grid: { vertLines:{ visible:true, color:"#eee" }, horzLines:{ visible:true, color:"#eee" } },
        rightPriceScale: { borderColor:"#e5e7eb" },
        timeScale: { borderColor:"#e5e7eb" },
        autoSize: true,
      });
      candleRef.current = chartRef.current.addCandlestickSeries({
        upColor:"#26a69a", downColor:"#ef5350", wickUpColor:"#26a69a", wickDownColor:"#ef5350", borderVisible:false,
      });
      ma20Ref.current = chartRef.current.addLineSeries({ color:"#22c55e", lineWidth:2, priceLineVisible:false });
      ma50Ref.current = chartRef.current.addLineSeries({ color:"#3b82f6", lineWidth:2, priceLineVisible:false });
      ma200Ref.current = chartRef.current.addLineSeries({ color:"#9333ea", lineWidth:2, priceLineVisible:false });

      // Resize observer (protegido)
      resizeObsRef.current = new ResizeObserver(()=>{ try{ chartRef.current?.timeScale().fitContent(); }catch{} });
      if(containerRef.current) resizeObsRef.current.observe(containerRef.current);
    }

    // setear datos
    const c = candleRef.current!;
    const closeArr = data.map(d=>d.close);
    c.setData(data.map(d => ({ time:d.time, open:d.open, high:d.high, low:d.low, close:d.close })));

    const s20 = sma20 ? sma(closeArr,20) : null;
    const s50 = sma50 ? sma(closeArr,50) : null;
    const s200 = sma200 ? sma(closeArr,200) : null;

    if(sma20 && ma20Ref.current) {
      ma20Ref.current.setData(data.map((d,i)=> s20?.[i] != null ? { time:d.time, value: s20[i]! } : { time:d.time, value: NaN }));
    } else { ma20Ref.current?.setData([]); }

    if(sma50 && ma50Ref.current) {
      ma50Ref.current.setData(data.map((d,i)=> s50?.[i] != null ? { time:d.time, value: s50[i]! } : { time:d.time, value: NaN }));
    } else { ma50Ref.current?.setData([]); }

    if(sma200 && ma200Ref.current) {
      ma200Ref.current.setData(data.map((d,i)=> s200?.[i] != null ? { time:d.time, value: s200[i]! } : { time:d.time, value: NaN }));
    } else { ma200Ref.current?.setData([]); }

    // limpiar líneas antiguas
    srLinesRef.current.forEach(l=> l.setData([] as any));
    srLinesRef.current = [];
    rsLinesRef.current.forEach(l=> l.setData([] as any));
    rsLinesRef.current = [];

    // dibujar soporte / resistencia
    if(sr && chartRef.current){
      const mkHoriz = (price:number, color:string) => {
        const s = chartRef.current!.addLineSeries({ color, lineWidth:1, priceLineVisible:false });
        s.setData(data.map(d => ({ time:d.time, value: price })));
        srLinesRef.current.push(s);
      };
      if(Number.isFinite(sr?.support as number)) mkHoriz(sr!.support as number, "#60a5fa");   // support (azul)
      if(Number.isFinite(sr?.resistance as number)) mkHoriz(sr!.resistance as number, "#f59e0b"); // resistance (naranja)
    }

    // dibujar entrada/stop si hay plan
    if(riskPlan && chartRef.current){
      const { entry, stop } = riskPlan;
      const mk = (price:number, color:string) => {
        const s = chartRef.current!.addLineSeries({ color, lineWidth:2, priceLineVisible:false });
        s.setData(data.map(d => ({ time:d.time, value: price })));
        rsLinesRef.current.push(s);
      };
      if(Number.isFinite(entry)) mk(entry, "#16a34a"); // entrada verde
      if(stop!=null && Number.isFinite(stop)) mk(stop, "#dc2626"); // stop rojo
    }

    // ajustar vista
    try { chartRef.current.timeScale().fitContent(); } catch {}

    return () => {
      // no dispose del chart aquí (persistimos). Solo desconectar observer si existe.
      try { if(resizeObsRef.current && containerRef.current) resizeObsRef.current.unobserve(containerRef.current); } catch {}
    };
  }, [data, sma20, sma50, sma200, sr, riskPlan]);

  return <div ref={containerRef} className="w-full h-80" />;
}
