/* ═══════════════════════════════════
   KIDS-MODE "DIE KABINE" (Phase 11-P) – kindersicheres Vollbild (read-only), Exit nur
   ueber Mathe-Aufgabe. Inhalt: Team-Galerie (opt-in Fotos), Quiz, Missionen.
   isKidsMode ist ein UX-Schloss (versteckt Editierbares) – die echte Sicherheit bleibt
   die RLS: die Eltern-Session kann ohnehin nur das eigene Kind schreiben.
═══════════════════════════════════ */
let isKidsMode=false, kabineGalleryData=[], kabineIdx=0;
async function kabineOpen(){
  isKidsMode=true;
  document.getElementById("kabine")?.remove();
  const m=document.createElement("div");m.id="kabine";
  m.style.cssText="position:fixed;inset:0;z-index:10050;background:linear-gradient(160deg,#0f172a,#1e3a8a);color:#fff;display:flex;flex-direction:column;overflow:hidden";
  m.innerHTML='<div id="kabine-body" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>';
  document.body.appendChild(m);
  kabineHome();
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/team_gallery`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)kabineGalleryData=await r.json();}catch(e){}
  if(typeof loadTeamConfig==="function"){try{await loadTeamConfig();}catch(e){}}
}
/* C1 – Kollektives Adler-Level: die ganze Mannschaft steigt gemeinsam (Summe aller Federn,
   RPC team_federn_total). Ein Wir-Ziel statt Einzel-Ranking. */
const TEAM_LEVEL_STEP=500;
const TEAM_LEVEL_TITLES=["Küken-Schwarm","Junge Adler","Adler-Rudel","Adler-Elite","Adler-Legenden","Adler-Dynastie"];
function teamLevelInfo(total){
  total=Math.max(0,total|0);
  const level=Math.floor(total/TEAM_LEVEL_STEP)+1, into=total%TEAM_LEVEL_STEP;
  return {level,into,need:TEAM_LEVEL_STEP-into,pct:Math.round(into/TEAM_LEVEL_STEP*100),total,
    title:TEAM_LEVEL_TITLES[Math.min(level-1,TEAM_LEVEL_TITLES.length-1)]};
}
let _teamFedern={val:0,at:0};
async function teamLevelLoad(elId){
  const el=document.getElementById(elId); if(!el)return;
  let total=_teamFedern.val;
  if(Date.now()-_teamFedern.at>60000){ // R4: 60s-Cache – wird von mehreren Slots gleichzeitig gerendert
    try{const h=sbToken()?sbAuthHeaders():{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
      const r=await fetch(`${SB_URL}/rest/v1/rpc/team_federn_total`,{method:"POST",headers:{...h,'Content-Type':'application/json'},body:"{}"});
      if(r.ok){total=await r.json();_teamFedern={val:total||0,at:Date.now()};}}catch(e){}
  }
  const L=teamLevelInfo(total||0);
  el.innerHTML=`<div style="background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border-radius:16px;padding:14px 16px">
    <div style="display:flex;align-items:center;gap:10px"><span style="font-size:26px">🦅</span>
      <div style="flex:1;min-width:0"><div style="font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:.5px">Team-Level ${L.level}</div>
      <div style="font-size:16px;font-weight:900">${esc(L.title)}</div></div>
      <div style="font-size:12px;opacity:.9;white-space:nowrap">${XP_ICON} ${L.total}</div>
    </div>
    <div style="height:10px;background:rgba(255,255,255,.25);border-radius:6px;overflow:hidden;margin-top:10px"><div style="height:100%;width:${L.pct}%;background:#fbbf24;border-radius:6px;transition:width .6s"></div></div>
    <div style="font-size:11px;opacity:.92;margin-top:6px">Noch ${L.need} ${XP_LABEL} bis Level ${L.level+1} – jede Feder zählt fürs ganze Team!</div>
  </div>`;
}
/* C2 – Panini-Sammelalbum: die Karten der Teamkollegen werden durch Antippen freigeschaltet
   (lokal gemerkt). Sammel-Gefühl fürs ganze Team – Fortschritt X/Y. */
function _albumGet(){ try{return JSON.parse(localStorage.getItem("adler_album")||"{}");}catch(e){return {};} }
function kabineAlbum(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const data=(typeof kabineGalleryData!=="undefined"&&kabineGalleryData)||[];
  const col=_albumGet();
  const got=data.filter(g=>col[g.name]).length;
  const cards=data.map(g=>{
    const on=!!col[g.name];
    return `<button onclick="kabineAlbumTap('${String(g.name).replace(/'/g,"")}')" style="border:none;border-radius:14px;aspect-ratio:3/4;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;${on?"background:linear-gradient(135deg,#f59e0b,#ec4899);color:#fff;box-shadow:0 4px 14px rgba(236,72,153,.4)":"background:rgba(255,255,255,.08);color:rgba(255,255,255,.45)"}">
      <span style="font-size:30px">${on?"🦅":"❓"}</span>
      <span style="font-size:12px;font-weight:800">${on?esc(g.name):"?"}</span>
      ${on&&g.nr!=null?`<span style="font-size:10px;opacity:.9">#${g.nr}</span>`:""}
    </button>`;
  }).join("");
  b.innerHTML=`<div style="flex:1;overflow-y:auto;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800">📖 Sammelalbum</div>
      <div style="font-size:13px;font-weight:800;opacity:.9">${got}/${data.length}</div>
    </div>
    <div style="font-size:11.5px;opacity:.8;padding:0 16px 8px;text-align:center">Tippe auf eine Karte, um sie freizuschalten – sammle das ganze Team! ${got===data.length&&data.length?"🎉 Komplett!":""}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 16px 16px">${cards||'<div style="opacity:.7;grid-column:1/-1;text-align:center;padding:20px">Noch keine Karten im Team.</div>'}</div>
  </div>`;
}
function kabineAlbumTap(name){
  const c=_albumGet();
  if(!c[name]){ c[name]=1; try{localStorage.setItem("adler_album",JSON.stringify(c));}catch(e){} try{navigator.vibrate&&navigator.vibrate([20,30,40]);}catch(e){} }
  kabineAlbum();
}
/* C5 – Trainer-Sprachlob: der Trainer nimmt ein kurzes Lob auf (MediaRecorder → Storage),
   das Kind hört es im Eltern-Bereich/der Kabine. Bucket kabine-lob (privat, signierte URLs). */
let _lobRec=null,_lobChunks=[],_lobBlob=null,_lobSpieler=null,_lobName="";
function lobRecordOpen(spielerId,name){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  if(!(navigator.mediaDevices&&window.MediaRecorder)){toast("Aufnahme wird hier nicht unterstützt","err");return;}
  _lobBlob=null;_lobChunks=[];_lobSpieler=spielerId;_lobName=name||"";
  document.getElementById("lob-modal")?.remove();
  const m=document.createElement("div");m.id="lob-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10003;display:flex;align-items:center;justify-content:center;padding:16px";
  m.onclick=e=>{if(e.target===m){lobRecStop();m.remove();}};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:18px;max-width:400px;width:100%">
    ${mdlHead("lob-modal","🎤",`Sprachlob für ${esc(_lobName)}`,"","#db2777")}
    <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Kurzes Lob aufnehmen – ${esc(_lobName)} hört es im Eltern-Bereich unter „Für dein Kind".</div>
    <div id="lob-ui" style="text-align:center"></div>
    <button class="btn btn-sm" style="width:100%;margin-top:14px" onclick="lobRecStop();document.getElementById('lob-modal').remove()">Schließen</button>
  </div>`;
  document.body.appendChild(m);
  lobUI("idle");
}
function lobUI(state){
  const el=document.getElementById("lob-ui"); if(!el)return;
  if(state==="recording") el.innerHTML=`<div style="font-size:40px">🔴</div><div style="font-size:13px;color:#dc2626;font-weight:700;margin:6px 0">Aufnahme läuft…</div><button class="btn btn-p" onclick="lobRecStop()"><i class="ti ti-player-stop"></i>Stopp</button>`;
  else if(state==="ready") el.innerHTML=`<audio controls src="${_lobBlob?URL.createObjectURL(_lobBlob):""}" style="width:100%"></audio><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-sm" onclick="lobRecStart()"><i class="ti ti-refresh"></i>Neu</button><button class="btn btn-p btn-sm" style="margin-left:auto" onclick="lobUpload(this)"><i class="ti ti-cloud-upload"></i>An das Kind senden</button></div>`;
  else el.innerHTML=`<button class="btn btn-p" onclick="lobRecStart()"><i class="ti ti-microphone"></i>Aufnahme starten</button>`;
}
async function lobRecStart(){
  _lobBlob=null;_lobChunks=[];
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    _lobRec=new MediaRecorder(stream);
    _lobRec.ondataavailable=e=>{if(e.data&&e.data.size)_lobChunks.push(e.data);};
    _lobRec.onstop=()=>{ _lobBlob=new Blob(_lobChunks,{type:(_lobRec&&_lobRec.mimeType)||"audio/webm"}); try{stream.getTracks().forEach(t=>t.stop());}catch(_){} lobUI("ready"); };
    _lobRec.start(); lobUI("recording");
  }catch(e){ toast("Mikrofon nicht verfügbar – bitte erlauben.","err"); }
}
function lobRecStop(){ try{ if(_lobRec&&_lobRec.state==="recording")_lobRec.stop(); }catch(e){} }
async function lobUpload(btn){
  if(!_lobBlob||!_lobSpieler){toast("Erst aufnehmen","err");return;}
  if(btn)btn.disabled=true;
  const ext=(_lobBlob.type||"").includes("mp4")?"mp4":"webm";
  const path=`${_lobSpieler}/${Date.now()}.${ext}`;
  try{
    const up=await fetch(`${SB_URL}/storage/v1/object/kabine-lob/${path}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':_lobBlob.type||"audio/webm"},body:_lobBlob});
    if(!up.ok){toast("Upload fehlgeschlagen","err");if(btn)btn.disabled=false;return;}
    const r=await fetch(`${SB_URL}/rest/v1/kabine_lob`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({spieler_id:_lobSpieler,path})});
    if(sbCheck401(r)){if(btn)btn.disabled=false;return;}
    if(!r.ok){toast(sbDeniedMsg(r,"Speichern fehlgeschlagen"),"err");if(btn)btn.disabled=false;return;}
    toast("🎤 Sprachlob gesendet ✓");
    document.getElementById("lob-modal")?.remove();
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;}
}
// Kind/Eltern: jüngstes Sprachlob abspielen (signierte URL aus dem privaten Bucket).
async function lobPlay(spielerId){
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kabine_lob?spieler_id=eq.${spielerId}&select=path&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)row=(await r.json())[0];}catch(e){}
  if(!row){toast("Noch kein Sprachlob da 🙂","err");return;}
  try{
    const sr=await fetch(`${SB_URL}/storage/v1/object/sign/kabine-lob/${row.path}`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})});
    const sj=await sr.json();
    if(sj&&sj.signedURL){ new Audio(`${SB_URL}/storage/v1${sj.signedURL}`).play().catch(()=>toast("Tippe nochmal zum Abspielen","err")); }
    else toast("Konnte nicht abspielen","err");
  }catch(e){toast("Konnte nicht abspielen","err");}
}
/* C3 – Team-Arena: Einlauf-Song + Schlachtruf (team_config). Identität wie bei den Großen. */
async function arenaKabineLoad(elId){
  const el=document.getElementById(elId); if(!el)return;
  let cfg={};
  try{const h=sbToken()?sbAuthHeaders():{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=einlauf_song,schlachtruf`,{headers:h});if(r.ok)cfg=((await r.json())[0])||{};}catch(e){}
  if(!cfg.einlauf_song&&!cfg.schlachtruf){ el.innerHTML=""; return; }
  el.innerHTML=`<div style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:12px 14px;text-align:center">
    ${cfg.schlachtruf?`<div style="font-size:15px;font-weight:900">📣 „${esc(cfg.schlachtruf)}"</div>`:""}
    ${cfg.einlauf_song?`<div style="font-size:12px;opacity:.9;margin-top:${cfg.schlachtruf?4:0}px">🎵 Einlauf-Song: ${esc(cfg.einlauf_song)}</div>`:""}
  </div>`;
}
async function arenaEditOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  let cfg={};
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=einlauf_song,schlachtruf`,{headers:sbAuthHeaders()});if(r.ok)cfg=((await r.json())[0])||{};}catch(e){}
  document.getElementById("arena-modal")?.remove();
  const m=document.createElement("div");m.id="arena-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const fld="width:100%;box-sizing:border-box;padding:10px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text);margin-top:4px";
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:420px;width:100%;margin:auto">
    ${mdlHead("arena-modal","🏟️","Team-Arena","","#8b5cf6")}
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Schlachtruf & Einlauf-Song – die Kinder sehen sie in der Kabine.</div>
    <label style="font-size:11px;color:var(--text2)">📣 Schlachtruf<input id="ar-ruf" value="${esc(cfg.schlachtruf||"")}" placeholder="z. B. Adler, Adler – hui hui hui!" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:10px">🎵 Einlauf-Song<input id="ar-song" value="${esc(cfg.einlauf_song||"")}" placeholder="z. B. We Are The Champions – Queen" style="${fld}"></label>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-p btn-sm" onclick="arenaSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('arena-modal').remove()">Schließen</button>
    </div>`;
  document.body.appendChild(m);
}
async function arenaSave(btn){
  const schlachtruf=(document.getElementById("ar-ruf")?.value||"").trim()||null;
  const einlauf_song=(document.getElementById("ar-song")?.value||"").trim()||null;
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({id:1,schlachtruf,einlauf_song,updated_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Arena gespeichert ✓");
  document.getElementById("arena-modal")?.remove();
}
function kabineHome(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`
    <div style="flex:1;overflow-y:auto">
    <div style="text-align:center;padding:18px 16px 6px">
      <div style="font-size:22px;font-weight:900">🦅 Die Kabine</div>
      <div style="font-size:12px;opacity:.8">Adler U9 · Kinder-Modus</div>
    </div>
    <div id="kab-level" style="padding:2px 16px 6px"></div>
    <div id="kab-countdown"></div>
    <div id="kab-reveal"></div>
    <div id="kab-pack"></div>
    <div id="kab-post"></div>
    <div id="kab-wahl"></div>
    <div id="kab-stimmung"></div>
    <div id="kab-milestone"></div>
    <div id="kab-arena" style="padding:0 16px 4px"></div>
    ${(function(){
      // Kacheln in 4 Farbfamilien (wie im Eltern-Bereich: Farbtöne je Kategorie). Getönte,
      // halbtransparente Gradients bleiben „frosted", leuchten aber je Familie anders.
      const tile=(fn,emo,label,c1,c2,full)=>`<button onclick="${fn}" style="${full?"grid-column:1/-1;":""}border:1px solid rgba(255,255,255,.16);border-radius:22px;background:linear-gradient(135deg,${c1},${c2});color:#fff;font-family:inherit;cursor:pointer;display:flex;${full?"align-items:center;justify-content:center;gap:10px;min-height:76px":"flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:120px"};font-size:17px;font-weight:800"><span style="font-size:${full?34:44}px">${emo}</span>${label}</button>`;
      const lbl=t=>`<div style="grid-column:1/-1;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;opacity:.65;margin:6px 4px -4px">${t}</div>`;
      return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:10px 16px 16px;align-content:center">
      ${lbl("Spielen & Lernen")}
      ${tile("kabineQuiz('taktik')","🎯","Taktik-Quiz","rgba(56,189,248,.50)","rgba(2,132,199,.30)")}
      ${tile("kabineQuiz('wissen')","🧠","Fußball-Wissen","rgba(14,165,233,.44)","rgba(3,105,161,.30)")}
      ${lbl("Meine Sachen")}
      ${tile("kabineMyCard()","🃏","Meine Karte","rgba(168,85,247,.50)","rgba(124,58,237,.32)")}
      ${tile("kabineAbzeichen()","🎖️","Abzeichen","rgba(147,51,234,.46)","rgba(109,40,217,.30)")}
      ${tile("kabineMission()","🎯","Meine Mission","rgba(139,92,246,.46)","rgba(91,33,182,.32)")}
      ${tile("kabineRollen()","🎽","Wo spiele ich?","rgba(124,58,237,.46)","rgba(76,29,149,.32)")}
      ${tile("kabineStaerken()","💪","Meine Stärken","rgba(147,51,234,.5)","rgba(88,28,135,.32)",true)}
      ${lbl("Challenges")}
      ${tile("kabineShowQuests()","🏆","Missionen","rgba(245,158,11,.52)","rgba(217,119,6,.32)")}
      ${tile("kabineSkillWoche()","🎬","Skill der Woche","rgba(251,146,60,.48)","rgba(234,88,12,.30)")}
      ${lbl("Team & Spaß")}
      ${tile("kabineKudos()","👏","Kompliment schenken","rgba(16,185,129,.52)","rgba(5,150,105,.32)")}
      ${tile("kabineShowGallery()","🖼️","Team-Galerie","rgba(16,185,129,.48)","rgba(5,150,105,.30)")}
      ${tile("kabineHype()","🎵","Kabinen-Hype","rgba(45,212,191,.44)","rgba(13,148,136,.30)")}
      ${tile("kabineAlbum()","📖","Sammelalbum","rgba(52,211,153,.46)","rgba(4,120,87,.30)")}
      ${tile("kabineReporter()","🎙️","Kabinen-Reporter","rgba(20,184,166,.5)","rgba(15,118,110,.32)",true)}
    </div>`;})()}
    </div>
    <button onclick="kabineExit()" style="margin:0 16px 18px;padding:12px;border:none;border-radius:14px;background:rgba(0,0,0,.25);color:#fff;font-family:inherit;font-size:14px;cursor:pointer">🔒 Für Erwachsene: Kabine verlassen</button>`;
  teamLevelLoad("kab-level");                                  // C1: Team-Level
  if(typeof arenaKabineLoad==="function")arenaKabineLoad("kab-arena"); // C3: Einlauf-Song/Schlachtruf
  kabineCountdownLoad();                                        // G6: Countdown bis zum nächsten Spiel
  kabineRevealLoad();                                           // H4: Rollen-Reveal am Spieltag
  kabinePackLoad();                                             // H3: Spieltag-Packliste
  kabinePostLoad();                                             // I-A: 📬 Adler-Post (Kudos + Genesungsgrüße)
  kabineWahlLoad();                                             // I-A: 🗳️ Kabinen-Wahl
  kabineStimmungLoad();                                         // H2: Kinder-Stimmungs-Check
  kabineMilestoneLoad();                                        // H7: frische Team-Meilensteine feiern
}
// G6: „Noch X× schlafen bis zum nächsten Spiel!" – Motivation im Kinder-Modus.
async function kabineCountdownLoad(){
  const el=document.getElementById("kab-countdown"); if(!el)return;
  const heute=new Date().toISOString().slice(0,10);
  let t=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=datum,typ,gegner,titel&typ=in.(spiel,turnier)&datum=gte.${heute}&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0]||null;}catch(e){}
  if(!t){el.innerHTML="";return;}
  const d=new Date(t.datum+"T00:00:00"), today=new Date(heute+"T00:00:00");
  const days=Math.round((d-today)/864e5);
  const label=days<=0?"Heute ist Spieltag! 🔥":days===1?"Morgen ist Spieltag! 🔥":`Noch ${days}× schlafen bis zum Spiel!`;
  el.innerHTML=`<div style="margin:2px 16px 8px;background:rgba(255,255,255,.14);border-radius:16px;padding:12px;text-align:center;color:#fff">
    <div style="font-size:15px;font-weight:900">⚽ ${label}</div>
    <div style="font-size:12px;opacity:.85;margin-top:2px">${t.typ==="turnier"?"🏆 Turnier":"gegen "+esc(t.gegner||t.titel||"?")} · ${["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]}, ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</div>
  </div>`;
}
/* H4 – Rollen-Reveal: hat der Trainer für HEUTE eine Aufstellung gespeichert, darf das Kind
   seine Rolle in der Kabine „aufdecken" (RPC kind_rolle_heute, weil aufstellungen trainer-only ist). */
