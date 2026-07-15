/* ═══════════════════════════════════════════════════════════
   ADLER BOOT & ORGA LAYER (Modularisierung 8/8 – Schlussstein)
   INIT (Mode-Routing, Trainingsbibliothek), Team-Modul (Block G),
   Anwesenheits-Tracker, Trainingsplanung, PIN-Gate,
   Trainings-Bewertung, Auto-Trainingsvorschlag, PWA-Setup (SW-Reg.).
   Laedt als LETZTES Skript – orchestriert den App-Start.
   ═══════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */


let CUSTOM_FORMS=[];
let activeTF=null; // bewusst KEINE Vorbelegung: 100+ Übungen aufgeklappt erschlagen – erst Kategorie wählen oder suchen
// FEAT AC-Folge: EINE gemeinsame Formenliste (Bibliothek + eigene/KI-Übungen).
// Die Planung ist index-basiert – deshalb MUSS ueberall dieselbe Liste (gleicher
// Index-Raum) genutzt werden, sonst zeigt ein Slot die falsche Uebung.
function tpAllForms(){ return (typeof TRAININGSFORMEN!=="undefined"?TRAININGSFORMEN:[]).concat(typeof CUSTOM_FORMS!=="undefined"?CUSTOM_FORMS:[]); }

async function loadCustomForms(){
  try{
    const r=await fetch(SB_URL+'/rest/v1/trainingsformen?select=*',{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    if(r.ok){CUSTOM_FORMS=await r.json()||[];}
  }catch(e){CUSTOM_FORMS=[];}
  renderTraining();
}

async function saveCustomTraining(){
  var name=document.getElementById('tf-name').value.trim();
  if(!name){toast('Bitte Name eingeben','err');return;}
  var form={
    name:name,kat:document.getElementById('tf-kat').value,
    ablauf:document.getElementById('tf-ablauf').value,
    varianten:document.getElementById('tf-varianten').value,
    coaching:document.getElementById('tf-coaching').value,
    spieler:document.getElementById('tf-spieler').value,
    feld:document.getElementById('tf-feld').value,
    dauer:document.getElementById('tf-dauer').value,
    spass:parseInt(document.getElementById('tf-spass').value),
    diff:parseInt(document.getElementById('tf-diff').value),
    custom:true,focus:false,tags:'Eigene Form',
    kurz:document.getElementById('tf-ablauf').value.slice(0,80)
  };
  try{
    // Trainer-Token statt anon (RLS: trainingsformen schreibbar nur fuer is_trainer). Kein svg-Feld (Spalte existiert nicht).
    var res=await fetch(SB_URL+'/rest/v1/trainingsformen',{
      method:'POST',
      headers:sbAuthHeaders({'Prefer':'return=minimal'}),
      body:JSON.stringify(form)
    });
    if(!res.ok){toast("Cloud-Speicherung fehlgeschlagen – nur lokal gespeichert","info");}
  }catch(e){toast("Offline – Form nur lokal gespeichert","info");}
  CUSTOM_FORMS.push(form);
  closeAddTraining();
  renderTraining();
  toast("Trainingsform gespeichert ✓");
}

function openAddTraining(){document.getElementById('training-modal').style.display='block';}
function closeAddTraining(){
  document.getElementById('training-modal').style.display='none';
  ['tf-name','tf-ablauf','tf-varianten','tf-coaching','tf-spieler','tf-feld','tf-dauer'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('tf-spass').value='5';
  document.getElementById('tf-diff').value='2';
  document.getElementById('tf-kat').value='raute';
}

function setTF(f,btn){
  activeTF=f;
  document.querySelectorAll('#training-filter-row .ftag').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  renderTraining();
}

// Trainings-Periodisierung: Saison-Themenplan (ein Schwerpunkt je Monat) – zeigt oben im Trainings-Tab.
const PERIOD_CATS={aufwaermen:'Aufwärmen',raute:'Raute & Grundordnung',passspiel:'Passspiel',wahrnehmung:'Wahrnehmung & IQ',technik:'Technik & Ball',pressing:'Pressing & Umschalten',spass:'Spass & Wettbewerb',torwart:'Torwart',individual:'Individual',mindset:'Mindset'};
async function periodLoad(){
  const box=document.getElementById("period-banner"); if(!box)return;
  const monat=new Date().toISOString().slice(0,7);
  let cur=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${monat}&select=*`,{headers:sbAuthHeaders()});if(r.ok)cur=(await r.json())[0];}catch(e){}
  const monName=new Date().toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  if(cur){
    box.innerHTML=`<div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1"><strong>🎯 Schwerpunkt ${esc(monName)}: ${esc(cur.thema)}</strong>${cur.kategorie?`<div style="font-size:11px;margin-top:2px">Passende Übungen: <b>${esc(PERIOD_CATS[cur.kategorie]||cur.kategorie)}</b> – über die Kategorien unten filtern.</div>`:""}</div><button onclick="periodOpen()" class="btn btn-sm" style="flex:none">📅 Plan</button></div>`;
  }else{
    box.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><span style="flex:1">Plane die Saison in <b>Themenblöcken</b> (ein Schwerpunkt je Monat).</span><button onclick="periodOpen()" class="btn btn-sm" style="flex:none">📅 Themenplan</button></div>`;
  }
}
async function periodOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("period-modal")?.remove();
  const modal=document.createElement("div");modal.id="period-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Saison-Themenplan");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const fld="width:100%;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const opts=Object.entries(PERIOD_CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`${mdlHead("period-modal","📅","Saison-Themenplan","Ein Schwerpunkt je Monat · erscheint oben im Trainings-Tab","#2563eb")}
    <div id="period-list" style="margin-bottom:12px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <label style="font-size:11px;color:var(--text2)">Monat<input type="month" id="period-monat" value="${new Date().toISOString().slice(0,7)}" style="${fld}"></label>
      <label style="font-size:11px;color:var(--text2)">Kategorie<select id="period-kat" style="${fld}"><option value="">—</option>${opts}</select></label>
    </div>
    <label style="font-size:11px;color:var(--text2)">Thema<input id="period-thema" placeholder="z. B. Dribbling & 1-gegen-1" style="${fld}"></label>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
      <button class="btn btn-p" onclick="periodSave()"><i class="ti ti-plus"></i>Speichern</button>
      <button class="btn btn-sm" onclick="document.getElementById('period-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
  periodListRender();
}
async function periodListRender(){
  const box=document.getElementById("period-list"); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/periodisierung?select=*&order=monat.asc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){box.innerHTML='<div style="color:var(--text3);font-size:12.5px;padding:6px 0">Noch keine Monate geplant.</div>';return;}
  const fmtM=m=>{const p=String(m).split("-");return p.length===2?new Date(p[0],p[1]-1,1).toLocaleDateString("de-DE",{month:"short",year:"2-digit"}):m;};
  box.innerHTML=rows.map(x=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--surface2)">
    <span style="font-weight:700;font-size:11px;color:var(--blue);width:58px">${esc(fmtM(x.monat))}</span>
    <span style="flex:1;font-size:13px">${esc(x.thema)}${x.kategorie?` <span style="font-size:10px;color:var(--text3)">(${esc(PERIOD_CATS[x.kategorie]||x.kategorie)})</span>`:""}</span>
    <button onclick="periodDelete('${esc(x.monat)}')" title="löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;font-size:13px;padding:2px 4px"><i class="ti ti-trash"></i></button>
  </div>`).join("");
}
async function periodSave(){
  const monat=document.getElementById("period-monat")?.value;
  const thema=(document.getElementById("period-thema")?.value||"").trim();
  const kategorie=document.getElementById("period-kat")?.value||null;
  if(!monat||!thema){toast("Monat und Thema angeben","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/periodisierung?on_conflict=monat`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({monat,thema,kategorie,updated_at:new Date().toISOString()})});if(sbCheck401(r))return;if(!r.ok&&r.status!==201){toast("Speichern fehlgeschlagen","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  const t=document.getElementById("period-thema");if(t)t.value="";
  toast("Themenplan gespeichert ✓");periodListRender();periodLoad();
}
async function periodDelete(monat){
  if(!confirm(`Monats-Schwerpunkt für ${monat} wirklich löschen?`))return;
  try{await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${encodeURIComponent(monat)}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){}
  periodListRender();periodLoad();
}
function renderTraining(){
  var wrap=document.getElementById('training-content');
  if(!wrap)return;
  if(!window._periodLoaded){window._periodLoaded=true;periodLoad();} // Saison-Schwerpunkt einmal laden
  var search=(document.getElementById('training-search')||{value:''}).value.toLowerCase();
  var catLabels={aufwaermen:'Aufwärmen & Aktivierung',raute:'Raute & Grundordnung',passspiel:'Passspiel & Freilaufen',wahrnehmung:'Wahrnehmung & IQ',technik:'Technik & Ball',pressing:'Pressing & Umschalten',spass:'Spass & Wettbewerb',torwart:'Torwart-Training',individual:'Individual-Training',mindset:'Mindset & Selbstvertrauen',custom:'Eigene Formen'};
  var catCls={aufwaermen:'tf-cat-aufwaermen',raute:'tf-cat-raute',passspiel:'tf-cat-passspiel',wahrnehmung:'tf-cat-wahrnehmung',technik:'tf-cat-technik',pressing:'tf-cat-pressing',spass:'tf-cat-spass',torwart:'tf-cat-torwart',individual:'tf-cat-individual',mindset:'tf-cat-mindset',custom:'tf-cat-custom'};
  var diffLbl={1:'Einfach',2:'Mittel',3:'Anspruchsvoll'};
  // Ohne gewählte Kategorie UND ohne Suchbegriff: Hinweis statt 100+ aufgeklappter Übungen
  if(!activeTF&&!search){
    wrap.innerHTML='<div style="text-align:center;padding:2.2rem 1rem;color:var(--text2)"><div style="font-size:34px;margin-bottom:8px">🏃</div><div style="font-size:13.5px;font-weight:700;color:var(--text)">Kategorie wählen oder suchen</div><div style="font-size:12px;margin-top:4px">Tippe oben auf eine Kategorie – oder nutze die Suche. „Alle" zeigt die komplette Datenbank.</div></div>';
    return;
  }
  var all=TRAININGSFORMEN.concat((CUSTOM_FORMS||[]).map(function(f){return Object.assign({},f,{kat:f.kat||'custom'});}));
  var filtered=all.filter(function(tf){
    var kat=tf.custom?'custom':tf.kat;
    var matchKat=(!activeTF||activeTF==='alle'||activeTF===kat); // null = keine Kategorie gewählt -> Suche läuft über alle
    var matchSearch=!search||(tf.name||'').toLowerCase().indexOf(search)>=0||(tf.kurz||'').toLowerCase().indexOf(search)>=0;
    return matchKat&&matchSearch;
  });
  if(!filtered.length){wrap.innerHTML='<div style="text-align:center;padding:2rem;color:#64748b">Keine Trainingsform gefunden</div>';return;}
  var groups={};
  filtered.forEach(function(tf){var k=tf.custom?'custom':tf.kat;if(!groups[k])groups[k]=[];groups[k].push(tf);});
  var order=['aufwaermen','raute','passspiel','wahrnehmung','technik','pressing','spass','torwart','individual','mindset','custom'];
  var html='';
  order.forEach(function(kat){
    var items=groups[kat];if(!items||!items.length)return;
    if(!activeTF||activeTF==='alle'){ // auch bei kategorieloser Suche nach Kategorien gruppieren
      html+='<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#64748b;margin:1.2rem 0 .5rem;padding-top:.8rem;border-top:1px solid #e2e8f0">'+(catLabels[kat]||kat)+'</div>';
    }
    var sorted=items.filter(function(t){return t.focus;}).concat(items.filter(function(t){return !t.focus;}));
    sorted.forEach(function(tf){
      var tid=String(tf.id||tf.name).replace(/[^a-zA-Z0-9]/g,'_');
      var stars='';for(var s=0;s<(tf.spass||3);s++)stars+='*';
      var cat=tf.custom?'custom':tf.kat;
      var h='<div class="tf-card" id="card-'+tid+'">';
      h+='<div class="tf-head" onclick="toggleTF(\''+tid+'\')"><div style="flex:1">';
      h+='<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
      h+='<span class="tf-title">'+esc(tf.name)+'</span>';
      if(tf.focus)h+='<span class="tf-focus-badge">* Fokus</span>';
      h+='<span class="tf-cat-badge '+(catCls[cat]||'tf-cat-custom')+'">'+(catLabels[cat]||cat)+'</span>';
      h+='</div><div style="font-size:11.5px;color:#64748b;margin-top:3px;line-height:1.4">'+esc(tf.kurz||'')+'</div>';
      h+='<div class="tf-meta">';
      h+='<span class="tf-meta-item">'+(tf.spieler||'?')+' Spieler</span>';
      h+='<span class="tf-meta-item">'+(tf.feld||'?')+'</span>';
      h+='<span class="tf-meta-item">'+(tf.dauer||'?')+' Min.</span>';
      h+='<span style="color:#f59e0b;font-size:11px">'+stars+'</span>';
      h+='<span class="tf-diff-badge tf-diff-'+(tf.diff||1)+'">'+(diffLbl[tf.diff||1]||'')+'</span>';
      h+='</div></div><i class="ti ti-chevron-down" id="chev-'+tid+'" style="font-size:15px;color:#94a3b8;transition:transform .2s"></i></div>';
      h+='<div class="tf-body" id="body-'+tid+'">';
      if(tf.svg)h+='<div style="margin-bottom:10px">'+tf.svg+'</div>';
      h+='<div class="tf-section"><div class="tf-section-title">Ablauf</div>';
      h+='<div class="tf-section-text" style="white-space:pre-wrap">'+esc((tf.ablauf||'').replace(/\\n/g,'\n'))+'</div></div>';
      if(tf.varianten){h+='<div class="tf-section"><div class="tf-section-title">Varianten</div>';
        h+='<div class="tf-section-text" style="white-space:pre-wrap">'+esc(tf.varianten.replace(/\\n/g,'\n'))+'</div></div>';}
      if(tf.coaching){h+='<div class="tf-section"><div class="tf-section-title">Coaching</div>';
        h+='<div class="tf-section-text" style="white-space:pre-wrap">'+esc(tf.coaching.replace(/\\n/g,'\n'))+'</div></div>';}
      h+='</div></div>';
      html+=h;
    });
  });
  wrap.innerHTML=html;
}

function toggleTF(id){
  var body=document.getElementById('body-'+id);
  var chev=document.getElementById('chev-'+id);
  if(!body)return;
  var open=body.classList.toggle('open');
  if(chev)chev.style.transform=open?'rotate(180deg)':'';
}

/* PRINT: printView() ist weiter oben (bei renderProfil) vollständig definiert –
   inkl. Titel/Meta-Kopf und Aufklappen eingeklappter Dim-Blöcke. Die frühere
   schlanke Duplikat-Definition an dieser Stelle wurde entfernt (sie überschrieb
   die vollständige Variante und unterdrückte so die Druck-Kopfzeile). */

// p-date (Bewertung), tp-date (Planung) und aw-date (Anwesenheit) sind jetzt Termin-Dropdowns –
// gefüllt aus den echten Terminen beim Öffnen des jeweiligen Tabs (terminSelectFill).
loadKader().then(()=>loadDB()).then(()=>{if(curSection==="home")renderHome();}).then(()=>teamSyncLoad()).then(()=>setTimeout(showMilestoneHint,1500)); // Kader (Supabase) zuerst, dann G1 + KI-Light + Home-Stats
loadCustomForms();
openTab("home"); // Start auf dem Trainer-Dashboard + Sub-Tab-Leiste initial rendern
if(sbToken())loadTeamConfig().then(()=>{if(typeof curSection!=="undefined"&&curSection==="home")renderHome();}); // editierbare Quests früh laden

/* Pull-to-Refresh (Schritt 6): am Listenanfang nach unten wischen -> Daten still neu laden. */
async function appRefresh(){
  try{ await loadDB(); if(typeof refreshSelects==="function")refreshSelects(); }catch(e){}
  try{ const sec=SECS[curSection]; if(sec&&sec.init)sec.init(); }catch(e){}
}
(function(){
  let startY=0, pulling=false, dist=0, ind=null;
  const THRESH=70;
  const scrollTop=()=>window.scrollY||document.documentElement.scrollTop||0;
  function el(){
    if(ind)return ind;
    ind=document.createElement("div");
    ind.id="ptr-ind";
    ind.style.cssText="position:fixed;top:0;left:50%;z-index:60;background:var(--club-accent,#1a56db);color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25);transition:transform .18s;transform:translate(-50%,-56px);font-size:18px";
    ind.innerHTML='<i class="ti ti-refresh"></i>';
    document.body.appendChild(ind);
    return ind;
  }
  document.addEventListener("touchstart",e=>{
    if(scrollTop()>0||document.body.classList.contains("quiz-extern")){pulling=false;return;}
    startY=e.touches[0].clientY; pulling=true; dist=0;
  },{passive:true});
  document.addEventListener("touchmove",e=>{
    if(!pulling)return;
    dist=e.touches[0].clientY-startY;
    if(dist<=0||scrollTop()>0){ pulling=false; el().style.transform="translate(-50%,-56px)"; return; }
    const pull=Math.min(dist,120);
    el().style.transform=`translate(-50%,${Math.min(pull-56,20)}px) rotate(${Math.round(pull*3)}deg)`;
  },{passive:true});
  document.addEventListener("touchend",async()=>{
    if(!pulling)return;
    pulling=false;
    const e=el();
    if(dist>=THRESH){
      e.style.transform="translate(-50%,16px)";
      e.querySelector("i").classList.add("ptr-spin");
      await appRefresh();
      if(typeof toast==="function")toast("Aktualisiert ✓");
      e.querySelector("i").classList.remove("ptr-spin");
    }
    e.style.transform="translate(-50%,-56px)";
  },{passive:true});
})();

/* switchTrainSub() lebt jetzt als Shim im 5-Tab-Router (siehe oben, delegiert an go()).
   Die frühere vollständige Definition wurde entfernt – ihre Init-Logik steckt in SECS. */

/* ═══════════════════════════════════
   TEAM-MODUL (Block G)
═══════════════════════════════════ */
// Header-Helfer für Team-Tabellen – seit Block I mit User-Token (RLS: nur authenticated)
function sbTeamHeaders(){
  return sbAuthHeaders();
}

// G1: local-first Upsert (Fehler still schlucken – offline-fähig bleiben)
async function teamSyncUpsert(table,datum,data,extra){
  try{
    await fetch(`${SB_URL}/rest/v1/${table}?on_conflict=datum`,{
      method:"POST",
      headers:{...sbTeamHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify(Object.assign({datum,data},extra||{})) // HOTFIX 3-FE: optional termin_id
    });
  }catch(e){/* offline */}
}
// Schritt 6 (API-Debouncing): Netzwerk-Schutz. Bursts auf DIESELBE (table,datum)-Zeile
// werden zu einem Write zusammengefasst (1,5 s). Lokal wird sofort gespeichert (local-first),
// nur der Supabase-Write wartet – schützt vor Request-Spam bei schnellem Tippen/Speichern.
const _tsuTimers={};
function teamSyncUpsertDebounced(table,datum,data,extra){
  const key=table+"|"+datum;
  clearTimeout(_tsuTimers[key]);
  _tsuTimers[key]=setTimeout(()=>{ delete _tsuTimers[key]; teamSyncUpsert(table,datum,data,extra); }, 1500);
}
// Generischer Debounce-Helfer (wiederverwendbar)
function debounce(fn,ms){ let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),ms); }; }

