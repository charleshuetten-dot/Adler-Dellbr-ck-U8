/* v438 – „ich kann nicht nach rechts schieben": Auswahl-Chips im Turnierdialog lagen
   ausserhalb ihrer Reihe (flex ohne Umbruch, overflow hidden) und waren auf dem Handy
   unerreichbar. Gemessen wird je Chip-Reihe: passt der Inhalt, liegt jeder Chip drin. */
module.exports = async function (h) {
  const s = await h.starten({ breite: 390 });
  const r = await s.page.evaluate(kinder => {
    window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true, nr: i + 1 }));
    if (typeof blitzOpen !== "function") return { fehler: "blitzOpen fehlt" };
    blitzOpen();
    // Genau die Werte, die im Screenshot rechts abgeschnitten waren
    if (typeof blzBudget === "function") blzBudget(30);
    if (typeof blzFelder === "function") blzFelder(3);
    if (typeof blzSpielform === "function") blzSpielform("funino");
    const body = document.getElementById("blitz-body");
    if (!body) return { fehler: "blitz-body fehlt" };
    const reihen = [...body.querySelectorAll("div")].filter(d => {
      const st = getComputedStyle(d);
      return (st.display === "flex" || st.display === "grid") && d.children.length >= 2 && [...d.children].every(c => c.tagName === "BUTTON");
    });
    return { reihen: reihen.map(d => {
      const k = d.getBoundingClientRect();
      const raus = [...d.children].filter(c => { const b = c.getBoundingClientRect(); return b.right > k.right + 0.5 || b.left < k.left - 0.5; });
      return { chips: d.children.length, ueberstand: Math.round(d.scrollWidth - d.clientWidth),
               raus: raus.map(c => c.textContent.trim().replace(/\s+/g, " ")), text: [...d.children].map(c => c.textContent.trim()).join("|").slice(0, 60) };
    }) };
  }, h.KINDER);
  await s.schliessen();
  if (r.fehler) return h.ergebnis("Turnierdialog: alle Chips erreichbar", false, [r.fehler]);
  const kaputt = r.reihen.filter(z => z.ueberstand > 0 || z.raus.length);
  return h.ergebnis("Turnierdialog: alle Chips erreichbar (390 px)", r.reihen.length >= 3 && !kaputt.length,
    [`${r.reihen.length} Chip-Reihen gemessen`].concat(kaputt.map(z => `${z.chips} Chips · ${z.ueberstand}px zu breit · unerreichbar: ${z.raus.join(" / ")} [${z.text}]`)));
};
