/* ═══════════════════════════════════
   TEAM-EINTEILUNG – aus den Eltern-Zusagen auf 1–3 Teams verteilen.
   "Adler 1/2/3" waren bisher nur Etiketten: jedes Team uebernahm dieselben Zusagen,
   also waren ueberall alle Kinder dabei. Jetzt wird EINMAL eingeteilt und die
   Einteilung in die einzelnen Team-Nominierungen uebertragen; von dort greifen
   Rotations-Timer, Aktions-Tracker und die Auto-Aufstellung.
   Gespeichert in nominierungen unter dem Schluessel "<datum>__teams", damit die
   Einteilung neben den drei Team-Zeilen liegt und Neuladen uebersteht.
═══════════════════════════════════ */
let TEAMS={}, TEAM_ANZAHL=1, TEAM_STATS={}, TEAM_GRUND={};
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

// NUR wer zugesagt hat. Kein Rückfall auf den ganzen Kader – wer nicht zusagt, spielt nicht.
function teamZusagen(){
  return KADER.map(k=>k.name).filter(n=>nomRsvp[n]&&nomRsvp[n].status==="zugesagt");
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
function teamPlatzProTeam(n){
  const kd=teamKader(), z=teamZusagen().length;
  n=n||TEAM_ANZAHL||1;
  return Math.max(1,Math.min(kd.gesamt+1,Math.ceil(z/n)));
}
function teamAnzahlVorschlag(){
  const kd=teamKader(), z=teamZusagen().length;
  if(!z)return 1;
  let n=Math.min(3,Math.ceil(z/(kd.gesamt+1)));   // so wenige Teams wie möglich, ohne jemanden auszuschließen
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
  const kap=teamPlatzProTeam(n);          // Sollgröße, ggf. +1 damit niemand zusehen muss

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
function teamSetAnzahl(n){ TEAM_ANZAHL=Math.max(1,Math.min(3,parseInt(n)||1)); TEAMS={}; teamsRender(); }
function teamSet(name,nr){ if(nr)TEAMS[name]=nr; else delete TEAMS[name]; teamsRender(); }

async function teamsLoad(){
  TEAMS={}; TEAM_ANZAHL=teamAnzahlVorschlag();
  await Promise.all([teamStatsLoad(),teamGruendeLaden(spieltagRawDate())]);   // Kennzahlen für die Pausen-Entscheidung
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=eq.${encodeURIComponent(teamsKey())}&select=data`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      if(rows.length&&rows[0].data){
        const d={...rows[0].data};
        if(d._anzahl)TEAM_ANZAHL=d._anzahl;
        delete d._anzahl;
        TEAMS=d;
      }
    }
  }catch(e){}
  teamsRender();
}
async function teamsSpeichern(){
  try{
    await fetch(`${SB_URL}/rest/v1/nominierungen?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum:teamsKey(),data:{_anzahl:TEAM_ANZAHL,...TEAMS}})});
  }catch(e){}
}
/* Einteilung -> die drei Team-Nominierungen. _ovr enthält alle Namen, sonst würde
   nomLoad die Eltern-Zusagen wieder über die Einteilung legen und alle Kinder in
   jedes Team schreiben – genau der Fehler, der das Feature bisher wirkungslos machte. */
async function teamsAnwenden(){
  if(!Object.keys(TEAMS).length){toast("Erst einteilen","err");return;}
  if(!confirm(`Einteilung auf ${TEAM_ANZAHL} Team${TEAM_ANZAHL>1?"s":""} übertragen?\n\nDie Nominierung der betroffenen Teams wird überschrieben.`))return;
  await teamsSpeichern();
  const d=spieltagRawDate(), alle=KADER.map(k=>k.name);
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const key=t>1?`${d}__t${t}`:d;
    const data={_ovr:alle};
    alle.forEach(n=>{ data[n]=(TEAMS[n]===t)?"dabei":"nicht"; });
    try{
      await fetch(`${SB_URL}/rest/v1/nominierungen?on_conflict=datum`,{method:"POST",
        headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
        body:JSON.stringify({datum:key,data})});
    }catch(e){ toast("Übertragen fehlgeschlagen","err"); return; }
  }
  await teamGruendeSpeichern(d);
  toast(`Einteilung übertragen ✓`);
  await nomLoad();   // aktuelles Team neu laden -> Rotation, Aktionen, Aufstellung ziehen nach
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
  const farbe=p>=0.8?"#15803d":p>=0.5?"#b45309":"#dc2626";
  return `<span style="color:${farbe}">Training ${q.da}/${q.gesamt}</span>`;
}
function teamEinsatzText(n){
  const e=(TEAM_STATS[n]&&TEAM_STATS[n].einsaetze);
  return `<span style="color:var(--text2)">${e==null?"–":e} Einsätze</span>`;
}

