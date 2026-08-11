/* ═══════════════════════════════════
   TEAM-EINTEILUNG – aus den Eltern-Zusagen auf 1–3 Teams verteilen.
   "Adler 1/2/3" waren bisher nur Etiketten: jedes Team uebernahm dieselben Zusagen,
   also waren ueberall alle Kinder dabei. Jetzt wird EINMAL eingeteilt und die
   Einteilung in die einzelnen Team-Nominierungen uebertragen; von dort greifen
   Rotations-Timer, Aktions-Tracker und die Auto-Aufstellung.
   Gespeichert in nominierungen unter dem Schluessel "<datum>__teams", damit die
   Einteilung neben den drei Team-Zeilen liegt und Neuladen uebersteht.
═══════════════════════════════════ */
/* TEAM_TRAINER: {teamnummer: [Trainername, …]} – wer dieses Team am Spieltag betreut.
   PO: „es muss immer ein Trainer zugewiesen werden", mehrere je Team sind erlaubt.
   Wohnt in derselben data-Spalte wie die Kinder-Einteilung (nominierungen/„…__teams"),
   deshalb keine neue Tabelle, keine Änderung an Backup oder Rechten. WICHTIG: beim Laden
   wie _anzahl aus dem Objekt löschen, sonst landet der Schlüssel in TEAMS und die App
   hält „_trainer" für ein Kind.
   TEAM_STAB: wer überhaupt zuteilbar ist – der ganze Trainerstab (nicht nur wer
   mittrainiert), mit seiner Zusage zu diesem Termin. */
let TEAMS={}, TEAM_ANZAHL=1, TEAM_STATS={}, TEAM_GRUND={}, TEAM_TRAINER={}, TEAM_STAB=[];
/* Welche Team-Kachel ist aufgeklappt (0 = alle zu). Eigener Zustand, NICHT spieltagTeam:
   ein Team ist immer ausgewaehlt, eine Kachel muss sich trotzdem schliessen lassen. */
let TEAM_KARTE_OFFEN=0;
const TEAM_MAX=4; // PO v389: von 3 auf 4 erweitert
function teamsKey(){ return spieltagRawDate()+"__teams"; }
// Feld-IDs nie aus Namen bauen (Umlaute, Leerzeichen) – der Kader-Index ist eindeutig.
function teamKaderIdx(n){ return KADER.findIndex(k=>k.name===n); }
function teamSpielerId(n){ const k=getKader(n); return k&&k._id; }

/* Kadergröße je Spielform (PO-Vorgabe):
     Funino  – ohne Torwart, 4 Feldspieler
     4+1     – 1 Torwart + 6 Feldspieler
     5+1     – 1 Torwart + 7 Feldspieler
   Torwart darf nur werden, wer im Kader den Haken "🥅 TW" hat. */
function teamKader(){
  const key=(typeof tbFormation!=="undefined"&&tbFormation)||"4+1";
  if(key==="funino")return {tw:0,feld:4,gesamt:4};
  if(key==="5+1")   return {tw:1,feld:7,gesamt:8};
  return {tw:1,feld:6,gesamt:7};                 // 4+1
}
function istTorwart(n){ const k=getKader(n); return !!(k&&k.tw); }

/* Wer wird auf die Teams verteilt? Die NOMINIERUNG (nomStatus="dabei") – nicht die
   Eltern-Rückmeldung allein.
   Vorher stand hier nur `nomRsvp[n].status==="zugesagt"`. Der Gedanke war richtig
   („wer nicht zusagt, spielt nicht"), das Ziel aber falsch gewählt: die Nominierung ist
   die Entscheidung des TRAINERS, und sie wird aus den Eltern-Rückmeldungen ohnehin
   vorbelegt (nomLoad). Mit 16 nominierten Kindern, aber nur einer Eltern-Zusage
   verteilte „Automatisch einteilen" genau EIN Kind – es sah aus, als täte der Knopf
   nichts (PO-Meldung v392).
   Seit v393 ist nomStatus global (ein Spieltag, eine Liste). Die bereits Eingeteilten
   bleiben als Sicherheitsnetz drin – falls die Nominierung noch nicht geladen ist. */
function teamZusagen(){
  const namen=new Set();
  if(typeof nomStatus==="object"&&nomStatus)
    KADER.forEach(k=>{ if(nomStatus[k.name]==="dabei")namen.add(k.name); });
  Object.keys(TEAMS||{}).forEach(n=>{ if(TEAMS[n])namen.add(n); });
  if(!namen.size)  // ganz am Anfang: noch keine Nominierung geladen
    KADER.forEach(k=>{ if(nomRsvp[k.name]&&nomRsvp[k.name].status==="zugesagt")namen.add(k.name); });
  return KADER.map(k=>k.name).filter(n=>namen.has(n));   // Kader-Reihenfolge beibehalten
}
/* Kleinste sinnvolle Teamgröße: alle auf dem Feld plus ein Kind zum Wechseln.
   Darunter steht ein Kind 60 Minuten durch – das ist keine Alternative zum Pausieren. */
function teamMindestKader(){
  const key=(typeof tbFormation!=="undefined"&&tbFormation)||"4+1";
  const f=(typeof FORMATIONS!=="undefined"&&FORMATIONS[key])||{tw:true,fieldCount:4};
  const aufDemFeld=f.fieldCount+(f.tw?1:0);
  return Math.min(teamKader().gesamt, aufDemFeld+1);
}
/* Die Kadergröße ist ein ZIEL, keine harte Obergrenze: lieber ein Kind mehr im Team als
   ein Kind auf der Tribüne. Ein Team darf deshalb um eins über die Sollgröße gehen.
   Beispiel 5+1 (Soll 8) mit 15 Zusagen: 8 + 7 statt 8 und sieben Zuschauer. */
/* zusagen: Poolgröße, falls der Aufrufer sie schon kennt. teamsAuto MUSS sie übergeben –
   es leert TEAMS, bevor es hier landet, und teamZusagen() zählt die bereits eingeteilten
   Kinder mit. Ohne den Parameter kam dort kap=1 heraus und die Verteilung endete leer. */
function teamPlatzProTeam(n,zusagen){
  const kd=teamKader(), z=(zusagen==null)?teamZusagen().length:zusagen;
  n=n||TEAM_ANZAHL||1;
  return Math.max(1,Math.min(kd.gesamt+1,Math.ceil(z/n)));
}
function teamAnzahlVorschlag(){
  const kd=teamKader(), z=teamZusagen().length;
  if(!z)return 1;
  let n=Math.min(TEAM_MAX,Math.ceil(z/(kd.gesamt+1)));   // so wenige Teams wie möglich, ohne jemanden auszuschließen
  while(n>1&&Math.floor(z/n)<teamMindestKader())n--; // aber nie unter die spielfähige Größe
  return Math.max(1,n);
}
function teamUeberzaehlig(){
  const z=teamZusagen().length;
  return Math.max(0,z-TEAM_ANZAHL*teamPlatzProTeam());
}

/* Zwei Kennzahlen, damit die Auswahl "wer pausiert" begründbar ist:
   – Trainingsbeteiligung der letzten 6 Wochen (aus AW_DATA, lokal + gesyncte anwesenheit)
   – Spiele und Turniere in dieser Saison (ab 1. Juli), aus den Nominierungen. */