// G1: lokale Schreib-Zeitstempel je Datum (für Konfliktregel "jüngerer updated_at gewinnt")
const AW_TS_KEY="adler_anwesenheit_ts",EVAL_TS_KEY="adler_training_eval_ts";
function teamTsSet(key,datum){
  const ts=safeParse(localStorage.getItem(key),{})||{};
  ts[datum]=new Date().toISOString();
  localStorage.setItem(key,JSON.stringify(ts));
}

// G1: beim Start beide Tabellen laden und mit localStorage mergen
async function teamSyncLoad(){
  const merge=async(table,localObj,storeKey,tsKey)=>{
    try{
      const r=await fetch(`${SB_URL}/rest/v1/${table}?select=*`,{headers:sbTeamHeaders()});
      if(!r.ok)return;
      const rows=await r.json();
      const localTs=safeParse(localStorage.getItem(tsKey),{})||{};
      const remoteByDatum={};
      rows.forEach(row=>{if(row&&row.datum)remoteByDatum[row.datum]=row;});
      rows.forEach(row=>{
        if(!row||!row.datum)return;
        const lts=localTs[row.datum];
        // Remote übernehmen, wenn lokal nichts da ist oder Remote jünger ist
        if(!localObj[row.datum]||!lts||new Date(row.updated_at||0)>=new Date(lts)){
          localObj[row.datum]=row.data;
        }
      });
      // Push-Back: lokale Änderungen, die beim Offline-Speichern nie ankamen (oder neuer als
      // der Remote-Stand sind), jetzt im Hintergrund nachreichen statt für immer lokal gefangen
      // zu bleiben
      Object.keys(localObj).forEach(datum=>{
        const lts=localTs[datum];
        if(!lts)return; // kein lokaler Zeitstempel = nie offline geändert, nichts zu pushen
        const remote=remoteByDatum[datum];
        if(!remote||new Date(lts)>new Date(remote.updated_at||0)){
          teamSyncUpsert(table,datum,localObj[datum]);
        }
      });
      localStorage.setItem(storeKey,JSON.stringify(localObj));
    }catch(e){/* offline */}
  };
  await merge("anwesenheit",AW_DATA,AW_KEY,AW_TS_KEY);
  await merge("trainings_eval",EVAL_DATA,EVAL_KEY,EVAL_TS_KEY);
}

// Micro-Voting: Schwerpunkt-Abstimmung fürs nächste Training (async, aggregiert)
const TV_OPTIONS=["Umschaltspiel","Passschärfe","Zweikampf","Spaß & Motivation"];
function tvInit(){
  const box=document.getElementById("tv-buttons");
  if(!box)return;
  box.innerHTML=TV_OPTIONS.map(o=>`<button class="btn btn-sm" style="min-height:44px" onclick="tvVote('${o.replace(/'/g,"")}')">${o}</button>`).join("");
  tvLoad();
}
async function tvVote(wahl){
  const autor=document.getElementById("tv-autor")?.value||"";
  if(!autor){toast("Bitte Trainer wählen","err");return;}
  const datum=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_polls?on_conflict=datum,autor`,{
      method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum,autor,wahl})
    });
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){toast("Stimme gezählt ✓");tvLoad();}
    else toast("Fehler beim Abstimmen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tvLoad(){
  const wrap=document.getElementById("tv-results");
  if(!wrap)return;
  const datum=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_polls?datum=eq.${encodeURIComponent(datum)}&select=autor,wahl`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){wrap.innerHTML="";return;}
    const rows=await r.json();
    const counts={};TV_OPTIONS.forEach(o=>counts[o]=0);
    rows.forEach(v=>{if(counts[v.wahl]!=null)counts[v.wahl]++;});
    const total=rows.length;
    if(!total){wrap.innerHTML='<div style="font-size:11px;color:var(--text3)">Noch keine Stimme heute.</div>';return;}
    wrap.innerHTML=`<div style="font-size:10px;color:var(--text3);margin-bottom:6px">${total} Stimme${total!==1?"n":""} heute</div>`+TV_OPTIONS.map(o=>{
      const c=counts[o], pct=total?Math.round(c/total*100):0;
      return `<div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px"><span>${o}</span><span style="color:var(--text2)">${c}</span></div>
        <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--blue);border-radius:4px;transition:width .3s"></div></div>
      </div>`;
    }).join("");
  }catch(e){wrap.innerHTML="";}
}

/* ═══════════════════════════════════
   ANWESENHEITS-TRACKER
═══════════════════════════════════ */
let AW_DATA={};
const AW_KEY="adler_anwesenheit";
try{AW_DATA=JSON.parse(localStorage.getItem(AW_KEY)||"{}");}catch(e){AW_DATA={};}

/* Generisch: ein <select> aus den echten Terminen füllen – keine freien Datumsfelder mehr.
   opt.types (Standard alle 4), opt.future (true = künftige zuerst + nächster vorgewählt,
   sonst neueste zuerst + jüngster vergangener vorgewählt), opt.onReady (Callback danach). */