function teamsRender(){
  const box=document.getElementById("team-panel");
  if(!box)return;
  const kd=teamKader();
  const pool=teamZusagen();
  const vorschlag=teamAnzahlVorschlag();
  const form=((typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{label:"4+1 Raute"}).label;
  const segBtn=(n)=>`<button class="seg-btn${TEAM_ANZAHL===n?" active":""}" onclick="teamSetAnzahl(${n})">${n}</button>`;

  let html=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
      <span style="font-size:12px;font-weight:600">Anzahl Teams</span>
      <div class="seg" style="flex:none;min-width:150px">${segBtn(1)}${segBtn(2)}${segBtn(3)}</div>
      <span style="font-size:11px;color:var(--text3)">Vorschlag: ${vorschlag}</span>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">${esc(form)}: ${kd.tw?"1 Torwart + ":""}${kd.feld} Feldspieler = ${kd.gesamt} pro Team · ${pool.length} Zusage${pool.length===1?"":"n"}${teamPlatzProTeam()>kd.gesamt?" · ein Team nimmt ein Kind mehr auf, damit niemand zusehen muss":""}</div>`;

  if(!pool.length){
    box.innerHTML=html+`<div style="font-size:11.5px;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px">Noch keine Zusage. Eingeteilt wird ausschließlich, wer zugesagt hat.</div>`;
    return;
  }

  html+=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-sm" onclick="teamsAuto()"><i class="ti ti-wand"></i>Automatisch einteilen</button>
      <button class="btn btn-sm btn-p" onclick="teamsAnwenden()"><i class="ti ti-arrow-right"></i>In die Nominierungen übertragen</button>
    </div>`;

  // Zu wenige Torwarte? Das merkt man sonst erst beim Anpfiff.
  if(kd.tw){
    const twDa=pool.filter(istTorwart).length;
    if(twDa<TEAM_ANZAHL*kd.tw)
      html+=`<div style="font-size:11.5px;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;margin-bottom:10px">🥅 Nur ${twDa} Kind${twDa===1?"":"er"} mit Torwart-Haken zugesagt, gebraucht werden ${TEAM_ANZAHL}. Ein Team bleibt ohne Torwart.</div>`;
  }

  if(!Object.keys(TEAMS).length){
    html+=`<div style="font-size:11.5px;color:var(--text3)">Noch nicht eingeteilt. „Automatisch einteilen" setzt je Team einen Torwart und verteilt den Rest nach Stärke.</div>`;
    box.innerHTML=html; return;
  }

  // Team-Übersicht: Größe, Torwart, Ø-Stärke
  const zeilen=[];
  const mindest=teamMindestKader();
  for(let t=1;t<=TEAM_ANZAHL;t++){
    const m=pool.filter(n=>TEAMS[n]===t);
    const bew=m.map(teamStaerke).filter(v=>v>=0);
    const schnitt=bew.length?Math.round(bew.reduce((a,b)=>a+b,0)/bew.length):null;
    const tw=m.filter(istTorwart).length;
    const spielfaehig=m.length>=mindest;
    zeilen.push(`<div style="flex:1;min-width:98px;background:var(--surface2);border-radius:var(--r);padding:8px">
      <div style="font-size:11.5px;font-weight:700">Adler ${t}</div>
      <div style="font-size:10.5px;color:${spielfaehig?"var(--text2)":"#dc2626"}" title="Sollgröße ${kd.gesamt}, mindestens ${mindest}">${m.length} Kinder${spielfaehig?"":" – zu wenige"}</div>
      <div style="font-size:10.5px">${kd.tw?(tw?"🥅 ok":"<span style='color:#dc2626'>kein TW</span>"):"<span style='color:var(--text3)'>ohne TW</span>"}</div>
      <div style="font-size:10.5px;color:var(--text2)">${schnitt!=null?"Ø "+schnitt+"%":"–"}</div>
    </div>`);
  }
  html+=`<div style="display:flex;gap:6px;margin-bottom:10px">${zeilen.join("")}</div>`;

  const zeile=(n)=>{
    const cur=TEAMS[n]||0;
    const knoepfe=[];
    for(let t=1;t<=TEAM_ANZAHL;t++)
      knoepfe.push(`<button onclick="teamSet('${jsq(n)}',${t})" style="min-width:44px;min-height:44px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;background:${cur===t?"var(--blue)":"var(--surface)"};color:${cur===t?"#fff":"var(--text2)"}">${t}</button>`);
    knoepfe.push(`<button onclick="teamSet('${jsq(n)}',0)" title="Pausiert" style="min-width:44px;min-height:44px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;font-size:12px;background:${cur?"var(--surface)":"var(--surface2)"};color:var(--text3)">–</button>`);
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px">${getKader(n)&&getKader(n).nr?getKader(n).nr+" ":""}${esc(n)}${istTorwart(n)?" 🥅":""}</div>
        <div style="font-size:10px">${teamQuoteText(n)} · ${teamEinsatzText(n)}</div>
      </div>
      ${knoepfe.join("")}
    </div>`;
  };

  const eingeteilt=pool.filter(n=>TEAMS[n]);
  const pausiert=pool.filter(n=>!TEAMS[n]);
  html+=eingeteilt.map(zeile).join("");

  if(pausiert.length){
    html+=`<div style="margin-top:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:10px">
      <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:2px">⚠️ ${pausiert.length} Kind${pausiert.length===1?"":"er"} passt${pausiert.length===1?"":"en"} nicht mehr in ein volles Team</div>
      <div style="font-size:11px;color:#92400e;margin-bottom:8px">Vorschlag nach den meisten Saison-Einsätzen, dann nach der geringsten Trainingsbeteiligung. Du entscheidest – mit den Knöpfen umsetzen.</div>
      ${pausiert.map(n=>zeile(n)+`<div style="display:flex;gap:6px;margin:-2px 0 10px 0">
          <input id="nh-${teamKaderIdx(n)}" value="${esc(TEAM_GRUND[n]||"")}" placeholder="Grund für die Eltern (optional)" style="flex:1;min-height:44px;padding:8px;border:1px solid #fcd34d;border-radius:8px;font-family:inherit;font-size:12px;background:#fff;color:#334155">
        </div>`).join("")}
    </div>`;
  }
  box.innerHTML=html;
}

// Eltern-Zusagen werden automatisch übernommen (in nomLoad). Dieser Button verwirft die
// Trainer-Overrides und koppelt die Nominierung wieder komplett an den aktuellen RSVP-Stand.
function nomApplyRsvp(){
  nomOvr.clear();
  Object.keys(nomRsvp).forEach(name=>{ nomStatus[name]=nomRsvp[name].status==="zugesagt"?"dabei":"nicht"; });
  nomRender();nomApplyToTools();nomSave();
  toast("Nominierung auf Eltern-RSVP zurückgesetzt ✓");
}
function nomApplyToTools(){
  const squad=nominierteSpieler();
  if(!rotTimerId){ // laufendes Spiel nicht zerstören – nur setzen, wenn Timer nicht läuft
    rotSeedFromSquad(squad); // Torwart separat, Feldgröße aus Spielform
    rotRenderControls();rotRenderLive();
  }
  if(document.getElementById("blitz-panel"))blitzInit();
  if(typeof atRender==="function"&&document.getElementById("action-panel"))atRender(); // Aktions-Chips folgen der Nominierung
  if(document.getElementById("mc-panel"))mcLoad();
}

/* ═══════════════════════════════════
   MATCH-UHR (Phase 6) – Anker-basierte Spieluhr, synchron über alle Geräte.
   Zustand liegt auf matchday (datum-keyed): half, clock_status, started_at,
   paused_ms. Jeder Client rechnet die verstrichene Zeit selbst aus dem Anker –
   kein Sekunden-Broadcast nötig. Speist später die Minute für den Eltern-Ticker.
═══════════════════════════════════ */
let mcState=null, mcTickId=null, mcSpieldauer=20, mcHalbzeiten=2, mcTickerOpen=true, mcDelegateToken=null;
function mcElapsedSec(mc){
  const paused=mc.paused_ms||0;
  if(mc.clock_status==="running"&&mc.started_at){
    return (paused+(Date.now()-new Date(mc.started_at).getTime()))/1000;
  }
  return paused/1000;
}
/* Minute fürs Anzeigen/den Ticker – gedeckelt auf die Spielzeit ("20.+" statt "23.").
   Bei EINER Spielzeit gibt es keinen Halbzeit-Versatz; mc.half bleibt dann immer 1. */
function mcMinuteLabel(mc,dauer,halbzeiten){
  if(!mc||mc.clock_status==="idle")return "–";
  if(mc.clock_status==="halftime")return "Halbzeit";
  if(mc.clock_status==="ended")return "Abgepfiffen";
  const sec=mcElapsedSec(mc);
  const minIn=Math.floor(sec/60);
  const zweite=(Number(halbzeiten)||2)===2&&(mc.half||1)===2;
  const offset=zweite?dauer:0;
  if(minIn>=dauer) return (offset+dauer)+".+"; // Nachspielzeit
  return (offset+minIn+1)+".";
}
async function mcLoad(){
  const datum=spieltagKey();
  const realDate=spieltagRawDate(); // Spieldauer liegt am echten Termin-Datum, nicht am Team-Key
  try{
    const [mdRes,tmRes]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=half,clock_status,started_at,paused_ms,ticker_open,delegate_token`,{headers:sbAuthHeaders()}),
      fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(realDate)}&select=spieldauer_min,halbzeiten&order=id.desc&limit=1`,{headers:sbAuthHeaders()})
    ]);
    const mdRows=mdRes.ok?await mdRes.json():[];
    const tmRows=tmRes.ok?await tmRes.json():[];
    mcSpieldauer=(tmRows[0]&&tmRows[0].spieldauer_min)||20;
    mcHalbzeiten=(tmRows[0]&&tmRows[0].halbzeiten)||2;
    mcState=mdRows[0]||{half:1,clock_status:"idle",started_at:null,paused_ms:0};
    mcTickerOpen=mdRows[0]?mdRows[0].ticker_open!==false:true;
    mcDelegateToken=(mdRows[0]&&mdRows[0].delegate_token)||null;
  }catch(e){
    mcState=mcState||{half:1,clock_status:"idle",started_at:null,paused_ms:0};
  }
  mcRenderLive();
  tickerRenderControls();
  clearInterval(mcTickId);
  mcTickId=setInterval(()=>{ if(mcState&&mcState.clock_status==="running")mcRenderLive(); },1000);
}
async function mcSave(patch){
  const datum=spieltagKey();
  mcState=Object.assign({},mcState,patch);
  mcRenderLive();
  try{await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum,...patch})});}catch(e){}
}
// Match-Uhr und Rotations-Timer laufen gekoppelt: EIN Button (Anpfiff) startet beide.
// Der Rotations-Timer bleibt ueber sein eigenes Panel weiterhin manuell bedienbar
// (z. B. kurze Trinkpause ohne offizielle Spielunterbrechung).
// halbzeiten mitschreiben: der oeffentliche Ticker liest matchday anonym und kennt den Termin nicht
function mcStart(){ mcSave({half:1,clock_status:"running",started_at:new Date().toISOString(),paused_ms:0,spieldauer_min:mcSpieldauer,halbzeiten:mcHalbzeiten}); rotStart(); }
function mcPause(){
  if(!mcState||mcState.clock_status!=="running")return;
  const addMs=Date.now()-new Date(mcState.started_at).getTime();
  mcSave({clock_status:"paused",started_at:null,paused_ms:(mcState.paused_ms||0)+addMs});
  rotStop();
}
function mcResume(){ mcSave({clock_status:"running",started_at:new Date().toISOString()}); rotStart(); }
function mcHalftimeStart(){
  if(!mcState||mcState.clock_status!=="running")return;
  const addMs=Date.now()-new Date(mcState.started_at).getTime();
  mcSave({clock_status:"halftime",started_at:null,paused_ms:(mcState.paused_ms||0)+addMs});
  rotStop();
}
function mcHalftimeEnd(){ mcSave({half:2,clock_status:"running",started_at:new Date().toISOString(),paused_ms:0}); rotStart(); }
function mcEnd(){ mcSave({clock_status:"ended",started_at:null}); rotStop(); }
function mcReset(){ mcSave({half:1,clock_status:"idle",started_at:null,paused_ms:0}); rotStop(); }
function mcRenderLive(){
  const box=document.getElementById("mc-panel");
  if(!box||!mcState)return;
  const label=mcMinuteLabel(mcState,mcSpieldauer,mcHalbzeiten);
  const s=mcState.clock_status;
  const eineZeit=mcHalbzeiten===1;   // U9 spielt oft 1×8 oder 1×10 – dann gibt es keine Halbzeit
  let controls="";
  if(s==="idle") controls=`<button class="btn btn-p" onclick="mcStart()"><i class="ti ti-player-play"></i>Anpfiff</button>`;
  else if(s==="running") controls=`<button class="btn" onclick="mcPause()"><i class="ti ti-player-pause"></i>Unterbrechung</button>`+
    ((!eineZeit&&mcState.half===1)?`<button class="btn" onclick="mcHalftimeStart()"><i class="ti ti-hourglass"></i>Halbzeit</button>`:`<button class="btn btn-d" onclick="mcEnd()"><i class="ti ti-flag"></i>Abpfiff</button>`);
  else if(s==="paused") controls=`<button class="btn btn-p" onclick="mcResume()"><i class="ti ti-player-play"></i>Weiter</button>`;
  else if(s==="halftime") controls=`<button class="btn btn-p" onclick="mcHalftimeEnd()"><i class="ti ti-player-play"></i>2. Halbzeit anpfeifen</button>`;
  else if(s==="ended") controls=`<button class="btn" onclick="mcReset()"><i class="ti ti-refresh"></i>Neu starten</button>`;
  const phase=eineZeit?`Spielzeit · ${mcSpieldauer} Min.`:`${mcState.half===2?"2. Halbzeit":"1. Halbzeit"} · ${mcSpieldauer} Min./HZ`;
  box.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="font-size:28px;font-weight:800;min-width:70px">${label}</div>
    <div style="font-size:11px;color:var(--text2)">${phase}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">${controls}</div>
  </div>`;
}