function teamTrainingsQuote(name){
  if(typeof AW_DATA==="undefined")return null;
  const grenze=new Date(Date.now()-42*864e5).toISOString().slice(0,10);
  let da=0,gesamt=0;
  Object.keys(AW_DATA).forEach(d=>{
    if(d<grenze)return;
    const tag=AW_DATA[d]; if(!tag||!tag[name])return;
    gesamt++; if(tag[name].da)da++;
  });
  return gesamt?{da,gesamt}:null;
}
function saisonStart(){
  const h=new Date(); const jahr=h.getMonth()>=6?h.getFullYear():h.getFullYear()-1;  // ab 1. Juli
  return `${jahr}-07-01`;
}
async function teamStatsLoad(){
  TEAM_STATS={};
  const ab=saisonStart(), bis=spieltagRawDate();
  let termine=[], noms=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(spiel,turnier)&datum=gte.${ab}&datum=lt.${bis}&select=datum`,{headers:sbAuthHeaders()});
    if(r.ok)termine=await r.json();
  }catch(e){}
  if(!termine.length)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=gte.${ab}&select=datum,data`,{headers:sbAuthHeaders()});
    if(r.ok)noms=await r.json();
  }catch(e){}
  const spieltage=new Set(termine.map(t=>t.datum));
  const gezaehlt={};   // name -> Set(basisdatum), damit Adler 1 und 2 nicht doppelt zaehlen
  noms.forEach(row=>{
    const basis=String(row.datum).replace(/__t\d+$/,"").replace(/__teams$/,"");
    if(!spieltage.has(basis)||/__teams$/.test(row.datum))return;
    Object.entries(row.data||{}).forEach(([name,status])=>{
      if(name==="_ovr"||status!=="dabei")return;
      (gezaehlt[name]=gezaehlt[name]||new Set()).add(basis);
    });
  });
  KADER.forEach(k=>{ TEAM_STATS[k.name]={einsaetze:(gezaehlt[k.name]||new Set()).size}; });
}
function teamStaerke(n){
  const s=(typeof DB!=="undefined"&&DB[n]&&DB[n][DB[n].length-1])||null;
  return (s&&s.total_score!=null)?s.total_score:-1;  // unbewertet ans Ende, wird zuletzt verteilt
}
/* Wer pausiert, wenn mehr zugesagt haben als in volle Teams passen?
   Vorschlag nach Fairness: wer die meisten Saison-Einsätze hat, danach wer seltener im
   Training war. Der Trainer entscheidet – die Zahlen stehen daneben. Torwarte werden nur
   dann herausgenommen, wenn danach noch genug für alle Teams übrig sind. */
function teamPausenReihenfolge(pool){
  const q=n=>{const t=teamTrainingsQuote(n);return t&&t.gesamt?t.da/t.gesamt:1;};   // ohne Daten: als "immer da" behandeln
  const e=n=>(TEAM_STATS[n]&&TEAM_STATS[n].einsaetze)||0;
  return pool.slice().sort((a,b)=> e(b)-e(a) || q(a)-q(b) || teamStaerke(a)-teamStaerke(b));
}
/* Genau ein Torwart je Team (nur Kinder mit TW-Haken), dann die Feldplätze auffüllen:
   stärkstes Kind zuerst in das aktuell schwächste Team. */
function teamsAuto(){
  const kd=teamKader(), n=TEAM_ANZAHL;
  let pool=teamZusagen();
  TEAMS={};
  if(!pool.length){ teamsRender(); return; }
  const kap=teamPlatzProTeam(n,pool.length); // Sollgröße, ggf. +1 damit niemand zusehen muss

  // 1) Überzählige bestimmen – Torwarte nur opfern, wenn danach noch genug bleiben
  const ueber=Math.max(0,pool.length-n*kap);
  if(ueber>0){
    const raus=[];
    for(const name of teamPausenReihenfolge(pool)){
      if(raus.length>=ueber)break;
      if(kd.tw&&istTorwart(name)){
        const twUebrig=pool.filter(x=>istTorwart(x)&&raus.indexOf(x)<0&&x!==name).length;
        if(twUebrig<n*kd.tw)continue;                 // dieser Torwart wird gebraucht
      }
      raus.push(name);
    }
    pool=pool.filter(x=>raus.indexOf(x)<0);           // Rest bleibt ohne Team (TEAMS[name] fehlt)
  }

  const wert=x=>Math.max(0,teamStaerke(x));           // unbewertet zählt als 0
  const summe=new Array(n+1).fill(0);
  const twPlatz=new Array(n+1).fill(kd.tw);
  const feldPlatz=new Array(n+1).fill(kap-kd.tw);     // Feldplätze = Kapazität minus Torwart
  const einsetzen=(name,t,alsTw)=>{TEAMS[name]=t;summe[t]+=wert(name);if(alsTw)twPlatz[t]--;else feldPlatz[t]--;};

  // 2) Torwarte: pro Team einer, stärkster zuerst
  if(kd.tw){
    const tw=pool.filter(istTorwart).sort((a,b)=>teamStaerke(b)-teamStaerke(a));
    for(let t=1;t<=n&&tw.length;t++) einsetzen(tw.shift(),t,true);
  }
  /* Unbesetzte Torwart-Plätze werden zu Feldplätzen. Sonst blieb ein Platz je Team
     reserviert, obwohl gar kein Kind mit TW-Haken zugesagt hat – und ein Kind stand
     grundlos daneben. Die Teamgröße (kap) ändert sich dadurch nicht. */
  for(let t=1;t<=n;t++){ if(twPlatz[t]>0){ feldPlatz[t]+=twPlatz[t]; twPlatz[t]=0; } }
  // 3) Feldspieler: stärkstes Kind ins momentan schwächste Team mit freiem Platz
  const rest=pool.filter(x=>!TEAMS[x]).sort((a,b)=>teamStaerke(b)-teamStaerke(a));
  rest.forEach(name=>{
    let ziel=0;
    for(let t=1;t<=n;t++){ if(feldPlatz[t]<=0)continue; if(!ziel||summe[t]<summe[ziel])ziel=t; }
    if(!ziel)return;                                   // kein Platz mehr -> pausiert
    einsetzen(name,ziel,false);
  });
  teamsRender();
}
function teamSetAnzahl(n){
  TEAM_ANZAHL=Math.max(1,Math.min(TEAM_MAX,parseInt(n)||1));
  TEAMS={};
  // Zuteilungen zu weggefallenen Teams aufräumen, sonst hängen Trainer an einem Team,
  // das es nicht mehr gibt – und tauchen später wieder auf, wenn man wieder hochstellt.
  Object.keys(TEAM_TRAINER).forEach(t=>{ if(Number(t)>TEAM_ANZAHL)delete TEAM_TRAINER[t]; });
  const wechselNoetig=(typeof spieltagTeam!=="undefined"&&spieltagTeam>TEAM_ANZAHL);
  teamsAuto();          // PO v392: neue Teamzahl -> sofort neu verteilen, nicht leer stehen lassen
  teamsSpeichern();
  teamsRender(); spieltagTeamKartenRender();
  // Quest-Ziele wachsen mit der Teamzahl mit – die Sektion muss die neuen Zahlen zeigen.
  if(typeof questSeedDone==="function")questSeedDone();
  if(typeof questPanelRender==="function")questPanelRender();
  if(typeof atRender==="function"&&document.getElementById("action-panel"))atRender();
  // Sah man gerade „Adler 3" und stellt auf 2 Teams, muss die Ansicht darunter mit
  // umschalten – sonst zeigt sie weiter Daten eines Teams, das nicht mehr existiert.
  if(wechselNoetig&&typeof spieltagSetTeam==="function")spieltagSetTeam(1);
}
/* Ein Trainer gehört zu genau EINEM Team: er kann nicht an zwei Feldern gleichzeitig
   stehen, und in der Eltern-Info stünde er sonst doppelt. Zuteilen zu Team B nimmt ihn
   deshalb aus Team A heraus. Erneutes Antippen im eigenen Team entfernt ihn. */
