// app/api/prices/route.ts
import { NextResponse } from "next/server";
import { fetchYahooBars } from "@/lib/yahoo";

type TF = "5m"|"15m"|"30m"|"60m"|"1d"|"1w"|"1mo";

/** convierte nuestro range preset a días */
function rangeToDays(range: string) {
  const R = (range || "6M").toUpperCase();
  return R==="1M"?31 : R==="3M"?93 : R==="6M"?186 : R==="1A"?365 : 3650;
}

/** para intradía, limita la ventana (Yahoo recorta mucho y a veces devuelve 0) */
function capIntradayDays(tf: TF, days: number) {
  if (["5m","15m","30m","60m"].includes(tf)) {
    // ser conservador: 30 días máximo en intradía; si aún falla, la ruta hará fallback
    return Math.min(days, 30);
  }
  return days;
}

/** secuencia de reintentos si viene vacío */
function fallbackPlan(tf: TF, days: number): Array<{ tf: TF; days: number; why: string }> {
  const d10 = Math.min(days, 10);
  if (tf === "5m" || tf === "15m" || tf === "30m" || tf === "60m") {
    return [
      { tf,    days: capIntradayDays(tf, days), why: "intraday requested" },
      { tf: "60m", days: capIntradayDays("60m", d10), why: "fallback to 60m/10d" },
      { tf: "1d",  days: Math.max(93, days),        why: "fallback to 1d" },
    ];
  }
  if (tf === "1w" || tf === "1mo") {
    // semanal/mensual suelen ir bien; si no, baja a 1d
    return [
      { tf, days, why: "weekly/monthly requested" },
      { tf: "1d", days: Math.max(365, days), why: "fallback to 1d" },
    ];
  }
  // 1d
  return [
    { tf: "1d", days, why: "daily requested" },
    { tf: "1w", days: Math.max(365, days), why: "fallback to 1w" },
  ];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "").trim();
    const tf = (searchParams.get("tf") || "1d") as TF;
    const rangeDaysParam = searchParams.get("rangeDays");
    const range = searchParams.get("range"); // opcional: si te llega "6M", etc.
    let rangeDays = rangeDaysParam ? parseInt(rangeDaysParam, 10) : (range ? rangeToDays(range) : 186);

    if (!symbol) {
      return NextResponse.json({ ok: false, error: "Falta símbolo" }, { status: 400 });
    }

    // plan de reintentos
    const plan = fallbackPlan(tf, rangeDays);

    let picked: { tf: TF; days: number; why: string } | null = null;
    let data: any[] = [];
    let lastErr: any = null;

    for (const step of plan) {
      try {
        const bars = await fetchYahooBars(symbol, step.tf, step.days);
        if (bars && bars.length > 0) {
          data = bars.map((b) => ({
            time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
          }));
          picked = step;
          break;
        }
      } catch (e) {
        lastErr = e;
      }
    }

    if (!picked || data.length === 0) {
      const msg = lastErr?.message || "No hay datos disponibles para ese símbolo/intervalo.";
      return NextResponse.json({ ok: false, error: msg }, { status: 200 });
    }

    // Devuelve también meta-info de qué fallback se usó (útil para depurar en el front si quieres)
    return NextResponse.json({
      ok: true,
      used: picked, // { tf, days, why }
      data,
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error precios" }, { status: 500 });
  }
}
