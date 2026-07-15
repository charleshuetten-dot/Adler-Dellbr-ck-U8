/* ═══════════════════════════════════════════════════════════
   ADLER CORE LAYER (Modularisierung 3/8)
   Supabase-Konfiguration, Auth (Trainer-Login, Token-Refresh),
   Sync/Offline-Queue und Basis-Utilities (toast, showSt).
   Klassisches Skript, geteilter Global-Scope – laedt NACH data.js,
   VOR dem Haupt-Skript. Top-Level: nur Timer/Listener, kein DOM-Build.
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════
   CONFIG
═══════════════════════════════════ */
const SB_URL="https://wgbcibqcqidudoksfkcv.supabase.co";
const SB_KEY="sb_publishable_Gz7hGb1ecNWkLJZA-neK_w_El3huo41";

/* ═══════════════════════════════════
   SUPABASE AUTH (Block I)
   Kinderdaten sind per RLS nur für authentifizierte Trainer les-/schreibbar.
   Quiz-Sync (quiz_progress) braucht seit v201 ebenfalls eine Sitzung – das Quiz lebt
   in der Kabine des Eltern-Zugangs. Ohne Sitzung bleibt der Fortschritt lokal.
═══════════════════════════════════ */
/* ZWEI getrennte Sitzungs-Faecher. Vorher teilten sich Trainer-Login (Passwort) und
   Eltern-Login (Einmal-Code) EINEN localStorage-Key: wer sich zuletzt anmeldete,
   ueberschrieb den anderen. Der PIN oeffnet nur die Oberflaeche – die Datenbank sah
   dann den Eltern-Token, is_trainer() war false und jeder Trainer-Schreibvorgang
   scheiterte mit "Konnte nicht speichern". Jetzt kann man beide Apps parallel nutzen. */
/* Wurzel der App (…/Adler-Dellbr-ck-U8/). Die beiden Einstiegsseiten liegen in
   /trainer/ bzw. /eltern/ – jede App braucht einen eigenen Manifest-Scope. Alle Links,
   die WEITERGEGEBEN werden (Eltern-Einladung, Ticker, Stadionheft, Kind-Link), muessen
   auf die Wurzel zeigen: die dortige Weiche schickt sie in den richtigen Ordner und
   haelt alle frueher verschickten Links am Leben. */
function appRoot(){
  return location.origin+location.pathname.replace(/(?:trainer|eltern)\/(?:index\.html)?$/,"");
}
const SB_TOKEN_KEY="adler_sb_auth";          // Trainer (Name bleibt: bestehende Sitzungen)
const SB_TOKEN_KEY_ELTERN="adler_sb_auth_eltern";
// Welche Faecher gelten in diesem Kontext? Erstes = das, in das geschrieben wird.
// Das Kinder-Quiz darf auf den Trainer-Token zurueckfallen, damit Federn auch auf
// dem Trainer-Geraet gezaehlt werden (RLS erlaubt beides).
function sbSlots(){
  const p=new URLSearchParams(location.search);
  if(p.has("portal"))return [SB_TOKEN_KEY_ELTERN];
  if(p.has("quiz"))return [SB_TOKEN_KEY_ELTERN,SB_TOKEN_KEY];
  return [SB_TOKEN_KEY];
}
function sbWriteKey(){ return sbSlots()[0]; }
function sbRead(){
  for(const k of sbSlots()){
    try{const t=JSON.parse(localStorage.getItem(k)||"null"); if(t&&t.access_token)return {key:k,t};}catch(e){}
  }
  return null;
}
function sbToken(){
  const s=sbRead();
  if(s&&(s.t.expires_at*1000)>Date.now()+60000)return s.t.access_token;
  return null;
}
function sbClearToken(){ const s=sbRead(); localStorage.removeItem(s?s.key:sbWriteKey()); }
// Eigene User-ID aus dem JWT (sub-Claim) – z. B. um "von mir reserviert" zu erkennen.
function sbUserId(){
  const t=sbToken(); if(!t)return null;
  try{ const p=JSON.parse(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))); return p.sub||null; }catch(e){ return null; }
}
/* 403 = die RLS hat abgelehnt (z. B. Eltern-Token in der Trainer-App). Das ist kein
   "Speicherfehler" und muss anders klingen, sonst sucht man an der falschen Stelle. */