function terminOptionLabel(t){
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ};
  const d=new Date(t.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const dd=d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});
  return `${wtag} ${dd} · ${m.icon} ${esc(t.titel||t.gegner||m.label)}`;
}
// Eine gecachte Terminliste bedient alle drei Datums-Selects (Anwesenheit/Planung/Bewertung)
// – statt bei jedem Tab-Öffnen 90 Termine neu zu ziehen (45s-TTL).
let _termineSel={rows:null,at:0};
async function _termineSelLoad(){
  if(_termineSel.rows && Date.now()-_termineSel.at<45000) return _termineSel.rows;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=datum,typ,titel,gegner,uhrzeit&order=datum.desc,uhrzeit.desc.nullslast&limit=120`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  _termineSel={rows:rows||[],at:Date.now()};
  return _termineSel.rows;
}
async function terminSelectFill(selId, opt){
  opt=opt||{}; const sel=document.getElementById(selId); if(!sel)return;
  const types=opt.types||["training","spiel","turnier","event"], future=!!opt.future;
  let rows=(await _termineSelLoad()).filter(t=>types.includes(t.typ));
  if(future)rows=rows.slice().sort((a,b)=>(a.datum<b.datum?-1:a.datum>b.datum?1:0)); // künftig: aufsteigend
  const heute=new Date().toISOString().slice(0,10);
  if(!rows.length){ sel.innerHTML=`<option value="${heute}">Heute (${heute}) – noch kein Termin hinterlegt</option>`; if(opt.onReady)opt.onReady(); return; }
  sel.innerHTML=rows.map(t=>`<option value="${t.datum}">${terminOptionLabel(t)}</option>`).join("");
  let def;
  if(future){ def=(rows.find(t=>t.datum>=heute)||rows[rows.length-1]).datum; }   // nächster künftiger
  else { const past=rows.find(t=>t.datum<=heute); def=past?past.datum:rows[rows.length-1].datum; } // jüngster vergangener
  sel.value=def;
  if(opt.onReady)opt.onReady();
}
// Stellt sicher, dass ein bestimmtes Datum als Option existiert (z. B. das Datum einer alten
// Bewertung, das keinem Termin entspricht) und wählt es aus.
function terminSelectEnsure(selId, datum){
  const sel=document.getElementById(selId); if(!sel||!datum)return;
  if(![...sel.options].some(o=>o.value===datum)){
    const d=new Date(datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const dd=d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});
    const o=document.createElement("option"); o.value=datum; o.textContent=`${wtag} ${dd}`; sel.insertBefore(o,sel.firstChild);
  }
  sel.value=datum;
}
// Anwesenheit: Termine (alle 4 Typen), neueste zuerst, danach awLoad.
async function awDatesLoad(){ return terminSelectFill("aw-date",{onReady:awLoad}); }
function awRenderList(){
  const wrap=document.getElementById("aw-list");
  if(!wrap)return;
  const de=document.getElementById("aw-date"); const datum=de?de.value:"";
  const existing=AW_DATA[datum]||{};
  let html='<div class="card" style="overflow:hidden;margin-top:8px">';
  // Die 3 Spieler-Sterne wurden nach "Einheit bewerten" verschoben (dort im Kontext der
  // Einheit). Hier wird nur noch abgehakt, wer da war.
  KADER.forEach(k=>{
    const p=existing[k.name]||{da:false,qual:0};
    html+=`<div class="aw-row">
      <span class="aw-name">${esc(k.name)}</span>
      <button class="aw-toggle${p.da?" on":""}" onclick="awToggle(this,'${k.name}')" data-player="${k.name}"></button>
      ${p.qual?`<span class="aw-qual-ro" title="Bewertung aus „Einheit bewerten“" style="font-size:11px;color:#f59e0b;letter-spacing:1px">${"★".repeat(p.qual)}</span>`:""}
    </div>`;
  });
  html+='</div>';
  wrap.innerHTML=html;
  awRenderStats();
}

function awToggle(btn,name){
  btn.classList.toggle("on");
}

function awSave(){
  const datum=document.getElementById("aw-date").value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  const trainers=Array.from(document.querySelectorAll("#aw-trainer-checks input:checked")).map(c=>c.value);
  const data={_trainers:trainers};
  const vorher=AW_DATA[datum]||{};
  KADER.forEach(k=>{
    const toggle=document.querySelector(`.aw-toggle[data-player="${k.name}"]`);
    // qual wird hier NICHT mehr erfasst (steht in "Einheit bewerten") – bestehenden Wert
    // uebernehmen, sonst wuerde jedes Anwesenheits-Speichern die Sterne auf 0 setzen.
    data[k.name]={da:toggle?.classList.contains("on")||false,qual:(vorher[k.name]||{}).qual||0};
  });
  AW_DATA[datum]=data;
  localStorage.setItem(AW_KEY,JSON.stringify(AW_DATA));
  teamTsSet(AW_TS_KEY,datum); // G1
  // HOTFIX 3-FE: termin_id mitschreiben (falls Termin am Datum existiert) -> Cascade greift
  terminIdForDatum(datum).then(tid=>teamSyncUpsertDebounced("anwesenheit",datum,data,tid?{termin_id:tid}:null));
  // FEAT S: Trainings-XP für anwesende Kinder – idempotent pro Datum (quelle_id),
  // Mehrfach-Speichern vergibt also nie doppelt. Un-Toggle nimmt bewusst nichts weg.
  KADER.forEach(k=>{if(data[k.name]&&data[k.name].da)xpAwardByName(k.name,"training",datum).catch(()=>{});});
  awStreakAward(data); // F7: Serien-Meilensteine + Feier-Toast
  awRenderStats();
  awRenderTrainerStats();
  try{navigator.vibrate&&navigator.vibrate(50);}catch(e){} // 1C: haptische Bestätigung
  toast("Anwesenheit gespeichert ✓");
}

/* ═══════════════════════════════════
   FEAT V: BUDDY-AUSLOSUNG (Welle 1)
   Fisher-Yates über die anwesend markierten Kinder → Zweier-Paare,
   bei ungerader Zahl wird das letzte Paar zum Dreier-Team.
   Anzeige zuerst (fürs Hochhalten am Platz), Persistenz best-effort
   in termine.buddies des Termins am gewählten Datum.
═══════════════════════════════════ */
async function buddyShuffle(){
  if(typeof pauseLoad==="function")await pauseLoad(); // C: pausierte Kinder nicht mitlosen
  const anwesend=KADER.filter(k=>document.querySelector(`.aw-toggle[data-player="${k.name}"]`)?.classList.contains("on")).map(k=>k.name)
    .filter(n=>!(typeof istPaused==="function"&&istPaused(n)));
  if(anwesend.length<2){toast("Erst mindestens 2 Kinder als anwesend markieren","err");return;}
  for(let i=anwesend.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[anwesend[i],anwesend[j]]=[anwesend[j],anwesend[i]];}
  const paare=[];
  for(let i=0;i+1<anwesend.length;i+=2)paare.push([anwesend[i],anwesend[i+1]]);
  if(anwesend.length%2===1)paare[paare.length-1].push(anwesend[anwesend.length-1]);
  buddyRender(paare);
  buddyPersist(paare);
  try{navigator.vibrate&&navigator.vibrate([30,40,30]);}catch(e){}
}
function buddyRender(paare){
  const el=document.getElementById("buddy-result");
  if(!el)return;
  el.innerHTML=`<div class="card" style="margin-top:12px;padding:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-weight:800;font-size:15px">🎲 Buddy-Paare</div>
      <button class="btn btn-sm" onclick="buddyShuffle()">Neu mischen</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
      ${paare.map((p,i)=>`<div style="padding:12px;border-radius:10px;background:${["#eff6ff","#f0fdf4","#fef3c7","#fdf2f8","#f0f9ff","#f5f3ff","#fff7ed","#f0fdfa"][i%8]};font-size:16px;font-weight:800;text-align:center">${p.map(esc).join(" 🤝 ")}${p.length===3?' <span style="font-size:10px;font-weight:700;color:#92400e">(3er-Team)</span>':""}</div>`).join("")}
    </div>
  </div>`;
}
async function buddyPersist(paare){
  const datum=document.getElementById("aw-date")?.value;
  if(!datum)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(datum)}&select=id&limit=1`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    const rows=await r.json();
    if(!rows.length)return; // kein Termin an dem Tag -> nur Anzeige, kein Fehler
    await fetch(`${SB_URL}/rest/v1/termine?id=eq.${rows[0].id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({buddies:paare})});
  }catch(e){}
}

function awLoad(){
  const datum=document.getElementById("aw-date").value;
  const existing=AW_DATA[datum]||{};
  const savedTrainers=existing._trainers;
  const apply=list=>document.querySelectorAll("#aw-trainer-checks input").forEach(cb=>{cb.checked=(list||[]).includes(cb.value);});
  if(savedTrainers&&savedTrainers.length){ apply(savedTrainers); }
  else{
    apply([]);
    // Vorausfüllen aus der Trainer-Verfügbarkeit des Trainings-Termins an diesem Datum
    try{fetch(`${SB_URL}/rest/v1/termine?datum=eq.${datum}&typ=eq.training&select=trainer_status&limit=1`,{headers:sbAuthHeaders()})
      .then(r=>r.ok?r.json():[]).then(rows=>{const ts=(rows[0]||{}).trainer_status||{};const ja=Object.keys(ts).filter(n=>ts[n]==="ja");if(ja.length)apply(ja);}).catch(()=>{});}catch(e){}
  }
  awRenderList();
  awPrefillFromNomination(datum); // bei Spielen/Turnieren die nominierten „dabei"-Kinder vorhaken
}
// Vorbelegung der Anwesenheit aus der Nominierung (nur wenn für das Datum noch nichts erfasst ist):
// Wer für ein Spiel/Turnier auf „dabei" steht, wird vorgehakt – der Trainer prüft & speichert.
async function awPrefillFromNomination(datum){
  if(!datum||AW_DATA[datum])return;          // bereits erfasst -> nicht überschreiben
  let data=null;
  try{ const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=eq.${encodeURIComponent(datum)}&select=data`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){const rows=await r.json(); data=rows[0]&&rows[0].data;} }catch(e){}
  if(!data)return;
  let n=0;
  KADER.forEach(k=>{ if(data[k.name]==="dabei"){ const t=document.querySelector(`.aw-toggle[data-player="${k.name}"]`); if(t&&!t.classList.contains("on")){t.classList.add("on");n++;} } });
  if(n){ awRenderStats(); toast(`${n} nominierte Kinder vorgehakt – bitte prüfen & speichern`); }
}

