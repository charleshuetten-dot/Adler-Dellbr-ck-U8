# Edge Function: ki-stadionheft (Auto-Content für das Stadionheft)

Erzeugt einen **kindgerechten Entwurf** für Einleitung + Trainer-Kommentar des
Stadionhefts aus den Systemdaten der letzten Wochen. Der Trainer bearbeitet den
Entwurf danach frei im Editor und veröffentlicht.

- `verify_jwt = true` + `is_trainer()`-Check (nur Trainer). Teilt das 20/Tag-
  Rate-Limit über `ki_usage` mit den anderen KI-Funktionen.
- **Zeitraum:** seit `stadionheft.updated_at` (letztes Heft), sonst 35 Tage.
- **Aggregiert serverseitig (service_role, minimal):**
  - Trainingseinheiten (Anzahl `termine` typ=training im Zeitraum — robust,
    unabhängig vom `anwesenheit`-Format).
  - Spiele/Turniere + Ergebnis (`ticker_events` tor/gegentor je Spieltag).
  - Top-Torschützen & Ballaktionen (`match_actions`).
  - Geburtstage der nächsten 21 Tage (`kader.geb`).
- Schickt ein kompaktes Briefing an das LLM (lustig, kindgerecht, U9, kein
  Leistungsdruck) und gibt `{ einleitung, kommentar, meta }` zurück.

## Response
```json
{ "einleitung": "…", "kommentar": "… inkl. Geburtstagsgrüßen",
  "meta": { "trainings": 4, "spiele": 2, "geburtstage": 1, "seit": "2026-06-10" } }
```

Frontend: Button „✨ Auto-Entwurf aus den letzten Wochen (KI)" im Stadionheft-
Editor (`heftAutoContent()` in views.js) füllt die Felder Einleitung + Kommentar.
Robust bei dünnen Daten: schreibt dann eine nette allgemeine Begrüßung.