function sbDeniedMsg(res,fallback){
  return (res&&res.status===403)
    ? "Keine Trainer-Rechte – bitte oben rechts als Trainer anmelden."
    : (fallback||"Konnte nicht speichern");
}
function sbAuthHeaders(extra){
  const tok=sbToken();
  return Object.assign({'apikey':SB_KEY,'Authorization':'Bearer '+(tok||SB_KEY),'Content-Type':'application/json'},extra||{});
}
// Bei 401: Token verwerfen und Login zeigen (gibt true zurück, wenn 401 behandelt wurde)
function sbCheck401(res){
  if(res&&res.status===401&&!document.body.classList.contains("quiz-extern")){
    sbClearToken();
    // UX 5: im Eltern-Portal den passwortlosen Portal-Login zeigen, NICHT das Trainer-Passwort-Gate
    if(new URLSearchParams(location.search).has("portal")){
      if(typeof renderElternPortal==="function")renderElternPortal();
    }else{
      showLoginGate();
    }
    return true;
  }
  return false;
}
async function sbLogin(email,password){
  const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=password`,{
    method:"POST",headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email,password})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error_description||data.msg||"Login fehlgeschlagen");
  // Defensive: manche GoTrue-Antworten liefern nur expires_in (Sekunden relativ), nicht expires_at (Unix-Timestamp)
  const expiresAt=data.expires_at||(Math.floor(Date.now()/1000)+(data.expires_in||3600));
  localStorage.setItem(SB_TOKEN_KEY,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token||null,expires_at:expiresAt})); // Passwort-Login = immer Trainer-Fach
  return true;
}
/* Silent Token Refresh (Schritt 6): Session vor Ablauf still erneuern, damit man
   z. B. mitten im Turnier nicht plötzlich ausgeloggt wird. Nutzt den refresh_token. */
function sbSession(){ const s=sbRead(); return s?s.t:null; }
let sbRefreshing=null;
function sbRefreshToken(){
  if(sbRefreshing)return sbRefreshing; // parallele Aufrufe teilen sich denselben Refresh
  const slot=sbRead();
  const s=slot&&slot.t;
  if(!s||!s.refresh_token)return Promise.resolve(false);
  const zielKey=slot.key; // in genau das Fach zurueckschreiben, aus dem der Token kam
  sbRefreshing=(async()=>{
    try{
      const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`,{
        method:"POST",headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:s.refresh_token})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data.access_token)return false;
      const expiresAt=data.expires_at||(Math.floor(Date.now()/1000)+(data.expires_in||3600));
      localStorage.setItem(zielKey,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token||s.refresh_token,expires_at:expiresAt}));
      return true;
    }catch(e){return false;}
    finally{sbRefreshing=null;}
  })();
  return sbRefreshing;
}
// Proaktiv: läuft der Token in < 10 Min ab, still erneuern (Netz vorhanden vorausgesetzt).
async function sbMaybeRefresh(){
  const s=sbSession();
  if(!s||!s.refresh_token)return;
  if(s.expires_at*1000-Date.now() < 10*60*1000) await sbRefreshToken();
}
setInterval(sbMaybeRefresh, 3*60*1000); // alle 3 Min prüfen
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible")sbMaybeRefresh(); });
sbMaybeRefresh(); // beim Start einmal prüfen, damit ein alter Token nicht direkt zum Logout führt
function showLoginGate(){
  if(document.getElementById("login-gate"))return;
  const gate=document.createElement("div");
  gate.id="login-gate";
  gate.style.cssText="position:fixed;inset:0;z-index:9000;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:16px";
  gate.innerHTML=`<div class="card" style="padding:24px;max-width:340px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.15)">
    <div style="font-size:16px;font-weight:700;margin-bottom:4px">🔐 Trainer-Anmeldung</div>
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:14px">Spielerdaten sind geschützt – bitte mit deinem Trainer-Account anmelden.</div>
    <div class="mg" style="margin-bottom:8px"><label>E-Mail</label><input type="email" id="login-email" autocomplete="username" style="width:100%"></div>
    <div class="mg" style="margin-bottom:12px"><label>Passwort</label><input type="password" id="login-pw" autocomplete="current-password" style="width:100%"></div>
    <div id="login-err" style="font-size:11px;color:#dc2626;margin-bottom:8px;min-height:14px"></div>
    <button class="btn btn-p" style="width:100%;min-height:44px" onclick="doLogin()"><i class="ti ti-login"></i>Anmelden</button>
  </div>`;
  document.body.appendChild(gate);
  document.getElementById("login-pw").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});
}
async function doLogin(){
  const email=document.getElementById("login-email")?.value.trim();
  const pw=document.getElementById("login-pw")?.value;
  const err=document.getElementById("login-err");
  if(!email||!pw){if(err)err.textContent="E-Mail und Passwort eingeben";return;}
  try{
    await sbLogin(email,pw);
    document.getElementById("login-gate")?.remove();
    toast("Angemeldet ✓");
    loadKader().then(()=>loadDB()).then(()=>loadTeamConfig()).then(()=>{if(curSection==="home")renderHome();}).then(()=>teamSyncLoad()).then(()=>setTimeout(showMilestoneHint,1500));
  }catch(e){if(err)err.textContent=e.message;}
}
// Nach dem PIN-Gate aufrufen (nicht im Quiz-Modus)
async function ensureLogin(){
  const p=new URLSearchParams(location.search);
  if(p.has("quiz")||p.has("portal"))return;
  if(!sbToken()){showLoginGate();return;}
  // Sitzung da – aber gehoert sie wirklich einem Trainer? Ein Eltern-Token wuerde die
  // Oberflaeche zeigen und dann bei jedem Schreiben stumm an der RLS scheitern.
  try{
    const r=await fetch(`${SB_URL}/rest/v1/profiles?select=role&limit=1`,{headers:sbAuthHeaders()});
    if(!r.ok)return; // offline o.ae.: bestehende Sitzung nicht wegwerfen
    const rows=await r.json();
    if(((rows[0]||{}).role)!=="trainer"){
      sbClearToken();
      showLoginGate();
      if(typeof toast==="function")toast("Das war ein Eltern-Zugang – bitte als Trainer anmelden.","err");
    }
  }catch(e){/* Netzfehler: nichts kaputtmachen */}
}