function awRenderTrainerStats(){
  const wrap=document.getElementById("aw-trainer-stats");
  if(!wrap)return;
  const dates=Object.keys(AW_DATA).sort();
  const allTrainers=(typeof TRAINER!=="undefined"?TRAINER:["Sandy","Charles","Finn","Kenneth","Peter"]); // HOTFIX 1: Single Source, kein hartes Limit (Finn war raus)
  if(!dates.length){wrap.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Noch keine Daten erfasst</div>';return;}
  const stats={};
  allTrainers.forEach(t=>{stats[t]={da:0,total:dates.length};});
  dates.forEach(d=>{
    const trainers=AW_DATA[d]._trainers||[];
    trainers.forEach(t=>{if(stats[t])stats[t].da++;});
  });
  const evalDates=Object.keys(EVAL_DATA);
  const trainerExercises={};
  allTrainers.forEach(t=>{trainerExercises[t]=[];});
  evalDates.forEach(d=>{
    const items=EVAL_DATA[d];
    if(!items)return;
    items.forEach(it=>{
      if(it.skipped)return; // uebersprungen = nicht von diesem Trainer durchgefuehrt
      if(it.trainer&&trainerExercises[it.trainer]){
        trainerExercises[it.trainer].push(it.name);
      }
    });
  });
  let html='<div class="card" style="overflow:hidden;font-size:12px">';
  html+='<div style="display:grid;grid-template-columns:1fr 60px 70px;padding:6px 10px;background:var(--surface2);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">';
  html+='<div>Trainer</div><div>Quote</div><div>Einheiten</div></div>';
  allTrainers.forEach(t=>{
    const s=stats[t];
    const pct=s.total?Math.round(s.da/s.total*100):0;
    const col=pct>=80?"#16a34a":pct>=50?"#b45309":"#dc2626";
    html+=`<div style="display:grid;grid-template-columns:1fr 60px 70px;padding:6px 10px;border-top:var(--border);align-items:center">
      <div style="font-weight:600">${t}</div>
      <div style="color:${col};font-weight:700">${pct}%</div>
      <div style="color:var(--text2)">${s.da}/${s.total}</div>
    </div>`;
  });
  html+='</div>';
  wrap.innerHTML=html;
}

/* F7: Anwesenheits-Serie – aufeinanderfolgende ERFASSTE Einheiten (neueste zuerst), in
   denen das Kind „da" war. Erste Abwesenheit beendet die Serie; Einheiten vor dem Beitritt
   (Kind fehlt im Datensatz) werden übersprungen, nicht als Lücke gewertet. */
const AW_STREAK_MILES=[3,5,8,12,16,20];
function awStreak(name){
  const dates=Object.keys(AW_DATA).sort().reverse();
  let s=0;
  for(const d of dates){ const day=AW_DATA[d]; if(!day||!(name in day))continue; if(day[name]&&day[name].da)s++; else break; }
  return s;
}
// Milestone-Federn für erreichte Serien (idempotent pro Meilenstein via xp_award_event) +
// eine Feier-Toast für die längste neue Serie. Aufruf nach dem Speichern der Anwesenheit.
function awStreakAward(data){
  let bestStreak=0,bestName="";
  KADER.forEach(k=>{
    if(!(data[k.name]&&data[k.name].da))return;
    const st=awStreak(k.name);
    AW_STREAK_MILES.filter(m=>m<=st).forEach(m=>{try{xpAwardByName(k.name,"streak","s"+m).catch(()=>{});}catch(e){}});
    if(st>bestStreak){bestStreak=st;bestName=k.name;}
  });
  if(bestStreak>=3)setTimeout(()=>toast(`🔥 ${bestName}: ${bestStreak}× in Folge dabei!`),700);
}
function awRenderStats(){
  const wrap=document.getElementById("aw-stats");
  if(!wrap)return;
  const dates=Object.keys(AW_DATA).sort();
  if(!dates.length){wrap.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Noch keine Daten erfasst</div>';return;}
  const stats={};
  KADER.forEach(k=>{stats[k.name]={total:0,da:0,qualSum:0,qualCount:0};});
  dates.forEach(d=>{
    const day=AW_DATA[d];
    KADER.forEach(k=>{
      stats[k.name].total++;
      if(day[k.name]?.da){
        stats[k.name].da++;
        if(day[k.name].qual>0){stats[k.name].qualSum+=day[k.name].qual;stats[k.name].qualCount++;}
      }
    });
  });
  let html='<div class="card" style="overflow:hidden;font-size:12px">';
  html+='<div style="display:grid;grid-template-columns:1fr 60px 60px 70px;padding:6px 10px;background:var(--surface2);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">';
  html+='<div>Spieler</div><div>Quote</div><div title="Durchschnitt der Sterne-Bewertung aus „Einheit bewerten" (nur Tage, an denen das Kind da war)">Ø ★</div><div>Einheiten</div></div>';
  KADER.forEach(k=>{
    const s=stats[k.name];
    const pct=s.total?Math.round(s.da/s.total*100):0;
    const avgQ=s.qualCount?Math.round(s.qualSum/s.qualCount*10)/10:"-";
    const col=pct>=80?"#16a34a":pct>=50?"#b45309":"#dc2626";
    const st=awStreak(k.name);
    const flame=st>=2?` <span title="${st}× in Folge dabei" style="font-size:11px;font-weight:700;color:#ea580c">🔥${st}</span>`:"";
    html+=`<div style="display:grid;grid-template-columns:1fr 60px 60px 70px;padding:6px 10px;border-top:var(--border);align-items:center">
      <div style="font-weight:600">${k.name}${flame}</div>
      <div style="color:${col};font-weight:700">${pct}%</div>
      <div>${avgQ!=="-"?"★".repeat(Math.round(avgQ)):"-"}</div>
      <div style="color:var(--text2)">${s.da}/${s.total}</div>
    </div>`;
  });
  html+='</div>';
  html+='<div style="font-size:10px;color:var(--text3);margin-top:6px">Ø ★ = durchschnittliche Trainings-Bewertung des Kindes aus „Einheit bewerten" (an Anwesenheits-Tagen).</div>';
  wrap.innerHTML=html;
}

/* ═══════════════════════════════════
   TRAININGSPLANUNG
═══════════════════════════════════ */
const TP_PHASEN=[
  {label:"Ankommen & Aufwärmen",dauer:10,farbe:"#059669",typ:"warmup"},
  {label:"Hauptteil 1",dauer:20,farbe:"#1a56db",typ:"main"},
  {label:"Hauptteil 2",dauer:20,farbe:"#7c3aed",typ:"main"},
  {label:"Abschlussspiel",dauer:15,farbe:"#c2410c",typ:"abschluss"}
];
let tpSlots=[...TP_PHASEN];
let tpExerciseLog={};
try{tpExerciseLog=JSON.parse(localStorage.getItem("adler_exercise_log")||"{}");}catch(e){tpExerciseLog={};}

function tpGetExerciseHistory(formIdx){
  const entries=[];
  Object.entries(tpExerciseLog).forEach(([date,forms])=>{
    if(forms.includes(formIdx))entries.push(date);
  });
  return entries.sort().reverse();
}
// Tage seit letztem Einsatz einer Form (null = nie genutzt) – für Vielfalt-Hinweise.
function tpLastUsedDays(formIdx){
  const h=tpGetExerciseHistory(formIdx);
  if(!h.length)return null;
  const last=new Date(h[0]); if(isNaN(last))return null;
  return Math.max(0,Math.floor((Date.now()-last.getTime())/86400000));
}
function autoPlanFreshHint(formIdx){
  const d=tpLastUsedDays(formIdx);
  if(d===null)return '<span style="color:#16a34a">🆕 neu</span>';
  if(d<14)return `<span style="color:#b45309">⚠️ vor ${d} T.</span>`;
  return `<span style="color:var(--text3)">zuletzt vor ${d} T.</span>`;
}

function tpGetTrainerCount(){
  return document.querySelectorAll("#tp-trainer-checks input:checked").length;
}

function tpFilteredOpts(typ,kat){
  const allForms=tpAllForms();
  if(typ==="warmup") return allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="aufwaermen");
  if(typ==="tw") return allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="torwart");
  if(typ==="individual") return allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="individual");
  const mainForms=allForms.map((f,i)=>({i,f})).filter(x=>!["aufwaermen","torwart","individual"].includes(x.f.kat)); // custom/KI-Übungen jetzt im Hauptteil wählbar
  if(kat) return mainForms.filter(x=>x.f.kat===kat);
  return mainForms;
}
function tpGetCheckedTrainers(){
  return Array.from(document.querySelectorAll("#tp-trainer-checks input:checked")).map(c=>c.value);
}
const TP_MAIN_CATS=[
  {key:"raute",label:"Raute & Grundordnung"},
  {key:"mindset",label:"Mindset & Selbstvertrauen"},
  {key:"passspiel",label:"Passspiel & Freilaufen"},
  {key:"wahrnehmung",label:"Wahrnehmung & IQ"},
  {key:"technik",label:"Technik & Ball"},
  {key:"pressing",label:"Pressing & Umschalten"},
  {key:"spass",label:"Spaß & Wettbewerb"}
];
function tpOnCatChange(selId,si,p){
  const catSel=document.getElementById("tp-cat-"+si+"-"+p);
  const formSel=document.getElementById(selId);
  if(!catSel||!formSel)return;
  const kat=catSel.value;
  const filtered=tpFilteredOpts("main",kat||null);
  formSel.innerHTML='<option value="">— Übung wählen —</option>'+filtered.map(x=>`<option value="${x.i}">${x.f.name} (${x.f.dauer})</option>`).join("");
  formSel.value="";
  const histDiv=document.getElementById(selId+"-hist");
  if(histDiv)histDiv.innerHTML="";
}

function tpExerciseHistoryHtml(formIdx){
  const hist=tpGetExerciseHistory(formIdx);
  if(!hist.length) return '<span style="color:var(--text3);font-size:9px">Noch nie verwendet</span>';
  return `<span style="color:var(--text3);font-size:9px">✓ ${hist.length}× verwendet – zuletzt ${new Date(hist[0]).toLocaleDateString("de-DE")}</span>`;
}

function tpShowExercise(formIdx){
  const allForms=tpAllForms();
  const f=allForms[formIdx];
  if(!f)return;
  const hist=tpGetExerciseHistory(formIdx);
  const histHtml=hist.length?`<div style="margin-top:8px;font-size:11px;color:var(--text2)"><strong>Einsatz-Historie (${hist.length}×):</strong><br>${hist.slice(0,8).map(d=>'• '+new Date(d).toLocaleDateString("de-DE")).join('<br>')}</div>`:'<div style="margin-top:8px;font-size:11px;color:var(--text3)">Noch nie in einer Einheit verwendet.</div>';
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:380px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25)">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
      <div style="font-size:14px;font-weight:700;color:var(--text)">${f.name}</div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text2)">×</button>
    </div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:6px">${f.kurz||""}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <span style="font-size:10px;background:var(--surface);padding:2px 6px;border-radius:4px">⏱ ${f.dauer}</span>
      <span style="font-size:10px;background:var(--surface);padding:2px 6px;border-radius:4px">👥 ${f.spieler||"?"}</span>
      <span style="font-size:10px;background:var(--surface);padding:2px 6px;border-radius:4px">📐 ${f.feld||"?"}</span>
    </div>
    <div style="font-size:11px;color:var(--text);white-space:pre-wrap;line-height:1.5;margin-bottom:8px">${f.ablauf||""}</div>
    ${f.coaching?`<div style="font-size:10px;color:var(--text2);background:var(--surface);padding:8px;border-radius:6px;white-space:pre-wrap"><strong>🎯 Coaching-Tipps:</strong>\n${f.coaching}</div>`:""}
    ${histHtml}
  </div>`;
  document.body.appendChild(modal);
}

// Stationen-Board: Trainer-Zuweisung pro Übungs-Station (wer macht was)
let tpCoaches={};
function tpSetCoach(stationId,name){
  tpCoaches[stationId]=name;
  tpPlanSaveDebounced();                        // Zuordnung am Datum festhalten
  if(typeof evalRenderList==="function")evalRenderList(); // Bewertungs-Liste zieht nach
}
function tpCoachSelect(stationId){
  const avail=tpGetCheckedTrainers();
  const list=avail.length?avail:TRAINER;
  const cur=tpCoaches[stationId]||"";
  return `<select class="tp-coach-sel" data-station="${stationId}" onchange="tpSetCoach('${stationId}',this.value)" aria-label="Trainer für diese Station" title="Wer leitet diese Station?">
    <option value="">👤 Trainer?</option>${list.map(t=>`<option value="${t}"${t===cur?" selected":""}>${t}</option>`).join("")}
  </select>`;
}

function tpRenderTimeline(){
  const wrap=document.getElementById("tp-timeline");
  if(!wrap)return;
  if(typeof renderTeamDiagnose==="function")renderTeamDiagnose(); // Phase 7-C: Team-Diagnose oben
  const trainerCount=tpGetTrainerCount();
  const allForms=tpAllForms();
  let time=0;
  // F5: Stationstimer + G3: Anwesenheits-Prognose (async gefüllt).
  let html='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px"><span id="tp-prognose"></span><button class="btn btn-p btn-sm" onclick="stTimerStart()" title="Stationen am Platz mit Countdown durchlaufen">⏱️ Stationstimer</button></div><div id="ziel-uebungen-hint"></div>';
  tpSlots.forEach((slot,si)=>{
    const startMin=time;
    const endMin=time+slot.dauer;
    const typ=slot.typ||"main";
    const noGroups=typ==="warmup"||typ==="abschluss"||typ==="tw";
    const noSelect=typ==="abschluss";
    const parallelSlots=noGroups?1:Math.min(trainerCount,5);
    const filtered=tpFilteredOpts(typ);
    const formOpts=filtered.map(x=>`<option value="${x.i}">${x.f.name} (${x.f.dauer})</option>`).join("");

    html+=`<div class="tp-slot" style="border-left:3px solid ${slot.farbe}">
      <div class="tp-slot-head">
        <span class="tp-slot-label">${slot.label}</span>
        <span class="tp-slot-time">${startMin}' – ${endMin}' (${slot.dauer} Min.)</span>
        <button class="tp-remove" onclick="tpRemoveSlot(${si})"><i class="ti ti-trash"></i></button>
      </div>`;
    if(noSelect){
      html+=`<div style="font-size:11px;color:var(--text2);padding:4px 0">Freies Spiel – alle Kinder zusammen</div>`;
    } else if(typ==="tw"){
      const twPlayers=KADER.filter(k=>k.tw);
      html+=`<div style="margin-top:6px">
        <div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:4px">Torwart-Spieler</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          ${twPlayers.map(k=>`<label class="tp-check"><input type="checkbox" value="${k.name}" class="tp-tw-player" data-slot="${si}" checked><span>${k.name}${k.twPrio===1?" ⭐":""}</span></label>`).join("")}
        </div>
        <div class="tp-feld"><label for="tp-form-${si}-0">Übung</label>
          <div class="tp-feld-zeile">
            <select class="tp-form-sel" id="tp-form-${si}-0" onchange="tpOnSelectChange(this)">
              <option value="">— Übung wählen —</option>${formOpts}
            </select>
            <button class="tp-info" onclick="tpShowExFromSel('tp-form-${si}-0')" aria-label="Übung ansehen" title="Übung ansehen">ℹ️</button>
          </div>
        </div>
        <div class="tp-feld"><label>Trainer</label>${tpCoachSelect(`tp-form-${si}-0`)}</div>
        <div id="tp-form-${si}-0-hist"></div>
      </div>`;
    } else if(typ==="individual"){
      const playerOpts=KADER.map(k=>`<option value="${k.name}">${k.name}</option>`).join("");
      html+=`<div class="tp-feld"><label for="tp-ind-player-${si}">Spieler</label>
        <select id="tp-ind-player-${si}" onchange="tpIndPlayerChange(${si})">
          <option value="">— Spieler wählen —</option>${playerOpts}
        </select>
      </div>
      <div id="tp-ind-reco-${si}" style="margin-bottom:8px"></div>
      <div class="tp-feld"><label for="tp-form-${si}-0">Übung</label>
        <div class="tp-feld-zeile">
          <select class="tp-form-sel" id="tp-form-${si}-0" onchange="tpOnSelectChange(this)">
            <option value="">— Übung wählen —</option>${formOpts}
          </select>
          <button class="tp-info" onclick="tpShowExFromSel('tp-form-${si}-0')" aria-label="Übung ansehen" title="Übung ansehen">ℹ️</button>
        </div>
      </div>
      <div class="tp-feld"><label>Trainer</label>${tpCoachSelect(`tp-form-${si}-0`)}</div>
      <div id="tp-form-${si}-0-hist"></div>`;
    } else {
      const trainers=tpGetCheckedTrainers();
      for(let p=0;p<parallelSlots;p++){
        const selId=`tp-form-${si}-${p}`;
        if(!tpCoaches[selId]&&!noGroups&&trainers[p])tpCoaches[selId]=trainers[p]; // Station standardmäßig dem Gruppen-Trainer zuweisen
        const isMain=typ==="main";
        const catOpts=isMain?TP_MAIN_CATS.map(c=>`<option value="${c.key}">${c.label}</option>`).join(""):"";
        // Eine Karte je Station. Frueher stand hier eine einzige Zeile, die am Handy in
        // fuenf Elemente umbrach – man sah nicht mehr, welches Feld zu welcher Gruppe gehoert.
        // Der Trainername stand doppelt: einmal als Etikett, einmal im (funktionslosen) Dropdown.
        html+=`<div class="tp-station">
          <div class="tp-station-head">
            <span class="tp-station-nr">${noGroups?"👥":p+1}</span>
            <span class="tp-station-titel">${noGroups?"Alle Kinder":`Gruppe ${p+1}`}</span>
            ${noGroups?"":tpCoachSelect(selId)}
          </div>`;
        if(isMain){
          html+=`<div class="tp-feld"><label for="tp-cat-${si}-${p}">Kategorie</label>
            <select id="tp-cat-${si}-${p}" onchange="tpOnCatChange('${selId}',${si},${p})">
              <option value="">Alle Kategorien</option>${catOpts}
            </select></div>`;
        }
        html+=`<div class="tp-feld"><label for="${selId}">Übung</label>
            <div class="tp-feld-zeile">
              <select class="tp-form-sel" id="${selId}" onchange="tpOnSelectChange(this)">
                <option value="">— Übung wählen —</option>${formOpts}
              </select>
              <button class="tp-info" onclick="tpShowExFromSel('${selId}')" aria-label="Übung ansehen" title="Übung ansehen">ℹ️</button>
            </div>
          </div>
          <div id="${selId}-hist"></div>
        </div>`;
      }
    }
    html+='</div>';
    time+=slot.dauer;
  });
  const zielDauer=parseInt(document.getElementById("tp-dauer")?.value)||75; // H3
  const passt=time<=zielDauer;
  html+=`<div style="text-align:right;font-size:11px;font-weight:${passt?"400":"700"};color:${passt?"var(--text2)":"#dc2626"};margin-top:4px">Gesamt: ${time} von ${zielDauer} Min.${passt?"":" – zu lang!"}</div>`;
  wrap.innerHTML=html;
  tpPrognoseLoad(); // G3: erwartete Kinderzahl fürs gewählte Datum
  if(typeof zielUebungenHint==="function")zielUebungenHint(); // B: Übungen zu offenen Entwicklungszielen
}
/* G3: Anwesenheits-Prognose – erwartete Kinderzahl fürs gewählte Trainingsdatum aus den
   Zusagen (fix) plus historischer Anwesenheitsquote je Kind (für noch offene). */
