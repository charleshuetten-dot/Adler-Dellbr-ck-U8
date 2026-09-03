/* v447 – „wenn ein Trainer das Training anlegt, muss es fuer alle sichtbar sein": die
   Uebungen kamen an, die Struktur (Phasen, Dauern) nicht – neue Spalte trainingsplan.slots.
   Zwei Geraete, dazwischen eine Attrappe der Tabelle (Upsert auf datum). Dazu der
   Altbestand: Zeilen OHNE slots muessen weiter Uebungen einsetzen und die Struktur lassen. */
module.exports = async function (h) {
  const DB = {}, TERMIN = h.tagePlus(2), ALT = h.tagePlus(-30);
  const supabase = h.supabaseAttrappe({ trainingsplan: (u, req) => {
    if (req.method() === "POST") { const b = JSON.parse(req.postData() || "{}"); DB[b.datum] = { plan: b.plan, slots: b.slots }; return { status: 201, body: "" }; }
    const eq = (u.searchParams.get("datum") || "").replace("eq.", ""), sel = u.searchParams.get("select") || "plan";
    if (!DB[eq]) return [];
    return [sel === "slots" ? { slots: DB[eq].slots } : { plan: DB[eq].plan }];
  } });
  const geraet = async termin => { const s = await h.starten({ supabase, hoehe: 1600 }); await h.sichtbarMachen(s.page, "#tp-timeline"); await h.terminSetzen(s.page, termin); return s; };
  const struktur = p => p.evaluate(() => tpSlots.map(x => `${x.label} (${x.dauer})`));
  const uebungen = p => p.evaluate(() => [...document.querySelectorAll(".tp-form-sel")].filter(x => x.value).map(x => x.id.replace(/^tp-form-/, "") + "=" + x.value));
  const probleme = [], zeilen = [];

  const k = await geraet(TERMIN);
  await k.page.evaluate(() => {
    tpRenderTimeline();
    const i = tpSlots.findIndex(x => x.label === "Hauptteil 2"); if (i >= 0) tpRemoveSlot(i);
    const a = tpSlots.findIndex(x => (x.typ || "") === "abschluss"); if (a >= 0) tpSetDauer(a, 45);
    [...document.querySelectorAll(".tp-form-sel")].slice(0, 2).forEach(sel => { const o = [...sel.options].find(x => x.value); if (o) { sel.value = o.value; tpOnSelectChange(sel); } });
    tpPlanSave();
  });
  await k.page.waitForTimeout(1500);
  const kS = await struktur(k.page), kU = await uebungen(k.page);
  await k.schliessen();
  const c = await geraet(TERMIN);
  await c.page.evaluate(async () => { tpRenderTimeline(); await tpPlanRestore(); });
  await c.page.waitForTimeout(900);
  const cS = await struktur(c.page), cU = await uebungen(c.page);
  await c.schliessen();
  if (!DB[TERMIN]) probleme.push("nichts gespeichert");
  else { if (!Array.isArray(DB[TERMIN].slots) || !DB[TERMIN].slots.length) probleme.push("slots nicht mitgeschickt"); if ((DB[TERMIN].plan || []).length < 2) probleme.push(`nur ${(DB[TERMIN].plan || []).length} Uebung(en) gespeichert`); }
  if (JSON.stringify(kS) !== JSON.stringify(cS)) probleme.push(`Struktur weicht ab: ${JSON.stringify(cS)} statt ${JSON.stringify(kS)}`);
  if (kU.length < 2 || JSON.stringify(kU) !== JSON.stringify(cU)) probleme.push(`Uebungen weichen ab: ${JSON.stringify(cU)} statt ${JSON.stringify(kU)}`);
  zeilen.push(`Geraet A: ${kS.length} Phasen, ${kU.length} Uebungen → Geraet B: ${cS.length} Phasen, ${cU.length} Uebungen`);

  // Altbestand ohne slots: Struktur unangetastet, alle Uebungen gesetzt
  const alt = await h.starten({ supabase: h.supabaseAttrappe({ trainingsplan: u => [(u.searchParams.get("select") || "plan") === "slots" ? { slots: null } : { plan: [
    { key: "106-Alle", formIdx: 106, trainer: "Alle", slotLabel: "Ankommen & Aufwärmen" }, { key: "17-Alle", formIdx: 17, trainer: "Alle", slotLabel: "Hauptteil 1" }, { key: "32-Alle", formIdx: 32, trainer: "Alle", slotLabel: "Hauptteil 2" }] }] }), hoehe: 1600 });
  await h.sichtbarMachen(alt.page, "#tp-timeline"); await h.terminSetzen(alt.page, ALT);
  const a = await alt.page.evaluate(async t => { tpRenderTimeline(); const vorher = tpSlots.map(x => `${x.label} (${x.dauer})`); await tpPlanRestore(t); await new Promise(r => setTimeout(r, 400));
    return { vorher, nachher: tpSlots.map(x => `${x.label} (${x.dauer})`), n: [...document.querySelectorAll(".tp-form-sel")].filter(x => x.value).length }; }, ALT);
  const fehler = alt.fehler();
  await alt.schliessen();
  if (JSON.stringify(a.vorher) !== JSON.stringify(a.nachher)) probleme.push("Altbestand veraendert die Struktur: " + JSON.stringify(a.nachher));
  if (a.n !== 3) probleme.push(`Altbestand: ${a.n} von 3 Uebungen gesetzt`);
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`Altbestand ohne slots: Struktur gleich ${JSON.stringify(a.vorher) === JSON.stringify(a.nachher)}, ${a.n}/3 Uebungen`);
  return h.ergebnis("Trainingsplan: Struktur und Uebungen kommen auf dem anderen Geraet an", !probleme.length, zeilen.concat(probleme));
};
