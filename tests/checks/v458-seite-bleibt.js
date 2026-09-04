/* v458 – „wenn ich die Seite durch Nach-unten-Streifen aktualisiere, komme ich immer
   wieder auf die Startseite". Zwei Dinge: der Browser-eigene Pull-to-Refresh ist aus
   (die App hat ihren eigenen, der die Seite haelt), und nach einem echten Neuladen landet
   man wieder dort, wo man war. Dazu: ein Neuladen zaehlt im Nutzungslog nicht als Besuch. */
module.exports = async function (h) {
  const probleme = [], zeilen = [];
  const s = await h.starten({ supabase: h.supabaseAttrappe({ kader: h.kaderZeilen() }) });
  const vor = await s.page.evaluate(() => {
    go("anwesenheit");
    return { overscroll: getComputedStyle(document.body).overscrollBehaviorY, gemerkt: sessionStorage.getItem("adler_letzte_seite"), sektion: curSection };
  });
  /* Erst den Puffer der ALTEN Seite leeren: beim Entladen schickt die App ihn per
     `keepalive` noch los (visibilitychange) – dieser Eintrag stammt vom echten Besuch
     oben, nicht vom Wiederherstellen, und machte die Pruefung sonst zufaellig rot. */
  await s.page.evaluate(() => nutzungFlush());
  await s.page.waitForTimeout(200);
  s.gesendet.length = 0;
  await s.page.reload({ waitUntil: "networkidle" });
  await s.page.waitForTimeout(1200);
  await s.page.evaluate(() => { window.sbToken = () => "attrappe"; window.sbAuthHeaders = x => ({ ...(x || {}), "Content-Type": "application/json" }); nutzungFlush(); });
  await s.page.waitForTimeout(200);
  const nach = await s.page.evaluate(() => ({ sektion: curSection, aktivNav: (document.querySelector("#main-nav .nb.active") || {}).id || "", sichtbar: [...document.querySelectorAll('[id^="train-sub-"]')].filter(e => getComputedStyle(e).display !== "none").map(e => e.id) }));
  const logs = s.gesendet.filter(g => /\/nutzung_log$/.test(g.pfad)).flatMap(g => [].concat(g.body)).map(r => r.ereignis + ":" + r.ziel);
  const fehler = s.fehler(); await s.schliessen();
  if (vor.overscroll !== "contain") probleme.push(`overscroll-behavior-y ist „${vor.overscroll}“, erwartet contain (Browser-Refresh bleibt sonst an)`);
  if (vor.gemerkt !== "anwesenheit") probleme.push("Seite wird nicht gemerkt: " + vor.gemerkt);
  if (nach.sektion !== "anwesenheit") probleme.push(`nach dem Neuladen auf „${nach.sektion}“ statt anwesenheit`);
  if (nach.aktivNav !== "nb-training") probleme.push("Navigation zeigt nicht den Trainings-Reiter: " + nach.aktivNav);
  if (logs.includes("bereich:anwesenheit")) probleme.push("das Neuladen wurde als Besuch geloggt: " + JSON.stringify(logs));
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`overscroll ${vor.overscroll} · gemerkt ${vor.gemerkt} · nach Neuladen ${nach.sektion} (${nach.aktivNav}) · Log ${JSON.stringify(logs)}`);
  return h.ergebnis("Neuladen: Seite bleibt, Browser-Pull-to-Refresh aus, kein Besuch im Log", !probleme.length, zeilen.concat(probleme));
};
