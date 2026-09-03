/* v441 – Platzrechner unter den Feld-Chips: rechnet er Bedarf/fehlt/uebrig richtig, und
   sind seine Kaesten (fester heller Grund!) auch im dunklen Modus lesbar? Ein Theme-
   Token als Schriftfarbe war dort 2,8:1 – Hausregel 4,5:1. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten();
  const r = await s.page.evaluate(kinder => {
    window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true }));
    blitzOpen();
    const faelle = [["funino", 1, 0, { bedarf: 6, da: 15, fehlt: 0, uebrig: 9 }], ["funino", 2, 0, { bedarf: 12, da: 15, fehlt: 0, uebrig: 3 }],
                    ["funino", 3, 0, { bedarf: 18, da: 15, fehlt: 3, uebrig: 0 }], ["f4", 1, 0, { bedarf: 10, da: 15, fehlt: 0, uebrig: 5 }],
                    ["f4", 2, 0, { bedarf: 20, da: 15, fehlt: 5, uebrig: 0 }], ["f4", 2, 1, { bedarf: 20, da: 16, fehlt: 4, uebrig: 0 }],
                    ["f2", 4, 0, { bedarf: 16, da: 15, fehlt: 1, uebrig: 0 }], ["frei", 2, 0, { bedarf: 0, da: 15, fehlt: 0, uebrig: 15 }]];
    return faelle.map(([form, felder, trainer, soll]) => {
      BLZ.spielform = form; BLZ.felder = felder; BLZ.trainer = trainer ? ["Trainer"] : [];
      const z = _blzPlatz();
      const ist = { bedarf: z.bedarf, da: z.da, fehlt: z.fehlt, uebrig: z.uebrig };
      return { name: `${form} × ${felder}${trainer ? " + Trainer" : ""}`, ok: JSON.stringify(ist) === JSON.stringify(soll), ist, soll, html: _blzPlatzHtml().length > 0 };
    });
  }, h.KINDER);
  await s.schliessen();
  r.forEach(f => { if (!f.ok) probleme.push(`${f.name}: ${JSON.stringify(f.ist)}, erwartet ${JSON.stringify(f.soll)}`); if (!f.html) probleme.push(`${f.name}: kein Hinweistext`); });
  zeilen.push(`${r.filter(f => f.ok).length} von ${r.length} Rechenfaellen stimmen`);

  // Kontrast der Kaesten, hell und dunkel, je Zustand (zu wenig / passt / neutral)
  const min = [];
  for (const scheme of ["light", "dark"]) {
    for (const [fall, form, felder] of [["zu wenig", "funino", 3], ["passt", "funino", 2], ["neutral", "frei", 2]]) {
      const t = await h.starten({ scheme });
      const proben = await t.page.evaluate(({ form, felder, kinder, helfer }) => {
        window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true }));
        blitzOpen(); BLZ.spielform = form; BLZ.felder = felder; blzRender();
        eval(helfer);
        const box = [...document.querySelectorAll("#blitz-body div")].find(d => d.textContent.indexOf("Pro Feld:") >= 0);
        if (!box) return null;
        return [["Haupttext", box], ["Fusszeile", box.querySelector("div")]].filter(x => x[1]).map(([name, el]) => ({ name, k: window.__kontrastVon(el) }));
      }, { form, felder, kinder: h.KINDER, helfer: h.kontrastHelfer });
      await t.schliessen();
      if (!proben) { probleme.push(`${scheme}/${fall}: Kasten nicht gefunden`); continue; }
      proben.forEach(p => { min.push(p.k); if (p.k < 4.5) probleme.push(`${scheme} · ${fall} · ${p.name}: ${p.k}:1 (Soll 4,5)`); });
    }
  }
  zeilen.push(`Kontrast der Kaesten: ${min.length} Proben, schwaechste ${Math.min(...min)}:1`);
  return h.ergebnis("Platzrechner: Rechnung und Kontrast hell/dunkel", !probleme.length, zeilen.concat(probleme));
};