/* ═══════════════════════════════════
   SUPABASE
═══════════════════════════════════ */
let DB={};
let lastSyncTs=null; // L4
// Offline-Queue für savePlayer: Bewertung geht nicht verloren, wenn der Trainer auf dem
// Platz ohne Netz speichert – wird beim nächsten Online-Kontakt automatisch nachgereicht.
const PENDING_SAVES_KEY="adler_pending_saves";
function queuePendingSave(row){
  const q=safeParse(localStorage.getItem(PENDING_SAVES_KEY),[])||[];
  q.push(row);
  localStorage.setItem(PENDING_SAVES_KEY,JSON.stringify(q));
}
async function flushPendingSaves(){
  const q=safeParse(localStorage.getItem(PENDING_SAVES_KEY),[])||[];
  if(!q.length)return;
  const remaining=[];
  for(const row of q){
    try{
      const res=await fetch(`${SB_URL}/rest/v1/spielerprofile`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=representation'}),body:JSON.stringify(row)});
      if(!res.ok)remaining.push(row);
    }catch(e){remaining.push(row);}
  }
  localStorage.setItem(PENDING_SAVES_KEY,JSON.stringify(remaining));
  if(remaining.length<q.length)toast(`${q.length-remaining.length} offline gespeicherte Bewertung(en) synchronisiert ✓`);
}

/* ═══════════════════════════════════
   PHASE 7-B: OFFLINE-QUEUE (Dorfplatz-Schutz)
   Generische Sync-Queue fuer APPEND-ONLY-Aktionen am Spieltag (Ticker, Match-
   Actions, Blitz-Ratings). Da es reine Inserts sind, koennen sie konfliktfrei
   nachgespielt werden – kein Overwrite neuerer Online-Daten moeglich. Reihenfolge
   wird gewahrt (matchday-Upsert vor abhaengigem ticker-Insert). Zustands-Daten
   (Nominierung/Match-Uhr) laufen weiter local-first bzw. ueber Timestamp-Merge.
═══════════════════════════════════ */
const SYNC_QUEUE_KEY="adler_sync_queue";
function syncQueueGet(){return safeParse(localStorage.getItem(SYNC_QUEUE_KEY),[])||[];}
function syncQueueSave(a){localStorage.setItem(SYNC_QUEUE_KEY,JSON.stringify(a));}
function enqueueSync(item){
  const q=syncQueueGet();
  q.push({id:(crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),ts:Date.now(),...item});
  syncQueueSave(q);
  updateSyncBadge();
}
function updateSyncBadge(){
  const n=syncQueueGet().length;
  const dot=document.getElementById("cdot"),lbl=document.getElementById("clbl");
  if(n>0){ if(dot)dot.className="cdot warn"; if(lbl){lbl.textContent=`🟡 ${n} offline – wird synchronisiert`;lbl.title="Aktionen werden gesendet, sobald wieder Netz da ist";} }
}
// POST mit Offline-Fallback: bei Netz-/Serverfehler landet die Aktion in der Queue.
async function sbQueuedPost(path,body,prefer){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/${path}`,{method:"POST",headers:sbAuthHeaders(prefer?{'Prefer':prefer}:undefined),body:JSON.stringify(body)});
    if(r.status===401){sbCheck401(r);return {ok:false,res:r};}
    if(!r.ok)throw new Error("HTTP "+r.status);
    return {ok:true,res:r};
  }catch(e){
    enqueueSync({path,body,prefer:prefer||null});
    return {ok:false,queued:true};
  }
}
async function flushSyncQueue(){
  const q=syncQueueGet();
  if(!q.length)return;
  if(!navigator.onLine){updateSyncBadge();return;}
  const remaining=[]; let flushed=0, stop=false;
  for(const item of q){
    if(stop){remaining.push(item);continue;} // nach erstem Fehler Reihenfolge bewahren (FK-Abhaengigkeiten)
    try{
      const r=await fetch(`${SB_URL}/rest/v1/${item.path}`,{method:"POST",headers:sbAuthHeaders(item.prefer?{'Prefer':item.prefer}:undefined),body:JSON.stringify(item.body)});
      if(!r.ok)throw new Error("HTTP "+r.status);
      flushed++;
    }catch(e){remaining.push(item);stop=true;}
  }
  syncQueueSave(remaining);
  if(remaining.length){updateSyncBadge();}
  else if(flushed){const lbl=document.getElementById("clbl");if(lbl){lbl.textContent="Live";}const dot=document.getElementById("cdot");if(dot)dot.className="cdot ok";}
  if(flushed)toast(`${flushed} offline gespeicherte Aktion(en) synchronisiert ✓`);
}
window.addEventListener("online",flushSyncQueue);

async function loadDB(){
  flushSyncQueue(); // Spieltag-Aktionen zuerst nachspielen (best effort, nicht blockierend)
  await flushPendingSaves(); // vor dem Laden pushen, damit die frischen Daten gleich mit reinkommen
  try{
    const r=await fetch(`${SB_URL}/rest/v1/spielerprofile?select=*`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)){window._dbLoaded=true;return;}
    if(r.ok){
      const data=await r.json();DB={};
      data.forEach(p=>{if(!DB[p.name])DB[p.name]=[];DB[p.name].push(p);});
      Object.keys(DB).forEach(n=>DB[n].sort((a,b)=>new Date(a.datum)-new Date(b.datum)));
      document.getElementById("cdot").className="cdot ok";
      document.getElementById("clbl").textContent="Live";
      lastSyncTs=new Date(); // L4
      const lbl=document.getElementById("clbl");
      if(lbl)lbl.title="Zuletzt synchronisiert: "+lastSyncTs.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
    } else throw new Error("HTTP "+r.status);
  }catch(e){
    document.getElementById("cdot").className="cdot err";
    document.getElementById("clbl").textContent="Offline: "+(e.message||"Verbindung fehlgeschlagen").slice(0,30);
    const lbl=document.getElementById("clbl");
    if(lbl)lbl.title="Offline – Daten vom Gerät";
  }
  window._dbLoaded=true; // L2: Skeletons beenden
  refreshSelects();renderKader();
  if(document.getElementById("view-kombi")?.classList.contains("active"))renderKombi();
}
// L4: Antippen des Sync-Status zeigt Zeitstempel als Toast
document.addEventListener("DOMContentLoaded",()=>{
  const lbl=document.getElementById("clbl");
  if(lbl)lbl.addEventListener("click",()=>{
    toast(lastSyncTs?"Zuletzt synchronisiert: "+lastSyncTs.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"Offline – Daten vom Gerät");
  });
});
// L2: wiederverwendbare Skeleton-Zeilen
const skeletonRows=(n=3)=>Array.from({length:n},()=>'<div class="skeleton"></div>').join("");

async function savePlayer(){
  const meta=getMeta();
  if(!meta.name){showSt("save-status","Spieler auswählen.","err");return;}
  if(countFilled()<totalCrit()){showSt("save-status",`Noch ${totalCrit()-countFilled()} Kriterien offen.`,"err");return;}
  const v=getV();
  const result=meta.tw?generateFazitTW(v,meta):generateFazitFeld(v,meta);
  const row={
    name:meta.name,datum:meta.date||new Date().toISOString().slice(0,10),
    position:result.tw?(result.rolle?.prim||"flex"):result.rolle?.prim,
    prim_rolle:result.tw?`TW / ${result.rolle?.primLabel}`:result.rolle?.primLabel,
    sek_rolle:result.rolle?.sekLabel||"–",
    attendance:meta.att,strong_foot:meta.foot,notes:meta.notes,
    eltern:meta.eltern,age:meta.age,grp:meta.grp,trainer:meta.trainer,
    fazit:result.text,summary:result.summary,tw:meta.tw,
    scores:JSON.stringify(Object.values(result.dims)),
    total_score:result.total,pot_score:result.pot,
    radios:JSON.stringify(v)
  };
  const saveBtn=document.querySelector('button[onclick="savePlayer()"]'); // C9: Doppelklick-Schutz
  if(saveBtn)saveBtn.disabled=true;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/spielerprofile`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=representation','X-Client-Info':'supabase-js/2.0.0'}),body:JSON.stringify(row)});
    if(sbCheck401(res)){showSt("save-status","Anmeldung abgelaufen – bitte neu anmelden und erneut speichern.","err");return;}
    if(res.ok||res.status===201||res.status===204){
      showSt("save-status",`${meta.name} gespeichert – ${result.tw?"TW+":""}${result.rolle?.primLabel} (${result.total}%) – ${meta.trainer}`,"ok");
      try{navigator.vibrate&&navigator.vibrate(50);}catch(e){} // 1C: haptische Bestätigung auf dem Platz
      await loadDB();
      if(typeof bewRundeAdvance==="function")bewRundeAdvance(); // Bewertungsrunde: automatisch zum nächsten Spieler
    } else {
      let errMsg="Cloud-Fehler "+res.status;
      try{const errBody=await res.json();errMsg+=" – "+(errBody.message||errBody.error||JSON.stringify(errBody).slice(0,80));}catch(e){}
      showSt("save-status",errMsg,"err");
    }
  }catch(e){
    // Offline auf dem Platz: Bewertung nicht verwerfen, sondern lokal für später vormerken
    queuePendingSave(row);
    showSt("save-status",`${meta.name}: Offline gespeichert – wird automatisch hochgeladen, sobald wieder Netz da ist.`,"info");
  }
  finally{if(saveBtn)saveBtn.disabled=false;}
}

function showSt(id,msg,type){
  const el=document.getElementById(id);
  el.className=`status s-${type} show`;el.textContent=msg;
  setTimeout(()=>el.classList.remove("show"),6000);
}
function toast(msg,type="ok"){
  let t=document.getElementById("app-toast");
  if(!t){t=document.createElement("div");t.id="app-toast";t.className="toast";document.body.appendChild(t);}
  t.className=`toast toast-${type} show`;t.textContent=msg;
  clearTimeout(t._tid);t._tid=setTimeout(()=>t.classList.remove("show"),3000);
}
// Undo-Toast: Aktion sofort ausführen, aber ein paar Sekunden zurücknehmbar (statt Bestätigungsdialog).
function toastUndo(msg,undoFn,ms){
  ms=ms||6000;
  document.getElementById("undo-toast")?.remove();
  const el=document.createElement("div");el.id="undo-toast";
  el.style.cssText="position:fixed;left:12px;right:12px;bottom:78px;z-index:10060;max-width:460px;margin:0 auto;background:#1e293b;color:#fff;border-radius:12px;padding:11px 12px;box-shadow:0 8px 28px rgba(0,0,0,.35);display:flex;align-items:center;gap:10px;font-size:13px;font-family:inherit";
  const span=document.createElement("span");span.style.flex="1";span.textContent=msg;
  const btn=document.createElement("button");btn.textContent="↶ Rückgängig";
  btn.style.cssText="background:#fbbf24;color:#1e293b;border:none;border-radius:8px;padding:7px 12px;font-weight:800;font-family:inherit;cursor:pointer;flex:none";
  let done=false; const close=()=>{clearTimeout(tid);el.remove();};
  btn.onclick=()=>{ if(done)return; done=true; try{undoFn&&undoFn();}catch(e){} close(); };
  el.appendChild(span);el.appendChild(btn);document.body.appendChild(el);
  const tid=setTimeout(close,ms);
}

