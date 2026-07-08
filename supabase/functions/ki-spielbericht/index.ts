import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const LIMIT = 20; // gemeinsamer Tageszaehler mit ki-uebung (Kosten-/Missbrauchs-Deckel)

function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const SYS = `Du bist ein warmherziger Kinderfussball-Trainer (DFB, U6-U9) und schreibst nach dem Spiel einen kurzen Spielbericht fuer die Eltern-Gruppe (WhatsApp).
REGELN:
- JEDES genannte Kind kommt mindestens einmal NAMENTLICH und ausschliesslich POSITIV vor. Kein Kind vergessen, keine Kritik, keine Noten, keine Vergleiche zwischen Kindern.
- Mache das Lob konkret an der jeweils staerksten erfassten Aktion des Kindes fest (Tor, Pass/Vorlage, Dribbling, Balleroberung, Parade, Herauslaufen, Spielaufbau). Hat ein Kind keine Aktion, lobe Einsatz/Teamgeist/Spass.
- Kindgerechte, herzliche Sprache. Ergebnis nur beilaeufig erwaehnen, Fokus auf Spass, Mut und Miteinander. U9 = Bambini/Foerderphase, kein Leistungsdruck.
- Laenge: 150 bis 210 Woerter, 2 bis 3 kurze Absaetze. Beginne mit einem stimmungsvollen Einstieg, schliesse mit einem motivierenden Satz und dem Adler-Emoji.
Antworte AUSSCHLIESSLICH mit gueltigem JSON in genau dieser Form, ohne Text davor/danach:
{"bericht":"der fertige Spielbericht als ein String mit \\n fuer Absaetze"}`;

const AKT_LABEL: Record<string, string> = {
  tor: "Tore/Treffer", pass: "Torvorlagen/kluge Paesse", dribbling: "gelungene Dribblings",
  gewinn: "Balleroberungen", parade: "Paraden im Tor", heraus: "mutiges Herauslaufen", aufbau: "starker Spielaufbau",
};

function buildUserPrompt(body: any): string {
  const team = body?.team && Number(body.team) > 1 ? `Adler ${body.team}` : "unser Team";
  const datum = String(body?.datum || "").slice(0, 10);
  const tore = Number(body?.tore || 0);
  const gegentore = Number(body?.gegentore || 0);
  const seed = String(body?.seed || "").slice(0, 12);
  const spieler = Array.isArray(body?.spieler) ? body.spieler.slice(0, 20) : [];
  const lines = spieler.map((s: any) => {
    const name = String(s?.name || "").slice(0, 40);
    const h = s?.highlights && typeof s.highlights === "object" ? s.highlights : {};
    const parts = Object.keys(h)
      .filter((k) => AKT_LABEL[k] && Number(h[k]) > 0)
      .sort((a, b) => Number(h[b]) - Number(h[a]))
      .slice(0, 3)
      .map((k) => `${Number(h[k])}x ${AKT_LABEL[k]}`);
    return `- ${name}: ${parts.length ? parts.join(", ") : "keine Einzelaktion erfasst (Einsatz/Teamgeist loben)"}`;
  });
  return [
    `Spielbericht fuer ${team}${datum ? " vom " + datum : ""}.`,
    `Ergebnis (nur beilaeufig): ${tore} eigene Treffer, ${gegentore} Gegentore.`,
    `Kinder im Kader und ihre staerksten Aktionen:`,
    lines.join("\n"),
    seed ? `\n(Variationskennung ${seed}: formuliere frisch und anders als beim letzten Mal.)` : "",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return j({ error: "POST erwartet" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) return j({ error: "auth required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: udata } = await userClient.auth.getUser();
    const uid = udata?.user?.id;
    if (!uid) return j({ error: "not authenticated" }, 401);
    const { data: isTrainer, error: rpcErr } = await userClient.rpc("is_trainer");
    if (rpcErr || isTrainer !== true) return j({ error: "Nur Trainer koennen den KI-Spielbericht nutzen." }, 403);

    const svc = createClient(url, svcKey);
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await svc.from("ki_usage").select("count").eq("uid", uid).eq("tag", today).maybeSingle();
    const used = usage?.count ?? 0;
    if (used >= LIMIT) return j({ error: `Tageslimit erreicht (${LIMIT} KI-Anfragen/Tag). Morgen wieder!` }, 429);

    const body = await req.json().catch(() => ({}));
    if (!Array.isArray(body?.spieler) || !body.spieler.length) return j({ error: "Keine Spielerdaten fuer den Bericht." }, 400);
    const userPrompt = buildUserPrompt(body);

    const provider = (Deno.env.get("LLM_PROVIDER") || "anthropic").toLowerCase();
    const key = Deno.env.get("LLM_API_KEY");
    if (!key) return j({ error: "KI ist noch nicht eingerichtet (LLM_API_KEY fehlt)." }, 503);

    let content = "";
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: Deno.env.get("LLM_MODEL") || "gpt-4o-mini", max_tokens: 900, temperature: 0.9, response_format: { type: "json_object" }, messages: [{ role: "system", content: SYS }, { role: "user", content: userPrompt }] }),
      });
      if (!r.ok) return j({ error: "KI-Dienst nicht erreichbar (" + r.status + ")" }, 502);
      const d = await r.json();
      content = d?.choices?.[0]?.message?.content || "";
    } else {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: Deno.env.get("LLM_MODEL") || "claude-haiku-4-5-20251001", max_tokens: 900, temperature: 1, system: SYS, messages: [{ role: "user", content: userPrompt }] }),
      });
      if (!r.ok) return j({ error: "KI-Dienst nicht erreichbar (" + r.status + ")" }, 502);
      const d = await r.json();
      content = d?.content?.[0]?.text || "";
    }

    let parsed: any = null;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }
    let bericht = String(parsed?.bericht || "").trim();
    if (!bericht && content.trim()) bericht = content.trim(); // Notfall: Rohtext, falls kein JSON
    if (!bericht) return j({ error: "Die KI-Antwort war unlesbar. Bitte nochmal versuchen." }, 502);
    bericht = bericht.slice(0, 2500);

    await svc.from("ki_usage").upsert({ uid, tag: today, count: used + 1 }, { onConflict: "uid,tag" });

    return j({ bericht, rest: LIMIT - (used + 1) }, 200);
  } catch (_e) {
    return j({ error: "Serverfehler beim KI-Spielbericht." }, 500);
  }
});
