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