/* ═══════════════════════════════════
   ELTERN-LIVETICKER (Phase 4) – Trainer-Seite.
   Speist sich aus dem Live-Action-Tracker (atTap): NUR positive Aktionen lösen
   einen Ticker-Push aus (Pädagogik-Filter). Torwart-Fehler/Ballverlust werden
   nie gepusht. Zusätzlich: Tor/Gegentor-Buttons + Wolff-Fuss-Toggle + Delegate-Link.
═══════════════════════════════════ */
const TICKER_POSITIVE_KEYS=["pass","dribbling","gewinn","parade","aufbau","heraus"]; // verlust/fehler bewusst NICHT enthalten
const TICKER_PHRASES={
  pass:["{name} mit einem Zuckerpass!","{name} findet den freien Mann – starkes Auge!","Sauberer Pass von {name}!"],
  dribbling:["{name} tanzt durch die Abwehr!","{name} zeigt eine starke Dribbling-Einlage!","Mutiges 1-gegen-1 von {name}!"],
  gewinn:["{name} erobert den Ball zurück!","Ballgewinn durch {name} – stark gemacht!"],
  parade:["Riesenparade von {name}!","{name} hält den Kasten sauber!","Klasse Reflex von {name}!"],
  aufbau:["{name} eröffnet das Spiel von hinten!","Sauberer Aufbau durch {name}!"],
  heraus:["{name} klärt mutig vor dem Tor!","{name} behält die Nerven im Zweikampf!"],
  tor:["TOOOR für die Adler durch {name}!","{name} trifft ins Schwarze!","Was für ein Tor von {name}!"],
  aktion:["{name} war richtig aktiv!","Starke Szene von {name}!","{name} zeigt vollen Einsatz!"],
  gegentor:["Adler kämpfen weiter!","Kopf hoch, Team – weiter geht's!","Nächster Angriff, Adler!"],
  kapitaen:["©️ {name} führt die Adler heute als Kapitän aufs Feld!","©️ Heute trägt {name} die Kapitänsbinde – viel Erfolg!","©️ {name} ist heute unser Kapitän!"]
};
function tickerPhrase(typ,name){
  const arr=TICKER_PHRASES[typ]||["Die Adler waren aktiv!"];
  const p=arr[Math.floor(Math.random()*arr.length)];
  if(!p.includes("{name}"))return p;
  return p.replace("{name}",name||"Die Adler");
}
async function tickerPush(name,typ){
  if(mcTickerOpen===false)return; // Wolff-Fuss aktiv – nichts senden
  const datum=spieltagKey();
  const minute=mcState?mcMinuteLabel(mcState,mcSpieldauer,mcHalbzeiten):"";
  const text=tickerPhrase(typ,name);
  // Offline-fest: matchday-Upsert (FK-Ziel) zuerst, dann ticker_events – bei Netzausfall
  // landen beide in Reihenfolge in der Sync-Queue und werden bei Netz nachgespielt.
  await sbQueuedPost("matchday?on_conflict=datum",{datum},"resolution=merge-duplicates");
  await sbQueuedPost("ticker_events",{datum,text,typ,minute,source:"trainer"});
  tickerRenderFeed();
}
function tickerToggle(){
  mcTickerOpen=mcTickerOpen===false?true:false;
  mcSave({ticker_open:mcTickerOpen});
  tickerRenderControls();
}
// Read-only-Ticker-Link fuer alle Eltern (nur ansehen) – team-spezifisch ueber spieltagKey().
async function tickerShareViewLink(){
  const key=spieltagKey();
  try{ await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum:key})}); }catch(e){}
  const url=appRoot()+"?ticker="+encodeURIComponent(key);
  const teamTxt=spieltagTeam>1?` (Adler ${spieltagTeam})`:"";
  const text=`📣 Liveticker U9${teamTxt}:\n${url}`;
  if(navigator.share){navigator.share({title:"Liveticker U9",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Ansehen-Link kopiert ✓"),()=>prompt("Ansehen-Link:",url));}
}
// Konferenz-Link: EIN Link für alle Teams eines Spieltags (?ticker=<datum>__konf).
async function tickerShareKonfLink(){
  const datum=spieltagRawDate();
  try{ await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum})}); }catch(e){}
  const url=appRoot()+"?ticker="+encodeURIComponent(datum+"__konf");
  const text=`📣 Liveticker U9 · Konferenz (alle Teams):\n${url}`;
  if(navigator.share){navigator.share({title:"Liveticker U9 · Konferenz",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Konferenz-Link kopiert ✓"),()=>prompt("Konferenz-Link:",url));}
}
function tickerGoal(){
  if(!atSel){toast("Erst Spieler oben antippen","err");return;}
  tickerPush(atSel,"tor");
  // Torschütze zusätzlich als Aktion sichern → Datenquelle für Spielbericht (8-G) + Live-Quest (8-F).
  if(typeof atCounts==="object"){ if(!atCounts[atSel])atCounts[atSel]={}; atCounts[atSel].tor=(atCounts[atSel].tor||0)+1; }
  {const _d=spieltagKey(),_s=atSel; terminIdForDatum(_d).then(tid=>sbQueuedPost("match_actions",{datum:_d,spieler:_s,aktion:"tor",termin_id:tid}));} // HOTFIX 3-FE
  if(typeof atRender==="function")atRender();
  if(typeof questCheck==="function")questCheck();
}
function tickerCounterGoal(){ tickerPush(null,"gegentor"); }
async function tickerShareDelegateLink(){
  if(!mcDelegateToken){
    const datum=spieltagKey();
    try{
      await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum})});
      const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=delegate_token`,{headers:sbAuthHeaders()});
      const rows=r.ok?await r.json():[];
      mcDelegateToken=rows[0]&&rows[0].delegate_token;
    }catch(e){}
  }
  if(!mcDelegateToken){toast("Konnte Helfer-Link nicht erzeugen","err");return;}
  const url=appRoot()+"?delegate="+encodeURIComponent(mcDelegateToken);
  const text=`⚽ Liveticker-Helfer U9:\n${url}`;
  if(navigator.share){navigator.share({title:"Ticker-Helfer",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Helfer-Link kopiert ✓"),()=>prompt("Helfer-Link:",url));}
}
function tickerRenderControls(){
  const box=document.getElementById("ticker-panel");
  if(!box)return;
  const open=mcTickerOpen!==false;
  box.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <button class="btn ${open?"btn-p":""}" onclick="tickerToggle()">${open?"🔔 Ticker AN":"🔕 Ticker AUS"}</button>
      <button class="btn btn-sm" onclick="tickerShareViewLink()"><i class="ti ti-eye"></i>Ansehen-Link</button>
      <button class="btn btn-sm" onclick="tickerShareKonfLink()" title="Ein Link für alle Teams (Konferenz)"><i class="ti ti-users-group"></i>Konferenz-Link</button>
      <button class="btn btn-sm" onclick="tickerShareDelegateLink()"><i class="ti ti-user-share"></i>Helfer-Link</button>
      <span style="font-size:10.5px;color:var(--text2)">${open?"Eltern sehen positive Highlights live.":"Eltern sehen: „Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.“"}</span>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
      <button class="btn btn-sm" onclick="matchReport()"><i class="ti ti-news"></i>Spielbericht</button>
      <button class="btn btn-sm" onclick="ergebnisKarte()"><i class="ti ti-photo"></i>Ergebnis-Karte</button>
      <span style="font-size:10px;color:var(--text3)">Tore &amp; Gegentore kommen automatisch aus der Live-Aktion.</span>
    </div>
    <div id="ticker-feed" style="font-size:11.5px;color:var(--text2)"></div>`;
  tickerRenderFeed();
}
async function tickerRenderFeed(){
  const box=document.getElementById("ticker-feed");
  if(!box)return;
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=id,text,typ,minute,source,created_at&order=created_at.desc&limit=8`,{headers:sbAuthHeaders()});
    if(!r.ok){box.innerHTML="";return;}
    const rows=await r.json();
    box.innerHTML=rows.length?rows.map(e=>`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--surface2)">
      <span style="flex:1">${e.minute?`<strong>${esc(e.minute)}</strong> `:""}${esc(e.text)}${e.source==="delegate"?' <span style="opacity:.6">(Eltern-Helfer)</span>':""}</span>
      <button onclick="tickerDelete(${Number(e.id)},'${jsq(e.text||"")}')" title="Ticker-Eintrag löschen" aria-label="Löschen" style="border:none;background:transparent;cursor:pointer;color:#dc2626;font-size:13px;line-height:1;padding:2px 4px"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="color:var(--text3)">Noch keine Ticker-Einträge.</div>';
  }catch(e){}
}
// Ticker-Eintrag korrigieren = löschen (auch von Eltern-Helfern gesendete); der Eltern-Feed
// zeigt danach beim nächsten Poll den bereinigten Stand.
async function tickerDelete(id,text){
  if(!confirm(`Ticker-Eintrag löschen?

„${text||""}"

Eltern, die gerade mitlesen, sehen ihn dann nicht mehr.`))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/ticker_events?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  tickerRenderFeed();
}

