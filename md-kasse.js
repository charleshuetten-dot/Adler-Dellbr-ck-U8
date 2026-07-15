/* ═══════════════════════════════════
   ADLER-KASSE (Welle 2, FEAT Z-light) – dauerhafter Spenden-Button.
   Link kommt aus der Minimal-RPC adlerkasse_link (anon + auth callable).
   NUR statischer Redirect zu PayPal – die App fasst KEIN Geld an, kein
   Login noetig. Button erscheint nur, wenn ein echter http(s)-Link gesetzt ist.
═══════════════════════════════════ */
async function adlerkasseLinkGet(){
  try{
    const h=sbToken()?sbAuthHeaders():{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};
    const r=await fetch(`${SB_URL}/rest/v1/rpc/adlerkasse_link`,{method:"POST",headers:h,body:"{}"});
    if(!r.ok)return null;
    const v=await r.json();
    const s=(v==null?"":String(v)).trim();
    return s||null;
  }catch(e){return null;}
}
function adlerkasseCardHtml(link){
  if(!link||!/^https?:\/\//i.test(link))return ""; // nur echte http(s)-Links (kein javascript: o.ä.)
  return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:12px;text-align:center">
    <div style="font-size:15px;font-weight:800;color:#1e3a8a">🦅 Adler-Kasse</div>
    <div style="font-size:12px;color:#64748b;margin:4px 0 10px">Danke, dass du unsere Jungs anfeuerst! Jeder Euro fließt direkt in die Mannschaft – fürs Eis nach dem Sieg 🍦, den Ausflug, die nächste Belohnung.</div>
    <a href="${esc(link)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0070ba;color:#fff;border-radius:10px;padding:11px 22px;font-weight:800;font-size:14px;text-decoration:none">☕ Kleinigkeit spenden</a>
    <div style="font-size:9.5px;color:#cbd5e1;margin-top:8px">Zahlung läuft extern über PayPal. Die App fasst kein Geld an.</div>
  </div>`;
}

/* Fairplay-Codex (Phase 18.3): statisches Vollbild-Overlay mit den goldenen Regeln
   für den Spielfeldrand. Kontrastreich (draußen lesbar), kein Backend, kein DSGVO-Thema. */
const FAIRPLAY_REGELN=[
  {emo:"👏", t:"Anfeuern statt anweisen", d:"Coachen ist Trainer-Sache. Ihr feuert an – das gibt den Kindern Rückenwind, ohne sie zu verwirren."},
  {emo:"🎉", t:"Jedes Kind bejubeln", d:"Ein gutes Dribbling ist ein gutes Dribbling – egal, welches Trikot. Auch die Gegner sind Kinder."},
  {emo:"🙌", t:"Fehler gehören dazu", d:"Ein Fehlpass ist kein Drama. Mut machen statt meckern – so trauen sich die Kinder etwas."},
  {emo:"⚖️", t:"Der Schiri hat immer recht", d:"Auch wenn er mal irrt. Respekt vor der Entscheidung – die Kinder schauen sich genau ab, wie wir reagieren."},
  {emo:"🤝", t:"Ergebnis ist Nebensache", d:"Bei der U9 zählt Spaß, Bewegung und Dazulernen. Die Tabelle merkt sich in fünf Jahren keiner – das Gefühl schon."},
  {emo:"🚗", t:"Wir sind ein Team – auch abseits", d:"Pünktlich sein, Fahrgemeinschaften teilen, mit anpacken. Was wir vorleben, lernen die Kinder."},
  {emo:"🚧", t:"Abstand zum Spielfeld halten", d:"Bleibt hinter der Linie oder Bande. Die Kinder brauchen ihren Raum – und der Schiri freie Sicht."},
  {emo:"🗣️", t:"Eine ruhige Stimme statt Stimmengewirr", d:"Wenige, positive Worte kommen an. Zu viele Zurufe von allen Seiten verwirren die Kinder."},
  {emo:"🤗", t:"Trösten geht vor Analyse", d:"Nach einem Patzer oder einer Niederlage hilft ein Lächeln und eine Umarmung mehr als eine Manöverkritik."},
  {emo:"⏳", t:"Geduld mit der Entwicklung", d:"Jedes Kind wächst im eigenen Tempo. Vergleiche bremsen, Zutrauen beflügelt – gebt ihnen Zeit."},
  {emo:"📵", t:"Handy weg, Kind im Blick", d:"Die schönsten Momente passieren live. Eure Aufmerksamkeit zeigt jedem Kind: Du bist mir wichtig."},
  {emo:"🧃", t:"Beim Büdchen & Co. mit anpacken", d:"Aufgaben teilen, helfen, aufräumen. Das Team lebt davon, dass alle mitmachen – nicht immer dieselben."},
  {emo:"👋", t:"Gegner und Gasteltern freundlich behandeln", d:"Ein Gruß, ein Handschlag, ein Danke an den Gastgeber. Wir treten fair und gastfreundlich auf."},
  {emo:"🎯", t:"Einsatz loben, nicht nur Tore", d:"Mut, Teamgeist und Anstrengung verdienen genauso Applaus wie ein Treffer. Das prägt fürs Leben."},
  {emo:"🌧️", t:"Verlässlich dabei sein", d:"Rechtzeitig zu- oder absagen, bei jedem Wetter erscheinen. Planbarkeit hilft dem ganzen Team."}
];
// Ausformulierter Eltern-Leitfaden (breiter als der Fairplay-Codex). Default = Offline-Fallback,
// im Normalfall aus der Tabelle eltern_leitfaden geladen (trainer-pflegbar). Name frei änderbar.
const LEITFADEN_NAME="Eltern-Leitfaden";
const ELTERN_LEITFADEN=[
  {emo:"🕒", t:"Pünktlichkeit", d:"Bitte seid rund 10 Minuten vor Beginn da – bei Training und Spielen. Dann kommen die Kinder in Ruhe an, ziehen sich um und starten gemeinsam ins Aufwärmen. Wer zu spät kommt, verpasst genau das – und Aufwärmen schützt vor Verletzungen."},
  {emo:"👨‍👩‍👧", t:"Immer ein Elternteil vor Ort", d:"Bei jedem Training bleibt mindestens ein Elternteil (oder eine feste Vertretung) auf dem Gelände. Die Trainer sind fürs Fußballspielen da, nicht für die Aufsicht bei Toilettengang, Schürfwunde oder Heimweh. So ist immer jemand ansprechbar, wenn ein Kind etwas braucht."},
  {emo:"🚗", t:"Bringen & Abholen", d:"Bitte bringt euer Kind nicht deutlich vor Beginn und fahrt dann wieder weg – vor dem offiziellen Start gibt es keine Aufsicht. Holt es ebenso pünktlich nach dem Ende wieder ab. Ein Kind, das allein wartet, ist kein schöner Abschluss einer Einheit."},
  {emo:"🙋", t:"Verhalten beim Training – etwas Abstand", d:"Setzt euch beim Training bitte etwas abseits und lasst die Kinder mit den Trainern arbeiten. Kinder, die ständig zu Mama oder Papa schauen, sind abgelenkt. Kein Reinrufen, kein Mitcoachen vom Rand – das ist Aufgabe der Trainer."},
  {emo:"📣", t:"Verhalten am Spielfeldrand", d:"Bei Spielen bleibt hinter der Linie oder Bande, feuert an statt anzuweisen, bejubelt jedes Kind – auch die Gegner – und respektiert den Schiri. Die goldenen Regeln stehen in unserem Fairplay-Codex. Bitte lest ihn und tragt ihn mit."},
  {emo:"🧃", t:"Büdchen- & Helferdienste", d:"Bei Heimspielen versorgen zwei Familien im Wechsel das Büdchen (Kuchen, Getränke, Kasse). Die Einteilung seht ihr in der App und könnt sie bei Verhinderung weitergeben. Und generell gilt: mit anpacken – Auf- und Abbau, Fahrten, Aufräumen. Das Team lebt davon, dass viele helfen, nicht immer dieselben."},
  {emo:"📱", t:"Die Adler-App nutzen – zu- & absagen", d:"Bitte meldet euer Kind für JEDEN Termin rechtzeitig zu oder ab, am besten bis zum Vortag. Nur so können die Trainer planen und Teams einteilen. Die App ist unser zentraler Draht: Termine, Infos, Aufstellung, Liveticker und Mitbringlisten laufen darüber."},
  {emo:"🤒", t:"Krank oder verletzt?", d:"Meldet euer Kind bei Krankheit oder Verletzung ab und schickt es erst wieder, wenn es wirklich fit ist. Fieber, Magen-Darm & Co. bleiben zu Hause – auch dem Team zuliebe. Bei längeren Verletzungen sprecht kurz mit den Trainern."},
  {emo:"🎒", t:"Die richtige Ausrüstung", d:"Immer dabei: Schienbeinschoner (Pflicht!), Stutzen, passende Schuhe fürs Feld oder die Halle, eine gefüllte Trinkflasche und wettergerechte Kleidung. Bitte alles mit Namen beschriften – so findet jedes Teil zurück."},
  {emo:"🌦️", t:"Bei (fast) jedem Wetter", d:"Wir trainieren auch bei Wind und leichtem Regen – zieht die Kinder passend an (Regenjacke & Wechselsachen, im Sommer Kappe & Sonnencreme, im Winter warm). Fällt ein Termin platzbedingt aus oder wird verlegt, seht ihr das rechtzeitig in der App an der Platz-Ampel."},
  {emo:"🗣️", t:"Sorgen? Sprecht uns direkt an", d:"Kritik, Fragen oder Sorgen rund um euer Kind? Sprecht die Trainer bitte direkt und in Ruhe an – am besten über die Funktion „Elterngespräch\" in der App, nicht zwischen Tür und Angel und nicht vor den Kindern. Gemeinsam finden wir eine Lösung."},
  {emo:"🏆", t:"Entwicklung vor Ergebnis", d:"Bei der U9 zählen Spaß, Bewegung und Lernen – nicht die Tabelle. Jedes Kind entwickelt sich im eigenen Tempo. Lobt Einsatz und Mut, nicht nur Tore, und vergleicht die Kinder nicht untereinander."},
  {emo:"📸", t:"Fotos & Datenschutz", d:"Fotos vom Team teilen wir nur, wenn ihr die Foto-Freigabe in der App erteilt habt. Bitte macht selbst keine Bilder, auf denen fremde Kinder klar erkennbar sind, und stellt nichts ungefragt in soziale Netzwerke."},
  {emo:"🎉", t:"Gemeinschaft & Feiern", d:"Geburtstage, Saisonabschluss, Grillfest – solche Momente machen aus einer Mannschaft ein Team. Kommt vorbei, bringt euch ein und lernt die anderen Familien kennen. Für Events findet ihr Mitbringlisten in der App."},
  {emo:"🧹", t:"Sauberkeit & Sorgfalt", d:"Müll nehmen wir mit, Kabine und Platz hinterlassen wir ordentlich, mit Toren und Material gehen wir sorgsam um. Was wir vorleben, lernen die Kinder ganz nebenbei."},
  {emo:"💚", t:"Ehrenamt wertschätzen", d:"Trainer und Helfer stecken ihre Freizeit hinein – freiwillig und unbezahlt. Verlässlichkeit, Mithilfe und ein ehrliches Danke sind die schönste Anerkennung. Wenn alle ein bisschen mittragen, wird es für alle leicht."},
  {emo:"⚽", t:"Aufstellung & Einsatz – wir vertrauen dem Trainerteam", d:"Wer an einem Spieltag wie viel und auf welcher Position spielt, entscheidet das Trainerteam gemeinsam – nach vielen Faktoren wie Trainingsbeteiligung, aktueller Form, Spielpraxis und Entwicklungsstand. Ziel bleibt, dass jedes Kind fair zum Zug kommt; ein Anrecht auf eine feste Position oder einen Stammplatz gibt es aber nicht. Bitte tragt diese Entscheidungen mit und stärkt sie auch gegenüber eurem Kind – selbst wenn ihr es einmal anders seht."},
  {emo:"🪑", t:"Wenn ein Kind mal auf die Bank muss", d:"Es kann vorkommen, dass ein Kind im Training oder Spiel kurz auf die Ersatzbank kommt, weil es sich nicht fair oder teamorientiert verhalten hat. Das ist keine Strafe gegen das Kind als Person, sondern eine kurze Orientierung im Sinne des Teams – danach geht es weiter. Bitte tragt auch das mit. Die Gründe besprechen wir in Ruhe mit euch, nicht in großer Runde und nicht vor dem Kind."},
  {emo:"🧭", t:"Erziehung bleibt bei euch, Orientierung geben wir am Platz", d:"Pädagogische und erzieherische Aufgaben können und wollen wir nicht übernehmen – die bleiben in eurer Verantwortung als Eltern. Auf dem Platz brauchen wir aber die Freiheit, den Kindern im Sinne des Teams klare Orientierung zu geben: mal loben, mal bremsen, mal eine Grenze setzen. Beides zusammen – ihr zu Hause, wir am Ball – gibt den Kindern den besten Halt."},
  {emo:"💬", t:"Zu Hause der sichere Hafen", d:"Fragt nach dem Spiel lieber „Hattest du Spaß?“ als „Warum hast du nicht gespielt?“ oder „Warum kein Tor?“. Kinder brauchen daheim keinen zweiten Trainer und keine zweite Analyse, sondern Rückhalt und ein offenes Ohr. Ihr seid die wichtigsten Fans eures Kindes – diese Rolle kann euch niemand abnehmen."},
  {emo:"🔄", t:"Jede Position gehört dazu", d:"Im Kinderfußball probieren alle Kinder mal alles aus – Tor, Abwehr, Mittelfeld, Sturm. Das ist ausdrücklich gewollt: So lernen sie, das ganze Spiel zu verstehen, und entwickeln sich vielseitig. Bitte drängt nicht auf eine feste „Lieblingsposition“ für euer Kind."},
  {emo:"🤐", t:"Eine Linie zeigen", d:"Wenn ihr eine Entscheidung des Trainerteams einmal nicht versteht, tragt sie vor dem Kind trotzdem mit und klärt sie später in Ruhe unter vier Augen mit uns. Kinder spüren sofort, wenn Eltern und Trainer gegeneinander arbeiten – das verunsichert sie und nimmt ihnen die Freude."},
  {emo:"🎽", t:"Dabei sein lohnt sich", d:"Wer regelmäßig und pünktlich zum Training kommt, sammelt Spielpraxis, lernt Abläufe und wächst ins Team hinein – das fließt ganz natürlich in die Einsatzentscheidungen ein. Das ist kein Druck, sondern eine faire Folge: Verlässlichkeit zahlt sich für das Kind und das ganze Team aus."},
  {emo:"⚖️", t:"Gleiche Maßstäbe für alle", d:"Wir behandeln alle Kinder nach denselben Maßstäben – Freundschaften, Herkunft oder wer die Eltern sind, spielen dabei keine Rolle. Umgekehrt bitten wir euch, auch beim eigenen Kind auf Sonderwünsche zu verzichten. Fairness fängt bei uns allen an."},
  {emo:"😊", t:"Vorbild bei Frust am Rand", d:"Auch wenn euer Kind gerade auf der Bank sitzt oder das Spiel nicht gut läuft: Bleibt am Spielfeldrand ruhig und positiv. Die Kinder schauen in solchen Momenten zu euch – und lesen eure Körpersprache genauer als jedes Wort."},
  {emo:"👕", t:"Training in kompletter Adler-Ausstattung", d:"Zum Training kommt euer Kind bitte immer in den Adler-Trainingssachen: Trikot, Hose und Stutzen. Die Fußballschuhe gehören ordentlich geschnürt – am besten mit Doppelknoten, damit sie nicht ständig aufgehen. So sind alle einheitlich ausgestattet und sofort startklar."},
  {emo:"📣", t:"Wenig reinrufen – der Verband bittet darum", d:"Der Verband hält uns Trainer an, während der Spiele möglichst wenig ins Feld zu rufen – keine ständigen Anweisungen, Korrekturen oder Verbesserungen. Die Kinder sollen selbst Lösungen finden und Spielfreude entwickeln. Wir versuchen das umzusetzen – umso wichtiger ist, dass auch ihr euch daran haltet und uns dabei unterstützt: anfeuern ja, coachen nein."},
  {emo:"🩹", t:"Behandlung & Auswechslung entscheidet das Trainerteam", d:"Nicht jedes Zwicken heißt raus – kleine Wehwehchen gehören zum Sport, und die Kinder lernen, sie einzuordnen. Echte Schmerzen nehmen wir immer ernst. Gerade während der Spiele entscheidet aber das Trainerteam, wann eine Behandlung stattfindet oder ein Kind ausgewechselt wird – bitte lauft nicht selbst aufs Feld und tragt diese Entscheidung mit."},
  {emo:"🌱", t:"Gemeinsam gewinnen, gemeinsam verlieren", d:"Nach einer Niederlage suchen wir keinen Schuldigen – kein „der Torwart war schuld“. Wir gewinnen und verlieren immer als Team. Und der Handschlag mit dem Gegner gehört auch nach einem 0:6 selbstverständlich dazu."},
  {emo:"🧑‍🤝‍🧑", t:"Neue & schüchterne Kinder aufnehmen", d:"Ermutigt euer Kind, neue und stillere Kinder aktiv mit hereinzuholen – niemand steht, wartet oder spielt allein. Diese Willkommenskultur macht aus vielen Einzelnen erst ein echtes Team."},
  {emo:"🍎", t:"Ausgeruht & gut versorgt zum Spieltag", d:"Ein Kind, das ausgeschlafen ist, gefrühstückt hat und eine gefüllte Trinkflasche dabei hat, ist mit Freude und Energie dabei – besser als mit Süßkram kurz vorher. Kleine Sache, große Wirkung."},
  {emo:"🚭", t:"Vorbild auch abseits des Balls", d:"Am Kinderspielfeldrand kein Rauchen und kein Alkohol, und ein respektvoller Ton – auch im Eltern-Chat. Ergebnis- oder Aufstellungs-Debatten gehören nicht in die große WhatsApp-Runde, sondern ins direkte Gespräch mit uns. Die Kinder schauen sich alles ab."},
  {emo:"🗓️", t:"Zusage ist Zusage – besonders bei Turnieren", d:"Für Turniere und Auswärtsspiele teilen wir die Teams vorab ein. Eine kurzfristige Absage reißt dann eine echte Lücke. Bitte sagt nur zu, wenn es wirklich passt, und meldet euch früh, wenn sich etwas ändert."},
  {emo:"💍", t:"Schmuck ab vor dem Spielen", d:"Ohrringe, Ketten, Armbänder, Uhren und Ringe kommen vor Training und Spiel ab – sie sind eine Verletzungsgefahr und meist auch nicht erlaubt. Wertsachen bleiben am besten gleich zu Hause; dafür können wir am Platz keine Verantwortung übernehmen."},
  {emo:"🎺", t:"Rituale & Wir-Gefühl mittragen", d:"Schlachtruf, gemeinsames Einlaufen, der Abschlusskreis nach dem Spiel – solche kleinen Rituale schweißen die Mannschaft zusammen. Ermutigt euer Kind mitzumachen und holt es nicht schon vor dem gemeinsamen Ende vom Platz."},
  {emo:"👶", t:"Geschwister, Hunde & Zuschauer hinter der Bande", d:"Kleine Geschwister und Vierbeiner sind willkommen – aber bitte hinter der Linie und nicht auf dem Spielfeld. Bälle nachlaufen oder über den Platz rennen lenkt die Kinder ab und kann auch gefährlich werden."},
  {emo:"📇", t:"Kontaktdaten aktuell & am Spieltag erreichbar", d:"Haltet Telefonnummer und E-Mail in der App aktuell und sorgt dafür, dass am Spieltag mindestens ein Elternteil erreichbar ist. Falls doch einmal etwas ist, müssen wir euch schnell erreichen können."},
  {emo:"🤝", t:"Kleine Konflikte erst mal den Kindern lassen", d:"Kinder streiten mal – das gehört dazu und sie lernen daran. Lasst sie kleine Reibereien zuerst selbst klären und greift nicht Eltern-gegen-Eltern ein. Größere Dinge bringt bitte zu uns Trainern, nicht direkt zum anderen Kind."},
  {emo:"🅿️", t:"Rücksichtsvoll parken & Kinder im Blick", d:"Beim Kommen und Gehen bitte rücksichtsvoll parken, nicht in zweiter Reihe halten und die Kinder auf dem Parkplatz an die Hand nehmen. Rund um den Platz sind viele aufgeregte Kinder unterwegs."},
  {emo:"💊", t:"Notfallkarte & Allergien aktuell halten", d:"Tragt Allergien, Medikamente und einen Notfallkontakt in der Notfallkarte in der App ein und haltet sie aktuell. Im Ernstfall haben wir am Platz dann sofort das Wichtigste griffbereit."}
];
/* Adler-Börse (Phase 23.1): interner Flohmarkt. Preise sind Freitext ("Zu verschenken").
   Fotos im vorhandenen fundbuero-Bucket (privat, nur Angemeldete), Prefix "boerse/". */
async function boerseOpen(){
  document.getElementById("boerse-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="boerse-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Adler-Börse");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="boerse-card";
  c.style.cssText="background:var(--surface,#fff);color:var(--text,#0f172a);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  modal.appendChild(c);document.body.appendChild(modal);
  await boerseRender();
}
async function boerseRender(){
  const c=document.getElementById("boerse-card"); if(!c)return;
  const meineId=(typeof sbUserId==="function")?sbUserId():null;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/boerse_listings?select=*&order=created_at.desc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  const fld="padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-size:13px;box-sizing:border-box;background:#fff;color:#0f172a";
  const liste=rows.map(x=>{
    const meins=x.created_by===meineId;
    const reserviert=!!x.reserviert_von;
    const vonMir=x.reserviert_von===meineId;
    let aktion;
    if(meins)aktion=`<button onclick="boerseDelete(${x.id})" style="min-height:40px;padding:6px 12px;border:1.5px solid #fca5a5;border-radius:10px;background:#fef2f2;color:#dc2626;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Entfernen</button>`;
    else if(vonMir)aktion=`<button onclick="boerseFreigeben(${x.id})" style="min-height:40px;padding:6px 12px;border:1.5px solid #94a3b8;border-radius:10px;background:#f8fafc;color:#475569;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">✓ von dir – freigeben</button>`;
    else if(reserviert)aktion=`<span style="font-size:12px;color:#b45309;font-weight:700">reserviert</span>`;
    else aktion=`<button onclick="boerseReservieren(${x.id})" style="min-height:40px;padding:6px 14px;border:none;border-radius:10px;background:#059669;color:#fff;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">Nehme ich</button>`;
    return `<div style="display:flex;gap:10px;padding:10px 0;border-top:1px solid #f1f5f9">
      ${x.foto_path?`<img id="bo-img-${x.id}" alt="" style="width:56px;height:56px;flex:none;border-radius:10px;object-fit:cover;background:#f1f5f9">`:`<div style="width:56px;height:56px;flex:none;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:24px">🛍️</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:13.5px;font-weight:700">${esc(x.titel)}</div>
        <div style="font-size:11.5px;color:#64748b">${x.groesse?"Gr. "+esc(x.groesse)+" · ":""}${esc(x.preis||"")}</div>
        <div style="margin-top:6px">${aktion}</div>
      </div>
    </div>`;
  }).join("");
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🛍️ Adler-Börse</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:12px">Zu klein geworden? Hier findet es ein neues Adler-Kind. Preis frei (z. B. „Zu verschenken").</div>
    ${liste||'<div style="font-size:12px;color:#94a3b8;padding:6px 0">Noch nichts drin. Stell das Erste ein!</div>'}
    <div style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:12px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:6px">Etwas anbieten</div>
      <input id="bo-titel" placeholder="Was? z. B. Fußballschuhe blau" style="width:100%;margin-bottom:6px;${fld}">
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <input id="bo-groesse" placeholder="Größe" style="flex:1;${fld}">
        <input id="bo-preis" placeholder="Preis / „Zu verschenken“" style="flex:2;${fld}">
      </div>
      <input id="bo-foto" type="file" accept="image/jpeg,image/png,image/webp" style="width:100%;margin-bottom:8px;font-size:11px">
      <div style="display:flex;gap:8px">
        <button onclick="boerseAdd(this)" style="min-height:44px;padding:0 14px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Einstellen</button>
        <button onclick="document.getElementById('boerse-modal').remove()" style="margin-left:auto;min-height:44px;padding:0 14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#475569;font-family:inherit;font-size:13px;cursor:pointer">Schließen</button>
      </div>
    </div>`;
  rows.forEach(x=>{ if(x.foto_path)boerseFoto(x.id,x.foto_path); });
}
async function boerseFoto(id,path){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/fundbuero/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return;
    const img=document.getElementById("bo-img-"+id);
    if(img)img.src=URL.createObjectURL(await r.blob());
  }catch(e){}
}
async function boerseAdd(btn){
  const titel=(document.getElementById("bo-titel")?.value||"").trim();
  if(!titel){toast("Bitte kurz beschreiben, was du anbietest","err");return;}
  const groesse=(document.getElementById("bo-groesse")?.value||"").trim()||null;
  const preis=(document.getElementById("bo-preis")?.value||"").trim()||null;
  const input=document.getElementById("bo-foto");
  const file=input&&input.files&&input.files[0];
  if(btn)btn.disabled=true;
  try{
    let path=null;
    if(file){
      const blob=await fotoCompress(file,800);
      path="boerse/"+((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()))+".jpg";
      const up=await fetch(`${SB_URL}/storage/v1/object/fundbuero/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
      if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    }
    const r=await fetch(`${SB_URL}/rest/v1/boerse_listings`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({titel,groesse,preis,foto_path:path})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht einstellen"),"err");return;}
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Eingestellt ✓");
  boerseRender();
}
async function boerseReservieren(id){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/boerse_reservieren`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_frei:false})});
    if(sbCheck401(r))return;
    const d=await r.json().catch(()=>({}));
    if(d&&d.ok&&d.von_mir)toast("Für euch reserviert ✓ Beim nächsten Training abholen.");
    else if(d&&d.ok)toast("Schon vergeben – jemand war schneller.","err");
  }catch(e){toast("Netzwerkfehler","err");}
  boerseRender();
}
async function boerseFreigeben(id){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/boerse_reservieren`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_frei:true})});
    if(sbCheck401(r))return;
  }catch(e){}
  boerseRender();
}
async function boerseDelete(id){
  if(!confirm("Dieses Angebot entfernen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/boerse_listings?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht entfernen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  boerseRender();
}

/* Skill der Woche (Phase 22.2): Trainer setzt eine Heim-Challenge mit Video-Link. */
async function skillWocheOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("skw-modal")?.remove();
  let cur=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)cur=(await r.json())[0]||null;}catch(e){}
  const modal=document.createElement("div");
  modal.id="skw-modal";modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const fld="width:100%;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:440px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🎬 Skill der Woche</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Kurze Heim-Challenge mit Video-Link. Schafft es das Kind, geben die Eltern 50 Federn frei.</div>
    ${cur?`<div style="font-size:11px;color:var(--text2);background:var(--surface2);border-radius:8px;padding:8px 10px;margin-bottom:10px">Aktuell: <b>${esc(cur.titel)}</b></div>`:""}
    <label style="font-size:11px;color:var(--text2)">Titel<input id="skw-titel" value="${esc(cur?.titel||"")}" placeholder="z. B. 10× Ball hochhalten" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Video-Link (YouTube o. ä.)<input id="skw-url" value="${esc(cur?.video_url||"")}" placeholder="https://…" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Beschreibung (optional)<textarea id="skw-besch" rows="2" style="${fld};resize:vertical">${esc(cur?.beschreibung||"")}</textarea></label>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-p btn-sm" onclick="skillWocheSave(this)"><i class="ti ti-device-floppy"></i>Als aktuelle Challenge setzen</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('skw-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(c);document.body.appendChild(modal);
}
async function skillWocheSave(btn){
  const titel=(document.getElementById("skw-titel")?.value||"").trim();
  if(!titel){toast("Bitte einen Titel","err");return;}
  const url=(document.getElementById("skw-url")?.value||"").trim();
  if(url&&!/^https?:\/\//i.test(url)){toast("Bitte einen vollständigen Link (https://…)","err");return;}
  const besch=(document.getElementById("skw-besch")?.value||"").trim()||null;
  if(btn)btn.disabled=true;
  try{
    // alte deaktivieren, neue als aktiv einfügen (Historie bleibt, neue Challenge = neue Federn)
    await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({aktiv:false})});
    const r=await fetch(`${SB_URL}/rest/v1/skill_woche`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({titel,video_url:url||null,beschreibung:besch,aktiv:true})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Skill der Woche gesetzt ✓");
  document.getElementById("skw-modal")?.remove();
}

/* Skill der Woche bei den Eltern: aktive Challenge + "Geschafft" (50 Federn fürs Kind). */
async function elternSkillLoad(kids){
  const slot=document.getElementById("skill-slot"); if(!slot)return;
  let sk=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)sk=(await r.json())[0]||null;}catch(e){}
  if(!sk){ slot.innerHTML=""; return; }
  const kidBtns=(kids||[]).map(k=>`<button onclick="skillGeschafft(${sk.id},${k.spieler_id},'${jsq((k.kader&&k.kader.name)||"")}')" style="flex:1;min-width:130px;min-height:44px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#6d28d9;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🎉 ${esc((k.kader&&k.kader.name)||"Kind")} hat's geschafft</button>`).join("");
  slot.innerHTML=`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
    <div style="font-weight:700;margin-bottom:2px">🎬 Skill der Woche</div>
    <div style="font-size:14px;font-weight:700;color:#6d28d9;margin:2px 0">${esc(sk.titel)}</div>
    ${sk.beschreibung?`<div style="font-size:12.5px;color:#475569;margin-bottom:8px">${esc(sk.beschreibung)}</div>`:""}
    ${sk.video_url?`<a href="${esc(sk.video_url)}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:11px;border:1.5px solid #7c3aed;border-radius:10px;background:#faf5ff;color:#6d28d9;font-weight:700;font-size:13px;text-decoration:none;margin-bottom:8px">▶️ Video ansehen</a>`:""}
    <div style="font-size:11px;color:#64748b;margin-bottom:8px">Zuhause geübt und geschafft? Dann Federn freigeben:</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${kidBtns}</div>
  </div>`;
}
async function skillGeschafft(skillId,spielerId,name){
  if(!confirm(`${name||"Dein Kind"} hat den Skill geschafft?\n\nEs gibt 50 Federn fürs Kind.`))return;
  let neu=0;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_quelle:'skillwoche',p_quelle_id:String(skillId)})});
    if(r.ok){const d=await r.json(); if(d>0)neu=d;}
    else if(r.status===403){toast("Nur fürs eigene Kind","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast(neu>0?`Stark! 🪶 +${neu} Federn fürs Kind`:"Diesen Skill hattet ihr schon – gut geübt! 💪");
}

/* Trikot-Wäsche-Rotator (Phase 21.1) bei den Eltern: wer wäscht als Nächstes?
   Meldet sich eine Familie, bekommt das Kind 100 Federn. Anstupsen, wenn die eigene
   Familie lange nicht dran war. Bezahlung/Wäsche läuft real – die App trackt nur.
   AKTUELL AUSGEBLENDET: alle Eltern waschen die Trikots selbst. Zum Reaktivieren
   einfach WAESCHE_AKTIV auf true setzen – Slot, Loader und Federn kommen zurück. */
const WAESCHE_AKTIV=false;
async function elternWaescheLoad(kids){
  const slot=document.getElementById("waesche-slot"); if(!slot)return;
  let log=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/waesche_log?select=datum,spieler_id,kader(name)&order=datum.desc,id.desc&limit=8`,{headers:sbAuthHeaders()});
    if(r.ok)log=await r.json();
  }catch(e){}
  const meineIds=(kids||[]).map(k=>k.spieler_id);
  // Wann war die eigene Familie zuletzt dran?
  const meinLetzter=log.find(x=>meineIds.includes(x.spieler_id));
  const tageHer=meinLetzter?Math.floor((Date.now()-new Date(meinLetzter.datum).getTime())/864e5):null;
  const langeNichtDran=tageHer===null||tageHer>49; // ~7 Wochen oder noch nie
  const fmt=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const verlauf=log.length
    ? log.slice(0,5).map(x=>`<div style="display:flex;gap:6px;font-size:12px;padding:3px 0;border-top:1px solid #f1f5f9"><span style="color:#94a3b8;width:44px">${fmt(x.datum)}</span><span>${esc((x.kader&&x.kader.name)||"—")}s Familie</span></div>`).join("")
    : `<div style="font-size:12px;color:#94a3b8;padding:4px 0">Noch niemand eingetragen.</div>`;
  const kidBtns=(kids||[]).map(k=>`<button onclick="waescheUebernehmen(${k.spieler_id},'${jsq((k.kader&&k.kader.name)||"")}')" style="flex:1;min-width:130px;min-height:44px;padding:9px;border:1.5px solid #2563eb;border-radius:10px;background:#fff;color:#1d4ed8;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🧺 ${esc((k.kader&&k.kader.name)||"Kind")} übernimmt</button>`).join("");
  slot.innerHTML=`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
    <div style="font-weight:700;margin-bottom:2px">🧺 Trikot-Wäsche</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Wer nimmt die Trikots mit? Übernimmt deine Familie, gibt's ${XP_ICON} <b>100 Federn</b> fürs Kind.</div>
    ${langeNichtDran?`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 10px;font-size:12px;color:#1e40af;margin-bottom:8px">👋 ${tageHer===null?"Ihr wart noch nicht dran":"Ihr wart lange nicht dran"} – mögt ihr diesmal?</div>`:""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">${kidBtns}</div>
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;margin-bottom:2px">Zuletzt gewaschen</div>
    ${verlauf}
  </div>`;
}
async function waescheUebernehmen(spielerId,name){
  if(!confirm(`${name||"Dein Kind"}s Familie übernimmt die nächste Wäsche?\n\nDanke! Es gibt 100 Federn fürs Kind.`))return;
  const heute=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/waesche_log`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({spieler_id:spielerId,datum:heute})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht eintragen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  // 100 Federn – pro Wasch-Termin (quelle_id = Datum) einmal, Server dedupliziert.
  let neu=0;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_quelle:'waesche',p_quelle_id:heute})});
    if(r.ok){const d=await r.json(); if(d>0)neu=d;}
  }catch(e){}
  toast(neu>0?`Danke! 🪶 +${neu} Federn fürs Kind`:"Eingetragen – danke!");
  if(typeof elternDashLoad==="function")elternDashLoad();
}

