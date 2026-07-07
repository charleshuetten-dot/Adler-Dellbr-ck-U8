# Auftrag (v3): Komplett-Überarbeitung — U9-Adler-App (index.html + sw.js)

> Entscheidungen von Charles (verbindlich): Tom & Fabio OHNE TW-Option · neuer PIN 1922 (Hash unten in B7 fertig eingetragen) · Block I (Supabase RLS + Login) wird JETZT umgesetzt, nicht optional.

Du arbeitest an einer Single-File-PWA (`index.html` + `sw.js`) für einen Jugendfußball-Verein (SV Adler Dellbrück, U9, 4+1 Raute). Zwei Modi: Trainer-App (blau, PIN-Gate) und Kinder-Quiz (grün, via `?quiz`). Backend: Supabase REST (`spielerprofile`, `quiz_progress`, `trainingsformen`).

Im selben Ordner liegen vier vorbereitete, bereits verifizierte Dateien:

| Datei | Zweck |
|---|---|
| `TQ_SCENARIOS_FIXED.js` | Vollständiger Ersatz für die 100 Quiz-Szenarien |
| `sw.js` | Vollständiger Ersatz für den Service Worker |
| `DIMS_FELD_KOMPAKT.js` | Vollständiger Ersatz für die Feldspieler-Kriterien (37 statt 48) |
| `NEUE_TRAININGSFORMEN.js` | 12 neue Trainingsformen (8× Mindset, 4× TW-Basics) zum Anhängen |

Arbeite die Blöcke in Reihenfolge ab (A → J). Nach jedem Block kurz testen. Ändere nichts, was hier nicht beschrieben ist. Zeilenangaben sind ca.-Werte der Original-index.html — suche im Zweifel nach dem zitierten Code.

---

## BLOCK A — Datei-Ersetzungen

### A1: `sw.js` komplett ersetzen
Gesamten Inhalt durch die beigelegte `sw.js` ersetzen. Änderungen: Cache-Name `u9i-adler-v10`, `ignoreSearch:true` (installierte Quiz-App startet mit `./?quiz` und fand `./` bisher nicht), Offline-Fallback auf `./index.html` bei Navigationen (bisher konnte `respondWith` mit `undefined` enden), Font-/Icon-Dateien (woff2) werden beim Install aus den CSS-Dateien extrahiert und mitgecacht.