function clearForm(){
  document.getElementById("p-name").value="";
  document.getElementById("p-notes").value="";
  document.getElementById("p-foot").value="R";
  document.getElementById("p-eltern").value="2";
  const elSeg=document.getElementById("p-eltern-seg");
  if(elSeg){elSeg.querySelectorAll(".seg-btn").forEach(b=>{b.classList.toggle("active",b.dataset.val==="2");});}
  document.getElementById("p-att").value="2";
  const attSeg=document.getElementById("p-att-seg");
  if(attSeg){attSeg.querySelectorAll(".seg-btn").forEach(b=>{b.classList.toggle("active",b.dataset.val==="2");});}
  document.getElementById("p-age").value="8";
  document.getElementById("p-grp").value="flex";
  document.querySelectorAll('input[type="radio"]').forEach(r=>r.checked=false);
  document.getElementById("fazit-out").value="";
  document.getElementById("pfill").style.width="0%";
  document.getElementById("plbl").textContent="0 / 0";
  document.getElementById("live-prog").textContent="0 / 0";
  document.getElementById("raute-hint").textContent="Spieler wählen";
  ["rp-auf","rp-jaeg","rp-links","rp-rechts","rp-tw"].forEach(id=>{const el=document.getElementById(id);if(el){el.className="rpos";el.style.opacity="";}});
  if(liveChart){liveChart.destroy();liveChart=null;}
  document.getElementById("dims-wrap").innerHTML="";
  builtDimsTw=null;
  showBewSticky("");
}

function loadPlayerToForm(p){
  document.getElementById("p-name").value=p.name||"";
  // p-date ist ein Termin-Dropdown: das Datum der geladenen Bewertung als Option sicherstellen.
  if(p.datum&&typeof terminSelectEnsure==="function")terminSelectEnsure("p-date",p.datum);
  else document.getElementById("p-date").value=p.datum||"";
  document.getElementById("p-foot").value=p.strong_foot||"R";
  if(document.getElementById("p-att"))document.getElementById("p-att").value=p.attendance||"2";
  const attSeg=document.getElementById("p-att-seg");
  if(attSeg){attSeg.querySelectorAll(".seg-btn").forEach(b=>{b.classList.toggle("active",b.dataset.val===(p.attendance||"2"));});}
  document.getElementById("p-eltern").value=p.eltern||"2";
  const elSeg=document.getElementById("p-eltern-seg");
  if(elSeg){elSeg.querySelectorAll(".seg-btn").forEach(b=>{b.classList.toggle("active",b.dataset.val===(p.eltern||"2"));});}
  document.getElementById("p-age").value=p.age||"8";
  document.getElementById("p-grp").value=p.grp||"flex";
  document.getElementById("p-trainer").value=p.trainer||"Sandy";
  document.getElementById("p-notes").value=p.notes||"";
  const tw=getKader(p.name)?.tw||false;
  if(builtDimsTw!==tw){
    buildDims(tw);
  }else if(wizOn){wizIdx=0;wizRender();}
  document.querySelectorAll('#dims-wrap input[type="radio"]').forEach(r=>r.checked=false);
  const radios=typeof p.radios==="string"?safeParse(p.radios,{}):(p.radios||{});
  Object.keys(radios).forEach(n=>{const el=document.querySelector(`input[name="${n}"][value="${radios[n]}"]`);if(el)el.checked=true;});
  showBewSticky(p.name);
  updateTierHL();updateMxHL();updateDimPills();onChange();
  sv("bew");window.scrollTo({top:0,behavior:"smooth"});
}

function refreshSelects(){
  const dbNames=Object.keys(DB).sort();
  const bewSel=document.getElementById("p-name");const bewCur=bewSel.value;
  bewSel.innerHTML='<option value="">— Spieler wählen —</option>';
  KADER.forEach(k=>{
    const o=document.createElement("option");o.value=k.name;
    const twLabel=k.tw?(k.twPrio===1?" 🥅 TW-1":" 🥅 TW-2"):"";
    o.textContent=`${k.name}${twLabel}`;
    bewSel.appendChild(o);
  });
  if(bewCur)bewSel.value=bewCur;
  ["psel-profil","psel-verlauf"].forEach(id=>{
    const sel=document.getElementById(id);const cur=sel.value;
    sel.innerHTML='<option value="">— Spieler wählen —</option>';
    dbNames.forEach(n=>{
      const k=getKader(n);const o=document.createElement("option");o.value=n;
      o.textContent=`${n}${k?.tw?" 🥅":""}`;
      sel.appendChild(o);
    });
    if(cur&&dbNames.includes(cur))sel.value=cur;
  });
  if(typeof bewRundeBarRender==="function")bewRundeBarRender(); // Bewertungsrunde-Leiste (Trainermeeting)
}

/* ═══════════════════════════════════
   ADLER-XP (Welle 1, FEAT S+T)
   Punkte vergibt AUSSCHLIESSLICH die security-definer-RPC xp_award_event
   (fixe Punktwerte, Idempotenz via quelle_id, Eltern-nur-eigenes-Kind,
   Double-XP-Booster serverseitig). Der Client ruft nur auf und zeigt an.
   Fehler laufen still ins Leere – XP dürfen nie einen Kern-Flow blockieren.
   KEIN öffentliches Leaderboard (bewusste Produktentscheidung).
═══════════════════════════════════ */
// Kindgerechter Begriff für die gesammelten Punkte (früher "XP"). ZENTRAL – überall referenziert,
// damit ein späterer Wechsel (z. B. "Punkte"/"Sterne") ein Einzeiler bleibt.
const XP_LABEL="Federn";
const XP_ICON="🪶";
const XP_BADGES=[
  {min:400,t:"Adler-Legende",emo:"👑"},
  {min:150,t:"Adler",emo:"🦅"},
  {min:50,t:"Adler-Nachwuchs",emo:"⭐"},
  {min:0,t:"Küken",emo:"🐣"}
];
function xpBadge(total){return XP_BADGES.find(b=>(total||0)>=b.min)||XP_BADGES[XP_BADGES.length-1];}

