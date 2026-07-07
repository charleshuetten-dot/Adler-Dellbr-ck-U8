# Review-Prompt für externe KI-Prüfung — SV Adler Dellbrück U9-App (Stand 06.07.2026)

## Anleitung
1. Öffne claude.ai (oder ChatGPT/Gemini) und wähle das leistungsfähigste verfügbare Modell
2. Lade folgende Dateien als Attachment hoch (liegen alle im Ordner `Adler-Dellbr-ck-U8`):
   - **`index.html`** (Kern der App, ~7.850 Zeilen)
   - **`sw.js`** (Service Worker)
   - `manifest-trainer.json` und `manifest-quiz.json` (PWA-Manifeste)
3. Kopiere den kompletten Prompt unten (ab "Du bist ein erfahrener...") und füge ihn ein

---

## Prompt (kopieren ab hier):

```
Du bist ein erfahrener Web-Entwickler und Code-Reviewer. Ich habe eine Single-File-Web-App
(index.html + sw.js) für einen Jugendfußball-Verein (SV Adler Dellbrück, U9-Team, 4+1
Raute-Formation). Die App wird auf GitHub Pages gehostet und läuft in zwei Modi:

- TRAINER-MODUS (Standard-URL): PIN-Gate (1922) + Supabase-Login, blaues Branding.
  Enthält Spielerbewertung, Kader, Trainingsplanung, Taktik-Board, Team-Pinnwand.
- QUIZ-MODUS (URL mit ?quiz-Parameter): kein Login, grünes Branding, für Kinder gedacht.
  Interaktives Taktik-Quiz mit Drag&Drop/Tap-to-Move auf einem Spielfeld.

Beide Modi sind als getrennt installierbare PWAs eingerichtet (eigene manifest-*.json
mit eindeutiger "id", eigene Icons). Backend ist Supabase (REST-API, Row-Level-Security).

## ARCHITEKTUR-KONTEXT

- Alles liegt in EINER index.html-Datei (~7.850 Zeilen: HTML+CSS+JS gemischt)
- Kein Build-Prozess, kein Bundler, kein Framework — Vanilla JS
- Supabase-Projekt "Adler U8 I" mit folgenden Tabellen (alle mit RLS aktiv):
  - spielerprofile (Kinder-Bewertungen, NUR authentifizierte Trainer dürfen lesen/schreiben)
  - quiz_progress (Kinder-Fortschritt im Quiz, anon darf lesen/schreiben/upserten, nur
    authentifiziert löschen)
  - trainingsformen (Trainingsübungs-Datenbank, anon liest, nur auth schreibt)
  - anwesenheit, trainings_eval, team_notizen, einheiten (Team-Tools, nur authentifiziert)
- Auth: Supabase Auth mit E-Mail/Passwort, Access-Token in localStorage (adler_sb_auth),
  Ablauf wird geprüft, bei 401 wird Login-Overlay gezeigt
- Service Worker: Cache-first-Strategie mit Versions-Cache-Name (aktuell u9i-adler-v13),
  Offline-Fallback auf index.html bei Navigationen, automatischer Reload bei SW-Update
  (Event "controllerchange")
- GitHub Pages: WICHTIG, .nojekyll ist gesetzt (ohne diese Datei blieb der Build wiederholt
  hängen, sobald neue Dateitypen wie .json hinzukamen — bitte im Review nicht vorschlagen,
  diese Datei zu entfernen)

## WICHTIGE DATENSTRUKTUREN (zum Auffinden im Code)

- `const KADER=[...]` — 15 Spieler, Felder: name, tw (Torwart-Option), twPrio, nr
  (Trikotnummer, optional — 7 von 15 Spielern haben noch KEINE Nummer, das ist
  bekannt und OK, bitte nicht als Bug melden)
- `const TRAINER=["Sandy","Charles","Finn","Kenneth","Peter"]` — zentrale Trainerliste,
  speist Selects/Checkboxen dynamisch
- `const DIMS_FELD=[...]` — 37 Bewertungskriterien für Feldspieler (Technik, Wahrnehmung,
  Physis, Mental, Sozial), gruppiert in Dimensionen mit tier[]/mx[]-Unterkategorien
- `const DIMS_TW=[...]` — zusätzliche Torwart-Kriterien
- `const TQ_SCENARIOS=[...]` — 100 Quiz-Szenarien in 10 Blöcken à 10 Fragen, jedes
  Szenario hat start[] (Startpositionen), targets{} (Zielzonen, auch als Array für
  mehrere gültige Alternativpositionen möglich), opps[] (Gegnerpositionen), explain{}
- `const TQ_BLOCKS=[...]` — Themen-Namen der 10 Blöcke
- `const TRAININGSFORMEN=[...]` — ~104 Trainingsübungen mit Kategorien (aufwaermen,
  raute, passspiel, wahrnehmung, technik, pressing, spass, torwart, individual, mindset)

## FUNKTIONEN/BEREICHE, DIE ES ZU PRÜFEN LOHNT

1. Quiz-Engine: tqCheck, tqShowSolution, tqRewardAnimation, tqLoadScenario, tqStart/tqStop,
   tbAddDrag (Drag&Drop + Tap-to-Move für Touch), taktikRender
2. Bewertungs-Algorithmen: calcScores, calcRolle (Rollenzuordnung Aufpasser/Jäger/Flitzer
   L/R anhand der Kriterien), calcPotenzial, generateFazitFeld/generateFazitTW,
   generateInsights (Kombi-Synergien zwischen Spielern)
3. Supabase-Layer: loadDB, savePlayer, sbAuthHeaders/sbCheck401/sbLogin (Auth-Handling),
   teamSyncUpsert/teamSyncLoad (local-first Sync für Anwesenheit/Nachbewertung)
4. Team-Modul: tnSend/tnLoad/tnPin/tnDel (Pinnwand), tpPlanSave/tpPlanLoad/tpShareEinheit
   (Trainingspläne), teamBackupDownload (JSON-Export aller Tabellen)
5. Rendering: renderKader, renderProfil, renderVerlauf, renderTraining (~104 Formen mit
   Filterleiste), renderKombi (beste Kader-Aufstellung berechnen)
6. PWA-Setup: zwei IIFEs am Dateiende, eine für Trainer- eine für Quiz-Modus, die
   Manifest-Links und Apple-Touch-Icon per JS umschalten

## BISHERIGE ÜBERARBEITUNG (relevant, damit du nicht bereits Behobenes erneut meldest)

Es gab bereits eine große strukturierte Überarbeitung in 12 Blöcken (A-L), u.a.:
- XSS-Härtung: alle DB-Felder laufen durch esc(), Inline-onclick-Handler mit
  interpolierten Daten wurden durch data-Attribute + delegierte Listener ersetzt
- Race-Conditions bei Chart.js behoben (Canvas-already-in-use-Guard)
- Quiz: Geister-Gegner-Bug, Doppelzählung bei Skip, Tap-to-Move-Desktop-Bug behoben
- PIN gehärtet (SHA-256, nicht mehr "1234"), Session in localStorage mit 30-Tage-Ablauf
- Supabase RLS eingeführt (vorher waren alle Tabellen öffentlich lesbar/schreibbar!)
- safeParse()-Helfer für alle JSON.parse()-Aufrufe auf DB-Feldern (kaputte Zeilen
  crashen die Views nicht mehr)
- Kompaktierung der Bewertungskriterien von 48 auf 37 (Redundanzen entfernt)

Bitte NICHT erneut vorschlagen: escH() durch esc() ersetzen (bereits erledigt, escH
existiert nicht mehr), PIN-Hash ändern (bereits sicher), grundlegende RLS-Einführung
(bereits vorhanden) — falls du dennoch Lücken IN diesen Bereichen findest, sehr gerne
melden.

## WAS ICH VON DIR WILL

Bitte prüfe gründlich auf:

### 1. BUGS & FEHLER
- JavaScript-Fehler, Race Conditions, Memory-Leaks (Event-Listener die nie entfernt werden)
- Edge Cases in der Quiz-Logik (z.B. Szenarien mit unmöglichen/unerreichbaren Zielen)
- Fehlerbehandlung bei Supabase-Aufrufen (fehlende await, ungeprüfte Responses)
- Inkonsistenzen zwischen Datenmodell und Anzeige

### 2. SICHERHEIT
- Verbleibende XSS-Lücken (irgendwo doch noch ungeschütztes innerHTML mit Nutzer-/DB-Daten?)
- Sind die RLS-Policies stimmig? (anon darf NUR quiz_progress + trainingsformen-select;
  alles andere nur authenticated)
- Wird der Supabase-Publishable-Key sicher verwendet? (er ist bewusst öffentlich, das ist
  bei Supabase so vorgesehen — aber prüfe ob irgendwo sensiblere Schlüssel im Klartext
  auftauchen)

### 3. CODE-QUALITÄT & ARCHITEKTUR
- Ist die Größe von 7.850 Zeilen in einer Datei noch vertretbar oder gibt es sinnvolle
  Aufteilungspunkte (z.B. TQ_SCENARIOS/TRAININGSFORMEN als separate JSON-Datei laden)?
- Toter Code, Duplikate, inkonsistente Funktionsnamen
- Performance: gibt es unnötige Re-Renders, ineffiziente DOM-Manipulation, fehlendes
  Debouncing bei häufigen Events?

### 4. UX/MOBILE
- Ist die App auf kleinen Bildschirmen (375px) durchgehend nutzbar?
- Sind alle interaktiven Elemente für Kinderfinger groß genug (min. 44px)?
- Gibt es Stellen, an denen Ladezustände fehlen oder Fehler nicht sichtbar kommuniziert werden?

### 5. PWA/OFFLINE
- Ist die Cache-Strategie (cache-first mit Netzwerk-Update im Hintergrund) sinnvoll für
  diesen Anwendungsfall, oder wäre stale-while-revalidate / network-first an manchen
  Stellen besser?
- Funktioniert der Offline-Modus wirklich für beide Modi?

## FORMAT DEINER ANTWORT

Strukturierte Liste, sortiert nach Schweregrad:
1. **KRITISCH** — Bugs/Sicherheitslücken, die sofort behoben werden sollten
2. **WICHTIG** — Probleme mit spürbarer Auswirkung auf UX oder Wartbarkeit
3. **NICE-TO-HAVE** — Verbesserungsvorschläge, Refactoring-Ideen

Für jeden Punkt: ungefähre Zeile/Funktion, konkrete Beschreibung des Problems, und ein
Fix-Vorschlag (Code-Snippet wo sinnvoll). Ich setze deine Ergebnisse danach in Claude
Code um — bitte so formulieren, dass ich sie 1:1 als Arbeitsauftrag weitergeben kann.
```

