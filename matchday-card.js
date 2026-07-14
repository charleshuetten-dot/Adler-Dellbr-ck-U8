/* ═══════════════════════════════════
   ELTERN-MATCHDAY-CARD – öffentlicher Read-Only-Link (?eltern / ?match=datum)
   Bewusst nur Logistik, keine Bewertungsdaten. Läuft ohne Login über den Anon-Key.
═══════════════════════════════════ */
async function renderElternView(datum){
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML=elternLoader("Spieltag wird geladen …");
  try{
    const heute=new Date().toISOString().slice(0,10);
    const url=datum
      ? `${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&published=eq.true&select=*`
      : `${SB_URL}/rest/v1/matchday?datum=gte.${heute}&published=eq.true&select=*&order=datum.asc&limit=1`;
    const r=await fetch(url,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
    const rows=r.ok?await r.json():[];
    if(!rows.length){root.innerHTML=elternEmpty("Aktuell ist kein Spieltag hinterlegt.<br>Schau bald wieder rein!","📅");return;}
    const m=rows[0];
    elternCurrent=m; // für die Interaktions-Funktionen
    const istTraining=m.typ==="training";
    const d=new Date(m.datum+"T00:00:00");
    const wtag=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"][d.getDay()];
    const datumStr=wtag+", "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"long"});
    const row=(icon,label,val)=>val?`<div style="display:flex;gap:10px;padding:11px 0;border-bottom:1px solid #e2e8f0"><span style="font-size:18px">${icon}</span><div><div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8">${label}</div><div style="font-size:14.5px;font-weight:600;color:#1e293b">${esc(val)}</div></div></div>`:"";
    // Route: Google-Maps-Suche nach der Gegner-Adresse (oder dem Gegnernamen)
    const routeQuery=m.gegner_adresse||m.gegner||m.ort||"";
    const routeUrl=routeQuery?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(routeQuery):"";
    // Hub: prominenter Live-Hinweis, wenn die Match-Uhr gerade läuft – der Grund, JETZT reinzuschauen.
    const liveBanner=(!istTraining&&m.clock_status==="running")?`<a href="#ev-ticker" style="display:block;text-decoration:none;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;text-align:center;box-shadow:0 4px 16px rgba(220,38,38,.35)"><div style="font-size:15px;font-weight:800">🔴 Wir spielen gerade LIVE!</div><div style="font-size:12px;opacity:.9;margin-top:2px">Zum Liveticker ↓</div></a>`:"";
    root.innerHTML=`<div class="elt-fade">
      <div style="text-align:center;margin:8px 0 16px">
        <img src="logo.png" style="width:64px;height:64px" alt="SV Adler Dellbrück">
        <div style="font-size:18px;font-weight:800;color:#1e3a8a;margin-top:6px">${istTraining?"Training":"Spieltag"} U9</div>
        <div style="font-size:13px;color:#64748b">${datumStr}</div>
      </div>
      ${liveBanner}
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        ${!istTraining&&m.gegner?`<div style="text-align:center;font-size:19px;font-weight:800;color:#1e293b;margin-bottom:10px">⚽ gegen ${esc(m.gegner)}</div>`:""}
        ${!istTraining&&m.gegner_adresse?row("🏟️","Adresse Gegner",m.gegner_adresse):""}
        ${row("📍","Ort",m.ort)}
        ${row("⏰","Treffpunkt",m.treffpunkt)}
        ${row(istTraining?"🕐":"🔔",istTraining?"Trainingszeit":"Anpfiff",m.anpfiff)}
        ${row("ℹ️","Infos",m.infos)}
        ${routeUrl?`<a href="${routeUrl}" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:14px;background:#1e3a8a;color:#fff;padding:13px;border-radius:12px;text-decoration:none;font-weight:600">🗺️ Route ${istTraining?"zum Platz":"zum Gegner"}</a>`:""}
      </div>
      ${istTraining?`<div id="ev-dabei" style="margin-top:14px"></div><div id="ev-fahrt" style="margin-top:14px"></div>`:`<div id="ev-ticker" style="margin-top:14px"></div><div id="ev-einsatz" style="margin-top:14px"></div><div id="ev-fahrt" style="margin-top:14px"></div>`}
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin:16px 0 8px;text-align:center">Für Eltern</div>
      <button onclick="elternKalenderIcs()" style="width:100%;margin-bottom:10px;background:#1e3a8a;color:#fff;border:none;padding:14px;border-radius:12px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer">🗓️ Termine in meinen Kalender</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <a href="${appRoot()}?heft" style="text-align:center;background:#fff;border:1.5px solid #1e3a8a;color:#1e3a8a;padding:13px 8px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px">📰 Adler Nest</a>
        <a href="${appRoot()}?portal" style="text-align:center;background:#fff;border:1.5px solid #1e3a8a;color:#1e3a8a;padding:13px 8px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px">👨‍👩‍👧 Mein Kind</a>
      </div>
      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">SV Adler Dellbrück e.V. · Angaben ohne Gewähr</div></div>`;
    if(istTraining){edLoad(m.datum);fgLoad(m.datum);}
    else{
      elTickerLoad(m.datum,m.spieldauer_min||20);
      clearInterval(elTickerTimer);
      elTickerTimer=setInterval(()=>elTickerLoad(m.datum,m.spieldauer_min||20),20000);
      elternEinsatzLoad(m.datum);
      fgLoad(m.datum); // Fahrgemeinschaft auch bei Spielen (Auswärts-Mitfahrten koordinieren)
    }
  }catch(e){root.innerHTML=elternEmpty("Konnte gerade nicht laden.<br>Bitte später erneut versuchen.","😕");}
}
// Ticker-Ereignis-Icon je Typ – macht den Feed lebendiger & auf einen Blick lesbar.
function elTickerIcon(typ){return {tor:"⚽",gegentor:"🥅",parade:"🧤",aktion:"👏",info:"📣",wechsel:"🔄"}[typ]||"•";}
// Faire Einsatzzeiten für Eltern: transparente Balken je Kind (Vorname + Minuten), aus der
// security-definer-RPC (nur veröffentlichte Spieltage, minimale Daten). U9-Vertrauenssignal.
async function elternEinsatzLoad(datum){
  const box=document.getElementById("ev-einsatz"); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/einsatzzeiten_public`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_datum:datum})});if(r.ok)rows=await r.json();}catch(e){}
  if(!Array.isArray(rows)||!rows.length){box.innerHTML="";return;}
  const max=Math.max(...rows.map(x=>x.feld_sek||0),1);
  const bar=(x)=>{const min=Math.round((x.feld_sek||0)/60);const pct=Math.round((x.feld_sek||0)/max*100);
    return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:2px"><span style="font-weight:600;color:#1e293b">${elternEsc(x.spieler)}</span><span style="color:#64748b">${min} Min</span></div><div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#1a56db,#3b82f6)"></div></div></div>`;};
  box.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
    <div style="font-weight:700;margin-bottom:3px">⚖️ Faire Einsatzzeiten</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:12px">Jedes Kind soll fair Spielzeit bekommen – hier ganz transparent.</div>
    ${rows.map(bar).join("")}</div>`;
}
// Eltern-Liveticker: pollt alle 20s (kein Realtime-Client nötig, passt zur REST-Architektur).
// Respektiert den Wolff-Fuss-Toggle des Trainers unabhängig vom ticker_events-Inhalt.
let elTickerTimer=null;
async function elTickerLoad(datum,dauer){
  const box=document.getElementById("ev-ticker");
  if(!box)return;
  const wolffFussMsg='<div style="text-align:center;font-size:12.5px;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px">🤫 Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.</div>';
  try{
    const [evRes,mdRes]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(datum)}&select=text,typ,minute,created_at&order=created_at.desc&limit=20`,{headers:elternHeaders()}),
      fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=ticker_open`,{headers:elternHeaders()})
    ]);
    const mdRows=mdRes.ok?await mdRes.json():[];
    if(mdRows.length&&mdRows[0].ticker_open===false){
      box.innerHTML=wolffFussMsg;
      clearInterval(elTickerTimer);elTickerTimer=null;
      return;
    }
    const rows=evRes.ok?await evRes.json():[];
    box.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
      <div style="font-weight:700;margin-bottom:8px">📣 Liveticker</div>
      ${rows.length?rows.map(e=>`<div style="display:flex;gap:8px;align-items:baseline;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px"><span style="font-size:15px;flex:0 0 auto">${elTickerIcon(e.typ)}</span><span><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</span></div>`).join(""):'<div style="font-size:12px;color:#94a3b8">Noch keine Ereignisse. Bleib dran!</div>'}
    </div>`;
  }catch(e){}
}

/* Delegate-Modus (?delegate=<token>): Eltern-Helfer am Spielfeldrand uebernimmt den
   Ticker – reduziertes UI (nur Kaderchips + Aktions-Buttons), keine Trainer-Rechte.
   Schreibt ausschliesslich ueber die security-definer-RPC ticker_post() mit dem
   Capability-Token; die Text-Engine (tickerPhrase) laeuft identisch zur Trainer-Seite. */