/* Wetter am Termin (open-meteo, ohne API-Key). Heim-Koordinaten Köln-Dellbrück als Default.
   open-meteo wird im SW NICHT gecacht (durchgereicht) – sonst würde ignoreSearch die
   Datums-Query zerstören. Zeigt nur etwas, wenn der Termin in Vorhersage-Reichweite liegt. */
// Chart.js Lazy-Loader: lädt das ~200-KB-Skript erst, wenn ein Diagramm gebraucht wird
// (nur Trainer-Verlauf/Radar). SW hat es weiterhin im Precache → offline aus dem Cache.
let _chartJsPromise=null;
function ensureChart(){
  if(window.Chart)return Promise.resolve();
  if(_chartJsPromise)return _chartJsPromise;
  _chartJsPromise=new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
    s.onload=()=>res();
    s.onerror=()=>{_chartJsPromise=null;rej(new Error("Chart.js konnte nicht geladen werden"));};
    document.head.appendChild(s);
  });
  return _chartJsPromise;
}

// Ort/Adresse → antippbarer Karten-Link (Google Maps, öffnet native App auf dem Handy).
function mapsUrl(q){ return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q||""); }
function mapsAnchor(ort,color){ if(!ort)return ""; return `<a href="${mapsUrl(ort)}" target="_blank" rel="noopener" style="color:${color||"var(--blue)"};text-decoration:none">📍 ${esc(ort)}</a>`; }
// F3: klarer „Route"-Knopf (Maps-Deep-Link) aus einer Adresse. block=true -> volle Breite fürs
// Eltern-Detailfenster (eigenes Design), sonst kompakter .btn fürs Trainer-Karten-Raster.
function routeBtn(addr,opts){
  if(!addr)return ""; opts=opts||{};
  if(opts.block)return `<a href="${mapsUrl(addr)}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;margin-top:8px;border:1.5px solid #1e3a8a;border-radius:10px;background:#eef2ff;color:#1e3a8a;font-family:inherit;font-size:14px;font-weight:800;text-decoration:none">🧭 Route öffnen</a>`;
  return `<a class="btn btn-sm" href="${mapsUrl(addr)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none"><i class="ti ti-navigation"></i>🧭 Route</a>`;
}

/* C: Pausen-Status. Explizites „pausiert bis TT.MM." (kind_pause, trainer-gesetzt) – das
   verlässliche „ist raus", das istRecovery (auto aus krank, 14 Tage) ergänzt/überschreibt.
   Fließt in Prognose, Nominierung und Buddy-Auslosung ein. Name-keyed (wie RECOVERY). */