/* Event-Mitbringliste bei den Eltern (löst die Geld-Töpfe ab): zu jedem kommenden
   Event-Termin (typ='event') tragen die Eltern ein, WAS sie mitbringen – Salat,
   Kuchen, Getränke, Pavillon … Reine Absprache, kein Geld. Alle sehen die Liste,
   jeder darf eintragen; löschen darf man nur den eigenen Eintrag (RLS). */
async function mitbringEventsLaden(){
  const heute=new Date().toISOString().slice(0,10);
  const r=await fetch(`${SB_URL}/rest/v1/termine?typ=eq.event&datum=gte.${heute}&select=id,titel,datum,ort&order=datum.asc&limit=4`,{headers:sbAuthHeaders()});
  if(!r.ok)return [];
  return await r.json();
}
async function mitbringItems(terminIds){
  const map={};
  if(!terminIds.length)return map;
  const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen?termin_id=in.(${terminIds.join(",")})&select=id,termin_id,was,wer,created_by&order=id.asc`,{headers:sbAuthHeaders()});
  if(r.ok)(await r.json()).forEach(x=>{(map[x.termin_id]=map[x.termin_id]||[]).push(x);});
  return map;
}
async function elternMitbringLoad(kids){
  const slot=document.getElementById("mitbring-slot"); if(!slot)return;
  window._elternKids=kids||window._elternKids||[];
  let events=[]; try{events=await mitbringEventsLaden();}catch(e){}
  if(!events.length){ slot.innerHTML=""; return; }
  let itemsMap={}; try{itemsMap=await mitbringItems(events.map(e=>e.id));}catch(e){}
  let uid=""; try{uid=sbUserId()||"";}catch(e){}
  const fmtD=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
  const kidOpts=(kids||[]).map(k=>`<option value="${k.spieler_id}">${esc((k.kader&&k.kader.name)||"Kind")}</option>`).join("");
  slot.innerHTML=events.map(ev=>{
    const items=itemsMap[ev.id]||[];
    const liste=items.length
      ? items.map(it=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 0;border-top:1px solid #f1f5f9">
          <span style="flex:1">🍽️ <b>${esc(it.was)}</b>${it.wer?` <span style="color:#94a3b8">· ${esc(it.wer)}</span>`:""}</span>
          ${(uid&&it.created_by===uid)?`<button onclick="mitbringDelete(${it.id})" aria-label="Eintrag löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:32px;min-height:32px;font-size:15px">✕</button>`:""}
        </div>`).join("")
      : `<div style="font-size:12px;color:#94a3b8;padding:4px 0">Noch nichts eingetragen – mach den Anfang! 🎉</div>`;
    const kidSel=(kids&&kids.length>1)?`<select id="mb-kid-${ev.id}" style="min-height:44px;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:13px;background:#fff">${kidOpts}</select>`:"";
    return `<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
      <div style="font-weight:700;margin-bottom:2px">🎉 ${esc(ev.titel||"Event")} · Mitbringliste</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:8px">${fmtD(ev.datum)}${ev.ort?" · "+esc(ev.ort):""} — wer bringt was mit? (Salat, Kuchen, Getränke, Pavillon …)</div>
      ${liste}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        <input id="mb-was-${ev.id}" placeholder="Was bringst du mit?" style="flex:1;min-width:150px;min-height:44px;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:13px" onkeydown="if(event.key==='Enter')mitbringAdd(${ev.id})">
        ${kidSel}
        <button onclick="mitbringAdd(${ev.id})" style="min-height:44px;padding:9px 16px;border:none;border-radius:10px;background:#16a34a;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Eintragen</button>
      </div>
    </div>`;
  }).join("");
}
async function mitbringAdd(terminId){
  const inp=document.getElementById("mb-was-"+terminId);
  const was=(inp&&inp.value||"").trim();
  if(!was){toast("Bitte eintragen, was du mitbringst","err");return;}
  const kids=window._elternKids||[];
  let wer="", spielerId=null;
  const sel=document.getElementById("mb-kid-"+terminId);
  if(sel&&sel.value){ spielerId=Number(sel.value); const k=kids.find(x=>x.spieler_id===spielerId); wer=(k&&k.kader&&k.kader.name)||""; }
  else if(kids.length){ spielerId=kids[0].spieler_id; wer=(kids[0].kader&&kids[0].kader.name)||""; }
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({termin_id:terminId,was,wer:wer||null,spieler_id:spielerId})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht eintragen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  if(inp)inp.value="";
  toast("Eingetragen – danke! 🎉");
  elternMitbringLoad(kids);
}
async function mitbringDelete(id){
  if(!confirm("Deinen Eintrag entfernen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht löschen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  elternMitbringLoad(window._elternKids||[]);
}

/* Büdchen bei Heimspielen: 2 Familien pro Heimspiel, faire Rotation server-seitig
   (RPC buedchen_plan – weist beim Anschauen automatisch auf, wenn noch nicht voll).
   Die eigene Familie kann per Opt-out absagen, dann rückt die nächste nach. */
async function elternBuedchenLoad(termine,kids){
  const slot=document.getElementById("buedchen-slot"); if(!slot)return;
  window._elternKids=kids||window._elternKids||[];
  const heim=(termine||[]).filter(t=>(t.typ==="spiel"||t.typ==="turnier")&&t.heim===true).slice(0,3);
  if(!heim.length){ slot.innerHTML=""; return; }
  const meineIds=(kids||[]).map(k=>k.spieler_id);
  const cards=[];
  for(const t of heim){
    let fam=[];
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/buedchen_plan`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:t.id})});if(r.ok)fam=await r.json();}catch(e){}
    const d=new Date(t.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
    const meine=(fam||[]).find(f=>meineIds.includes(f.spieler_id));
    const namen=(fam&&fam.length)?fam.map(f=>esc(f.name)+"s Familie").join(" & "):"– wird eingeteilt –";
    cards.push(`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05);${meine?"border:2px solid #16a34a":""}">
      <div style="font-weight:700;margin-bottom:2px">🍿 Büdchen · Heimspiel${(t.gegner||t.titel)?" gegen "+esc(t.gegner||t.titel):""}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:8px">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit?" · "+zeit:""} · 2 Familien betreuen das Büdchen</div>
      <div style="font-size:13px">Eingeteilt: <b>${namen}</b></div>
      ${meine?`<div style="margin-top:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;font-size:12.5px;color:#15803d">Ihr seid diesmal dran – danke fürs Büdchen! 🙌</div>
        <button onclick="buedchenOptout(${t.id},${meine.spieler_id})" style="width:100%;margin-top:8px;min-height:44px;border:1.5px solid #dc2626;border-radius:10px;background:#fff;color:#dc2626;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Wir können leider nicht – nächste Familie</button>`:""}
    </div>`);
  }
  slot.innerHTML=cards.join("");
}
async function buedchenOptout(terminId,spielerId){
  if(!confirm("Ihr könnt beim Büdchen nicht? Dann rückt automatisch die nächste Familie nach."))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/buedchen_optout`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:terminId,p_spieler:spielerId})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht ändern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Danke – die nächste Familie rückt nach.");
  if(typeof elternDashLoad==="function")elternDashLoad();
}
/* Elterngespräch: die Eltern signalisieren Bedarf, der Trainer sieht die Wünsche und
   meldet sich zur Terminabstimmung. Anfrage = eine Zeile in elterngespraech_wunsch. */
