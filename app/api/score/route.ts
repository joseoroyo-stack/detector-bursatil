// app/api/score/route.ts
import { NextResponse } from "next/server";
import { fetchYahooBars, techScoreByTF, totalScore, colorByScore } from "@/lib/scoring";

function json(data:any, status=200){
  return new NextResponse(JSON.stringify(data),{ status, headers:{ "content-type":"application/json; charset=utf-8" }});
}

export async function GET(req:Request){
  try{
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "").toUpperCase();
    const tf = (searchParams.get("tf") as "1d"|"1w"|"1mo") || "1d";
    const range = (searchParams.get("range") as "1M"|"3M"|"6M"|"1A"|"MAX") || "1A";
    if(!symbol) return json({ ok:false, error:"symbol requerido" }, 200);

    const dataShort = await fetchYahooBars(symbol, tf, range);
    const sShort = techScoreByTF(dataShort, tf);
    const dataLong = await fetchYahooBars(symbol, "1mo", "MAX");
    const sLong = techScoreByTF(dataLong, "1mo");

    if(sShort.score==null || sLong.score==null) return json({ ok:false, error:"sin datos suficientes" }, 200);

    const total = totalScore(sShort.score, sLong.score)!;
    const color = colorByScore(total);
    const last = dataShort.at(-1)?.close ?? null;

    return json({
      ok:true,
      symbol, last, tf, range,
      score: +sShort.score.toFixed(3),
      longScore: +sLong.score.toFixed(3),
      total: +total.toFixed(3),
      color,
    }, 200);
  }catch(e:any){
    return json({ ok:false, error: e?.message ?? "Error" }, 200);
  }
}