let PAUSE_MAP={}; let _pauseAt=0;
async function pauseLoad(force){
  if(!force && PAUSE_MAP && Date.now()-_pauseAt<30000) return PAUSE_MAP;
  const heute=new Date().toISOString().slice(0,10); const m={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_pause?select=spieler_id,bis,grund&bis=gte.${heute}`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(x=>{
      const k=(typeof KADER!=="undefined"?KADER:[]).find(kk=>kk._id===x.spieler_id||kk.id===x.spieler_id);
      if(k)m[k.name]={bis:x.bis,grund:x.grund,id:x.spieler_id};
    });
  }catch(e){}
  PAUSE_MAP=m; _pauseAt=Date.now(); return PAUSE_MAP;
}
function pauseClear(){ _pauseAt=0; }
function istPaused(name){ return !!PAUSE_MAP[name]; }
function pauseBis(name){ return PAUSE_MAP[name]?PAUSE_MAP[name].bis:null; }
function pauseBisLabel(name){ const b=pauseBis(name); if(!b)return ""; const d=new Date(b+"T00:00:00"); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.`; }

const WETTER_LAT=50.98, WETTER_LON=7.05; // SV Adler Dellbrück (Heim)
function wetterCodeInfo(c){
  c=Number(c);
  if(c===0)return{e:"☀️",t:"Klar"};
  if(c===1||c===2)return{e:"🌤️",t:"Leicht bewölkt"};
  if(c===3)return{e:"☁️",t:"Bewölkt"};
  if(c===45||c===48)return{e:"🌫️",t:"Nebel"};
  if(c>=51&&c<=57)return{e:"🌦️",t:"Nieselregen"};
  if((c>=61&&c<=67)||(c>=80&&c<=82))return{e:"🌧️",t:"Regen"};
  if((c>=71&&c<=77)||(c>=85&&c<=86))return{e:"❄️",t:"Schnee"};
  if(c>=95)return{e:"⛈️",t:"Gewitter"};
  return{e:"🌡️",t:"Wetter"};
}
// OSM/Nominatim: Adress-Suche per Name (kein Key). Für die manuelle Gegner-Adress-Suche
// (Trainer tippt Name/Ort → Vorschläge) UND als Geocoder fürs Wetter. Nur Deutschland,
// max. 5 Treffer. Nominatim-Policy: geringe Frequenz – wir cachen Geocodes (s. u.).
async function osmSearch(query){
  if(!query||!query.trim())return [];
  try{
    const u=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=json&limit=5&addressdetails=1&countrycodes=de&accept-language=de`;
    const r=await fetch(u,{headers:{'Accept':'application/json'}});
    if(!r.ok)return [];
    return ((await r.json())||[]).map(x=>({label:x.display_name,lat:parseFloat(x.lat),lon:parseFloat(x.lon)}));
  }catch(e){return [];}
}
// Ort-String → {lat,lon}, dauerhaft gecacht (localStorage) → pro Ort nur EIN Netz-Aufruf.
async function geocodePlace(place){
  if(!place||!place.trim())return null;
  const key=place.trim().toLowerCase();
  let cache={}; try{cache=JSON.parse(localStorage.getItem("adler_geo")||"{}");}catch(e){}
  if(cache[key])return cache[key]; // Treffer ODER gemerktes "null" (0-Länge) – kein erneuter Call
  let res=await osmSearch(place);
  if(!res.length){
    // Fallback: Stadt/PLZ-Teil statt Heim-Köln – z. B. „Sportplatz XY, 51069 Köln" → „51069 Köln"
    const parts=place.split(",").map(s=>s.trim()).filter(Boolean);
    const cityGuess=(place.match(/\d{5}\s+[^,]+/)||[])[0] || (parts.length>1?parts[parts.length-1]:"");
    if(cityGuess&&cityGuess.trim().toLowerCase()!==key) res=await osmSearch(cityGuess);
  }
  const coords=res.length?{lat:res[0].lat,lon:res[0].lon}:null;
  cache[key]=coords||0; try{localStorage.setItem("adler_geo",JSON.stringify(cache));}catch(e){}
  return coords;
}
async function wetterFetch(dateStr,place,timeStr){
  if(!dateStr)return null;
  const today=new Date(); today.setHours(0,0,0,0);
  const days=Math.round((new Date(dateStr+"T00:00:00")-today)/86400000);
  if(days<0||days>15)return null; // open-meteo-Vorhersage reicht ~16 Tage
  let lat=WETTER_LAT, lon=WETTER_LON; // Heim-Default
  if(place){ try{ const g=await geocodePlace(place); if(g&&g.lat){lat=g.lat;lon=g.lon;} }catch(e){} }
  const hm=timeStr&&/^(\d{1,2}):(\d{2})/.exec(timeStr); // stundengenau, wenn Uhrzeit vorhanden
  const base=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=Europe%2FBerlin&start_date=${dateStr}&end_date=${dateStr}`;
  try{
    if(hm){
      const hh=hm[1].padStart(2,"0");
      const j=await (await fetch(base+"&hourly=weather_code,temperature_2m,precipitation_probability")).json();
      const h=j&&j.hourly;
      if(h&&h.time&&h.time.length){
        let idx=h.time.indexOf(`${dateStr}T${hh}:00`);
        if(idx<0)idx=h.time.findIndex(t=>t.indexOf(`${dateStr}T${hh}`)===0);
        if(idx>=0){
          const info=wetterCodeInfo(h.weather_code[idx]);
          return {emoji:info.e,text:info.t,temp:Math.round(h.temperature_2m[idx]),rain:h.precipitation_probability?h.precipitation_probability[idx]:null,hour:true};
        }
      }
    }
    const r=await fetch(base+"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
    if(!r.ok)return null;
    const dd=(await r.json()).daily;
    if(!dd||!dd.weather_code||!dd.weather_code.length)return null;
    const info=wetterCodeInfo(dd.weather_code[0]);
    return {emoji:info.e,text:info.t,tmax:Math.round(dd.temperature_2m_max[0]),tmin:Math.round(dd.temperature_2m_min[0]),rain:dd.precipitation_probability_max?dd.precipitation_probability_max[0]:null,hour:false};
  }catch(e){return null;}
}
// G1: Ausrüstungs-Tipp aus der Vorhersage – was die Kinder passend zum Wetter dabei haben sollten.
function wetterKitTip(w){
  if(!w)return "";
  const t=w.hour?w.temp:(w.tmin!=null?w.tmin:w.tmax);
  const tips=[];
  if(t!=null){
    if(t<=4)tips.push("🧤 sehr kalt: Mütze & Handschuhe, warm anziehen");
    else if(t<=12)tips.push("🧥 kühl: lange Sachen, Wechselschuhe");
    else if(t>=27)tips.push("🧴 heiß: Sonnencreme, Kappe, extra trinken");
    else if(t>=21)tips.push("🧢 warm: Kappe & genug trinken");
  }
  if(w.rain!=null&&w.rain>=55)tips.push("☔ Regen: Regenjacke + Wechselklamotten");
  return tips.join(" · ");
}
// Wetter-Warnung: liefert bei kritischer Vorhersage (Gewitter/Starkregen/Frost/Glätte) eine
// Stufe + Kurztext, sonst null. Basis: das aus wetterFetch bekannte {text,temp,rain}.
function wetterWarn(w){
  if(!w)return null;
  const t=w.hour?w.temp:(w.tmin!=null?w.tmin:w.tmax);
  if(w.text==="Gewitter")return {lvl:"Gewitter",msg:"⛈️ Gewitter angesagt – Sicherheit geht vor."};
  if(w.text==="Schnee"&&t!=null&&t<=0)return {lvl:"Schnee & Glätte",msg:"❄️ Schnee bei Frost – Glättegefahr."};
  if(t!=null&&t<=-2)return {lvl:"Strenger Frost",msg:"🥶 Sehr kalt – Platz evtl. hart/gefroren."};
  if(w.rain!=null&&w.rain>=85)return {lvl:"Starkregen",msg:"🌧️ Sehr hohe Regenwahrscheinlichkeit ("+w.rain+"%)."};
  return null;
}
async function wetterInto(elId,dateStr,place,timeStr){
  const w=await wetterFetch(dateStr,place,timeStr);
  const el=document.getElementById(elId);
  if(!el||!w)return; // außer Reichweite / offline: nichts anzeigen
  const rain=(w.rain!=null)?` · 💧 ${w.rain}%`:"";
  const temp=w.hour?`${w.temp} °C`:`${w.tmin}–${w.tmax} °C`;
  const tip=wetterKitTip(w);
  el.innerHTML=`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text2);background:var(--surface2);border:var(--border);border-radius:20px;padding:3px 10px;margin-top:6px">${w.emoji} ${w.text} · ${temp}${rain}</span>`
    +(tip?`<div style="font-size:11px;color:var(--text2);margin-top:4px">🎒 ${tip}</div>`:"");
}

async function xpAward(spielerId,quelle,quelleId){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_spieler_id:spielerId,p_quelle:quelle,p_quelle_id:quelleId==null?null:String(quelleId)})});
    if(!r.ok)return 0;               // anon/fremd/unbekannt -> Server lehnt ab, UI läuft weiter
    return (await r.json())||0;      // 0 = schon vergeben (idempotent), >0 = gutgeschrieben
  }catch(e){return 0;}
}

// Quiz & Anwesenheit kennen nur den Namen: ID RLS-konform auflösen.
// Eltern-Session sieht im kader nur das eigene Kind -> eingebauter Cheat-Schutz.
async function xpAwardByName(name,quelle,quelleId){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kader?select=id&name=eq.${encodeURIComponent(name)}&limit=1`,{headers:sbAuthHeaders()});
    if(!r.ok)return 0;
    const rows=await r.json();
    if(!rows.length)return 0;
    return xpAward(rows[0].id,quelle,quelleId);
  }catch(e){return 0;}
}

async function xpTotal(spielerId){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_total`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_spieler_id:spielerId})});
    if(!r.ok)return 0;
    return (await r.json())||0;
  }catch(e){return 0;}
}

/* ═══════════════════════════════════
   PWA-INSTALL-NUDGE (Welle 2, UX 1) – Soft-Nudge, NIE Hard-Block.
   Android/Chrome: nativer Prompt via beforeinstallprompt.
   iOS/Safari: bebilderte "Zum Home-Bildschirm"-Anleitung (kein API-Prompt).
   Wegklickbar; nach Dismiss 14 Tage Ruhe. Erscheint nie in der installierten App.
═══════════════════════════════════ */
let _pwaPrompt=null, _pwaWant=false;
function _pwaStandalone(){return (window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();_pwaPrompt=e;if(_pwaWant)pwaBannerShow("android");});
/* Genau ZWEI installierbare Apps (eigene Manifest-ids): Trainer und Eltern-Bereich.
   Das Kinder-Quiz ist keine eigene App mehr – es lebt in der Kabine im Eltern-Zugang.
   Alles andere (Quiz, Stadionheft, Liveticker, Kind-Link) hat gar kein Manifest; dort
   wuerde ein Install-Angebot die TRAINER-App installieren. Also: kein Nudge.
   Der Nudge wird je App benannt und je App weggeklickt. */