const KAB_ROLLEN={tw:["🥅","TORWART"],auf:["🛡️","AUFPASSER"],fll:["⚡","FLITZER LINKS"],flr:["⚡","FLITZER RECHTS"],jaeg:["🎯","JÄGER"]};
async function kabineRevealLoad(){
  const el=document.getElementById("kab-reveal"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  const heute=new Date().toISOString().slice(0,10);
  let hatSpiel=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=id&typ=in.(spiel,turnier)&datum=eq.${heute}&limit=1`,{headers:sbAuthHeaders()});if(r.ok)hatSpiel=!!(await r.json()).length;}catch(e){}
  if(!hatSpiel){el.innerHTML="";return;}
  const rollen=[];
  await Promise.all(kids.map(async k=>{
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_rolle_heute`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:k.spieler_id})});
      if(r.ok){const d=await r.json();if(d&&d.ok&&d.rolle&&KAB_ROLLEN[d.rolle])rollen.push({sid:k.spieler_id,name:(k.kader&&k.kader.name)||"",rolle:d.rolle});}}catch(e){}
  }));
  if(!rollen.length){el.innerHTML="";return;}
  el.innerHTML=rollen.map(x=>{
    let seen=null; try{seen=localStorage.getItem(`adler_reveal_${x.sid}_${heute}`);}catch(e){}
    if(seen){const R=KAB_ROLLEN[x.rolle];
      return `<div style="margin:2px 16px 8px;background:linear-gradient(135deg,rgba(168,85,247,.5),rgba(124,58,237,.32));border-radius:16px;padding:12px;text-align:center;color:#fff">
        <div style="font-size:12px;opacity:.85">${esc(x.name)} – deine Rolle heute:</div>
        <div style="font-size:20px;font-weight:900;margin-top:2px">${R[0]} ${R[1]}</div></div>`;}
    return `<button onclick="kabineRevealShow(${x.sid},'${x.rolle}','${jsq(x.name)}')" style="display:flex;align-items:center;gap:10px;margin:2px 16px 8px;width:calc(100% - 32px);border:1px solid rgba(255,255,255,.2);border-radius:16px;background:linear-gradient(135deg,rgba(168,85,247,.6),rgba(124,58,237,.4));color:#fff;font-family:inherit;cursor:pointer;padding:14px;text-align:left">
      <span style="font-size:26px">🎁</span>
      <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:900">${esc(x.name)} – deine Rolle für heute ist da!</span>
      <span style="display:block;font-size:11.5px;opacity:.9">Tippe zum Aufdecken 🤫</span></span>
    </button>`;
  }).join("");
}
function kabineRevealShow(sid,rolle,name){
  const heute=new Date().toISOString().slice(0,10);
  try{localStorage.setItem(`adler_reveal_${sid}_${heute}`,"1");}catch(e){}
  const R=KAB_ROLLEN[rolle]||["⚽","ADLER"];
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div id="kab-reveal-view" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;position:relative;overflow:hidden;padding:24px;text-align:center;color:#fff">
    <div style="font-size:14px;opacity:.85">${esc(name)}, heute bist du…</div>
    <div style="font-size:78px;line-height:1">${R[0]}</div>
    <div style="font-size:30px;font-weight:900;letter-spacing:1px">${R[1]}</div>
    <div style="font-size:13px;opacity:.9;max-width:320px">Gib alles für dein Team – und hab Spaß dabei! 🦅</div>
    <button onclick="kabineHome()" style="margin-top:14px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Zurück zur Kabine</button>
  </div>`;
  try{navigator.vibrate&&navigator.vibrate([60,80,60,80,160]);}catch(e){}
  const cont=document.getElementById("kab-reveal-view");
  if(cont&&typeof confetti==="function")confetti(cont);
}
/* H3 – Spieltag-Packliste: ab dem Vorabend packt das Kind seine Tasche virtuell. Haken lokal
   (localStorage je Kind+Datum); alles gepackt → Konfetti + 5 Federn (xp_award_event 'packliste',
   idempotent über quelle_id – die Federn gibt es je Spieltag genau einmal). */
const KAB_PACK_ITEMS=["👟 Fußballschuhe","🦵 Schienbeinschoner","🧦 Stutzen","👕 Adler-Trikot","🥤 Trinkflasche","🧥 Jacke für danach","😄 Gute Laune"];
let _kabPackTermin=null;
function _kabPackGet(sid,datum){ try{return JSON.parse(localStorage.getItem(`adler_pack_${sid}_${datum}`)||"{}");}catch(e){return {};} }
async function kabinePackLoad(){
  const el=document.getElementById("kab-pack"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  const heute=new Date().toISOString().slice(0,10);
  let t=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=datum,typ,gegner,titel&typ=in.(spiel,turnier)&datum=gte.${heute}&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0]||null;}catch(e){}
  _kabPackTermin=t;
  if(!t){el.innerHTML="";return;}
  const days=Math.round((new Date(t.datum+"T00:00:00")-new Date(heute+"T00:00:00"))/864e5);
  if(days>1){el.innerHTML="";return;} // erst ab dem Vorabend
  const fertig=kids.every(k=>{const st=_kabPackGet(k.spieler_id,t.datum);return KAB_PACK_ITEMS.every((_,i)=>st[i]);});
  el.innerHTML=`<button onclick="kabinePack()" style="display:flex;align-items:center;gap:10px;margin:2px 16px 8px;width:calc(100% - 32px);border:1px solid rgba(255,255,255,.18);border-radius:16px;background:${fertig?"rgba(34,197,94,.28)":"linear-gradient(135deg,rgba(245,158,11,.55),rgba(217,119,6,.35))"};color:#fff;font-family:inherit;cursor:pointer;padding:12px 14px;text-align:left">
    <span style="font-size:26px">🎒</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:900">${fertig?"Tasche gepackt – stark! ✅":"Tasche packen fürs "+(t.typ==="turnier"?"Turnier":"Spiel")}</span>
    <span style="display:block;font-size:11.5px;opacity:.85">${days<=0?"Heute":"Morgen"} ist ${t.typ==="turnier"?"Turnier":"Spieltag"} – hast du alles dabei?</span></span>
    <span style="font-size:18px;opacity:.85">›</span>
  </button>`;
}
function kabinePack(){
  const kids=window._elternKids||[];
  if(!_kabPackTermin||!kids.length)return;
  if(kids.length===1){ kabinePackFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("🎒 Wessen Tasche?","kabinePackFor");
}
function kabinePackFor(sid,name){
  const b=document.getElementById("kabine-body"); if(!b||!_kabPackTermin)return;
  const t=_kabPackTermin, st=_kabPackGet(sid,t.datum);
  const alle=KAB_PACK_ITEMS.every((_,i)=>st[i]);
  b.innerHTML=`<div id="kab-pack-view" style="flex:1;overflow-y:auto;position:relative">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800">🎒 ${esc(name||"Meine")} Tasche</div>
    </div>
    <div style="font-size:12px;opacity:.85;padding:0 16px 10px;text-align:center;color:#fff">Pack deine Tasche fürs ${t.typ==="turnier"?"Turnier":"Spiel"} – Haken für alles, was drin ist!</div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 16px 16px">
      ${KAB_PACK_ITEMS.map((it,i)=>`<button onclick="kabinePackTap(${sid},${i},'${jsq(name)}')" style="display:flex;align-items:center;gap:12px;border:none;border-radius:16px;padding:14px;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;text-align:left;${st[i]?"background:linear-gradient(135deg,rgba(34,197,94,.55),rgba(5,150,105,.35));color:#fff":"background:rgba(255,255,255,.10);color:rgba(255,255,255,.92)"}">
        <span style="font-size:22px">${st[i]?"✅":"⬜"}</span><span style="flex:1">${it}</span>
      </button>`).join("")}
    </div>
    ${alle?`<div style="text-align:center;padding:0 16px 20px;font-size:15px;font-weight:900;color:#fff">Alles drin – du bist startklar! 🦅</div>`:""}
  </div>`;
}
async function kabinePackTap(sid,idx,name){
  if(!_kabPackTermin)return;
  const t=_kabPackTermin, st=_kabPackGet(sid,t.datum);
  st[idx]=st[idx]?0:1;
  try{localStorage.setItem(`adler_pack_${sid}_${t.datum}`,JSON.stringify(st));}catch(e){}
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  const alle=KAB_PACK_ITEMS.every((_,i)=>st[i]);
  kabinePackFor(sid,name);
  if(alle){
    const cont=document.getElementById("kab-pack-view");
    if(cont&&typeof confetti==="function")confetti(cont);
    try{navigator.vibrate&&navigator.vibrate([40,60,40,60,120]);}catch(e){}
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:sid,p_quelle:"packliste",p_quelle_id:"pack"+t.datum})});
      if(r.ok){const d=await r.json();if(d>0)toast(`🎒 Tasche gepackt – ${XP_ICON} +${d} ${XP_LABEL}!`);}
    }catch(e){}
  }
}
/* H2 – Kinder-Stimmungs-Check: am Tag eines Termins fragt die Kabine das Kind selbst
   („Wie war's heute?", 3 Smileys). Ein Eintrag pro Kind & Tag (kind_stimmung); die
   Eltern-Session darf per RLS nur die eigenen Kinder schreiben. Der Trainer sieht die
   Stimmungslage gebündelt im Saison-Cockpit. */
const KAB_MOODS=[[1,"😞"],[2,"😐"],[3,"😄"]];
async function kabineStimmungLoad(){
  const el=document.getElementById("kab-stimmung"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  const heute=new Date().toISOString().slice(0,10);
  let t=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=typ&datum=eq.${heute}&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0]||null;}catch(e){}
  if(!t){el.innerHTML="";return;}
  let done=[];
  try{const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kind_stimmung?spieler_id=in.(${ids})&datum=eq.${heute}&select=spieler_id`,{headers:sbAuthHeaders()});
    if(r.ok)done=(await r.json()).map(x=>x.spieler_id);}catch(e){}
  const offen=kids.filter(k=>!done.includes(k.spieler_id));
  if(!offen.length){el.innerHTML="";return;}
  const was=t.typ==="training"?"Training":"Spieltag";
  el.innerHTML=`<div style="margin:2px 16px 8px;background:rgba(255,255,255,.14);border-radius:16px;padding:12px 14px;color:#fff">
    <div style="font-size:14px;font-weight:900;text-align:center">Wie war dein ${was} heute?</div>
    ${offen.map(k=>`<div style="display:flex;align-items:center;gap:8px;margin-top:8px;justify-content:center">
      ${kids.length>1?`<span style="flex:1;font-size:13px;font-weight:700">${esc((k.kader&&k.kader.name)||"")}</span>`:""}
      ${KAB_MOODS.map(m=>`<button onclick="kabineStimmungSet(${k.spieler_id},${m[0]})" style="border:none;background:rgba(255,255,255,.12);border-radius:14px;width:60px;height:54px;font-size:28px;cursor:pointer">${m[1]}</button>`).join("")}
    </div>`).join("")}
  </div>`;
}
async function kabineStimmungSet(sid,mood){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_stimmung?on_conflict=spieler_id,datum`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({spieler_id:sid,datum:new Date().toISOString().slice(0,10),mood})});
    if(!r.ok&&r.status!==201){toast("Konnte nicht speichern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate([30,40,60]);}catch(e){}
  toast(mood===3?"Super! 😄":mood===2?"Danke dir! 🙂":"Danke, dass du ehrlich bist – dein Trainer ist für dich da! 💙");
  kabineStimmungLoad();
}
/* H7 – Team-Meilensteine: die RPC berechnet & persistiert Team-Marken (Tore/Spiele/Federn/
   „jeder hat getroffen"); frisch Erreichtes (14 Tage) wird in der Kabine gefeiert. */
async function kabineMilestoneLoad(){
  const el=document.getElementById("kab-milestone"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/team_meilensteine`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)rows=(await r.json())||[];}catch(e){}
  const grenze=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  const frisch=(rows||[]).filter(m=>m.erreicht_am>=grenze).slice(0,2);
  if(!frisch.length){el.innerHTML="";return;}
  el.innerHTML=frisch.map(m=>`<div style="margin:2px 16px 8px;background:linear-gradient(135deg,rgba(251,191,36,.5),rgba(245,158,11,.3));border-radius:16px;padding:12px;text-align:center;color:#fff">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.85">🎉 Team-Meilenstein</div>
    <div style="font-size:15px;font-weight:900;margin-top:2px">${esc(m.label)}</div>
  </div>`).join("");
}
/* I-A – Adler-Post: Kind→Kind-Komplimente (Kudos) & Genesungsgrüße in EINER Tabelle
   (kabine_post). Vordefinierte Texte (text_key) statt Freitext → keine Moderationslast.
   Anti-Spam: 1 Post je Absender→Empfänger & Tag (DB-Unique). Der Empfangs-Slot bündelt
   alles Persönliche in EINEM Briefkasten, damit die Kabine oben nicht zustaut. */
