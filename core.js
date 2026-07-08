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
   Quiz-Sync (quiz_progress) läuft weiter über den Anon-Key.
═══════════════════════════════════ */
const SB_TOKEN_KEY="adler_sb_auth";
function sbToken(){
  try{
    const t=JSON.parse(localStorage.getItem(SB_TOKEN_KEY)||"null");
    if(t&&t.access_token&&(t.expires_at*1000)>Date.now()+60000)return t.access_token;
  }catch(e){}
  return null;
}
function sbAuthHeaders(extra){
  const tok=sbToken();
  return Object.assign({'apikey':SB_KEY,'Authorization':'Bearer '+(tok||SB_KEY),'Content-Type':'application/json'},extra||{});
}
// Bei 401: Token verwerfen und Login zeigen (gibt true zurück, wenn 401 behandelt wurde)
function sbCheck401(res){
  if(res&&res.status===401&&!document.body.classList.contains("quiz-extern")){
    localStorage.removeItem(SB_TOKEN_KEY);
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
  localStorage.setItem(SB_TOKEN_KEY,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token||null,expires_at:expiresAt}));
  return true;
}
/* Silent Token Refresh (Schritt 6): Session vor Ablauf still erneuern, damit man
   z. B. mitten im Turnier nicht plötzlich ausgeloggt wird. Nutzt den refresh_token. */
function sbSession(){ try{return JSON.parse(localStorage.getItem(SB_TOKEN_KEY)||"null");}catch(e){return null;} }
let sbRefreshing=null;
function sbRefreshToken(){
  if(sbRefreshing)return sbRefreshing; // parallele Aufrufe teilen sich denselben Refresh
  const s=sbSession();
  if(!s||!s.refresh_token)return Promise.resolve(false);
  sbRefreshing=(async()=>{
    try{
      const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`,{
        method:"POST",headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:s.refresh_token})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data.access_token)return false;
      const expiresAt=data.expires_at||(Math.floor(Date.now()/1000)+(data.expires_in||3600));
      localStorage.setItem(SB_TOKEN_KEY,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token||s.refresh_token,expires_at:expiresAt}));
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
  gate.innerHTML=`<div style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:24px;max-width:340px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.15)">
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
function ensureLogin(){
  if(new URLSearchParams(location.search).has("quiz"))return;
  if(!sbToken())showLoginGate();
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
  document.getElementById("p-date").value=p.datum||"";
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
}

/* ═══════════════════════════════════
   ADLER-XP (Welle 1, FEAT S+T)
   Punkte vergibt AUSSCHLIESSLICH die security-definer-RPC xp_award_event
   (fixe Punktwerte, Idempotenz via quelle_id, Eltern-nur-eigenes-Kind,
   Double-XP-Booster serverseitig). Der Client ruft nur auf und zeigt an.
   Fehler laufen still ins Leere – XP dürfen nie einen Kern-Flow blockieren.
   KEIN öffentliches Leaderboard (bewusste Produktentscheidung).
═══════════════════════════════════ */
const XP_BADGES=[
  {min:400,t:"Adler-Legende",emo:"👑"},
  {min:150,t:"Adler",emo:"🦅"},
  {min:50,t:"Adler-Nachwuchs",emo:"⭐"},
  {min:0,t:"Küken",emo:"🐣"}
];
function xpBadge(total){return XP_BADGES.find(b=>(total||0)>=b.min)||XP_BADGES[XP_BADGES.length-1];}

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
function pwaInstallNudge(){
  if(_pwaStandalone())return;                                   // läuft schon als App
  let dismissed=0; try{dismissed=+localStorage.getItem("adler_pwa_nudge")||0;}catch(e){}
  if(Date.now()-dismissed < 14*864e5)return;                    // 14 Tage Ruhe nach Wegklicken
  const ua=navigator.userAgent||"";
  const iOS=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1); // iPadOS meldet sich als Mac
  const safari=/^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  if(iOS&&safari){pwaBannerShow("ios");return;}
  if(_pwaPrompt){pwaBannerShow("android");return;}
  _pwaWant=true;                                                // Android: warten bis beforeinstallprompt feuert
}
function pwaBannerDismiss(){try{localStorage.setItem("adler_pwa_nudge",String(Date.now()));}catch(e){}document.getElementById("pwa-nudge")?.remove();}
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
  if(kind==="ios"){
    el.innerHTML=`${close}<div style="font-weight:800;font-size:15px;margin-bottom:4px">📱 Adler-App aufs Handy</div>
      <div style="font-size:12.5px;line-height:1.55;opacity:.96">Tippe unten in Safari auf <b>Teilen</b> <span style="display:inline-block;border:1px solid rgba(255,255,255,.6);border-radius:5px;padding:0 5px">↑</span> und dann auf <b>„Zum Home-Bildschirm"</b> – danach startet die App wie eine echte App.</div>`;
  }else{
    el.innerHTML=`${close}<div style="font-weight:800;font-size:15px;margin-bottom:8px">📱 Adler-App installieren</div>
      <div style="font-size:12.5px;opacity:.96;margin-bottom:10px">Auf den Startbildschirm – schneller Zugriff, funktioniert auch offline.</div>
      <button onclick="pwaBannerInstall()" style="background:#fff;color:#1e3a8a;border:none;border-radius:10px;padding:9px 16px;font-family:inherit;font-weight:800;font-size:13.5px;cursor:pointer">Installieren</button>`;
  }
  document.body.appendChild(el);
}