function pwaKontext(){
  const p=new URLSearchParams(location.search);
  if(p.has("portal"))return {slug:"eltern",name:"Eltern-Bereich",installierbar:true};
  if(p.has("quiz")||p.has("heft")||p.has("ticker")||p.has("kind"))return {slug:"none",name:"",installierbar:false};
  return {slug:"trainer",name:"Trainer-App",installierbar:true};
}
function pwaNudgeKey(){ return "adler_pwa_nudge_"+pwaKontext().slug; }
function pwaInstallNudge(){
  if(!pwaKontext().installierbar)return;                        // hier gibt es keine eigene App
  if(_pwaStandalone())return;                                   // läuft schon als App
  let dismissed=0; try{dismissed=+localStorage.getItem(pwaNudgeKey())||0;}catch(e){}
  if(Date.now()-dismissed < 14*864e5)return;                    // 14 Tage Ruhe nach Wegklicken
  const ua=navigator.userAgent||"";
  const iOS=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1); // iPadOS meldet sich als Mac
  const safari=/^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  if(iOS&&safari){pwaBannerShow("ios");return;}
  if(_pwaPrompt){pwaBannerShow("android");return;}
  _pwaWant=true;                                                // Android: warten bis beforeinstallprompt feuert
}
function pwaBannerDismiss(){try{localStorage.setItem(pwaNudgeKey(),String(Date.now()));}catch(e){}document.getElementById("pwa-nudge")?.remove();}
async function pwaBannerInstall(){
  if(!_pwaPrompt){document.getElementById("pwa-nudge")?.remove();return;}
  const p=_pwaPrompt;_pwaPrompt=null;
  try{p.prompt();await p.userChoice;}catch(e){}
  document.getElementById("pwa-nudge")?.remove();
}
function pwaBannerShow(kind){
  if(document.getElementById("pwa-nudge")||_pwaStandalone())return;
  const el=document.createElement("div");
  el.id="pwa-nudge";
  el.style.cssText="position:fixed;left:12px;right:12px;bottom:12px;z-index:10050;background:#1e3a8a;color:#fff;border-radius:14px;padding:14px 34px 14px 16px;box-shadow:0 8px 28px rgba(0,0,0,.35);font-family:inherit;max-width:460px;margin:0 auto";
  const close=`<button onclick="pwaBannerDismiss()" aria-label="Schließen" style="position:absolute;top:8px;right:10px;background:none;border:none;color:rgba(255,255,255,.7);font-size:22px;line-height:1;cursor:pointer">×</button>`;
  const app=pwaKontext().name;
  if(kind==="ios"){
    el.innerHTML=`${close}<div style="font-weight:800;font-size:15px;margin-bottom:4px">📱 ${app} aufs Handy</div>
      <div style="font-size:12.5px;line-height:1.55;opacity:.96">Tippe unten in Safari auf <b>Teilen</b> <span style="display:inline-block;border:1px solid rgba(255,255,255,.6);border-radius:5px;padding:0 5px">↑</span> und dann auf <b>„Zum Home-Bildschirm"</b> – danach startet der ${app} wie eine echte App, mit eigenem Symbol.</div>`;
  }else{
    el.innerHTML=`${close}<div style="font-weight:800;font-size:15px;margin-bottom:8px">📱 ${app} installieren</div>
      <div style="font-size:12.5px;opacity:.96;margin-bottom:10px">Als eigene App auf den Startbildschirm – schneller Zugriff, funktioniert auch offline.</div>
      <button onclick="pwaBannerInstall()" style="background:#fff;color:#1e3a8a;border:none;border-radius:10px;padding:9px 16px;font-family:inherit;font-weight:800;font-size:13.5px;cursor:pointer">Installieren</button>`;
  }
  document.body.appendChild(el);
}

/* ═══════════════════════════════════
   HOTFIX 16: Haptisches Feedback (Outdoor-UX). Zentraler Wrapper +
   dezenter Tap bei jedem Button/Nav-Klick (delegiert, ein Listener).
═══════════════════════════════════ */
function hapticTap(pattern){ try{ if(navigator.vibrate)navigator.vibrate(pattern||12); }catch(e){} }
document.addEventListener("click",e=>{ if(e.target&&e.target.closest&&e.target.closest("button,.btn,.nb,.seg-btn"))hapticTap(12); },{passive:true});

/* ═══ Dark Mode: automatisch nach OS + manueller Toggle (in localStorage gemerkt). ═══ */
function applyTheme(t){
  const el=document.documentElement;
  if(t==="dark"||t==="light")el.setAttribute("data-theme",t); else el.removeAttribute("data-theme");
  const btn=document.getElementById("theme-toggle");
  if(btn){ const dark=(t==="dark")||(t!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches); btn.textContent=dark?"☀️":"🌙"; }
}
function toggleTheme(){
  const el=document.documentElement;
  const effDark=el.getAttribute("data-theme")==="dark"||(!el.getAttribute("data-theme")&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  const next=effDark?"light":"dark";
  try{localStorage.setItem("adler_theme",next);}catch(e){}
  applyTheme(next);
  if(typeof elternThemeOnToggle==="function")elternThemeOnToggle(); // Eltern-Bereich (feste Farben) mit-einfärben
  if(typeof hapticTap==="function")hapticTap(12);
}
(function(){ try{ applyTheme(localStorage.getItem("adler_theme")); }catch(e){} })(); // sofort (Anti-Flash)
document.addEventListener("DOMContentLoaded",()=>{ try{ applyTheme(localStorage.getItem("adler_theme")); }catch(e){} }); // Button-Icon setzen
if(window.matchMedia){ try{ window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{ if(!localStorage.getItem("adler_theme"))applyTheme(null); }); }catch(e){} }

/* ═══ Web-Push-Benachrichtigungen ═══
   Öffentlicher VAPID-Schlüssel (der private liegt nur in der Edge Function push-send).
   Subscriptions in push_subscriptions (RLS: eigene). Senden macht der Trainer -> Edge Function. */
