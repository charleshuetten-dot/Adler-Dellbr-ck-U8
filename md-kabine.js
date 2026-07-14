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
    <div style="font-weight:800;font-size:16px;margin-bottom:2px">🎤 Sprachlob für ${esc(_lobName)}</div>
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
    <div style="font-weight:800;font-size:16px;margin-bottom:2px">🏟️ Team-Arena</div>
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
    <div id="kab-arena" style="padding:0 16px 4px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px;align-content:center">
      <button onclick="kabineQuiz('taktik')" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎯</span>Taktik-Quiz</button>
      <button onclick="kabineQuiz('wissen')" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🧠</span>Fußball-Wissen</button>
      <button onclick="kabineShowGallery()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🖼️</span>Team-Galerie</button>
      <button onclick="kabineShowQuests()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🏆</span>Missionen</button>
      <button onclick="kabineMyCard()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🃏</span>Meine Karte</button>
      <button onclick="kabineAbzeichen()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎖️</span>Abzeichen</button>
      <button onclick="kabineMission()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎯</span>Meine Mission</button>
      <button onclick="kabineRollen()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎽</span>Wo spiele ich?</button>
      <button onclick="kabineSkillWoche()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎬</span>Skill der Woche</button>
      <button onclick="kabineHype()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎵</span>Kabinen-Hype</button>
      <button onclick="kabineAlbum()" style="grid-column:1/-1;border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-size:17px;font-weight:800;min-height:76px"><span style="font-size:34px">📖</span>Sammelalbum</button>
    </div>
    </div>
    <button onclick="kabineExit()" style="margin:0 16px 18px;padding:12px;border:none;border-radius:14px;background:rgba(0,0,0,.25);color:#fff;font-family:inherit;font-size:14px;cursor:pointer">🔒 Für Erwachsene: Kabine verlassen</button>`;
  teamLevelLoad("kab-level");                                  // C1: Team-Level
  if(typeof arenaKabineLoad==="function")arenaKabineLoad("kab-arena"); // C3: Einlauf-Song/Schlachtruf
  kabineCountdownLoad();                                        // G6: Countdown bis zum nächsten Spiel
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