const KUDOS_TEXTE=["⚽ Starker Pass!","🔥 Super gekämpft!","👏 Du hast mich angefeuert!","🤝 Du bist mega fair!","😄 Mit dir macht's am meisten Spaß!","🛡️ Starke Abwehr!","🎯 Tolles Tor!","💪 Du gibst nie auf!"];
const GENESUNG_TEXTE=["💌 Gute Besserung!","🦅 Wir vermissen dich!","💪 Komm bald wieder!","⚽ Der Platz wartet auf dich!"];
function kabinePostText(typ,key){ const L=typ==="genesung"?GENESUNG_TEXTE:KUDOS_TEXTE; return L[key]||L[0]; }
async function kabinePostLoad(){
  const el=document.getElementById("kab-post"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  let neu=0;
  try{const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kabine_post?an_spieler=in.(${ids})&gesehen=eq.false&select=id`,{headers:sbAuthHeaders()});
    if(r.ok)neu=((await r.json())||[]).length;}catch(e){}
  if(!neu){el.innerHTML="";return;}
  el.innerHTML=`<button onclick="kabinePostOpen()" style="display:flex;align-items:center;gap:10px;margin:2px 16px 8px;width:calc(100% - 32px);border:1px solid rgba(255,255,255,.2);border-radius:16px;background:linear-gradient(135deg,rgba(236,72,153,.55),rgba(190,24,93,.35));color:#fff;font-family:inherit;cursor:pointer;padding:14px;text-align:left">
    <span style="font-size:26px">📬</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:900">Deine Adler-Post ist da!</span>
    <span style="display:block;font-size:11.5px;opacity:.9">${neu} neue Nachricht${neu===1?"":"en"} – tippe zum Öffnen 💌</span></span>
  </button>`;
}
async function kabinePostOpen(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const kids=window._elternKids||[];
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  const ab=new Date(Date.now()-14*864e5).toISOString();
  let rows=[];
  try{const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kabine_post?an_spieler=in.(${ids})&created_at=gte.${ab}&select=*&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(r.ok)rows=(await r.json())||[];}catch(e){}
  // Absender-Namen (Kader ist für Eltern lesbar: id, name, nr)
  const nameById={};
  try{const von=[...new Set(rows.map(x=>x.von_spieler))].join(",");
    if(von){const r=await fetch(`${SB_URL}/rest/v1/kader?id=in.(${von})&select=id,name`,{headers:sbAuthHeaders()});
      if(r.ok)(await r.json()).forEach(k=>nameById[k.id]=k.name);}}catch(e){}
  const kidName=sid=>{const k=kids.find(x=>x.spieler_id===sid);return (k&&k.kader&&k.kader.name)||"";};
  const neuIds=rows.filter(x=>!x.gesehen).map(x=>x.id);
  b.innerHTML=`<div id="kab-post-view" style="flex:1;overflow-y:auto;position:relative">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">📬 Adler-Post</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 16px 16px">
      ${rows.length?rows.map(x=>`<div style="border-radius:16px;padding:14px;color:#fff;background:${x.typ==="genesung"?"linear-gradient(135deg,rgba(244,63,94,.5),rgba(190,18,60,.32))":"linear-gradient(135deg,rgba(236,72,153,.5),rgba(147,51,234,.32))"};${x.gesehen?"opacity:.75":""}">
        <div style="font-size:11px;opacity:.85">${x.gesehen?"":"🆕 "}von <b>${esc(nameById[x.von_spieler]||"einem Adler")}</b>${kids.length>1?` · für ${esc(kidName(x.an_spieler))}`:""}</div>
        <div style="font-size:17px;font-weight:900;margin-top:4px">${esc(kabinePostText(x.typ,x.text_key))}</div>
      </div>`).join(""):'<div style="text-align:center;color:#fff;opacity:.8;padding:30px 16px">Noch keine Post – schenk doch selbst ein Kompliment! 👏</div>'}
    </div>
  </div>`;
  if(neuIds.length){
    try{await fetch(`${SB_URL}/rest/v1/kabine_post?id=in.(${neuIds.join(",")})`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({gesehen:true})});}catch(e){}
    try{navigator.vibrate&&navigator.vibrate([30,50,30]);}catch(e){}
    const cont=document.getElementById("kab-post-view");
    if(cont&&typeof confetti==="function")confetti(cont);
    const slot=document.getElementById("kab-post"); if(slot)slot.innerHTML="";
  }
}
/* Kompliment schenken: Mitspieler-Grid; pausierte Kinder mit Genesungs-Freigabe erscheinen
   im selben Flow mit 💌-Grüßen statt Komplimenten (ein Flow, zwei Kartentypen). */
function kabineKudos(){
  const kids=window._elternKids||[];
  if(!kids.length)return;
  if(kids.length===1){ kabineKudosFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("👏 Wer verschenkt?","kabineKudosFor");
}
async function kabineKudosFor(vonSid,vonName){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  const heute=new Date().toISOString().slice(0,10);
  let team=[],pausen={};
  try{const r=await fetch(`${SB_URL}/rest/v1/kader?select=id,name&aktiv=not.is.false&order=name.asc`,{headers:sbAuthHeaders()});if(r.ok)team=(await r.json())||[];}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_pause?select=spieler_id,gruesse_ok&bis=gte.${heute}`,{headers:sbAuthHeaders()});
    if(r.ok)(await r.json()).forEach(p=>{if(p.gruesse_ok)pausen[p.spieler_id]=1;});}catch(e){}
  const andere=team.filter(k=>k.id!==vonSid);
  b.innerHTML=`<div style="flex:1;overflow-y:auto">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">👏 Wem willst du eine Freude machen?</div>
    </div>
    <div style="font-size:12px;opacity:.85;padding:0 16px 10px;text-align:center;color:#fff">Such dir einen Mitspieler aus – ${esc(vonName)} schenkt ein Kompliment!</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 16px 16px">
      ${andere.map(k=>`<button onclick="kabineKudosPick(${vonSid},'${jsq(vonName)}',${k.id},'${jsq(k.name)}',${pausen[k.id]?1:0})" style="border:none;border-radius:18px;min-height:92px;background:${pausen[k.id]?"linear-gradient(135deg,rgba(244,63,94,.5),rgba(190,18,60,.3))":"rgba(255,255,255,.12)"};color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:15px;font-weight:800">
        <span style="font-size:30px">${pausen[k.id]?"💌":"⚽"}</span>${esc(k.name)}
        ${pausen[k.id]?'<span style="font-size:10px;font-weight:700;opacity:.9">fehlt gerade – schick einen Gruß!</span>':""}
      </button>`).join("")||'<div style="grid-column:1/-1;text-align:center;color:#fff;opacity:.8;padding:20px">Kein Mitspieler gefunden.</div>'}
    </div>
  </div>`;
}
function kabineKudosPick(vonSid,vonName,anSid,anName,pausiert){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const typ=pausiert?"genesung":"kudos";
  const texte=pausiert?GENESUNG_TEXTE:KUDOS_TEXTE;
  b.innerHTML=`<div style="flex:1;overflow-y:auto">
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineKudosFor(${vonSid},'${jsq(vonName)}')" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">${pausiert?"💌 Gruß":"👏 Kompliment"} für ${esc(anName)}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 16px 16px">
      ${texte.map((t,i)=>`<button onclick="kabineKudosSend(${vonSid},${anSid},'${typ}',${i},this)" style="border:none;border-radius:16px;padding:16px;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;text-align:left;background:rgba(255,255,255,.12);color:#fff">${esc(t)}</button>`).join("")}
    </div>
  </div>`;
}
async function kabineKudosSend(vonSid,anSid,typ,key,btn){
  if(btn)btn.disabled=true;
  const heute=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kabine_post`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({typ,von_spieler:vonSid,an_spieler:anSid,text_key:key,datum:heute})});
    if(r.status===409){toast("Du hast heute schon etwas geschickt 🙂","err");kabineHome();return;}
    if(!r.ok&&r.status!==201){toast("Konnte nicht senden","err");if(btn)btn.disabled=false;return;}
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;return;}
  try{navigator.vibrate&&navigator.vibrate([30,50,80]);}catch(e){}
  toast(typ==="genesung"?"💌 Gruß ist unterwegs!":"👏 Kompliment verschenkt – stark von dir!");
  kabineHome();
}
/* I-A – Kabinen-Wahl: die Kinder stimmen ab (Song/Motto/Spielform). Der Trainer legt die
   Wahl in der Adler-Welt an; Ergebnis kommt anonym aggregiert (RPC wahl_ergebnis). */
async function kabineWahlLoad(){
  const el=document.getElementById("kab-wahl"); if(!el)return;
  const kids=window._elternKids||[]; if(!kids.length){el.innerHTML="";return;}
  let wahl=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)wahl=((await r.json())||[])[0]||null;}catch(e){}
  if(!wahl||!Array.isArray(wahl.optionen)||wahl.optionen.length<2){el.innerHTML="";return;}
  let meine={};
  try{const ids=kids.map(k=>k.spieler_id).join(",");
    const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl_stimmen?wahl_id=eq.${wahl.id}&spieler_id=in.(${ids})&select=spieler_id,wahl`,{headers:sbAuthHeaders()});
    if(r.ok)(await r.json()).forEach(s=>meine[s.spieler_id]=s.wahl);}catch(e){}
  const offen=kids.filter(k=>meine[k.spieler_id]==null);
  if(offen.length){
    const k=offen[0];
    el.innerHTML=`<div style="margin:2px 16px 8px;background:linear-gradient(135deg,rgba(56,189,248,.45),rgba(2,132,199,.3));border-radius:16px;padding:12px 14px;color:#fff">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.85">🗳️ Deine Stimme zählt${kids.length>1?" – "+esc((k.kader&&k.kader.name)||""):""}</div>
      <div style="font-size:15px;font-weight:900;margin:4px 0 8px">${esc(wahl.frage)}</div>
      ${wahl.optionen.map((o,i)=>`<button onclick="kabineWahlVote(${wahl.id},${k.spieler_id},${i})" style="display:block;width:100%;border:none;border-radius:12px;padding:12px;margin-top:6px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.16);color:#fff;text-align:left">${esc(String(o))}</button>`).join("")}
    </div>`;
    return;
  }
  // alle Kinder haben gewählt → Live-Balken zeigen (solange die Wahl aktiv ist)
  let erg=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/wahl_ergebnis`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_wahl:wahl.id})});if(r.ok)erg=(await r.json())||[];}catch(e){}
  const counts=wahl.optionen.map((_,i)=>{const e2=erg.find(x=>x.wahl===i);return e2?e2.n:0;});
  const total=counts.reduce((s,n)=>s+n,0)||1;
  el.innerHTML=`<div style="margin:2px 16px 8px;background:rgba(255,255,255,.12);border-radius:16px;padding:12px 14px;color:#fff">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;opacity:.8">🗳️ ${esc(wahl.frage)}</div>
    ${wahl.optionen.map((o,i)=>{const pct=Math.round(counts[i]/total*100);const mine=kids.some(k=>meine[k.spieler_id]===i);
      return `<div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700"><span>${mine?"✅ ":""}${esc(String(o))}</span><span style="opacity:.85">${counts[i]}</span></div>
        <div style="height:8px;background:rgba(255,255,255,.15);border-radius:5px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${pct}%;background:#38bdf8;border-radius:5px;transition:width .5s"></div></div>
      </div>`;}).join("")}
    <div style="font-size:10.5px;opacity:.75;margin-top:8px">Danke fürs Abstimmen – das Ergebnis wächst, wenn mehr Adler wählen!</div>
  </div>`;
}
async function kabineWahlVote(wahlId,sid,idx){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kabinen_wahl_stimmen?on_conflict=wahl_id,spieler_id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({wahl_id:wahlId,spieler_id:sid,wahl:idx})});
    if(!r.ok&&r.status!==201){toast("Konnte nicht abstimmen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate([30,40,60]);}catch(e){}
  toast("🗳️ Stimme gezählt!");
  kabineWahlLoad();
}
/* I-C – „Meine Stärken": kindgerechte Selbsteinschätzung (5 Fragen, 3 Stufen – bewusst
   nur positive Rahmung, keine Noten). Rhythmus ~6 Wochen wie die Trainer-Bewertung.
   Der Trainer sieht das Selbstbild im Spieler-Profil als Gesprächsanlass. */
let _ksAntworten={},_ksIdx=0,_ksSid=null,_ksName="";
function kabineStaerken(){
  const kids=window._elternKids||[];
  if(!kids.length)return;
  if(kids.length===1){ kabineStaerkenFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("💪 Wessen Stärken?","kabineStaerkenFor");
}
async function kabineStaerkenFor(sid,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let last=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_selbstbild?spieler_id=eq.${sid}&select=datum,antworten&order=datum.desc&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)last=((await r.json())||[])[0]||null;}catch(e){}
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:18px;font-weight:800;color:#fff">💪 ${esc(name)}s Stärken</div></div>`;
  if(last){
    const tage=Math.round((Date.now()-new Date(last.datum+"T00:00:00"))/864e5);
    if(tage<42){
      const a=last.antworten||{};
      b.innerHTML=head+`<div style="flex:1;padding:0 16px 16px;color:#fff">
        <div style="background:rgba(255,255,255,.12);border-radius:16px;padding:16px;text-align:center">
          <div style="font-size:14px;font-weight:900">Das hast du vor Kurzem schon gemacht – stark! 💪</div>
          <div style="font-size:11.5px;opacity:.85;margin-top:2px">Nächste Runde in ${42-tage} Tag${42-tage===1?"":"en"}. Das hast du gesagt:</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
          ${KAB_SELBST_FRAGEN.map(f=>{const s=KAB_SELBST_STUFEN[a[f.k]];return s?`<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.10);border-radius:14px;padding:12px 14px;font-size:14px;font-weight:800"><span style="font-size:20px">${f.emo}</span><span style="flex:1">${esc(f.t)}</span><span>${s[0]} ${s[1]}</span></div>`:"";}).join("")}
        </div>
      </div>`;
      return;
    }
  }
  _ksAntworten={};_ksIdx=0;_ksSid=sid;_ksName=name;
  kabineStaerkenFrage();
}
function kabineStaerkenFrage(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  if(_ksIdx>=KAB_SELBST_FRAGEN.length){kabineStaerkenSave();return;}
  const f=KAB_SELBST_FRAGEN[_ksIdx];
  b.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#fff">
    <div style="font-size:12px;opacity:.8">Frage ${_ksIdx+1} von ${KAB_SELBST_FRAGEN.length} · ${esc(_ksName)}</div>
    <div style="font-size:64px;line-height:1">${f.emo}</div>
    <div style="font-size:24px;font-weight:900">${esc(f.t)}</div>
    <div style="font-size:13px;opacity:.85">Wie gut klappt das bei dir?</div>
    <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px">
      ${[3,2,1].map(v=>{const s=KAB_SELBST_STUFEN[v];
        return `<button onclick="kabineStaerkenAnswer(${v})" style="border:none;border-radius:16px;padding:15px;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.14);color:#fff">${s[0]} ${s[1]}</button>`;}).join("")}
    </div>
  </div>`;
}
function kabineStaerkenAnswer(v){
  _ksAntworten[KAB_SELBST_FRAGEN[_ksIdx].k]=v;
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  _ksIdx++; kabineStaerkenFrage();
}
async function kabineStaerkenSave(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const heute=new Date().toISOString().slice(0,10);
  try{
    await fetch(`${SB_URL}/rest/v1/kind_selbstbild?on_conflict=spieler_id,datum`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({spieler_id:_ksSid,datum:heute,antworten:_ksAntworten})});
  }catch(e){}
  const ueben=KAB_SELBST_FRAGEN.filter(f=>_ksAntworten[f.k]===1);
  b.innerHTML=`<div id="ks-done" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#fff;position:relative;overflow:hidden">
    <div style="font-size:64px;line-height:1">🦅</div>
    <div style="font-size:24px;font-weight:900">Stark, ${esc(_ksName)}!</div>
    <div style="font-size:14px;opacity:.92;max-width:340px">${ueben.length?`Du willst <b>${ueben.map(f=>esc(f.t)).join(" und ")}</b> üben – sag das deinem Trainer, dann übt ihr es zusammen! 💪`:"Du fühlst dich überall sicher – weiter so, und hilf deinen Mitspielern! 🤝"}</div>
    <button onclick="kabineHome()" style="margin-top:10px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Zurück zur Kabine</button>
  </div>`;
  try{navigator.vibrate&&navigator.vibrate([40,60,40]);}catch(e){}
  const cont=document.getElementById("ks-done");
  if(cont&&typeof confetti==="function")confetti(cont);
}
/* I-C – Kabinen-Reporter: das Kind beantwortet lustige Interview-Fragen per Antwort-Chips
   (8-Jährige tippen ungern). Antworten landen in einer Freigabe-Queue; der Trainer gibt
   im Adler Nest frei, was als Rubrik erscheint. */