---

## Kontext für dich (Charles) — nicht Teil des Prompts oben

- **Live-URLs:**
  - Trainer-App: https://charleshuetten-dot.github.io/Adler-Dellbr-ck-U8/
  - Kinder-Quiz: https://charleshuetten-dot.github.io/Adler-Dellbr-ck-U8/?quiz
- **Repo:** https://github.com/charleshuetten-dot/Adler-Dellbr-ck-U8 (Branch: main)
- **Supabase-Projekt:** "Adler U8 I" (Projekt-ID wgbcibqcqidudoksfkcv)
- **Aktueller Dateistand:** index.html 7.837 Zeilen / ~540 KB, sw.js 78 Zeilen (Cache v13)

### Bekannte offene TODOs (nicht an die Review-KI, sondern für dich zum Nachhalten)
1. **Trikotnummern fehlen noch für:** Kolja, Azem, Lukas, Matteo, Piet, Samu, Tom
   (bereits eingetragen: Fabio 2, Hugo 5, Mika 6, Leon 8, Jari 9, Sevan 10, Leif 15, Jonas 16)
2. **Trainer-Accounts:** bisher nur dein eigener Supabase-Auth-Account angelegt;
   Sandy und Finn fehlen noch (Dashboard → Authentication → Users → Add User)
3. **Manuelle Handy-Checkliste** aus dem letzten Abschlussbericht steht noch aus:
   Offline-Test, Team-Pinnwand geräteübergreifend, Backup-Download, Quiz-Haptik auf Android

### Was seit dem letzten Review-Paket (frühere Version dieser Datei) dazugekommen ist
- Komplette 12-Block-Überarbeitung (v3): Sicherheit, RLS+Login, Team-Modul, Quiz-Haptik,
  Trikotnummern-Grundgerüst, Usability
- Echtes Vereinswappen als App-Icon (zwei Varianten, getrennt installierbar)
- GitHub-Pages-Jekyll-Bug gefunden und mit `.nojekyll` behoben (Build hing an manifest-*.json fest)
- Auto-Reload bei Service-Worker-Update