async function renderDelegateView(token){
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Lade...</div>';
  let m=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/matchday?delegate_token=eq.${encodeURIComponent(token)}&select=*`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
    const rows=r.ok?await r.json():[];
    m=rows[0]||null;
  }catch(e){}
  if(!m||m.ticker_open===false){
    root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Der Liveticker ist gerade nicht aktiv.<br>Frag den Trainer, ob der Link noch gilt.</div>';
    return;
  }
  let selected=null;
  const squad=KADER.map(k=>k.name); // KADER ist ohnehin oeffentlich im Client-Code enthalten
  function draw(){
    const dauer=m.spieldauer_min||20;
    const minuteNow=mcMinuteLabel({half:m.half,clock_status:m.clock_status,started_at:m.started_at,paused_ms:m.paused_ms},dauer,m.halbzeiten||2);
    root.innerHTML=`
      <div style="text-align:center;margin:8px 0 16px">
        <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
        <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">Ticker-Helfer${teamLabelFromKey(m.datum)}${m.gegner?` · gegen ${elternEsc(m.gegner)}`:""}</div>
        <div style="font-size:12px;color:#64748b">Spielminute: ${elternEsc(minuteNow)} · Erst Kind, dann Aktion antippen.</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-bottom:12px">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          ${squad.map(n=>`<button onclick="dgPick('${n.replace(/'/g,"")}')" style="font-size:12px;padding:7px 10px;border-radius:16px;border:1px solid #cbd5e1;background:${selected===n?"#1e3a8a":"#f1f5f9"};color:${selected===n?"#fff":"#1e293b"};cursor:pointer;font-family:inherit">${elternEsc(n)}</button>`).join("")}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button onclick="dgSend('tor')" ${selected?"":"disabled"} style="min-height:52px;border:none;border-radius:12px;background:#15803d;color:#fff;font-weight:700;font-size:13px;cursor:pointer">⚽ Tor!</button>
          <button onclick="dgSend('aktion')" ${selected?"":"disabled"} style="min-height:52px;border:none;border-radius:12px;background:#1a56db;color:#fff;font-weight:700;font-size:13px;cursor:pointer">👏 Starke Aktion</button>
          ${(selected&&getKader(selected)?.tw)?`<button onclick="dgSend('parade')" style="min-height:52px;border:none;border-radius:12px;background:#854d0e;color:#fff;font-weight:700;font-size:13px;cursor:pointer;grid-column:span 2">🧤 Parade</button>`:""}
        </div>
        <button onclick="dgSend('gegentor')" style="width:100%;margin-top:8px;min-height:44px;border:1px solid #cbd5e1;border-radius:12px;background:#f1f5f9;color:#334155;font-size:12.5px;cursor:pointer">Gegentor melden</button>
      </div>
      <div id="dg-status" style="text-align:center;font-size:12px;color:#94a3b8;min-height:16px"></div>
      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">Danke fürs Mithelfen! · SV Adler Dellbrück e.V.</div>`;
  }
  window.dgPick=(n)=>{selected=(selected===n)?null:n;draw();};
  window.dgSend=async(typ)=>{
    const name=typ==="gegentor"?null:selected;
    const text=tickerPhrase(typ,name);
    const dauer=m.spieldauer_min||20;
    const minute=mcMinuteLabel({half:m.half,clock_status:m.clock_status,started_at:m.started_at,paused_ms:m.paused_ms},dauer,m.halbzeiten||2);
    const status=document.getElementById("dg-status");
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/ticker_post`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token,p_text:text,p_typ:typ,p_minute:minute})});
      const ok=r.ok?await r.json():false;
      if(status)status.textContent=ok?"✓ Gesendet: "+text:"Konnte nicht gesendet werden (zu schnell hintereinander?)";
    }catch(e){ if(status)status.textContent="Netzwerkfehler."; }
  };
  draw();
}

/* Read-only-Liveticker (?ticker=<key>): fokussierte Nur-Ansehen-Seite fuer alle Eltern,
   pro Team (key = Datum bzw. Datum__t2/__t3). Keine Eingabe, kein Login. Pollt die
   Ereignisse + berechnet die Spielminute live aus dem Uhr-Anker. Respektiert den
   Wolff-Fuss-Toggle (ticker_open=false -> RLS liefert 0 Zeilen + Hinweistext). */
let tickerViewTimer=null, tickerViewMinuteTimer=null, tickerViewClock=null;
async function renderTickerView(key){
  const konf=/__konf$/.test(key);                     // Konferenz: alle Teams eines Spieltags
  const baseDatum=konf?key.replace(/__konf$/,""):key;
  const keys=konf?[baseDatum,baseDatum+"__t2",baseDatum+"__t3"]:[key];
  const anon={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML=elternLoader("Liveticker wird geladen …");
  let adlerkasseHtml=""; // FEAT Z: Spenden-Button, einmal geladen (draw() laeuft alle 15s)
  let clocks={};         // key -> matchday-Zeile
  const teamName=k=>{ const m=/__t(\d+)$/.exec(k); return m?`Adler ${m[1]}`:"Adler 1"; };
  async function loadClocks(){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=in.(${keys.map(encodeURIComponent).join(",")})&select=datum,gegner,half,clock_status,started_at,paused_ms,ticker_open,spieldauer_min,halbzeiten`,{headers:anon});
      const rows=r.ok?await r.json():[];
      clocks={}; rows.forEach(x=>clocks[x.datum]=x);
    }catch(e){}
  }
  function minuteFor(k){
    const c=clocks[k]; if(!c)return "";
    return mcMinuteLabel({half:c.half,clock_status:c.clock_status,started_at:c.started_at,paused_ms:c.paused_ms},c.spieldauer_min||20,c.halbzeiten||2);
  }
  async function draw(){
    let events=[];
    try{
      const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=in.(${keys.map(encodeURIComponent).join(",")})&select=datum,text,typ,minute,created_at&order=created_at.desc&limit=${konf?60:40}`,{headers:anon});
      events=r.ok?await r.json():[];
    }catch(e){}
    // Wolff-Fuss je Team respektieren: Events eines Teams mit ticker_open=false ausblenden.
    events=events.filter(e=>{const c=clocks[e.datum]; return !(c&&c.ticker_open===false);});
    // B1: Applaus-Zähler des Spieltags (aggregiert über alle Teams via baseDatum)
    let claps=0; try{const cr=await fetch(`${SB_URL}/rest/v1/ticker_claps?datum=eq.${encodeURIComponent(baseDatum)}&select=count`,{headers:anon});if(cr.ok){const cj=await cr.json();claps=(cj[0]&&cj[0].count)||0;}}catch(e){}
    const clapBar=`<div style="text-align:center;margin-top:16px">
      <button onclick="tvClap()" style="border:none;background:linear-gradient(135deg,#f59e0b,#ec4899);color:#fff;border-radius:16px;padding:14px 22px;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer;box-shadow:0 4px 16px rgba(236,72,153,.35)">👏 Applaus fürs Team</button>
      <div style="font-size:12px;color:#64748b;margin-top:8px"><span id="tv-claps" style="font-weight:800;color:#db2777">${claps}</span> mal geklatscht</div>
    </div>`;
    const foot=`${clapBar}${adlerkasseHtml}<div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">Nur-Ansehen · aktualisiert automatisch · SV Adler Dellbrück e.V.</div>`;

    if(konf){
      const aktive=keys.filter(k=>clocks[k]||events.some(e=>e.datum===k));
      const score=k=>{let t=0,g=0;events.forEach(e=>{if(e.datum!==k)return;if(e.typ==="tor")t++;else if(e.typ==="gegentor")g++;});return t+":"+g;};
      const board=aktive.length?aktive.map(k=>{
        const c=clocks[k], geg=c&&c.gegner?`gegen ${elternEsc(c.gegner)}`:"";
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9">
          <span style="font-weight:800;color:#dc2626;min-width:62px">${teamName(k)}</span>
          <span style="font-size:18px;font-weight:900;color:#1e3a8a">${score(k)}</span>
          <span style="flex:1;font-size:11.5px;color:#64748b;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${geg}</span>
          <span style="font-size:11px;color:#94a3b8">${elternEsc(minuteFor(k))}</span>
        </div>`;}).join(""):'<div style="font-size:12.5px;color:#94a3b8">Noch keine Teams aktiv.</div>';
      const feed=events.length?events.map(e=>`<div style="display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px">
          <span style="font-size:16px;flex:0 0 auto">${elTickerIcon(e.typ)}</span>
          <span><span style="font-size:10px;font-weight:800;color:#dc2626;background:#fee2e2;border-radius:8px;padding:1px 6px;margin-right:4px">${teamName(e.datum)}</span><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</span>
        </div>`).join(""):'<div style="font-size:12.5px;color:#94a3b8">Noch keine Ereignisse. Die Konferenz startet mit dem Anpfiff!</div>';
      root.innerHTML=`
        <div style="text-align:center;margin:8px 0 14px">
          <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
          <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">📣 Liveticker U9 · Konferenz</div>
          <div style="font-size:12px;color:#64748b">alle Teams in einem Ticker</div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:6px 14px;margin-bottom:10px">${board}</div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">${feed}</div>
        ${foot}`;
      return;
    }
    // Einzelteam (unverändertes Verhalten)
    const c=clocks[key], wolffFuss=c&&c.ticker_open===false;
    const gegner=c&&c.gegner?` · gegen ${elternEsc(c.gegner)}`:"";
    root.innerHTML=`
      <div style="text-align:center;margin:8px 0 14px">
        <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
        <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">📣 Liveticker U9${teamLabelFromKey(key)}${gegner}</div>
        <div style="font-size:13px;color:#64748b"><span id="tv-minute">${elternEsc(minuteFor(key))}</span></div>
      </div>
      ${wolffFuss
        ? '<div style="text-align:center;font-size:12.5px;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">🤫 Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.</div>'
        : `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
            ${events.length?events.map(e=>`<div style="display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px"><span style="font-size:16px;flex:0 0 auto">${elTickerIcon(e.typ)}</span><span><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</span></div>`).join(""):'<div style="font-size:12.5px;color:#94a3b8">Noch keine Ereignisse. Der Ticker startet mit dem Anpfiff – bleib dran!</div>'}
          </div>`}
      ${foot}`;
  }
  // B1: Applaus senden – optimistisch hochzählen + serverseitig via RPC (anon erlaubt).
  window.tvClap=async()=>{
    const el=document.getElementById("tv-claps"); if(el)el.textContent=(parseInt(el.textContent)||0)+1;
    try{navigator.vibrate&&navigator.vibrate(15);}catch(e){}
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/ticker_clap`,{method:"POST",headers:{...anon,'Content-Type':'application/json'},body:JSON.stringify({p_datum:baseDatum})});if(r.ok){const n=await r.json();if(el&&typeof n==="number")el.textContent=n;}}catch(e){}
  };
  await loadClocks();
  adlerkasseHtml=adlerkasseCardHtml(await adlerkasseLinkGet()); // FEAT Z
  await draw();
  // Minute jede Sekunde lokal (nur Einzelteam-Header); Ereignisse+Uhr alle 15s frisch ziehen.
  clearInterval(tickerViewMinuteTimer);
  if(!konf)tickerViewMinuteTimer=setInterval(()=>{const el=document.getElementById("tv-minute");if(el)el.textContent=minuteFor(key);},1000);
  clearInterval(tickerViewTimer);
  tickerViewTimer=setInterval(async()=>{await loadClocks();await draw();},15000);
}

// Eltern-Interaktion (anonym, nur Training): Anwesenheit + Fahrgemeinschaften
let elternCurrent=null;
function elternHeaders(){return {'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};}
function elternEsc(s){return (s+'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function edLoad(datum){
  const box=document.getElementById("ev-dabei");if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_dabei?datum=eq.${encodeURIComponent(datum)}&select=*&order=created_at.asc`,{headers:elternHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  const liste=rows.length?rows.map(x=>`<div style="display:flex;align-items:center;gap:6px;font-size:13px;padding:5px 0;border-bottom:1px solid #f1f5f9"><span style="flex:1">${elternEsc(x.kind)}</span>${x.betreuung?'<span style="font-size:10px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:8px">Betreuung bleibt</span>':''}</div>`).join(""):'<div style="font-size:12px;color:#94a3b8">Noch niemand eingetragen.</div>';
  box.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
    <div style="font-weight:700;margin-bottom:8px">🙋 Wer ist beim Training dabei? (${rows.length})</div>
    ${liste}
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
      <input type="text" id="ed-kind" placeholder="Name des Kindes" style="padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;font-family:inherit">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#334155"><input type="checkbox" id="ed-betreuung"> Ein Elternteil bleibt während des Trainings vor Ort</label>
      <button onclick="edSignup('${datum}')" style="background:#1e3a8a;color:#fff;border:none;padding:12px;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit">Eintragen</button>
    </div>
  </div>`;
}
async function edSignup(datum){
  const kind=(document.getElementById("ed-kind")?.value||"").trim();
  if(!kind){alert("Bitte den Namen des Kindes eintragen.");return;}
  const betreuung=!!document.getElementById("ed-betreuung")?.checked;
  try{
    await fetch(`${SB_URL}/rest/v1/eltern_dabei`,{method:"POST",headers:elternHeaders(),body:JSON.stringify({datum,kind,betreuung})});
    edLoad(datum);
  }catch(e){alert("Konnte nicht speichern. Bitte später erneut.");}
}
async function fgLoad(datum){
  const box=document.getElementById("ev-fahrt");if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/fahrgemeinschaft?datum=eq.${encodeURIComponent(datum)}&select=*&order=created_at.asc`,{headers:elternHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  const liste=rows.length?rows.map(x=>{
    const mit=Array.isArray(x.mitfahrer)?x.mitfahrer:[];
    const frei=Math.max(0,(x.plaetze||0)-mit.length);
    return `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <div style="font-size:13.5px;font-weight:600">🚗 ${elternEsc(x.fahrer)}${x.abfahrt?` <span style="font-weight:400;color:#64748b">· ab ${elternEsc(x.abfahrt)}</span>`:''}</div>
        <span style="font-size:11px;color:${frei>0?'#15803d':'#dc2626'}">${frei} frei</span>
      </div>
      ${mit.length?`<div style="font-size:11.5px;color:#64748b;margin-top:2px">Mit: ${mit.map(elternEsc).join(", ")}</div>`:''}
      ${frei>0?`<button onclick="fgJoin(${Number(x.id)},'${datum}')" style="margin-top:6px;background:#f1f5f9;border:1px solid #cbd5e1;padding:7px 12px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit">Mitfahren</button>`:''}
    </div>`;
  }).join(""):'<div style="font-size:12px;color:#94a3b8">Noch keine Fahrgemeinschaft angeboten.</div>';
  box.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
    <div style="font-weight:700;margin-bottom:8px">🚗 Fahrgemeinschaften</div>
    ${liste}
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
      <div style="font-size:12px;color:#64748b">Ich biete eine Mitfahrgelegenheit an:</div>
      <input type="text" id="fg-fahrer" placeholder="Dein Name" style="padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;font-family:inherit">
      <div style="display:flex;gap:6px">
        <input type="number" id="fg-plaetze" min="1" max="6" placeholder="freie Plätze" style="width:110px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;font-family:inherit">
        <input type="text" id="fg-abfahrt" placeholder="Abfahrt (z. B. 9:00 Netto)" style="flex:1;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;font-family:inherit">
      </div>
      <button onclick="fgOffer('${datum}')" style="background:#15803d;color:#fff;border:none;padding:12px;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit">Fahrt anbieten</button>
    </div>
  </div>`;
}
async function fgOffer(datum){
  const fahrer=(document.getElementById("fg-fahrer")?.value||"").trim();
  const plaetze=parseInt(document.getElementById("fg-plaetze")?.value)||0;
  const abfahrt=(document.getElementById("fg-abfahrt")?.value||"").trim();
  if(!fahrer||plaetze<1){alert("Bitte Name und freie Plätze angeben.");return;}
  try{
    await fetch(`${SB_URL}/rest/v1/fahrgemeinschaft`,{method:"POST",headers:elternHeaders(),body:JSON.stringify({datum,fahrer,plaetze,abfahrt,mitfahrer:[]})});
    fgLoad(datum);
  }catch(e){alert("Konnte nicht speichern.");}
}
async function fgJoin(id,datum){
  const name=prompt("Name des Kindes, das mitfährt:");
  if(!name||!name.trim())return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fahrgemeinschaft?id=eq.${id}&select=mitfahrer,plaetze`,{headers:elternHeaders()});
    const rows=r.ok?await r.json():[];
    if(!rows.length)return;
    const mit=Array.isArray(rows[0].mitfahrer)?rows[0].mitfahrer:[];
    if(mit.length>=(rows[0].plaetze||0)){alert("Leider schon voll.");fgLoad(datum);return;}
    mit.push(name.trim());
    await fetch(`${SB_URL}/rest/v1/fahrgemeinschaft?id=eq.${id}`,{method:"PATCH",headers:elternHeaders(),body:JSON.stringify({mitfahrer:mit})});
    fgLoad(datum);
  }catch(e){alert("Konnte nicht speichern.");}
}

// Trainer-Editor für die Eltern-Info (Modal, an ein Termin-Datum + Typ gebunden)
async function mdOpen(datum,typ){
  typ=typ||"spiel";
  let cur={};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=*`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){const rows=await r.json();if(rows.length)cur=rows[0];}
  }catch(e){}
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const f=(id,lbl,val,ph)=>`<div class="mg" style="margin-bottom:8px"><label>${lbl}</label><input type="text" id="md-${id}" value="${esc(val||"")}" placeholder="${ph||""}"></div>`;
  const spielFelder=`
    ${f("gegner","Gegner",cur.gegner,"z. B. FC Musterstadt")}
    <div class="mg" style="margin-bottom:8px"><label>Adresse des Gegners</label>
      <div style="display:flex;gap:6px">
        <input type="text" id="md-gegner_adresse" value="${esc(cur.gegner_adresse||"")}" placeholder="Straße, Ort..." style="flex:1">
        <button class="btn btn-sm" onclick="mdMapsSearch()" title="Auf Karte suchen"><i class="ti ti-map-search"></i></button>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px">Tipp: Vereinsname eintippen und 🔎 tippen – öffnet die Google-Maps-Suche.</div>
    </div>`;
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:400px;width:100%;max-height:90vh;overflow-y:auto">
    <div style="font-weight:700;margin-bottom:4px">Eltern-Info · ${typ==="training"?"🏃 Training":"⚽ Spiel"} · ${datum}</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Nur Logistik – für die Eltern sichtbar. Keine Bewertungen.</div>
    ${typ==="training"?"":spielFelder}
    ${f("ort","Ort / Sportplatz",cur.ort,"z. B. Sportplatz Dellbrück")}
    ${f("treffpunkt","Treffpunkt (Zeit/Ort)",cur.treffpunkt,"z. B. 9:15 Uhr am Platz")}
    ${f("anpfiff",typ==="training"?"Trainingszeit":"Anpfiff",cur.anpfiff,typ==="training"?"z. B. 17:00–18:15":"z. B. 10:00 Uhr")}
    <div class="mg" style="margin-bottom:10px"><label>Infos (frei)</label><textarea id="md-infos" rows="2" style="resize:none">${esc(cur.infos||"")}</textarea></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-p" onclick="mdSave('${datum}','${typ}',this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn" onclick="mdShareLink('${datum}')"><i class="ti ti-share"></i>Eltern-Link</button>
      <button class="btn" onclick="this.closest('div[style*=fixed]').remove()">Schließen</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}
function mdMapsSearch(){
  const q=(document.getElementById("md-gegner_adresse")?.value||document.getElementById("md-gegner")?.value||"").trim();
  if(!q){toast("Erst Gegner oder Adresse eintippen","err");return;}
  window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q),"_blank","noopener");
}
async function mdSave(datum,typ,btn){
  const g=id=>document.getElementById("md-"+id)?.value.trim()||"";
  const body={datum,typ:typ||"spiel",gegner:g("gegner"),gegner_adresse:g("gegner_adresse"),ort:g("ort"),treffpunkt:g("treffpunkt"),anpfiff:g("anpfiff"),infos:g("infos"),published:true};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/matchday?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201)toast("Eltern-Info gespeichert ✓");else toast("Fehler beim Speichern","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
function mdShareLink(datum){
  const url=appRoot()+"?match="+encodeURIComponent(datum);
  const text=`⚽ Spieltag-Infos U9 (${datum}):\n${url}`;
  if(navigator.share){navigator.share({title:"Spieltag U9",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Eltern-Link kopiert ✓"),()=>prompt("Eltern-Link:",url));}
}

// Rotations-Timer: faire Einsatzzeiten am Spieltag. Feld/Bank, Timer mit Piepton,
// Wechselvorschlag nach längster Bankzeit.
let rotField=[], rotBench=[], rotBenchSec={}, rotFieldSec={}, rotTimerId=null, rotElapsed=0, rotIntervalMin=5, rotTW=null; // HOTFIX 12: rotFieldSec = Spielzeit
// Feldgröße folgt der aktuellen Spielform (FORMATIONS): Funino 3, 4+1 = 4, 5+1 = 5.
function rotFieldSize(){ return ((typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{fieldCount:5}).fieldCount; }
// HOTFIX 11: Torwart (Fest) bewusst setzen/entfernen – aus Feld & Bank raus, rotiert getrennt.
function rotSetTW(name){ if(!name)return; rotField=rotField.filter(n=>n!==name); rotBench=rotBench.filter(n=>n!==name); rotTW=name; rotRenderLive(); }
function rotClearTW(){ if(rotTW&&!rotBench.includes(rotTW)&&!rotField.includes(rotTW))rotBench.push(rotTW); rotTW=null; rotRenderLive(); }
// HOTFIX 13: räumliches Mini-Feld – Feldspieler an den echten Formations-Positionen,
// TW im Tor, Spielzeit (grün) auf jedem Chip. Antippen = auf die Bank (rotMove).
function rotFieldSpatialHtml(){
  const form=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{slots:[]};
  const slots=form.slots||[];
  const fieldSlots=slots.filter(s=>s.rk!=="tw");
  const twSlot=slots.find(s=>s.rk==="tw");
  const chipF=(n,x,y,tw)=>{const reco=!tw&&istRecovery(n);return `<button onclick="${tw?'rotClearTW()':`rotMove('${n.replace(/'/g,"")}')`}" title="${tw?'Torwart entfernen':(reco?'Kürzlich krank – heute Belastung dosieren':'Auf die Bank')}" style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;border:${reco?'3px solid #f97316':'2px solid #fff'};background:${tw?'#f59e0b':'#1e3a8a'};color:#fff;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;padding:0;font-family:inherit">
    <span style="font-size:11px">${reco?"🩹":(getKader(n)?.nr!=null?getKader(n).nr:(tw?"🥅":""))}</span>
    <span style="max-width:42px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px">${esc((n||"").split(" ").slice(-1)[0])}</span>
    <span data-rot-sec="${esc(n)}" data-rot-on="f" style="font-size:7px;color:#bbf7d0">${fmtSec(rotFieldSec[n]||0)}</span></button>`;};
  let h='<div style="position:relative;width:100%;max-width:300px;margin:0 auto 4px;aspect-ratio:3/4;background:linear-gradient(#2d7d2d,#256b25);border-radius:12px;border:2px solid rgba(255,255,255,.35);overflow:hidden">';
  h+='<div style="position:absolute;left:6%;right:6%;top:50%;height:1px;background:rgba(255,255,255,.3)"></div>';
  h+='<div style="position:absolute;left:50%;top:50%;width:46px;height:46px;border:1px solid rgba(255,255,255,.25);border-radius:50%;transform:translate(-50%,-50%)"></div>';
  rotField.forEach((n,i)=>{const s=fieldSlots[i]||{x:50,y:40+i*8};h+=chipF(n,s.x,s.y,false);});
  if(rotTW&&twSlot)h+=chipF(rotTW,twSlot.x,twSlot.y,true);
  h+='</div>';
  return h;
}
// Korrektur 3: Der Torwart wird separat gehalten – er steht im Tor und rotiert NICHT
// mit den Feldspielern. Nur die Feldspieler wechseln zwischen Feld und Bank.
function rotSeedFromSquad(squad){
  const form=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{tw:true,fieldCount:5};
  rotTW=null; // HOTFIX 11: Torwart-Slot startet LEER – der Trainer setzt ihn bewusst (rotSetTW)
  const outfield=squad.filter(n=>n!==rotTW);
  rotField=outfield.slice(0,form.fieldCount);
  rotBench=outfield.slice(form.fieldCount);
  rotBenchSec={};rotFieldSec={};squad.forEach(n=>{rotBenchSec[n]=0;rotFieldSec[n]=0;}); // HOTFIX 12
  rotElapsed=0;
}
function rotInit(){
  if(!rotField.length&&!rotBench.length&&!rotTW){
    rotSeedFromSquad(KADER.map(k=>k.name));
  }
  rotRenderControls();
  rotRenderLive();
}
function rotRenderControls(){
  const box=document.getElementById("rot-panel");
  if(!box)return;
  const running=!!rotTimerId;
  box.innerHTML=`
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <span style="font-size:11px;color:var(--text2)">Wechsel alle</span>
      <select id="rot-interval" onchange="rotIntervalMin=parseInt(this.value)" style="min-height:40px;padding:6px 10px;border:var(--border-s);border-radius:var(--r);font-family:inherit">
        ${[3,4,5,6,7].map(m=>`<option value="${m}"${m===rotIntervalMin?" selected":""}>${m} Min.</option>`).join("")}
      </select>
      <button class="btn btn-p" id="rot-startbtn" onclick="rotToggle()" style="min-height:44px">${running?'<i class="ti ti-player-pause"></i>Pause':'<i class="ti ti-player-play"></i>Start'}</button>
      <button class="btn" onclick="rotReset()" style="min-height:44px"><i class="ti ti-refresh"></i>Reset</button>
      <button class="btn" onclick="magicLineup()" title="Nominierte Spieler optimal aufs Feld verteilen" style="min-height:44px">🪄 Auto-Aufstellung</button>
    </div>
    <div id="rot-live"></div>`;
}
/* Phase 7-A: Magic Button – nominierte Spieler optimal aufs Feld der aktuellen
   Spielform verteilen. 4+1 nutzt den echten Kombinator (calcBestCombos, gedeckelt),
   Funino/5+1 nutzen eine Greedy-Verteilung nach Gesamtscore (kein Brute-Force ->
   kein Einfrieren). Torwart separat. Ergebnis ist frei nachjustierbar. */
async function magicLineup(){
  const squad=(typeof nominierteSpieler==="function"?nominierteSpieler():[]);
  const form=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{tw:true,fieldCount:5};
  const need=form.fieldCount+(form.tw?1:0);
  if(squad.length<need){toast(`Zu wenige nominierte Spieler (${squad.length}/${need}) für ${tbFormation}`,"err");return;}
  const keeper=form.tw?(squad.find(n=>getKader(n)?.tw)||null):null;
  const outfieldPool=squad.filter(n=>n!==keeper);
  // Saison-Fairness: kumulierte Einsatzzeiten laden (best-effort). Wenig gespielt -> Startvorteil.
  const minutes={}; let fair=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/einsatzzeiten?select=spieler,feld_sek`,{headers:sbAuthHeaders()});if(r.ok){const rows=await r.json();rows.forEach(x=>{if(x.spieler)minutes[x.spieler]=(minutes[x.spieler]||0)+(x.feld_sek||0);});fair=rows.length>0;}}catch(e){}
  // Basis: Skill-Reihenfolge (Gesamtscore)
  const skillOrder=outfieldPool.map(n=>{const pd=getPlayerData(n);return {n,s:pd?pd.total:0};}).sort((a,b)=>b.s-a.s).map(x=>x.n);
  // Blend mit Fairness (55% Fairness / 45% Skill), nur wenn Saisondaten da sind
  let ranked=skillOrder;
  if(fair){
    const maxM=Math.max(1,...outfieldPool.map(n=>minutes[n]||0));
    const skIdx={}; skillOrder.forEach((n,i)=>skIdx[n]=i); const L=Math.max(1,skillOrder.length-1);
    const val=n=>0.55*(1-(minutes[n]||0)/maxM)+0.45*(1-(skIdx[n]/L)); // hoch = soll starten (wenig gespielt / stark)
    ranked=[...outfieldPool].sort((a,b)=>val(b)-val(a));
  }
  // Startelf-Positionierung: für 4+1 die gewählten 4 Starter in die beste Raute stellen
  let ordered=ranked;
  if(tbFormation==='4+1'&&ranked.length>=4){
    const starters=ranked.slice(0,4);
    const combo=calcBestCombos(starters);
    if(combo&&combo[0]){
      const b=combo[0];
      const used=[b.aufpasser.name,b.flitzer_l.name,b.flitzer_r.name,b.jaeger.name];
      const rest=ranked.filter(n=>!used.includes(n));
      ordered=[...used,...rest];
    }
  }
  rotTW=keeper;
  rotField=ordered.slice(0,form.fieldCount);
  rotBench=ordered.slice(form.fieldCount);
  rotBenchSec={};squad.forEach(n=>rotBenchSec[n]=0);rotElapsed=0;
  rotRenderControls();rotRenderLive();
  toast(fair?"⚖️ Faire Auto-Aufstellung ✓ – wenig-gespielte Kinder starten, frei anpassbar":"Auto-Aufstellung erstellt ✓ – frei anpassbar");
}
function fmtSec(s){const m=Math.floor(s/60),ss=s%60;return m+":"+(ss<10?"0":"")+ss;}
// Wechselvorschlag als eigener Helper: längste Bankzeit rein für kürzeste Bankzeit
// (= längste Feldzeit). Ändert sich sekündlich, daher separat updatebar (rotTickLite).
function rotSuggHtml(){
  if(!(rotBench.length&&rotField.length))return "";
  const benchTop=[...rotBench].sort((a,b)=>rotBenchSec[b]-rotBenchSec[a])[0];
  const fieldTired=[...rotField].sort((a,b)=>rotBenchSec[a]-rotBenchSec[b])[0];
  return `<div style="padding:8px 10px;background:#fef9c3;border:1px solid #fde047;border-radius:var(--r);font-size:12.5px;color:#854d0e;margin-bottom:10px">🔁 Vorschlag: <strong>${esc(benchTop)}</strong> (Bank ${fmtSec(rotBenchSec[benchTop])}) rein für <strong>${esc(fieldTired)}</strong></div>`;
}
function rotRenderLive(){
  const live=document.getElementById("rot-live");
  if(!live)return;
  const rest=rotIntervalMin*60-rotElapsed;
  // HOTFIX 12: jeder Chip zeigt seine Zeit – grün = Spielzeit (Feld), rot = Bankzeit.
  // data-rot-sec/-on markieren den Zeit-Span, damit rotTickLite ihn pro Sekunde
  // punktgenau aktualisieren kann, ohne das ganze Panel neu zu bauen.
  const chip=(n,onField)=>{
    const sek=onField?(rotFieldSec[n]||0):(rotBenchSec[n]||0);
    const tcol=onField?"#15803d":"#dc2626";
    const reco=istRecovery(n);
    const rand=reco?"2px solid #f97316":"var(--border-s)"; // orangener Rand: kürzlich krank
    return `<button onclick="rotMove('${n.replace(/'/g,"")}')" title="${reco?'Kürzlich krank – heute Belastung dosieren':''}" style="font-size:12.5px;padding:8px 10px;min-height:44px;border:${rand};border-radius:16px;background:${onField?"var(--blue-bg)":"var(--surface2)"};cursor:pointer;font-family:inherit">${reco?"🩹 ":""}${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)} <span data-rot-sec="${esc(n)}" data-rot-on="${onField?"f":"b"}" style="color:${tcol};font-size:10px;font-weight:700">${fmtSec(sek)}</span></button>`;
  };
  // HOTFIX 11: "Torwart (Fest)" – nur bei Spielformen mit TW; leer = Auswahl, gesetzt = Anzeige + Entfernen.
  const rotForm=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{tw:true};
  let twRow="";
  if(rotForm.tw){
    if(rotTW){
      twRow=`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fef3c7;border:1px solid #fcd34d;border-radius:var(--r);font-size:12.5px;color:#854d0e;margin-bottom:10px">🥅 <strong>Torwart (Fest): ${esc(rotTW)}</strong><button onclick="rotClearTW()" title="Torwart entfernen" style="border:none;background:transparent;color:#a16207;cursor:pointer;font-size:16px;line-height:1;padding:0 2px">×</button><span style="font-size:10px;color:#a16207;margin-left:auto">rotiert nicht mit</span></div>`;
    }else{
      const opts=[...rotField,...rotBench].map(n=>`<option value="${esc(n)}">${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)}</option>`).join("");
      twRow=`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fffbeb;border:1px dashed #fcd34d;border-radius:var(--r);font-size:12.5px;color:#854d0e;margin-bottom:10px">🥅 <strong>Torwart (Fest):</strong><select onchange="rotSetTW(this.value)" style="flex:1;padding:6px 8px;border:var(--border-s);border-radius:var(--r);font-family:inherit;font-size:12px;background:var(--surface)"><option value="">— Torwart wählen —</option>${opts}</select></div>`;
    }
  }
  const recoNamen=[...rotField,...rotBench].filter(istRecovery);
  const recoHinweis=recoNamen.length?`<div style="padding:8px 10px;background:#fff7ed;border:1px solid #fdba74;border-radius:var(--r);font-size:12px;color:#9a3412;margin-bottom:10px">🩹 <strong>${recoNamen.map(esc).join(", ")}</strong> ${recoNamen.length===1?"war":"waren"} kürzlich krank – heute Einsatzzeit bewusst dosieren.</div>`:"";
  live.innerHTML=`
    <div id="rot-cd" style="text-align:center;font-size:30px;font-weight:800;color:${rest<=10?"#dc2626":"var(--text)"};margin-bottom:8px">${fmtSec(Math.max(0,rest))}</div>
    ${twRow}
    ${kapitaenRow()}
    ${recoHinweis}
    <div id="rot-sugg">${rotSuggHtml()}</div>
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:4px">Feld (${rotField.length}/${rotFieldSize()})</div>
    ${rotFieldSpatialHtml()}
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text2);margin:10px 0 6px">Bank (${rotBench.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${rotBench.map(n=>chip(n,false)).join("")||'<span style="font-size:11px;color:var(--text3)">Bank leer</span>'}</div>
    <div style="font-size:10px;color:var(--text3);margin-top:8px">Feld-Spieler antippen = auf die Bank · Bank-Spieler antippen = aufs Feld · 🟢 Spielzeit / 🔴 Bankzeit.</div>`;
}
function rotMove(name){
  let richtung=null;
  if(rotField.includes(name)){rotField=rotField.filter(n=>n!==name);rotBench.push(name);richtung="aus";}
  else if(rotBench.includes(name)){
    if(rotField.length>=rotFieldSize()){toast("Feld ist voll ("+rotFieldSize()+") – erst jemanden rausnehmen","err");return;}
    rotBench=rotBench.filter(n=>n!==name);rotField.push(name);richtung="ein";
  }
  if(richtung&&rotTimerId)rotLogSub(name,richtung); // HOTFIX 12: nur echte Wechsel im laufenden Spiel loggen
  rotRenderLive();
}
// HOTFIX 12: Ein-/Auswechslung in match_substitutions loggen (Fairness-Beweis). Best-effort.
async function rotLogSub(spieler,richtung){
  const datum=spieltagKey();
  const minute=(typeof mcState!=="undefined"&&mcState)?mcMinuteLabel(mcState,typeof mcSpieldauer!=="undefined"?mcSpieldauer:20,typeof mcHalbzeiten!=="undefined"?mcHalbzeiten:2):"";
  let tid=null; try{tid=await terminIdForDatum(datum);}catch(e){}
  sbQueuedPost("match_substitutions",{datum,termin_id:tid,spieler,richtung,minute,feld_sek:rotFieldSec[spieler]||0,bank_sek:rotBenchSec[spieler]||0});
}
function rotBeep(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    const ctx=new AC();const o=ctx.createOscillator();const g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);o.type="sine";o.frequency.value=880;
    g.gain.setValueAtTime(.25,ctx.currentTime);o.start();
    o.stop(ctx.currentTime+.45);setTimeout(()=>ctx.close(),700);
  }catch(e){}
}
// Perf: pro Sekunde nur die Textknoten (Countdown, Chip-Zeiten, Wechselvorschlag)
// aktualisieren statt das ganze Panel via innerHTML neu zu bauen. Fehlt die erwartete
// Struktur (z.B. direkt nach Tab-Wechsel), meldet der Rückgabewert false -> voller Render.
function rotTickLite(){
  const cd=document.getElementById("rot-cd");
  const live=document.getElementById("rot-live");
  if(!cd||!live)return false;
  const restRaw=rotIntervalMin*60-rotElapsed;
  cd.textContent=fmtSec(Math.max(0,restRaw));
  cd.style.color=restRaw<=10?"#dc2626":"var(--text)";
  live.querySelectorAll("[data-rot-sec]").forEach(el=>{
    const n=el.getAttribute("data-rot-sec");
    const onField=el.getAttribute("data-rot-on")==="f";
    el.textContent=fmtSec((onField?rotFieldSec[n]:rotBenchSec[n])||0);
  });
  const sg=document.getElementById("rot-sugg");
  if(sg)sg.innerHTML=rotSuggHtml();
  return true;
}
function rotTick(){
  rotElapsed++;
  rotBench.forEach(n=>{rotBenchSec[n]=(rotBenchSec[n]||0)+1;});
  rotField.forEach(n=>{rotFieldSec[n]=(rotFieldSec[n]||0)+1;}); // HOTFIX 12: Spielzeit der Feldspieler
  if(rotTW)rotFieldSec[rotTW]=(rotFieldSec[rotTW]||0)+1; // Torwart spielt auch (feste Position)
  if(rotElapsed>=rotIntervalMin*60){
    rotElapsed=0;rotBeep();try{navigator.vibrate&&navigator.vibrate([100,60,100]);}catch(e){}
  }
  if((++rotPersistCtr%30)===0)rotPersistTimes(); // Faire Einsatzzeiten: alle 30s sichern
  if(!rotTickLite())rotRenderLive(); // punktgenaues Text-Update; sonst voller Render
}
// Idempotente Start/Stop-Funktionen (statt reinem Toggle), damit die Match-Uhr den
// Rotations-Timer sicher mitsteuern kann, ohne einen bereits korrekten Zustand zu kippen.
function rotStart(){ if(!rotTimerId){rotTimerId=setInterval(rotTick,1000);requestWakeLock();} rotRenderControls();rotRenderLive(); }
function rotStop(){ if(rotTimerId){clearInterval(rotTimerId);rotTimerId=null;} rotPersistTimes(); rotRenderControls();rotRenderLive(); }
function rotToggle(){ if(rotTimerId)rotStop(); else rotStart(); }
// Faire Einsatzzeiten: aktuelle Feldzeit je Spieler in Supabase sichern (best-effort, Trainer-Auth).
let rotPersistCtr=0;
async function rotPersistTimes(){
  if(typeof sbToken==="function"&&!sbToken())return;
  const datum=spieltagKey();
  const all=new Set([...rotField,...rotBench,...(rotTW?[rotTW]:[])]);
  const payload=[...all].map(n=>({datum,spieler:n,feld_sek:rotFieldSec[n]||0}));
  if(!payload.length)return;
  // Offline-hart: über die Sync-Queue -> am Platz ohne Netz wird es zuverlässig nachgetragen.
  try{ await sbQueuedPost("einsatzzeiten?on_conflict=datum,spieler",payload,"resolution=merge-duplicates"); }catch(e){}
}
function rotReset(){
  if(rotTimerId){clearInterval(rotTimerId);rotTimerId=null;}
  rotElapsed=0;Object.keys(rotBenchSec).forEach(n=>rotBenchSec[n]=0);
  rotRenderControls();rotRenderLive();
}

/* ═══════════════════════════════════
   ANALYSE – Meilensteine, Einsatz-Fairness, Formtrend
═══════════════════════════════════ */
// Label-Lookup für alle Bewertungskriterien
function critLabelMap(){
  const map={};
  [...DIMS_FELD,...(typeof DIMS_TW!=="undefined"?DIMS_TW:[])].forEach(d=>{
    (d.tier||[]).forEach(t=>map[t.n]=t.l);
    (d.mx||[]).forEach(m=>map[m.n]=m.l);
  });
  return map;
}
// KI-Light: aus der Bewertungs-Historie automatisch Fortschritte finden (kein Server nötig)
function computeMilestones(){
  const map=critLabelMap();const out=[];
  Object.keys(DB).forEach(name=>{
    const snaps=DB[name];
    if(!snaps||snaps.length<2)return;
    const latest=snaps[snaps.length-1];
    const latestDate=new Date(latest.datum);
    let earlier=snaps[0];
    for(let i=snaps.length-2;i>=0;i--){
      const dd=(latestDate-new Date(snaps[i].datum))/(864e5);
      if(dd>=60){earlier=snaps[i];break;}
    }
    if(earlier===latest)return;
    const vL=safeParse(latest.radios,{}),vE=safeParse(earlier.radios,{});
    Object.keys(vL).forEach(k=>{
      if(vE[k]!=null&&vL[k]!=null&&(vL[k]-vE[k])>=2)out.push({name,label:map[k]||k,from:vE[k],to:vL[k],diff:vL[k]-vE[k]});
    });
    const tD=(latest.total_score||0)-(earlier.total_score||0);
    if(tD>=8)out.push({name,label:"Gesamt-Niveau",from:earlier.total_score,to:latest.total_score,diff:tD,isTotal:true});
  });
  out.sort((a,b)=>b.diff-a.diff);
  return out;
}
function anRenderMeilensteine(){
  const box=document.getElementById("an-meilensteine");if(!box)return;
  const ms=computeMilestones();
  box.innerHTML=ms.length?ms.slice(0,12).map(m=>`<div style="display:flex;gap:8px;align-items:center;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:var(--rl);padding:8px 10px;margin-bottom:6px">
    <span style="font-size:18px">💡</span>
    <div style="font-size:12.5px;color:var(--text)"><strong>${esc(m.name)}</strong>: ${esc(m.label)}${m.isTotal?` +${m.diff}% Niveau`:` von ${m.from} auf ${m.to}`} – heute loben! 🎉</div>
  </div>`).join(""):'<div style="font-size:11px;color:var(--text3)">Noch nicht genug Verlaufsdaten (mind. 2 Bewertungen mit ~2 Monaten Abstand pro Spieler).</div>';
}
async function anLoadServer(){
  const fair=document.getElementById("an-fairness"),form=document.getElementById("an-form");
  if(!fair||!form)return;
  fair.innerHTML='<div style="font-size:11px;color:var(--text3)">Lade...</div>';form.innerHTML="";
  try{
    const r=await fetch(`${SB_URL}/rest/v1/blitz_ratings?select=datum,spieler,kriterien,wertung`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){fair.innerHTML='<div style="font-size:11px;color:var(--text3)">Keine Verbindung</div>';return;}
    const rows=await r.json();
    const gamesByPlayer={},formByPlayer={};
    rows.forEach(b=>{
      if(!gamesByPlayer[b.spieler])gamesByPlayer[b.spieler]=new Set();
      gamesByPlayer[b.spieler].add(b.datum);
      let val=null;
      if(b.kriterien){const vs=Object.values(b.kriterien).filter(x=>typeof x==="number");if(vs.length)val=vs.reduce((a,c)=>a+c,0)/vs.length;}
      else if(b.wertung)val=b.wertung==="top"?3:b.wertung==="solide"?2:1;
      if(val!=null){(formByPlayer[b.spieler]=formByPlayer[b.spieler]||[]).push({datum:b.datum,val});}
    });
    const counts=KADER.map(k=>({name:k.name,n:gamesByPlayer[k.name]?gamesByPlayer[k.name].size:0}));
    const maxN=Math.max(1,...counts.map(c=>c.n));
    counts.sort((a,b)=>a.n-b.n);
    fair.innerHTML=(maxN===0?'<div style="font-size:11px;color:var(--text3)">Noch keine Spiele bewertet.</div>':counts.map(c=>{
      const pct=Math.round(c.n/maxN*100),low=maxN>=2&&c.n<maxN*0.5;
      return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px"><span>${low?"⚠️ ":""}${esc(c.name)}</span><span style="color:var(--text2)">${c.n} Spiele</span></div><div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${low?"#dc2626":"#15803d"};border-radius:4px"></div></div></div>`;
    }).join("")+'<div style="font-size:10px;color:var(--text3);margin-top:4px">⚠️ = deutlich seltener im Einsatz. Auf faire Verteilung achten.</div>');
    const formRows=Object.keys(formByPlayer).map(name=>{
      const list=formByPlayer[name].sort((a,b)=>a.datum.localeCompare(b.datum));
      const avg=arr=>arr.length?arr.reduce((s,x)=>s+x.val,0)/arr.length:null;
      const rAvg=avg(list.slice(-3)),oAvg=avg(list.slice(0,-3));
      let arrow='<span style="color:var(--text3)">→</span>';
      if(oAvg!=null&&rAvg!=null)arrow=rAvg>oAvg+0.2?'<span style="color:#15803d">▲</span>':rAvg<oAvg-0.2?'<span style="color:#dc2626">▼</span>':arrow;
      return {name,rAvg:rAvg||0,arrow};
    }).sort((a,b)=>b.rAvg-a.rAvg);
    form.innerHTML=formRows.length?formRows.map(f=>{const st=Math.max(1,Math.min(3,Math.round(f.rAvg)));return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--border)"><span>${esc(f.name)}</span><span>${"★".repeat(st)}<span style="color:var(--border)">${"★".repeat(3-st)}</span> ${f.arrow}</span></div>`;}).join(""):'<div style="font-size:11px;color:var(--text3)">Noch keine Blitz-Bewertungen.</div>';
  }catch(e){fair.innerHTML='<div style="font-size:11px;color:var(--text3)">Offline</div>';}
}
function anInit(){anRenderMeilensteine();anLoadServer();}
// Startup-Hinweis: stärksten Meilenstein einmal pro Sitzung als Banner zeigen
let milestoneHintShown=false;
function showMilestoneHint(){
  if(milestoneHintShown||document.body.classList.contains("quiz-extern"))return;
  const ms=computeMilestones();
  if(!ms.length)return;
  milestoneHintShown=true;
  const m=ms[0];
  const bar=document.createElement("div");
  bar.style.cssText="position:fixed;left:12px;right:12px;bottom:12px;z-index:8000;background:#065f46;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:12.5px;display:flex;align-items:center;gap:10px";
  bar.innerHTML=`<span style="font-size:20px">💡</span><div style="flex:1">Tipp: <strong>${esc(m.name)}</strong> hat sich bei „${esc(m.label)}" stark verbessert – heute loben!</div><button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:8px 10px;cursor:pointer;min-height:36px">OK</button>`;
  document.body.appendChild(bar);
  setTimeout(()=>{if(bar.parentElement)bar.remove();},14000);
}

// Live-Action-Tracker: Co-Trainer tippt während des Spiels 4 Aktionen pro Spieler.
// Macht das Blitz-Rating danach evidenzbasiert.
const AT_ACTIONS=[
  {key:"pass",label:"Guter Pass",col:"#15803d",emo:"🟢"},
  {key:"dribbling",label:"Dribbling",col:"#1a56db",emo:"🔵"},
  {key:"gewinn",label:"Ballgewinn",col:"#ca8a04",emo:"🟡"},
  {key:"verlust",label:"Ballverlust",col:"#dc2626",emo:"🔴"}
];
// Korrektur 3: Der Torwart bekommt eigene, positionsgerechte Rating-Buttons.
const AT_ACTIONS_TW=[
  {key:"parade",label:"Parade",col:"#15803d",emo:"🟢"},
  {key:"aufbau",label:"Aufbau/Abwurf",col:"#1a56db",emo:"🔵"},
  {key:"heraus",label:"Herauslaufen",col:"#ca8a04",emo:"🟡"},
  {key:"fehler",label:"Torwart-Fehler",col:"#dc2626",emo:"🔴"}
];
const AT_EMO={}; [...AT_ACTIONS,...AT_ACTIONS_TW].forEach(a=>AT_EMO[a.key]=a.emo); AT_EMO.tor="⚽"; // Tore werden über tickerGoal erfasst
function atActionsFor(name){ return getKader(name)?.tw ? AT_ACTIONS_TW : AT_ACTIONS; }
let atSel="", atCounts={}, atLog=[], atUid=0; // atCounts[spieler][aktion]=n ; atLog = Undo-Feed

/* ═══════════════════════════════════
   TEAM-QUESTS (Phase 8-F) – kollektive Missionen pro Spieltag.
   Bewusst TEAM-Ziele (nicht Einzelwertung): das ganze Team zieht an einem Strang.
   Fortschritt = Summe der positiven Aktionen aus atCounts (bereits live im Speicher,
   kein Extra-Query). Beim Erreichen: confetti() + Toast, genau einmal (questDone).
   Nur positive Aktionen – Ballverlust/Fehler zählen bewusst nicht mit.
═══════════════════════════════════ */
const TEAM_QUESTS=[
  {key:"pass",icon:"🎯",label:"Pass-Maschine",target:20},
  {key:"dribbling",icon:"🌀",label:"Dribbel-Show",target:10},
  {key:"gewinn",icon:"🦅",label:"Ball-Räuber",target:12},
  {key:"parade",icon:"🧤",label:"Fels im Tor",target:5},
  {key:"tor",icon:"⚽",label:"Torfabrik",target:5}
];
// Editierbare Laufzeit-Kopie aus team_config (TEAM_QUESTS bleibt der Default) + Freitext-Belohnung.
let teamQuests=TEAM_QUESTS.map(q=>({...q})), teamBelohnung="", teamDoubleXpUntil=null;
// Standard-Federbelohnung, wenn das Team ALLE Quests eines Spieltags schafft (editierbar, Default 20).
let teamQuestFedern=20;
// HOTFIX 4: waehlbare Quest-Aktionen (qkey) im CRUD-Editor
const QUEST_KEYS=[
  {key:"pass",label:"Pässe"},{key:"dribbling",label:"Dribblings"},{key:"gewinn",label:"Ballgewinne"},
  {key:"parade",label:"Paraden (TW)"},{key:"tor",label:"Tore"},{key:"aufbau",label:"Spielaufbau"},{key:"heraus",label:"Herausspielen"}
];
async function loadTeamConfig(){
  // Belohnung + Booster bleiben in team_config; Quests kommen aus der team_quests-Tabelle
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=belohnung,double_xp_until,teamquest_federn`,{headers:sbAuthHeaders()});
    if(r.ok){const c=(await r.json())[0]; if(c){teamBelohnung=c.belohnung||""; teamDoubleXpUntil=c.double_xp_until||null; teamQuestFedern=(c.teamquest_federn==null?20:Number(c.teamquest_federn));}}
  }catch(e){}
  await loadTeamQuests();
}
async function loadTeamQuests(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_quests?select=id,qkey,icon,label,target,aktiv,sort&order=sort.asc`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+(sbToken()||SB_KEY)}});
    if(!r.ok)return;
    let rows=await r.json();
    if(!rows.length){ // leer -> mit Defaults seeden (nur Trainer darf schreiben)
      if(sbToken()){
        try{await fetch(`${SB_URL}/rest/v1/team_quests`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=representation'}),body:JSON.stringify(TEAM_QUESTS.map((q,i)=>({team:'adler1',qkey:q.key,icon:q.icon,label:q.label,target:q.target,aktiv:true,sort:i})))}).then(rr=>rr.ok&&rr.json().then(d=>rows=d));}catch(e){}
      }
      if(!rows.length)return; // anon/offline -> Defaults aus data.js bleiben aktiv
    }
    // auf die von questStripHTML/questCheck erwartete Struktur mappen (qkey -> key)
    teamQuests=rows.filter(r=>r.aktiv!==false).sort((a,b)=>(a.sort||0)-(b.sort||0))
      .map(r=>({key:r.qkey||"pass",icon:r.icon||"🏆",label:r.label||"Quest",target:Number(r.target)||10,_id:r.id}));
  }catch(e){}
}
/* FEAT T: Double-XP-Booster – der Trainer schaltet nur das Zeitfenster in team_config.
   Den Multiplikator wendet ausschließlich die Server-RPC xp_award_event an. */
function xpBoostActive(){return !!(teamDoubleXpUntil&&new Date(teamDoubleXpUntil)>new Date());}
async function xpBoosterToggle(btn){
  const neu=xpBoostActive()?null:new Date(Date.now()+72*3600*1000).toISOString();
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({double_xp_until:neu,updated_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Konnte Booster nicht schalten","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  teamDoubleXpUntil=neu;
  toast(neu?"⚡ Doppel-"+XP_LABEL+" aktiv – 72 Stunden!":"Booster beendet");
  questEditorOpen(); // Editor mit aktualisiertem Status neu zeichnen
}
let questDone=new Set();
function questCountsLive(){
  const c={};
  Object.values(atCounts).forEach(pl=>Object.keys(pl).forEach(k=>{c[k]=(c[k]||0)+pl[k];}));
  return c;
}
function questStripHTML(counts){
  const items=teamQuests.map(q=>{
    const n=counts[q.key]||0,done=n>=q.target,pct=Math.min(100,Math.round(n/q.target*100));
    return `<div style="flex:1;min-width:86px">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text2);margin-bottom:2px">
        <span>${q.icon} ${esc(q.label)}</span><span style="font-weight:700;color:${done?"#059669":"var(--text)"}">${n}/${q.target}${done?" ✓":""}</span>
      </div>
      <div style="height:6px;background:var(--surface2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${done?"#059669":"var(--blue)"};transition:width .3s"></div>
      </div>
    </div>`;
  }).join("");
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);flex:1">🏆 Team-Quests heute</span>
      <button onclick="questEditorOpen()" style="border:none;background:transparent;color:var(--blue);font-size:11px;cursor:pointer;font-family:inherit">anpassen</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:10px">${items}</div>
    ${teamBelohnung?`<div style="margin-top:8px;font-size:11px;color:var(--text2)">🎁 Belohnung: <strong>${esc(teamBelohnung)}</strong></div>`:""}`;
}
// Spieltag-Sektion „Team-Quests": Ziele + Feder-Belohnung im Überblick, mit Editor-Zugang.
// Die Live-Fortschritte laufen weiter über den quest-strip im Aktions-Panel.
function questPanelRender(){
  const box=document.getElementById("quest-panel"); if(!box)return;
  const chips=teamQuests.map(q=>`<span style="font-size:11.5px;background:var(--surface2);border-radius:12px;padding:3px 9px">${q.icon} ${esc(q.label)} · ${q.target}</span>`).join("");
  box.innerHTML=`<div style="background:var(--surface);border:var(--border-s);border-left:3px solid #7c3aed;border-radius:12px;padding:12px 14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="flex:1;font-size:12px;font-weight:700">🏆 Diese Ziele holt sich das Team im Spiel</span>
      <button class="btn btn-sm" onclick="questEditorOpen()"><i class="ti ti-pencil"></i>Anpassen</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${chips||'<span style="font-size:11.5px;color:var(--text3)">Noch keine Quests – „Anpassen" antippen.</span>'}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px;font-size:11.5px;color:var(--text2)">
      ${teamQuestFedern>0?`<span style="background:#ecfdf5;color:#065f46;border-radius:12px;padding:3px 9px;font-weight:700">${XP_ICON} ${teamQuestFedern} Federn pro Kind, wenn ALLE Ziele fallen</span>`:`<span style="color:var(--text3)">Feder-Belohnung aus</span>`}
      ${teamBelohnung?`<span>🎁 <strong>${esc(teamBelohnung)}</strong></span>`:""}
    </div>
  </div>`;
}
// Erst prüfen ob eine Quest NEU geschafft wurde – dann feiern (einmalig pro Spieltag).
function questCheck(counts){
  counts=counts||questCountsLive();
  const cont=document.getElementById("quest-strip");
  teamQuests.forEach(q=>{
    if((counts[q.key]||0)>=q.target&&!questDone.has(q.key)){
      questDone.add(q.key);
      if(cont)confetti(cont);
      toast(`🏆 Team-Quest geschafft: ${q.label}!`);
      try{navigator.vibrate&&navigator.vibrate([30,40,30]);}catch(e){}
    }
  });
  teamQuestRewardMaybe(); // alle geschafft? -> Federn an jedes mitspielende Kind
}
// Wenn das Team ALLE Quests eines Spieltags schafft, bekommt jedes nominierte Kind die
// eingestellte Feder-Belohnung – automatisch, serverseitig idempotent pro Spieler+Spieltag.
let questRewardedFor=null;
async function teamQuestRewardMaybe(){
  if(!teamQuests.length||questDone.size<teamQuests.length)return; // noch nicht alle geschafft
  if(teamQuestFedern<=0)return;                                    // Belohnung deaktiviert
  if(!sbToken())return;                                            // nur das Trainerteam vergibt
  const datum=spieltagKey();
  if(questRewardedFor===datum)return;                              // in dieser Sitzung schon vergeben
  questRewardedFor=datum;
  const namen=(typeof nominierteSpieler==="function")?nominierteSpieler():[];
  let n=0;
  for(const name of namen){
    const k=getKader(name); if(!k||!k._id)continue;
    try{const d=await xpTeamQuestAward(k._id,datum); if(d>0)n++;}catch(e){}
  }
  if(n>0){
    const cont=document.getElementById("quest-strip"); if(cont)confetti(cont);
    toast(`🎉 Alle Quests geschafft! ${XP_ICON} ${teamQuestFedern} Federn für ${n} ${n===1?"Kind":"Kinder"}!`);
    try{navigator.vibrate&&navigator.vibrate([40,60,40,60,80]);}catch(e){}
  }
}
async function xpTeamQuestAward(spielerId,datum){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_teamquest`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_datum:datum})});
    if(!r.ok)return 0;
    return (await r.json())||0;
  }catch(e){return 0;}
}
// Beim Laden bereits erfüllte Quests still als „erledigt" markieren (kein Confetti beim Öffnen).
function questSeedDone(){
  const counts=questCountsLive();
  questDone=new Set(teamQuests.filter(q=>(counts[q.key]||0)>=q.target).map(q=>q.key));
}
// Trainer-Editor: Ziel & Name je Quest anpassen + Freitext-Belohnung für die Kids.
let qeDraft=[];
function questEditorOpen(){
  document.getElementById("quest-editor")?.remove();
  qeDraft=teamQuests.map(q=>({key:q.key,icon:q.icon,label:q.label,target:q.target}));
  const m=document.createElement("div");
  m.id="quest-editor";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:440px;width:100%;margin:auto">
    <div style="font-weight:700;margin-bottom:2px">🏆 Team-Quests verwalten</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Quests anlegen, bearbeiten oder löschen. Jede Quest zählt eine Aktion bis zum Ziel.</div>
    <div id="qe-list"></div>
    <button class="btn btn-sm" style="margin-bottom:12px" onclick="qeAddQuest()"><i class="ti ti-plus"></i>Quest hinzufügen</button>
    <div style="margin:0 0 12px;padding:10px;border:1.5px dashed #10b981;border-radius:10px;background:#ecfdf5">
      <label style="font-weight:700;font-size:12.5px;color:#065f46">${XP_ICON} Federn, wenn das Team ALLE Quests schafft</label>
      <div style="font-size:11px;color:#047857;margin:2px 0 6px">Bekommt jedes mitspielende Kind gutgeschrieben – automatisch, einmal pro Spieltag.</div>
      <div style="display:flex;align-items:center;gap:8px">
        <input id="qe-federn" type="number" min="0" max="200" value="${teamQuestFedern}" style="width:90px;padding:8px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:14px;font-weight:700;box-sizing:border-box">
        <span style="font-size:12px;color:var(--text2)">${XP_ICON} pro Kind</span>
      </div>
    </div>
    <label style="font-size:11px;color:var(--text2)">🎁 Zusätzliche Belohnung (Freitext, optional)</label>
    <textarea id="qe-belohnung" rows="2" placeholder="z. B. Eis für alle beim nächsten Training!" style="width:100%;padding:8px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px;margin:4px 0 12px;box-sizing:border-box">${esc(teamBelohnung)}</textarea>
    <div style="margin:0 0 12px;padding:10px;border:1.5px dashed #f59e0b;border-radius:10px;background:#fffbeb">
      <div style="font-weight:700;font-size:12.5px;color:#92400e;margin-bottom:2px">⚡ Doppel-${XP_LABEL}-Booster</div>
      <div style="font-size:11px;color:#78716c;margin-bottom:8px">${xpBoostActive()?`Aktiv bis ${new Date(teamDoubleXpUntil).toLocaleString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})} Uhr – alle ${XP_LABEL} zählen doppelt!`:"72-Stunden-Fenster (z. B. übers Wochenende). Den 2x-Multiplikator rechnet der Server."}</div>
      <button class="btn btn-sm ${xpBoostActive()?"":"btn-p"}" onclick="xpBoosterToggle(this)">${xpBoostActive()?"Booster beenden":"⚡ 72h aktivieren"}</button>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" onclick="document.getElementById('quest-editor').remove()">Abbrechen</button>
      <button class="btn btn-p" onclick="questSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  qeRenderList();
}
function qeSyncFromInputs(){
  document.querySelectorAll("#qe-list [data-i]").forEach(el=>{
    const i=+el.dataset.i, f=el.dataset.f; if(!qeDraft[i])return;
    if(f==="target")qeDraft[i].target=Math.max(1,parseInt(el.value)||1);
    else if(f==="key")qeDraft[i].key=el.value;
    else qeDraft[i][f]=el.value;
  });
}
function qeRenderList(){
  const wrap=document.getElementById("qe-list"); if(!wrap)return;
  wrap.innerHTML=qeDraft.map((q,i)=>`<div style="display:flex;align-items:center;gap:5px;margin-bottom:8px">
    <input data-i="${i}" data-f="icon" value="${esc(q.icon||"🏆")}" maxlength="2" style="width:34px;text-align:center;padding:7px 2px;border:var(--border-s);border-radius:6px;font-size:15px">
    <input data-i="${i}" data-f="label" value="${esc(q.label||"")}" placeholder="Name" style="flex:1;min-width:70px;padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
    <select data-i="${i}" data-f="key" style="padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">${QUEST_KEYS.map(k=>`<option value="${k.key}"${k.key===q.key?" selected":""}>${k.label}</option>`).join("")}</select>
    <input data-i="${i}" data-f="target" type="number" min="1" value="${q.target||10}" title="Ziel" style="width:52px;padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
    <button onclick="qeDelQuest(${i})" title="Löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;font-size:16px">🗑</button>
  </div>`).join("")||'<div style="font-size:12px;color:var(--text3);padding:6px">Noch keine Quests – füge eine hinzu.</div>';
}
function qeAddQuest(){ qeSyncFromInputs(); qeDraft.push({key:"pass",icon:"🏆",label:"Neue Quest",target:10}); qeRenderList(); }
function qeDelQuest(i){ qeSyncFromInputs(); qeDraft.splice(i,1); qeRenderList(); }
async function questSave(btn){
  qeSyncFromInputs();
  const clean=qeDraft.filter(q=>(q.label||"").trim()).map(q=>({key:q.key||"pass",icon:(q.icon||"🏆").trim()||"🏆",label:q.label.trim(),target:Math.max(1,parseInt(q.target)||1)}));
  teamBelohnung=(document.getElementById("qe-belohnung")?.value||"").trim();
  teamQuestFedern=Math.max(0,Math.min(200,parseInt(document.getElementById("qe-federn")?.value)||0));
  if(btn)btn.disabled=true;
  try{
    // HOTFIX 4: Quests -> team_quests (replace-all), Belohnung bleibt in team_config
    const del=await fetch(`${SB_URL}/rest/v1/team_quests?team=eq.adler1`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(del))return;
    if(clean.length){
      const ins=await fetch(`${SB_URL}/rest/v1/team_quests`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(clean.map((q,i)=>({team:'adler1',qkey:q.key,icon:q.icon,label:q.label,target:q.target,aktiv:true,sort:i})))});
      if(!ins.ok){toast("Speichern fehlgeschlagen","err");return;}
    }
    await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({id:1,belohnung:teamBelohnung,teamquest_federn:teamQuestFedern,updated_at:new Date().toISOString()})});
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  teamQuests=clean.map(q=>({...q}));
  document.getElementById("quest-editor")?.remove();
  toast("Team-Quests gespeichert ✓");
  questSeedDone(); if(document.getElementById("action-panel"))atRender();
  if(document.getElementById("quest-panel"))questPanelRender();
  if(typeof curSection!=="undefined"&&curSection==="home"&&typeof renderHome==="function")renderHome();
}

