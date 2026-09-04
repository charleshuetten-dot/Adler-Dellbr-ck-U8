/* v462 – „nur die beiden Trainings dieser Woche, Spiele ab morgen neu": die Zahlen neben
   der Nominierung („Training 3/4 · 2 Einsätze") zaehlen ab einem Stichtag. Geprueft:
   Tage davor zaehlen nicht, ein Spiel-/Turniertag zaehlt nicht als Training (dort gibt es
   auch eine Anwesenheit), und die Einsaetze starten am Stichtag bei null. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    kader: h.kaderZeilen(),
    termine: u => {
      const typ = (u.searchParams.get("typ") || "").replace("eq.", "").replace(/^in\.\(|\)$/g, "");
      const alle = [{ datum: "2026-07-25", typ: "training" }, { datum: "2026-08-31", typ: "training" },
                    { datum: "2026-09-04", typ: "training" }, { datum: "2026-09-05", typ: "turnier" },
                    { datum: "2026-07-17", typ: "spiel" }];
      const g = u.searchParams.getAll("datum");
      return alle.filter(t => (!typ || typ.split(",").includes(t.typ)) &&
        g.every(x => x.startsWith("gte.") ? t.datum >= x.slice(4) : x.startsWith("lt.") ? t.datum < x.slice(3) : true));
    },
    nominierungen: [{ datum: "2026-07-17", data: { "1": "dabei", "2": "dabei" } }]   // alter Einsatz, vor dem Stichtag
  }), hoehe: 1600 });
  const r = await s.page.evaluate(async K => {
    await loadKader();
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = '<option value="2026-09-05" selected>2026-09-05</option>'; sd.value = "2026-09-05";
    const tag = (namen, da) => { const o = {}; namen.forEach(n => o[n] = { da, qual: 0 }); return o; };
    /* AW_DATA ist `let` auf oberster Ebene – eine globale Bindung, KEINE window-Property.
       `window.AW_DATA = …` legte ein zweites Objekt an, das die App nie liest. */
    Object.keys(AW_DATA).forEach(k => delete AW_DATA[k]);
    AW_DATA["2026-07-25"] = tag(K, true);   // vor dem Stichtag
    AW_DATA["2026-08-31"] = tag(K, true);   // Training 1
    AW_DATA["2026-09-04"] = tag(K, true);   // Training 2
    AW_DATA["2026-09-05"] = tag(K, false);  // Turnier – kein Training
    await teamStatsLoad();
    const q = teamTrainingsQuote(K[0]);
    // defensiv lesen, damit die Gegenprobe gegen eine aeltere Fassung Zahlen zeigt statt abzubrechen
    const kon=k=>{try{return eval("typeof "+k+'!=="undefined"?'+k+':null');}catch(e){return null;}};
    return { ab: { training: kon("STATS_AB_TRAINING"), spiel: kon("STATS_AB_SPIEL") },
      quote: q, text: teamQuoteText(K[0]).replace(/<[^>]*>/g, ""),
      tage: (typeof TEAM_TRAININGSTAGE !== "undefined" && TEAM_TRAININGSTAGE) ? [...TEAM_TRAININGSTAGE].sort() : null,
      einsaetze: (TEAM_STATS[K[0]] || {}).einsaetze, einsatzText: teamEinsatzText(K[0]).replace(/<[^>]*>/g, "") };
  }, K);
  const fehler = s.fehler(); await s.schliessen();
  if (!r.quote || r.quote.gesamt !== 2 || r.quote.da !== 2) probleme.push(`Trainingsquote ${JSON.stringify(r.quote)}, erwartet 2 von 2 (nur die Trainings ab ${r.ab.training})`);
  if (!/Training 2\/2/.test(r.text)) probleme.push("Anzeige: " + r.text);
  if (JSON.stringify(r.tage) !== JSON.stringify(["2026-08-31", "2026-09-04"])) probleme.push("geladene Trainingstage: " + JSON.stringify(r.tage));
  if (r.einsaetze !== 0) probleme.push(`Einsaetze ${r.einsaetze}, erwartet 0 (der alte Spieltag liegt vor ${r.ab.spiel})`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`ab ${r.ab.training} / ${r.ab.spiel} · „${r.text.trim()}“ · ${r.einsatzText.trim()} · Trainingstage ${JSON.stringify(r.tage)}`);
  return h.ergebnis("Zählung ab Stichtag: nur echte Trainings, Einsätze starten bei null", !probleme.length, zeilen.concat(probleme));
};
