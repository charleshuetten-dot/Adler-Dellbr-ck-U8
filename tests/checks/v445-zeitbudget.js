/* v445 – Zeitbudgets 25 und 35 Min. kamen dazu. Rechnet die Automatik fuer ALLE Budgets,
   Team- und Feldzahlen plausibel: Dauer nie ueber dem Budget (ausser ehrlich gemeldet),
   Spielzeit nie unter 5 Min. ohne Hinweis? */
module.exports = async function (h) {
  const s = await h.starten();
  const r = await s.page.evaluate(() => {
    const befunde = []; let n = 0; const budgets = new Set();
    for (const budget of [10, 15, 20, 25, 30, 35, 40]) for (const teams of [2, 3, 4, 5, 6]) for (const felder of [1, 2, 3]) {
      const pl = _blzPlanen(teams, budget, felder, "kinder", 0);
      if (pl.fehler) continue;
      n++; budgets.add(budget);
      if (!pl.hinweis && pl.dauer != null && pl.dauer > budget) befunde.push(`${budget}/${teams}T/${felder}F: Dauer ${pl.dauer} > Budget`);
      if (pl.z != null && pl.z < 5 && !pl.hinweis) befunde.push(`${budget}/${teams}T/${felder}F: Spielzeit ${pl.z} < 5 ohne Hinweis`);
    }
    return { n, budgets: [...budgets], befunde };
  });
  await s.schliessen();
  const probleme = r.befunde.slice();
  if (!r.budgets.includes(25) || !r.budgets.includes(35)) probleme.push("Budget 25 oder 35 liefert keinen Plan");
  if (r.n < 100) probleme.push(`nur ${r.n} Kombinationen geplant`);
  return h.ergebnis("Zeitbudget: alle Kombinationen plausibel (inkl. 25 und 35)", !probleme.length, [`${r.n} Kombinationen, Budgets ${r.budgets.join("/")}`].concat(probleme));
};