function teamTrainerToggle(t,name){
  const drin=((TEAM_TRAINER[t]||[]).indexOf(name)>=0);
  Object.keys(TEAM_TRAINER).forEach(k=>{ TEAM_TRAINER[k]=(TEAM_TRAINER[k]||[]).filter(x=>x!==name); });
  if(!drin)TEAM_TRAINER[t]=(TEAM_TRAINER[t]||[]).concat(name);
  Object.keys(TEAM_TRAINER).forEach(k=>{ if(!TEAM_TRAINER[k].length)delete TEAM_TRAINER[k]; });
  teamsSpeichern(); teamsRender(); spieltagTeamKartenRender();
  const box=document.getElementById("teamtr-liste"); if(box)teamTrainerModalFill(t);
}
/* Wer ist zuteilbar? Der ganze Trainerstab – auch wer nicht mittrainiert (siehe
   trainerstabNamen in core.js). Wer für diesen Termin zugesagt hat, wird hervorgehoben:
   eingeteilt wird, wer da ist. */
async function teamStabLoad(){
  let status={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(spieltagRawDate())}&select=trainer_status&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){ const rows=await r.json(); status=(rows[0]||{}).trainer_status||{}; }
  }catch(e){}
  const alle=(typeof trainerstabNamen==="function")?trainerstabNamen(status)
            :(((typeof TRAINER!=="undefined"&&TRAINER)||[]).slice());
  TEAM_STAB=alle.map(n=>({name:n,zusage:status[n]||""}));
}
function teamTrainerOpen(t){
  document.getElementById("teamtr-modal")?.remove();
  const m=document.createElement("div"); m.id="teamtr-modal";
  m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-label","Trainer für Adler "+t);
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:420px;width:100%;margin:auto">
    ${mdlHead("teamtr-modal","🧢","Trainer für Adler "+t,"Antippen teilt zu · ein Trainer gehört zu einem Team","var(--fam-spieltag)")}
    <div id="teamtr-liste"></div>
    <button class="btn btn-p" style="width:100%;margin-top:10px" onclick="document.getElementById('teamtr-modal').remove()">Fertig</button>
  </div>`;
  document.body.appendChild(m);
  teamTrainerModalFill(t);
}
function teamTrainerModalFill(t){
  const el=document.getElementById("teamtr-liste"); if(!el)return;
  if(!TEAM_STAB.length){ el.innerHTML='<div style="font-size:12px;color:var(--text3)">Kein Trainerstab geladen.</div>'; return; }
  el.innerHTML=TEAM_STAB.map(s=>{
    const meins=((TEAM_TRAINER[t]||[]).indexOf(s.name)>=0);
    let anderes=""; Object.keys(TEAM_TRAINER).forEach(k=>{ if(Number(k)!==t&&(TEAM_TRAINER[k]||[]).indexOf(s.name)>=0)anderes="Adler "+k; });
    const zus=s.zusage==="ja"?"✅ dabei":s.zusage==="unsicher"?"🤔 unsicher":s.zusage==="nein"?"❌ nicht dabei":"– keine Rückmeldung";
    return `<button onclick="teamTrainerToggle(${t},'${jsq(s.name)}')" aria-pressed="${meins?"true":"false"}"
      style="width:100%;min-height:52px;display:flex;align-items:center;gap:10px;text-align:left;margin-bottom:6px;padding:8px 12px;border:var(--border-s);${meins?"border-color:transparent;background:var(--fam-spieltag);color:#fff;":"background:var(--surface2);color:var(--text);"}border-radius:12px;font-family:inherit;cursor:pointer">
      <span style="font-size:17px">${meins?"✓":"🧢"}</span>
      <span style="flex:1;min-width:0">
        <span style="display:block;font-size:13.5px;font-weight:800">${esc(s.name)}</span>
        <span style="display:block;font-size:11px;${meins?"opacity:.9":"color:var(--text3)"}">${zus}${anderes?" · steht bei "+anderes:""}</span>
      </span></button>`;
  }).join("");
}
/* Je Team eine Kachel – sie ERSETZT den Umschalter aus v389 (PO: „jedes Team braucht
   eine eigene Kachel mit dem Kader und allen weiteren Infos").
   Kniff: die Panels darunter (Nominierung, Uhr, Rotation, Ticker …) gibt es im
   Grundgeruest je EINMAL. Statt sie zu vervielfaeltigen – was jede Element-ID
   vervierfacht haette – wird der gemeinsame Block #spieltag-teaminhalt per appendChild
   in die aufgeklappte Kachel geschoben. IDs bleiben einmalig, Handler und laufende
   Uhren ueberleben den Umzug.
   Bei EINEM Team gibt es keine Kacheln: der Inhalt steht direkt da. */
function spieltagTeamKartenRender(){
  const box=document.getElementById("spieltag-teamkarten");
  const inhalt=document.getElementById("spieltag-teaminhalt");
  if(!box||!inhalt)return;
  // Zuerst in Sicherheit bringen: box.innerHTML wuerde den Inhalt sonst mitreissen,
  // wenn er in einer der Kacheln haengt.
  const heimat=box.parentElement;
  if(heimat&&inhalt.parentElement!==heimat)heimat.insertBefore(inhalt,box.nextSibling);
  teamKaderRender();
  if(TEAM_ANZAHL<=1){ box.innerHTML=""; inhalt.hidden=false; teamPhasenLabel(0); return; }

  /* Welche Kachel ist offen? TEAM_KARTE_OFFEN=0 heisst: alle zu. Das ist bewusst NICHT
     dasselbe wie spieltagTeam – das Team bleibt ausgewaehlt (Uhr, Ticker, Aktionen haengen
     daran), nur die Kachel ist zugeklappt. Vorher war „offen" an spieltagTeam gekoppelt,
     und weil immer ein Team ausgewaehlt ist, liess sich keine Kachel schliessen. */
  const aktiv=TEAM_KARTE_OFFEN&&TEAM_KARTE_OFFEN<=TEAM_ANZAHL?TEAM_KARTE_OFFEN:0;
  inhalt.hidden=!aktiv;
  teamPhasenLabel(aktiv);
  box.innerHTML=Array.from({length:TEAM_ANZAHL},(_,i)=>{
    const n=i+1, tr=(TEAM_TRAINER[n]||[]);
    const kinder=Object.keys(TEAMS).filter(k=>TEAMS[k]===n).length;
    const auf=(n===aktiv);
    // Uhr, Ticker und Aktionen haengen an spieltagTeam – auch wenn alle Kacheln zu sind.
    // Das muss man sehen koennen, sonst tippt der Trainer im falschen Team auf „Anpfiff".
    const gewaehlt=(typeof spieltagTeam!=="undefined"&&n===spieltagTeam);
    return `<div class="abschnitt" style="padding:0;overflow:hidden;${auf?"border-color:var(--fam-spieltag);":""}">
      <button onclick="spieltagKarteOeffnen(${n})" aria-expanded="${auf?"true":"false"}"
        style="width:100%;min-height:56px;display:flex;align-items:center;gap:10px;text-align:left;padding:12px 14px;border:none;border-left:4px solid var(--fam-spieltag);background:${auf?"var(--surface2)":"var(--surface)"};color:var(--text);font-family:inherit;cursor:pointer">
        <span style="font-size:20px">⚽</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:14px;font-weight:900">Adler ${n}${gewaehlt&&!auf?` <span style="font-size:10px;font-weight:700;color:var(--blue-text);background:var(--surface2);border-radius:8px;padding:1px 7px;vertical-align:1px">Uhr &amp; Ticker</span>`:""}</span>
          <span style="display:block;font-size:11.5px;color:var(--text2)">${kinder} Kind${kinder===1?"":"er"} · ${
            tr.length?esc(tr.join(", ")):'<span style="color:var(--amber);font-weight:700">kein Trainer</span>'}</span>
        </span>
        <span style="font-size:15px;color:var(--text3)">${auf?"▴":"▾"}</span>
      </button>
      <div id="spieltag-karte-inhalt-${n}" style="padding:0 12px 12px"></div>
    </div>`;
  }).join("");
  const ziel=document.getElementById("spieltag-karte-inhalt-"+aktiv);
  if(ziel)ziel.appendChild(inhalt);
}
/* Antippen einer Kachel: offene Kachel zu, geschlossene auf. Beim Wechsel auf ein anderes
   Team laedt spieltagSetTeam die Daten neu und rendert ueber teamsLoad die Kacheln mit –
   deshalb dort nur den Merker setzen und zurueck.
   PO v393: „teams lässt sich nicht mehr einklappen. Geht nur zu wenn man das andere Team
   aufklappt." Ursache war, dass „offen" an spieltagTeam hing – und ein Team ist immer
   ausgewaehlt. Jetzt ist das Aufklappen ein eigener Zustand. */
function spieltagKarteOeffnen(n){
  if(TEAM_KARTE_OFFEN===n){ TEAM_KARTE_OFFEN=0; spieltagTeamKartenRender(); return; }
  TEAM_KARTE_OFFEN=n;
  if(typeof spieltagTeam!=="undefined"&&n!==spieltagTeam&&typeof spieltagSetTeam==="function"){ spieltagSetTeam(n); return; }
  spieltagTeamKartenRender();
  teamInhaltFuellen();   // erst jetzt sind die Panels sichtbar – und müssen gefüllt werden
}
// „· Adler 2" hinter die Phasen-Titel schreiben; 0 oder ein einziges Team = kein Zusatz.
function teamPhasenLabel(n){
  const txt=(n&&TEAM_ANZAHL>1)?"· Adler "+n:"";
  document.querySelectorAll(".mt-team-tag").forEach(el=>{el.textContent=txt;});
}
/* Der Kader DIESES Teams – nur zum Nachsehen. Geändert wird eine Ebene höher unter
   „Teams festlegen"; hier stünde derselbe Editor sonst mehrfach nebeneinander. */
function teamKaderRender(){
  const box=document.getElementById("team-kader-panel"); if(!box)return;
  const t=(typeof spieltagTeam!=="undefined")?spieltagTeam:1;
  const namen=(typeof nominierteSpieler==="function")?nominierteSpieler():[];
  const tr=(TEAM_TRAINER[t]||[]);
  const kopf=`<div style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${namen.length} Kind${namen.length===1?"":"er"}${TEAM_ANZAHL>1?" in Adler "+t:""} · ${
    tr.length?"🧢 "+esc(tr.join(", ")):'<span style="color:var(--amber);font-weight:700">noch kein Trainer zugeteilt</span>'}</div>`;
  if(!namen.length){
    box.innerHTML=kopf+`<div style="font-size:11.5px;color:var(--text3)">Noch niemand eingeteilt – das passiert oben unter „Teams festlegen".</div>`;
    return;
  }
  box.innerHTML=kopf+`<div style="display:flex;flex-wrap:wrap;gap:6px">${namen.map(n=>
    `<span style="font-size:12px;background:var(--surface2);border-radius:12px;padding:4px 10px">${getKader(n)&&getKader(n).nr?getKader(n).nr+" ":""}${esc(n)}${istTorwart(n)?" 🥅":""}</span>`).join("")}</div>
    <button class="btn btn-sm" style="margin-top:10px" onclick="document.getElementById('mt-phase-vor').open=true;document.getElementById('mt-phase-vor').scrollIntoView({behavior:'smooth',block:'start'})"><i class="ti ti-pencil"></i>Einteilung ändern</button>`;
}
/* Ein Kind, das gerade auf „dabei" gesetzt wurde, gehört sofort in ein Team.
   PO-Meldung v395: „alle Kinder werden wenn ich sie dabei anklicke unten drunter auf
   pausiert gesetzt. Das macht keinen sinn." Genau so war es: nomSet setzte nur den
   Status, TEAMS blieb leer – und „kein Team" zeichnet die Zeile als ⏸ pausiert. Wer
   zusagt, spielt erst mal mit; pausieren ist eine Entscheidung, kein Ausgangszustand.
   Gefüllt wird das momentan kleinste Team mit freiem Platz. Sind alle voll, bleibt das
   Kind ohne Team – dann stimmt „pausiert" auch, und der Hinweis oben erklärt es. */