async function tpPrognoseLoad(){
  const el=document.getElementById("tp-prognose"); if(!el)return;
  if(typeof pauseLoad==="function")await pauseLoad(); // C: Pausen berücksichtigen
  const datum=document.getElementById("tp-date")?.value;
  const dates=Object.keys(AW_DATA); const anyHist=dates.length>0;
  const rate={};
  KADER.forEach(k=>{ let tot=0,da=0; dates.forEach(d=>{const day=AW_DATA[d]; if(day&&(k.name in day)){tot++; if(day[k.name].da)da++;}}); rate[k.name]=tot?da/tot:0.7; });
  let rsvp={};
  if(datum){ try{ const tid=await terminIdForDatum(datum); if(tid){ const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${tid}&select=spieler_id,status`,{headers:sbAuthHeaders()}); if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(x=>rsvp[x.spieler_id]=x.status); } }catch(e){} }
  let exp=0, sure=0;
  KADER.forEach(k=>{
    if(typeof istPaused==="function"&&istPaused(k.name))return; // pausiert -> zählt 0
    const st=rsvp[k.id];
    if(st==="zugesagt"){exp+=1;sure++;}
    else if(st==="abgesagt"||st==="krank"){/* 0 */}
    else exp+=(anyHist?rate[k.name]:0.7);
  });
  el.innerHTML=`<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;background:var(--surface2);border:var(--border);border-radius:20px;padding:4px 12px">👥 ~${Math.round(exp)} Kinder erwartet${sure?` <span style="font-weight:400;color:var(--text2)">(${sure} fix)</span>`:""}</span>`;
}

function tpOnSelectChange(sel){
  const histDiv=document.getElementById(sel.id+"-hist");
  if(histDiv&&sel.value) histDiv.innerHTML=tpExerciseHistoryHtml(parseInt(sel.value));
  else if(histDiv) histDiv.innerHTML="";
  tpPlanSaveDebounced(); // Plan am Datum festhalten -> "Einheit bewerten" kennt ihn spaeter
}

function tpShowExFromSel(selId){
  const sel=document.getElementById(selId);
  if(sel&&sel.value) tpShowExercise(parseInt(sel.value));
}

function tpIndPlayerChange(slotIdx){
  const sel=document.getElementById("tp-ind-player-"+slotIdx);
  const reco=document.getElementById("tp-ind-reco-"+slotIdx);
  if(!sel||!reco)return;
  const name=sel.value;
  if(!name){reco.innerHTML="";return;}
  const allForms=tpAllForms();
  const indForms=allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="individual");
  const playerKey="adler_player_"+name;
  let vals={};
  try{vals=JSON.parse(localStorage.getItem(playerKey)||"{}");}catch(e){vals={};}
  if(!Object.keys(vals).length){
    reco.innerHTML='<div style="font-size:10px;color:var(--text3);padding:2px 0">Kein Spielerprofil vorhanden – alle Übungen verfügbar.</div>';
    return;
  }
  // v2: Defizite über die 16 f_-Kriterien (Skala 1–4; <=2 = Entwicklungsfeld)
  const deficits=[];
  const critLabels={f_ballkontrolle:"Ballkontrolle & Dribbling",f_pass:"Passspiel",f_abschluss:"Torabschluss",f_raum:"Raumverständnis",f_umschalt:"Umschalten & Pressing",f_laufweg:"Laufwege",f_defense:"Zweikampf & Verteidigen",f_tempo:"Tempo",f_koord:"Koordination",f_einsatz:"Laufbereitschaft",f_selbst:"Selbstvertrauen",f_team:"Kommunikation",f_resil:"Resilienz",f_coach:"Fokus"};
  Object.keys(critLabels).forEach(k=>{const s=vals[k]||0;if(s>0&&s<=2)deficits.push({key:k,label:critLabels[k],score:s});});

  const matched=[];
  indForms.forEach(x=>{
    if(x.f.deficit){
      const hit=deficits.find(d=>d.key===x.f.deficit);
      if(hit) matched.push({...x,deficit:hit});
    }
  });

  if(!deficits.length){
    reco.innerHTML='<div style="font-size:10px;color:#059669;padding:2px 0">✅ Keine auffälligen Defizite – freie Übungswahl!</div>';
    return;
  }

  let html='<div style="font-size:10px;color:var(--text2);padding:2px 0"><strong>Empfohlen für '+name+':</strong></div>';
  if(matched.length){
    matched.forEach(m=>{
      html+=`<div style="display:flex;align-items:center;gap:4px;padding:2px 0">
        <button onclick="document.getElementById('tp-form-${slotIdx}-0').value='${m.i}';tpOnSelectChange(document.getElementById('tp-form-${slotIdx}-0'))" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:2px 6px;font-size:10px;cursor:pointer;font-family:inherit">
          ⭐ ${m.f.name}</button>
        <span style="font-size:9px;color:var(--text3)">→ ${m.deficit.label} verbessern</span>
      </div>`;
    });
  } else {
    html+='<div style="font-size:10px;color:var(--text3)">Defizite: '+deficits.map(d=>d.label).join(", ")+'</div>';
  }
  reco.innerHTML=html;
}

function tpAddSlot(){
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const opts=[
    {label:"Hauptteil",dauer:20,farbe:"#1a56db",typ:"main",icon:"⚽"},
    {label:"Torwart-Training",dauer:15,farbe:"#854d0e",typ:"tw",icon:"🧤"},
    {label:"Individual-Training",dauer:15,farbe:"#0e7490",typ:"individual",icon:"🎯"},
    {label:"Aufwärmen",dauer:10,farbe:"#059669",typ:"warmup",icon:"🔥"},
    {label:"Abschlussspiel",dauer:15,farbe:"#c2410c",typ:"abschluss",icon:"🏆"}
  ];
  let btns=opts.map((o,i)=>`<button onclick="tpDoAddSlot(${i});this.closest('div[style*=fixed]').remove()" style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;border:var(--border-s);border-left:3px solid ${o.farbe};border-radius:var(--r);background:var(--surface);cursor:pointer;font-family:inherit;font-size:12px;text-align:left"><span style="font-size:18px">${o.icon}</span><div><strong>${o.label}</strong><br><span style="font-size:10px;color:var(--text2)">${o.dauer} Min.</span></div></button>`).join("");
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:320px;width:100%">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px">Phase hinzufügen</div>
    <div style="display:flex;flex-direction:column;gap:6px">${btns}</div>
  </div>`;
  document.body.appendChild(modal);
}
const TP_ADD_OPTS=[
  {label:"Hauptteil",dauer:20,farbe:"#1a56db",typ:"main"},
  {label:"Torwart-Training",dauer:15,farbe:"#854d0e",typ:"tw"},
  {label:"Individual-Training",dauer:15,farbe:"#0e7490",typ:"individual"},
  {label:"Aufwärmen",dauer:10,farbe:"#059669",typ:"warmup"},
  {label:"Abschlussspiel",dauer:15,farbe:"#c2410c",typ:"abschluss"}
];
function tpDoAddSlot(idx){
  const o=TP_ADD_OPTS[idx];
  tpSlots.push({...o});
  tpRenderTimeline();
}

function tpRemoveSlot(idx){
  tpSlots.splice(idx,1);
  tpRenderTimeline();
}

/* ═══════════════════════════════════
   PIN GATE
═══════════════════════════════════ */
const PIN_HASH="2c1f3f5f6523af84fde4af934caa1126ae6bcebacd36e397fbddcb8a620c1d73"; // SHA-256("1922") – PIN ist nur UI-Sichtschutz, echte Zugriffskontrolle: Supabase RLS (Block I)
const PIN_SESSION_KEY="adler_pin_ok";
const PIN_SESSION_TTL=30*24*60*60*1000; // 30 Tage (B7)
function pinSessionValid(){
  try{
    const raw=localStorage.getItem(PIN_SESSION_KEY);
    if(!raw)return false;
    const until=parseInt(raw);
    return !isNaN(until)&&Date.now()<until;
  }catch(e){return false;}
}
function pinSessionSet(){
  try{localStorage.setItem(PIN_SESSION_KEY,String(Date.now()+PIN_SESSION_TTL));}catch(e){}
}

async function hashPin(pin){
  const enc=new TextEncoder().encode(pin);
  const buf=await crypto.subtle.digest("SHA-256",enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function pinNext(el,next){
  if(el.value.length===1){
    const n=document.getElementById("pin"+next);
    if(n)n.focus();
    else pinCheck();
  }
}
function pinBack(e,prev){ // Backspace bei leerem Feld springt zurück statt hängenzubleiben
  if(e.key==="Backspace"&&e.target.value===""){
    const p=document.getElementById("pin"+prev);
    if(p){p.focus();p.value="";}
  }
}

async function pinCheck(){
  const pin=[1,2,3,4].map(i=>document.getElementById("pin"+i).value).join("");
  if(pin.length<4)return;
  const h=await hashPin(pin);
  if(h===PIN_HASH){
    pinSessionSet();
    document.getElementById("pin-gate").classList.add("hidden");
    document.getElementById("main-app").style.display="";
    ensureLogin(); // Block I
  } else {
    document.getElementById("pin-err").textContent="Falscher PIN – bitte erneut versuchen";
    [1,2,3,4].forEach(i=>{document.getElementById("pin"+i).value="";});
    document.getElementById("pin1").focus();
  }
}

(function(){
  const params=new URLSearchParams(window.location.search);
  // Eltern-Ansicht: öffentlicher Read-Only-Matchday, kein Login, kein Trainer-/Quiz-UI
  if(params.has("eltern")||params.has("match")){
    document.title="Spieltag – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    // Trainer-/Quiz-Oberfläche komplett aus dem DOM entfernen – Eltern sehen nur die Card
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    renderElternView(params.get("match")||"");
    setTimeout(pwaInstallNudge,1800); // Adoption: Hub aufs Handy holen
    return;
  }
  // Delegate-Modus: Eltern-Helfer übernimmt den Ticker am Platz (Capability-Token, keine Trainer-Rechte)
  if(params.has("delegate")){
    document.title="Ticker-Helfer – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    renderDelegateView(params.get("delegate"));
    return;
  }
  // Eltern-Portal (?portal): passwortloser OTP-Login → rollenbasiert (parent-Dashboard / Trainer-Hinweis)
  if(params.has("portal")){
    document.title="Eltern-Bereich – SV Adler Dellbrück U9";
    // Manifest/Icon/Theme setzt der Inline-Block im <head> von index.html (Timing!).
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    // UX 3: Deep-Link-Intent (?rsvp=<termin_id>) puffern und die URL SOFORT saeubern,
    // damit Reload/Re-Share den Flow nicht doppelt triggert. Feuert nach Auth im Dashboard.
    const rsvpId=params.get("rsvp");
    if(rsvpId&&/^\d+$/.test(rsvpId)){
      try{sessionStorage.setItem("adler_rsvp_intent",rsvpId);}catch(e){}
      try{history.replaceState({},"",location.pathname+"?portal");}catch(e){}
    }
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    renderElternPortal();
    setTimeout(pwaInstallNudge,1800); // UX 1: Soft-Install-Nudge für Eltern
    return;
  }
  // Read-only-Liveticker: Nur-Ansehen fuer alle Eltern (?ticker=<key>), kein Login, keine Eingabe
  if(params.has("ticker")){
    document.title="Liveticker – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    renderTickerView(params.get("ticker")||"");
    setTimeout(pwaInstallNudge,1800);
    return;
  }
  // Persönlicher Kind-Link (?kind=<token>): 1-Tap Zu-/Absage ohne Login (Capability-Token).
  if(params.has("kind")){
    document.title="Zu-/Absage – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    renderKindView(params.get("kind")||"");
    setTimeout(pwaInstallNudge,1800);
    return;
  }
  // F6: Vertretungs-Paket (?handover) – selbst-enthaltener Read-Only-Snapshot (Daten im #-Fragment), kein Login, kein Server.
  if(params.has("handover")){
    document.title="Vertretung – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    renderHandoverView();
    return;
  }
  // Digitales Stadionheft: Nur-Ansehen fuer alle Eltern (?heft), kein Login. Namen maskiert, Fotos nur bei Einwilligung.
  if(params.has("heft")){
    document.title="Adler Nest – SV Adler Dellbrück U9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#1e3a8a");
    document.getElementById("pin-gate")?.remove();
    document.getElementById("main-app")?.remove();
    if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
    renderStadionheftView();
    setTimeout(pwaInstallNudge,1800);
    return;
  }
  const isQuizMode=params.has("quiz");
  if(isQuizMode){
    document.title="Taktik-Quiz U9 I – SV Adler Dellbrück";
    // Das Quiz ist keine eigene App mehr – die Kinder kommen ueber die Kabine im
    // Eltern-Zugang hierher. Das Manifest entfernt der Inline-Block im <head>.
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#059669");
    document.getElementById("pin-gate").classList.add("hidden");
    document.getElementById("main-app").style.display="";
    document.body.classList.add("quiz-extern");
    document.querySelectorAll("#main-nav,.view").forEach(el=>el.style.display="none");
    document.getElementById("view-taktik").style.display="";
    window.savePlayer=()=>{};window.delPlayer=()=>{};window.delSnapshot=()=>{};
    const qMode=params.get("mode"); if(qMode)window._quizMode=qMode; // direkt ins Taktik-/Wissens-Quiz
    if(params.get("from")==="kabine"){ // sichtbarer Rückweg für die Kinder
      const back=document.createElement("button");
      back.id="quiz-back"; back.type="button"; back.textContent="← Zurück zur Kabine";
      // Zurueck in den KINDER-Modus, nicht ins Eltern-Dashboard: das Flag ueberlebt das
      // replaceState der ?portal-Route, elternDashLoad oeffnet danach direkt die Kabine.
      back.onclick=()=>{try{sessionStorage.setItem("adler_open_kabine","1");}catch(e){} location.href=location.pathname+"?portal";};
      back.style.cssText="position:fixed;bottom:12px;left:12px;z-index:9990;padding:10px 14px;border:none;border-radius:12px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)";
      document.body.appendChild(back);
    }
    // Erst klaeren, WER spielt (eigenes Kind aus der Eltern-Sitzung / gemerkter Name).
    // Nur wenn das misslingt, erscheint ueberhaupt eine Namensauswahl.
    setTimeout(async()=>{
      let steht=false;
      try{ steht=await tqInitPlayer(); }catch(e){}
      if(!steht)tqStart();
    },100);
    setTimeout(()=>{if(typeof kidsIntroMaybe==="function")kidsIntroMaybe();},250); // einmalige Federn/Karten-Erklärung
    setTimeout(pwaInstallNudge,1800); // UX 1: Soft-Install-Nudge für die Kids
    return;
  }
  if(pinSessionValid()){
    document.getElementById("pin-gate").classList.add("hidden");
    document.getElementById("main-app").style.display="";
    ensureLogin(); // Block I
  }
})();

/* ═══════════════════════════════════
   TRAININGS-BEWERTUNG
═══════════════════════════════════ */
const EVAL_KEY="adler_training_eval";
let EVAL_DATA={};
try{EVAL_DATA=JSON.parse(localStorage.getItem(EVAL_KEY)||"{}");}catch(e){EVAL_DATA={};}

/* ═══════════════════════════════════
   PHASE 7-C: TEAM-DIAGNOSE (Data-Driven Trainingsplanung)
   Aggregiert die 14 trainierbaren f_-Kriterien ueber alle bewerteten Spieler,
   findet die schwaechste Team-Metrik und schlaegt passende Uebungen vor
   (deficit-Tags). Wiederverwendung derselben Logik wie die Einzel-Empfehlung.
═══════════════════════════════════ */
const DIAG_LABELS={f_ballkontrolle:"Ballkontrolle & Dribbling",f_pass:"Passspiel",f_abschluss:"Torabschluss",f_raum:"Raumverständnis",f_umschalt:"Umschalten & Pressing",f_laufweg:"Laufwege",f_defense:"Zweikampf & Verteidigen",f_tempo:"Tempo",f_koord:"Koordination",f_einsatz:"Laufbereitschaft",f_selbst:"Selbstvertrauen",f_team:"Kommunikation",f_resil:"Resilienz",f_coach:"Fokus"};
function teamDiagnose(){
  const keys=Object.keys(DIAG_LABELS);
  const sum={},cnt={};
  let players=0;
  Object.keys(DB).forEach(name=>{
    const snaps=DB[name]; if(!snaps||!snaps.length)return;
    const lat=snaps[snaps.length-1];
    const v=typeof lat.radios==="string"?safeParse(lat.radios,{}):(lat.radios||{});
    let counted=false;
    keys.forEach(k=>{const val=v[k];if(val){sum[k]=(sum[k]||0)+((val-1)/3)*100;cnt[k]=(cnt[k]||0)+1;counted=true;}});
    if(counted)players++;
  });
  const means=keys.filter(k=>cnt[k]).map(k=>({key:k,label:DIAG_LABELS[k],mean:Math.round(sum[k]/cnt[k]),n:cnt[k]}));
  means.sort((a,b)=>a.mean-b.mean);
  return {players,weakest:means};
}
function renderTeamDiagnose(){
  const box=document.getElementById("tp-diagnose");
  if(!box)return;
  const {players,weakest}=teamDiagnose();
  if(players<2){box.innerHTML="";return;} // erst ab 2 bewerteten Spielern aussagekräftig
  const allForms=tpAllForms();
  const top=weakest[0];
  const reco=allForms.map((f,i)=>({i,f})).filter(x=>x.f.deficit===top.key);
  const chip=(m)=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:var(--surface);border:var(--border-s);border-radius:var(--r);margin-top:6px">
    <div style="font-size:12px"><strong>${esc(m.f.name)}</strong> <span style="font-size:10px;color:var(--text3)">${m.f.dauer||""}</span></div>
    <button class="btn btn-sm" onclick="tpAddRecoExercise(${m.i})"><i class="ti ti-plus"></i>In Plan</button>
  </div>`;
  box.innerHTML=`<div style="background:linear-gradient(135deg,#eff6ff,#f0fdfa);border:1px solid #bfdbfe;border-radius:var(--rl);padding:12px 14px;margin-bottom:12px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1e40af"><i class="ti ti-target-arrow" style="font-size:13px"></i> Team-Diagnose <span style="font-weight:400;color:var(--text3);text-transform:none;letter-spacing:0">· ${players} bewertete Spieler</span></div>
    <div style="font-size:14px;font-weight:700;margin:6px 0 2px">Schwerpunkt heute: ${esc(top.label)} <span style="font-size:12px;color:#dc2626">Ø ${top.mean}%</span></div>
    <div style="font-size:11px;color:var(--text2)">Danach: ${weakest.slice(1,3).map(w=>`${esc(w.label)} (${w.mean}%)`).join(" · ")||"–"}</div>
    ${reco.length?`<div style="margin-top:8px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:2px">Passende Übungen</div>${reco.slice(0,4).map(chip).join("")}</div>`
      :`<div style="font-size:11px;color:var(--text3);margin-top:8px">Keine getaggte Übung für „${esc(top.label)}" – im Formen-Tab passende Form wählen.</div>`}
  </div>`;
}
// Empfohlene Uebung in eine kompatible Planer-Station uebernehmen (nur wo sie als Option existiert).
function tpAddRecoExercise(formIdx){
  const sels=[...document.querySelectorAll(".tp-form-sel")];
  // bevorzugt eine leere Station, in deren Dropdown die Uebung vorkommt
  let target=sels.find(s=>!s.value&&[...s.options].some(o=>o.value===String(formIdx)))
          ||sels.find(s=>[...s.options].some(o=>o.value===String(formIdx)));
  if(!target){toast("Erst eine passende Phase (z. B. Individual/Hauptteil) hinzufügen","err");return;}
  target.value=String(formIdx);
  tpOnSelectChange(target);
  target.scrollIntoView({behavior:"smooth",block:"center"});
  toast("Übung in den Plan übernommen ✓");
}

function addEvalSection(){
  const sub=document.getElementById("train-sub-planung");
  if(!sub)return;
  let existing=document.getElementById("tp-eval-section");
  if(existing){evalRenderList();return;}
  const sec=document.createElement("div");
  sec.id="tp-eval-section";
  sec.style.marginTop="20px";
  sec.innerHTML=`
    <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:10px 0 6px">Nachbewertung der Einheit</div>
    <div id="tp-eval-list"></div>
    <button class="btn btn-sm" style="margin-top:8px" onclick="evalSave()"><i class="ti ti-device-floppy"></i>Nachbewertung speichern</button>
    <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:16px 0 6px">Bisherige Bewertungen</div>
    <div id="tp-eval-history"></div>
  `;
  sub.appendChild(sec);
  evalRenderList();
  evalRenderHistory();
}

/* Der geplante Zeitplan als Datenstruktur – frueher nur inline in evalRenderList.
   Wird auch von tpPlanSave() gebraucht, damit "Einheit bewerten" spaeter weiss,
   welche Uebungen an einem vergangenen Termin geplant waren. */
function tpPlanEntries(){
  const allForms=tpAllForms();
  const trainers=tpGetCheckedTrainers();
  const entries=[];
  document.querySelectorAll(".tp-form-sel").forEach(s=>{
    if(!s.value)return;
    const match=s.id.match(/tp-form-(\d+)-(\d+)/);
    if(!match)return;
    const slotIdx=parseInt(match[1]);
    const groupIdx=parseInt(match[2]);
    const slot=tpSlots[slotIdx];
    const typ=slot?.typ||"main";
    const noGrp=typ==="warmup"||typ==="abschluss"||typ==="tw";
    // tpCoaches wurde bisher nur GESCHRIEBEN: das Dropdown "Trainer für diese Station"
    // hatte keinerlei Wirkung. Jetzt entscheidet es, wem die Übung zugerechnet wird
    // (Trainer-Statistik und "Einheit bewerten"). Fällt auf den Gruppen-Trainer zurück.
    const trainer=noGrp?"Alle":(tpCoaches[s.id]||trainers[groupIdx]||`Trainer ${groupIdx+1}`);
    const formIdx=parseInt(s.value);
    const formName=allForms[formIdx]?.name||"?";
    entries.push({formIdx,formName,trainer,slotLabel:slot?.label||"",key:`${formIdx}-${trainer}`});
  });
  return entries;
}
/* Plan pro Datum sichern (debounced). Ohne Trainer-Token still ueberspringen –
   der Plan ist trainer-only und darf offline nicht die Queue verstopfen. */
let _tpPlanTimer=null;
function tpPlanSaveDebounced(){ clearTimeout(_tpPlanTimer); _tpPlanTimer=setTimeout(tpPlanSave,1200); }
async function tpPlanSave(){
  if(!sbToken())return;
  const datum=document.getElementById("tp-date")?.value; if(!datum)return;
  const plan=tpPlanEntries(); if(!plan.length)return; // leeren Plan nie ueber einen vollen schreiben
  try{
    await fetch(`${SB_URL}/rest/v1/trainingsplan?on_conflict=datum`,{method:"POST",
      headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({datum,plan,updated_at:new Date().toISOString()})});
  }catch(e){/* Plan ist Komfort, kein Muss */}
}
async function tpPlanLoad(datum){
  if(!sbToken())return [];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainingsplan?datum=eq.${encodeURIComponent(datum)}&select=plan`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return [];
    const rows=await r.json();
    return (rows[0]&&rows[0].plan)||[];
  }catch(e){return [];}
}

/* ═══════════════════════════════════
   F5: TRAININGS-STATIONSTIMER – die Plan-Stationen (tpSlots) am Platz mit
   Countdown + Pfiff durchlaufen. Reines Frontend, kein Server.
═══════════════════════════════════ */
let _stT={ix:0,left:0,timer:null,stations:[],paused:false};
// Stationen aus dem aktuellen Zeitplan: Label + Dauer je Slot, plus die gewählten Übungen.
function stTimerStations(){
  return tpSlots.map((slot,si)=>{
    const forms=[...document.querySelectorAll(`.tp-form-sel[id^="tp-form-${si}-"]`)]
      .map(s=>(s.value&&s.selectedOptions[0])?s.selectedOptions[0].textContent.replace(/\s*\([^)]*\)\s*$/,"").trim():"")
      .filter(Boolean);
    return {label:slot.label||("Station "+(si+1)),dauer:Math.max(1,slot.dauer||10),farbe:slot.farbe||"#1a56db",forms:[...new Set(forms)]};
  });
}
function stTimerStart(){
  const st=stTimerStations();
  if(!st.length){toast("Kein Plan vorhanden – erst Stationen anlegen (Auto-Plan)","err");return;}
  _stT={ix:0,left:st[0].dauer*60,timer:null,stations:st,paused:false};
  document.getElementById("st-timer")?.remove();
  const ov=document.createElement("div"); ov.id="st-timer";
  ov.style.cssText="position:fixed;inset:0;background:#0b1220;color:#fff;z-index:11000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;font-family:inherit";
  document.body.appendChild(ov);
  stTimerRender();
  _stT.timer=setInterval(stTimerTick,1000);
  try{if(typeof requestWakeLock==="function")requestWakeLock();}catch(e){}
}
function stTimerTick(){
  if(_stT.paused)return;
  _stT.left--;
  if(_stT.left<=0){
    stTimerWhistle();
    if(_stT.ix>=_stT.stations.length-1){ stTimerRender(true); if(_stT.timer){clearInterval(_stT.timer);_stT.timer=null;} return; }
    _stT.ix++; _stT.left=_stT.stations[_stT.ix].dauer*60;
  }
  stTimerRender();
}
function stTimerWhistle(){ try{if(typeof rotBeep==="function"){rotBeep();setTimeout(rotBeep,260);}}catch(e){} try{navigator.vibrate&&navigator.vibrate([120,80,120]);}catch(e){} }
function stTimerNext(){
  if(!_stT.stations.length)return; stTimerWhistle();
  if(_stT.ix>=_stT.stations.length-1){ stTimerRender(true); if(_stT.timer){clearInterval(_stT.timer);_stT.timer=null;} return; }
  _stT.ix++; _stT.left=_stT.stations[_stT.ix].dauer*60; stTimerRender();
}
function stTimerPause(){ _stT.paused=!_stT.paused; stTimerRender(); }
function stTimerStop(){ if(_stT.timer){clearInterval(_stT.timer);_stT.timer=null;} document.getElementById("st-timer")?.remove(); try{if(typeof releaseWakeLock==="function")releaseWakeLock();}catch(e){} }
function stTimerRender(done){
  const ov=document.getElementById("st-timer"); if(!ov)return;
  if(done){
    ov.innerHTML=`<div style="font-size:60px">🎉</div><div style="font-size:26px;font-weight:800;margin:12px 0">Training geschafft!</div>
      <button onclick="stTimerStop()" style="margin-top:20px;padding:14px 28px;border:none;border-radius:12px;background:#16a34a;color:#fff;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer">Fertig</button>`;
    return;
  }
  const s=_stT.stations[_stT.ix]||{}, next=_stT.stations[_stT.ix+1];
  const mm=Math.floor(Math.max(0,_stT.left)/60), ss=Math.max(0,_stT.left)%60, clock=mm+":"+(ss<10?"0":"")+ss;
  const warn=_stT.left<=10;
  ov.innerHTML=`
    <div style="font-size:13px;letter-spacing:1px;color:#94a3b8;text-transform:uppercase">Station ${_stT.ix+1}/${_stT.stations.length}${_stT.paused?" · ⏸ Pause":""}</div>
    <div style="font-size:26px;font-weight:800;margin:8px 0;color:${s.farbe||"#60a5fa"}">${esc(s.label||"")}</div>
    ${s.forms&&s.forms.length?`<div style="font-size:16px;color:#e2e8f0;margin-bottom:6px;max-width:520px">${s.forms.map(esc).join(" · ")}</div>`:""}
    <div style="font-size:84px;font-weight:900;line-height:1;margin:10px 0;color:${warn?"#f87171":"#fff"}">${clock}</div>
    ${next?`<div style="font-size:14px;color:#94a3b8;max-width:520px">Als Nächstes: ${esc(next.label)}${next.forms&&next.forms.length?" – "+esc(next.forms.join(", ")):""}</div>`:'<div style="font-size:14px;color:#94a3b8">Letzte Station</div>'}
    <div style="display:flex;gap:10px;margin-top:26px;flex-wrap:wrap;justify-content:center">
      <button onclick="stTimerPause()" style="padding:14px 22px;border:none;border-radius:12px;background:#334155;color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer">${_stT.paused?"▶️ Weiter":"⏸ Pause"}</button>
      <button onclick="stTimerNext()" style="padding:14px 22px;border:none;border-radius:12px;background:#1a56db;color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer">⏭ Nächste</button>
      <button onclick="stTimerStop()" style="padding:14px 22px;border:1px solid #475569;border-radius:12px;background:transparent;color:#cbd5e1;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer">✕ Beenden</button>
    </div>`;
}