/* ═══════════════════════════════════
   VOICE-TO-ACTION (Phase 8-E) – BETA, bewusst als Bonus, nie als Hauptweg.
   Kritische Design-Entscheidungen (siehe Tech-Lead-Analyse):
   • Manuell-first: der Tap-Tracker bleibt der Arbeitspferd; Voice ist opt-in.
   • Nur wenn SpeechRecognition unterstützt wird (auf iOS oft wackelig) – sonst
     sauberer Hinweis, kein toter Button.
   • Suchraum = NUR nominierte Spieler (kleiner Namensraum) + Levenshtein-Fuzzy-Match,
     weil Eigennamen das Schwierigste für STT sind.
   • NIEMALS Auto-Push: jede erkannte Aktion muss vor dem Senden bestätigt werden
     (Fehlerkennung „Tor durch X" darf nicht ungeprüft in den Eltern-Ticker).
   • Nur positive Aktionen per Sprache (konsistent zum Pädagogik-Filter).
═══════════════════════════════════ */
const AT_LABEL={}; [...AT_ACTIONS,...AT_ACTIONS_TW].forEach(a=>AT_LABEL[a.key]=a.label); AT_LABEL.tor="Tor";
const VOICE_ACTIONS={ // gesprochenes Schlüsselwort → Aktions-Key (nur positive)
  tor:"tor",tooor:"tor",treffer:"tor",tore:"tor",
  pass:"pass",zuspiel:"pass",abspiel:"pass",paesse:"pass",
  dribbling:"dribbling",dribbel:"dribbling",dribbelt:"dribbling",
  ballgewinn:"gewinn",gewinn:"gewinn",erobert:"gewinn",eroberung:"gewinn",
  parade:"parade",gehalten:"parade",reflex:"parade",gehalt:"parade",
  aufbau:"aufbau",abwurf:"aufbau",
  herauslaufen:"heraus",heraus:"heraus",herausgelaufen:"heraus"
};
const voiceSupported=!!(typeof window!=="undefined"&&(window.SpeechRecognition||window.webkitSpeechRecognition));
let voiceRec=null, voiceOn=false;
function voiceNorm(s){return String(s||"").toLowerCase().replace(/[^a-zäöüß\s]/g,"").replace(/\s+/g," ").trim();}
function levenshtein(a,b){
  a=a||"";b=b||"";const m=a.length,n=b.length;
  if(!m)return n;if(!n)return m;
  let prev=Array.from({length:n+1},(_,i)=>i),cur=new Array(n+1);
  for(let i=1;i<=m;i++){cur[0]=i;
    for(let j=1;j<=n;j++){const cost=a[i-1]===b[j-1]?0:1;cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+cost);}
    [prev,cur]=[cur,prev];
  }
  return prev[n];
}
// Bestes Fuzzy-Match eines Wortes gegen den (kleinen) Kader; normalisierte Distanz ≤ 0.34.
function voiceMatchName(word,roster){
  let best=null,bd=1;
  roster.forEach(n=>{const nn=voiceNorm(n).split(" ")[0]; const d=levenshtein(word,nn)/Math.max(word.length,nn.length,1); if(d<bd){bd=d;best=n;}});
  return bd<=0.34?{name:best,score:bd}:null;
}
function voiceParse(alts){
  const roster=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():KADER.map(k=>k.name);
  let found=null;
  for(const raw of alts){
    const words=voiceNorm(raw).split(" ").filter(Boolean);
    let aktion=null;
    for(const w of words){ if(!aktion&&VOICE_ACTIONS[w]){aktion=VOICE_ACTIONS[w];break;} }
    let bestName=null,bestScore=1;
    for(const w of words){ const m=voiceMatchName(w,roster); if(m&&m.score<bestScore){bestScore=m.score;bestName=m.name;} }
    if(aktion&&bestName){found={aktion,name:bestName,transcript:raw};break;}
  }
  if(!found){ toast(`Nicht verstanden${alts[0]?`: „${alts[0]}"`:""} – bitte manuell tippen.`,"err"); return; }
  voiceConfirm(found.aktion,found.name,found.transcript);
}
function voiceConfirm(aktion,name,transcript){
  document.getElementById("voice-confirm")?.remove();
  const emo=AT_EMO[aktion]||"•", lbl=AT_LABEL[aktion]||aktion;
  const m=document.createElement("div");
  m.id="voice-confirm";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:16px;padding:20px;max-width:340px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">🎤 Verstanden${transcript?` · „${esc(transcript)}"`:""}</div>
    <div style="font-size:22px;font-weight:800;margin-bottom:2px">${emo} ${esc(lbl)}</div>
    <div style="font-size:15px;color:var(--text2);margin-bottom:16px">durch <strong>${esc(name)}</strong>?</div>
    <div style="display:flex;gap:10px">
      <button class="btn" style="flex:1" onclick="document.getElementById('voice-confirm').remove()"><i class="ti ti-x"></i>Verwerfen</button>
      <button class="btn btn-p" style="flex:1" onclick="voiceApply('${aktion}','${name.replace(/'/g,"")}');document.getElementById('voice-confirm').remove()"><i class="ti ti-check"></i>Übernehmen</button>
    </div></div>`;
  document.body.appendChild(m);
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
}
// Erst nach Bestätigung: setzt den Spieler aktiv und löst den regulären Aktions-Flow aus.
function voiceApply(aktion,name){
  atSel=name; atRender();
  if(aktion==="tor")tickerGoal(); else atTap(aktion);
}
function voiceBtnUpdate(){
  const b=document.getElementById("voice-btn");
  if(!b)return;
  b.innerHTML=voiceOn
    ? '<i class="ti ti-microphone-2"></i>Hört zu… (tippen = Stopp)'
    : '<i class="ti ti-microphone"></i>Voice<span style="font-size:9px;background:#f59e0b;color:#fff;padding:1px 5px;border-radius:8px;margin-left:5px">Beta</span>';
  b.classList.toggle("btn-p",voiceOn);
}
function voiceStart(){
  if(!voiceSupported){toast("Spracheingabe wird auf diesem Gerät nicht unterstützt – bitte manuell tippen.","err");return;}
  try{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    voiceRec=new SR();
    voiceRec.lang="de-DE";voiceRec.interimResults=false;voiceRec.maxAlternatives=4;voiceRec.continuous=false;
    voiceRec.onresult=e=>{ const alts=[...e.results[0]].map(a=>a.transcript); voiceParse(alts); };
    voiceRec.onerror=ev=>{ voiceOn=false;voiceBtnUpdate(); if(ev.error==="not-allowed"||ev.error==="service-not-allowed")toast("Mikrofon-Zugriff nötig – bitte erlauben.","err"); else if(ev.error!=="no-speech"&&ev.error!=="aborted")toast("Sprachfehler – bitte manuell.","err"); };
    voiceRec.onend=()=>{ voiceOn=false;voiceBtnUpdate(); };
    voiceOn=true;voiceBtnUpdate();
    voiceRec.start();
  }catch(err){ voiceOn=false;voiceBtnUpdate(); toast("Sprachstart fehlgeschlagen – bitte manuell.","err"); }
}
function voiceStop(){ try{voiceRec&&voiceRec.stop();}catch(e){} voiceOn=false;voiceBtnUpdate(); }
function voiceToggle(){ voiceOn?voiceStop():voiceStart(); }

/* ═══════════════════════════════════
   VOICE DIARY (Phase 18.1) – der Trainer diktiert/tippt nach Abpfiff seine Gedanken.
   Landet in trainer_notes (nur Trainer); der Adler-Coach (KI) kann sie auf Wunsch
   einbeziehen. Freies Diktat (continuous), im Gegensatz zum Voice-to-Action-Tracker.
   Spracheingabe ist Bonus: ohne SpeechRecognition bleibt das Textfeld voll nutzbar. */
let vdRec=null, vdOn=false, vdBase="";
function vdMicUpdate(){
  const b=document.getElementById("vd-mic"); if(!b)return;
  b.innerHTML=vdOn?'<i class="ti ti-microphone-2"></i>Hört zu … (tippen = Stopp)':'<i class="ti ti-microphone"></i>Aufnehmen';
  b.classList.toggle("btn-p",vdOn);
  const iv=document.getElementById("vd-interim"); if(iv&&!vdOn)iv.textContent="";
}
function vdMicToggle(){
  if(vdOn){ vdOn=false; try{vdRec&&vdRec.stop();}catch(e){} vdMicUpdate(); return; }
  if(!voiceSupported){toast("Spracheingabe wird auf diesem Gerät nicht unterstützt – bitte tippen.","err");return;}
  try{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    vdRec=new SR(); vdRec.lang="de-DE"; vdRec.interimResults=true; vdRec.continuous=true; vdRec.maxAlternatives=1;
    const ta=document.getElementById("vd-text"); vdBase=ta?ta.value:"";
    vdRec.onresult=e=>{
      let interim="",fin="";
      for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal)fin+=r[0].transcript; else interim+=r[0].transcript; }
      if(fin)vdBase=(vdBase?vdBase.trim()+" ":"")+fin.trim();
      if(ta)ta.value=vdBase+(interim?(vdBase?" ":"")+interim:"");
      const iv=document.getElementById("vd-interim"); if(iv)iv.textContent=interim?"… "+interim:"";
    };
    vdRec.onerror=ev=>{ vdOn=false; vdMicUpdate(); if(ev.error==="not-allowed"||ev.error==="service-not-allowed")toast("Mikrofon-Zugriff nötig – bitte erlauben.","err"); else if(ev.error!=="no-speech"&&ev.error!=="aborted")toast("Sprachfehler – bitte tippen.","err"); };
    vdRec.onend=()=>{ if(vdOn){ try{vdRec.start();}catch(e){ vdOn=false; vdMicUpdate(); } } else { const ta2=document.getElementById("vd-text"); if(ta2)ta2.value=vdBase; vdMicUpdate(); } };
    vdOn=true; vdMicUpdate(); vdRec.start();
  }catch(err){ vdOn=false; vdMicUpdate(); toast("Sprachstart fehlgeschlagen – bitte tippen.","err"); }
}
function voiceDiaryOpen(datum){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  datum=datum||null;
  document.getElementById("vd-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="vd-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Trainer-Notiz");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal){vdOn=false;try{vdRec&&vdRec.stop();}catch(e){}modal.remove();}};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const micBtn=voiceSupported
    ?`<button id="vd-mic" class="btn btn-sm" onclick="vdMicToggle()"><i class="ti ti-microphone"></i>Aufnehmen</button>`
    :`<span style="font-size:11px;color:var(--text3)">🎤 Spracheingabe auf diesem Gerät nicht verfügbar – bitte tippen.</span>`;
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🎤 Trainer-Notiz</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px">Direkt nach Abpfiff festhalten, bevor Details weg sind. Der Adler-Coach (KI) kann deine Notizen später einbeziehen.</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">${micBtn}<span id="vd-interim" style="font-size:12px;color:var(--text3);flex:1"></span></div>
    <textarea id="vd-text" rows="5" placeholder="z. B. Umschaltspiel war heute mies – wir standen nach Ballverlust zu offen." style="width:100%;box-sizing:border-box;padding:10px;border:var(--border-s);border-radius:10px;font-family:inherit;font-size:13px;line-height:1.5;background:var(--surface2);color:var(--text);resize:vertical"></textarea>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-p btn-sm" onclick="vdSave(${datum?`'${jsq(datum)}'`:"null"})"><i class="ti ti-device-floppy"></i>Notiz speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="vdOn=false;try{vdRec&&vdRec.stop()}catch(e){};document.getElementById('vd-modal').remove()">Schließen</button>
    </div>
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text3);margin:14px 0 4px">Letzte Notizen</div>
    <div id="vd-list"><div style="font-size:12px;color:var(--text3)">Lade …</div></div>`;
  modal.appendChild(c);document.body.appendChild(modal);
  vdListLoad();
}
async function vdListLoad(){
  const box=document.getElementById("vd-list"); if(!box)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_notes?select=id,datum,text,created_at&order=created_at.desc&limit=6`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=await r.json();}catch(e){}
  if(!rows.length){box.innerHTML='<div style="font-size:12px;color:var(--text3)">Noch keine Notizen.</div>';return;}
  const fmt=d=>{const t=new Date(d);return t.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})+" "+t.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});};
  box.innerHTML=rows.map(n=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--surface2)">
    <div style="flex:1"><div style="font-size:13px;line-height:1.45">${esc(n.text)}</div><div style="font-size:10px;color:var(--text3);margin-top:2px">${fmt(n.created_at)}${n.datum?" · Spieltag "+esc(n.datum):""}</div></div>
    <button onclick="vdDelete(${n.id})" aria-label="Notiz löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:32px;min-height:32px"><i class="ti ti-trash"></i></button>
  </div>`).join("");
}
async function vdSave(datum){
  const ta=document.getElementById("vd-text");
  const text=(ta&&ta.value||"").trim();
  if(!text){toast("Bitte erst etwas notieren","err");return;}
  if(vdOn){vdOn=false;try{vdRec&&vdRec.stop();}catch(e){}vdMicUpdate();}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/trainer_notes`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({datum:datum||null,text})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Notiz gespeichert ✓");
  if(ta)ta.value=""; vdBase="";
  vdListLoad();
}
async function vdDelete(id){
  if(!confirm("Diese Notiz löschen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_notes?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht löschen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  vdListLoad();
}
function atCount(sp,ak){return (atCounts[sp]&&atCounts[sp][ak])||0;}
function atSummary(sp){ if(!atCounts[sp])return ""; return Object.keys(atCounts[sp]).map(k=>atCounts[sp][k]?(AT_EMO[k]||"•")+atCounts[sp][k]:"").filter(Boolean).join(" "); }
async function atInit(){
  atCounts={};atSel="";atLog=[];atUid=0;
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&select=spieler,aktion`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      const rows=await r.json();
      rows.forEach(a=>{if(!atCounts[a.spieler])atCounts[a.spieler]={};atCounts[a.spieler][a.aktion]=(atCounts[a.spieler][a.aktion]||0)+1;});
    }
  }catch(e){}
  await loadTeamConfig(); // editierbare Quests + Belohnung laden
  await atLoadGegentore(); // Gegentor-Stand fürs Live-Ergebnis
  questSeedDone(); // bereits erfüllte Quests still markieren, bevor gerendert wird
  atRender();
  questPanelRender();      // Team-Quest-Sektion im Spieltag zeichnen
  teamQuestRewardMaybe();  // falls beim Neuladen bereits alle Quests geschafft sind
}
function atRender(){
  const box=document.getElementById("action-panel");
  if(!box)return;
  box.innerHTML=`
    <div id="quest-strip" style="position:relative;overflow:hidden;background:var(--surface);border:var(--border-s);border-radius:12px;padding:10px 12px;margin-bottom:12px">${questStripHTML(questCountsLive())}</div>
    <button onclick="atLiveOpen()" style="width:100%;min-height:64px;margin-bottom:10px;border:none;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-size:17px;font-weight:800;font-family:inherit;cursor:pointer">⚡ Live-Aktion starten (Vollbild)</button>
    ${voiceSupported?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <button id="voice-btn" class="btn btn-sm" onclick="voiceToggle()"><i class="ti ti-microphone"></i>Voice<span style="font-size:9px;background:#f59e0b;color:#fff;padding:1px 5px;border-radius:8px;margin-left:5px">Beta</span></button>
      <span style="font-size:10px;color:var(--text3);flex:1;min-width:140px">Sag z. B. „Pass Leon" – du bestätigst vor dem Senden. Braucht Netz &amp; Ruhe.</span>
    </div>`:''}
    <div style="font-size:11px;color:var(--text3);text-align:center;margin-top:2px">Alle Aktionen – Pässe, Dribblings, Ballgewinne, Paraden, Tore &amp; Gegentore – erfasst du im Vollbild. Ein Elternteil kann per <b>Helfer-Link</b> übernehmen.</div>`;
}
function atPick(n){atSel=n;atRender();}

