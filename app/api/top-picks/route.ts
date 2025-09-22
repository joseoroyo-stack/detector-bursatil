// app/api/top-picks/route.ts
import { NextResponse } from "next/server";
import us from "@/data/universe-us.json";
import sp500 from "@/data/universe-sp500.json";
import eu from "@/data/universe-eu.json";
import { fetchYahooBars, techScoreByTF, totalScore, colorByScore } from "@/lib/scoring";

function json(data:any, status=200){
  return new NextResponse(JSON.stringify(data),{ status, headers:{ "content-type":"application/json; charset=utf-8" }});
}

export async function GET(req:Request){
  try{
    const { searchParams } = new URL(req.url);
    const market = (searchParams.get("market") as "us50"|"sp500"|"eu") || "us50";
    const tf = (searchParams.get("tf") as "1d"|"1w"|"1mo") || "1mo";
    const range = (searchParams.get("range") as "1M"|"3M"|"6M"|"1A"|"MAX") || "MAX";
    const levelParam = (searchParams.get("level") as "alta"|"media"|"baja") || "alta";

    let universe:string[]=[];
    if(market==="us50") universe = (us as string[]);
    else if(market==="sp500") universe = (sp500 as string[]);
    else universe = (eu as string[]);

    const symbols = universe.slice(0,120);
    const concurrency=6;
    const chunks:string[][]=[]; for(let i=0;i<symbols.length;i+=concurrency) chunks.push(symbols.slice(i,i+concurrency));

    const rows:any[]=[];
    for(const batch of chunks){
      const res = await Promise.allSettled(batch.map(async sym=>{
        const dataShort = await fetchYahooBars(sym, tf, range);
        const sShort = techScoreByTF(dataShort, tf);
        if(sShort.score==null) return null;

        const dataLong = await fetchYahooBars(sym, "1mo", "MAX");
        const sLong = techScoreByTF(dataLong, "1mo");
        if(sLong.score==null) return null;

        const total = totalScore(sShort.score, sLong.score);
        if(total==null) return null;

        return {
          symbol: sym,
          score: sShort.score,         // corto
          longScore: sLong.score,      // largo
          total,
          color: colorByScore(total),
        };
      }));
      for(const r of res){ if(r.status==="fulfilled" && r.value) rows.push(r.value); }
    }

    // Ordenar por total desc
    rows.sort((a,b)=>b.total - a.total);

    // Filtro por exigencia (mismo criterio que colorByScore pero configurable)
    const thr1 = levelParam==="alta" ? 0.60 : levelParam==="media" ? 0.40 : 0.20;
    const picks = rows.filter(r=>r.total>=thr1).slice(0,10).map(r=>({
      symbol: r.symbol,
      total: +r.total.toFixed(3),
      score: +r.score.toFixed(3),
      longScore: +r.longScore.toFixed(3),
      color: r.color,
      rationale:
        r.total>=0.60 ? "Señales sólidas (verde)" :
        r.total>=0.30 ? "Riesgo moderado (naranja)" :
        "Alto riesgo (rojo)",
    }));

    return json({ ok:true, picks, updatedAt:new Date().toISOString(), meta:{market,tf,range,level:levelParam, scanned: rows.length} }, 200);
  }catch(e:any){
    return json({ ok:false, error: e?.message ?? "Error" }, 200);
  }
}