async function elternGespraechStatus(){
  const slot=document.getElementById("eg-slot"); if(!slot)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/elterngespraech_wunsch?status=eq.offen&select=id,thema,created_at&order=created_at.desc`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){slot.innerHTML="";return;}
  slot.innerHTML=rows.map(w=>`<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:12.5px;color:#6b21a8">✓ Anfrage gesendet – der Trainer meldet sich.${w.thema?`<div style="font-size:11px;color:#7c3aed;margin-top:2px">Thema: ${esc(w.thema)}</div>`:""}</div>`).join("");
}
function elternGespraechOpen(){
  const kids=window._elternKids||[];
  document.getElementById("eg-modal")?.remove();
  const m=document.createElement("div");m.id="eg-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10041;display:flex;align-items:center;justify-content:center;padding:16px";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const kidSel=(kids.length>1)?`<label style="font-size:11px;color:#64748b;display:block;margin-bottom:8px">Um welches Kind geht es?<select id="eg-kid" style="width:100%;padding:9px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:14px;margin-top:2px">${kids.map(k=>`<option value="${k.spieler_id}">${esc((k.kader&&k.kader.name)||"Kind")}</option>`).join("")}</select></label>`:"";
  m.innerHTML=`<div style="background:#fff;color:#1a1a2e;max-width:380px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font-weight:800;font-size:16px;margin-bottom:2px">🗣️ Elterngespräch anfragen</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:12px">Der Trainer bekommt deinen Wunsch und meldet sich zur Terminabstimmung.</div>
    ${kidSel}
    <label style="font-size:11px;color:#64748b">Worum geht es? (optional)<textarea id="eg-thema" rows="3" placeholder="z. B. Entwicklung, Position, eine Frage …" style="width:100%;box-sizing:border-box;padding:9px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:14px;margin-top:2px;resize:vertical"></textarea></label>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="elternGespraechSave(this)" style="flex:1;min-height:44px;border:none;border-radius:10px;background:#7c3aed;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">Anfrage senden</button>
      <button onclick="document.getElementById('eg-modal').remove()" style="min-height:44px;padding:0 16px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;color:#334155;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer">Abbrechen</button>
    </div>
  </div>`;
  document.body.appendChild(m);
}
async function elternGespraechSave(btn){
  const kids=window._elternKids||[];
  const sel=document.getElementById("eg-kid");
  const spielerId=sel?Number(sel.value):(kids[0]&&kids[0].spieler_id)||null;
  const thema=(document.getElementById("eg-thema")?.value||"").trim()||null;
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/elterngespraech_wunsch`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({spieler_id:spielerId,thema})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht senden"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  document.getElementById("eg-modal")?.remove();
  toast("Anfrage gesendet – der Trainer meldet sich 🗣️");
  elternGespraechStatus();
}
/* Elterngespräch-Doodle (Eltern-Seite): der Trainer hat Termine vorgeschlagen –
   die Familie stimmt je Termin ab. RLS zeigt nur die eigenen Polls. */
async function elternPollLoad(){
  const slot=document.getElementById("eltern-poll-slot"); if(!slot)return;
  let polls=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll?select=*&order=created_at.desc&limit=5`,{headers:sbAuthHeaders()});if(r.ok)polls=await r.json();}catch(e){}
  if(!polls.length){slot.innerHTML="";return;}
  const pids=polls.map(p=>p.id);
  let slots=[],votes=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll_slot?poll_id=in.(${pids.join(",")})&select=*&order=datum.asc,uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});if(r.ok)slots=await r.json();}catch(e){}
  const sids=slots.map(s=>s.id);
  if(sids.length){try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll_vote?slot_id=in.(${sids.join(",")})&select=slot_id,voter,status`,{headers:sbAuthHeaders()});if(r.ok)votes=await r.json();}catch(e){}}
  let uid=""; try{uid=sbUserId()||"";}catch(e){}
  const byPoll={}; slots.forEach(s=>{(byPoll[s.poll_id]=byPoll[s.poll_id]||[]).push(s);});
  const bySlot={}; votes.forEach(v=>{(bySlot[v.slot_id]=bySlot[v.slot_id]||[]).push(v);});
  slot.innerHTML=polls.map(p=>{
    const ss=byPoll[p.id]||[]; if(!ss.length)return "";
    const rows=ss.map(s=>{
      const dstr=new Date(s.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
      const zstr=s.uhrzeit?" · "+String(s.uhrzeit).slice(0,5)+" Uhr":"";
      const decided=p.decided_slot_id===s.id;
      if(p.status==="entschieden")return decided?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px;margin-top:6px;font-size:13px;font-weight:700;color:#15803d">✅ Termin: ${dstr}${zstr}</div>`:"";
      const mine=((bySlot[s.id]||[]).find(v=>v.voter===uid)||{}).status||null;
      const btns=["ja","vielleicht","nein"].map(st=>{const on=mine===st;const c=st==="ja"?{e:"👍",col:"#16a34a",l:"Passt"}:st==="vielleicht"?{e:"🤔",col:"#ca8a04",l:"Evtl."}:{e:"👎",col:"#dc2626",l:"Nein"};
        return `<button onclick="epollVote(${s.id},'${st}')" style="flex:1;min-width:60px;padding:8px 4px;border-radius:9px;border:1.5px solid ${on?c.col:"#e2e8f0"};background:${on?c.col:"#fff"};color:${on?"#fff":"#334155"};font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer">${c.e} ${c.l}</button>`;}).join("");
      return `<div style="margin-top:8px"><div style="font-size:12.5px;font-weight:700;margin-bottom:4px">${dstr}${zstr}</div><div style="display:flex;gap:5px">${btns}</div></div>`;
    }).join("");
    return `<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05);border:2px solid #7c3aed">
      <div style="font-weight:700;margin-bottom:2px">🗓️ ${esc(p.titel||"Elterngespräch")}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:6px">${p.status==="entschieden"?"Der Termin steht:":"Der Trainer schlägt Termine vor – wann passt es dir?"}</div>
      ${rows}
    </div>`;
  }).join("");
}
async function epollVote(slotId,status){
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_poll_vote?on_conflict=slot_id,voter`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({slot_id:slotId,status})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht abstimmen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Danke für deine Rückmeldung ✓");
  elternPollLoad();
}
// Trainer-Terminliste: die eingeteilten Büdchen-Familien je Heimspiel nachladen (plant bei Bedarf).
async function buedchenTrainerFill(t){
  const slot=document.getElementById("bd-tm-"+t.id); if(!slot)return;
  let fam=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/buedchen_plan`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:t.id})});if(r.ok)fam=await r.json();}catch(e){}
  const namen=(fam&&fam.length)?fam.map(f=>esc(f.name)).join(" & "):"– noch offen –";
  slot.innerHTML=`🍿 Büdchen: <b style="color:var(--text)">${namen}</b>`;
}