function teamPlatzEinsortieren(name){
  if(TEAMS[name])return false;
  const kap=teamPlatzProTeam(TEAM_ANZAHL,teamZusagen().length);
  let ziel=0, klein=Infinity;
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const n=Object.keys(TEAMS).filter(x=>TEAMS[x]===t).length;
    if(n<kap&&n<klein){ klein=n; ziel=t; }
  }
  if(!ziel)return false;
  TEAMS[name]=ziel;
  return true;
}
function teamSet(name,nr){
  if(nr)TEAMS[name]=nr; else delete TEAMS[name];
  teamsRender(); spieltagTeamKartenRender();
  teamsSpeichern();     // Handkorrektur ist eine Entscheidung, kein Vorschlag
  teamsSyncBald();      // … und die Eltern-Ansicht zieht nach
  if(typeof nomApplyToTools==="function")nomApplyToTools();
}

async function teamsLoad(){
  TEAMS={}; TEAM_ANZAHL=teamAnzahlVorschlag(); TEAM_TRAINER={};
  await teamStabLoad();
  await Promise.all([teamStatsLoad(),teamGruendeLaden(spieltagRawDate())]);   // Kennzahlen für die Pausen-Entscheidung
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=eq.${encodeURIComponent(teamsKey())}&select=data`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      if(rows.length&&rows[0].data){
        const d={...rows[0].data};
        if(d._anzahl)TEAM_ANZAHL=d._anzahl;
        if(d._trainer&&typeof d._trainer==="object")TEAM_TRAINER=d._trainer;
        // BEIDE Sonderschluessel raus, sonst haelt die App "_trainer" fuer ein Kind
        delete d._anzahl; delete d._trainer;
        TEAMS=d;
      }
    }
  }catch(e){}
  /* PO v392: „Die Einteilung der Kinder auf die Teams muss auch automatisch erfolgen und
     dann noch händisch geändert werden können."
     Gibt es noch keine gespeicherte Einteilung, wird sie hier direkt vorgeschlagen – der
     Trainer findet die Teams also bereits gefüllt vor und korrigiert nur noch.
     Bewusst NICHT gespeichert: der Vorschlag wird erst mit „In die Nominierungen
     übertragen" verbindlich, sonst überschriebe ein blosses Öffnen des Spieltags eine
     Einteilung, die gerade jemand anders von Hand gemacht hat.
     teamsAuto() rendert selbst – deshalb hier nur der Fallback-Pfad. */
  if(!Object.keys(TEAMS).length&&teamZusagen().length){ teamsAuto(); spieltagTeamKartenRender(); return; }
  teamsRender(); spieltagTeamKartenRender();
}
async function teamsSpeichern(){
  try{
    await fetch(`${SB_URL}/rest/v1/nominierungen?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum:teamsKey(),data:{_anzahl:TEAM_ANZAHL,_trainer:TEAM_TRAINER,...TEAMS}})});
  }catch(e){}
}
/* Die Team-Zeilen ("<datum>", "<datum>__t2", …) sind ABGELEITET aus der globalen
   Nominierung und der Einteilung. Eltern-Ansicht und Liveticker lesen sie über die RPCs,
   deshalb dürfen sie nicht hinterherhinken.
   Bis v392 schrieb jeder Tipp in der Nominierung direkt die Team-Zeile, die Eltern sahen
   die Änderung also sofort. Seit die Nominierung global ist (v393), wird sie hier
   nachgezogen – gebündelt, damit nicht jeder einzelne Tipp vier Anfragen auslöst.
   „offen" für dabei-aber-noch-nicht-eingeteilt ist Absicht: die Eltern lesen dann
   „Aufstellung wählt Trainer noch" statt fälschlich „pausiert".
   _ovr enthält alle Namen – Altbestand, der die Eltern-Zusagen nicht wieder über die
   Einteilung legen soll. */
