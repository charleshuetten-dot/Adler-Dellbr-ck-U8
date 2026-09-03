/* v440 – ein ausgetragenes Kind wurde beim Turnier mit aufgeteilt. Wurzel: loadKader()
   uebernahm `aktiv` nie, elf Filter waren wirkungslos. Dazu: der Pool nahm HEUTE statt
   den geplanten Termin, und eine alte Einteilung wurde nie gegen den Pool gehalten.
   loadKader() laeuft hier ECHT gegen die Attrappe – ein selbst gebautes KADER haette
   den Fehler gar nicht zeigen koennen. */
module.exports = async function (h) {
  const RAUS = h.KINDER[14], DRIN = h.KINDER.slice(0, 14), PLAN = h.tagePlus(3);
  const supabase = h.supabaseAttrappe({ kader: h.kaderZeilen({ inaktiv: [RAUS] }) });
  const anwesenheit = () => { const t = {}; DRIN.forEach(n => t[n] = { da: true, qual: 0 }); t[RAUS] = { da: false, qual: 0 }; return t; };
  const probleme = [], zeilen = [];

  // 1) Filter greifen nach echtem loadKader(); Pool nimmt den geplanten Termin, nicht heute
  const s = await h.starten({ supabase });
  await h.terminSetzen(s.page, PLAN);
  const r = await s.page.evaluate(async ({ PLAN, RAUS, tag }) => {
    await loadKader();
    window.AW_DATA = {}; AW_DATA[PLAN] = tag;              // NUR fuer den Termin, nicht fuer heute
    let ad = document.getElementById("aw-date"); if (!ad) { ad = document.createElement("input"); ad.id = "aw-date"; document.body.appendChild(ad); } ad.value = PLAN;
    const out = { n: KADER.length, aktivBool: KADER.every(k => typeof k.aktiv === "boolean") };
    let wrap = document.getElementById("aw-list"); if (!wrap) { wrap = document.createElement("div"); wrap.id = "aw-list"; document.body.appendChild(wrap); }
    awRenderList(); out.kacheln = [...wrap.querySelectorAll(".aw-tile")].map(b => b.dataset.player);
    const pool = _blzPool(); out.pool = { quelle: pool.quelle, n: pool.namen.length, raus: pool.namen.includes(RAUS) };
    let el = document.getElementById("tp-prognose"); if (!el) { el = document.createElement("div"); el.id = "tp-prognose"; document.body.appendChild(el); }
    await tpPrognoseLoad(); out.prognose = el.textContent.trim();
    window.nomStatus = {}; KADER.forEach(k => nomStatus[k.name] = "dabei"); out.aufstellung = nominierteSpieler();
    return out;
  }, { PLAN, RAUS, tag: anwesenheit() });
  await s.schliessen();
  if (r.n !== 15 || !r.aktivBool) probleme.push(`loadKader: ${r.n} Kinder, aktiv als boolean: ${r.aktivBool}`);
  if (r.kacheln.length !== 14 || r.kacheln.includes(RAUS)) probleme.push(`Anwesenheit zeigt ${r.kacheln.length} Kacheln, ausgetragenes Kind dabei: ${r.kacheln.includes(RAUS)}`);
  if (!/^Anwesenheit/.test(r.pool.quelle) || r.pool.n !== 14 || r.pool.raus) probleme.push(`Pool: ${JSON.stringify(r.pool)} – erwartet Quelle Anwesenheit, 14, ohne das ausgetragene Kind`);
  if (!/\b14\b/.test(r.prognose)) probleme.push(`Prognose „${r.prognose}" – erwartet 14 (eingetragene Anwesenheit des Termins)`);
  if (r.aufstellung.length !== 14 || r.aufstellung.includes(RAUS)) probleme.push(`Aufstellung: ${r.aufstellung.length}, ausgetragenes Kind dabei: ${r.aufstellung.includes(RAUS)}`);
  zeilen.push(`loadKader ${r.n} · Anwesenheit ${r.kacheln.length} · Pool ${r.pool.n} (${r.pool.quelle}) · Prognose „${r.prognose}" · Aufstellung ${r.aufstellung.length}`);

  // 2) Alte Einteilung im Speicher: zu viel wird entfernt, Fehlende ergaenzt, Trainer bleiben
  for (const fall of ["zu viel", "fehlt"]) {
    const t = await h.starten({ supabase });
    const alt = { datum: PLAN, phase: "setup", spielmodus: "kinder", anzahl: 5, elternAnzahl: 1, spielform: "funino", runde: 8, budget: 30, felder: 1, modus: "rr", quelle: "ganzer Kader", trainer: ["Trainer"], plan: [],
      teams: [{ name: "Adler 1", spieler: [DRIN[0], DRIN[1], DRIN[2], RAUS, "🧢 Trainer"], fest: false },
              { name: "Adler 2", spieler: DRIN.slice(3, 6), fest: false }, { name: "Adler 3", spieler: DRIN.slice(6, 9), fest: false },
              { name: "Adler 4", spieler: DRIN.slice(9, 12), fest: false }, { name: "Adler 5", spieler: fall === "fehlt" ? [] : DRIN.slice(12, 14), fest: false }] };
    await t.page.evaluate(a => localStorage.setItem("adler_blitz", JSON.stringify(a)), alt);
    await h.terminSetzen(t.page, PLAN);
    const e = await t.page.evaluate(async ({ PLAN, RAUS, tag }) => {
      await loadKader(); window.AW_DATA = {}; AW_DATA[PLAN] = tag;
      blitzOpen();
      const alle = []; BLZ.teams.forEach(x => (x.spieler || []).forEach(n => alle.push(n)));
      const gesp = JSON.parse(localStorage.getItem("adler_blitz") || "{}");
      return { raus: alle.includes(RAUS), trainer: alle.includes("🧢 Trainer"), kinder: alle.filter(n => n.indexOf("🧢 ") !== 0).length,
               doppelt: new Set(alle).size !== alle.length, speicher: (gesp.teams || []).some(x => (x.spieler || []).includes(RAUS)) };
    }, { PLAN, RAUS, tag: anwesenheit() });
    await t.schliessen();
    if (e.raus || e.speicher) probleme.push(`Altbestand (${fall}): ausgetragenes Kind noch im Team (${e.raus}) / im Speicher (${e.speicher})`);
    if (!e.trainer) probleme.push(`Altbestand (${fall}): Trainer wurde mit entfernt`);
    if (e.kinder !== 14 || e.doppelt) probleme.push(`Altbestand (${fall}): ${e.kinder} Kinder in Teams, doppelt: ${e.doppelt}`);
    zeilen.push(`Altbestand (${fall}): ${e.kinder} Kinder · Trainer bleibt ${e.trainer} · Speicher bereinigt ${!e.speicher}`);
  }
  return h.ergebnis("Ausgetragene Kinder: Filter, Pool-Datum, alte Einteilung", !probleme.length, zeilen.concat(probleme));
};