const REPORTER_FRAGEN=[
  {f:"Dein Traumtor?",o:["Fallrückzieher","Volle Pulle aus der Ferne","Solo durch alle durch","Lupfer über den Torwart"]},
  {f:"Was isst du am Spieltag?",o:["Nudeln","Müsli","Brötchen","Gar nichts – zu aufgeregt!"]},
  {f:"Dein Lieblings-Trick?",o:["Übersteiger","Schnelle Drehung","Tunnel","Hackentrick"]},
  {f:"Was macht unser Team stark?",o:["Wir feuern uns an","Wir passen uns den Ball zu","Wir geben nie auf","Wir lachen ganz viel"]},
  {f:"Dein bester Moment bisher?",o:["Mein erstes Tor","Ein richtig guter Pass","Eine Mega-Parade","Der Team-Jubel"]},
  {f:"Dein Torjubel?",o:["Auf den Knien rutschen","Arme hoch und schreien","Ein Tänzchen","Alle umarmen"]},
  {f:"Wo spielst du am liebsten?",o:["Im Tor","Hinten aufpassen","Mittendrin","Vorne Tore jagen"]},
  {f:"Vor dem Spiel bin ich …",o:["Mega aufgeregt","Total ruhig","Voller Power","Am Kichern"]}
];
let _krSid=null,_krName="",_krOffen=[];
function kabineReporter(){
  const kids=window._elternKids||[];
  if(!kids.length)return;
  if(kids.length===1){ kabineReporterFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("🎙️ Wer wird interviewt?","kabineReporterFor");
}
async function kabineReporterFor(sid,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let beantwortet=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/kabine_reporter?spieler_id=eq.${sid}&select=frage`,{headers:sbAuthHeaders()});
    if(r.ok)beantwortet=((await r.json())||[]).map(x=>x.frage);}catch(e){}
  _krSid=sid;_krName=name;
  _krOffen=REPORTER_FRAGEN.filter(q=>!beantwortet.includes(q.f)).sort(()=>Math.random()-.5).slice(0,2);
  if(!_krOffen.length){
    b.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;color:#fff">
      <div style="font-size:56px">🎙️</div>
      <div style="font-size:20px;font-weight:900">Alle Fragen beantwortet!</div>
      <div style="font-size:13px;opacity:.9;max-width:320px">Du bist ein echter Kabinen-Reporter, ${esc(name)}. Schau ins Adler Nest, was gedruckt wird!</div>
      <button onclick="kabineHome()" style="margin-top:10px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Zurück zur Kabine</button>
    </div>`;
    return;
  }
  kabineReporterFrage();
}
function kabineReporterFrage(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const q=_krOffen[0];
  if(!q){
    b.innerHTML=`<div id="kr-done" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;color:#fff;position:relative;overflow:hidden">
      <div style="font-size:56px">🎙️</div>
      <div style="font-size:22px;font-weight:900">Danke, Reporter ${esc(_krName)}!</div>
      <div style="font-size:13px;opacity:.9;max-width:320px">Der Trainer schaut sich deine Antworten an – vielleicht stehst du bald im Adler Nest! 📰</div>
      <button onclick="kabineHome()" style="margin-top:10px;border:none;border-radius:14px;background:rgba(255,255,255,.16);color:#fff;font-family:inherit;font-size:14px;font-weight:800;padding:12px 22px;cursor:pointer">Zurück zur Kabine</button>
    </div>`;
    const cont=document.getElementById("kr-done");
    if(cont&&typeof confetti==="function")confetti(cont);
    return;
  }
  b.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#fff">
    <div style="font-size:12px;opacity:.8">🎙️ Kabinen-Reporter · ${esc(_krName)}</div>
    <div style="font-size:22px;font-weight:900;max-width:340px">${esc(q.f)}</div>
    <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px">
      ${q.o.map((o,i)=>`<button onclick="kabineReporterAnswer(${i})" style="border:none;border-radius:16px;padding:14px;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;background:rgba(255,255,255,.14);color:#fff">${esc(o)}</button>`).join("")}
    </div>
  </div>`;
}
async function kabineReporterAnswer(idx){
  const q=_krOffen.shift(); if(!q)return;
  try{navigator.vibrate&&navigator.vibrate(25);}catch(e){}
  try{
    await fetch(`${SB_URL}/rest/v1/kabine_reporter`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({spieler_id:_krSid,frage:q.f,antwort:q.o[idx],datum:new Date().toISOString().slice(0,10)})});
  }catch(e){}
  kabineReporterFrage();
}
/* Kabinen-DJ (Phase 23.2): die Spotify-Playlist der U9 in der App. Wandelt einen
   Spotify-Link in die Embed-URL um; akzeptiert Playlist/Album/Track. */
function spotifyEmbed(url){
  const m=/open\.spotify\.com\/(playlist|album|track)\/([A-Za-z0-9]+)/.exec(url||"");
  return m?`https://open.spotify.com/embed/${m[1]}/${m[2]}`:null;
}
async function kabineHype(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let url="";
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=spotify_playlist`,{headers:sbAuthHeaders()});if(r.ok)url=(((await r.json())[0])||{}).spotify_playlist||"";}catch(e){}
  const embed=spotifyEmbed(url);
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800;color:#fff">🎵 Kabinen-Hype</div></div>`;
  if(!embed){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.85;padding:20px;text-align:center">Noch keine Playlist hinterlegt.<br>Der Trainer kann sie in der Adler-Welt setzen. 🎧</div>'; return; }
  b.innerHTML=head+`<div style="flex:1;padding:12px 16px">
    <iframe title="Kabinen-Playlist" style="border-radius:14px;width:100%;height:420px;border:0" src="${esc(embed)}" allow="encrypted-media; clipboard-write" loading="lazy"></iframe>
    <div style="text-align:center;color:#fff;opacity:.8;font-size:12px;margin-top:10px">Vor dem Spiel schön laut – auf geht's, Adler! 🦅</div>
  </div>`;
}
// Skill der Woche im Kinder-Modus: aktive Challenge holen und das Video zeigen.
async function kabineSkillWoche(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let sk=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)sk=(await r.json())[0]||null;}catch(e){}
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800;color:#fff">🎬 Skill der Woche</div></div>`;
  if(!sk){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.85;padding:20px;text-align:center">Diese Woche gibt es keine neue Challenge.<br>Schau bald wieder rein! 💪</div>'; return; }
  b.innerHTML=head+`<div style="flex:1;padding:16px;color:#fff;display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px">
    <div style="font-size:22px;font-weight:900;margin-top:10px">${esc(sk.titel)}</div>
    ${sk.beschreibung?`<div style="font-size:14px;opacity:.95;line-height:1.5;max-width:420px">${esc(sk.beschreibung)}</div>`:""}
    ${sk.video_url?`<a href="${esc(sk.video_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 28px;border-radius:16px;background:#fff;color:#0b2f4d;font-weight:800;font-size:16px;text-decoration:none">▶️ Video ansehen</a>`:""}
    <div style="font-size:13px;opacity:.85;max-width:420px;margin-top:6px">Übe zuhause – wenn du es schaffst, geben deine Eltern die Federn frei! 🪶</div>
  </div>`;
}
// mode: "taktik" | "wissen" – springt nach der Namenswahl direkt ins gewählte Quiz.
// from=kabine blendet im Quiz einen „Zurück zur Kabine"-Button ein.
function kabineQuiz(mode){ window.location.href=location.pathname+"?quiz&from=kabine"+(mode?"&mode="+encodeURIComponent(mode):""); }
/* Kids-Modus: eigene FUT-Karte (mit Federn/Holo aus FUT 2.0) + Abzeichen (read-only).
   Bei mehreren Kindern erst eine kindgerechte Auswahl im Kabinen-Body. */