/* ═══════════════════════════════════
   AUTOMATISCHER SPIELBERICHT (Phase 8-G)
   Baut aus den live erfassten Aktionen (match_actions) + Tor/Gegentor (ticker_events)
   einen warmen, positiven Fließtext für die Eltern-Gruppe. Kernprinzip: JEDES
   nominierte Kind bekommt mindestens einen positiven Satz – niemand fällt raus.
   Zufalls-Bausteine sorgen dafür, dass sich zwei Berichte nie identisch lesen.
   Rein clientseitig, positiv-only (kein Ballverlust/Fehler), Copy/Share.
═══════════════════════════════════ */
const REPORT_INTRO={
  torfest:["Was für ein Nachmittag! Die jungen Adler drehten mächtig auf.","Ein echtes Torfestival – die Adler waren heute nicht zu bremsen."],
  sieg:["Die Adler zeigten heute eine richtig reife Mannschaftsleistung.","Ein starker, souveräner Auftritt der jungen Adler."],
  knapp:["Ein spannendes Spiel, das bis zur letzten Minute auf Messers Schneide stand.","Ein ausgeglichenes, umkämpftes Match der Adler."],
  kampf:["Ein hart umkämpftes Spiel, in dem die Adler nie aufsteckten.","Die Adler kämpften bis zum Schlusspfiff – Kopf hoch, Jungs, das war stark!"],
  neutral:["Wieder ein Nachmittag, an dem die jungen Adler eine Menge dazugelernt haben.","Die Adler sammelten heute wertvolle Spielerfahrung und jede Menge Spaß."]
};
const REPORT_PRAISE={
  tor:["{name} war eiskalt vor dem Tor","{name} zeigte echte Torjäger-Qualitäten","{name} ließ dem gegnerischen Keeper keine Chance"],
  pass:["{name} glänzte als kluger Vorbereiter","{name} verteilte die Bälle mit toller Übersicht","{name} war das Herz im Aufbauspiel"],
  dribbling:["{name} tanzte durch die gegnerische Abwehr","{name} überzeugte im Eins-gegen-Eins","{name} zeigte mutige, freche Dribblings"],
  gewinn:["{name} eroberte einen Ball nach dem anderen","{name} war ein echter Ballräuber","{name} kämpfte um jeden einzelnen Ball"],
  parade:["{name} hielt im Tor den Kasten sauber","{name} zeigte zwischen den Pfosten starke Paraden","{name} war ein sicherer Rückhalt im Tor"],
  aufbau:["{name} eröffnete das Spiel stark von hinten","{name} brachte den ersten Pass immer sauber"],
  heraus:["{name} beherrschte souverän den Strafraum","{name} klärte mutig vor dem eigenen Tor"],
  einsatz:["{name} war mit vollem Einsatz dabei","{name} rackerte unermüdlich für das Team","{name} zeigte einen tollen Teamgeist","{name} gab keinen Ball verloren"]
};
const REPORT_CONN=["Außerdem","Dazu","Ebenso","Auch","Nicht zu vergessen:","Besonders auffällig:"];
const REPORT_CLOSE=["Am Ende zählt: Jedes Kind hat gekämpft und Spaß gehabt – und genau darum geht es. 🦅","Alle Adler haben heute alles gegeben – wir sind mächtig stolz auf euch! 🦅","Weiter so, Adler – auf geht's zum nächsten Spiel! 🦅"];
const REPORT_POS_ORDER=["parade","tor","dribbling","gewinn","pass","heraus","aufbau"]; // bei Gleichstand bevorzugte Highlight-Aktion
function rPick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function matchReportBuild(per,roster,tore,gegentore){
  const d=spieltagRawDate(),p=d.split("-");
  const dateStr=p.length===3?`${p[2]}.${p[1]}.${p[0]}`:d;
  const teamTxt=spieltagTeam>1?` – Adler ${spieltagTeam}`:"";
  const totalActions=Object.values(per).reduce((s,pl)=>s+Object.values(pl).reduce((a,b)=>a+b,0),0);
  let scenario="neutral";
  if(tore>=5)scenario="torfest";
  else if(tore>gegentore&&tore>0)scenario="sieg";
  else if(tore===gegentore&&(tore>0||gegentore>0))scenario="knapp";
  else if(gegentore>tore)scenario="kampf";
  else if(totalActions>0)scenario="sieg"; // Aktionen erfasst, aber keine Tore getippt → positiv
  let intro=rPick(REPORT_INTRO[scenario]);
  if(tore>0)intro+=` Die Adler erzielten ${tore===1?"einen Treffer":tore+" Treffer"}.`;
  // Pro Kind ein positiver Satz – Highlight = die am häufigsten getippte positive Aktion.
  const lines=roster.map((name,i)=>{
    const c=per[name]||{};
    let best=null,bestN=0;
    REPORT_POS_ORDER.forEach(k=>{const n=c[k]||0;if(n>bestN){bestN=n;best=k;}});
    const bank=best?REPORT_PRAISE[best]:REPORT_PRAISE.einsatz;
    let s=rPick(bank).replace("{name}",name);
    // Konnektor nur voranstellen, NICHT klein schreiben (Satz beginnt mit dem Spielernamen).
    if(i>0&&Math.random()<0.5)s=rPick(REPORT_CONN)+" "+s;
    return s+".";
  });
  const paras=[];for(let i=0;i<lines.length;i+=3)paras.push(lines.slice(i,i+3).join(" "));
  return `🦅 Spielbericht${teamTxt} – ${dateStr}\n\n${intro}\n\n${paras.join("\n\n")}\n\n${rPick(REPORT_CLOSE)}`;
}
// HOTFIX 6: Spieldaten sammeln, dann dynamischen KI-Bericht anfordern (lokale Engine = Fallback).
let reportData=null; // {per,roster,tore,gegentore,team,datum}
async function matchReport(){
  const datum=spieltagKey();
  let acts=[],trows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&select=spieler,aktion`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)acts=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=typ`,{headers:sbAuthHeaders()});if(r.ok)trows=await r.json();}catch(e){}
  const per={};
  acts.forEach(a=>{if(!per[a.spieler])per[a.spieler]={};per[a.spieler][a.aktion]=(per[a.spieler][a.aktion]||0)+1;});
  const roster=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():Object.keys(per);
  if(!roster.length){toast("Noch keine Spieldaten für einen Bericht","err");return;}
  const tore=trows.filter(t=>t.typ==="tor").length||Object.values(per).reduce((s,pl)=>s+(pl.tor||0),0);
  const gegentore=trows.filter(t=>t.typ==="gegentor").length;
  reportData={per,roster,tore,gegentore,team:spieltagTeam,datum:spieltagRawDate()};
  reportGenerate(false);
}
// KI-Bericht anfordern; bei Offline/Fehler/Zeitüberschreitung auf die lokale Text-Engine zurückfallen.
async function reportGenerate(isReroll){
  if(!reportData){matchReport();return;}
  const {per,roster,tore,gegentore,team,datum}=reportData;
  reportShowLoading(isReroll);
  const spieler=roster.map(name=>({name,highlights:per[name]||{}}));
  const seed=Math.random().toString(36).slice(2,8);
  const ctrl=new AbortController(), to=setTimeout(()=>ctrl.abort(),30000);
  try{
    const r=await fetch(`${SB_URL}/functions/v1/ki-spielbericht`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({spieler,tore,gegentore,team,datum,seed}),signal:ctrl.signal});
    clearTimeout(to);
    if(typeof sbCheck401==="function"&&sbCheck401(r))return;
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.bericht){ matchReportShow(matchReportBuild(per,roster,tore,gegentore),{fallback:true,reason:d.error}); return; }
    const p=(datum||"").split("-"); const ds=p.length===3?`${p[2]}.${p[1]}.${p[0]}`:datum;
    const head=`🦅 Spielbericht${team>1?" – Adler "+team:""} – ${ds}\n\n`;
    matchReportShow(head+d.bericht,{ai:true,rest:d.rest});
  }catch(e){
    clearTimeout(to);
    matchReportShow(matchReportBuild(per,roster,tore,gegentore),{fallback:true,reason:e&&e.name==="AbortError"?"timeout":"offline"});
  }
}
function reportShowLoading(isReroll){
  const old=document.getElementById("report-modal");if(old)old.remove();
  const modal=document.createElement("div");
  modal.id="report-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);color:var(--text);max-width:420px;width:100%;border-radius:16px;padding:28px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font-size:15px;font-weight:700;margin-bottom:8px">📰 ${isReroll?"Neue Formulierung …":"Spielbericht wird geschrieben …"}</div>
    <div style="font-size:13px;color:var(--text2)">🦅 Der Adler-Coach fasst das Spiel in Worte.</div></div>`;
  document.body.appendChild(modal);
}
function matchReportShow(text,opts){
  opts=opts||{};
  const old=document.getElementById("report-modal");if(old)old.remove();
  const modal=document.createElement("div");
  modal.id="report-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const badge=opts.ai
    ?`<span style="font-size:10px;background:#dbeafe;color:#1e40af;padding:2px 7px;border-radius:10px;font-weight:700">🤖 KI-Bericht${opts.rest!=null?" · "+opts.rest+" heute übrig":""}</span>`
    :opts.fallback
      ?`<span style="font-size:10px;background:#fef3c7;color:#854d0e;padding:2px 7px;border-radius:10px;font-weight:700">📴 Offline-Vorlage</span>`
      :"";
  card.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="font-weight:700;font-size:15px">📰 Spielbericht</div>${badge}</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px">${opts.fallback?"Kein Netz/KI – hier eine automatische Vorlage. ":""}Zum Kopieren in die Eltern-Gruppe – frei anpassbar. „Neu würfeln" erzeugt eine neue Variante.</div>`;
  const ta=document.createElement("textarea");
  ta.id="report-text";ta.value=text;
  ta.style.cssText="width:100%;min-height:280px;font-family:inherit;font-size:13px;line-height:1.5;border:var(--border-s);border-radius:10px;padding:12px;resize:vertical;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px";
  const radioBtn='speechSynthesis' in window
    ?`<button id="adler-radio-btn" class="btn btn-sm" style="background:#7c3aed;color:#fff;border-color:#7c3aed" onclick="adlerRadioToggle(this)"><i class="ti ti-volume"></i>📻 Adler Radio</button>`:"";
  const diaryBtn=`<button class="btn btn-sm" style="background:#0891b2;color:#fff;border-color:#0891b2" onclick="voiceDiaryOpen(typeof spieltagKey==='function'?spieltagKey():null)" title="Gedanken nach Abpfiff als Sprach-/Textnotiz festhalten"><i class="ti ti-microphone"></i>🎤 Notiz</button>`;
  bar.innerHTML=`${radioBtn}${diaryBtn}<button class="btn btn-sm" onclick="reportGenerate(true)"><i class="ti ti-refresh"></i>Neu würfeln</button>
    <button class="btn btn-p" onclick="matchReportCopy()"><i class="ti ti-copy"></i>Kopieren</button>
    <button class="btn btn-sm" onclick="adlerRadioStop();document.getElementById('report-modal').remove()">Schließen</button>`;
  card.appendChild(ta);card.appendChild(bar);
  modal.appendChild(card);
  document.body.appendChild(modal);
}
/* Adler Radio (Phase 22.4): den Spielbericht vorlesen – für Kinder, die den Text noch
   nicht flüssig lesen. Nutzt die Web Speech API mit einer deutschen Stimme, etwas
   flotter/heller für Kommentator-Energie. Toggle: nochmal tippen = Stopp. */