let _teamSyncId=null;
function teamsSyncBald(){ clearTimeout(_teamSyncId); _teamSyncId=setTimeout(()=>{ teamsZeilenSchreiben(); },900); }
async function teamsZeilenSchreiben(){
  if(!sbToken())return false;
  const d=spieltagRawDate(), alle=KADER.map(k=>k.name);
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const key=t>1?`${d}__t${t}`:d;
    const data={_ovr:alle};
    alle.forEach(n=>{
      data[n]=(TEAMS[n]===t)?"dabei"
             :(nomStatus[n]==="dabei"&&!TEAMS[n])?"offen":"nicht";
    });
    try{
      const r=await fetch(`${SB_URL}/rest/v1/nominierungen?on_conflict=datum`,{method:"POST",
        headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
        body:JSON.stringify({datum:key,data})});
      if(!r.ok)return false;
    }catch(e){ return false; }
  }
  return true;
}
async function teamsAnwenden(){
  if(!Object.keys(TEAMS).length){toast("Erst einteilen","err");return;}
  if(!confirm(`Einteilung auf ${TEAM_ANZAHL} Team${TEAM_ANZAHL>1?"s":""} übertragen?\n\nDie Nominierung der betroffenen Teams wird überschrieben.`))return;
  clearTimeout(_teamSyncId);   // die gebündelte Sicherung ist hier gegenstandslos
  await teamsSpeichern();
  if(!await teamsZeilenSchreiben()){ toast("Übertragen fehlgeschlagen","err"); return; }
  await teamGruendeSpeichern(spieltagRawDate());
  toast(`Einteilung übertragen ✓`);
  await nomLoad();   // alles neu laden -> Rotation, Aktionen, Aufstellung ziehen nach
}

/* Begründungen der pausierenden Kinder sichern. Wer wieder nominiert ist, verliert seinen
   alten Hinweis – sonst sähen die Eltern nächste Woche noch die Begründung von heute. */