function kabinePickKid(title,fnName){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const kids=window._elternKids||[];
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="font-size:18px;font-weight:800">${title}</div></div>`;
  if(!kids.length){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;opacity:.85;padding:20px;text-align:center">Kein Kind gefunden.</div>'; return; }
  b.innerHTML=head+`<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px;align-content:start">`+
    kids.map(k=>`<button onclick="${fnName}(${k.spieler_id},'${jsq((k.kader&&k.kader.name)||"")}')" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:16px;font-weight:800;min-height:110px"><span style="font-size:40px">⚽</span>${esc((k.kader&&k.kader.name)||"Kind")}</button>`).join("")+`</div>`;
}
function kabineMyCard(){
  const kids=window._elternKids||[];
  if(kids.length===1){ elternCardOpen(kids[0].spieler_id); return; }
  kabinePickKid("🃏 Wessen Karte?","kabineMyCardFor");
}
function kabineMyCardFor(id){ elternCardOpen(id); }
function kabineAbzeichen(){
  const kids=window._elternKids||[];
  if(kids.length===1){ abzeichenOpen(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||"",true); return; }
  kabinePickKid("🎖️ Wessen Abzeichen?","kabineAbzeichenFor");
}
function kabineAbzeichenFor(id,name){ abzeichenOpen(id,name,true); }
/* B-Etappe 2: „Meine Mission" – die offenen Entwicklungsziele kindgerecht im Kabinen-Modus.
   Ziele sind trainer-only; die RPC meine_ziele (is_parent_of-gegatet) erlaubt der Eltern-
   Sitzung den Lesezugriff aufs eigene Kind. */
