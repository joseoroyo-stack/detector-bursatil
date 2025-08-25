import { NextResponse } from "next/server";

const POS_WORDS = [
  // EN
  "beat","beats","beats estimates","guidance raised","raise guidance","strong growth","record",
  "upgrade","upgraded","outperform","buy rating","surge","rally","profit rises","revenue rises",
  // ES
  "mejora","sube","alza","buenos resultados","beneficio récord","eleva guía","eleva previsiones",
  "supera expectativas","mejores previsiones","recompra","dividendo aumenta"
];

const NEG_WORDS = [
  // EN
  "miss","misses","misses estimates","guidance cut","cut guidance","warning","profit warning",
  "downgrade","downgraded","underperform","sell rating","falls","plunge","drop","lawsuit","investigation",
  "layoffs","recall","shortfall","slump","weak demand",
  // ES
  "profit warning","empeora","recorta guía","rebaja guía","cae","baja","demanda débil","demanda floja",
  "denuncia","demanda judicial","investigación","despidos","expediente","fraude"
];

// Muy simple: suma +1 por palabra positiva encontrada, -1 por negativa
function scoreText(txt: string): number {
  const t = (txt || "").toLowerCase();
  let s = 0;
  for (const w of POS_WORDS) if (t.includes(w.toLowerCase())) s += 1;
  for (const w of NEG_WORDS) if (t.includes(w.toLowerCase())) s -= 1;
  return s;
}

type NewsApiArticle = {
  title?: string;
  description?: string;
  url?: string;
  source?: { name?: string };
  publishedAt?: string;
};

async function fetchNewsapi(params: URLSearchParams) {
  const key = process.env.NEWSAPI_KEY;
  if (!key) {
    return { ok: false, error: "Falta NEWSAPI_KEY en .env.local" };
  }
  const base = "https://newsapi.org/v2/everything";
  const url = `${base}?${params.toString()}`;
  const r = await fetch(url, {
    headers: { "X-Api-Key": key },
    // Importante: NewsAPI a veces bloquea CORS desde el navegador; aquí vamos del lado servidor.
    cache: "no-store",
  });
  if (!r.ok) {
    if (r.status === 429) return { ok: false, error: "Límite de NewsAPI alcanzado (429). Intenta más tarde." };
    return { ok: false, error: `NewsAPI error ${r.status}` };
  }
  const json = await r.json();
  return { ok: true, json };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "").trim();

    if (!symbol) {
      return NextResponse.json({ ok: false, error: "Falta parámetro ?symbol=" }, { status: 400 });
    }

    // Hacemos dos llamadas: inglés y español, y luego las combinamos.
    const common = {
      sortBy: "publishedAt",
      pageSize: "20",
      // NOTA: NewsAPI admite solo un idioma por request. Hacemos dos peticiones y unimos.
      q: `${symbol} (stock OR shares OR acciones OR bolsa)`,
      // Puedes excluir cripto si te molesta ruido: q: `${symbol} AND (stock OR shares OR acciones OR bolsa) NOT crypto`
    };

    const pEN = new URLSearchParams({ ...common, language: "en" } as any);
    const pES = new URLSearchParams({ ...common, language: "es" } as any);

    const [enRes, esRes] = await Promise.all([fetchNewsapi(pEN), fetchNewsapi(pES)]);

    if (!enRes.ok && !esRes.ok) {
      const msg = enRes.error || esRes.error || "No se pudieron obtener noticias";
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }

    const enArticles: NewsApiArticle[] = enRes.ok ? enRes.json.articles ?? [] : [];
    const esArticles: NewsApiArticle[] = esRes.ok ? esRes.json.articles ?? [] : [];

    // Merge + deduplicado por URL
    const merged: NewsApiArticle[] = [];
    const seen = new Set<string>();
    for (const a of [...enArticles, ...esArticles]) {
      const u = a.url || "";
      if (!u || seen.has(u)) continue;
      seen.add(u);
      merged.push(a);
    }

    // Clasificación simple
    const items = merged.map((a) => {
      const text = `${a.title ?? ""}. ${a.description ?? ""}`;
      const s = scoreText(text);
      const sentiment: "pos" | "neu" | "neg" = s > 0 ? "pos" : s < 0 ? "neg" : "neu";
      return {
        source: a.source?.name ?? "desconocido",
        title: a.title ?? "",
        url: a.url ?? "",
        publishedAt: a.publishedAt ?? "",
        sentiment,
        score: s,
      };
    });

    // Agregado
    const count = items.length;
    const pos = items.filter(i => i.sentiment === "pos").length;
    const neg = items.filter(i => i.sentiment === "neg").length;
    const neu = items.filter(i => i.sentiment === "neu").length;
    const avgScore = count ? items.reduce((acc, i) => acc + i.score, 0) / count : 0;

    let stance: "muy_positivo" | "positivo" | "mixto" | "negativo" = "mixto";
    if (avgScore >= 0.8 && pos >= 2 * Math.max(1, neg)) stance = "muy_positivo";
    else if (avgScore >= 0.2 && pos > neg) stance = "positivo";
    else if (avgScore <= -0.4 && neg > pos) stance = "negativo";
    else stance = "mixto";

    // Nota: Por política de NewsAPI, no debemos mostrar contenido completo. (Mostramos solo metadatos.)
    return NextResponse.json({
      ok: true,
      summary: {
        stance,
        stats: { count, pos, neg, neu, avgScore: Number(avgScore.toFixed(2)) }
      },
      // Si en el futuro quieres ver titulares, puedes usar "items"
      // items,
    });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Error inesperado" }, { status: 500 });
  }
}