function evalRenderList(){
  const wrap=document.getElementById("tp-eval-list");
  if(!wrap)return;
  const entries=tpPlanEntries();
  if(!entries.length){
    wrap.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Erst Übungen im Zeitplan zuweisen, dann hier bewerten. Tipp: "Auto-Plan" generiert einen Vorschlag.</div>';
    return;
  }
  const dims=[{key:"durchfuehrung",label:"Durchführung"},{key:"spass",label:"Spaßfaktor Kinder"},{key:"umsetzung",label:"Anforderung umgesetzt"}];
  let html='';
  entries.forEach((f,fi)=>{
    const trainerBadge=f.trainer!=="Alle"?`<span style="display:inline-block;background:#e0e7ff;color:#3730a3;font-size:9px;padding:1px 6px;border-radius:4px;margin-left:6px">${f.trainer}</span>`:"";
    html+=`<div class="tb-eval" data-trainer="${f.trainer}" data-form-idx="${f.formIdx}"><div class="tb-eval-head">${f.formName}${trainerBadge}</div>`;
    dims.forEach(d=>{
      html+=`<div class="tb-eval-row"><span class="tb-eval-label">${d.label}</span><div class="tb-eval-stars">`;
      for(let s=1;s<=5;s++){
        html+=`<button class="tb-eval-star" data-form="${fi}" data-dim="${d.key}" data-val="${s}" onclick="evalStar(this)">☆</button>`;
      }
      html+=`</div></div>`;
    });
    html+=`<div class="mg" style="margin-top:6px"><textarea rows="1" placeholder="Notiz..." style="resize:none;font-size:11px" id="eval-note-${fi}"></textarea></div>`;
    html+='</div>';
  });
  wrap.innerHTML=html;
}