async function teamGruendeSpeichern(datum){
  const pool=teamZusagen();
  const pausiert=pool.filter(n=>!TEAMS[n]);
  TEAM_GRUND={};
  const rows=[];
  pausiert.forEach(n=>{
    const el=document.getElementById("nh-"+teamKaderIdx(n));
    const grund=(el?.value||"").trim();
    TEAM_GRUND[n]=grund;
    const sid=teamSpielerId(n);
    if(sid)rows.push({datum,spieler_id:sid,grund:grund||null,updated_at:new Date().toISOString()});
  });
  const wiederDabei=KADER.map(k=>k._id).filter(id=>id&&!rows.some(r=>r.spieler_id===id));
  try{
    if(rows.length)await fetch(`${SB_URL}/rest/v1/nominierung_hinweis?on_conflict=datum,spieler_id`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
    if(wiederDabei.length)await fetch(`${SB_URL}/rest/v1/nominierung_hinweis?datum=eq.${encodeURIComponent(datum)}&spieler_id=in.(${wiederDabei.join(",")})`,
      {method:"DELETE",headers:sbAuthHeaders()});
  }catch(e){/* Hinweis ist Beiwerk – die Einteilung steht schon */}
}
async function teamGruendeLaden(datum){
  TEAM_GRUND={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierung_hinweis?datum=eq.${encodeURIComponent(datum)}&select=spieler_id,grund`,{headers:sbAuthHeaders()});
    if(r.ok)(await r.json()).forEach(x=>{
      const k=KADER.find(k=>k._id===x.spieler_id);
      if(k)TEAM_GRUND[k.name]=x.grund||"";
    });
  }catch(e){}
}

// "4/5" Trainings der letzten 6 Wochen; "–" wenn keine Anwesenheit erfasst ist.
function teamQuoteText(n){
  const q=teamTrainingsQuote(n);
  if(!q)return `<span style="color:var(--text3)">Training –</span>`;
  const p=q.da/q.gesamt;
  const farbe=p>=0.8?"var(--green)":p>=0.5?"var(--amber)":"var(--red)";
  return `<span style="color:${farbe}">Training ${q.da}/${q.gesamt}</span>`;
}
function teamEinsatzText(n){
  const e=(TEAM_STATS[n]&&TEAM_STATS[n].einsaetze);
  return `<span style="color:var(--text2)">${e==null?"–":e} Einsätze</span>`;
}

/* A-lite: Rollen-Erfahrung. Aggregiert die gespeicherten Start-Aufstellungen
   (aufstellungen.lineup = {tw,auf,fll,flr,jaeg}) zu einer Kind×Rolle-Matrix + TW-Einsätzen.
   Nur vorhandene Daten (4+1, benannte Rollen); zeigt vor allem „wer war noch nie im Tor" –
   wichtig für den Übergang zur E-Jugend mit festem Torwart. Keine minutengenaue Abrechnung. */
const ROLLEN_EXP=[{k:"tw",l:"🥅 TW"},{k:"auf",l:"Aufp."},{k:"fll",l:"Fl.L"},{k:"flr",l:"Fl.R"},{k:"jaeg",l:"Jäger"}];
let _rollenExp={data:null,at:0};
async function rollenExpFetch(){
  if(_rollenExp.data&&Date.now()-_rollenExp.at<60000)return _rollenExp.data;
  const ab=(typeof saisonStart==="function")?saisonStart():"2000-01-01";
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/aufstellungen?select=datum,lineup&datum=gte.${ab}&order=datum.asc`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  const byKid={}, ens=n=>byKid[n]||(byKid[n]={tw:0,auf:0,fll:0,flr:0,jaeg:0,total:0});
  rows.forEach(row=>{const lu=row.lineup||{}; ["tw","auf","fll","flr","jaeg"].forEach(rk=>{const nm=lu[rk]; if(nm){ens(nm)[rk]++; byKid[nm].total++;}});});
  _rollenExp={data:{byKid,games:rows.length},at:Date.now()};
  return _rollenExp.data;
}
function rollenExpClear(){ _rollenExp.at=0; }
// Kinder (aktiv), die in keiner gespeicherten Aufstellung im Tor standen.
function _neverTW(byKid){ return (typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false&&!(byKid[k.name]&&byKid[k.name].tw>0)).map(k=>k.name); }
async function rollenHintFill(){
  const el=document.getElementById("team-rollen-hint"); if(!el)return;
  const {byKid,games}=await rollenExpFetch();
  if(!games){el.innerHTML="";return;} // noch keine gespeicherten Aufstellungen
  const nie=_neverTW(byKid);
  if(!nie.length){el.innerHTML="";return;}
  el.innerHTML=`<div style="font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:6px 10px;margin-bottom:8px">🥅 Noch nie im Tor: <b>${nie.map(esc).join(", ")}</b> · <span onclick="rollenMatrixOpen()" style="color:var(--blue);cursor:pointer;font-weight:700">Rollen-Matrix ›</span></div>`;
}
async function rollenMatrixOpen(){
  const {byKid,games}=await rollenExpFetch();
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const cell=v=>`<div style="text-align:center;background:${v===0?"#fef2f2":v<=1?"#fffbeb":"#f0fdf4"};color:${v===0?"#b91c1c":"var(--text)"};border-radius:6px;padding:5px 0;font-weight:${v===0?"800":"700"};font-size:12px">${v}</div>`;
  const head=`<div style="display:grid;grid-template-columns:1fr repeat(5,42px);gap:3px;font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;padding:0 0 4px"><div>Kind</div>${ROLLEN_EXP.map(r=>`<div style="text-align:center">${r.l}</div>`).join("")}</div>`;
  const rows=kids.map(k=>{const b=byKid[k.name]||{}; return `<div style="display:grid;grid-template-columns:1fr repeat(5,42px);gap:3px;align-items:center;padding:2px 0;border-top:var(--border)"><div style="font-size:12.5px;font-weight:600">${esc(k.name)}</div>${ROLLEN_EXP.map(r=>cell(b[r.k]||0)).join("")}</div>`;}).join("");
  const nie=_neverTW(byKid);
  document.getElementById("rollen-modal")?.remove();
  const modal=document.createElement("div"); modal.id="rollen-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`
    ${mdlHead("rollen-modal","🎽","Rollen-Erfahrung",`aus ${games} gespeicherten Aufstellungen (4+1) · Rot = noch nie`,"#2563eb")}
    ${games?head+rows:'<div style="font-size:13px;color:var(--text3);padding:16px;text-align:center">Noch keine Aufstellungen gespeichert.<br>Speichere im Spieltag unter „Aufstellung" eine Startelf – dann füllt sich die Matrix.</div>'}
    ${games&&nie.length?`<div style="font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;margin-top:12px">🥅 <b>Noch nie im Tor:</b> ${nie.map(esc).join(", ")} – vor dem E-Jugend-Wechsel (fester TW) mal ranlassen.</div>`:""}
    <button class="btn btn-sm" style="width:100%;margin-top:12px" onclick="document.getElementById('rollen-modal').remove()">Schließen</button>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
/* Freitexte („Grund für die Eltern") aus dem DOM retten, bevor innerHTML sie wegwirft.
   Seit die Liste bei jedem Tipp neu gezeichnet wird (Anwesenheit UND Team stehen darin),
   wäre ein gerade getippter Grund sonst weg, sobald der Trainer irgendeinen Knopf drückt. */
function teamGruendeAusDom(){
  if(typeof KADER==="undefined")return;
  KADER.forEach(k=>{
    const el=document.getElementById("nh-"+teamKaderIdx(k.name));
    if(el)TEAM_GRUND[k.name]=el.value;
  });
}
function teamsRender(){
  const box=document.getElementById("team-panel");
  if(!box)return;
  teamGruendeAusDom();
  const kd=teamKader();
  const pool=teamZusagen();
  const vorschlag=teamAnzahlVorschlag();
  const form=((typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{label:"4+1 Raute"}).label;
  const segBtn=(n)=>`<button class="seg-btn${TEAM_ANZAHL===n?" active":""}" onclick="teamSetAnzahl(${n})">${n}</button>`;

  /* Der Container hiess frueher class="seg" – die Klasse gibt es im CSS nicht (ueberall
     sonst heisst sie seg-ctrl). Dadurch griff weder das Flex-Layout noch die Breite:
     die drei Knoepfe schrumpften auf Textbreite und waren kaum zu treffen. Jetzt volle
     Breite in eigener Zeile, die 44px aus .seg-btn kommen damit auch zur Geltung. */
  let html=`<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px">
      <span style="font-size:12px;font-weight:600">Anzahl Teams</span>
      <span style="font-size:11px;color:var(--text3);margin-left:auto">Vorschlag: ${vorschlag}</span>
    </div>
    <div class="seg-ctrl" style="margin-bottom:8px">${Array.from({length:TEAM_MAX},(_,i)=>segBtn(i+1)).join("")}</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">${esc(form)}: ${kd.tw?"1 Torwart + ":""}${kd.feld} Feldspieler = ${kd.gesamt} pro Team · ${pool.length} Kind${pool.length===1?"":"er"} dabei${teamPlatzProTeam()>kd.gesamt?" · ein Team nimmt ein Kind mehr auf, damit niemand zusehen muss":""}</div>`;

  /* Trainer je Team – steht bewusst VOR der Kinder-Einteilung und auch dann schon da,
     wenn noch niemand zugesagt hat: erst legen wir fest, wie viele Teams wir stellen und
     wer sie betreut, dann verteilen wir die Kinder. Ein Team ohne Trainer wird angemahnt
     (PO: „es muss immer ein Trainer zugewiesen werden"). */
  html+=`<div style="font-size:12px;font-weight:600;margin:12px 0 6px">Trainer je Team</div>`;
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const tr=TEAM_TRAINER[t]||[];
    html+=`<button onclick="teamTrainerOpen(${t})" style="width:100%;min-height:48px;display:flex;align-items:center;gap:10px;text-align:left;margin-bottom:6px;padding:8px 12px;border:var(--border-s);border-left:3px solid var(--fam-spieltag);border-radius:12px;background:var(--surface2);color:var(--text);font-family:inherit;cursor:pointer">
      <span style="font-size:16px">🧢</span>
      <span style="flex:1;min-width:0">
        <span style="display:block;font-size:12.5px;font-weight:800">Adler ${t}</span>
        <span style="display:block;font-size:11.5px;${tr.length?"color:var(--text2)":"color:var(--amber);font-weight:700"}">${tr.length?esc(tr.join(", ")):"noch kein Trainer zugeteilt"}</span>
      </span>
      <span style="font-size:15px;color:var(--text3)">✏️</span>
    </button>`;
  }

  /* Kein frueher Ausstieg mehr, wenn noch niemand dabei ist: die Kinderliste IST seit v394
     der Ort, an dem „dabei" gesetzt wird. Wer hier aussteigt, nimmt dem Trainer den Weg,
     ueberhaupt jemanden zu nominieren. Nur der Hinweis unterscheidet sich. */
  const leer=!pool.length;

  /* Drei gleichrangige Knoepfe nebeneinander – der Bildschirm war falsch geschnitten
     (Hausregel: genau EINE Hauptaktion). Jetzt in der Reihenfolge des Arbeitsschritts:
     erst einteilen (Vorbereitung), dann uebertragen (die eine Hauptaktion, volle Breite).
     „Rollen-Erfahrung" ist gar keine Aktion am Spieltag, sondern eine Auswertung – die
     wohnt in der Team-Kachel unter „Ueberblick" und ist dort ueber rollenMatrixOpen
     erreichbar. Hier war sie doppelt und hat die Hauptaktion verdeckt. */
  html+=`<div style="font-size:11.5px;color:var(--text2);margin:12px 0 6px">${leer
      ? "Noch niemand dabei – unten in der Liste auf „Dabei“ tippen. Die Eltern-Rückmeldungen werden automatisch übernommen, sobald sie da sind."
      : `Wer auf „Dabei“ steht, wird direkt einem Team zugeordnet. Unten in der Liste änderst du Anwesenheit und Team von Hand. Erst „In die Nominierungen übertragen“ macht es verbindlich.`}</div>
    <div style="margin-bottom:10px">
      <button class="btn btn-sm" onclick="teamsAuto()" style="width:100%;margin-bottom:8px"${leer?" disabled":""}><i class="ti ti-wand"></i>Alle Kinder gleichmäßig auf ${TEAM_ANZAHL} Team${TEAM_ANZAHL>1?"s":""} verteilen</button>
      <button class="btn btn-p" onclick="teamsAnwenden()" style="width:100%"${leer?" disabled":""}><i class="ti ti-arrow-right"></i>In die Nominierungen übertragen</button>
    </div>
    <div id="team-rollen-hint"></div>`;
  setTimeout(()=>{try{rollenHintFill();}catch(e){}},0); // A-lite: „noch nie im Tor"-Hinweis nachladen

  // Zu wenige Torwarte? Das merkt man sonst erst beim Anpfiff.
  if(kd.tw&&!leer){
    const twDa=pool.filter(istTorwart).length;
    if(twDa<TEAM_ANZAHL*kd.tw)
      html+=`<div style="font-size:11.5px;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;margin-bottom:10px">🥅 Nur ${twDa} Kind${twDa===1?"":"er"} mit Torwart-Haken dabei, gebraucht werden ${TEAM_ANZAHL}. Ein Team bleibt ohne Torwart.</div>`;
  }

  // Team-Übersicht: Größe, Torwart, Ø-Stärke
  const zeilen=[];
  const mindest=teamMindestKader();
  for(let t=1;t<=TEAM_ANZAHL&&!leer;t++){
    const m=pool.filter(n=>TEAMS[n]===t);
    const bew=m.map(teamStaerke).filter(v=>v>=0);
    const schnitt=bew.length?Math.round(bew.reduce((a,b)=>a+b,0)/bew.length):null;
    const tw=m.filter(istTorwart).length;
    const spielfaehig=m.length>=mindest;
    zeilen.push(`<div style="flex:1;min-width:98px;background:var(--surface2);border-radius:var(--r);padding:8px">
      <div style="font-size:11.5px;font-weight:700">Adler ${t}</div>
      <div style="font-size:10.5px;color:${spielfaehig?"var(--text2)":"var(--red)"}" title="Sollgröße ${kd.gesamt}, mindestens ${mindest}">${m.length} Kinder${spielfaehig?"":" – zu wenige"}</div>
      <div style="font-size:10.5px">${kd.tw?(tw?"🥅 ok":"<span style='color:var(--red)'>kein TW</span>"):"<span style='color:var(--text3)'>ohne TW</span>"}</div>
      <div style="font-size:10.5px;color:var(--text2)">${schnitt!=null?"Ø "+schnitt+"%":"–"}</div>
    </div>`);
  }
  html+=`<div style="display:flex;gap:6px;margin-bottom:10px">${zeilen.join("")}</div>`;

  /* EINE Zeile je Kind: Anwesenheit und Team-Zuordnung beieinander (PO v394: „Wäre es
     nicht besser wenn ich die Anwesenheit direkt in Teams festlegen sehen und ändern
     kann?"). Vorher waren das zwei getrennte 16-Zeilen-Listen übereinander.
     Die Team-Knöpfe erscheinen nur bei „dabei" – wer nicht da ist, braucht kein Team.
     Bei EINEM Team gibt es statt der Zahlen einen Pausiert-Schalter: die Zahl „1" wäre
     keine Wahl, aber „passt nicht mehr rein" gibt es auch mit einem Team. */
  const stCfg={dabei:{lbl:"Dabei",col:"var(--green)"},nicht:{lbl:"Nicht",col:"var(--text3)"},verletzt:{lbl:"Verletzt",col:"var(--red)"}};
  const rvEmo={zugesagt:"✅",abgesagt:"❌",krank:"🤒"};
  const btn=(inhalt,onclick,an,titel)=>`<button onclick="${onclick}" aria-pressed="${an?"true":"false"}"${titel?` title="${titel}"`:""}
      style="flex:1;min-width:44px;min-height:44px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:${an?"700":"500"};background:${an?"var(--blue)":"var(--surface)"};color:${an?"#fff":"var(--text2)"}">${inhalt}</button>`;

  const zeile=(n)=>{
    const st=(typeof nomStatus==="object"&&nomStatus[n])||"offen";
    const dabei=(st==="dabei");
    const cur=TEAMS[n]||0;
    const rv=(typeof nomRsvp==="object"&&nomRsvp[n])||null;
    const badge=rv
      ? `<span title="Eltern-Rückmeldung: ${esc(rv.status)}${rv.kommentar?" – "+esc(rv.kommentar):""}" style="width:16px;text-align:center;font-size:13px">${rvEmo[rv.status]||""}</span>`
      : `<span style="width:16px"></span>`;
    const pause=(typeof istPaused==="function"&&istPaused(n))
      ? ` <span title="Pausiert – zählt nicht mit" style="font-size:10px;font-weight:700;color:var(--amber)">⏸ bis ${pauseBisLabel(n)}</span>` : "";

    const stKnoepfe=["dabei","nicht","verletzt"].map(s=>
      `<button onclick="nomSet('${jsq(n)}','${s}')" aria-pressed="${st===s?"true":"false"}"
        style="flex:1;min-height:44px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:${st===s?"700":"500"};background:${st===s?stCfg[s].col:"var(--surface)"};color:${st===s?"#fff":"var(--text2)"}">${stCfg[s].lbl}</button>`).join("");

    let teamZeile="";
    if(dabei){
      let k="";
      if(TEAM_ANZAHL>1){
        // Beschriftung als Wort, nicht als Zeichen: das Pause-Symbol fehlt in manchen
        // Systemschriften und wird dann als leeres Kästchen gezeichnet.
        for(let t=1;t<=TEAM_ANZAHL;t++)k+=btn(String(t),`teamSet('${jsq(n)}',${t})`,cur===t);
        k+=btn("Pause",`teamSet('${jsq(n)}',0)`,!cur,"Pausiert – spielt heute nicht mit");
      }else{
        k =btn("Spielt mit",`teamSet('${jsq(n)}',1)`,cur===1);
        k+=btn("Pausiert",`teamSet('${jsq(n)}',0)`,!cur,"Pausiert – spielt heute nicht mit");
      }
      teamZeile=`<div style="display:flex;gap:5px;margin-top:5px">${k}</div>`;
      if(!cur)teamZeile+=`<input id="nh-${teamKaderIdx(n)}" value="${esc(TEAM_GRUND[n]||"")}" placeholder="Grund für die Eltern (optional)"
        style="width:100%;min-height:44px;margin-top:5px;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:12px;background:var(--surface);color:var(--text);box-sizing:border-box">`;
    }
    return `<div style="padding:8px 0;border-top:var(--border)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        ${badge}
        <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600">${getKader(n)&&getKader(n).nr?getKader(n).nr+" ":""}${esc(n)}${istTorwart(n)?" 🥅":""}${pause}</span>
        ${dabei?`<span style="font-size:10px">${teamQuoteText(n)} · ${teamEinsatzText(n)}</span>`:""}
      </div>
      <div style="display:flex;gap:5px">${stKnoepfe}</div>
      ${teamZeile}
    </div>`;
  };

  const ohneTeam=pool.filter(n=>!TEAMS[n]);
  if(ohneTeam.length){
    html+=`<div style="background:var(--amber-bg);border:1px solid var(--amber);border-radius:10px;padding:8px 10px;margin-bottom:6px">
      <div style="font-size:12px;font-weight:700;color:var(--amber)">⏸ ${ohneTeam.length} Kind${ohneTeam.length===1?"":"er"} pausiert: ${ohneTeam.map(esc).join(", ")}</div>
      <div style="font-size:11px;color:var(--amber);margin-top:2px">Mehr Zusagen als Plätze – ${TEAM_ANZAHL===1?"ein Team fasst":TEAM_ANZAHL+" Teams fassen"} ${TEAM_ANZAHL*teamPlatzProTeam()} Kinder. Vorgeschlagen nach den meisten Saison-Einsätzen, dann nach der geringsten Trainingsbeteiligung – unten in der Liste änderbar.</div>
    </div>`;
  }
  html+=KADER.map(k=>zeile(k.name)).join("");
  box.innerHTML=html;
}

// Eltern-Zusagen werden automatisch übernommen (in nomLoad). Dieser Button verwirft die
// Trainer-Overrides und koppelt die Nominierung wieder komplett an den aktuellen RSVP-Stand.
/* „Meine Änderungen verwerfen" stellt den Zustand her, den nomLoad ohne jeden Trainer-
   Eingriff erzeugt hätte.
   PO-Meldung v394: „wenn ich die Nominierung händisch änder und dann wieder auf Eltern
   folgen klicke, ändert er die Buttons nicht mehr." Ursache: die Schleife lief nur über
   nomRsvp – also über die Kinder, deren Eltern geantwortet haben. Bei 15 offenen
   Rückmeldungen blieben 15 von Hand gesetzte Knöpfe stehen, und der Knopf sah kaputt aus.
   Jetzt wird der ganze Kader zurückgesetzt: mit Rückmeldung nach der Rückmeldung, ohne
   auf „offen" – und pausierte Kinder anschließend wieder heraus, genau wie in nomLoad. */
function nomApplyRsvp(){
  nomOvr.clear();
  KADER.forEach(k=>{
    const rv=nomRsvp[k.name];
    nomStatus[k.name]=rv?(rv.status==="zugesagt"?"dabei":"nicht"):"offen";
  });
  if(typeof PAUSE_MAP==="object"&&PAUSE_MAP)
    Object.keys(PAUSE_MAP).forEach(name=>{ if(nomStatus[name]!=null)nomStatus[name]="nicht"; });
  nomRender();
  teamsAuto();                 // die Aufteilung folgt der neuen Nominierung
  spieltagTeamKartenRender();
  nomApplyToTools();nomSave();
  toast("Änderungen verworfen – die Nominierung folgt wieder den Eltern ✓");
}
/* Sind alle Team-Kacheln zugeklappt, ist der ganze Block unsichtbar (hidden). Die Panels
   darin brauchen dann nicht nachgeladen zu werden – und genau das ist der Normalfall,
   während der Trainer oben in der Liste die Anwesenheit durchtippt. Ohne diese Bremse
   löste jeder einzelne Tipp Nachladungen für Rollen, Match-Uhr und Blitz-Rating aus. */
function teamInhaltSichtbar(){
  const el=document.getElementById("spieltag-teaminhalt");
  return !!el&&!el.hidden;
}
/* Die Panels IN der Team-Kachel füllen. Wird von zwei Seiten gebraucht:
   – wenn sich Nominierung oder Einteilung ändern (nomApplyToTools)
   – wenn eine Kachel aufgeklappt wird (spieltagKarteOeffnen)
   Der zweite Weg fehlte und war der Fehler aus v396: beim Laden sind alle Kacheln zu,
   die Bremse übersprang die Panels – und beim Aufklappen holte sie niemand nach. Match-Uhr
   und faire Rollen blieben leer, ohne dass irgendwo etwas Rotes erschien. */
function teamInhaltFuellen(){
  if(!teamInhaltSichtbar())return;
  // Kapitän und Anstoß dürfen nur Kinder DIESES Teams zur Wahl stellen – die Auswahl
  // muss also jeder Änderung an Nominierung und Einteilung folgen, nicht nur dem Laden.
  if(typeof rollenPanelRender==="function"&&document.getElementById("rollen-panel"))rollenPanelRender();
  if(typeof blitzInit==="function"&&document.getElementById("blitz-panel"))blitzInit();
  if(typeof atRender==="function"&&document.getElementById("action-panel"))atRender(); // Aktions-Chips folgen der Nominierung
  if(typeof mcLoad==="function"&&document.getElementById("mc-panel"))mcLoad();
}
function nomApplyToTools(){
  const squad=nominierteSpieler();
  teamKaderRender();   // reines Zeichnen, kein Netz – läuft immer mit
  if(!rotTimerId){ // laufendes Spiel nicht zerstören – nur setzen, wenn Timer nicht läuft
    rotSeedFromSquad(squad); // Torwart separat, Feldgröße aus Spielform
    rotRenderControls();rotRenderLive();
  }
  teamInhaltFuellen();
}