const VAPID_PUBLIC="BEC5hAYJQ3IBA0HHrPttPTH_OeH-pdTRx5Q88W1thcJ1e23Ia7MWGB1Y4BUPg_uqt3sdiVcDa6TwPy8odLuD4J0";
function pushSupported(){ return ("serviceWorker" in navigator)&&("PushManager" in window)&&("Notification" in window); }
function _urlB64ToU8(b64){
  const pad="=".repeat((4-b64.length%4)%4);
  const s=(b64+pad).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(s), u=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);
  return u;
}
async function pushCurrentSub(){
  if(!pushSupported())return null;
  try{ const reg=await navigator.serviceWorker.ready; return await reg.pushManager.getSubscription(); }catch(e){ return null; }
}
async function pushSubscribe(rolle){
  if(!pushSupported()){toast("Benachrichtigungen werden hier nicht unterstützt","err");return false;}
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return false;}
  let perm=Notification.permission;
  if(perm==="default")perm=await Notification.requestPermission();
  if(perm!=="granted"){toast("Benachrichtigungen wurden nicht erlaubt","err");return false;}
  try{
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:_urlB64ToU8(VAPID_PUBLIC)});
    const j=sub.toJSON();
    const r=await fetch(`${SB_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({endpoint:sub.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth,rolle:rolle||"parent"})});
    if(sbCheck401(r))return false;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht aktivieren"),"err");return false;}
    toast("🔔 Benachrichtigungen aktiviert");
    return true;
  }catch(e){ toast("Konnte nicht aktivieren","err"); return false; }
}
async function pushUnsubscribe(){
  try{
    const sub=await pushCurrentSub();
    if(sub){ try{await fetch(`${SB_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){} try{await sub.unsubscribe();}catch(e){} }
    toast("Benachrichtigungen ausgeschaltet");
  }catch(e){}
}
// Status-abhängigen An/Aus-Button in einen Slot rendern (rolle: 'parent' | 'trainer').
async function pushRenderInto(elId, rolle){
  const el=document.getElementById(elId); if(!el)return;
  if(!pushSupported()){ el.innerHTML=""; return; }
  const sub=await pushCurrentSub();
  const on=!!sub && (typeof Notification!=="undefined"&&Notification.permission==="granted");
  const base="width:100%;min-height:48px;padding:12px;border-radius:10px;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer";
  el.innerHTML=on
    ? `<button onclick="pushUnsubscribe().then(()=>pushRenderInto('${elId}','${rolle}'))" style="${base};border:1.5px solid #16a34a;background:#f0fdf4;color:#15803d">🔔 Benachrichtigungen an ✓ · zum Ausschalten tippen</button>`
    : `<button onclick="pushSubscribe('${rolle}').then(ok=>{if(ok)pushRenderInto('${elId}','${rolle}');})" style="${base};border:none;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff">🔔 Benachrichtigungen aktivieren</button>`;
}
// Trainer: Push an alle (subscribed) Eltern senden – via Edge Function push-send.
async function pushSendToParents(title, body, url){
  try{
    const r=await fetch(`${SB_URL}/functions/v1/push-send`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({audience:"parents",title,body,url:url||"./"})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){toast(d.error||"Push fehlgeschlagen","err");return false;}
    toast(`🔔 Push an ${d.sent||0} Eltern gesendet`);
    return true;
  }catch(e){toast("Netzwerkfehler","err");return false;}
}

/* A11y: Esc schließt das oberste offene Overlay (mit korrektem Cleanup für Spezial-Overlays). */
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  // Overlays mit eigener Aufräum-Logik zuerst
  if(document.getElementById("at-live")&&typeof atLiveClose==="function"){atLiveClose();return;}
  if(document.getElementById("adler-wrapped")&&typeof adlerWrappedClose==="function"){adlerWrappedClose();return;}
  // Generische Modals (id endet auf -modal) – das zuletzt geöffnete schließen
  const modals=[...document.querySelectorAll('[id$="-modal"]')].filter(el=>getComputedStyle(el).position==="fixed");
  if(modals.length){ modals[modals.length-1].remove(); }
});

/* ═══════════════════════════════════
   HOTFIX 3-Frontend: datum -> termin_id (gecacht). Damit anwesenheit &
   match_actions die echte FK-Kopplung fuellen und der ON DELETE CASCADE
   real greift. Kein Termin am Datum -> null (FK erlaubt null, kein Cascade nötig).
═══════════════════════════════════ */
let _terminIdCache={};
function terminIdCacheClear(){ _terminIdCache={}; try{ if(typeof _termineSel==="object"&&_termineSel)_termineSel.at=0; }catch(e){} } // auch die Termin-Dropdown-Liste neu laden
async function terminIdForDatum(datum){
  if(!datum)return null;
  if(Object.prototype.hasOwnProperty.call(_terminIdCache,datum))return _terminIdCache[datum];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(datum)}&select=id&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const rows=await r.json();return (_terminIdCache[datum]=(rows[0]&&rows[0].id)||null);}
  }catch(e){}
  return null;
}

/* ── Einheitlicher Modal-Kopf im App-Look (Design-Sprache v293+): farbige Icon-Kachel +
   Titel + Untertitel + Schließen-×. Band mit Links-Akzent, funktioniert bei jedem
   Card-Padding (keine negativen Margins). col = Familien-Farbe der Kategorie. ── */
function mdlHead(modalId,emoji,title,sub,col){
  col=col||"#1e3a8a";
  return `<div style="display:flex;align-items:center;gap:11px;margin-bottom:12px;padding:10px 12px;background:linear-gradient(90deg,${col}18,${col}05);border-left:4px solid ${col};border-radius:12px">
    <div style="width:38px;height:38px;flex:none;border-radius:11px;background:${col};display:flex;align-items:center;justify-content:center;font-size:19px;box-shadow:0 2px 6px ${col}55">${emoji}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:15.5px;font-weight:800;line-height:1.2;color:var(--text)">${title}</div>
      ${sub?`<div style="font-size:11px;color:var(--text2);margin-top:1px">${sub}</div>`:""}
    </div>
    <button onclick="document.getElementById('${modalId}')?.remove()" aria-label="Schließen" style="border:none;background:transparent;font-size:24px;color:var(--text2);cursor:pointer;line-height:1;padding:4px;flex:none">×</button>
  </div>`;
}

/* ── Android-Zurück schließt das oberste Fenster statt der App (PWA-Back-Falle, PO-Feedback).
   Jedes direkt am body geöffnete Fenster (id endet auf -modal/-ov/-overlay) bekommt beim
   Öffnen einen History-Eintrag; die Zurück-Taste schließt es dann. Schließen per ×
   verbraucht den Eintrag still. BEWUSST ausgenommen: #kabine (Zurück würde sonst den
   Kabinen-Code umgehen) und #el-cat-overlay (display-basiert; eigenes Wiring). ── */
window._mdlSuppress=0;
(function(){
  const RX=/(-modal|-ov|-overlay)$/;
  const stack=[];
  const isM=n=>n&&n.nodeType===1&&RX.test(n.id||"")&&n.id!=="el-cat-overlay";
  function start(){
    new MutationObserver(ms=>{
      for(const m of ms){
        m.addedNodes&&m.addedNodes.forEach(n=>{ if(isM(n)){ stack.push(n.id); try{history.pushState({adlerMdl:n.id},"");}catch(e){} } });
        m.removedNodes&&m.removedNodes.forEach(n=>{ if(isM(n)){ const i=stack.lastIndexOf(n.id); if(i>=0){ stack.splice(i,1); window._mdlSuppress++; try{history.back();}catch(e){window._mdlSuppress--;} } } });
      }
    }).observe(document.body,{childList:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  window.addEventListener("popstate",()=>{
    if(window._mdlSuppress>0){window._mdlSuppress--;return;}
    // Eltern-Kategorie-Fenster (wird nur versteckt, nicht entfernt) zuerst schließen
    try{ const ov=document.getElementById("el-cat-overlay"); if(ov&&ov.style.display==="block"&&typeof elternCatClose==="function"){ elternCatClose(true); return; } }catch(e){}
    const id=stack.pop();
    if(id){ const el=document.getElementById(id); if(el)el.remove(); }
  });
})();
