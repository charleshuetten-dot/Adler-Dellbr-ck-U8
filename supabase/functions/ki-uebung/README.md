# Edge Function: ki-uebung (FEAT AC – KI-Trainings-Assistent)

Deployt in Supabase (Projekt wgbcibqcqidudoksfkcv), `verify_jwt: true`.
Der Quellcode wird per Supabase MCP `deploy_edge_function` verwaltet;
diese Datei dient der Nachvollziehbarkeit.

## Sicherheitsdesign
- **Auth-Zwang:** verify_jwt + explizite `auth.getUser()` + `is_trainer()`-RPC.
  Nur eingeloggte Trainer duerfen aufrufen (anon/Eltern -> 401/403).
- **Rate-Limit:** Tabelle `ki_usage(uid, tag, count)`, 20 Anfragen/Trainer/Tag.
  Zaehlung nur nach erfolgreicher Generierung (service_role, RLS-bypass).
- **LLM-Key nur serverseitig:** aus Secret `LLM_API_KEY`, nie im Client.
- **Provider-flexibel:** Secret `LLM_PROVIDER` = `anthropic` (Default,
  Modell claude-haiku-4-5-20251001) oder `openai` (gpt-4o-mini).
  Optional `LLM_MODEL` ueberschreibt das Modell.
- **Erzwungenes JSON-Schema** + serverseitige Laengenbegrenzung/Validierung.
- **Sportwissenschaftlicher System-Prompt:** altersgerecht U6-U9, kein
  Kraft-/Ausdauertraining, Spiel-/Wettkampfform, viele Ballkontakte.

## Benoetigte Secrets (Supabase Dashboard -> Edge Functions -> Secrets)
- `LLM_API_KEY`  – API-Key des gewaehlten Anbieters (mit Spending-Limit!)
- `LLM_PROVIDER` – "anthropic" (Default) oder "openai" (optional)
- `LLM_MODEL`    – Modell-Override (optional)
(SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sind automatisch gesetzt.)

Der Quellcode (index.ts) liegt im Deployment; bei Aenderungen erneut per MCP deployen.
