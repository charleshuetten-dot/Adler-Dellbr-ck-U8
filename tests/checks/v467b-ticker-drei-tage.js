/* v467 – „für den live ticker nach 3 tagen aber nicht mehr historisch sichtbar sein."
   Der öffentliche Ticker (?ticker=<datum>) war ohne Anmeldung dauerhaft lesbar, samt allen
   Ereignistexten mit den Vornamen der Kinder. Geprueft: am Spieltag der volle Verlauf, vier
   Tage spaeter nur noch Endstand + Verweis aufs Adler Nest – und die Zeilen bleiben in der
   Datenbank (die Attrappe liefert sie weiterhin aus). */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const ereignisse = d => ([
    { datum: d, text: "Kind A trifft!", typ: "tor", minute: "3'", created_at: d + "T10:05:00Z" },
    { datum: d, text: "Kind B pariert!", typ: "parade", minute: "7'", created_at: d + "T10:09:00Z" },
    { datum: d, text: "Gegentor", typ: "gegentor", minute: "9'", created_at: d + "T10:11:00Z" }
  ]);
  async function lauf(datum) {
    const s = await h.starten({ start: "/eltern/index.html?ticker=" + datum, warten: 1400,
      supabase: h.supabaseAttrappe({
        matchday: [{ datum, gegner: "FC Beispiel", clock_status: "stopped", ticker_open: null, half: 2, spieldauer_min: 10, halbzeiten: 2 }],
        ticker_events: ereignisse(datum),
        ticker_claps: [{ datum, count: 0 }]
      }) });
    const r = await s.page.evaluate(() => {
      const t = document.body.textContent.replace(/\s+/g, " ").trim();
      const nest = [...document.querySelectorAll("a")].some(a => /heft/.test(a.getAttribute("href") || ""));
      return { txt: t, nest };
    });
    const fehler = s.fehler(); await s.schliessen();
    return { ...r, fehler };
  }

  const frisch = await lauf(h.heute());
  const alt = await lauf(h.tagePlus(-4));

  if (!/Kind A trifft/.test(frisch.txt)) probleme.push("am Spieltag fehlt der Verlauf: " + frisch.txt.slice(0, 120));
  if (/Endstand/.test(frisch.txt)) probleme.push("am Spieltag steht schon der Endstand-Abschluss");
  if (/Kind A trifft/.test(alt.txt)) probleme.push("nach vier Tagen sind die Ereignistexte samt Namen noch öffentlich lesbar");
  if (!/Endstand/.test(alt.txt)) probleme.push("nach vier Tagen fehlt der Endstand: " + alt.txt.slice(0, 140));
  if (!/1:1/.test(alt.txt)) probleme.push("Endstand falsch gerechnet (erwartet 1:1): " + alt.txt.slice(0, 140));
  if (!/beendet/.test(alt.txt)) probleme.push("kein Hinweis, dass der Ticker beendet ist");
  if (!alt.nest) probleme.push("kein Verweis aufs Adler Nest");
  if (frisch.fehler.length) probleme.push(...frisch.fehler.slice(0, 2));
  if (alt.fehler.length) probleme.push(...alt.fehler.slice(0, 2));
  zeilen.push(`Spieltag: Verlauf sichtbar ${/Kind A trifft/.test(frisch.txt)}`);
  zeilen.push(`4 Tage später: Namen weg ${!/Kind A trifft/.test(alt.txt)} · „${(alt.txt.match(/Endstand \d+:\d+/) || [""])[0]}“ · Nest-Link ${alt.nest}`);
  return h.ergebnis("Öffentlicher Ticker: voller Verlauf 3 Tage, danach nur der Endstand", !probleme.length, zeilen.concat(probleme));
};