function adlerRadioStop(){ try{ if("speechSynthesis" in window)speechSynthesis.cancel(); }catch(e){}
  const b=document.getElementById("adler-radio-btn"); if(b)b.innerHTML='<i class="ti ti-volume"></i>📻 Adler Radio'; }
function adlerRadioToggle(btn){
  if(!("speechSynthesis" in window))return;
  if(speechSynthesis.speaking||speechSynthesis.pending){ adlerRadioStop(); return; }
  const ta=document.getElementById("report-text");
  const text=(ta?ta.value:"").replace(/🦅|📰/g,"").trim();
  if(!text)return;
  const u=new SpeechSynthesisUtterance(text);
  u.lang="de-DE"; u.rate=1.05; u.pitch=1.15;
  const de=speechSynthesis.getVoices().find(v=>/de[-_]/i.test(v.lang));
  if(de)u.voice=de;
  u.onend=u.onerror=()=>{const b=document.getElementById("adler-radio-btn"); if(b)b.innerHTML='<i class="ti ti-volume"></i>📻 Adler Radio';};
  speechSynthesis.speak(u);
  if(btn)btn.innerHTML='<i class="ti ti-player-stop"></i>⏹ Stopp';
}
function matchReportCopy(){
  const ta=document.getElementById("report-text");if(!ta)return;
  const text=ta.value;
  const done=()=>toast("Spielbericht kopiert ✓");
  if(navigator.share){navigator.share({title:"Spielbericht U9",text}).then(done).catch(()=>{});return;}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,()=>{ta.select();try{document.execCommand("copy");done();}catch(e){}});}
  else{ta.select();try{document.execCommand("copy");done();}catch(e){}}
}
// Teilbare Ergebnis-Karte (Bild): Ergebnis + Torschützen als Social-Card fürs Familien-/Eltern-Chat.
async function ergebnisKarte(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  toast("🖼️ Ergebnis-Karte wird erstellt…");
  const datum=spieltagKey(), realDate=spieltagRawDate();
  let trows=[],acts=[],gegner="";
  try{const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=typ`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)trows=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&select=spieler,aktion`,{headers:sbAuthHeaders()});if(r.ok)acts=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(realDate)}&select=gegner&order=datum.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok){const m=(await r.json())[0];gegner=(m&&m.gegner)||"";}}catch(e){}
  const tore=trows.filter(t=>t.typ==="tor").length||acts.filter(a=>a.aktion==="tor").length;
  const gegentore=trows.filter(t=>t.typ==="gegentor").length;
  const sc={}; acts.filter(a=>a.aktion==="tor").forEach(a=>{ if(a.spieler)sc[a.spieler]=(sc[a.spieler]||0)+1; });
  const scorers=Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n,c])=>c>1?`${n} (${c})`:n);
  const logo=new Image();
  logo.onload=()=>drawErgebnisKarte(logo,{tore,gegentore,gegner,scorers,realDate});
  logo.onerror=()=>drawErgebnisKarte(null,{tore,gegentore,gegner,scorers,realDate});
  logo.src="logo.png";
}
function drawErgebnisKarte(logoImg,d){
  const W=640,H=800,ctx=Object.assign(document.createElement("canvas"),{width:W,height:H}).getContext("2d");
  const c=ctx.canvas;
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#1e3a8a");g.addColorStop(1,"#1a56db");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";ctx.textBaseline="alphabetic";
  if(logoImg){try{ctx.drawImage(logoImg,W/2-46,46,92,92);}catch(e){}}
  ctx.fillStyle="#fff";ctx.font="bold 26px Arial";ctx.fillText("SV ADLER DELLBRÜCK · U9",W/2,178);
  const p=(d.realDate||"").split("-");const ds=p.length===3?`${p[2]}.${p[1]}.${p[0]}`:d.realDate;
  ctx.fillStyle="rgba(255,255,255,.75)";ctx.font="18px Arial";ctx.fillText(ds,W/2,208);
  const py=252,ph=210;
  ctx.fillStyle="rgba(255,255,255,.12)";tbRoundRect(ctx,60,py,W-120,ph,20);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.85)";ctx.font="bold 18px Arial";ctx.fillText("SPIELERGEBNIS",W/2,py+38);
  ctx.fillStyle="#facc15";ctx.font="bold 92px Arial";ctx.fillText(`${d.tore} : ${d.gegentore}`,W/2,py+140);
  ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.fillText(`Adler${d.gegner?"   –   "+d.gegner:""}`,W/2,py+185);
  let y=py+ph+66;
  if(d.scorers.length){
    ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="20px Arial";ctx.fillText("⚽ Torschützen",W/2,y);y+=36;
    ctx.fillStyle="#fff";ctx.font="bold 22px Arial";
    const words=d.scorers;let line="",yy=y;
    words.forEach(w=>{const t=line?line+"   ·   "+w:w; if(ctx.measureText(t).width>W-100&&line){ctx.fillText(line,W/2,yy);yy+=32;line=w;}else line=t;});
    if(line)ctx.fillText(line,W/2,yy);
  }
  ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="bold 24px Arial";ctx.fillText("🦅 Auf geht's, Adler!",W/2,H-46);
  c.toBlob(async(blob)=>{
    if(!blob){toast("Bild konnte nicht erzeugt werden","err");return;}
    const file=new File([blob],"ergebnis-u9.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:"Ergebnis U9"});}catch(e){}
    }else{
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ergebnis-u9.png";
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      toast("Ergebnis-Karte heruntergeladen ✓");
    }
  },"image/png");
}