### A2: `TQ_SCENARIOS` komplett ersetzen
In `index.html` von `const TQ_SCENARIOS=[` (ca. Z. 2540) bis einschließlich des schließenden `];` (vor `const TQ_BLOCKS=[`, ca. Z. 4800) durch den Inhalt von `TQ_SCENARIOS_FIXED.js` ersetzen. Korrigiert (automatisch verifiziert, 0 Regelverstöße): 21 komplett + ~60 teilweise triviale Szenarien (152 Startpositionen so versetzt, dass `dist(Start, Ziel) > r+5` für jeden beweglichen Zielspieler gilt — Bewegungsrichtung bleibt erhalten); vertauschungssichere Zielzonen (Paar-Abstand ≥ max(r1,r2)+3; 51 Radien reduziert, Minimum 10; 4 Zielpaare gespreizt); Gegner-Labels (19× "TW"→"Geg. TW", 1× "⚡"→"Gegner").
**Neu in v3 (bereits in der Datei enthalten):** (a) Die 100 Szenarien wurden thematisch NEU GEORDNET, sodass jeder Block exakt zu seinem Titel passt — vorher verschoben sechs "Legacy"-Szenarien am Anfang alle Themenketten, sodass z. B. Block 4 "Spielaufbau" vier Flügelspiel-Szenarien und Block 7 "Torwartspiel" vier Ballbesitz-Szenarien enthielt. Die Block-Kommentare in der Datei markieren die neuen Grenzen; das komplette Mapping (neue Pos ← alte Pos) steht in `patch_log.txt`. Gespeicherter Kinder-Fortschritt (Punktzahlen pro Block) bleibt gültig, bezieht sich aber künftig auf die neuen Inhalte — das ist akzeptiert. (b) Kindersprache geglättet: "Staffelung" (3×) → "einer bleibt immer dahinter"/"Absicherung dahinter", "Passoptionen" → "Passwege". Die bewusste Teamsprache (ADLER, IGEL, kompakt, Überzahl) bleibt unverändert.
Bewusst NICHT geändert: zentrale Aufpasser-Ziele in den Pressing-/Langball-/gegnerischer-Abstoß-Szenarien (vormals #10/#27/#34/#51 (Pressing/Langball/gegnerischer Abstoß — dort fachlich korrekt; die Anspielpositions-Regel gilt nur für eigenen Spielaufbau und ist in #5/#32/#36/#57/#63/#65/#92 erfüllt).

### A3: `DIMS_FELD` komplett ersetzen
Von `const DIMS_FELD=[` (ca. Z. 905) bis einschließlich `];` (direkt vor dem Kommentar `/* TW-Kriterien`) durch den Inhalt von `DIMS_FELD_KOMPAKT.js` ersetzen. `DIMS_TW` bleibt unverändert.
Inhalt: 37 statt 48 Kriterien (−23 % Bewertungsaufwand). Gestrichen wurden ausschließlich Kriterien, die (a) inhaltlich in anderen aufgehen und (b) nachweislich nirgends in Algorithmen oder Fazit-Generatoren referenziert werden: `m_t1, m_t4, m_k5, m_p1, m_p3, m_p4, t_auftreten, m_m1, m_m4, m_m8, m_m9`. Deren Aspekte stecken jetzt in erweiterten Hilfetexten der verbleibenden Kriterien. Alte Snapshots bleiben kompatibel: gespeicherte `radios` mit gestrichenen Keys werden beim Laden einfach ignoriert (Selektor findet kein Element), gespeicherte `scores` sind eingefroren.

### A4: Neue Trainingsformen anhängen
Den Inhalt von `NEUE_TRAININGSFORMEN.js` ans ENDE des `TRAININGSFORMEN`-Arrays einfügen (nach dem letzten Objekt, vor `];` — Komma nach dem bisherigen letzten Objekt ergänzen). 12 Formen: 8× neue Kategorie `mindset` (Growth Mindset/Dweck, Reset-Routinen, Positive Psychologie, Kapitänsrotation nach Plan-Do-Review, Druckgewöhnung, Fehlerkultur nach Horst Wein, Selbstgespräch) und 4× TW-Basics (W-Haltung/Korbfangen, Fußarbeit, angstfreie Fallschul-Vorstufe, TW-Rotation gemäß DFB-Empfehlung).

---

## BLOCK B — Kritische Code-Fixes

### B1: Quiz-PWA-Manifest wird vom Trainer-Manifest überschrieben
**Ort:** IIFE unter Kommentar `PWA SETUP` (ca. Z. 6918).
**Problem:** Läuft ohne `?quiz`-Guard NACH der Quiz-IIFE und überschreibt `#pwa-manifest.href` + `#apple-icon.href` → installierte Quiz-App bekommt immer blaues Trainer-Icon/-Name; Install-Banner erscheint im Quiz mit Trainer-Branding.
**Fix:** Als allererste Zeilen der IIFE:
```js
if(new URLSearchParams(location.search).has("quiz")){
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
  return;
}
```

### B2: Geister-Gegner aus dem vorherigen Szenario
**Ort:** `tqLoadScenario` (ca. Z. 5077): `taktikRender();` steht VOR `tqCurrentOpps=sc.opps||[];`.
**Problem:** `taktikRender` zeichnet bei aktivem Quiz die Gegner aus `tqCurrentOpps` — zu diesem Zeitpunkt noch die des VORHERIGEN Szenarios; danach hängt der manuelle Block die neuen zusätzlich an → ab Frage 2 alte + neue Gegner gleichzeitig sichtbar.
**Fix:** `tqCurrentOpps=sc.opps||[];` direkt VOR `taktikRender();` verschieben. Den manuellen `if(sc.opps){...}`-Block ersetzen (übernimmt nur noch die Einlauf-Animation der bereits gerenderten Tokens):
```js
if(sc.opps){
  const oppEls=tokensEl.querySelectorAll(".tb-opp");
  sc.opps.forEach((o,oi)=>{
    const el=oppEls[oi];
    if(!el||!o.to)return;
    el.style.left=o.x+"%";el.style.top=o.y+"%";
    el.style.setProperty("--sfx",o.x+"%");el.style.setProperty("--sfy",o.y+"%");
    el.style.setProperty("--stx",o.to.x+"%");el.style.setProperty("--sty",o.to.y+"%");
    el.classList.add("tq-anim-tok");
    el.addEventListener("animationend",()=>{el.style.left=o.to.x+"%";el.style.top=o.to.y+"%";el.classList.remove("tq-anim-tok");},{once:true});
  });
}
```

### B3: Doppelzählung "Überspringen" nach "Prüfen"
**Ort:** `tqSkip` (ca. Z. 5208), `tqCheck` (ca. Z. 5161).
**Fix:** `tqSkip` → `function tqSkip(){ if(tqChecked){tqNext();return;} tqTotal++; tqNext(); }`. Zusätzlich: Überspringen-Button in `tqLoadScenario` mit id `tq-skip-btn` versehen und in `tqCheck` analog zum Prüfen-Button disablen.

### B4: Tap-to-Move am Desktop kaputt
**Ort:** Feld-Click-Handler im `DOMContentLoaded`-Listener (ca. Z. 4821).
**Problem:** Bei Maus feuert nach `mouseup` (Token-Selektion) ein `click`, der zum Feld bubbelt → Handler bewegt den Token an dieselbe Stelle und deselektiert sofort. Mit Maus funktioniert die Auswahl nie (Quiz-Link wird an Eltern geteilt!).
**Fix:** Erste Zeile im Click-Handler: `if(e.target.closest(".tb-token"))return;`

### B5: Chart.js-Race "Canvas is already in use"
**Ort:** `buildDims` setTimeout (ca. Z. 1577), `updateLiveRadar` (ca. Z. 1420), Auslöser `loadPlayerToForm` → `onChange()`.
**Fix:** Im setTimeout von `buildDims` nach `const ctx=...;if(!ctx)return;` einfügen:
```js
if(liveChart)return;
const existing=Chart.getChart(ctx);
if(existing)existing.destroy();
```

### B6: Stored XSS über Inline-Handler und unescapte DB-Felder
**Ort:** `renderKader` (ca. Z. 1729–1770), `renderProfil` (ca. Z. 1838–1910), `renderVerlauf` (ca. Z. 1921–1975).
**Problem:** Tabelle ist mit dem öffentlich sichtbaren Anon-Key beschreibbar; eine Zeile mit `trainer`/`name` = `"><img src=x onerror=alert(1)>` wird beim Rendern ausgeführt: `onclick='loadPlayerToForm(${JSON.stringify(lat)...})'` bzw. `onclick="delPlayer('${name}')"` interpolieren Daten in Attribute; `datum/trainer/sek_rolle/prim_rolle/summary/fazit` werden ohne `esc()` gerendert.
**Fix (zwei Teile):**
1. Inline-Handler mit Daten eliminieren — Buttons bekommen nur `data-`Attribute, ein einmalig registrierter delegierter Listener ruft die Funktionen:
```js
document.addEventListener("click",e=>{
  const editBtn=e.target.closest("[data-edit-player]");
  if(editBtn){const n=editBtn.dataset.name,idx=parseInt(editBtn.dataset.snapIdx);const snap=DB[n]&&DB[n][idx];if(snap)loadPlayerToForm(snap);return;}
  const delBtn=e.target.closest("[data-del-player]");
  if(delBtn){delPlayer(delBtn.dataset.name);return;}
  const delSnapBtn=e.target.closest("[data-del-snap]");
  if(delSnapBtn){delSnapshot(delSnapBtn.dataset.name,delSnapBtn.dataset.datum,delSnapBtn.dataset.id);return;}
});
```
Beim Rendern Attribute immer mit `esc()` befüllen, z. B. `data-edit-player data-name="${esc(name)}" data-snap-idx="${DB[name].length-1}"`. In `renderVerlauf` den Snapshot-Löschbutton auf `data-del-snap data-name data-datum data-id` umstellen.
2. Ausnahmslos jedes DB-Feld in `renderKader`, `renderProfil`, `renderVerlauf`, `renderRauteMap` durch `esc()` schicken: `datum, trainer, sek_rolle, prim_rolle, position, summary, fazit, notes`.

### B7: PIN härten
**Ort:** `PIN_HASH` (ca. Z. 6650) — aktueller Wert ist der SHA-256 von "1234" (per Google in Sekunden rückführbar).
**Fix:** `PIN_HASH` ersetzen durch den fertigen Hash des neuen PINs 1922:
```js
const PIN_HASH="2c1f3f5f6523af84fde4af934caa1126ae6bcebacd36e397fbddcb8a620c1d73"; // SHA-256("1922") – PIN ist nur UI-Sichtschutz, echte Zugriffskontrolle: Supabase RLS (Block I)
```
Zusätzlich (Usability): Session von `sessionStorage` auf `localStorage` mit Ablauf-Timestamp (30 Tage) umstellen, damit nicht bei jedem App-Öffnen der PIN nötig ist.

---

## BLOCK C — Wichtige Fixes

### C1: `renderVerlauf` crasht bei kaputter `scores`-Zeile
Vier ungeschützte `JSON.parse(...)` (ca. Z. 1929/1941/1945/1963). Helfer neben `esc` (ca. Z. 1113) einführen: `const safeParse=(s,fb)=>{try{return s?JSON.parse(s):fb}catch(e){return fb}};` und ALLE `scores`-/`radios`-Parsings der App (auch renderKader/renderProfil/getPlayerData/loadPlayerToForm) darauf umstellen.

### C2: `attendance` wird nie gespeichert
`getMeta` (ca. Z. 1125) hat kein `att` → Potenzialformel läuft immer neutral, Spalte bleibt leer; `loadPlayerToForm` referenziert nicht existierendes `#p-att`. Fix: Segmented Control "Trainingsbeteiligung" (id `p-att`, Werte 1/2/3, Default 2, Labels "Selten / Regelmäßig / Fast immer") neben `p-eltern` ins Formular; in `getMeta`: `att:document.getElementById("p-att")?.value||"2",`; in `clearForm` zurücksetzen.

### C3: Quiz-Sync erzeugt Duplikate
`tqSyncToSupabase` (ca. Z. 4866): URL auf `${SB_URL}/rest/v1/quiz_progress?on_conflict=player,block` ändern. Zugehöriger Unique-Constraint: Block I.

### C4: Quiz-Buttons zu klein für Kinderfinger
`.btn-sm` ist ~26 px hoch. CSS ergänzen: `#tq-panel .btn,#tq-panel .btn-sm{min-height:44px;padding:10px 16px;font-size:13px}`

### C5: Kaputtes SVG + Abkürzung in Trainingsformen
In `tf003` alle `fill="1"` → `fill="#4ade80"` (4 Kreise, 4 Texte). In `tf002` und `tf003` die SVG-Labels `>Auf.<` → `>Aufpasser<` (ggf. font-size des `<text>` auf 7).

### C6: Partial-Feedback im Quiz aktivieren
In `tqCheck` dritten Zweig für `hits>0 && hits<total` mit der vorhandenen Klasse `tq-feedback partial` ("💪 Fast! X/Y richtig." + `tqShowSolution(sc)`); kein Punkt, aber wärmer als komplett rot.

### C7: `tqShowSolution` zeigt nur erste Alternative
Über alle Alternativen iterieren; erste mit `opacity:1`, weitere `.5` (Code-Muster siehe v1-Snippet, sinngemäß umsetzen).

### C8: Gegner-Fallback "G"
Beide `o.label||"G"` (in `taktikRender` ca. Z. 2373 und `tqLoadScenario` ca. Z. 5117, letzterer entfällt ggf. durch B2) → `o.label||"Gegner"`.

### C9: Doppelklick-Schutz `savePlayer`
Speichern-Button beim Start disablen, in `finally` reaktivieren.

---

## BLOCK D — Kader & Trainerteam

### D1: Spieler Tom und Fabio ergänzen
In `KADER` (ca. Z. 883) zwei Einträge anhängen:
```js
  {name:"Tom",    tw:false, twPrio:0},
  {name:"Fabio",  tw:false, twPrio:0}
```
Entschieden: Tom und Fabio haben KEINE TW-Option — die Werte oben sind final.
Alle Kader-abhängigen Ansichten (Selects, Anwesenheit, Quiz-Spielerwahl, Taktikbank) speisen sich aus `KADER` — keine weiteren Änderungen nötig.

### D2: Trainerliste zentralisieren + Finn ergänzen
Die Trainer sind aktuell DREIFACH hart codiert (Select `#p-trainer` ca. Z. 575, Checkboxen `#tp-trainer-checks` ca. Z. 825, `#aw-trainer-checks` ca. Z. 842) — und Finn fehlt überall. Fix:
1. Konstante neben `KADER` einführen: `const TRAINER=["Sandy","Charles","Finn","Kenneth","Peter"];`
2. Die drei HTML-Blöcke leeren und beim Init dynamisch aus `TRAINER` befüllen (Select-Options bzw. `label.tp-check`-Checkboxen im vorhandenen Markup-Stil; in `#tp-trainer-checks` Sandy+Charles `checked` wie bisher).
3. `loadPlayerToForm`-Default `"Sandy"` bleibt.

---

## BLOCK E — Trainings-Bibliothek: Sichtbarkeit & Kategorien

### E1: Fehlende Filter-Buttons (30 Formen sind aktuell unauffindbar!)
Die Filterleiste (ca. Z. 762–769) hat keine Buttons für `torwart` (15 Formen) und `individual` (15 Formen). Ergänzen — inkl. neuer Kategorie:
```html
<button class="ftag" onclick="setTF('torwart',this)">Torwart</button>
<button class="ftag" onclick="setTF('individual',this)">Individual</button>
<button class="ftag" onclick="setTF('mindset',this)">Mindset</button>
```
Prüfen, dass `renderTraining`/`setTF` per `kat`-Vergleich filtern (tun sie) — dann funktionieren die neuen Buttons ohne weitere Änderung.

### E2: Kategorie-Select für eigene Formen vervollständigen
`#tf-kat` (ca. Z. 784) um fehlende Optionen ergänzen: `aufwaermen` ("Aufwärmen"), `torwart` ("Torwart"), `individual` ("Individual"), `mindset` ("Mindset & Selbstvertrauen").

### E3: Mindset in der Trainingsplanung anbieten
In der Planung (`tpFilteredOpts`, Slot-Typen) prüfen, wie Kategorien zu Slot-Typen gemappt werden. `mindset`-Formen sollen (a) im "main"-Pool auswählbar sein und (b) die drei Ritual-Formen ("Die Kraft des NOCH", "Reset-Knopf", "Drei-gute-Dinge-Kreis") zusätzlich als optionaler fester Abschluss-/Regel-Hinweis in der generierten Einheit erscheinen: In `tpGenerate` am Ende der Timeline eine kleine Box "Mindset-Baustein des Tages" rendern, die zufällig eine der drei Ritual-Formen vorschlägt (nur Name + Kurz-Text + Link zur Form).

---

## BLOCK F — Spielerprofil: Algorithmen

### F1: Potenzial darf nicht unter Niveau fallen
`calcPotenzial` (ca. Z. 1157): Bei `lm=1.00, am=0.97` kann pot < total werden ("Potenzial 62 %" unter "Niveau 65 %" ist unplausibel). Letzte Zeile ändern zu:
```js
return Math.min(100,Math.max(total,Math.round(total*lm*am+nb+db)));
```

### F2: Rollen-Vorschau bei unvollständiger Bewertung stabilisieren
`calcRolle` (ca. Z. 1169) wertet fehlende Kriterien als 0 (= schlechtester Wert) → die Live-Rollenvorschau springt beim Ausfüllen wild. Fix: `calcRolle` bekommt optionalen Parameter `neutralMissing=false`; wenn true, liefern `tn`/`mn` bei fehlendem Wert 50 statt 0. `updateRautePreview`-Pfad (Aufruf in `onChange`/`updateLiveRadar`-Kette) ruft mit `true` auf, `savePlayer`/`getPlayerData` weiterhin ohne (dort ist alles ausgefüllt). Zusätzlich in der Vorschau: solange `countFilled()<totalCrit()`, hinter dem Rollen-Hint " (vorläufig)" anzeigen.

### F3: Konsistenz nach Kriterien-Straffung verifizieren
Nach A3 einmal gegenprüfen (Suche im Code), dass keine gestrichenen Keys (`m_t1, m_t4, m_k5, m_p1, m_p3, m_p4, t_auftreten, m_m1, m_m4, m_m8, m_m9`) mehr außerhalb alter Daten referenziert werden — Stand der Analyse: keine Treffer in `calcRolle`, `calcScores`, `calcPotenzial`, `socialScore`, `complementScore`, `generateFazitFeld`, `generateFazitTW`. Sollte doch ein Treffer auftauchen: melden, nicht raten.

---

## BLOCK G — Team-Modul: Planen, Kommunizieren, Auswerten

Ziel: Das Trainerteam (Sandy, Charles, Finn + Väter) arbeitet auf EINER Datenbasis. Aktuell liegen Anwesenheit (`AW_DATA`) und Trainings-Nachbewertung (`EVAL_DATA`) nur im localStorage des jeweiligen Geräts — Sandy sieht Charles' Einträge nicht.

### G1: Anwesenheit & Nachbewertung nach Supabase syncen (local-first)
Zwei Tabellen (SQL in Block I): `anwesenheit(datum text primary key, data jsonb, updated_at timestamptz default now())` und `trainings_eval(datum text primary key, data jsonb, updated_at timestamptz default now())`.
Implementierung nach dem Muster von `tqSyncToSupabase`/`tqLoadProgressFromSupabase`:
- `awSave`/`evalSave`: nach dem localStorage-Write ein Upsert (`?on_conflict=datum`, `Prefer:resolution=merge-duplicates`) mit `{datum, data}`.
- Beim App-Start (nach `loadDB`) beide Tabellen laden und mit localStorage mergen (bei Konflikt gewinnt der Datensatz mit jüngerem `updated_at`; lokal fehlende Daten übernehmen). Fehler still schlucken (offline-fähig bleiben).

### G2: Team-Pinnwand (Kommunikation)
Neuer Bereich für kurze Team-Notizen ("Donnerstag fällt aus", "Hugo fehlt 2 Wochen", Beobachtungen aus dem Drei-gute-Dinge-Kreis). Tabelle: `team_notizen(id bigint generated always as identity primary key, autor text, text text, pinned boolean default false, created_at timestamptz default now())`.
UI: In der Training-View einen vierten Sub-Tab "Team" ergänzen (`switchTrainSub('team')`): oben Eingabe (Autor-Select aus `TRAINER` + Textfeld + Senden), darunter Liste (gepinnte zuerst, dann chronologisch absteigend, max. 50 laden), pro Notiz: Autor, Datum, Text (mit `esc()`!), Pin-Toggle, Löschen (mit confirm). Alles über die Supabase-REST-API im Stil der bestehenden Fetches.

### G3: Geplante Einheiten speichern & teilen
Die Trainingsplanung (tp*) ist aktuell flüchtig — beim Neuladen ist der Plan weg, und er erreicht die Co-Trainer nicht.
1. Tabelle `einheiten(datum text primary key, plan jsonb, trainer jsonb, updated_at timestamptz default now())`. Buttons "Plan speichern" (serialisiert `tpSlots` + gewählte Übungen + Trainer-Checks als jsonb, Upsert per `on_conflict=datum` auf ein Datumsfeld, das über dem Zeitplan ergänzt wird) und "Plan laden" (Datum wählen → Slots/Selects wiederherstellen).
2. Button "Einheit teilen": erzeugt aus der aktuellen Timeline einen kompakten Text (Datum, Trainer, pro Slot: Zeit, Übungsname, Kurzbeschreibung, Coaching-Kernpunkt) und ruft `navigator.share` auf (Fallback: Modal mit Kopieren + WhatsApp-Link, exakt nach dem Muster von `tqShareQuiz`).

### G4: Auswertung bündeln
Die Bausteine existieren (Anwesenheits-Statistik, Nachbewertung, Quiz-Ergebnisse, Verlauf) — nach G1 sind sie teamweit. Ergänzend im "Team"-Tab oben eine kompakte Kachel-Zeile: letzte Einheit (Datum + Ø-Nachbewertung), Anwesenheitsquote letzte 4 Termine, Anzahl Spieler ohne Bewertung seit > 8 Wochen (aus `DB` berechnet; Klick springt in die Bewertung). Keine neuen Daten — nur Aggregation Vorhandener.

---

## BLOCK H — Usability

1. **Nav-Label:** "Bew." (ca. Z. 554) → "Bewerten". Reihenfolge der Bottom-Nav ändern zu: Bewerten · Kader · Training · Taktik · Profil · Verlauf · Kombi (häufig Genutztes nach vorn).
2. **Anwesenheit Datums-Default:** `#aw-date` beim Init auf heute setzen (`new Date().toISOString().slice(0,10)`) — aktuell rendert die Liste unter leerem Key.
3. **Planungsdauer wählbar:** Die "75 Min."-Überschrift + Timeline-Berechnung um ein Select (60/75/90, Default 75) ergänzen; `tpRenderTimeline` nutzt den Wert.
4. **Bewertungsformular:** Nach A3 sind es 37 Kriterien; zusätzlich in jedem `dim-head` den Fortschritt (dpill) farblich auf grün stellen, wenn die Dimension vollständig ist (Klasse ergänzen) — schnelleres Erfassen, was noch offen ist.
5. **PIN-Komfort:** siehe B7 (localStorage + 30-Tage-Ablauf statt sessionStorage).
6. **`aw-date` & Co. auf Mobil:** prüfen, dass alle neuen Bedienelemente (Team-Tab, Plan speichern/teilen) mindestens 44 px Höhe haben (`.btn` reicht, `.btn-sm` in neuen UIs vermeiden).

---

## BLOCK I — Supabase (SQL)

> Wenn du Zugriff auf das Supabase-Projekt hast (MCP/CLI): ausführen. Sonst als `supabase_fixes.sql` ins Projekt legen und Charles auf den SQL-Editor verweisen. Kontext: Die App speichert Bewertungen von Kindern; aktuell sind die Tabellen mit dem öffentlich sichtbaren Anon-Key les-/schreib-/löschbar (auch DSGVO-relevant). Dies ist das gravierendste Einzelproblem der App.

```sql
-- 1) Unique-Constraint für Quiz-Upsert (Voraussetzung für C3)
alter table quiz_progress
  add constraint quiz_progress_player_block_key unique (player, block);

-- 2) Neue Tabellen (Block G)
create table if not exists anwesenheit (
  datum text primary key, data jsonb, updated_at timestamptz default now());
create table if not exists trainings_eval (
  datum text primary key, data jsonb, updated_at timestamptz default now());
create table if not exists team_notizen (
  id bigint generated always as identity primary key,
  autor text, text text, pinned boolean default false,
  created_at timestamptz default now());
create table if not exists einheiten (
  datum text primary key, plan jsonb, trainer jsonb, updated_at timestamptz default now());

-- 3) RLS
alter table spielerprofile  enable row level security;
alter table quiz_progress   enable row level security;
alter table trainingsformen enable row level security;
alter table anwesenheit     enable row level security;
alter table trainings_eval  enable row level security;
alter table team_notizen    enable row level security;
alter table einheiten       enable row level security;

-- 4) Policies
-- Quiz: anon darf lesen/upserten (geräteübergreifender Kinder-Fortschritt,
-- enthält nur Vornamen + Punktzahlen); löschen nur authentifiziert.
create policy "quiz select anon" on quiz_progress for select to anon using (true);
create policy "quiz insert anon" on quiz_progress for insert to anon with check (true);
create policy "quiz update anon" on quiz_progress for update to anon using (true) with check (true);
create policy "quiz delete auth" on quiz_progress for delete to authenticated using (true);

-- Kinderdaten & Teamdaten: NUR authentifizierte Trainer
create policy "profile auth"  on spielerprofile  for all to authenticated using (true) with check (true);
create policy "aw auth"       on anwesenheit     for all to authenticated using (true) with check (true);
create policy "eval auth"     on trainings_eval  for all to authenticated using (true) with check (true);
create policy "notizen auth"  on team_notizen    for all to authenticated using (true) with check (true);
create policy "einheiten auth" on einheiten      for all to authenticated using (true) with check (true);

-- Trainingsformen: lesen anon (unkritisch), schreiben nur Trainer
create policy "tf select anon" on trainingsformen for select to anon using (true);
create policy "tf write auth"  on trainingsformen for all to authenticated using (true) with check (true);
```

**App-Anpassung (nach RLS zwingend):** Minimal-Login per Supabase Auth:
1. Nach dem PIN-Gate (nicht im `?quiz`-Modus): liegt kein gültiges `sb_access_token` in localStorage, kleines Login-Formular zeigen; POST `${SB_URL}/auth/v1/token?grant_type=password` (Header `apikey:SB_KEY`), `access_token` + `expires_at` speichern.
2. Alle Fetches auf `spielerprofile`, `anwesenheit`, `trainings_eval`, `team_notizen`, `einheiten` sowie die DELETEs in `tqDoReset` senden `Authorization: Bearer ${accessToken}` (Header `apikey: SB_KEY` bleibt). Quiz-Sync (`quiz_progress` upsert/select) bleibt beim Anon-Key.
3. Bei 401: Token verwerfen, Login zeigen.
4. Trainer-Accounts legt Charles im Dashboard an (Authentication → Users): Sandy, Charles, Finn.
> Block I ist VERBINDLICH (Entscheidung Charles). Reihenfolge: erst SQL ausführen/bereitstellen, dann den Auth-Umbau in der App, dann erst die abhängigen Blöcke testen. Trainer-Accounts (Sandy, Charles, Finn) legt Charles im Dashboard an — im Abschlussbericht daran erinnern.

---

## BLOCK J — Aufräumen (nice-to-have, zum Schluss)

1. Toten Code entfernen: CSS `.tq-target-ghost`/`.show` (nie verwendet), Funktion `escH` (ca. Z. 6063) löschen, Aufrufe auf `esc` umstellen.
2. `tqPersonalize`: Ersetzungen von `dir/Dir/dich` streichen ("Merke es dir" darf nicht zu "Merke es Hugo" werden); nur `Du/du`→Name und `Dein`→`${tqPlayer}s` behalten.
3. localStorage-Keys (`adler_quiz_progress`, `adler_anwesenheit`, `adler_training_eval`) NICHT umbenennen — Bestandsdaten erhalten.
4. Cache-Name-Referenzen: nur in sw.js (durch A1 erledigt), im HTML nichts anfassen.

---

## BLOCK K — Quiz: Haptik, Feedback & Motivation

Ziel: Das Quiz fühlt sich für 8–9-Jährige wie ein kleines Spiel an, nicht wie eine Prüfung. Alle Punkte sind rein clientseitig, keine neuen Abhängigkeiten/Pakete.

### K1: Einmaliges Einsteiger-Overlay ("So geht's")
Beim allerersten Blockstart auf einem Gerät (localStorage-Flag `adler_quiz_tutorial_done`) ein halbtransparentes Overlay über dem Feld zeigen: großes 👆-Emoji tippt animiert (CSS keyframes) erst auf einen Beispiel-Token, dann auf eine Feldstelle; Text in zwei kurzen Zeilen: "1. Tippe einen Spieler an" / "2. Tippe dahin, wo er hinlaufen soll". Button "Los geht's!" (min. 48px) schließt und setzt das Flag. Auch Drag bleibt möglich — das Overlay erklärt nur den Tap-Weg.

### K2: Vibrations-Feedback (Feature-Detect)
Wo `navigator.vibrate` existiert (Android): `vibrate(25)` bei Token-Auswahl, `vibrate([40,60,40])` bei komplett richtig, `vibrate(80)` bei falsch, `vibrate([30,50,30,50,120])` bei Blockabschluss. Immer in `try{}catch{}`, niemals blockierend. iOS ignoriert das stillschweigend — kein Fallback nötig.

### K3: Konfetti bei starkem Blockabschluss
In `tqShowResult` bei ≥ 70 %: 40–60 kleine absolut positionierte DIVs (8×8px, Teamfarben #1a56db/#059669/#fbbf24/#f87171) mit zufälligen CSS-Animationen (translateY + rotate, 1,5–2,5 s, danach `remove()`). Eine kleine Helper-Funktion `confetti(container)`, ~25 Zeilen, kein Paket. `prefers-reduced-motion` respektieren (dann kein Konfetti).

### K4: Medaillen statt Haken
Blockkarten (`tqStart`) und Trainer-Tabelle (`tqRenderTrainerView`) zeigen statt nur "✅ ab 7/10" gestufte Medaillen: 🥉 ab 5, 🥈 ab 7, 🥇 ab 9 richtigen Antworten. Auf der Blockkarte neben dem Titel, in der Trainer-Tabelle als Zell-Suffix. Das bestehende `done`-Kriterium (score>=7) bleibt für den Abgehakt-Look.

### K5: Gesperrte Spieler klarer kennzeichnen
Gesperrte Tokens im Quiz bekommen zusätzlich zu `opacity:.5` ein kleines 🔒-Badge (absolut positioniert, oben rechts am Token, font-size 10px) und `filter:grayscale(.6)`. Kinder verstehen sofort: dieser Spieler bleibt stehen.

### K6: Sticky Aufgaben-Chip über dem Feld
Der Task-Text steht aktuell im Panel über dem Feld — beim Scrollen zum Feld verschwindet die Aufgabe. Fix: kompakter Chip (`position:sticky;top:0;z-index:30`, dunkler Hintergrund, weiße Schrift, max. 2 Zeilen) direkt über dem Spielfeld, der immer sichtbar bleibt. Inhalt: der task-Text; sobald ein Token ausgewählt ist, wechselt der Chip zu "▶ {Rolle} ausgewählt — tippe aufs Feld!". Nach Deselect/Move zurück zum Task.

### K7: Belohnungs-Animation bei "richtig"
In `tqCheck` bei `hits===total`: alle Ziel-Spieler-Tokens mit CSS-Transition (0,5 s ease-out) sanft in die exakten Zielzentren gleiten lassen (bei Alternativ-Zielen: das nächstgelegene) — das Kind sieht zum Abschluss das perfekte Rautenbild. Danach kurzer Puls (scale 1→1.15→1) auf allen Tokens.

### K8: Quiz-Typografie für Kinderaugen
Nur innerhalb `#tq-panel` / Quiz-Kontext: `.tq-situation` 13→15px, `.tq-hint` 11→12.5px, Feedback-Text 12→13.5px, der 👆-Bedienhinweis 10→12px. Zeilenhöhe 1.5 beibehalten.

---

## BLOCK L — Optik & Anwendbarkeit (Trainer-App)

### L1: Trikotnummern
`KADER` um `nr` erweitern (Platzhalter 2–16, Kommentar "// TODO Charles: echte Nummern eintragen"). Anzeige: (a) auf Taktik-/Quiz-Tokens klein über dem Namen (`.tb-nr`, 8px, halbtransparent), (b) im Quiz-Spieler-Grid unter dem Namen, (c) in der Kader-Tabelle vor dem Namen als dezente Badge. Fehlende `nr` → einfach nicht rendern.

### L2: Lade-Skeletons
`loadDB` dauert sichtbar; statt leerer Views beim ersten Öffnen von Kader/Profil/Kombi drei graue Skeleton-Zeilen (CSS `animation: pulse`) zeigen, bis `DB` gefüllt ist. Eine wiederverwendbare CSS-Klasse `.skeleton` + kleine Render-Guards.

### L3: Sticky Sub-Tabs & Filter
In der Training-View die Sub-Tab-Leiste (`.sub-tab`-Zeile) und in der Formen-Bibliothek die Filterleiste `position:sticky;top:0;background:var(--bg);z-index:20` machen — bei 104 Formen scrollt man sonst ständig hoch.

### L4: Sync-Status mit Zeitstempel
Der Verbindungspunkt (`cdot`/`clbl`) zeigt nur "Live/Offline". Nach jedem erfolgreichen `loadDB` einen Zeitstempel merken und als `title`-Tooltip + beim Antippen als Toast anzeigen: "Zuletzt synchronisiert: 14:32". Bei Offline: "Offline — Daten vom Gerät".

### L5: Daten-Backup
Im neuen Team-Tab (Block G2) einen Button "Backup herunterladen": lädt `spielerprofile`, `quiz_progress`, `anwesenheit`, `trainings_eval`, `team_notizen`, `einheiten` (authentifiziert) und speichert alles als eine JSON-Datei `adler-backup-YYYY-MM-DD.json` (Blob + Download-Link). Kein Import nötig — reine Sicherung.

### L6: Fokus-Sichtbarkeit
Für Tastatur-/Switch-Bedienung: globale Regel `:focus-visible{outline:2px solid var(--blue);outline-offset:2px}` — kostet nichts, hilft der Zugänglichkeit.

### L7: Vereins-Branding-Platzhalter
In der Topbar neben dem Logo-Icon einen optionalen `<img id="club-logo">`-Slot (display:none, Kommentar "// Charles: Vereinslogo-URL eintragen") und eine CSS-Variable `--club-accent` (Default = `--blue`), die für Topbar-Unterkante und aktive Nav-Farbe genutzt wird. So kann Charles später Adler-Branding einschalten, ohne Code anzufassen.

---

## Abschlusstest (durchführen und Ergebnis berichten)

1. Kein Konsolen-Fehler beim Laden von `./` und `./?quiz`.
2. Quiz Block 1: keine Geister-Gegner ab Frage 2; kein Szenario ohne Bewegung voll lösbar; Überspringen nach Prüfen zählt nicht doppelt; Tap-to-Move mit Maus UND Touch; Teil-Treffer zeigen gelbes Partial-Feedback.
3. `?quiz` im Inkognito-Fenster: Manifest heißt "Taktik-Quiz U9 I …" (grün) im DevTools-Application-Tab.
4. Offline (DevTools → Network offline): `./` und `./?quiz` laden mit Schrift + Icons.
5. Trainer-App: Spieler laden → kein "Canvas is already in use"; Bewertungsformular zeigt 37 Kriterien; neues Feld Trainingsbeteiligung wird gespeichert (`attendance` in der Antwort-Row); Potenzial ≥ Niveau.
6. Kader zeigt 15 Spieler (inkl. Tom, Fabio); Trainer-Auswahlen zeigen überall Finn.
7. Training-Bibliothek: Filter Torwart (19), Individual (15), Mindset (8) liefern Treffer; neue Formen öffnen sich fehlerfrei; tf003-SVG ist grün statt schwarz.
8. Team-Tab: Notiz anlegen/pinnen/löschen funktioniert; Anwesenheit auf Gerät A gespeichert erscheint nach Reload auf Gerät B (bzw. zweitem Browserprofil); "Einheit teilen" erzeugt sinnvollen Text.
9. XSS-Test: Testdatensatz mit `trainer` = `"><img src=x onerror=alert(1)>` (per REST einfügen, danach löschen) löst in Kader/Profil/Verlauf/Team KEIN Alert aus.
10. Nach RLS: ohne Login sind `spielerprofile`-Reads 401; nach Login funktioniert alles; Quiz-Sync funktioniert weiterhin ohne Login.
11. PIN 1922 öffnet die App; falscher PIN nicht; PIN-Session übersteht App-Neustart (localStorage, 30 Tage).
12. Quiz-Haptik: Einsteiger-Overlay erscheint genau einmal pro Gerät; Blockkarten zeigen 🥉/🥈/🥇 korrekt (5/7/9); gesperrte Tokens haben 🔒; Aufgaben-Chip bleibt beim Scrollen sichtbar und wechselt bei Token-Auswahl den Text; bei voll richtig gleiten Tokens in die Zielpositionen; bei ≥70 % im Blockergebnis fällt Konfetti (außer bei prefers-reduced-motion).
13. Blockinhalte passen zu Blocktiteln (Stichprobe: Block 4 enthält nur Spielaufbau-/Passspiel-Szenarien, Block 7 nur Torwart-Szenarien); Szenario 100 ist "Endspurt – alles geben!".
14. Trikotnummern erscheinen auf Tokens, im Quiz-Spieler-Grid und in der Kader-Tabelle (Platzhalter-Nummern); Backup-Button lädt eine JSON-Datei mit allen sechs Tabellen.