function evalStar(btn){
  const stars=btn.parentElement.querySelectorAll(".tb-eval-star");
  const val=parseInt(btn.dataset.val);
  const current=Array.from(stars).filter(s=>s.classList.contains("on")).length;
  const newVal=current===val?0:val;
  stars.forEach((s,i)=>{
    s.classList.toggle("on",i<newVal);
    s.textContent=i<newVal?"★":"☆";
  });
}

function evalSave(){
  const datum=document.getElementById("tp-date").value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  const evals=[];
  document.querySelectorAll(".tb-eval").forEach((block,fi)=>{
    const entry={name:block.querySelector(".tb-eval-head").textContent.replace(new RegExp(TRAINER.join("|"),"g"),"").trim()};
    entry.trainer=block.dataset.trainer||"";
    entry.formIdx=parseInt(block.dataset.formIdx)||0;
    block.querySelectorAll(".tb-eval-row").forEach(row=>{
      const stars=row.querySelectorAll(".tb-eval-star.on");
      const label=row.querySelector(".tb-eval-label").textContent;
      entry[label]=stars.length;
    });
    const note=document.getElementById("eval-note-"+fi);
    entry.notiz=note?note.value:"";
    evals.push(entry);
  });
  if(!evals.length){toast("Erst Übungen im Zeitplan zuweisen, dann bewerten.","err");return;}
  EVAL_DATA[datum]=evals;
  localStorage.setItem(EVAL_KEY,JSON.stringify(EVAL_DATA));
  teamTsSet(EVAL_TS_KEY,datum); // G1
  teamSyncUpsertDebounced("trainings_eval",datum,evals); // G1 local-first + Schritt-6-Debounce
  const sels=document.querySelectorAll(".tp-form-sel");
  const loggedForms=[];
  sels.forEach(s=>{if(s.value)loggedForms.push(parseInt(s.value));});
  if(loggedForms.length){tpExerciseLog[datum]=[...new Set(loggedForms)];localStorage.setItem("adler_exercise_log",JSON.stringify(tpExerciseLog));}
  const twChecks=document.querySelectorAll(".tp-tw-player:checked");
  if(twChecks.length){
    const twLog=JSON.parse(localStorage.getItem("adler_tw_log")||"{}");
    const twPlayers=Array.from(twChecks).map(c=>c.value);
    if(!twLog[datum])twLog[datum]=[];
    twLog[datum]=twPlayers;
    localStorage.setItem("adler_tw_log",JSON.stringify(twLog));
  }
  evalRenderHistory();
  toast("Bewertung gespeichert ✓");
}

function evalRenderHistory(){
  const wrap=document.getElementById("tp-eval-history");
  if(!wrap)return;
  const dates=Object.keys(EVAL_DATA).sort().reverse();
  if(!dates.length){wrap.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Noch keine Bewertungen</div>';return;}
  let html='';
  dates.slice(0,10).forEach(d=>{
    const items=EVAL_DATA[d];
    html+=`<div class="card" style="padding:10px;margin-bottom:6px">`;
    html+=`<div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:4px">${new Date(d).toLocaleDateString("de-DE")}</div>`;
    items.forEach(it=>{
      const stars=k=>it[k]?"★".repeat(it[k])+"☆".repeat(5-it[k]):"–";
      const trainerTag=it.trainer&&it.trainer!=="Alle"?` <span style="background:#e0e7ff;color:#3730a3;font-size:9px;padding:1px 4px;border-radius:3px">${it.trainer}</span>`:"";
      html+=`<div style="font-size:11px;padding:2px 0;color:var(--text2)">
        <strong style="color:var(--text)">${it.name}</strong>${trainerTag}:
        ${it.skipped?'<em style="color:var(--text3)">übersprungen</em>':`Durchf. ${stars("Durchführung")} · Spaß ${stars("Spaßfaktor Kinder")} · Umgesetzt ${stars("Anforderung umgesetzt")}`}
        ${it.notiz?`<br><em>${it.notiz}</em>`:""}
      </div>`;
    });
    html+='</div>';
  });
  wrap.innerHTML=html;
}

/* ═══════════════════════════════════
   AUTO-TRAININGSVORSCHLAG
═══════════════════════════════════ */
function tpGenerate(){
  const trainerCount=tpGetTrainerCount();
  if(trainerCount<1){toast("Mindestens 1 Trainer auswählen","err");return;}
  const slots=[{...TP_PHASEN[0]}];
  if(trainerCount>=2) slots.push({label:"Torwart-Training",dauer:15,farbe:"#854d0e",typ:"tw"});
  slots.push({...TP_PHASEN[1]});
  if(trainerCount>=3) slots.push({label:"Individual-Training",dauer:15,farbe:"#0e7490",typ:"individual"});
  slots.push({...TP_PHASEN[2]});
  slots.push({...TP_PHASEN[3]});
  tpSlots=slots;
  tpRenderTimeline();

  setTimeout(()=>{
    const allForms=tpAllForms();
    const warmups=allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="aufwaermen");
    const main=allForms.map((f,i)=>({i,f})).filter(x=>!["aufwaermen","torwart","individual"].includes(x.f.kat)&&!x.f.custom);
    const tw=allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="torwart");
    const ind=allForms.map((f,i)=>({i,f})).filter(x=>x.f.kat==="individual");

    const pick=(arr)=>arr.length?arr[Math.floor(Math.random()*arr.length)]:null;
    const used=new Set();
    const pickUnique=(arr)=>{
      const avail=arr.filter(x=>!used.has(x.i));
      if(!avail.length)return pick(arr);
      const p=pick(avail);
      if(p)used.add(p.i);
      return p;
    };

    tpSlots.forEach((slot,si)=>{
      const typ=slot.typ||"main";
      if(typ==="abschluss")return;
      const noGroups=typ==="warmup"||typ==="abschluss"||typ==="tw";
      const parallelSlots=noGroups?1:Math.min(trainerCount,5);
      for(let p=0;p<parallelSlots;p++){
        const sel=document.getElementById(`tp-form-${si}-${p}`);
        if(!sel)continue;
        let choice=null;
        if(typ==="warmup") choice=pickUnique(warmups);
        else if(typ==="tw") choice=pickUnique(tw);
        else if(typ==="individual") choice=pickUnique(ind);
        else choice=pickUnique(main);
        if(choice){sel.value=choice.i;tpOnSelectChange(sel);}
      }
    });
    tpRenderTeamFokus(); // Team-Trainingsgenerator: schwächster Mannschaftswert -> Übungen
    tpRenderMindsetTip(); // E3: Mindset-Baustein des Tages
    setTimeout(()=>addEvalSection(),50);
  },100);
}

