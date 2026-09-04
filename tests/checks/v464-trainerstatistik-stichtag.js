/* v464 – „gleiches gilt auch für die trainer Statistiken": die beiden Tabellen der
   Saison-Uebersicht (Spieler, Trainer) zaehlten jeden erfassten Anwesenheitstag, also
   auch Spiel- und Turniertage, und ohne Stichtag. Geprueft: beide Tabellen und die
   Serie (🔥) rechnen auf denselben Zaehltagen wie die Quote. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: u => {
      const typ = (u.searchParams.get("typ") || "").replace("eq.", "").replace(/^in\.\(|\)$/g, "");
      const alle = [{ datum: "2026-07-25", typ: "training" }, { datum: "2026-08-31", typ: "training" },
                    { datum: "2026-09-04", typ: "training" }, { datum: "2026-09-05", typ: "turnier" }];
      const g = u.searchParams.getAll("datum");
      return alle.filter(t => (!typ || typ.split(",").includes(t.typ)) &&
        g.every(x => x.startsWith("gte.") ? t.datum >= x.slice(4) : x.startsWith("lt.") ? t.datum < x.slice(3) : true));
    }
  }), hoehe: 1600 });
  const r = await s.page.evaluate(async K => {
    await loadKader();
    const tag = (namen, da, trainer) => { const o = { _trainers: trainer }; namen.forEach(n => o[n] = { da, qual: 0 }); return o; };
    // AW_DATA ist eine globale `let`-Bindung, keine window-Property – vorhandenes Objekt fuellen.
    Object.keys(AW_DATA).forEach(k => delete AW_DATA[k]);
    AW_DATA["2026-07-25"] = tag(K, true, ["Charles"]);    // vor dem Stichtag
    AW_DATA["2026-08-31"] = tag(K, true, ["Charles"]);    // Training 1
    AW_DATA["2026-09-04"] = tag(K, true, []);             // Training 2 – Charles fehlt
    AW_DATA["2026-09-05"] = tag(K, false, ["Charles"]);   // Turnier, kein Training
    if (typeof trainingstageLaden === "function") await trainingstageLaden();
    const holen = (id, fn) => { const el = document.createElement("div"); el.id = id; document.body.appendChild(el); fn(); const t = el.textContent.replace(/\s+/g, " ").trim(); el.remove(); return t; };
    const spieler = holen("aw-stats", awRenderStats);
    const trainer = holen("aw-trainer-stats", awRenderTrainerStats);
    return { tage: (typeof awZaehltage === "function") ? awZaehltage() : null,
      spieler, trainer, serie: awStreak(K[0]),
      trainerZeile: (trainer.match(/Charles\s+\d+%\s+\d+\/\d+/) || [""])[0] };
  }, K);
  const fehler = s.fehler(); await s.schliessen();
  const erwartet = ["2026-08-31", "2026-09-04"];
  if (JSON.stringify(r.tage) !== JSON.stringify(erwartet)) probleme.push(`Zähltage ${JSON.stringify(r.tage)}, erwartet ${JSON.stringify(erwartet)}`);
  // Charles: an 1 von 2 Trainings da → 50% (1/2); der Turniertag zaehlt nicht mit
  if (!/Charles 50% 1\/2/.test(r.trainerZeile)) probleme.push(`Trainer-Zeile „${r.trainerZeile}“, erwartet „Charles 50% 1/2“`);
  // Kind A: 2 von 2 Trainings da → 100%; der Turniertag (nicht da) darf die Serie nicht reissen
  if (!/100%/.test(r.spieler)) probleme.push("Spieler-Tabelle ohne 100%: " + r.spieler.slice(0, 120));
  if (r.serie !== 2) probleme.push(`Serie ${r.serie}, erwartet 2 (der Turniertag reisst keine Trainings-Serie)`);
  if (!/Spiel- und Turniertage zählen nicht mit/.test(r.trainer)) probleme.push("Trainer-Tabelle nennt die Grundlage nicht");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Zähltage ${JSON.stringify(r.tage)} · „${r.trainerZeile}“ · Serie ${r.serie}`);
  return h.ergebnis("Trainer- und Spielerstatistik zählen dieselben Trainingstage", !probleme.length, zeilen.concat(probleme));
};
