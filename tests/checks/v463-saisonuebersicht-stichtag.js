/* v463 – „Saisonübersicht zählt auch mit den gleichen Angaben. Die Saison hat diese Woche
   erst angefangen." Die Quoten-Tabelle der Saison-Uebersicht zaehlte jeden Anwesenheitstag
   und alle Nominierungen ab dem 1. Juli. Geprueft: Trainingsspalte zaehlt nur echte
   Trainingstage ab dem Stichtag, Spiele-Spalte nur ab dem Spiel-Stichtag – dieselben
   Zahlen wie neben der Nominierung. */
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
    /* Die Attrappe liefert nur, was der Filter zulaesst – so faellt auf, wenn die
       Uebersicht ohne Stichtag fragt und die alte Nominierung wieder mitzaehlt. */
    nominierungen: u => {
      const alle = [{ datum: "2026-07-17", data: { "1": "dabei", "2": "dabei" } },
                    { datum: "2026-09-05", data: { "1": "dabei", "2": "nicht" } }];
      const g = u.searchParams.getAll("datum");
      return alle.filter(n => g.every(x => x.startsWith("gte.") ? n.datum >= x.slice(4) : true));
    }
  }), hoehe: 1600 });
  const r = await s.page.evaluate(async K => {
    await loadKader();
    const tag = (namen, da) => { const o = {}; namen.forEach(n => o[n] = { da, qual: 0 }); return o; };
    // AW_DATA ist eine globale `let`-Bindung, keine window-Property – vorhandenes Objekt fuellen.
    Object.keys(AW_DATA).forEach(k => delete AW_DATA[k]);
    AW_DATA["2026-07-25"] = tag(K, true);   // vor dem Stichtag – zaehlt nicht mehr
    AW_DATA["2026-08-31"] = tag(K, true);   // Training 1
    AW_DATA["2026-09-04"] = tag(K, false);  // Training 2: gefehlt
    AW_DATA["2026-09-05"] = tag(K, true);   // Turnier – kein Training
    const el = document.createElement("div"); document.body.appendChild(el);
    await anwesenheitQuoteInto(el);
    const kon = k => { try { return eval("typeof " + k + '==="function"?' + k + "():null"); } catch (e) { return null; } };
    const zeile = [...el.querySelectorAll("tr")].find(t => (t.children[0] || {}).textContent === K[0]);
    return { ab: { training: kon("saisonStart"), spiel: kon("spieleAb") },
      training: (zeile.children[1].textContent || "").replace(/\s+/g, " ").trim(),
      spiele: (zeile.children[2].textContent || "").replace(/\s+/g, " ").trim(),
      fuss: (el.textContent.match(/gezählt ab[^·]*/) || [""])[0].trim() };
  }, K);
  const fehler = s.fehler(); await s.schliessen();
  // Kind A: 2 echte Trainings ab dem Stichtag, davon 1 da → 50% (1/2)
  if (!/50%/.test(r.training) || !/\(1\/2\)/.test(r.training)) probleme.push(`Trainingsspalte „${r.training}“, erwartet 50% (1/2) – nur die Trainings ab ${r.ab.training}`);
  // Kind A: nur die Nominierung vom 05.09. → 100% (1/1); die vom 17.07. liegt davor
  if (!/100%/.test(r.spiele) || !/\(1\/1\)/.test(r.spiele)) probleme.push(`Spiele-Spalte „${r.spiele}“, erwartet 100% (1/1) – nur Nominierungen ab ${r.ab.spiel}`);
  if (r.ab.training !== "2026-08-31" || r.ab.spiel !== "2026-09-05") probleme.push(`Stichtage ${r.ab.training} / ${r.ab.spiel}`);
  if (!r.fuss) probleme.push("Fusszeile nennt den Stichtag nicht");
  if (fehler.length) probleme.push(...fehler.slice(0, 3));
  zeilen.push(`ab ${r.ab.training} / ${r.ab.spiel} · Training ${r.training} · Spiele ${r.spiele} · „${r.fuss}“`);
  return h.ergebnis("Saisonübersicht rechnet mit denselben Stichtagen wie die Nominierung", !probleme.length, zeilen.concat(probleme));
};