/* Fairplay-Quiz für die Eltern (Phase 18.3): fester Fragensatz rund um den Codex.
   Bestehen bringt dem Kind 50 Federn – genau EINMAL, serverseitig über xp_award_event
   dedupliziert. Wiederholen zum Üben ist erlaubt, Federn gibt es nur beim ersten Mal. */
const FAIRPLAY_QUIZ=[
  {q:"Dein Kind vertändelt den Ball kurz vorm Tor. Was hilft ihm am meisten?",
   opts:["Weiter anfeuern und Mut machen","Laut schimpfen","Genervt den Kopf schütteln"],correct:0,
   fun:"Mut machen! Kinder trauen sich mehr, wenn sie sich sicher fühlen."},
  {q:"Der Schiri pfeift ein Foul, das keins war. Wie reagierst du am Rand?",
   opts:["Ruhig bleiben, Entscheidung akzeptieren","Lautstark protestieren","Auf den Schiri zeigen und meckern"],correct:0,
   fun:"Die Kinder schauen sich genau ab, wie wir mit Fehlern umgehen."},
  {q:"Ein Kind der gegnerischen Mannschaft macht ein tolles Tor. Und jetzt?",
   opts:["Ruhig anerkennen – das war stark","Still bleiben, ist ja der Gegner","Buhen"],correct:0,
   fun:"Ein gutes Tor ist ein gutes Tor – egal welches Trikot."},
  {q:"Vom Spielfeldrand Taktik-Kommandos ins Spiel rufen – gute Idee?",
   opts:["Nein, das Coachen macht der Trainer","Ja, je lauter desto besser","Nur bei wichtigen Spielen"],correct:0,
   fun:"Zu viele Rufe verwirren die Kinder. Anfeuern ja, anweisen nein."},
  {q:"Euer Team verliert deutlich. Was tut der Heimweg dem Kind gut?",
   opts:["Positives hervorheben, Spaß betonen","Jeden Fehler durchgehen","Schweigen und schlechte Laune"],correct:0,
   fun:"Bei der U9 zählt das Gefühl, nicht das Ergebnis."},
  {q:"Ein Mitspieler deines Kindes weint nach einem Fehler. Was ist stark?",
   opts:["Ihn aufmuntern – Kopf hoch!","Ihm sagen, er soll sich zusammenreißen","Weggucken"],correct:0,
   fun:"Ein Team hält zusammen – auch am Spielfeldrand."}
];
let FQ_IDX=0, FQ_RICHTIG=0, FQ_KIDS=[];
function fairplayQuizStart(kids){
  FQ_IDX=0; FQ_RICHTIG=0; FQ_KIDS=(kids||[]).slice();
  document.getElementById("fq-ov")?.remove();
  const ov=document.createElement("div");
  ov.id="fq-ov";
  ov.style.cssText="position:fixed;inset:0;z-index:10055;background:linear-gradient(160deg,#0e3a5f,#0b2f4d);color:#fff;overflow-y:auto;font-family:inherit";
  document.body.appendChild(ov);
  fairplayQuizRender();
}
function fairplayQuizRender(){
  const ov=document.getElementById("fq-ov"); if(!ov)return;
  const q=FAIRPLAY_QUIZ[FQ_IDX];
  // Antworten mischen, damit die richtige nicht immer oben steht
  const order=q.opts.map((t,i)=>({t,i})).sort(()=>Math.random()-0.5);
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:24px 18px 40px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-size:13px;font-weight:800;opacity:.9">🤝 Fairplay-Quiz</div>
      <button onclick="document.getElementById('fq-ov').remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer">✕</button>
    </div>
    <div style="height:6px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden;margin-bottom:16px"><div style="height:100%;width:${Math.round(FQ_IDX/FAIRPLAY_QUIZ.length*100)}%;background:#38bdf8;border-radius:3px;transition:width .3s"></div></div>
    <div style="font-size:11px;opacity:.8;margin-bottom:6px">Frage ${FQ_IDX+1} von ${FAIRPLAY_QUIZ.length}</div>
    <div style="font-size:18px;font-weight:800;line-height:1.4;margin-bottom:18px">${esc(q.q)}</div>
    <div id="fq-opts" style="display:flex;flex-direction:column;gap:10px">
      ${order.map(o=>`<button onclick="fairplayQuizAnswer(${o.i},this)" style="text-align:left;padding:15px 16px;min-height:56px;border:2px solid rgba(255,255,255,.25);border-radius:14px;background:rgba(255,255,255,.08);color:#fff;font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer">${esc(o.t)}</button>`).join("")}
    </div>
    <div id="fq-feedback" style="margin-top:16px"></div>
  </div>`;
}
function fairplayQuizAnswer(i,btn){
  const q=FAIRPLAY_QUIZ[FQ_IDX];
  document.querySelectorAll("#fq-opts button").forEach(b=>b.disabled=true);
  const richtig=i===q.correct;
  if(richtig)FQ_RICHTIG++;
  btn.style.borderColor=richtig?"#22c55e":"#ef4444";
  btn.style.background=richtig?"rgba(34,197,94,.25)":"rgba(239,68,68,.25)";
  try{navigator.vibrate&&navigator.vibrate(richtig?20:[40,40,40]);}catch(e){}
  document.getElementById("fq-feedback").innerHTML=`<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:12px 14px">
    <div style="font-size:14px;font-weight:800">${richtig?"👍 Genau!":"💡 Fast – so geht's fairer:"}</div>
    <div style="font-size:13px;opacity:.95;margin-top:3px">${esc(q.fun)}</div>
    <button onclick="fairplayQuizNext()" style="width:100%;min-height:48px;margin-top:12px;border:none;border-radius:12px;background:#fff;color:#0b2f4d;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer">${FQ_IDX<FAIRPLAY_QUIZ.length-1?"Weiter":"Fertig 🎉"}</button>
  </div>`;
}
function fairplayQuizNext(){
  if(FQ_IDX<FAIRPLAY_QUIZ.length-1){FQ_IDX++;fairplayQuizRender();}
  else fairplayQuizResult();
}
async function fairplayQuizResult(){
  const ov=document.getElementById("fq-ov"); if(!ov)return;
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:60px 18px;text-align:center;opacity:.85">Federn werden gutgeschrieben …</div>`;
  // Federn fürs eigene Kind – genau einmal (Server dedupliziert). Bei mehreren Kindern jedes.
  let neu=0, schonGehabt=false;
  for(const k of FQ_KIDS){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({p_spieler_id:k.spieler_id,p_quelle:'fairplay_quiz',p_quelle_id:'done'})});
      if(r.ok){const d=await r.json(); if(d>0)neu+=d; else schonGehabt=true;}
    }catch(e){}
  }
  if(!document.getElementById("fq-ov"))return;
  try{navigator.vibrate&&navigator.vibrate([100,50,100,50,200]);}catch(e){}
  const federnZeile=neu>0
    ? `<div style="font-size:17px;font-weight:900;color:#fde047">🪶 +${neu} Federn fürs Kind!</div>`
    : (schonGehabt?`<div style="font-size:14px;opacity:.92">Die Federn hattet ihr schon – aber Üben schadet nie. 💚</div>`
                  :`<div style="font-size:13px;opacity:.85">Melde dich an, damit die Federn beim Kind landen.</div>`);
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:40px 18px;text-align:center">
    <div style="font-size:56px">🏅</div>
    <div style="font-size:24px;font-weight:900;margin-top:8px">${FQ_RICHTIG} von ${FAIRPLAY_QUIZ.length} richtig</div>
    <div style="font-size:14px;opacity:.9;margin:8px 0 16px">Danke, dass ihr Fairplay vorlebt – die Kinder schauen es sich ab.</div>
    ${federnZeile}
    <button onclick="document.getElementById('fq-ov').remove()" style="width:100%;min-height:52px;margin-top:22px;border:none;border-radius:14px;background:#fff;color:#0b2f4d;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer">Schließen</button>
  </div>`;
}

// Regeln aus der DB laden; leer/offline → die fest verdrahteten als Fallback.
async function fairplayRegelnLaden(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fairplay_regeln?select=emoji,titel,text&order=sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok){
      const rows=await r.json();
      if(rows.length)return rows.map(x=>({emo:x.emoji||"•",t:x.titel||"",d:x.text||""}));
    }
  }catch(e){}
  return FAIRPLAY_REGELN;
}
/* Fairplay-Commitment: die Eltern haken den Codex bewusst ab („verstanden und ich bin dabei").
   Serverseitig je Elternteil eine Zeile (fairplay_commit) – ein klares, festgehaltenes Ja. */
async function fairplayCommitCheck(){
  if(!sbToken())return null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fairplay_commit?select=committed_at&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const rows=await r.json(); if(rows&&rows.length)return rows[0].committed_at;}
  }catch(e){}
  return null;
}
async function fairplayCommitLoad(){
  const slot=document.getElementById("fp-commit-slot"); if(!slot)return;
  if(!sbToken()){slot.innerHTML="";return;} // nur eingeloggte Eltern
  const committed=await fairplayCommitCheck();
  if(committed){
    const d=new Date(committed);
    slot.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:12px;border:1.5px solid #16a34a;border-radius:10px;background:#f0fdf4">
      <span style="font-size:20px">✅</span>
      <div style="font-size:12.5px;color:#15803d;font-weight:700">Verstanden und dabei${isNaN(d)?"":` · seit ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}`}<div style="font-weight:500;color:#166534;font-size:11.5px;margin-top:1px">Danke, dass du unseren Codex mitträgst! 💚</div></div>
    </div>`;
  }else{
    slot.innerHTML=`<label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1.5px dashed #16a34a;border-radius:10px;background:#f0fdf4;cursor:pointer">
      <input type="checkbox" id="fp-commit-cb" onchange="fairplayCommitDo(this)" style="margin-top:2px;flex:none">
      <span style="font-size:12.5px;color:#15803d">Ich habe den Codex gelesen – <b>verstanden und ich bin dabei.</b></span>
    </label>`;
  }
}
async function fairplayCommitDo(cb){
  if(cb&&!cb.checked)return;              // nur das Abhaken zählt als Zusage
  if(cb)cb.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fairplay_commit?on_conflict=user_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({committed_at:new Date().toISOString()})});
    if(sbCheck401(r)){if(cb){cb.disabled=false;cb.checked=false;}return;}
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");if(cb){cb.disabled=false;cb.checked=false;}return;}
  }catch(e){toast("Netzwerkfehler","err");if(cb){cb.disabled=false;cb.checked=false;}return;}
  toast("Danke – dein Ja zum Fairplay-Codex ist notiert! 💚");
  try{navigator.vibrate&&navigator.vibrate([20,30,20]);}catch(e){}
  fairplayCommitLoad(); // Karte im Eltern-Bereich auf die Bestätigung umschalten
  if(document.getElementById("fp-modal-commit"))fairplayModalCommitRender(true); // Codex-Fenster mitziehen
}
// Commitment-Block im Codex-Fenster (unter den Regeln) – Häkchen + „ich bin dabei".
function fairplayModalCommitRender(committed){
  const box=document.getElementById("fp-modal-commit"); if(!box)return;
  if(committed){
    box.innerHTML=`<div style="display:flex;align-items:center;gap:10px;justify-content:center;padding:14px;border-radius:14px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28)">
      <span style="font-size:22px">✅</span><span style="font-size:14px;font-weight:800">Du bist dabei – danke! 💚</span></div>
      <button onclick="document.getElementById('fairplay-ov').remove()" style="width:100%;min-height:52px;margin-top:12px;border:none;border-radius:14px;background:#fff;color:#065f46;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer">Schließen</button>`;
  }else{
    box.innerHTML=`<label style="display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);cursor:pointer;text-align:left">
        <input type="checkbox" id="fp-modal-cb" onchange="fairplayCommitDo(this)" style="margin-top:2px;flex:none;width:24px;height:24px">
        <span style="font-size:14.5px;font-weight:700;line-height:1.4">Ich habe den Codex gelesen – <u>verstanden und ich bin dabei.</u></span>
      </label>
      <button onclick="document.getElementById('fairplay-ov').remove()" style="width:100%;min-height:48px;margin-top:10px;border:1.5px solid rgba(255,255,255,.6);border-radius:14px;background:transparent;color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer">Später</button>`;
  }
}
async function fairplayOpen(){
  document.getElementById("fairplay-ov")?.remove();
  const ov=document.createElement("div");
  ov.id="fairplay-ov";
  ov.style.cssText="position:fixed;inset:0;z-index:10050;background:linear-gradient(160deg,#065f46,#064e3b);color:#fff;overflow-y:auto;font-family:inherit;-webkit-overflow-scrolling:touch";
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:80px 18px;text-align:center;opacity:.85">Lade Codex …</div>`;
  document.body.appendChild(ov);
  const regeln=await fairplayRegelnLaden();
  if(!document.getElementById("fairplay-ov"))return; // zwischenzeitlich geschlossen
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:24px 18px 40px">
    <div style="text-align:center;margin-bottom:6px;font-size:40px">🦅</div>
    <div style="text-align:center;font-size:22px;font-weight:900;letter-spacing:.3px">Unser Fairplay-Codex</div>
    <div style="text-align:center;font-size:13px;opacity:.9;margin:6px 0 20px">SV Adler Dellbrück · U9 – für einen guten Spielfeldrand</div>
    ${regeln.map((r,i)=>`<div style="display:flex;gap:14px;align-items:flex-start;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:16px;margin-bottom:12px">
      <div style="font-size:30px;line-height:1">${esc(r.emo)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:800">${i+1}. ${esc(r.t)}</div>
        <div style="font-size:13.5px;opacity:.95;line-height:1.55;margin-top:3px">${esc(r.d)}</div>
      </div>
    </div>`).join("")}
    <div style="text-align:center;font-size:13px;opacity:.9;margin:16px 0 14px">Danke, dass ihr das mittragt. 💚</div>
    <div id="fp-modal-commit"></div>
  </div>`;
  fairplayCommitCheck().then(c=>fairplayModalCommitRender(!!c));
}

/* Trainer-Editor für den Fairplay-Codex. Der Trainer pflegt die Regeln, die Eltern
   sehen sie im Overlay. Gespeichert wird als komplette Liste (delete-all + insert) –
   die Datenmenge ist winzig und das erspart id-Jonglieren beim Umsortieren. */
let FP_EDIT=[];
async function fairplayEditOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("fpe-modal")?.remove();
  FP_EDIT=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fairplay_regeln?select=emoji,titel,text&order=sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok)FP_EDIT=(await r.json()).map(x=>({emo:x.emoji||"",titel:x.titel||"",text:x.text||""}));
  }catch(e){}
  if(!FP_EDIT.length)FP_EDIT=FAIRPLAY_REGELN.map(r=>({emo:r.emo,titel:r.t,text:r.d}));
  const modal=document.createElement("div");
  modal.id="fpe-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Fairplay-Codex bearbeiten");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="fpe-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  modal.appendChild(c);document.body.appendChild(modal);
  fairplayEditRender();
}
function fairplayEditRender(){
  const c=document.getElementById("fpe-card"); if(!c)return;
  const fld="padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🤝 Fairplay-Codex bearbeiten</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Diese Regeln sehen die Eltern im Codex-Overlay. Reihenfolge mit den Pfeilen.</div>
    ${FP_EDIT.map((r,i)=>`<div style="border:var(--border-s);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input value="${esc(r.emo)}" oninput="FP_EDIT[${i}].emo=this.value" maxlength="4" style="width:52px;text-align:center;font-size:18px;${fld}">
        <input value="${esc(r.titel)}" oninput="FP_EDIT[${i}].titel=this.value" placeholder="Titel der Regel" style="flex:1;font-weight:700;${fld}">
      </div>
      <textarea oninput="FP_EDIT[${i}].text=this.value" rows="2" placeholder="Kurze Erklärung (optional)" style="width:100%;resize:vertical;${fld}">${esc(r.text)}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn btn-sm" onclick="fairplayEditMove(${i},-1)" ${i===0?"disabled":""} title="nach oben"><i class="ti ti-arrow-up"></i></button>
        <button class="btn btn-sm" onclick="fairplayEditMove(${i},1)" ${i===FP_EDIT.length-1?"disabled":""} title="nach unten"><i class="ti ti-arrow-down"></i></button>
        <button class="btn btn-sm btn-d" style="margin-left:auto" onclick="fairplayEditDel(${i})"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join("")}
    <button class="btn btn-sm" style="width:100%;margin-bottom:12px" onclick="fairplayEditAdd()"><i class="ti ti-plus"></i>Regel hinzufügen</button>
    <div style="display:flex;gap:8px">
      <button class="btn btn-p btn-sm" onclick="fairplayEditSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('fpe-modal').remove()">Schließen</button>
    </div>`;
}
function fairplayEditAdd(){ FP_EDIT.push({emo:"⭐",titel:"",text:""}); fairplayEditRender(); }
function fairplayEditDel(i){ FP_EDIT.splice(i,1); fairplayEditRender(); }
function fairplayEditMove(i,dir){ const j=i+dir; if(j<0||j>=FP_EDIT.length)return; const t=FP_EDIT[i];FP_EDIT[i]=FP_EDIT[j];FP_EDIT[j]=t; fairplayEditRender(); }
async function fairplayEditSave(btn){
  const rows=FP_EDIT.map((r,i)=>({sort:i,emoji:(r.emo||"").trim()||null,titel:(r.titel||"").trim(),text:(r.text||"").trim()||null}))
                    .filter(r=>r.titel); // Regeln ohne Titel verwerfen
  if(!rows.length){toast("Mindestens eine Regel mit Titel","err");return;}
  if(btn)btn.disabled=true;
  try{
    // Ganze Liste ersetzen: erst leeren, dann neu einfügen.
    const del=await fetch(`${SB_URL}/rest/v1/fairplay_regeln?id=gt.0`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(del))return;
    if(!del.ok){toast(sbDeniedMsg(del,"Konnte nicht speichern"),"err");return;}
    const ins=await fetch(`${SB_URL}/rest/v1/fairplay_regeln`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(rows)});
    if(!ins.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Codex gespeichert ✓ Die Eltern sehen ihn sofort.");
  document.getElementById("fpe-modal")?.remove();
}

/* ── Eltern-Leitfaden: ausformulierte Vereinbarung, abrufbar im Eltern-Bereich, trainer-pflegbar.
   Gleiches Muster wie der Fairplay-Codex (Tabelle eltern_leitfaden, Default = Offline-Fallback). ── */
async function leitfadenLaden(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/eltern_leitfaden?select=emoji,titel,text&aktiv=eq.true&order=sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok){const rows=await r.json(); if(rows.length)return rows.map(x=>({emo:x.emoji||"•",t:x.titel||"",d:x.text||""}));}
  }catch(e){}
  return ELTERN_LEITFADEN;
}
async function leitfadenOpen(){
  document.getElementById("leitfaden-ov")?.remove();
  const ov=document.createElement("div");
  ov.id="leitfaden-ov";
  ov.style.cssText="position:fixed;inset:0;z-index:10050;background:linear-gradient(160deg,#0c4a6e,#082f49);color:#fff;overflow-y:auto;font-family:inherit;-webkit-overflow-scrolling:touch";
  ov.innerHTML=`<div style="max-width:560px;margin:0 auto;padding:80px 18px;text-align:center;opacity:.85">Lade ${esc(LEITFADEN_NAME)} …</div>`;
  document.body.appendChild(ov);
  const teile=await leitfadenLaden();
  if(!document.getElementById("leitfaden-ov"))return;
  ov.innerHTML=`<div style="max-width:560px;margin:0 auto;padding:24px 18px 40px">
    <div style="text-align:center;margin-bottom:6px;font-size:40px">📖</div>
    <div style="text-align:center;font-size:22px;font-weight:900;letter-spacing:.3px">${esc(LEITFADEN_NAME)}</div>
    <div style="text-align:center;font-size:13px;opacity:.9;margin:6px 0 20px">SV Adler Dellbrück · U9 – damit unser Miteinander gelingt</div>
    ${teile.map((r,i)=>`<div style="display:flex;gap:14px;align-items:flex-start;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:16px;margin-bottom:12px">
      <div style="font-size:28px;line-height:1">${esc(r.emo)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:800">${i+1}. ${esc(r.t)}</div>
        ${r.d?`<div style="font-size:13.5px;opacity:.95;line-height:1.6;margin-top:4px">${esc(r.d)}</div>`:""}
      </div>
    </div>`).join("")}
    <div style="text-align:center;font-size:13px;opacity:.9;margin:16px 0 20px">Danke, dass ihr das mittragt. 💙</div>
    <button onclick="document.getElementById('leitfaden-ov').remove()" style="width:100%;min-height:52px;border:none;border-radius:14px;background:#fff;color:#0c4a6e;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer">Verstanden 👍</button>
  </div>`;
}
// Trainer-Editor (spiegelt den Fairplay-Editor).
let LF_EDIT=[];
async function leitfadenEditOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("lfe-modal")?.remove();
  LF_EDIT=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/eltern_leitfaden?select=emoji,titel,text&order=sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok)LF_EDIT=(await r.json()).map(x=>({emo:x.emoji||"",titel:x.titel||"",text:x.text||""}));
  }catch(e){}
  if(!LF_EDIT.length)LF_EDIT=ELTERN_LEITFADEN.map(r=>({emo:r.emo,titel:r.t,text:r.d}));
  const modal=document.createElement("div");
  modal.id="lfe-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Eltern-Leitfaden bearbeiten");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="lfe-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  modal.appendChild(c);document.body.appendChild(modal);
  leitfadenEditRender();
}
function leitfadenEditRender(){
  const c=document.getElementById("lfe-card"); if(!c)return;
  const fld="padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">📖 ${esc(LEITFADEN_NAME)} bearbeiten</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Diese Punkte sehen die Eltern in ihrem Bereich. Reihenfolge mit den Pfeilen.</div>
    ${LF_EDIT.map((r,i)=>`<div style="border:var(--border-s);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input value="${esc(r.emo)}" oninput="LF_EDIT[${i}].emo=this.value" maxlength="4" style="width:52px;text-align:center;font-size:18px;${fld}">
        <input value="${esc(r.titel)}" oninput="LF_EDIT[${i}].titel=this.value" placeholder="Überschrift" style="flex:1;font-weight:700;${fld}">
      </div>
      <textarea oninput="LF_EDIT[${i}].text=this.value" rows="3" placeholder="Ausformulierter Text" style="width:100%;resize:vertical;${fld}">${esc(r.text)}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn btn-sm" onclick="leitfadenEditMove(${i},-1)" ${i===0?"disabled":""} title="nach oben"><i class="ti ti-arrow-up"></i></button>
        <button class="btn btn-sm" onclick="leitfadenEditMove(${i},1)" ${i===LF_EDIT.length-1?"disabled":""} title="nach unten"><i class="ti ti-arrow-down"></i></button>
        <button class="btn btn-sm btn-d" style="margin-left:auto" onclick="leitfadenEditDel(${i})"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join("")}
    <button class="btn btn-sm" style="width:100%;margin-bottom:12px" onclick="leitfadenEditAdd()"><i class="ti ti-plus"></i>Punkt hinzufügen</button>
    <div style="display:flex;gap:8px">
      <button class="btn btn-p btn-sm" onclick="leitfadenEditSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('lfe-modal').remove()">Schließen</button>
    </div>`;
}
function leitfadenEditAdd(){ LF_EDIT.push({emo:"⭐",titel:"",text:""}); leitfadenEditRender(); }
function leitfadenEditDel(i){ LF_EDIT.splice(i,1); leitfadenEditRender(); }
function leitfadenEditMove(i,dir){ const j=i+dir; if(j<0||j>=LF_EDIT.length)return; const t=LF_EDIT[i];LF_EDIT[i]=LF_EDIT[j];LF_EDIT[j]=t; leitfadenEditRender(); }
async function leitfadenEditSave(btn){
  const rows=LF_EDIT.map((r,i)=>({sort:i,emoji:(r.emo||"").trim()||null,titel:(r.titel||"").trim(),text:(r.text||"").trim()||null,aktiv:true}))
                    .filter(r=>r.titel);
  if(!rows.length){toast("Mindestens ein Punkt mit Überschrift","err");return;}
  if(btn)btn.disabled=true;
  try{
    const del=await fetch(`${SB_URL}/rest/v1/eltern_leitfaden?id=gt.0`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(del))return;
    if(!del.ok){toast(sbDeniedMsg(del,"Konnte nicht speichern"),"err");return;}
    const ins=await fetch(`${SB_URL}/rest/v1/eltern_leitfaden`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(rows)});
    if(!ins.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast(LEITFADEN_NAME+" gespeichert ✓ Die Eltern sehen ihn sofort.");
  document.getElementById("lfe-modal")?.remove();
}

/* Platz-Ampel-Banner für die Eltern – nur wenn der Trainer einen Status gesetzt hat.
   Farben aus der gemeinsamen PLATZ_AMPEL-Definition, kontrastreich für draußen. */
function elternPlatzAmpelBanner(termin){
  const s=termin.platz_status; const a=(typeof PLATZ_AMPEL!=="undefined"&&PLATZ_AMPEL[s]);
  if(!a)return "";
  const bg=s==="abgesagt"?"#dc2626":s==="ausweich"?"#d97706":"#16a34a";
  const wann=termin.platz_status_at?new Date(termin.platz_status_at).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
  const text=s==="abgesagt"?"Der Termin fällt heute aus."
            :s==="ausweich"?"Heute auf den Ausweichplatz."
            :"Der Termin findet statt.";
  return `<div style="background:${bg};color:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 4px 16px ${bg}55">
    <div style="font-size:18px;font-weight:900;display:flex;align-items:center;gap:8px">${a.emo} ${esc(a.lbl)}</div>
    <div style="font-size:13.5px;opacity:.97;margin-top:4px">${text}${termin.platz_status_note?` <b>${esc(termin.platz_status_note)}</b>`:""}</div>
    ${wann?`<div style="font-size:10.5px;opacity:.8;margin-top:6px">Aktualisiert ${wann} Uhr vom Trainer</div>`:""}
  </div>`;
}

/* Pausiert mein Kind? Die Nominierungen sind trainer-only, deshalb fragt die RPC
   kind_nominierungsstatus nur nach dem eigenen Kind. Angezeigt wird die Karte NUR,
   wenn der Trainer die Einteilung übertragen hat UND das Kind zugesagt hatte –
   sonst wäre "nicht nominiert" bloß der Normalzustand vor der Einteilung. */
async function elternPauseLoad(termin,kids){
  const box=document.getElementById("pause-card");
  if(!box||!termin)return;
  const treffer=[];
  for(const k of kids){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_nominierungsstatus`,{method:"POST",
        headers:{...sbAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({p_spieler:k.spieler_id,p_datum:termin.datum})});
      if(!r.ok)continue;
      const s=await r.json();
      if(s&&s.ok&&s.eingeteilt&&!s.nominiert&&s.zugesagt)
        treffer.push({name:(k.kader&&k.kader.name)||"Dein Kind",grund:s.grund});
    }catch(e){}
  }
  if(!treffer.length){ box.innerHTML=""; return; }
  const m=(typeof TM_META!=="undefined"&&TM_META[termin.typ])||{label:termin.typ};
  box.innerHTML=treffer.map(t=>`<div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:14px;padding:16px;margin-bottom:12px">
    <div style="font-size:15px;font-weight:800;color:#92400e">😌 Diesmal pausiert ${esc(t.name)}</div>
    <div style="font-size:12.5px;color:#92400e;line-height:1.55;margin-top:6px">
      Beim ${esc(m.label)} am ${new Date(termin.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})} ist der Kader voll –
      ${esc(t.name)} ist diesmal nicht dabei. Beim nächsten Mal ist er wieder eingeplant.
    </div>
    ${t.grund?`<div style="margin-top:8px;background:#fff;border-radius:8px;padding:8px 10px;font-size:12.5px;color:#334155">${esc(t.grund)}<div style="font-size:10px;color:#94a3b8;margin-top:3px">Nachricht vom Trainer</div></div>`:""}
  </div>`).join("");
}