/* Kalender-Sync (.ics): kommende veröffentlichte Termine als Kalenderdatei –
   landen mit Erinnerung nativ im Handy-Kalender der Eltern. Rein clientseitig. */
function icsEscape(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }
function icsLocalStart(datum,time){ const m=time.match(/^(\d{1,2}):(\d{2})/); return datum.replace(/-/g,"")+"T"+m[1].padStart(2,"0")+m[2]+"00"; }
function icsLocalPlus(datum,time,addMin){ const m=time.match(/^(\d{1,2}):(\d{2})/); const dt=new Date(datum+"T"+m[1].padStart(2,"0")+":"+m[2]+":00"); dt.setMinutes(dt.getMinutes()+addMin); const p=n=>String(n).padStart(2,"0"); return `${dt.getFullYear()}${p(dt.getMonth()+1)}${p(dt.getDate())}T${p(dt.getHours())}${p(dt.getMinutes())}00`; }
async function elternKalenderIcs(){
  toast("🗓️ Kalender wird erstellt…");
  const heute=new Date().toISOString().slice(0,10);
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=gte.${heute}&published=eq.true&select=datum,gegner,ort,treffpunkt,anpfiff,typ&order=datum.asc`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});if(r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){toast("Keine kommenden Termine","err");return;}
  const stamp=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SV Adler Dellbrück//U9//DE","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Adler U9 Termine"];
  rows.forEach((m,i)=>{
    const istTr=m.typ==="training";
    const titel=istTr?"Training U9":("Spiel U9"+(m.gegner?" gegen "+m.gegner:""));
    const hasTime=m.anpfiff&&/^\d{1,2}:\d{2}/.test(m.anpfiff);
    lines.push("BEGIN:VEVENT","UID:adler-u9-"+m.datum+"-"+i+"@adler-dellbrueck","DTSTAMP:"+stamp);
    if(hasTime){ lines.push("DTSTART:"+icsLocalStart(m.datum,m.anpfiff)); lines.push("DTEND:"+icsLocalPlus(m.datum,m.anpfiff,istTr?75:120)); }
    else{ lines.push("DTSTART;VALUE=DATE:"+m.datum.replace(/-/g,"")); }
    lines.push("SUMMARY:"+icsEscape(titel));
    if(m.ort)lines.push("LOCATION:"+icsEscape(m.ort));
    // Jeden Teil einzeln escapen, dann mit iCal-Zeilenumbruch (\n) verbinden – sonst würde der Umbruch doppelt escaped.
    const descParts=[m.treffpunkt?"Treffpunkt: "+m.treffpunkt:"",m.anpfiff?((istTr?"Beginn: ":"Anpfiff: ")+m.anpfiff):""].filter(Boolean).map(icsEscape);
    if(descParts.length)lines.push("DESCRIPTION:"+descParts.join("\\n"));
    lines.push("BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:"+icsEscape(titel+" morgen"),"END:VALARM");
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const ics=lines.join("\r\n");
  const blob=new Blob([ics],{type:"text/calendar;charset=utf-8"});
  try{
    const file=new File([blob],"adler-u9-termine.ics",{type:"text/calendar"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:"Adler U9 Termine"}); return; }
  }catch(e){ if(e&&e.name==="AbortError")return; }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="adler-u9-termine.ics";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast("Kalenderdatei erstellt ✓");
}
// Gebrandeter Ladezustand für alle öffentlichen Eltern-Flächen (statt fadem "Lade...").
function elternLoader(msg){ return `<div style="text-align:center;padding:56px 16px"><img src="logo.png" alt="" style="width:52px;height:52px;animation:adlerPulse 1.3s ease-in-out infinite"><div style="margin-top:14px;font-size:13px;color:#64748b">${elternEsc(msg||"Lädt …")}</div></div>`; }
// Freundlicher, gebrandeter Leer-/Fehlerzustand (Logo + optionales Emoji + Text). msg darf <br> enthalten.
function elternEmpty(msg,emoji){ return `<div class="elt-fade" style="text-align:center;padding:52px 20px"><img src="logo.png" alt="" style="width:54px;height:54px;opacity:.92">${emoji?`<div style="font-size:30px;margin-top:6px">${emoji}</div>`:""}<div style="margin-top:12px;font-size:14px;color:#64748b;line-height:1.55">${msg}</div></div>`; }
/* Persönlicher Kind-Link (?kind=<token>): 1-Tap Zu-/Absage ohne Login.
   Liest/schreibt ausschließlich über die security-definer-RPCs kind_termine / rsvp_by_token. */
let kindRoot=null, kindToken=null;
async function renderKindView(token){
  kindToken=token;
  kindRoot=document.createElement("div");
  kindRoot.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(kindRoot);
  kindRoot.innerHTML=elternLoader("Lädt …");
  await kindLoad();
}
async function kindLoad(){
  let d=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_termine`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:kindToken})});if(r.ok)d=await r.json();}catch(e){}
  if(!d||!d.ok){ kindRoot.innerHTML='<div style="text-align:center;padding:48px;color:#64748b"><img src="logo.png" style="width:56px;height:56px" alt=""><div style="margin-top:12px">Dieser Link ist ungültig oder abgelaufen.<br>Frag den Trainer nach einem neuen. 🦅</div></div>'; return; }
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"];
  const evCard=(t)=>{
    const dt=new Date(t.datum+"T00:00:00");
    const ds=wtag[dt.getDay()]+", "+dt.toLocaleDateString("de-DE",{day:"2-digit",month:"long"});
    const istTr=t.typ==="training";
    const titel=istTr?"Training":("Spiel"+(t.gegner?" gegen "+elternEsc(t.gegner):""));
    const st=t.status;
    const btn=(status,emo,lbl,onCol)=>`<button onclick="kindRsvp(${t.id},'${status}')" style="flex:1;min-height:52px;border:2px solid ${st===status?onCol:'#cbd5e1'};border-radius:12px;background:${st===status?onCol:'#fff'};color:${st===status?'#fff':'#334155'};font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">${emo} ${lbl}</button>`;
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
      <div style="font-size:15px;font-weight:800;color:#1e293b">${istTr?"🏃 ":"⚽ "}${titel}</div>
      <div style="font-size:12.5px;color:#64748b;margin:2px 0 10px">${ds}${t.uhrzeit?" · "+t.uhrzeit+" Uhr":""}${t.ort?" · "+elternEsc(t.ort):""}</div>
      <div style="display:flex;gap:8px">${btn('zugesagt','👍','Dabei','#16a34a')}${btn('abgesagt','👎','Kann nicht','#dc2626')}</div>
    </div>`;
  };
  kindRoot.innerHTML=`<div class="elt-fade">
    <div style="text-align:center;margin:8px 0 16px">
      <img src="logo.png" style="width:60px;height:60px" alt="">
      <div style="font-size:18px;font-weight:800;color:#1e3a8a;margin-top:6px">Hallo! 👋</div>
      <div style="font-size:14px;color:#334155">Sag <b>${elternEsc(d.name)}</b> mit einem Tipp zu oder ab.</div>
    </div>
    ${d.termine&&d.termine.length?d.termine.map(evCard).join(""):'<div style="text-align:center;color:#64748b;background:#fff;border-radius:16px;padding:24px">Aktuell keine anstehenden Termine. 🎉</div>'}
    <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:8px">SV Adler Dellbrück e.V. · persönlicher Link für ${elternEsc(d.name)}</div></div>`;
}
async function kindRsvp(terminId,status){
  if(!kindToken)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/rsvp_by_token`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:kindToken,p_termin_id:terminId,p_status:status})});
    const d=r.ok?await r.json():null;
    if(d&&d.ok){ toast(status==="zugesagt"?"👍 Zugesagt – danke!":"👎 Abgesagt – schade!"); try{navigator.vibrate&&navigator.vibrate(40);}catch(e){} await kindLoad(); }
    else toast("Konnte nicht speichern","err");
  }catch(e){ toast("Netzwerkfehler – bist du online?","err"); }
}
