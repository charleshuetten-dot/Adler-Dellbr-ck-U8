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
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
      <div style="font-weight:800;font-size:16px">🎽 Rollen-Erfahrung</div>
      <button onclick="document.getElementById('rollen-modal').remove()" style="border:none;background:none;font-size:24px;color:var(--text2);cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:10px">Wie oft stand jedes Kind in welcher Start-Rolle? (aus ${games} gespeicherten Aufstellungen, nur 4+1). Rot = noch nie.</div>
    ${games?head+rows:'<div style="font-size:13px;color:var(--text3);padding:16px;text-align:center">Noch keine Aufstellungen gespeichert.<br>Speichere im Spieltag unter „Aufstellung" eine Startelf – dann füllt sich die Matrix.</div>'}
    ${games&&nie.length?`<div style="font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;margin-top:12px">🥅 <b>Noch nie im Tor:</b> ${nie.map(esc).join(", ")} – vor dem E-Jugend-Wechsel (fester TW) mal ranlassen.</div>`:""}
    <button class="btn btn-sm" style="width:100%;margin-top:12px" onclick="document.getElementById('rollen-modal').remove()">Schließen</button>`;
  modal.appendChild(c); document.body.appendChild(modal);
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
      <button class="btn btn-sm" onclick="rollenMatrixOpen()" title="Wer stand wie oft in welcher Rolle?"><i class="ti ti-layout-grid"></i>Rollen-Erfahrung</button>
    </div>
    <div id="team-rollen-hint"></div>`;
  setTimeout(()=>{try{rollenHintFill();}catch(e){}},0); // A-lite: „noch nie im Tor"-Hinweis nachladen

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