/* Turnierplan für die Eltern: Begegnungen, Link zum Turnierbaum, Aushang (Foto/PDF).
   Der Plan liegt je Team unter "<datum>" bzw. "<datum>__t2/3" – wir holen alle
   Varianten des Tages und gruppieren sie, damit Eltern von Adler 2 ihre Spiele finden. */
async function elternTurnierplanLoad(termin){
  const box=document.getElementById("turnierplan-card");
  if(!box||!termin)return;
  let plan=[], ergebnisse=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/turnier_plan?datum=like.${encodeURIComponent(termin.datum)}*&select=*&order=datum.asc,sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok)plan=await r.json();
  }catch(e){}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/turnier_spiele?datum=like.${encodeURIComponent(termin.datum)}*&select=plan_id,tore,gegentore`,{headers:sbAuthHeaders()});
    if(r.ok)ergebnisse=await r.json();
  }catch(e){}
  const erg={}; ergebnisse.forEach(x=>{ if(x.plan_id)erg[x.plan_id]=x; });

  const knoepfe=[];
  if(termin.turnierplan_url)knoepfe.push(`<a href="${esc(termin.turnierplan_url)}" target="_blank" rel="noopener noreferrer" style="flex:1;min-width:130px;text-align:center;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-size:13px;font-weight:700;text-decoration:none">🔗 Turnierbaum</a>`);
  if(termin.turnierplan_datei)knoepfe.push(`<button onclick="elternAushangOeffnen('${jsq(termin.turnierplan_datei)}')" style="flex:1;min-width:130px;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📄 Aushang ansehen</button>`);

  if(!plan.length&&!knoepfe.length){ box.innerHTML=""; return; }

  let liste="";
  if(plan.length){
    const gruppen={};
    plan.forEach(p=>{ const t=teamLabelFromKey(p.datum)||" · Adler 1"; (gruppen[t]=gruppen[t]||[]).push(p); });
    const mehrere=Object.keys(gruppen).length>1;
    liste=Object.entries(gruppen).map(([label,zeilen])=>
      (mehrere?`<div style="font-size:11px;font-weight:700;color:#64748b;margin:8px 0 2px">${esc(label.replace(/^ · /,""))}</div>`:"")
      +zeilen.map(p=>{
        const e=erg[p.id];
        const farbe=e?(e.tore>e.gegentore?"#059669":e.tore===e.gegentore?"#b45309":"#dc2626"):"#94a3b8";
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #f1f5f9">
          <span style="font-size:11.5px;color:#64748b;width:44px">${p.uhrzeit?esc(p.uhrzeit):"--:--"}</span>
          <span style="flex:1;font-size:12.5px">${esc(p.gegner||"?")}${p.feld?`<span style="color:#94a3b8;font-size:10.5px"> · ${esc(p.feld)}</span>`:""}</span>
          <span style="font-weight:800;font-size:13px;color:${farbe}">${e?`${e.tore}:${e.gegentore}`:"–"}</span>
        </div>`;
      }).join("")).join("");
  }
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-size:12.5px;font-weight:700;color:#1e3a8a;margin-bottom:2px">🏆 Turnierplan</div>
    ${plan.length?`<div style="font-size:11px;color:#94a3b8;margin-bottom:2px">Ergebnisse erscheinen, sobald der Trainer sie einträgt.</div>`:""}
    ${liste}
    ${knoepfe.length?`<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">${knoepfe.join("")}</div>`:""}
  </div>`;
}
// Der Bucket ist privat – Datei mit dem Eltern-Token holen und lokal öffnen.
async function elternAushangOeffnen(pfad){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${pfad}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok){toast("Aushang nicht gefunden","err");return;}
    window.open(URL.createObjectURL(await r.blob()),"_blank","noopener");
  }catch(e){toast("Netzwerkfehler","err");}
}

/* Fan-Link: Eltern geben den Spenden-Link an Oma, Opa & Fans weiter.
   Nur Weitergabe eines Links – die App fasst weiterhin kein Geld an. */
function akShareBtnHtml(){
  return `<button onclick="akShare()" style="width:100%;margin-top:8px;padding:10px;border:1.5px solid #0070ba;border-radius:10px;background:#fff;color:#0070ba;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📤 Fan-Link teilen (Oma, Opa &amp; Fans)</button>`;
}
function akShare(){
  const url=window._akLink; if(!url)return;
  const text=`🦅 Unterstütz die U9 vom SV Adler Dellbrück!\nJeder Euro fließt direkt in die Mannschaft:\n${url}`;
  if(navigator.share){navigator.share({title:"Adler-Kasse U9",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Fan-Link kopiert ✓"),()=>prompt("Fan-Link:",url));}
}

/* Liveticker für Eltern: nur bei Spiel/Turnier. Der Ticker-Key ist das Termin-Datum,
   bei Adler 2/3 mit Suffix __t<n> (siehe spieltagKey()). Team wird kurz abgefragt. */
function elternTicker(datum,team){
  const key=Number(team)>1?`${datum}__t${Number(team)}`:datum;
  location.href=location.pathname+"?ticker="+encodeURIComponent(key);
}
/* A1/A2: Persönlicher Nach-dem-Spiel-Gruß. Für das jüngste vergangene Spiel/Turnier holt die
   App pro Kind die eigenen Ballaktionen (RPC kind_spiel_stats, da match_actions trainer-only)
   und formt daraus eine warme, kindgerechte Zeile. */
const GRUSS_AKT={tor:{e:"⚽",l:"Tor"},pass:{e:"🎯",l:"Pass"},dribbling:{e:"🌀",l:"Dribbling"},gewinn:{e:"🦅",l:"Ballgewinn"},parade:{e:"🧤",l:"Parade"},aufbau:{e:"🧩",l:"Aufbau"},heraus:{e:"🚀",l:"Herausspielen"}};
function grussLine(st){
  const p=n=>n===1?"":"e";
  if(st.tor)return `Was für ein Torjäger – ${st.tor} Tor${p(st.tor)}! ⚽🎉`;
  if(st.parade)return "Ein echter Rückhalt im Tor! 🧤";
  if((st.gewinn||0)>=3)return "Ballräuber vom Dienst! 🦅";
  if((st.pass||0)>=3)return "Pass-Maschine – super Teamplay! 🎯";
  if((st.dribbling||0)>=3)return "Dribbel-Show gezeigt! 🌀";
  return "Toller Einsatz – weiter so! 💪";
}
async function elternMatchGrussLoad(kids){
  const slot=document.getElementById("match-gruss-slot"); if(!slot)return;
  const heute=new Date().toISOString().slice(0,10);
  let game=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=datum,typ,titel,gegner&typ=in.(spiel,turnier)&datum=lt.${heute}&order=datum.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)game=(await r.json())[0];}catch(e){}
  if(!game){slot.innerHTML="";return;}
  // R3: eine RPC liefert die Stats ALLER Kinder dieses Elternteils (kein N+1 mehr).
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/eltern_kinder_spiel_stats`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_datum:game.datum})});if(r.ok)rows=await r.json();}catch(e){}
  const d=new Date(game.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const cards=[];
  (rows||[]).forEach(row=>{
    const st=row.stats||{}, total=Object.values(st).reduce((a,b)=>a+(+b||0),0);
    if(!total)return;
    const chips=Object.keys(GRUSS_AKT).filter(a=>st[a]).map(a=>`<span style="display:inline-block;background:#f5f3ff;color:#5b21b6;border-radius:12px;padding:3px 9px;font-size:12px;font-weight:700;margin:2px 3px 2px 0">${GRUSS_AKT[a].e} ${st[a]}× ${GRUSS_AKT[a].l}</span>`).join("");
    cards.push(`<div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;box-shadow:0 2px 10px rgba(0,0,0,.05);border-left:3px solid #7c3aed">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8">Rückblick · ${d}</div>
      <div style="font-weight:800;font-size:15px;margin-top:2px">🦅 ${esc(row.name||"Kind")}${game.gegner?` gegen ${esc(game.gegner)}`:""}</div>
      <div style="margin-top:8px">${chips}</div>
      <div style="font-size:12.5px;color:#15803d;font-weight:700;margin-top:8px">${grussLine(st)}</div>
    </div>`);
  });
  slot.innerHTML=cards.join("");
}
// R7: DSGVO-Datenexport – sammelt die vom Elternteil lesbaren Daten des eigenen Kindes.
async function elternDataExport(btn){
  if(btn)btn.disabled=true;
  const kids=window._elternKids||[];
  const out={ exportiert_am:new Date().toISOString(), verein:"SV Adler Dellbrück · U9", kinder:[] };
  for(const k of kids){
    const kid={ name:(k.kader&&k.kader.name)||"", nr:(k.kader&&k.kader.nr)??null, spieler_id:k.spieler_id, rueckmeldungen:[], federn:[], sprachlob_anzahl:0 };
    try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?spieler_id=eq.${k.spieler_id}&select=termin_id,status,kommentar,updated_at`,{headers:sbAuthHeaders()});if(r.ok)kid.rueckmeldungen=await r.json();}catch(e){}
    try{const r=await fetch(`${SB_URL}/rest/v1/punkte_log?spieler_id=eq.${k.spieler_id}&select=delta,grund,quelle,created_at&order=created_at.asc`,{headers:sbAuthHeaders()});if(r.ok)kid.federn=await r.json();}catch(e){}
    try{const r=await fetch(`${SB_URL}/rest/v1/kabine_lob?spieler_id=eq.${k.spieler_id}&select=created_at`,{headers:sbAuthHeaders()});if(r.ok)kid.sprachlob_anzahl=((await r.json())||[]).length;}catch(e){}
    out.kinder.push(kid);
  }
  try{
    const blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="adler-daten-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    toast("Daten heruntergeladen ✓");
  }catch(e){toast("Download nicht möglich","err");}
  if(btn)btn.disabled=false;
}
// Konferenz: alle Teams eines Spieltags in EINEM Ticker (Key <datum>__konf).
function elternTickerKonf(datum){
  location.href=location.pathname+"?ticker="+encodeURIComponent(datum+"__konf");
}
// Container – die eigentliche Auswahl macht elternTickerLoad async (Team-Auto-Erkennung).
function elternTickerHtml(termin){
  if(termin.typ!=="spiel"&&termin.typ!=="turnier")return "";
  return `<div id="eltern-ticker-slot" data-datum="${esc(termin.datum)}"></div>`;
}
// Erkennt automatisch, in welchem Team das eigene Kind spielt (aus der Team-Einteilung
// <datum>__teams), und öffnet direkt dessen Ticker – ohne Auswahl. Zusätzlich: Konferenz.
async function elternTickerLoad(termin){
  const slot=document.getElementById("eltern-ticker-slot"); if(!slot)return;
  if(!termin||(termin.typ!=="spiel"&&termin.typ!=="turnier")){slot.innerHTML="";return;}
  const datum=termin.datum, kids=window._elternKids||[];
  // Team des eigenen Kindes serverseitig ermitteln (nominierungen ist trainer-only -> RPC kind_team).
  let anzahl=1; const myTeams=new Set();
  for(const k of kids){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_team`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:k.spieler_id,p_datum:datum})});
      if(r.ok){const s=await r.json(); if(s&&s.ok){ if(s.anzahl)anzahl=Math.max(anzahl,Number(s.anzahl)||1); if(s.team&&Number(s.team)>=1)myTeams.add(Number(s.team)); }}
    }catch(e){}
  }
  const wrap=(inner)=>`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-size:12.5px;font-weight:700;color:#dc2626;margin-bottom:2px">📣 Liveticker</div>${inner}</div>`;
  const bigBtn=(label,onclick,filled)=>`<button onclick="${onclick}" style="width:100%;min-height:48px;margin-top:6px;padding:12px;border:1.5px solid #dc2626;border-radius:10px;background:${filled?"#dc2626":"#fff"};color:${filled?"#fff":"#dc2626"};font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">${label}</button>`;
  const konfBtn = anzahl>1 ? bigBtn("👥 Konferenz · alle Teams live",`elternTickerKonf('${datum}')`,false) : "";

  if(myTeams.size===1){
    const t=[...myTeams][0];
    slot.innerHTML=wrap(`<div style="font-size:11px;color:#64748b;margin-bottom:2px">Automatisch erkannt: dein Kind spielt heute in <b style="color:#dc2626">Adler ${t}</b>.</div>
      ${bigBtn(`📣 Liveticker öffnen · Adler ${t}`,`elternTicker('${datum}',${t})`,true)}${konfBtn}`);
  }else if(myTeams.size>1){
    const btns=[...myTeams].sort().map(t=>bigBtn(`📣 Adler ${t} (dein Kind)`,`elternTicker('${datum}',${t})`,true)).join("");
    slot.innerHTML=wrap(`<div style="font-size:11px;color:#64748b;margin-bottom:2px">Deine Kinder spielen in mehreren Teams:</div>${btns}${konfBtn}`);
  }else if(anzahl>1){
    // Teams stehen (mehrere), aber das eigene Kind ist (noch) keinem zugeordnet.
    slot.innerHTML=wrap(`<div style="font-size:11px;color:#94a3b8;margin-bottom:2px">Die Team-Einteilung deines Kindes steht noch nicht fest. Sieh einfach alle Teams gemeinsam:</div>${bigBtn("👥 Konferenz · alle Teams live",`elternTickerKonf('${datum}')`,true)}`);
  }else{
    // Nur ein Team an diesem Spieltag – kein Auswahl-/Konferenzbedarf.
    slot.innerHTML=wrap(`<div style="font-size:11px;color:#94a3b8;margin-bottom:2px">Nicht dabei? Hier gibt's Tore und Spielstand live.</div>${bigBtn("📣 Liveticker öffnen",`elternTicker('${datum}',1)`,true)}`);
  }
}

