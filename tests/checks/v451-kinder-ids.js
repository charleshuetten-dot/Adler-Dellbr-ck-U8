/* v451 – Kinder stehen in der Datenbank nach kader.id, im Speicher nach Name. Geprueft
   wird der Rand: was die App SCHICKT (nur IDs, Sonderschluessel und Trainer-Marken bleiben
   Text) und was sie aus ID-Zeilen UND alten Namens-Zeilen im Speicher macht. */
module.exports = async function (h) {
  const K = h.KINDER, probleme = [], zeilen = [];
  const idVon = n => K.indexOf(n) + 1;
  const HEUTE = h.heute(), PLAN = h.tagePlus(2);
  const DB = {
    anwesenheit: [{ datum: HEUTE, data: { _trainers: ["Trainer"], "1": { da: true, qual: 2 }, "2": { da: false, qual: 0 } }, updated_at: "2030-01-01T00:00:00Z" },
                  { datum: h.tagePlus(-7), data: { [K[2]]: { da: true, qual: 0 } }, updated_at: "2030-01-01T00:00:00Z" }],   // Altbestand mit Namen
    nominierungen: [{ datum: PLAN + "__nom", data: { "1": "dabei", "2": "nicht", [K[2]]: "dabei", _ovr: [1, K[2]] } },
                    { datum: PLAN + "__teams", data: { _anzahl: 2, _trainer: { "1": ["Trainer"] }, "1": 1, "3": 2 } }],
    trainingsgruppen: [{ datum: PLAN, gruppen: [{ emo: "🔵", name: "Blau", farbe: "#2563eb", kinder: [1, 2, K[2]], trainer: "Trainer" }], aus_anwesenheit: false }],
    trainingsturnier: [{ datum: PLAN, data: { datum: PLAN, phase: "setup", spielmodus: "kinder", anzahl: 2, spielform: "funino", felder: 1, budget: 30, modus: "rr", trainer: ["Trainer"], plan: [],
      teams: [{ name: "A", spieler: [1, 2, "🧢 Trainer"], fest: false }, { name: "B", spieler: [3, K[3]], fest: false }] } }],
    termine: [{ id: 77, datum: PLAN, typ: "training" }],
    kader: h.kaderZeilen()
  };
  const s = await h.starten({ supabase: h.supabaseAttrappe({
    anwesenheit: DB.anwesenheit, nominierungen: u => { const eq = (u.searchParams.get("datum") || ""); return DB.nominierungen.filter(r => eq.startsWith("eq.") ? r.datum === eq.slice(3) : eq.startsWith("like.") ? r.datum.startsWith(eq.slice(5).replace("*", "")) : true); },
    trainingsgruppen: DB.trainingsgruppen, trainingsturnier: DB.trainingsturnier, termine: DB.termine, kader: DB.kader }), hoehe: 1600 });
  await h.terminSetzen(s.page, PLAN);
  const r = await s.page.evaluate(async ({ K, PLAN, HEUTE }) => {
    await loadKader();
    const out = {};
    // 1) Anwesenheit: ID-Zeile und Namens-Zeile landen beide nach Name im Speicher
    window.AW_DATA = {}; localStorage.removeItem("adler_anwesenheit"); localStorage.removeItem("adler_anwesenheit_ts");
    await teamSyncLoad();
    out.awHeute = Object.keys(AW_DATA[HEUTE] || {}).sort();
    out.awAlt = Object.keys(AW_DATA[Object.keys(AW_DATA).find(d => d !== HEUTE)] || {});
    // … und zurueck: speichern schickt IDs
    let ad = document.getElementById("aw-date"); if (!ad) { ad = document.createElement("input"); ad.id = "aw-date"; document.body.appendChild(ad); } ad.value = PLAN;
    let wrap = document.getElementById("aw-list"); if (!wrap) { wrap = document.createElement("div"); wrap.id = "aw-list"; document.body.appendChild(wrap); }
    awRenderList(); wrap.querySelector(`.aw-tile[data-player="${K[0]}"]`).classList.add("on");
    await teamSyncUpsert("anwesenheit", PLAN, { _trainers: ["Trainer"], [K[0]]: { da: true, qual: 0 }, [K[1]]: { da: false, qual: 0 } });
    // 2) Nominierung + Teams
    let sd = document.getElementById("spieltag-date"); if (!sd) { sd = document.createElement("select"); sd.id = "spieltag-date"; document.body.appendChild(sd); }
    sd.innerHTML = `<option value="${PLAN}" selected>${PLAN}</option>`; sd.value = PLAN;
    await nomLoad();
    out.nom = { a: nomStatus[K[0]], b: nomStatus[K[1]], c: nomStatus[K[2]], ovr: [...nomOvr].sort(), teams: { ...TEAMS }, anzahl: TEAM_ANZAHL };
    await nomSave(); await teamsSpeichern(); await teamsZeilenSchreiben();
    // 3) Trainingsgruppen
    await tgSync(); out.tg = (tgFor() || {}).gruppen?.[0]?.kinder; tgSave(tgFor()); await new Promise(r => setTimeout(r, 1200));
    // 4) Trainingsturnier
    localStorage.removeItem("adler_blitz"); blitzOpen(); await new Promise(r => setTimeout(r, 1200));
    out.blz = BLZ.teams.map(t => t.spieler.join(","));
    BLZ.teams[0].name = "X"; blzSave(); await new Promise(r => setTimeout(r, 1600));
    // 5) Buddy-Listen
    await _kgPersist([[K[0], K[1]], [K[2], K[3]]]);
    return out;
  }, { K, PLAN, HEUTE });
  const fehler = s.fehler();
  const post = (pfad, f) => s.gesendet.filter(g => new RegExp(pfad).test(g.pfad) && (!f || f(g)));
  await s.schliessen();

  // Erwartungen
  if (JSON.stringify(r.awHeute) !== JSON.stringify(["_trainers", K[0], K[1]].sort())) probleme.push("Anwesenheit aus ID-Zeile: " + JSON.stringify(r.awHeute));
  if (JSON.stringify(r.awAlt) !== JSON.stringify([K[2]])) probleme.push("Anwesenheit aus alter Namens-Zeile: " + JSON.stringify(r.awAlt));
  const aw = post("/anwesenheit$")[0];
  if (!aw || JSON.stringify(Object.keys(aw.body.data).sort()) !== JSON.stringify(["1", "2", "_trainers"])) probleme.push("Anwesenheit geschickt: " + JSON.stringify(aw && aw.body.data));
  if (r.nom.a !== "dabei" || r.nom.b !== "nicht" || r.nom.c !== "dabei") probleme.push("Nominierung gelesen: " + JSON.stringify(r.nom));
  if (JSON.stringify(r.nom.ovr) !== JSON.stringify([K[0], K[2]].sort())) probleme.push("_ovr gelesen: " + JSON.stringify(r.nom.ovr));
  if (r.nom.teams[K[0]] !== 1 || r.nom.teams[K[2]] !== 2 || r.nom.anzahl !== 2 || "_anzahl" in r.nom.teams) probleme.push("Teams gelesen: " + JSON.stringify(r.nom.teams));
  const nomPosts = post("/nominierungen$");
  const nomGlobal = nomPosts.find(g => /__nom$/.test(g.body.datum)), nomTeams = nomPosts.find(g => /__teams$/.test(g.body.datum)), nomZeile = nomPosts.find(g => g.body.datum === PLAN);
  const nurIds = obj => Object.keys(obj).every(k => k.charAt(0) === "_" || /^\d+$/.test(k));
  if (!nomGlobal || !nurIds(nomGlobal.body.data) || !nomGlobal.body.data._ovr.every(x => typeof x === "number")) probleme.push("Nominierung geschickt: " + JSON.stringify(nomGlobal && nomGlobal.body.data));
  if (!nomTeams || !nurIds(nomTeams.body.data) || nomTeams.body.data["1"] !== 1) probleme.push("Teams geschickt: " + JSON.stringify(nomTeams && nomTeams.body.data));
  if (!nomZeile || !nurIds(nomZeile.body.data) || nomZeile.body.data["1"] !== "dabei") probleme.push("Team-Zeile geschickt: " + JSON.stringify(nomZeile && nomZeile.body.data));
  if (JSON.stringify(r.tg) !== JSON.stringify([K[0], K[1], K[2]])) probleme.push("Gruppen gelesen: " + JSON.stringify(r.tg));
  const tg = post("/trainingsgruppen$")[0];
  if (!tg || JSON.stringify(tg.body.gruppen[0].kinder) !== JSON.stringify([1, 2, 3])) probleme.push("Gruppen geschickt: " + JSON.stringify(tg && tg.body.gruppen[0].kinder));
  // Beim Oeffnen ergaenzt v440 die fehlenden Pool-Kinder – gespeicherte stehen vorn, Trainer-Marke bleibt
  if (!r.blz[0].startsWith(`${K[0]},${K[1]},🧢 Trainer`) || !r.blz[1].startsWith(`${K[2]},${K[3]}`) || r.blz.join(",").includes("#")) probleme.push("Turnier gelesen: " + JSON.stringify(r.blz));
  const blz = post("/trainingsturnier$").pop();
  const blzSp = blz && blz.body.data.teams.map(t => t.spieler);
  if (!blzSp || blzSp[0].slice(0, 3).join() !== "1,2,🧢 Trainer" || !blzSp.every(l => l.every(x => typeof x === "number" || /^🧢 /.test(x)))) probleme.push("Turnier geschickt: " + JSON.stringify(blzSp));
  const bud = post("/termine$", g => g.methode === "PATCH")[0];
  if (!bud || JSON.stringify(bud.body.buddies) !== JSON.stringify([[1, 2], [3, 4]])) probleme.push("Buddies geschickt: " + JSON.stringify(bud && bud.body.buddies));
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`gelesen: Anwesenheit ${r.awHeute.length}+${r.awAlt.length} · Nominierung ${r.nom.a}/${r.nom.b}/${r.nom.c} · Gruppe ${(r.tg || []).length} · Turnier ${r.blz.length} Teams`);
  zeilen.push(`geschickt: ${s.gesendet.length} Schreibvorgaenge, alle Kinder als kader.id`);
  return h.ergebnis("Kinder-IDs am Speicherrand: schreiben mit ID, lesen aus ID- und Namenszeilen", !probleme.length, zeilen.concat(probleme));
};