function kabineMission(){
  const kids=window._elternKids||[];
  if(kids.length===1){ kabineMissionFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("🎯 Wessen Mission?","kabineMissionFor");
}
async function kabineMissionFor(id,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let ziele=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/meine_ziele`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:id})});if(r.ok)ziele=(await r.json())||[];}catch(e){}
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800;color:#fff">🎯 ${esc(name||"Meine")} Mission</div></div>`;
  if(!ziele.length){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.85;padding:24px;text-align:center">Noch keine Mission gesetzt.<br>Frag deinen Trainer, woran du arbeiten kannst! 💪</div>'; return; }
  const cards=ziele.map(z=>{const ex=(typeof _zielUebungen==="function")?_zielUebungen((z.meta&&z.meta.tags)||[],3):[];
    return `<div style="background:rgba(255,255,255,.14);border-radius:18px;padding:16px;margin-bottom:12px;color:#fff">
      <div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.5px">🎯 Deine Mission</div>
      <div style="font-size:19px;font-weight:900;margin:2px 0 6px">${esc(z.ziel)}</div>
      ${ex.length?`<div style="font-size:13px;opacity:.92">💪 Übe das: ${ex.map(esc).join(" · ")}</div>`:""}
    </div>`;}).join("");
  b.innerHTML=head+`<div style="flex:1;overflow-y:auto;padding:12px 16px">
    <div style="color:#fff;opacity:.85;font-size:13px;margin-bottom:10px">Das nimmt sich dein Trainer mit dir vor. Bleib dran – du schaffst das! 🦅</div>
    ${cards}</div>`;
}
/* A-Etappe 3: „Wo spiele ich?" – Rollen des eigenen Kindes kindgerecht. Aufstellungen sind
   trainer-only; die RPC meine_rollen (is_parent_of-gegatet) liefert die Rollen-Zählung. */
function kabineRollen(){
  const kids=window._elternKids||[];
  if(kids.length===1){ kabineRollenFor(kids[0].spieler_id,(kids[0].kader&&kids[0].kader.name)||""); return; }
  kabinePickKid("🎽 Wessen Rollen?","kabineRollenFor");
}
async function kabineRollenFor(id,name){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`<div style="text-align:center;padding:60px 16px;opacity:.85;color:#fff">Lade …</div>`;
  let r={games:0};
  try{const res=await fetch(`${SB_URL}/rest/v1/rpc/meine_rollen`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:id})});if(res.ok)r=(await res.json())||{games:0};}catch(e){}
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800;color:#fff">🎽 Wo spielt ${esc(name||"du")}?</div></div>`;
  if(!r.games){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;opacity:.85;padding:24px;text-align:center">Noch keine Aufstellung gespeichert.<br>Nach dem nächsten Spiel siehst du hier deine Rollen! ⚽</div>'; return; }
  // Torwart bewusst NICHT anzeigen – wir haben feste Torhüter (Feldrollen sind das Thema).
  const R=[{k:"auf",l:"🛡️ Aufpasser",c:"#3b82f6"},{k:"fll",l:"⚡ Flitzer links",c:"#f97316"},{k:"flr",l:"⚡ Flitzer rechts",c:"#22c55e"},{k:"jaeg",l:"🎯 Jäger",c:"#ef4444"}];
  const max=Math.max(1,...R.map(x=>r[x.k]||0));
  const bars=R.map(x=>{const v=r[x.k]||0, w=Math.round((v/max)*100);
    return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:#fff"><span>${x.l}</span><span>${v}×</span></div><div style="height:12px;background:rgba(255,255,255,.15);border-radius:6px;overflow:hidden;margin-top:3px"><div style="height:100%;width:${w}%;background:${x.c};border-radius:6px"></div></div></div>`;}).join("");
  b.innerHTML=head+`<div style="flex:1;overflow-y:auto;padding:14px 16px">
    <div style="color:#fff;opacity:.85;font-size:13px;margin-bottom:12px">In ${r.games} Aufstellungen hast du diese Rollen gespielt:</div>
    ${bars}</div>`;
}
function kabineShowQuests(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="font-size:18px;font-weight:800">🏆 Unsere Missionen</div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:0 16px 16px">
      ${teamQuests.map(q=>`<div style="background:rgba(255,255,255,.1);border-radius:14px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px">
        <span style="font-size:30px">${q.icon}</span>
        <div><div style="font-size:16px;font-weight:800">${esc(q.label)}</div><div style="font-size:13px;opacity:.85">Ziel: ${q.target}</div></div>
      </div>`).join("")}
      ${teamQuestFedern>0?`<div style="background:linear-gradient(135deg,#10b981,#0ea5e9);border-radius:14px;padding:16px;text-align:center;margin-top:6px"><div style="font-size:13px;opacity:.9">Schafft ihr ALLE Missionen, gibt's</div><div style="font-size:22px;font-weight:900;margin-top:4px">${XP_ICON} ${teamQuestFedern} Federn für jeden!</div></div>`:""}
      ${teamBelohnung?`<div style="background:linear-gradient(135deg,#f59e0b,#ec4899);border-radius:14px;padding:16px;text-align:center;margin-top:10px"><div style="font-size:13px;opacity:.9">🎁 Extra-Belohnung</div><div style="font-size:18px;font-weight:900;margin-top:4px">${esc(teamBelohnung)}</div></div>`:""}
    </div>`;
}
function kabineShowGallery(){ kabineIdx=0; kabineRenderGallery(); }
function kabineRenderGallery(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  const head=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px">
      <button onclick="kabineHome()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer">←</button>
      <div style="flex:1;font-size:16px;font-weight:800">🖼️ Team-Galerie</div>
      <div style="font-size:12px;opacity:.8">${kabineGalleryData.length?kabineIdx+1:0} / ${kabineGalleryData.length}</div></div>`;
  if(!kabineGalleryData.length){ b.innerHTML=head+'<div style="flex:1;display:flex;align-items:center;justify-content:center;opacity:.8">Noch keine Karten.</div>'; return; }
  const g=kabineGalleryData[kabineIdx], d=galleryCardData(g);
  b.innerHTML=head+`
    <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
      <button onclick="kabineGalleryNav(-1)" style="position:absolute;left:8px;z-index:2;background:rgba(255,255,255,.15);border:none;color:#fff;width:46px;height:46px;border-radius:50%;font-size:24px;cursor:pointer">‹</button>
      <canvas id="kabine-card" style="max-width:100%;width:280px;height:auto;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5)"></canvas>
      <button onclick="kabineGalleryNav(1)" style="position:absolute;right:8px;z-index:2;background:rgba(255,255,255,.15);border:none;color:#fff;width:46px;height:46px;border-radius:50%;font-size:24px;cursor:pointer">›</button>
    </div>
    <div style="text-align:center;padding:0 16px 16px;font-size:13px;opacity:.85">${esc(g.name)}${g.spitzname?` „${esc(g.spitzname)}“`:""}${g.lieblingsverein?` · Fan von ${esc(g.lieblingsverein)}`:""}</div>
    ${g.foto_path?"":`<div style="margin:0 16px 16px;background:rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;text-align:center;font-size:11.5px;line-height:1.5">📷 Hier fehlt noch ein Foto von ${esc(g.name)}.<br><span style="opacity:.75">Frag Mama oder Papa, ob sie es freigeben – im Eltern-Bereich unter „Fan-Fakten &amp; Foto“.</span></div>`}`;
  const canvas=document.getElementById("kabine-card");if(!canvas)return;
  canvas.width=500;canvas.height=780;const ctx=canvas.getContext("2d");
  adlerCardDraw(ctx,500,780,d,null);
  cardApplyGlow(canvas,g.trainings);
  if(d.fotoPath){ fotoLoadImage(d.fotoPath).then(img=>{ if(img&&document.getElementById("kabine-card")===canvas){ adlerCardDraw(ctx,500,780,d,img); } }); }
}
function kabineGalleryNav(dir){
  if(!kabineGalleryData.length)return;
  kabineIdx=(kabineIdx+dir+kabineGalleryData.length)%kabineGalleryData.length;
  kabineRenderGallery();
}
function galleryCardData(g){
  const v=typeof g.radios==="string"?safeParse(g.radios,{}):(g.radios||{});
  const strengths=Object.keys(CARD_BADGES).map(key=>({key,val:v[key]||0})).sort((a,b)=>b.val-a.val).slice(0,3);
  const {dims:ds}=calcScores(v,DIMS_FELD);
  const topDim=Object.entries(ds).sort((a,b)=>b[1]-a[1])[0]||["tech",0];
  const theme=g.tw?CARD_THEMES.keeper:(CARD_THEMES[topDim[0]]||CARD_THEMES.tech);
  return {name:g.name,nr:g.nr,tw:!!g.tw,fotoPath:g.foto_path,spitzname:g.spitzname||null,
    pos:g.tw?"Torwart":"",fuss:"",alter:null,
    badges:strengths.map(x=>CARD_BADGES[x.key]),theme,
    counts:{trainings:g.trainings||0,tore:null,paraden:null,aktionen:null,spiele:null,quizRichtig:0,quizBloecke:0}};
}
// Erwachsenen-Gate der Kabine: fester Code statt Rechenaufgabe (die war für U9 zu leicht).
/* Kabinen-Code: der SHA-256 liegt in team_config.kabine_code_hash, nicht im Quelltext
   (das Repo ist oeffentlich) und ist ohne Deploy aenderbar. Gegen ein hartnaeckiges
   Kind ist das trotzdem nur eine Huerde, kein Schutz – ein vierstelliger Code laesst
   sich in Millisekunden durchprobieren. Die echte Zugriffskontrolle macht die RLS.
   Der Hash wird zwischengespeichert, damit die Kabine auch ohne Netz aufgeht. */
const KABINE_HASH_KEY="adler_kabine_hash";
const KABINE_HASH_FALLBACK="2c1f3f5f6523af84fde4af934caa1126ae6bcebacd36e397fbddcb8a620c1d73"; // "1922", nur bis zum ersten Laden
async function kabineCodeHash(){
  if(sbToken()){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/kabine_config?id=eq.1&select=code_hash`,{headers:sbAuthHeaders()});
      if(r.ok){
        const h=((await r.json())[0]||{}).code_hash;
        if(h){ try{localStorage.setItem(KABINE_HASH_KEY,h);}catch(e){} return h; }
      }
    }catch(e){/* offline: gleich der Zwischenspeicher */}
  }
  try{ const c=localStorage.getItem(KABINE_HASH_KEY); if(c)return c; }catch(e){}
  return KABINE_HASH_FALLBACK;
}
async function kabineExit(){
  const ans=prompt("Nur für Erwachsene 🔒\nBitte den Code eingeben:");
  if(ans===null)return;
  const [eingabe,soll]=await Promise.all([hashPin(String(ans).trim()),kabineCodeHash()]);
  if(eingabe===soll){ isKidsMode=false; document.getElementById("kabine")?.remove(); }
  else { toast("Falscher Code – die Kabine bleibt zu.","err"); }
}
function elternPortalTrainerNotice(root){
  root.innerHTML=`<div style="max-width:360px;margin:8vh auto;background:#fff;border-radius:16px;padding:24px;text-align:center">
    <div style="font-size:40px">🧑‍🏫</div>
    <div style="font-size:16px;font-weight:800;margin-top:8px">Du bist als Trainer angemeldet</div>
    <div style="font-size:13px;color:#64748b;margin:8px 0 16px">Dieser Bereich ist für Eltern. Öffne die Trainer-App ohne <code>?portal</code> in der Adresse.</div>
    <a href="${appRoot()}trainer/" style="display:inline-block;padding:11px 18px;background:#1e3a8a;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Zur Trainer-App</a>
    <button onclick="elternPortalLogout()" style="display:block;width:100%;margin-top:12px;border:none;background:none;color:#64748b;font-size:12px;cursor:pointer">Abmelden</button>
  </div>`;
}

// Kader: tw = hat TW-Option, twPrio = TW-Priorität (1=primär, 2=zweite Option)
// nr = Trikotnummer (ohne nr = wird nicht angezeigt)
// TODO Charles: Nummern für Kolja, Azem, Lukas, Matteo, Piet, Samu, Tom nachtragen
const KADER=[
  {name:"Hugo",   tw:true,  twPrio:2, nr:5},
  {name:"Mika",   tw:false, twPrio:0, nr:6},
  {name:"Kolja",  tw:true,  twPrio:2},
  {name:"Leon",   tw:false, twPrio:0, nr:8},
  {name:"Azem",   tw:false, twPrio:0},
  {name:"Sevan",  tw:false, twPrio:0, nr:10},
  {name:"Lukas",  tw:true,  twPrio:1},
  {name:"Matteo", tw:false, twPrio:0},
  {name:"Piet",   tw:false, twPrio:0},
  {name:"Jonas",  tw:false, twPrio:0, nr:16},
  {name:"Leif",   tw:false, twPrio:0, nr:15},
  {name:"Samu",   tw:false, twPrio:0},
  {name:"Jari",   tw:false, twPrio:0, nr:9},
  {name:"Tom",    tw:false, twPrio:0},
  {name:"Fabio",  tw:false, twPrio:0, nr:2}
];

// D2: Trainerliste zentral – speist Select + beide Checkbox-Leisten (Finn neu)
const TRAINER=["Sandy","Charles","Finn","Kenneth","Peter"];
function renderTrainerUI(){
  const sel=document.getElementById("p-trainer");
  if(sel)sel.innerHTML=TRAINER.map(t=>`<option value="${t}">${t}</option>`).join("");
  const tp=document.getElementById("tp-trainer-checks");
  if(tp)tp.innerHTML=TRAINER.map(t=>`<label class="tp-check"><input type="checkbox" value="${t}"${(t==="Sandy"||t==="Charles")?" checked":""} onchange="tpRenderTimeline()"><span>${t}</span></label>`).join("");
  const aw=document.getElementById("aw-trainer-checks");
  if(aw)aw.innerHTML=TRAINER.map(t=>`<label class="tp-check"><input type="checkbox" value="${t}"><span>${t}</span></label>`).join("");
  const tn=document.getElementById("tn-autor");
  if(tn)tn.innerHTML=TRAINER.map(t=>`<option value="${t}">${t}</option>`).join("");
  const tv=document.getElementById("tv-autor");
  if(tv)tv.innerHTML=TRAINER.map(t=>`<option value="${t}">${t}</option>`).join("");
  // Die Kopfzeile listete frueher die Trainernamen ("4+1 Raute · Sandy, …"). HOTFIX 1
  // hatte das nur dynamisch gemacht, weil Finn fehlte – gebraucht hat es dort niemand.
  // Jetzt steht im Untertitel der naechste Termin (topbarNaechsterTermin in views.js).
}
renderTrainerUI();


