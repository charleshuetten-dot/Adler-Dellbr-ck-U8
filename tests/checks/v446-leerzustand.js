/* v446 – Saisonstart: Bewertungen geloescht, spielerprofile und blitz_ratings sind LEER.
   Rechnet die App damit sauber (Division durch Null, leere Listen), oeffnen sich die
   Ansichten, die Bewertungen zeigen? */
module.exports = async function (h) {
  const s = await h.starten({ warten: 900 });
  const r = await s.page.evaluate(async kinder => {
    window.KADER = kinder.map((n, i) => ({ id: i + 1, name: n, aktiv: true }));
    const proben = {};
    const rufe = [["teamStaerke", () => teamStaerke(kinder[0])], ["nominierteSpieler", () => nominierteSpieler().length],
                  ["_blzAuto(2)", () => _blzAuto(2).teams.length], ["tpSpielformQuote", () => tpSpielformQuote()]];
    for (const [name, fn] of rufe) { try { proben[name] = String(fn()); } catch (e) { proben[name] = "FEHLER: " + e.message; } }
    const ansichten = {};
    for (const v of ["profil", "verlauf", "analyse", "kader", "bew", "anwesenheit"]) {
      try { if (typeof go !== "function") throw new Error("go() fehlt"); go(v); await new Promise(r => setTimeout(r, 150)); ansichten[v] = "ok"; } catch (e) { ansichten[v] = "FEHLER: " + e.message; }
    }
    return { proben, ansichten };
  }, h.KINDER);
  const fehler = s.fehler();
  await s.schliessen();
  const probleme = [];
  Object.entries(r.proben).forEach(([k, v]) => { if (/FEHLER|NaN|undefined/.test(v)) probleme.push(`${k} → ${v}`); });
  Object.entries(r.ansichten).forEach(([k, v]) => { if (v !== "ok") probleme.push(`Ansicht ${k}: ${v}`); });
  if (fehler.length) probleme.push(...fehler.slice(0, 4));
  return h.ergebnis("Leerzustand ohne Bewertungen: keine Fehler", !probleme.length,
    [Object.entries(r.proben).map(([k, v]) => `${k}=${v}`).join(" · ") + " · Ansichten " + Object.keys(r.ansichten).length].concat(probleme));
};
