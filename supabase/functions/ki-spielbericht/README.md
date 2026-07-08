# Edge Function: ki-spielbericht (HOTFIX 6 – dynamischer KI-Spielbericht)

Ersetzt die statische Text-Baustein-Engine (`REPORT_*` in `matchday.js`) durch
einen echten LLM-Bericht mit Varianz. Die alte Engine (`matchReportBuild`)
bleibt als **Offline-/Fehler-Fallback** erhalten.

## Was sie tut
- Nimmt **strukturierte Matchdaten** entgegen (kein Freitext):
  `{ spieler:[{name, highlights:{tor,pass,dribbling,gewinn,parade,heraus,aufbau}}], tore, gegentore, team, datum, seed }`.
  Die `highlights` kommen aus `match_actions` (pro Kind aufsummiert).
- Baut daraus serverseitig einen kompakten Coaching-Prompt und ruft das LLM.
- Liefert `{ bericht:"...", rest:<verbleibende Anfragen> }`.

## Sicherheit / Kosten
- `verify_jwt = true` – nur eingeloggte Nutzer erreichen den Code.
- Zusätzlicher **Trainer-Check** via `is_trainer()` RPC (403 sonst).
- **Rate-Limit** über Tabelle `ki_usage` (uid, tag, count) – gemeinsamer
  Tageszähler mit `ki-uebung`, `LIMIT = 20`/Tag. Hochzählen erst nach Erfolg.
- API-Key ausschließlich serverseitig (`LLM_API_KEY` Secret) – nie im Client.

## Secrets (Supabase → Edge Functions)
- `LLM_API_KEY` – Anthropic- oder OpenAI-Key (vom Trainer gesetzt).
- `LLM_PROVIDER` – "anthropic" (Default) oder "openai".
- `LLM_MODEL` – optional (Default: `claude-haiku-4-5-20251001` bzw. `gpt-4o-mini`).

## Prompt-Garantien
- Jedes genannte Kind kommt **namentlich und ausschließlich positiv** vor.
- Lob konkret an der stärksten erfassten Aktion; ohne Aktion → Einsatz/Teamgeist.
- U9-gerecht, kein Leistungsdruck, Ergebnis nur beiläufig, ~150–210 Wörter, endet mit 🦅.
- `seed` erzwingt bei „Neu würfeln" eine frische Formulierung (Temperature hoch).