// E3: schlägt zufällig eine der drei Ritual-Formen als festen Baustein der Einheit vor
// Team-Aggregat: Durchschnitt jeder Dimension über alle bewerteten Spieler
function teamAggregate(){
  const dimKeys=["tech","raute","phys","mental","entw"];
  const sums={},counts={};
  dimKeys.forEach(k=>{sums[k]=0;counts[k]=0;});
  Object.keys(DB).forEach(n=>{
    const pd=getPlayerData(n);
    if(!pd)return;
    dimKeys.forEach(k=>{if(pd.ds[k]!=null){sums[k]+=pd.ds[k];counts[k]++;}});
  });
  const avg={},n=Object.keys(DB).length;
  dimKeys.forEach(k=>{avg[k]=counts[k]?Math.round(sums[k]/counts[k]):null;});
  return{avg,spielerzahl:counts.tech||0};
}

// Team-Trainingsgenerator: schwächster Mannschaftswert -> passende Übungen aus der Datenbank
function tpRenderTeamFokus(){
  const{avg,spielerzahl}=teamAggregate();
  let box=document.getElementById("tp-team-fokus");
  if(!box){
    box=document.createElement("div");
    box.id="tp-team-fokus";
    const timeline=document.getElementById("tp-timeline");
    if(!timeline)return;
    timeline.insertAdjacentElement("afterend",box);
  }
  if(spielerzahl<3){box.innerHTML="";return;} // zu wenig Daten für ein sinnvolles Team-Bild
  const dimLabel={tech:"Technik & Ball",raute:"Rauten-IQ & Taktik",phys:"Physis & Motorik",mental:"Mentalität & Charakter",entw:"Entwicklungspotenzial"};
  // Dimension -> passende Übungs-Kategorien
  const dimKat={tech:["technik","passspiel"],raute:["raute","pressing","wahrnehmung"],phys:["aufwaermen","individual","spass"],mental:["mindset"],entw:["wahrnehmung","mindset"]};
  const sorted=Object.entries(avg).filter(([,val])=>val!=null).sort((a,b)=>a[1]-b[1]);
  if(!sorted.length){box.innerHTML="";return;}
  const[schwach,schwachVal]=sorted[0];
  const kats=dimKat[schwach]||[];
  const allForms=tpAllForms();
  // Passende Formen: Fokus-Formen bevorzugt, max. 3
  const passende=allForms.map((f,i)=>({i,f})).filter(x=>kats.includes(x.f.kat));
  const gewaehlt=passende.filter(x=>x.f.focus).concat(passende.filter(x=>!x.f.focus)).slice(0,3);
  box.innerHTML=`<div style="margin-top:10px;padding:10px 12px;background:var(--blue-bg);border:1px solid #93c5fd;border-radius:var(--rl)">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1e40af;margin-bottom:4px">📊 Team-Schwerpunkt (aus ${spielerzahl} Bewertungen)</div>
    <div style="font-size:12.5px;color:var(--text);margin-bottom:6px">Schwächster Mannschaftswert: <strong>${dimLabel[schwach]}</strong> (Ø ${schwachVal}%). Passende Übungen:</div>
    ${gewaehlt.length?gewaehlt.map(x=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><button class="btn btn-sm" onclick="tpShowExercise(${x.i})"><i class="ti ti-eye"></i></button><span style="font-size:12px;color:var(--text)">${esc(x.f.name)}</span></div>`).join(""):'<div style="font-size:11px;color:var(--text3)">Keine passende Form gefunden.</div>'}
  </div>`;
}

// Auto-Trainingsplan: aus Monats-Schwerpunkt (Periodisierung) + schwächstem Team-Wert +
// Bibliothek einen kompletten Ablauf bauen (Aufwärmen → Schwerpunkt → Team-Schwäche → Abschluss).
// Reiner Vorschlag – keine Persistenz, „neu würfeln" mischt neu. Läuft im Trainer-Tab.
const AUTOPLAN_DIMKAT={tech:["technik","passspiel"],raute:["raute","pressing","wahrnehmung"],phys:["aufwaermen","individual","spass"],mental:["mindset"],entw:["wahrnehmung","mindset"]};
const AUTOPLAN_DIMLABEL={tech:"Technik & Ball",raute:"Rauten-IQ & Taktik",phys:"Physis & Motorik",mental:"Mentalität & Charakter",entw:"Entwicklung"};
function autoPlanPick(kats,used){
  const forms=tpAllForms().map((f,i)=>({i,f})).filter(x=>x.f&&kats.includes(x.f.kat)&&!used.has(x.i));
  if(!forms.length)return null;
  const focus=forms.filter(x=>x.f.focus), base=focus.length?focus:forms;
  // Vielfalt: frische Übungen (nie oder >14 Tage nicht genutzt) bevorzugen
  const fresh=base.filter(x=>{const d=tpLastUsedDays(x.i);return d===null||d>=14;});
  const pool=fresh.length?fresh:base;
  const pick=pool[Math.floor(Math.random()*pool.length)];
  used.add(pick.i);
  return pick;
}
async function autoPlanBuild(){
  const box=document.getElementById("autoplan-box"); if(!box)return;
  box.innerHTML=`<div style="padding:10px;color:var(--text3);font-size:12px">🪄 Baue Trainings-Ablauf…</div>`;
  // Monats-Schwerpunkt aus der Periodisierung
  const monat=new Date().toISOString().slice(0,7); let period=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/periodisierung?monat=eq.${monat}&select=*`,{headers:sbAuthHeaders()});if(r.ok)period=(await r.json())[0];}catch(e){}
  const periodKat=period&&period.kategorie?period.kategorie:null;
  // schwächster Team-Wert
  let weakKats=[], weakLabel=null;
  try{
    const agg=teamAggregate()||{}, avg=agg.avg||{};
    const sorted=Object.entries(avg).filter(([,v])=>v!=null).sort((a,b)=>a[1]-b[1]);
    if(sorted.length){ weakLabel=AUTOPLAN_DIMLABEL[sorted[0][0]]||null; weakKats=AUTOPLAN_DIMKAT[sorted[0][0]]||[]; }
  }catch(e){}
  const used=new Set(), blocks=[];
  const warm=autoPlanPick(["aufwaermen"],used); if(warm)blocks.push({label:"Aufwärmen & Aktivierung",min:10,pick:warm,tag:"🔥"});
  if(periodKat){ const sp=autoPlanPick([periodKat],used); if(sp)blocks.push({label:"Monats-Schwerpunkt"+(period.thema?": "+period.thema:""),min:20,pick:sp,tag:"🎯"}); }
  if(weakKats.length){ const wk=autoPlanPick(weakKats,used); if(wk)blocks.push({label:"Team-Schwäche"+(weakLabel?": "+weakLabel:""),min:15,pick:wk,tag:"📊"}); }
  if(blocks.length<3){ const fill=autoPlanPick(["technik","passspiel","wahrnehmung"],used); if(fill)blocks.push({label:"Haupt-Block",min:20,pick:fill,tag:"⚽"}); }
  const fin=autoPlanPick(["spass"],used); if(fin)blocks.push({label:"Abschlussspiel",min:15,pick:fin,tag:"🏆"});
  if(!blocks.length){ box.innerHTML=`<div style="padding:10px;color:var(--text3);font-size:12px">Keine passenden Übungen gefunden.</div>`; return; }
  const total=blocks.reduce((s,b)=>s+b.min,0);
  box.innerHTML=`<div class="card" style="padding:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:12px;font-weight:800;color:var(--text)">🪄 Auto-Trainingsplan <span style="font-weight:600;color:var(--text3)">· ~${total} Min</span></div>
      <button class="btn btn-sm" onclick="autoPlanBuild()"><i class="ti ti-refresh"></i>Neu würfeln</button>
    </div>
    ${blocks.map((b,n)=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;${n<blocks.length-1?"border-bottom:var(--border)":""}">
      <div style="font-size:18px;width:24px;text-align:center">${b.tag}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text3)">${esc(b.label)} · ${b.min} Min</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(b.pick.f.name)} <span style="font-size:10px;font-weight:600">${autoPlanFreshHint(b.pick.i)}</span></div>
      </div>
      <button class="btn btn-sm" onclick="tpShowExercise(${b.pick.i})"><i class="ti ti-eye"></i></button>
    </div>`).join("")}
    <div style="font-size:10px;color:var(--text3);margin-top:8px">Vorschlag aus Monats-Schwerpunkt + Team-Daten. Alles anpassbar – „neu würfeln\" für Alternativen.</div>
  </div>`;
}
function tpRenderMindsetTip(){
  const allForms=tpAllForms();
  const rituale=["Die Kraft des NOCH","Reset-Knopf","Drei-gute-Dinge-Kreis"];
  const kandidaten=allForms.map((f,i)=>({i,f})).filter(x=>rituale.includes(x.f.name));
  if(!kandidaten.length)return;
  const wahl=kandidaten[Math.floor(Math.random()*kandidaten.length)];
  let box=document.getElementById("tp-mindset-tip");
  if(!box){
    box=document.createElement("div");
    box.id="tp-mindset-tip";
    const timeline=document.getElementById("tp-timeline");
    if(!timeline)return;
    timeline.insertAdjacentElement("afterend",box);
  }
  box.innerHTML=`<div style="margin-top:10px;padding:10px 12px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:var(--rl)">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#047857;margin-bottom:4px">🧠 Mindset-Baustein des Tages</div>
    <div style="font-size:12.5px;font-weight:600;color:var(--text)">${esc(wahl.f.name)}</div>
    <div style="font-size:11px;color:var(--text2);margin:2px 0 6px">${esc(wahl.f.kurz||"")}</div>
    <button class="btn btn-sm" onclick="tpShowExercise(${wahl.i})"><i class="ti ti-eye"></i>Form ansehen</button>
  </div>`;
}

/* ═══════════════════════════════════
   PWA SETUP
═══════════════════════════════════ */
(function(){
  // Auto-Update: Der SW liefert cache-first (Seite hängt sonst eine Version hinterher).
  // Sobald ein neuer SW übernimmt, einmal automatisch neu laden – danach ist alles aktuell.
  if("serviceWorker" in navigator){
    let swReloaded=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(swReloaded)return;
      swReloaded=true;
      if(performance.now()<60000){location.reload();}
      else if(typeof toast==="function"){toast("Neue Version verfügbar – App einmal neu laden");}
    });
  }
  // Quiz-Modus: Manifest/Icon kommen aus der Quiz-IIFE – hier nicht überschreiben (B1)
  if(new URLSearchParams(location.search).has("quiz")){
    if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
    return;
  }
  // Manifest + Apple-Icon kommen statisch aus dem <head> (manifest-trainer.json mit
  // eindeutiger id "adler-u9-trainer" – getrennt installierbar von der Quiz-App)

  // Register Service Worker for offline support
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }

  // Der Install-Hinweis lebt in core.js (pwaInstallNudge/pwaBannerShow): er kennt den
  // Kontext, benennt die richtige App und meldet sich pro App nur einmal. Der frueher
  // hier stehende zweite Banner war kontextblind – er haette im Eltern-Bereich und im
  // Kinder-Quiz die Trainer-App angeboten – und lief als zweiter
  // beforeinstallprompt-Listener parallel. Ersatzlos entfernt.
})();

/* A11y: Icon-only-Buttons (×, ✕, 🗑, Pfeile) bekommen automatisch einen barrierefreien
   Namen, falls keiner gesetzt ist. Screenreader lasen sonst „mal-Zeichen“ oder nichts.
   Eine Stelle deckt ALLE per innerHTML erzeugten Modals ab – heute + kuenftig –, statt
   verstreuter aria-labels. childList/subtree-Observer -> setAttribute loest keine
   attribute-Mutation aus, also keine Schleife. */
(function a11yIconButtons(){
  const MAP={"×":"Schließen","✕":"Entfernen","🗑":"Löschen","🗑️":"Löschen","‹":"Zurück","◀":"Zurück","⟨":"Zurück","›":"Weiter","▶":"Weiter","⟩":"Weiter"};
  const hasName=b=>b.getAttribute("aria-label")||b.getAttribute("title")||b.getAttribute("aria-labelledby");
  function label(b){ if(hasName(b))return; const l=MAP[(b.textContent||"").trim()]; if(l)b.setAttribute("aria-label",l); }
  function scan(n){ if(!n||n.nodeType!==1)return; if(n.tagName==="BUTTON"){label(n);return;} n.querySelectorAll&&n.querySelectorAll("button").forEach(label); }
  function start(){
    scan(document.body);
    try{ new MutationObserver(ms=>{ for(const m of ms) m.addedNodes&&m.addedNodes.forEach(scan); }).observe(document.body,{childList:true,subtree:true}); }catch(e){}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start); else start();
})();
