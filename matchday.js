/* ═══════════════════════════════════════════════════════════
   ADLER MATCHDAY & ELTERN LAYER (Modularisierung 7/8)
   1) Eltern-Portal: OTP-Login, Dashboard, RSVP, Carpool, Fanfacts,
      Teamkasse, Kabine (Kids-Mode) + KADER/TRAINER-Stammdaten.
   2) Spieltag/Taktik: Bearbeitbare Aufstellung, Print/PDF,
      Taktik-Board, Canvas-Draw, Video-Taktikboard.
   3) Termine/Match-Zentrale: Kalender, Nominierung+RSVP, Match-Uhr,
      Ticker, Spielbericht, Analyse, Blitz, Voice, Live-Aktion.
   Laedt nach quiz.js, vor dem Haupt-Skript.
   Top-Level: nur renderTrainerUI() (blockintern definiert).
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════
   ELTERN-PORTAL / OTP-AUTH (Phase 10-L) – passwortloser Login per 6-stelligem Code.
   Bewusst OTP-Code statt Magic-Link: der Code wird IN der PWA eingegeben → Session
   bleibt im selben Kontext (kein Browser-Wechsel). Session-Format = SB_TOKEN_KEY,
   damit Refresh/Header/401-Handling wiederverwendet werden.
   Merksatz: Rollen-Routing = UX, die Sicherheit macht ausschließlich die RLS.
═══════════════════════════════════ */
async function authOtpRequest(email){
  const r=await fetch(`${SB_URL}/auth/v1/otp`,{method:"POST",headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:true})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error_description||data.msg||data.error||"Code konnte nicht gesendet werden");
  return true;
}
async function authOtpVerify(email,token){
  const r=await fetch(`${SB_URL}/auth/v1/verify`,{method:"POST",headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,token,type:"email"})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.access_token)throw new Error(data.error_description||data.msg||data.error||"Code ungültig oder abgelaufen");
  const expiresAt=data.expires_at||(Math.floor(Date.now()/1000)+(data.expires_in||3600));
  localStorage.setItem(SB_TOKEN_KEY,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token||null,expires_at:expiresAt}));
  return true;
}
async function authRole(){
  if(!sbToken())return null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/profiles?select=role&limit=1`,{headers:sbAuthHeaders()});
    if(!r.ok)return null;
    const rows=await r.json();
    return (rows[0]&&rows[0].role)||null;
  }catch(e){return null;}
}
let epEmail="";
async function renderElternPortal(){
  let root=document.getElementById("eltern-portal");
  if(!root){root=document.createElement("div");root.id="eltern-portal";root.style.cssText="min-height:100vh;background:#f1f5f9;font-family:inherit;padding:16px";document.body.appendChild(root);}
  // UX 5 (Forever-Login): access_token abgelaufen, aber refresh_token noch gültig? Still erneuern,
  // bevor wir zum OTP-Login zurückfallen – Eltern bleiben praktisch dauerhaft eingeloggt.
  if(!sbToken()){const s=sbSession();if(s&&s.refresh_token){root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Lade…</div>';await sbRefreshToken();}}
  if(sbToken()){
    root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Lade…</div>';
    const role=await authRole();
    if(role==="parent")return elternPortalDashboard(root);
    if(role==="trainer")return elternPortalTrainerNotice(root);
    localStorage.removeItem(SB_TOKEN_KEY); // Session ohne Profil/Rolle → verwerfen
  }
  elternPortalLogin(root);
}
function elternPortalLogin(root){
  root.innerHTML=`<div style="max-width:360px;margin:7vh auto 0;background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.1)">
    <div style="text-align:center;font-size:40px">🦅</div>
    <div style="text-align:center;font-size:18px;font-weight:800;margin-top:6px">Eltern-Bereich</div>
    <div style="text-align:center;font-size:12px;color:#64748b;margin:6px 0 18px">SV Adler Dellbrück U9</div>
    <div id="ep-step-email">
      <label style="font-size:12px;color:#475569">E-Mail-Adresse</label>
      <input id="ep-email" type="email" inputmode="email" autocomplete="email" placeholder="name@mail.de" style="width:100%;padding:11px;margin:6px 0 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px;box-sizing:border-box">
      <button id="ep-send" onclick="elternPortalSend()" style="width:100%;padding:13px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-size:15px;font-weight:700;cursor:pointer">Code anfordern</button>
      <button onclick="elternPortalHaveCode()" style="width:100%;padding:9px;margin-top:8px;border:none;background:none;color:#64748b;font-size:12px;cursor:pointer">Code schon erhalten? → eingeben</button>
    </div>
    <div id="ep-step-code" style="display:none">
      <div style="font-size:12px;color:#475569;margin-bottom:6px">Code aus der E-Mail an <b id="ep-email-show"></b>:</div>
      <input id="ep-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Code eingeben" style="width:100%;padding:11px;margin:6px 0 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:22px;letter-spacing:4px;text-align:center;box-sizing:border-box">
      <button id="ep-verify" onclick="elternPortalVerify()" style="width:100%;padding:13px;border:none;border-radius:10px;background:#059669;color:#fff;font-size:15px;font-weight:700;cursor:pointer">Anmelden</button>
      <button onclick="elternPortalLogin(document.getElementById('eltern-portal'))" style="width:100%;padding:9px;margin-top:8px;border:none;background:none;color:#64748b;font-size:12px;cursor:pointer">← andere E-Mail</button>
    </div>
    <div id="ep-err" style="font-size:12px;color:#dc2626;min-height:16px;margin-top:10px;text-align:center"></div>
    <div style="font-size:10.5px;color:#94a3b8;text-align:center;margin-top:14px">Nur E-Mail-Adressen, die dein Trainer hinterlegt hat, sehen die Daten ihres Kindes.</div>
  </div>`;
}
async function elternPortalSend(){
  const email=document.getElementById("ep-email")?.value.trim().toLowerCase();
  const err=document.getElementById("ep-err");if(err)err.textContent="";
  if(!email||!/.+@.+\..+/.test(email)){if(err)err.textContent="Bitte eine gültige E-Mail eingeben";return;}
  const btn=document.getElementById("ep-send");if(btn){btn.disabled=true;btn.textContent="Sende…";}
  try{
    // Whitelist-Gate: nur vom Trainer hinterlegte E-Mails dürfen einen Code anfordern (Anti-Spam).
    let ok=true;
    try{const r=await fetch(`${SB_URL}/rest/v1/rpc/is_email_whitelisted`,{method:"POST",headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_email:email})});if(r.ok)ok=await r.json();}catch(e){}
    if(!ok){if(err)err.textContent="Diese E-Mail ist noch nicht freigeschaltet. Bitte gib sie deinem Trainer.";if(btn){btn.disabled=false;btn.textContent="Code anfordern";}return;}
    await authOtpRequest(email);
    epEmail=email;
    document.getElementById("ep-step-email").style.display="none";
    document.getElementById("ep-step-code").style.display="";
    document.getElementById("ep-email-show").textContent=email;
    document.getElementById("ep-code")?.focus();
  }catch(e){if(err)err.textContent=e.message;}
  finally{if(btn){btn.disabled=false;btn.textContent="Code anfordern";}}
}
// Direkt zur Code-Eingabe, ohne neu anzufordern (z. B. bei Rate-Limit oder Code schon in der Inbox).
function elternPortalHaveCode(){
  const email=document.getElementById("ep-email")?.value.trim().toLowerCase();
  const err=document.getElementById("ep-err");if(err)err.textContent="";
  if(!email||!/.+@.+\..+/.test(email)){if(err)err.textContent="Bitte zuerst deine E-Mail eingeben";return;}
  epEmail=email;
  document.getElementById("ep-step-email").style.display="none";
  document.getElementById("ep-step-code").style.display="";
  document.getElementById("ep-email-show").textContent=email;
  document.getElementById("ep-code")?.focus();
}
async function elternPortalVerify(){
  const code=(document.getElementById("ep-code")?.value||"").replace(/\D/g,""); // nur Ziffern, Leerzeichen raus
  const err=document.getElementById("ep-err");if(err)err.textContent="";
  if(!code||code.length<6){if(err)err.textContent="Bitte den Code aus der E-Mail eingeben";return;}
  const btn=document.getElementById("ep-verify");if(btn){btn.disabled=true;btn.textContent="Prüfe…";}
  try{
    await authOtpVerify(epEmail,code);
    document.getElementById("eltern-portal")?.remove();
    renderElternPortal();
  }catch(e){if(err)err.textContent=e.message;if(btn){btn.disabled=false;btn.textContent="Anmelden";}}
}
function elternPortalLogout(){ localStorage.removeItem(SB_TOKEN_KEY); document.getElementById("eltern-portal")?.remove(); renderElternPortal(); }
function elternPortalDashboard(root){
  root.innerHTML=`<div style="max-width:440px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 4px 12px">
      <div style="font-size:18px;font-weight:800">🦅 Eltern-Bereich</div>
      <button onclick="elternPortalLogout()" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer">Abmelden</button>
    </div>
    <div id="ep-dash-body"><div style="text-align:center;padding:40px;color:#64748b">Lade…</div></div>
  </div>`;
  elternDashLoad();
}
const EP_RSVP={zugesagt:{lbl:"Zusage",emo:"👍",col:"#059669"},abgesagt:{lbl:"Absage",emo:"👎",col:"#dc2626"},krank:{lbl:"Krank",emo:"🤒",col:"#d97706"}};
async function elternDashLoad(){
  const body=document.getElementById("ep-dash-body");
  if(!body)return;
  const card=(inner)=>`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">${inner}</div>`;
  const heute=new Date().toISOString().slice(0,10);
  // UX 3: kam der Elternteil über einen Deep-Link (?rsvp=…)? Dann Nudge erzwingen + hinscrollen.
  let rsvpIntent=null; try{rsvpIntent=sessionStorage.getItem("adler_rsvp_intent");}catch(e){}
  let kids=[], termin=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?select=spieler_id,label,kader(id,name,nr)`,{headers:sbAuthHeaders()});if(r.ok)kids=await r.json();}catch(e){}
  if(!kids.length){ body.innerHTML=card('<div style="color:#475569;font-size:13px;line-height:1.6">Dein Trainer hat diese E-Mail noch <b>keinem Kind</b> zugeordnet.<br>Bitte gib ihm die E-Mail-Adresse, mit der du dich hier angemeldet hast.</div>'); return; }
  let termineListe=[]; // UX 6: Timeline – die nächsten Termine, nicht nur der eine
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&datum=gte.${heute}&order=datum.asc&limit=12`,{headers:sbAuthHeaders()});if(r.ok){termineListe=await r.json();termin=termineListe[0]||null;}}catch(e){}
  let rsvp={};
  if(termin){
    try{const ids=kids.map(k=>k.spieler_id).join(",");const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${termin.id}&spieler_id=in.(${ids})&select=spieler_id,status,kommentar`,{headers:sbAuthHeaders()});if(r.ok){(await r.json()).forEach(x=>rsvp[x.spieler_id]=x);}}catch(e){}
  }
  let html="";
  if(!termin){
    html+=card('<div style="font-weight:700;margin-bottom:2px">📅 Nächster Termin</div><div style="color:#64748b;font-size:13px">Aktuell ist kein Termin geplant.</div>');
  }else{
    const m=(typeof TM_META!=="undefined"&&TM_META[termin.typ])||{icon:"📅",label:termin.typ,col:"#1e3a8a"};
    const d=new Date(termin.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=termin.uhrzeit?String(termin.uhrzeit).slice(0,5)+" Uhr":"";
    // UX 2: "Action Required" – fehlt die Rückmeldung, kommt ein grosses One-Tap-Widget
    // zuoberst. Bewusst dismiss-bar (pro Termin, pro Tag): Zwang erzeugt Fake-Zusagen.
    const offen=kids.filter(k=>!rsvp[k.spieler_id]);
    const nudgeKey="adler_rsvp_nudge_"+termin.id;
    let nudgeDismissed=false; try{nudgeDismissed=localStorage.getItem(nudgeKey)===heute;}catch(e){}
    // Deep-Link erzwingt das Widget – auch wenn heute schon weggeklickt (der Trainer hat gezielt erinnert)
    if(offen.length&&(!nudgeDismissed||rsvpIntent)){
      html+=`<div id="rsvp-nudge" style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:14px;padding:18px;margin-bottom:12px;color:#fff;box-shadow:0 6px 20px rgba(30,58,138,.35)">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;opacity:.85">❗ Rückmeldung fehlt</div>
        <div style="font-size:17px;font-weight:800;margin:4px 0 2px">${m.icon} ${esc(termin.titel||termin.gegner||m.label)}</div>
        <div style="font-size:12.5px;opacity:.85;margin-bottom:12px">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}${zeit?" · "+zeit:""}${termin.ort?" · "+esc(termin.ort):""}</div>
        ${offen.map(k=>{const kd=k.kader||{};return `<div style="background:rgba(255,255,255,.14);border-radius:12px;padding:12px;margin-bottom:8px">
          <div style="font-weight:700;font-size:14px;margin-bottom:8px">${esc(kd.name||"Kind")}${kd.nr!=null?` <span style="opacity:.7">#${kd.nr}</span>`:""}</div>
          <div style="display:flex;gap:8px">
            <button onclick="elternRsvp(${termin.id},${k.spieler_id},'zugesagt')" style="flex:1;min-height:52px;padding:12px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer">👍 Ist dabei</button>
            <button onclick="elternRsvp(${termin.id},${k.spieler_id},'abgesagt')" style="flex:1;min-height:52px;padding:12px;border:none;border-radius:10px;background:rgba(255,255,255,.22);color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer">👎 Kann nicht</button>
          </div></div>`;}).join("")}
        <button onclick="try{localStorage.setItem('${nudgeKey}','${heute}')}catch(e){};elternDashLoad()" style="width:100%;padding:8px;border:none;background:transparent;color:rgba(255,255,255,.75);font-family:inherit;font-size:12px;cursor:pointer;text-decoration:underline">Später entscheiden – heute nicht mehr fragen</button>
      </div>`;
    }
    html+=card(`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8">Nächster Termin</div>
      <div style="font-size:16px;font-weight:800;margin-top:2px">${m.icon} ${esc(termin.titel||termin.gegner||m.label)}</div>
      <div style="font-size:12.5px;color:#64748b;margin-top:3px">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}${zeit?" · "+zeit:""}${termin.ort?" · "+esc(termin.ort):""}</div>
      <button onclick="galerieOpen(${termin.id},'${(termin.titel||termin.gegner||m.label).replace(/'/g,'')}')" style="width:100%;margin-top:10px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#7c3aed;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📸 Event-Fotos ansehen &amp; teilen</button>`);
    html+=kids.map(k=>{
      const kd=k.kader||{}, cur=rsvp[k.spieler_id], st=cur?cur.status:null;
      const btns=Object.keys(EP_RSVP).map(s=>{
        const on=st===s, c=EP_RSVP[s];
        return `<button onclick="elternRsvp(${termin.id},${k.spieler_id},'${s}')" style="flex:1;min-width:92px;padding:11px 6px;border-radius:10px;border:1.5px solid ${on?c.col:"#e2e8f0"};background:${on?c.col:"#fff"};color:${on?"#fff":"#334155"};font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">${c.emo} ${c.lbl}</button>`;
      }).join("");
      return card(`<div style="font-weight:700;font-size:15px;margin-bottom:2px">${esc(kd.name||"Kind")}${kd.nr!=null?` <span style="color:#94a3b8;font-weight:600">#${kd.nr}</span>`:""}</div>
        <div id="xp-chip-${k.spieler_id}" style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:4px"></div>
        <div style="font-size:11.5px;color:${st?EP_RSVP[st].col:"#94a3b8"};margin-bottom:8px">${st?`Aktuell: ${EP_RSVP[st].emo} ${EP_RSVP[st].lbl}`:"Bitte rückmelden"}${cur&&cur.kommentar?` · „${esc(cur.kommentar)}"`:""}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${btns}</div>
        <button onclick="elternCardOpen(${k.spieler_id})" style="width:100%;margin-top:8px;padding:9px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🃏 Adler-Karte ansehen</button>
        ${st==="zugesagt"?`<button onclick="elternCarpoolOpen(${k.spieler_id},${termin.id})" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🚗 Fahrgemeinschaft</button>`:""}
        <button onclick="elternFanfactsOpen(${k.spieler_id},'${(kd.name||'').replace(/'/g,'')}')" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #64748b;border-radius:10px;background:#fff;color:#475569;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">✏️ Fan-Fakten &amp; Foto</button>`);
    }).join("");
  }
  html+=`<div style="text-align:center;font-size:10.5px;color:#94a3b8;margin:2px 0 12px">Deine Rückmeldung ist ein Hinweis für den Trainer – die endgültige Aufstellung entscheidet er.</div>`;
  // UX 6: Timeline der kommenden Termine (scrollbar, rein informativ – RSVP läuft oben)
  if(termineListe.length>1){
    html+=card(`<div style="font-weight:700;margin-bottom:8px">📅 Nächste Termine</div>
      <div style="max-height:260px;overflow-y:auto;-webkit-overflow-scrolling:touch">
        ${termineListe.map((t,i)=>{
          const tm=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
          const td=new Date(t.datum+"T00:00:00");
          const twtag=["So","Mo","Di","Mi","Do","Fr","Sa"][td.getDay()];
          const tzeit=t.uhrzeit?String(t.uhrzeit).slice(0,5):"";
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #f1f5f9${i===0?";background:#eff6ff;border-radius:8px":""}">
            <div style="font-size:20px;width:28px;text-align:center">${tm.icon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.titel||t.gegner||tm.label)}${i===0?' <span style="font-size:10px;color:#2563eb;font-weight:800">· NÄCHSTER</span>':""}</div>
              <div style="font-size:11px;color:#64748b">${twtag} ${td.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${tzeit?" · "+tzeit+" Uhr":""}${t.ort?" · "+esc(t.ort):""}</div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${tm.col};background:${tm.col}18;border-radius:6px;padding:3px 7px;white-space:nowrap">${tm.label}</span>
          </div>`;}).join("")}
      </div>`);
  }
  html+=card(`<div style="font-weight:700;margin-bottom:8px">🎮 Für dein Kind</div>
    <button onclick="kabineOpen()" style="display:block;width:100%;padding:13px;margin-bottom:8px;border:none;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer">🎮 Kabine öffnen (Kinder-Modus)</button>
    <a href="${location.pathname}?quiz" style="display:inline-block;padding:11px 16px;background:#059669;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">Nur Quiz starten</a>`);
  // FEAT Y: Fundbüro – Board + Upload für alle eingeloggten Eltern
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🧦 Fundbüro</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Trinkflasche verschwunden? Jacke gefunden? Hier sammelt das Team.</div>
    <button onclick="fundbueroOpen()" style="width:100%;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Fundbüro öffnen</button>`);
  // Teamkasse (read-only): Saldo + offene Umlagen über RPC, PayPal nur als Link
  let kasse=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kasse_summary`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)kasse=await r.json();}catch(e){}
  if(kasse&&(Number(kasse.saldo)!==0||(kasse.umlagen&&kasse.umlagen.length))){
    const eur=n=>Number(n||0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
    html+=card(`<div style="font-weight:700;margin-bottom:6px">💰 Teamkasse</div>
      <div style="font-size:12.5px;color:#475569">Kassenstand: <b>${eur(kasse.saldo)}</b></div>
      ${(kasse.umlagen||[]).map(u=>`<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
        <div style="flex:1"><div style="font-weight:700;font-size:13px">${esc(u.titel)} · ${eur(u.betrag)}</div>${u.faellig?`<div style="font-size:11px;color:#64748b">fällig bis ${u.faellig}</div>`:""}</div>
        ${u.paypal_link?`<a href="${esc(u.paypal_link)}" target="_blank" rel="noopener noreferrer" style="background:#0070ba;color:#fff;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;text-decoration:none">PayPal</a>`:""}
      </div>`).join("")}
      <div style="font-size:10px;color:#94a3b8;margin-top:8px">Informativ. Zahlungen laufen extern über PayPal.</div>`);
  }
  body.innerHTML=html;
  // FEAT S: XP-Chips async füllen (RPC xp_total – Eltern sehen nur das eigene Kind)
  kids.forEach(k=>{xpTotal(k.spieler_id).then(t=>{const el=document.getElementById("xp-chip-"+k.spieler_id);if(el){const b=xpBadge(t);el.textContent=`⚡ ${t} XP · ${b.emo} ${b.t}`;}}).catch(()=>{});});
  // UX 3: Deep-Link-Intent genau einmal abarbeiten – zum Nudge scrollen + kurz pulsen lassen
  if(rsvpIntent){
    try{sessionStorage.removeItem("adler_rsvp_intent");}catch(e){}
    const w=document.getElementById("rsvp-nudge");
    if(w){
      setTimeout(()=>{w.scrollIntoView({behavior:"smooth",block:"center"});
        try{w.animate([{transform:"scale(1)"},{transform:"scale(1.03)"},{transform:"scale(1)"}],{duration:600,iterations:2});}catch(e){}
      },200);
    }
  }
}
async function elternRsvp(terminId,spielerId,status){
  let kommentar=null;
  if(status==="abgesagt")kommentar=(prompt("Grund der Absage (optional):","")||"").trim()||null;
  else if(status==="krank")kommentar=(prompt("Kurzer Hinweis (optional):","")||"").trim()||null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:spielerId,status,kommentar,updated_at:new Date().toISOString()})});
    if(!r.ok){toast("Konnte nicht speichern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Rückmeldung gespeichert ✓");
  // FEAT S: XP für Zusagen (idempotent pro Termin via quelle_id, Punktwert bestimmt der Server)
  if(status==="zugesagt"){const d=await xpAward(spielerId,"rsvp","t"+terminId);if(d>0)setTimeout(()=>toast(`⚡ +${d} XP gesammelt!`),1100);}
  elternDashLoad();
}
// Adler-Karte des eigenen Kindes (Eltern-Sicht): Daten kommen aus der security-definer
// RPC my_child_card (kein Direktzugriff auf geschützte Tabellen). Baut dieselbe d-Struktur
// wie adlerCardData und rendert mit adlerCardDraw.
function adlerCardDataFromChild(p){
  const v=typeof p.radios==="string"?safeParse(p.radios,{}):(p.radios||{});
  const strengths=Object.keys(CARD_BADGES).map(key=>({key,val:v[key]||0})).sort((a,b)=>b.val-a.val).slice(0,3);
  const {dims:ds}=calcScores(v,DIMS_FELD);
  const topDim=Object.entries(ds).sort((a,b)=>b[1]-a[1])[0]||["tech",0];
  const theme=p.tw?CARD_THEMES.keeper:(CARD_THEMES[topDim[0]]||CARD_THEMES.tech);
  const posMap={aufpasser:"Aufpasser",jaeger:"Jäger",flitzer_l:"Flitzer",flitzer_r:"Flitzer"};
  const pos=p.lieblingsposition||(p.tw?"Torwart":(posMap[p.snap_position]||p.prim_rolle||"Allrounder"));
  const fussMap={L:"linker Fuß",R:"rechter Fuß",B:"beidfüßig"};
  const s=p.stats||{};
  return {name:p.name,nr:p.nr,tw:!!p.tw,geb:p.geb,fotoPath:p.foto_path,pos:cardPosLabel(pos),
    fuss:fussMap[p.starker_fuss||p.strong_foot]||"",
    alter:p.geb?homeAlter(p.geb):(p.age||null), spitzname:p.spitzname||null,
    badges:strengths.map(x=>CARD_BADGES[x.key]),theme,
    counts:{tore:s.tore||0,paraden:s.paraden||0,aktionen:s.aktionen||0,spiele:s.spiele||0,trainings:s.trainings||0,quizRichtig:s.quizRichtig||0,quizBloecke:s.quizBloecke||0}};
}
async function elternCardOpen(spielerId){
  let p=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/my_child_card`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:spielerId})});if(r.ok)p=await r.json();}catch(e){}
  if(!p){toast("Karte konnte nicht geladen werden","err");return;}
  if(!p.radios||(typeof p.radios==="object"&&!Object.keys(p.radios).length)||p.radios==="{}"){toast("Für dein Kind gibt es noch keine Bewertung","err");return;}
  elternCardShow(adlerCardDataFromChild(p));
}
async function elternCardShow(d){
  const W=500,H=780;
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  let rawPhoto=null;
  function render(){ adlerCardDraw(ctx,W,H,d,rawPhoto); canvas.toBlob(b=>{adlerCardBlob=b;},"image/png"); }
  render();
  const modal=document.createElement("div");
  modal.id="adler-card-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10001;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  canvas.style.cssText="max-width:100%;width:300px;height:auto;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5)";
  modal.appendChild(canvas);
  cardApplyGlow(canvas, d.counts&&d.counts.trainings); // Meilenstein-Glanz (Zähler kommen aus der RPC)
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
  bar.innerHTML=`<button class="btn btn-p" onclick="adlerCardShare()"><i class="ti ti-share"></i>Karte teilen</button>
    <button class="btn" onclick="document.getElementById('adler-card-modal').remove()">Schließen</button>`;
  modal.appendChild(bar);
  document.body.appendChild(modal);
  if(d.fotoPath){ const img=await fotoLoadImage(d.fotoPath); if(img&&document.getElementById("adler-card-modal")){ rawPhoto=img; render(); } }
}
/* ═══════════════════════════════════
   SMART CARPOOL (Phase 11-N) – Mitfahr-Börse im Eltern-Dashboard.
   Baum: Fahrer-Zeile (carpool_status='driver' + seats/area/note), Mitfahrer verweisen
   via carpool_driver_spieler_id. Teamweite Sicht NUR über carpool_board-RPC (Minimaldaten).
═══════════════════════════════════ */
function elternCarpoolOpen(spielerId,terminId){
  document.getElementById("carpool-modal")?.remove();
  const m=document.createElement("div");
  m.id="carpool-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:#fff;border-radius:16px;padding:18px;max-width:420px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:800;font-size:16px">🚗 Fahrgemeinschaft</div>
      <button onclick="document.getElementById('carpool-modal').remove()" style="border:none;background:none;font-size:22px;color:#64748b;cursor:pointer">×</button>
    </div>
    <div id="carpool-body"><div style="text-align:center;padding:24px;color:#64748b">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  elternCarpoolRender(spielerId,terminId);
}
async function elternCarpoolRender(spielerId,terminId){
  const body=document.getElementById("carpool-body"); if(!body)return;
  let mine=null, board=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&spieler_id=eq.${spielerId}&select=carpool_status,carpool_seats,carpool_area,carpool_note,carpool_driver_spieler_id`,{headers:sbAuthHeaders()});if(r.ok)mine=(await r.json())[0]||null;}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/carpool_board`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:terminId})});if(r.ok)board=await r.json();}catch(e){}
  const st=mine?mine.carpool_status:"none";
  const card=(inner)=>`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px">${inner}</div>`;
  let html="";
  if(st==="driver"){
    const me=board.find(d=>d.driver_spieler_id===spielerId);
    const total=(mine.carpool_seats||0), belegt=me?me.belegt:0, frei=Math.max(0,total-belegt);
    html+=card(`<div style="font-weight:700;margin-bottom:4px">🚗 Ihr fahrt selbst</div>
      <div style="font-size:12.5px;color:#475569">${frei} von ${total} Plätzen frei${mine.carpool_area?` · ${esc(mine.carpool_area)}`:""}</div>
      ${mine.carpool_note?`<div style="font-size:12px;color:#475569;margin-top:2px">📍 ${esc(mine.carpool_note)}</div>`:""}
      ${me&&me.mitfahrer&&me.mitfahrer.length?`<div style="font-size:12px;color:#475569;margin-top:4px">Mitfahrer: <b>${me.mitfahrer.map(esc).join(", ")}</b></div>`:'<div style="font-size:12px;color:#94a3b8;margin-top:4px">Noch keine Mitfahrer.</div>'}
      <button onclick="elternCarpoolReset(${spielerId},${terminId})" style="margin-top:8px;border:none;background:none;color:#dc2626;font-size:12px;cursor:pointer">Fahrangebot zurücknehmen</button>`);
  }else if(st==="passenger"){
    const drv=board.find(d=>d.driver_spieler_id===mine.carpool_driver_spieler_id);
    html+=card(`<div style="font-weight:700;margin-bottom:4px">🙋 Ihr fahrt mit</div>
      <div style="font-size:12.5px;color:#475569">bei <b>${drv?esc(drv.fahrer):"—"}</b>${drv&&drv.area?` · ${esc(drv.area)}`:""}</div>
      ${drv&&drv.note?`<div style="font-size:12px;color:#475569;margin-top:2px">📍 ${esc(drv.note)}</div>`:""}
      <button onclick="elternCarpoolReset(${spielerId},${terminId})" style="margin-top:8px;border:none;background:none;color:#dc2626;font-size:12px;cursor:pointer">Abmelden</button>`);
  }else{
    html+=card(`<div style="font-weight:700;margin-bottom:8px">Wie kommt ihr hin?</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="elternCarpoolDriverForm(${spielerId},${terminId})" style="flex:1;min-width:130px;padding:11px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-weight:700;font-size:13px;cursor:pointer">🚗 Wir fahren selbst</button>
        <button onclick="document.getElementById('carpool-search').style.display='block';this.parentNode.parentNode.style.display='none'" style="flex:1;min-width:130px;padding:11px;border:none;border-radius:10px;background:#059669;color:#fff;font-weight:700;font-size:13px;cursor:pointer">🙋 Mitfahrt suchen</button>
      </div>`);
  }
  const freeDrivers=board.filter(d=>d.driver_spieler_id!==spielerId && (d.seats-d.belegt)>0);
  html+=`<div id="carpool-search" style="${st==="none"?"display:none":""}">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin:6px 0">Freie Plätze im Team</div>
    ${freeDrivers.length?freeDrivers.map(d=>`<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:6px">
      <div style="flex:1"><div style="font-weight:700;font-size:13px">Bei ${esc(d.fahrer)}</div><div style="font-size:11.5px;color:#64748b">${d.seats-d.belegt} frei${d.area?` · ${esc(d.area)}`:""}${d.note?` · 📍 ${esc(d.note)}`:""}</div></div>
      <button onclick="elternCarpoolPassenger(${spielerId},${terminId},${d.driver_spieler_id})" style="border:none;border-radius:8px;background:#059669;color:#fff;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer">Mitfahren</button>
    </div>`).join(""):'<div style="font-size:12px;color:#94a3b8">Aktuell bietet niemand freie Plätze an.</div>'}
  </div>`;
  body.innerHTML=html;
}
function elternCarpoolDriverForm(spielerId,terminId){
  const body=document.getElementById("carpool-body"); if(!body)return;
  const inp="width:100%;padding:9px;margin:4px 0 10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:13px";
  body.innerHTML=`<div style="font-weight:700;margin-bottom:8px">🚗 Wir fahren selbst</div>
    <label style="font-size:12px;color:#475569">Freie Plätze</label>
    <input id="cp-seats" type="number" min="1" max="8" value="2" style="${inp}">
    <label style="font-size:12px;color:#475569">Bereich / Startpunkt (optional)</label>
    <input id="cp-area" placeholder="z. B. Dellbrück Nord" style="${inp}">
    <label style="font-size:12px;color:#475569">Notiz: Treffpunkt / Zeit (optional)</label>
    <input id="cp-note" placeholder="z. B. Treff Netto-Parkplatz 16:15" style="${inp}">
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="elternCarpoolRender(${spielerId},${terminId})" style="border:none;background:none;color:#64748b;font-size:13px;cursor:pointer">Abbrechen</button>
      <button onclick="elternCarpoolDriverSave(${spielerId},${terminId})" style="border:none;border-radius:8px;background:#1e3a8a;color:#fff;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer">Angebot einstellen</button>
    </div>`;
}
async function elternCarpoolDriverSave(spielerId,terminId){
  const seats=Math.max(1,parseInt(document.getElementById("cp-seats")?.value)||1);
  const area=(document.getElementById("cp-area")?.value||"").trim()||null;
  const note=(document.getElementById("cp-note")?.value||"").trim()||null;
  await elternCarpoolPatch(spielerId,terminId,{carpool_status:"driver",carpool_seats:seats,carpool_area:area,carpool_note:note,carpool_driver_spieler_id:null});
}
async function elternCarpoolPassenger(spielerId,terminId,driverId){
  await elternCarpoolPatch(spielerId,terminId,{carpool_status:"passenger",carpool_driver_spieler_id:driverId,carpool_seats:null,carpool_area:null,carpool_note:null});
}
async function elternCarpoolReset(spielerId,terminId){
  await elternCarpoolPatch(spielerId,terminId,{carpool_status:"none",carpool_seats:null,carpool_area:null,carpool_note:null,carpool_driver_spieler_id:null});
}
async function elternCarpoolPatch(spielerId,terminId,fields){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&spieler_id=eq.${spielerId}`,{method:"PATCH",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({...fields,updated_at:new Date().toISOString()})});
    if(!r.ok){toast("Konnte nicht speichern","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Fahrgemeinschaft aktualisiert ✓");
  elternCarpoolRender(spielerId,terminId);
}
/* ═══════════════════════════════════
   FAN-FAKTEN (Phase 11-Q) – Eltern pflegen Spitzname/Verein/Spieler + Profilbild
   für ihr eigenes Kind (kind_fanfacts, RLS is_parent_of). kader bleibt trainer-only.
   Foto-Upload pfad-basiert: "<spieler_id>/<uuid>.jpg".
═══════════════════════════════════ */
async function elternFanfactsOpen(spielerId,kindName){
  document.getElementById("fanfacts-modal")?.remove();
  let f={};
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?spieler_id=eq.${spielerId}&select=*`,{headers:sbAuthHeaders()});if(r.ok)f=(await r.json())[0]||{};}catch(e){}
  const half="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:13px";
  const inp="width:100%;padding:9px;margin:4px 0 10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:13px";
  const m=document.createElement("div");m.id="fanfacts-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:#fff;border-radius:16px;padding:18px;max-width:400px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-weight:800;font-size:16px">✏️ ${esc(kindName||"Kind")} – Fan-Fakten</div>
      <button onclick="document.getElementById('fanfacts-modal').remove()" style="border:none;background:none;font-size:22px;color:#64748b;cursor:pointer">×</button>
    </div>
    <div style="font-size:11px;color:#64748b;margin-bottom:12px">Diese Fan-Fakten pflegst du selbst – die sportliche Bewertung bleibt beim Trainer.</div>
    <label style="font-size:12px;color:#475569">Profilbild</label>
    <div style="display:flex;align-items:center;gap:8px;margin:4px 0 12px">
      <input type="file" accept="image/jpeg,image/png,image/webp" onchange="elternFotoUpload(${spielerId},this)" style="font-size:11px;flex:1">
      ${f.foto_path?'<span style="font-size:10px;color:#059669">✓ vorhanden</span>':''}
    </div>
    <label style="font-size:12px;color:#475569">Spitzname</label>
    <input id="ff-spitz" value="${esc(f.spitzname||'')}" placeholder="z. B. Mimi" style="${inp}">
    <label style="font-size:12px;color:#475569">Lieblingsverein</label>
    <input id="ff-verein" value="${esc(f.lieblingsverein||'')}" placeholder="z. B. 1. FC Köln" style="${inp}">
    <label style="font-size:12px;color:#475569">Lieblingsspieler</label>
    <input id="ff-spieler" value="${esc(f.lieblingsspieler||'')}" placeholder="z. B. Musiala" style="${inp}">
    <div style="font-size:11px;font-weight:700;color:#475569;margin:6px 0 4px">👕 Ausrüstung <span style="font-weight:400;color:#94a3b8">(hilft dem Trainer bei Sammelbestellungen)</span></div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1"><label style="font-size:11px;color:#64748b">Trikot-Größe</label><input id="ff-trikot" value="${esc(f.trikot_groesse||'')}" placeholder="z. B. 128" style="${half}"></div>
      <div style="flex:1"><label style="font-size:11px;color:#64748b">Schuh-Größe</label><input id="ff-schuh" value="${esc(f.schuh_groesse||'')}" placeholder="z. B. 31" style="${half}"></div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:#475569;margin:6px 0 14px">
      <input id="ff-gallery" type="checkbox" ${f.gallery_optin?"checked":""}> Foto in der Team-Galerie zeigen (Opt-in)
    </label>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="document.getElementById('fanfacts-modal').remove()" style="border:none;background:none;color:#64748b;font-size:13px;cursor:pointer">Schließen</button>
      <button onclick="elternFanfactsSave(${spielerId})" style="border:none;border-radius:8px;background:#1e3a8a;color:#fff;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer">Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(m);
}
async function elternFanfactsSave(spielerId){
  const body={spieler_id:spielerId,
    spitzname:(document.getElementById("ff-spitz")?.value||"").trim()||null,
    lieblingsverein:(document.getElementById("ff-verein")?.value||"").trim()||null,
    lieblingsspieler:(document.getElementById("ff-spieler")?.value||"").trim()||null,
    trikot_groesse:(document.getElementById("ff-trikot")?.value||"").trim()||null,
    schuh_groesse:(document.getElementById("ff-schuh")?.value||"").trim()||null,
    gallery_optin:!!(document.getElementById("ff-gallery")&&document.getElementById("ff-gallery").checked),
    updated_at:new Date().toISOString()};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Fan-Fakten gespeichert ✓");
  document.getElementById("fanfacts-modal")?.remove();
}
async function elternFotoUpload(spielerId,input){
  const file=input.files&&input.files[0]; if(!file)return;
  input.disabled=true;
  try{
    const blob=await fotoCompress(file);
    const path=spielerId+"/"+((crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now())+".jpg";
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({spieler_id:spielerId,foto_path:path,updated_at:new Date().toISOString()})});
    if(!r.ok){toast("Foto gespeichert, Verknüpfung fehlgeschlagen","err");return;}
    toast("Profilbild aktualisiert ✓");
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");}
  finally{input.disabled=false;}
}
/* ═══════════════════════════════════
   TEAMKASSE (Phase 11-O) – rein informativ. App fasst KEIN Geld an; PayPal nur als Link.
   Trainer verwaltet Buchungen + Umlagen; Eltern sehen nur Saldo + Umlagen (RPC).
═══════════════════════════════════ */
const kEur=n=>Number(n||0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
async function kasseOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("kasse-modal")?.remove();
  const m=document.createElement("div");m.id="kasse-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:800;font-size:16px">💰 Teamkasse</div>
      <button onclick="document.getElementById('kasse-modal').remove()" style="border:none;background:none;font-size:22px;color:var(--text2);cursor:pointer">×</button>
    </div>
    <div id="kasse-body"><div style="text-align:center;padding:24px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  kasseRender();
}
async function kasseRender(){
  const body=document.getElementById("kasse-body"); if(!body)return;
  let ledger=[],umlagen=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse?select=*&order=datum.desc,id.desc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)ledger=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?select=*&order=aktiv.desc,faellig.asc`,{headers:sbAuthHeaders()});if(r.ok)umlagen=await r.json();}catch(e){}
  const saldo=ledger.reduce((s,x)=>s+Number(x.betrag),0);
  const inp="padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px";
  body.innerHTML=`
    <div style="text-align:center;background:var(--surface2);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:11px;color:var(--text2)">Kassenstand</div>
      <div style="font-size:26px;font-weight:900;color:${saldo<0?'#dc2626':'#059669'}">${kEur(saldo)}</div>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:6px">Buchungen</div>
    <div style="max-height:150px;overflow-y:auto;margin-bottom:8px">
    ${ledger.length?ledger.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--surface2)">
      <span style="flex:1">${esc(x.zweck||'—')} <span style="color:var(--text3);font-size:10.5px">${x.datum||''}</span></span>
      <span style="font-weight:700;color:${x.betrag<0?'#dc2626':'#059669'}">${x.betrag<0?'':'+'}${kEur(x.betrag)}</span>
      <button onclick="kasseDelEntry(${x.id})" title="Löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Noch keine Buchungen.</div>'}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      <select id="k-typ" style="${inp}"><option value="1">Einnahme</option><option value="-1">Ausgabe</option></select>
      <input id="k-betrag" type="number" step="0.01" min="0" placeholder="Betrag" style="width:82px;${inp}">
      <input id="k-zweck" placeholder="Zweck" style="flex:1;min-width:100px;${inp}">
      <button class="btn btn-sm" onclick="kasseAddEntry()"><i class="ti ti-plus"></i></button>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:6px">Umlagen (für Eltern sichtbar)</div>
    ${umlagen.length?umlagen.map(u=>`<div style="display:flex;align-items:center;gap:6px;font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--surface2);${u.aktiv?'':'opacity:.5'}">
      <span style="flex:1">${esc(u.titel)} · <b>${kEur(u.betrag)}</b>${u.faellig?` · bis ${u.faellig}`:''}</span>
      <button onclick="kasseToggleUmlage(${u.id},${!u.aktiv})" title="${u.aktiv?'deaktivieren':'aktivieren'}" style="border:none;background:transparent;cursor:pointer;color:var(--text2)"><i class="ti ti-eye${u.aktiv?'':'-off'}"></i></button>
      <button onclick="kasseDelUmlage(${u.id})" title="Löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Keine Umlagen.</div>'}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <input id="u-titel" placeholder="Titel (z. B. Sommerfest)" style="flex:1;min-width:110px;${inp}">
      <input id="u-betrag" type="number" step="0.01" min="0" placeholder="€" style="width:66px;${inp}">
      <input id="u-faellig" type="date" title="fällig bis" style="${inp}">
      <input id="u-paypal" placeholder="PayPal.Me-Link (optional)" style="flex:1;min-width:130px;${inp}">
      <button class="btn btn-sm" onclick="kasseAddUmlage()"><i class="ti ti-plus"></i>Umlage</button>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-top:12px">Rein informativ – die App verwaltet kein Geld. Zahlungen laufen extern über PayPal.</div>`;
}
async function kasseAddEntry(){
  const sign=parseInt(document.getElementById("k-typ")?.value)||1;
  const val=Math.abs(parseFloat(document.getElementById("k-betrag")?.value)||0);
  if(!val){toast("Betrag eingeben","err");return;}
  const zweck=(document.getElementById("k-zweck")?.value||"").trim()||null;
  try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({betrag:sign*val,zweck})});if(sbCheck401(r))return;if(!r.ok){toast("Fehler","err");return;}}catch(e){return;}
  kasseRender();
}
async function kasseDelEntry(id){ try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){} kasseRender(); }
async function kasseAddUmlage(){
  const titel=(document.getElementById("u-titel")?.value||"").trim();
  const betrag=parseFloat(document.getElementById("u-betrag")?.value)||0;
  if(!titel||!betrag){toast("Titel und Betrag eingeben","err");return;}
  const faellig=document.getElementById("u-faellig")?.value||null;
  const paypal=(document.getElementById("u-paypal")?.value||"").trim()||null;
  try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({titel,betrag,faellig,paypal_link:paypal})});if(sbCheck401(r))return;if(!r.ok){toast("Fehler","err");return;}}catch(e){return;}
  kasseRender();
}
async function kasseToggleUmlage(id,aktiv){ try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({aktiv})});if(sbCheck401(r))return;}catch(e){} kasseRender(); }
async function kasseDelUmlage(id){ try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){} kasseRender(); }

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
function kabineHome(){
  const b=document.getElementById("kabine-body"); if(!b)return;
  b.innerHTML=`
    <div style="text-align:center;padding:18px 16px 6px">
      <div style="font-size:22px;font-weight:900">🦅 Die Kabine</div>
      <div style="font-size:12px;opacity:.8">Adler U9 · Kinder-Modus</div>
    </div>
    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px;align-content:center">
      <button onclick="kabineShowGallery()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:18px;font-weight:800;min-height:120px"><span style="font-size:44px">🖼️</span>Team-Galerie</button>
      <button onclick="kabineQuiz()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:18px;font-weight:800;min-height:120px"><span style="font-size:44px">🧠</span>Quiz</button>
      <button onclick="kabineShowQuests()" style="grid-column:1/-1;border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-size:18px;font-weight:800;min-height:84px"><span style="font-size:34px">🏆</span>Unsere Missionen</button>
    </div>
    <button onclick="kabineExit()" style="margin:0 16px 18px;padding:12px;border:none;border-radius:14px;background:rgba(0,0,0,.25);color:#fff;font-family:inherit;font-size:14px;cursor:pointer">🔒 Für Erwachsene: Kabine verlassen</button>`;
}
function kabineQuiz(){ window.location.href=location.pathname+"?quiz"; }
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
      ${teamBelohnung?`<div style="background:linear-gradient(135deg,#f59e0b,#ec4899);border-radius:14px;padding:16px;text-align:center;margin-top:6px"><div style="font-size:13px;opacity:.9">🎁 Nächste Belohnung</div><div style="font-size:18px;font-weight:900;margin-top:4px">${esc(teamBelohnung)}</div></div>`:""}
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
    <div style="text-align:center;padding:0 16px 16px;font-size:13px;opacity:.85">${esc(g.name)}${g.spitzname?` „${esc(g.spitzname)}“`:""}${g.lieblingsverein?` · Fan von ${esc(g.lieblingsverein)}`:""}</div>`;
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
function kabineExit(){
  const a=2+Math.floor(Math.random()*7), b=2+Math.floor(Math.random()*7);
  const ans=prompt(`Nur für Erwachsene 🔒\nWie viel ist ${a} × ${b}?`);
  if(ans===null)return;
  if(parseInt(ans)===a*b){ isKidsMode=false; document.getElementById("kabine")?.remove(); }
  else { toast("Leider falsch – die Kabine bleibt zu.","err"); }
}
function elternPortalTrainerNotice(root){
  root.innerHTML=`<div style="max-width:360px;margin:8vh auto;background:#fff;border-radius:16px;padding:24px;text-align:center">
    <div style="font-size:40px">🧑‍🏫</div>
    <div style="font-size:16px;font-weight:800;margin-top:8px">Du bist als Trainer angemeldet</div>
    <div style="font-size:13px;color:#64748b;margin:8px 0 16px">Dieser Bereich ist für Eltern. Öffne die Trainer-App ohne <code>?portal</code> in der Adresse.</div>
    <a href="${location.origin+location.pathname}" style="display:inline-block;padding:11px 18px;background:#1e3a8a;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Zur Trainer-App</a>
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
}
renderTrainerUI();


/* ═══════════════════════════════════
   BEARBEITBARE AUFSTELLUNG (Spieltag) – manuell änderbar, mit Bank, geteilt speichern
═══════════════════════════════════ */
const KOMBI_POS=[
  {key:"tw",label:"🥅 Torwart",col:"#854d0e"},
  {key:"auf",label:"Aufpasser",col:"#1a56db"},
  {key:"fll",label:"Flitzer L",col:"#b45309"},
  {key:"flr",label:"Flitzer R",col:"#15803d"},
  {key:"jaeg",label:"Jäger",col:"#c2410c"}
];
let kombiLineup={tw:"",auf:"",fll:"",flr:"",jaeg:""};
function initLineupEditor(best){
  // Vom Algorithmus-Vorschlag vorbelegen, sofern noch nichts gesetzt ist
  if(best&&!Object.values(kombiLineup).some(Boolean)){
    kombiLineup={tw:best.tw?best.tw.name:"",auf:best.aufpasser.name,fll:best.flitzer_l.name,flr:best.flitzer_r.name,jaeg:best.jaeger.name};
  }
  renderLineupEditor();
}
function kombiSetPos(key,value){
  // Spieler, der schon woanders steht, dort entfernen (kein Doppel)
  Object.keys(kombiLineup).forEach(k=>{if(k!==key&&kombiLineup[k]===value&&value)kombiLineup[k]="";});
  kombiLineup[key]=value;
  renderLineupEditor();
}
function kombiFromSuggestion(){
  const combos=calcBestCombos();
  if(!combos){toast("Mindestens 4 bewertete Spieler nötig","err");return;}
  const b=combos[0];
  kombiLineup={tw:b.tw?b.tw.name:"",auf:b.aufpasser.name,fll:b.flitzer_l.name,flr:b.flitzer_r.name,jaeg:b.jaeger.name};
  renderLineupEditor();
  toast("Vorschlag übernommen");
}
function renderLineupEditor(){
  const box=document.getElementById("lineup-editor");
  if(!box)return;
  const names=Object.keys(DB).sort();
  const selected=Object.values(kombiLineup).filter(Boolean);
  const bench=names.filter(n=>!selected.includes(n));
  const opts=(cur)=>`<option value="">— frei —</option>`+names.map(n=>`<option value="${esc(n)}"${n===cur?" selected":""}>${esc(n)}${getKader(n)?.nr?" (#"+getKader(n).nr+")":""}${getKader(n)?.tw?" 🥅":""}</option>`).join("");
  const today=new Date().toISOString().slice(0,10);
  box.innerHTML=`
    <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:8px"><i class="ti ti-clipboard-check"></i> Aufstellung festlegen (Spieltag)</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      ${KOMBI_POS.map(p=>`
        <div style="display:flex;align-items:center;gap:8px">
          <span style="flex:0 0 92px;font-size:12px;font-weight:600;color:${p.col}">${p.label}</span>
          <select onchange="kombiSetPos('${p.key}',this.value)" style="flex:1;min-height:44px;padding:8px 10px;border:var(--border-s);border-radius:var(--r);font-size:13px;font-family:inherit;background:var(--surface)">${opts(kombiLineup[p.key])}</select>
        </div>`).join("")}
    </div>
    <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px"><i class="ti ti-users"></i> Auswechselbank (${bench.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
      ${bench.length?bench.map(n=>`<span style="font-size:12px;padding:5px 10px;background:var(--surface2);border:var(--border);border-radius:16px">${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)}</span>`).join(""):'<span style="font-size:11px;color:var(--text3)">Alle Spieler in der Startelf</span>'}
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <input type="date" id="lineup-date" value="${today}" style="min-height:44px;padding:8px 10px;border:var(--border-s);border-radius:var(--r);font-family:inherit">
      <button class="btn btn-p" onclick="kombiSaveLineup()"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn" onclick="kombiLoadLineup()"><i class="ti ti-cloud-download"></i>Laden</button>
      <button class="btn" onclick="kombiFromSuggestion()"><i class="ti ti-wand"></i>Vorschlag</button>
      <button class="btn" onclick="kombiShareLineup()"><i class="ti ti-share"></i>Teilen</button>
      <button class="btn" onclick="kombiShareLineupBild()"><i class="ti ti-photo"></i>Als Bild</button>
    </div>`;
}
// Die festgelegte Aufstellung als 4+1-Raute + Bank aufs Canvas zeichnen und teilen
function kombiShareLineupBild(){
  const names=Object.keys(DB).sort();
  const selected=Object.values(kombiLineup).filter(Boolean);
  const bench=names.filter(n=>!selected.includes(n));
  const W=600, PITCH=690, BENCH=160, H=PITCH+BENCH;
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  // Rasen
  ctx.fillStyle="#2d6a2d";ctx.fillRect(0,0,W,PITCH);
  ctx.strokeStyle="rgba(255,255,255,.4)";ctx.lineWidth=3;
  ctx.strokeRect(16,16,W-32,PITCH-32);
  ctx.beginPath();ctx.arc(W/2,PITCH/2,70,0,Math.PI*2);ctx.stroke();
  // Bank-Streifen
  ctx.fillStyle="#1e293b";ctx.fillRect(0,PITCH,W,BENCH);
  const spots={jaeg:[300,135],fll:[150,285],flr:[450,285],auf:[300,435],tw:[300,585]};
  const col={tw:"#854d0e",auf:"#1a56db",fll:"#b45309",flr:"#15803d",jaeg:"#c2410c"};
  const lbl={tw:"Torwart",auf:"Aufpasser",fll:"Flitzer L",flr:"Flitzer R",jaeg:"Jäger"};
  ctx.textAlign="center";
  KOMBI_POS.forEach(p=>{
    const[x,y]=spots[p.key];
    const name=kombiLineup[p.key];
    // Rollen-Label
    ctx.fillStyle="rgba(255,255,255,.85)";ctx.font="12px Arial";ctx.textBaseline="alphabetic";
    ctx.fillText(lbl[p.key],x,y-26);
    // Pille
    ctx.textBaseline="middle";ctx.font="bold 16px Arial";
    const disp=name||"– offen –";
    const tw=ctx.measureText(disp).width, pillW=Math.max(54,tw+28), pillH=38;
    ctx.fillStyle=name?col[p.key]:"#64748b";
    tbRoundRect(ctx,x-pillW/2,y-pillH/2,pillW,pillH,pillH/2);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.9)";ctx.lineWidth=2.5;ctx.stroke();
    ctx.fillStyle="#fff";ctx.fillText(disp,x,y);
  });
  // Bank-Text
  ctx.textAlign="left";ctx.textBaseline="top";
  ctx.fillStyle="rgba(255,255,255,.6)";ctx.font="bold 12px Arial";
  ctx.fillText("AUSWECHSELBANK",24,PITCH+16);
  ctx.fillStyle="#fff";ctx.font="15px Arial";
  const benchStr=bench.length?bench.map(n=>getKader(n)?.nr?getKader(n).nr+" "+n:n).join("   ·   "):"–";
  // Umbruch falls zu lang
  const words=benchStr.split("   ·   ");let line="",yy=PITCH+42;
  words.forEach((w,i)=>{
    const test=line?line+"   ·   "+w:w;
    if(ctx.measureText(test).width>W-48&&line){ctx.fillText(line,24,yy);yy+=24;line=w;}
    else line=test;
  });
  if(line)ctx.fillText(line,24,yy);
  // Titel
  ctx.textAlign="center";ctx.fillStyle="rgba(255,255,255,.92)";ctx.font="bold 20px Arial";ctx.textBaseline="alphabetic";
  ctx.fillText("SV Adler Dellbrück · U9 · 4+1 Raute",W/2,PITCH-14);

  canvas.toBlob(async(blob)=>{
    if(!blob){toast("Bild konnte nicht erzeugt werden","err");return;}
    const file=new File([blob],"aufstellung-u9.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:"Aufstellung U9"});}catch(e){}
    }else{
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aufstellung-u9.png";
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      toast("Bild heruntergeladen ✓");
    }
  },"image/png");
}
async function kombiSaveLineup(){
  const datum=document.getElementById("lineup-date")?.value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/aufstellungen?on_conflict=datum`,{
      method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum,lineup:kombiLineup})
    });
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){toast("Aufstellung gespeichert ✓");try{navigator.vibrate&&navigator.vibrate(50);}catch(e){}}
    else toast("Fehler beim Speichern","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function kombiLoadLineup(){
  const datum=document.getElementById("lineup-date")?.value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/aufstellungen?datum=eq.${encodeURIComponent(datum)}&select=*`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Fehler beim Laden","err");return;}
    const rows=await r.json();
    if(!rows.length){toast("Keine gespeicherte Aufstellung für dieses Datum","err");return;}
    kombiLineup=Object.assign({tw:"",auf:"",fll:"",flr:"",jaeg:""},rows[0].lineup||{});
    renderLineupEditor();
    toast("Aufstellung geladen ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
function kombiShareLineup(){
  const datum=document.getElementById("lineup-date")?.value||"";
  const posName={tw:"🥅 Torwart",auf:"Aufpasser",fll:"Flitzer L",flr:"Flitzer R",jaeg:"Jäger"};
  const names=Object.keys(DB).sort();
  const selected=Object.values(kombiLineup).filter(Boolean);
  const bench=names.filter(n=>!selected.includes(n));
  const zeilen=[`⚽ Aufstellung U9${datum?" · "+datum:""}`,""];
  KOMBI_POS.forEach(p=>{zeilen.push(`${posName[p.key]}: ${kombiLineup[p.key]||"– offen –"}`);});
  zeilen.push("");
  zeilen.push("Bank: "+(bench.length?bench.join(", "):"–"));
  const text=zeilen.join("\n");
  if(navigator.share){navigator.share({title:"Aufstellung U9",text}).catch(()=>{});}
  else{
    const modal=document.createElement("div");
    modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:380px;width:100%">
      <div style="font-weight:700;margin-bottom:8px">Aufstellung teilen</div>
      <textarea readonly style="width:100%;height:180px;font-size:12px;font-family:monospace;border:var(--border-s);border-radius:var(--r);padding:8px;resize:none">${esc(text)}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-p" onclick="navigator.clipboard.writeText(this.closest('div[style*=fixed]').querySelector('textarea').value).then(()=>toast('Kopiert ✓'))"><i class="ti ti-copy"></i>Kopieren</button>
        <a class="btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>
        <button class="btn" onclick="this.closest('div[style*=fixed]').remove()">Schließen</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }
}

/* ═══════════════════════════════════
   PRINT / PDF FUNCTION
═══════════════════════════════════ */
function printView(viewName){
  // Mark correct view as print-active
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("print-active"));
  const target=document.getElementById("view-"+viewName);
  if(target) target.classList.add("print-active");

  // Titel-Datum für den Druck-Kopf (Kopf-Elemente werden unten in target eingefügt)
  const now=new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});

  let subtitle="";
  if(viewName==="profil"){
    const sel=document.getElementById("psel-profil");
    subtitle=sel?.value?" – "+sel.value:"";
  } else if(viewName==="verlauf"){
    const sel=document.getElementById("psel-verlauf");
    subtitle=sel?.value?" – Entwicklung "+sel.value:"";
  } else if(viewName==="kader"){
    subtitle=" – Kaderübersicht";
  } else if(viewName==="kombi"){
    subtitle=" – Aufstellungs-Kombinator";
  }

  // Add temporary header elements
  if(target){
    const h=document.createElement("h1");
    h.className="print-header";
    h.textContent="Spielerprofil U9 I – SV Adler Dellbrück"+subtitle;
    const meta=document.createElement("div");
    meta.className="print-meta";
    meta.textContent="Stand: "+now+" · Sandy, Charles, Kenneth, Peter · 4+1 Raute";
    target.insertBefore(meta,target.firstChild);
    target.insertBefore(h,target.firstChild);
  }

  // Expand all collapsed dim blocks for printing
  document.querySelectorAll(".dim-body.coll").forEach(b=>{
    b.classList.add("_was_coll");
    b.classList.remove("coll");
  });

  window.print();

  // Restore after print
  setTimeout(()=>{
    document.querySelectorAll(".dim-body._was_coll").forEach(b=>{
      b.classList.add("coll");
      b.classList.remove("_was_coll");
    });
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("print-active"));
    const tmpH=target?.querySelector(".print-header");
    const tmpM=target?.querySelector(".print-meta");
    if(tmpH)tmpH.remove();
    if(tmpM)tmpM.remove();
  }, 1000);
}

/* ═══════════════════════════════════
   TAKTIK-BOARD (Freies Drag & Drop)
═══════════════════════════════════ */
/* FORMATIONS: single source of truth für Spielformen der U9.
   x/y sind RELATIV (Prozent 0–100) -> skaliert automatisch mit der Feldgröße.
   tw:false = ohne Torwart (Funino). rk = Rollen-Schlüssel für Algorithmen/Rating.
   Steuert sowohl das Taktikboard als auch (später) die Matchday-Drop-Zonen. */
let tbFormation='4+1'; // aktuell gewählte Spielform des Boards (später aus termin.spielform)

let tbField=[];
let tbBench=[];
let tbBall={x:50,y:50};

function taktikSetup(mode){
  const names=KADER.map(k=>k.name);
  if(mode==="leer"){
    tbField=[];tbBench=[...names];tbBall={x:50,y:50};
    taktikRender();
    return;
  }
  const form=FORMATIONS[tbFormation]||FORMATIONS['4+1'];
  const slots=form.slots;
  const twName=form.tw?(KADER.find(k=>k.twPrio===1)?.name||null):null;
  tbField=[];tbBench=[];
  let assign=[];
  // Nur 4+1 hat den passenden Rollen-Kombinator (aufpasser/flitzer/jäger) – siehe FORMATIONS.
  if(tbFormation==='4+1'){
    const combo=calcBestCombos();
    if(combo&&combo[0]){
      const b=combo[0];
      assign=[b.tw?.name||twName, b.aufpasser.name, b.flitzer_l.name, b.flitzer_r.name, b.jaeger.name];
    }
  }
  if(!assign.length){
    // Generische Befüllung (Funino/5+1 oder 4+1-Fallback): TW zuerst, dann Feldspieler der Reihe nach.
    const rest=names.filter(n=>n!==twName);
    let fi=0;
    assign=slots.map((s,i)=>{
      if(i===0&&form.tw)return twName;
      return rest[fi++]||null;
    });
  }
  slots.forEach((s,i)=>{
    if(assign[i]) tbField.push({name:assign[i],x:s.x,y:s.y,cls:s.cls,role:s.role});
  });
  const used=new Set(tbField.map(f=>f.name));
  tbBench=names.filter(n=>!used.has(n));
  tbBall={x:50,y:50};
  taktikRender();
}
function taktikSetFormation(f,btn){
  if(!FORMATIONS[f])return;
  tbFormation=f;
  document.querySelectorAll('.tb-form-btn').forEach(b=>b.classList.remove('btn-p'));
  if(btn)btn.classList.add('btn-p');
  else document.querySelector('.tb-form-btn[data-form="'+f+'"]')?.classList.add('btn-p');
  taktikSetup('auto');
}
function taktikInit(){taktikSetup("auto");}
function taktikReset(mode){taktikSetup(mode);}

// Aufstellung als sauberes PNG rendern und per Web Share API teilen (Fallback: Download).
// Zeichnet Feld + Tokens auf ein Canvas – kein html2canvas o.ä. nötig.
function tbRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function taktikShareBild(){
  if(!tbField||!tbField.length){toast("Erst eine Aufstellung aufs Feld stellen","err");return;}
  const W=600,H=800;
  const canvas=document.createElement("canvas");
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  // Rasen + Linien (analog zum SVG-Feld)
  ctx.fillStyle="#2d6a2d";ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(255,255,255,.45)";ctx.lineWidth=3;
  ctx.strokeRect(16,16,W-32,H-32);
  ctx.beginPath();ctx.moveTo(16,H/2);ctx.lineTo(W-16,H/2);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,80,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,4,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,.45)";ctx.fill();
  const col={"tb-tw":"#854d0e","tb-auf":"#1a56db","tb-fl":"#059669","tb-jaeg":"#c2410c","tb-frei":"#475569","tb-bench":"#64748b"};
  ctx.textAlign="center";ctx.textBaseline="middle";
  tbField.forEach(p=>{
    const x=p.x/100*W, y=p.y/100*H;
    const label=p.name||"";
    ctx.font="bold 16px Arial";
    const tw=ctx.measureText(label).width;
    const pillH=36, pillW=Math.max(52,tw+28);
    ctx.fillStyle=col[p.cls]||"#475569";
    tbRoundRect(ctx,x-pillW/2,y-pillH/2,pillW,pillH,pillH/2);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.9)";ctx.lineWidth=2.5;ctx.stroke();
    ctx.fillStyle="#fff";ctx.fillText(label,x,y);
  });
  // Ball
  if(typeof tbBall==="object"&&tbBall){
    ctx.fillStyle="#fff";ctx.strokeStyle="#222";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(tbBall.x/100*W,tbBall.y/100*H,9,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  // Titelzeile
  ctx.fillStyle="rgba(255,255,255,.92)";ctx.font="bold 22px Arial";ctx.textBaseline="alphabetic";
  ctx.fillText("SV Adler Dellbrück · U9 · "+((FORMATIONS[tbFormation]||FORMATIONS['4+1']).label),W/2,H-22);

  canvas.toBlob(async(blob)=>{
    if(!blob){toast("Bild konnte nicht erzeugt werden","err");return;}
    const file=new File([blob],"aufstellung-u9.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:"Aufstellung U9",text:"Aufstellung SV Adler Dellbrück U9"});}
      catch(e){/* Nutzer hat abgebrochen */}
    }else{
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="aufstellung-u9.png";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      toast("Bild heruntergeladen ✓");
    }
  },"image/png");
}

function taktikRender(){
  const fieldEl=document.getElementById("taktik-field");
  const benchEl=document.getElementById("taktik-bench");
  if(!fieldEl||!benchEl)return;
  const tokensEl=document.getElementById("taktik-tokens");
  tokensEl.innerHTML="";
  benchEl.innerHTML="";

  tbField.forEach((p,i)=>{
    const tok=tbCreateToken(p.name,p.cls||"tb-auf",p.role||"");
    tok.style.left=p.x+"%";tok.style.top=p.y+"%";
    tok.dataset.idx=i;tok.dataset.loc="field";
    if(tqActive&&p.locked){ // K5: gesperrte Spieler klar kennzeichnen
      tok.style.opacity=".5";
      tok.classList.add("tq-locked");
      tok.insertAdjacentHTML("beforeend",'<span class="tb-lock-badge">🔒</span>');
    }
    tbAddDrag(tok,fieldEl);
    tokensEl.appendChild(tok);
  });

  const ballEl=document.createElement("div");
  ballEl.className="tb-ball";
  ballEl.style.cssText=`position:absolute;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#e2e8f0);border:2px solid rgba(0,0,0,.3);transform:translate(-50%,-50%);cursor:grab;z-index:15;box-shadow:0 2px 6px rgba(0,0,0,.3);left:${tbBall.x}%;top:${tbBall.y}%`;
  ballEl.dataset.loc="ball";
  tbAddDrag(ballEl,fieldEl);
  tokensEl.appendChild(ballEl);

  tbBench.forEach(name=>{
    const tok=tbCreateToken(name,"tb-bench","");
    tok.dataset.loc="bench";
    tbAddDrag(tok,fieldEl);
    benchEl.appendChild(tok);
  });

  if(tqActive&&tqCurrentOpps.length){
    tqCurrentOpps.forEach(o=>{
      const el=document.createElement("div");
      el.className="tb-token tb-opp";
      el.innerHTML=`<span class="tb-name">${o.label||"Gegner"}</span>`;
      const ox=o.to?o.to.x:o.x, oy=o.to?o.to.y:o.y;
      el.style.cssText=`position:absolute;z-index:8;left:${ox}%;top:${oy}%;transform:translate(-50%,-50%)`;
      tokensEl.appendChild(el);
    });
  }
}

/* ═══════════════════════════════════
   TAKTIKBOARD CANVAS-DRAW – Laufwege/Pässe zeichnen (keine DB, reines Frontend)
═══════════════════════════════════ */
let dwOn=false, dwMode="pass", dwStrokes=[], dwCur=null, dwBound=false;
function dwToggle(){
  const cv=document.getElementById("tb-draw"),tb=document.getElementById("dw-toolbar"),btn=document.getElementById("dw-toggle");
  if(!cv)return;
  dwOn=!dwOn;
  if(dwOn){
    dwResize();
    cv.style.pointerEvents="auto";
    tb.style.display="flex";
    btn.classList.add("btn-p");
    if(!dwBound)dwBind();
    document.querySelectorAll("#dw-toolbar button").forEach(b=>b.classList.remove("btn-p"));
    document.getElementById("dw-"+dwMode)?.classList.add("btn-p");
  }else{
    cv.style.pointerEvents="none";
    tb.style.display="none";
    btn.classList.remove("btn-p");
  }
}
function dwResize(){
  const cv=document.getElementById("tb-draw"),field=document.getElementById("taktik-field");
  if(!cv||!field)return;
  cv.width=field.clientWidth||300;cv.height=field.clientHeight||400; // Fallback falls Layout noch 0
  dwRedraw();
}
function dwSetMode(m,btn){
  dwMode=m;
  document.querySelectorAll("#dw-toolbar button").forEach(b=>b.classList.remove("btn-p"));
  btn.classList.add("btn-p");
}
function dwPos(e){
  const cv=document.getElementById("tb-draw"),r=cv.getBoundingClientRect();
  const pt=e.touches?e.touches[0]:e;
  return {x:(pt.clientX-r.left)*(cv.width/r.width),y:(pt.clientY-r.top)*(cv.height/r.height)};
}
function dwBind(){
  const cv=document.getElementById("tb-draw");
  cv.addEventListener("pointerdown",e=>{if(!dwOn)return;e.preventDefault();dwCur={mode:dwMode,points:[dwPos(e)]};dwStrokes.push(dwCur);});
  cv.addEventListener("pointermove",e=>{if(!dwOn||!dwCur)return;e.preventDefault();dwCur.points.push(dwPos(e));dwRedraw();});
  window.addEventListener("pointerup",()=>{dwCur=null;});
  window.addEventListener("resize",()=>{if(dwOn)dwResize();});
  dwBound=true;
}
function dwRedraw(){
  const cv=document.getElementById("tb-draw");if(!cv)return;
  const ctx=cv.getContext("2d");ctx.clearRect(0,0,cv.width,cv.height);
  dwStrokes.forEach(s=>{
    const pts=s.points;if(!pts.length)return;
    ctx.lineWidth=3.5;ctx.lineJoin="round";ctx.lineCap="round";
    if(s.mode==="pass"){ctx.strokeStyle="#dc2626";ctx.setLineDash([9,7]);}
    else{ctx.strokeStyle="#1a56db";ctx.setLineDash([]);}
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
    ctx.stroke();
    if(s.mode==="lauf"&&pts.length>=2){ // Pfeilspitze
      const a=pts[pts.length-2],b=pts[pts.length-1],ang=Math.atan2(b.y-a.y,b.x-a.x),L=13;
      ctx.setLineDash([]);ctx.beginPath();
      ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-L*Math.cos(ang-.42),b.y-L*Math.sin(ang-.42));
      ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-L*Math.cos(ang+.42),b.y-L*Math.sin(ang+.42));
      ctx.stroke();
    }
  });
  ctx.setLineDash([]);
}
function dwUndo(){dwStrokes.pop();dwRedraw();}
function dwClear(){dwStrokes=[];dwRedraw();}

/* ═══════════════════════════════════
   VIDEO-TAKTIKBOARD (Phase 9-I) – Handy-Clip laden, pausieren, Laufwege einzeichnen.
   Architektur-Kern (siehe Tech-Lead-Analyse):
   • <video playsinline> – sonst iOS-Vollbild-Hijack; lokaler objectURL (ephemer, kein Upload)
   • Striche in NORMALISIERTEN [0..1]-Koordinaten relativ zum echten Videoinhalt
     (object-fit-sicher), damit Resize/Rotation/Fullscreen nichts zerschießt
   • Zeichnen wie am Feld-Board (Pass rot gestrichelt / Laufweg blau mit Pfeil)
═══════════════════════════════════ */
let vtbStrokes=[], vtbCur=null, vtbMode="lauf", vtbURL=null;
function vtbOpen(){
  if(document.getElementById("vtb-modal"))return;
  vtbStrokes=[];vtbCur=null;vtbMode="lauf";
  const m=document.createElement("div");
  m.id="vtb-modal";
  m.style.cssText="position:fixed;inset:0;z-index:10000;background:#000;display:flex;flex-direction:column";
  m.innerHTML=`
    <div id="vtb-stage" style="flex:1;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <div id="vtb-empty" style="color:#94a3b8;text-align:center;padding:24px;font-size:14px;line-height:1.6">🎥 Lade einen kurzen Clip (z. B. 10 Sek) vom Handy,<br>pausiere und zeichne Laufwege ein.</div>
      <video id="vtb-video" playsinline webkit-playsinline style="max-width:100%;max-height:100%;display:none"></video>
      <canvas id="vtb-canvas" style="position:absolute;touch-action:none;display:none"></canvas>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;padding:10px;background:#0f172a">
      <button class="btn btn-sm" onclick="document.getElementById('vtb-file').click()"><i class="ti ti-upload"></i>Clip laden</button>
      <button class="btn btn-sm" id="vtb-play" onclick="vtbPlayPause()" disabled><i class="ti ti-player-play"></i>Play</button>
      <button class="btn btn-sm btn-p" id="vtb-lauf" onclick="vtbSetMode('lauf',this)">→ Laufweg</button>
      <button class="btn btn-sm" id="vtb-pass" onclick="vtbSetMode('pass',this)">╌ Pass</button>
      <button class="btn btn-sm" onclick="vtbUndo()" title="Rückgängig"><i class="ti ti-arrow-back-up"></i></button>
      <button class="btn btn-sm" onclick="vtbClear()" title="Alles weg"><i class="ti ti-eraser"></i></button>
      <button class="btn btn-sm" onclick="vtbShare()"><i class="ti ti-share"></i>Bild</button>
      <button class="btn btn-sm" onclick="vtbClose()">Schließen</button>
    </div>
    <input type="file" id="vtb-file" accept="video/*" style="display:none" onchange="vtbLoadFile(this)">`;
  document.body.appendChild(m);
  const v=document.getElementById("vtb-video");
  v.addEventListener("loadedmetadata",()=>requestAnimationFrame(vtbLayout));
  v.addEventListener("loadeddata",()=>requestAnimationFrame(vtbLayout));
  v.addEventListener("play",vtbSyncPlayBtn);
  v.addEventListener("pause",vtbSyncPlayBtn);
  window.addEventListener("resize",vtbLayout);
  vtbBindDraw();
}
function vtbClose(){
  window.removeEventListener("resize",vtbLayout);
  if(vtbURL){URL.revokeObjectURL(vtbURL);vtbURL=null;}
  document.getElementById("vtb-modal")?.remove();
}
function vtbLoadFile(input){
  const f=input.files&&input.files[0];if(!f)return;
  if(vtbURL)URL.revokeObjectURL(vtbURL);
  vtbURL=URL.createObjectURL(f);
  vtbStrokes=[];
  const v=document.getElementById("vtb-video");
  v.src=vtbURL;v.style.display="";
  document.getElementById("vtb-empty").style.display="none";
  document.getElementById("vtb-canvas").style.display="";
  document.getElementById("vtb-play").disabled=false;
  v.load();
}
// Videoinhalt-Rechteck (object-fit-sicher) relativ zur Stage berechnen.
function vtbRect(){
  const v=document.getElementById("vtb-video"),stage=document.getElementById("vtb-stage");
  if(!v||!v.videoWidth||!stage)return null;
  const sr=stage.getBoundingClientRect(), vr=v.getBoundingClientRect();
  const scale=Math.min(vr.width/v.videoWidth, vr.height/v.videoHeight);
  const dispW=v.videoWidth*scale, dispH=v.videoHeight*scale;
  return {left:(vr.left-sr.left)+(vr.width-dispW)/2, top:(vr.top-sr.top)+(vr.height-dispH)/2, w:dispW, h:dispH};
}
function vtbLayout(){
  const c=document.getElementById("vtb-canvas"),r=vtbRect();
  if(!c||!r)return;
  const dpr=window.devicePixelRatio||1;
  c.style.left=r.left+"px";c.style.top=r.top+"px";c.style.width=r.w+"px";c.style.height=r.h+"px";
  c.width=Math.max(1,Math.round(r.w*dpr));c.height=Math.max(1,Math.round(r.h*dpr));
  vtbRedraw();
}
function vtbPos(e){
  const c=document.getElementById("vtb-canvas"),r=c.getBoundingClientRect();
  const pt=e.touches?e.touches[0]:e;
  return {x:Math.max(0,Math.min(1,(pt.clientX-r.left)/r.width)), y:Math.max(0,Math.min(1,(pt.clientY-r.top)/r.height))};
}
function vtbBindDraw(){
  const c=document.getElementById("vtb-canvas");
  c.addEventListener("pointerdown",e=>{e.preventDefault();vtbCur={mode:vtbMode,points:[vtbPos(e)]};vtbStrokes.push(vtbCur);vtbRedraw();});
  c.addEventListener("pointermove",e=>{if(!vtbCur)return;e.preventDefault();vtbCur.points.push(vtbPos(e));vtbRedraw();});
  window.addEventListener("pointerup",()=>{vtbCur=null;});
}
function vtbSetMode(m,btn){vtbMode=m;["vtb-lauf","vtb-pass"].forEach(id=>document.getElementById(id)?.classList.remove("btn-p"));btn.classList.add("btn-p");}
function vtbPlayPause(){const v=document.getElementById("vtb-video");if(!v.src)return;if(v.paused)v.play();else v.pause();}
function vtbSyncPlayBtn(){const v=document.getElementById("vtb-video"),b=document.getElementById("vtb-play");if(!b||!v)return;b.innerHTML=v.paused?'<i class="ti ti-player-play"></i>Play':'<i class="ti ti-player-pause"></i>Pause';}
function vtbUndo(){vtbStrokes.pop();vtbRedraw();}
function vtbClear(){vtbStrokes=[];vtbRedraw();}
function vtbDrawStrokes(ctx,W,H){
  vtbStrokes.forEach(s=>{
    const pts=s.points;if(!pts.length)return;
    ctx.lineWidth=Math.max(2,W*0.008);ctx.lineJoin="round";ctx.lineCap="round";
    if(s.mode==="pass"){ctx.strokeStyle="#f43f5e";ctx.setLineDash([W*0.03,W*0.022]);}
    else{ctx.strokeStyle="#38bdf8";ctx.setLineDash([]);}
    ctx.beginPath();ctx.moveTo(pts[0].x*W,pts[0].y*H);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x*W,pts[i].y*H);
    ctx.stroke();
    if(s.mode==="lauf"&&pts.length>=2){
      const a=pts[pts.length-2],b=pts[pts.length-1];
      const ax=a.x*W,ay=a.y*H,bx=b.x*W,by=b.y*H,ang=Math.atan2(by-ay,bx-ax),L=W*0.035;
      ctx.setLineDash([]);ctx.beginPath();
      ctx.moveTo(bx,by);ctx.lineTo(bx-L*Math.cos(ang-.42),by-L*Math.sin(ang-.42));
      ctx.moveTo(bx,by);ctx.lineTo(bx-L*Math.cos(ang+.42),by-L*Math.sin(ang+.42));
      ctx.stroke();
    }
  });
  ctx.setLineDash([]);
}
function vtbRedraw(){
  const c=document.getElementById("vtb-canvas");if(!c)return;
  const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);
  vtbDrawStrokes(ctx,c.width,c.height);
}
async function vtbShare(){
  const v=document.getElementById("vtb-video");
  if(!v||!v.videoWidth){toast("Erst einen Clip laden","err");return;}
  const W=v.videoWidth,H=v.videoHeight;
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const ctx=cv.getContext("2d");
  try{ctx.drawImage(v,0,0,W,H);}catch(e){toast("Frame noch nicht bereit – kurz abspielen","err");return;}
  vtbDrawStrokes(ctx,W,H);
  cv.toBlob(async b=>{
    if(!b)return;
    const file=new File([b],"taktik-video.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:"Taktik"});}catch(e){}}
    else{const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="taktik-video.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast("Bild gespeichert ✓");}
  },"image/png");
}

function tbCreateToken(name,cls,roleLabel){
  const el=document.createElement("div");
  el.className="tb-token "+cls;
  el.dataset.player=name;
  const nr=getKader(name)?.nr; // L1: Trikotnummer, wenn vorhanden
  el.innerHTML=`${nr?`<span class="tb-nr">${nr}</span>`:""}<span class="tb-name">${name}</span>${roleLabel?`<span class="tb-pos">${roleLabel}</span>`:""}`;
  return el;
}

function tbDetectRole(x,y){
  const zones=[
    {role:"TW",cls:"tb-tw",x:50,y:92},
    {role:"Aufpasser",cls:"tb-auf",x:50,y:72},
    {role:"Flitzer L",cls:"tb-fl",x:20,y:48},
    {role:"Flitzer R",cls:"tb-fl",x:80,y:48},
    {role:"Jäger",cls:"tb-jaeg",x:50,y:25}
  ];
  let best=zones[0],bestDist=Infinity;
  zones.forEach(z=>{
    const d=Math.sqrt((x-z.x)**2+(y-z.y)**2);
    if(d<bestDist){bestDist=d;best=z;}
  });
  return{role:best.role,cls:best.cls};
}

const TB_ROLE_CYCLE=[
  {role:"",cls:"tb-frei"},
  {role:"TW",cls:"tb-tw"},
  {role:"Aufpasser",cls:"tb-auf"},
  {role:"Flitzer L",cls:"tb-fl"},
  {role:"Flitzer R",cls:"tb-fl"},
  {role:"Jäger",cls:"tb-jaeg"}
];

function tbCycleRole(idx){
  const p=tbField[idx];if(!p)return;
  const curIdx=TB_ROLE_CYCLE.findIndex(r=>r.role===p.role);
  const next=(curIdx+1)%TB_ROLE_CYCLE.length;
  p.role=TB_ROLE_CYCLE[next].role;
  p.cls=TB_ROLE_CYCLE[next].cls;
  taktikRender();
}

const tbActiveDrags=new Set(); // Registry aktiver Drags, damit ein Szenariowechsel sie sauber beenden kann
function tbCancelActiveDrags(){tbActiveDrags.forEach(cancel=>cancel());tbActiveDrags.clear();}

function tbAddDrag(tok,fieldEl){
  let startX,startY,origLeft,origTop,fromBench,fieldRect,isBall,didMove,moveThreshold=8,touchId=null;

  function touchById(list,id){
    if(id==null)return list[0];
    for(let i=0;i<list.length;i++)if(list[i].identifier===id)return list[i];
    return null;
  }

  function onStart(e){
    if(e.type==="touchstart")e.preventDefault();
    const _idx=parseInt(tok.dataset.idx);
    if(tqActive&&!isNaN(_idx)&&tbField[_idx]&&tbField[_idx].locked)return;
    didMove=false;
    touchId=e.changedTouches?e.changedTouches[0].identifier:null; // welcher Finger diesen Drag gestartet hat
    tok.style.zIndex="25";
    tok.style.transition="none";
    tok.style.willChange="left,top";
    fieldRect=fieldEl.getBoundingClientRect();
    const pt=e.touches?touchById(e.touches,touchId):e;
    startX=pt.clientX;startY=pt.clientY;
    fromBench=tok.dataset.loc==="bench";
    isBall=tok.dataset.loc==="ball";
    if(!fromBench){
      origLeft=parseFloat(tok.style.left);
      origTop=parseFloat(tok.style.top);
    } else {
      const r=tok.getBoundingClientRect();
      origLeft=((r.left+r.width/2-fieldRect.left)/fieldRect.width)*100;
      origTop=((r.top+r.height/2-fieldRect.top)/fieldRect.height)*100;
    }
    document.addEventListener("mousemove",onMove,{passive:false});
    document.addEventListener("mouseup",onEnd);
    document.addEventListener("touchmove",onMove,{passive:false});
    document.addEventListener("touchend",onEnd);
    tbActiveDrags.add(cancelDrag);
  }

  function onMove(e){
    const pt=e.touches?touchById(e.touches,touchId):e;
    if(!pt)return; // ein ANDERER Finger hat sich bewegt – dieser Drag ist nicht betroffen (Multitouch-Fix)
    e.preventDefault();
    const rawDx=pt.clientX-startX,rawDy=pt.clientY-startY;
    if(!didMove&&Math.abs(rawDx)<moveThreshold&&Math.abs(rawDy)<moveThreshold)return;
    const dx=(rawDx/fieldRect.width)*100;
    const dy=(rawDy/fieldRect.height)*100;
    const nx=Math.max(3,Math.min(97,origLeft+dx));
    const ny=Math.max(3,Math.min(97,origTop+dy));
    didMove=true;
    if(fromBench){
      const tokensEl=document.getElementById("taktik-tokens");
      if(tok.parentElement!==tokensEl){
        tok.style.position="absolute";
        tok.style.transform="translate(-50%,-50%)";
        tokensEl.appendChild(tok);
      }
    }
    tok.style.left=nx+"%";tok.style.top=ny+"%";
  }

  function cancelDrag(){ // wird bei Szenariowechsel mitten im Drag aufgerufen (Cleanup-Fix)
    document.removeEventListener("mousemove",onMove);
    document.removeEventListener("mouseup",onEnd);
    document.removeEventListener("touchmove",onMove);
    document.removeEventListener("touchend",onEnd);
  }

  function onEnd(e){
    if(e.changedTouches&&touchById(e.changedTouches,touchId)===null)return; // falscher Finger losgelassen
    tbActiveDrags.delete(cancelDrag);
    document.removeEventListener("mousemove",onMove);
    document.removeEventListener("mouseup",onEnd);
    document.removeEventListener("touchmove",onMove);
    document.removeEventListener("touchend",onEnd);
    tok.style.zIndex=isBall?"15":"10";
    tok.style.transition="";
    tok.style.willChange="auto";

    if(!didMove&&!isBall&&!fromBench){
      const idx=parseInt(tok.dataset.idx);
      if(!isNaN(idx)){
        if(tqActive&&tbField[idx]&&!tbField[idx].locked){tqSelectToken(tok);return;}
        tbCycleRole(idx);return;
      }
    }

    const finalX=parseFloat(tok.style.left);
    const finalY=parseFloat(tok.style.top);

    if(isBall){
      tbBall.x=finalX;tbBall.y=finalY;
      return;
    }

    const pt=e.changedTouches?e.changedTouches[0]:e;
    const benchRect=document.getElementById("taktik-bench").getBoundingClientRect();
    const onBench=pt.clientY>=benchRect.top-20&&pt.clientX>=benchRect.left&&pt.clientX<=benchRect.right;
    const playerName=tok.dataset.player;

    if(onBench){
      const idx=parseInt(tok.dataset.idx);
      if(!isNaN(idx)) tbField.splice(idx,1);
      if(!tbBench.includes(playerName)) tbBench.push(playerName);
      taktikRender();
      return;
    }

    if(fromBench){
      tbBench=tbBench.filter(n=>n!==playerName);
      const detected=tbDetectRole(finalX,finalY);
      tbField.push({name:playerName,x:finalX,y:finalY,cls:detected.cls,role:detected.role});
      taktikRender();
    } else {
      const idx=parseInt(tok.dataset.idx);
      if(!isNaN(idx)&&tbField[idx]){
        tbField[idx].x=finalX;
        tbField[idx].y=finalY;
        // Rollen-Neuzuordnung nur bei strukturierten Formationen – Funino hat keine festen Rollen
        if(!tqActive&&tbFormation!=='funino'){
          const detected=tbDetectRole(finalX,finalY);
          tbField[idx].role=detected.role;
          tbField[idx].cls=detected.cls;
        }
        taktikRender();
      }
    }
  }

  tok.addEventListener("mousedown",onStart);
  tok.addEventListener("touchstart",onStart,{passive:false});
}


/* ═══════════════════════════════════
   KALENDER / TERMINE – das Rückgrat, das Training, Spiele und Turniere verbindet
═══════════════════════════════════ */
let tmTyp="training", tmSpielform="4+1";
const TM_META={training:{icon:"🏃",label:"Training",col:"#1a56db"},spiel:{icon:"⚽",label:"Spiel",col:"#059669"},turnier:{icon:"🏆",label:"Turnier",col:"#c2410c"},event:{icon:"🎉",label:"Event",col:"#7c3aed"}}; // UX 7: Event mit Freitext-Titel (Saisonabschluss etc.)
// Saison-Zuordnung aus einem Datum (Saison läuft Jul–Jun)
function saisonForDate(datum){
  const d=new Date((datum||new Date().toISOString().slice(0,10))+"T00:00:00");
  const y=d.getFullYear(), start=d.getMonth()>=6?y:y-1;
  return start+"/"+String(start+1).slice(2);
}
function tmSetTyp(t,btn){
  tmTyp=t;
  btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const lbl=document.getElementById("tm-titel-lbl");
  if(lbl)lbl.textContent=t==="training"?"Titel (optional)":t==="event"?"Titel (z. B. Saisonabschluss, Weihnachtsfeier)":"Gegner / Titel";
  const sfRow=document.getElementById("tm-spielform-row");
  if(sfRow)sfRow.style.display=(t==="spiel"||t==="turnier")?"block":"none"; // Spielform nur bei Spiel/Turnier
  const drRow=document.getElementById("tm-dauer-row");
  if(drRow)drRow.style.display=(t==="spiel"||t==="turnier")?"block":"none"; // Spieldauer nur bei Spiel/Turnier (speist die Match-Uhr)
}
function tmSetSpielform(f,btn){
  tmSpielform=f;
  btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
}
function tmInit(){
  const d=document.getElementById("tm-datum");
  if(d&&!d.value)d.value=new Date().toISOString().slice(0,10);
  tmLoad();
}
async function tmAdd(){
  const datum=document.getElementById("tm-datum")?.value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  const zeit=document.getElementById("tm-zeit")?.value||"";
  const titel=(document.getElementById("tm-titel")?.value||"").trim();
  const ort=(document.getElementById("tm-ort")?.value||"").trim();
  const istSpiel=(tmTyp==="spiel"||tmTyp==="turnier");
  const body={
    typ:tmTyp, datum, titel, ort,
    uhrzeit: zeit||null,
    saison: saisonForDate(datum),
    spielform: istSpiel?tmSpielform:null,
    gegner: istSpiel?(titel||null):null,
    spieldauer_min: istSpiel?parseInt(document.getElementById("tm-dauer")?.value||"20"):20
  };
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){toast("Termin angelegt ✓");document.getElementById("tm-titel").value="";document.getElementById("tm-ort").value="";tmLoad();}
    else toast("Fehler beim Anlegen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tmLoad(){
  const up=document.getElementById("tm-upcoming"),pa=document.getElementById("tm-past");
  if(!up||!pa)return;
  up.innerHTML='<div style="font-size:11px;color:var(--text3)">Lade...</div>';pa.innerHTML="";
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&order=datum.asc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){up.innerHTML='<div style="font-size:11px;color:var(--text3)">Keine Verbindung</div>';return;}
    const rows=await r.json();
    const heute=new Date().toISOString().slice(0,10);
    const kommend=rows.filter(t=>t.datum>=heute);
    const vergangen=rows.filter(t=>t.datum<heute).reverse();
    up.innerHTML=kommend.length?kommend.map(tmCard).join(""):'<div style="font-size:11px;color:var(--text3);padding:6px">Keine kommenden Termine.</div>';
    pa.innerHTML=vergangen.length?vergangen.slice(0,20).map(tmCard).join(""):'<div style="font-size:11px;color:var(--text3);padding:6px">Noch keine vergangenen Termine.</div>';
  }catch(e){up.innerHTML='<div style="font-size:11px;color:var(--text3)">Offline</div>';}
}
function tmCard(t){
  const m=TM_META[t.typ]||TM_META.training;
  const d=new Date(t.datum+"T00:00:00");
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const datumStr=wtag+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const istSpiel=t.typ==="spiel"||t.typ==="turnier";
  // Schnell-Aktionen je Typ
  let actions="";
  if(t.typ==="training"){
    actions=`<button class="btn btn-sm" onclick="tmJump('planung','${t.datum}')"><i class="ti ti-clipboard-list"></i>Plan</button>
      <button class="btn btn-sm" onclick="mdOpen('${t.datum}','training')"><i class="ti ti-users"></i>Eltern-Info</button>`;
  }else{
    actions=`<button class="btn btn-sm" onclick="tmJump('aufstellung','${t.datum}','${t.spielform||''}')"><i class="ti ti-users-group"></i>Aufstellung</button>
      <button class="btn btn-sm" onclick="tmJump('blitz','${t.datum}','${t.spielform||''}')"><i class="ti ti-bolt"></i>Auswertung</button>
      <button class="btn btn-sm" onclick="mdOpen('${t.datum}','${t.typ}')"><i class="ti ti-users"></i>Eltern-Info</button>`;
  }
  const zeitStr=t.uhrzeit?String(t.uhrzeit).slice(0,5):((/Uhrzeit:\s*(\d{1,2}:\d{2})/.exec(t.notiz||"")||[])[1]||"");
  const sfBadge=(istSpiel&&t.spielform)?`<span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:${m.col}22;color:${m.col}">${esc(t.spielform)}</span>`:"";
  const notizClean=(t.notiz&&!/^Uhrzeit:/.test(t.notiz))?t.notiz:"";
  // UX 3: Trainer-Erinnerung per WhatsApp – Deep-Link (?portal&rsvp=…) fuehrt Eltern direkt zur
  // Rueckmeldung. Fuellt nur die Nachricht vor; Absenden/Empfaenger waehlt der Trainer selbst.
  let remindBtn="";
  if(t.datum>=new Date().toISOString().slice(0,10)){
    const deepLink=location.origin+location.pathname+"?portal&rsvp="+t.id;
    const waText=`🦅 SV Adler U9 – bitte kurz rückmelden fürs nächste ${m.label}:\n${t.titel||m.label} am ${datumStr}${zeitStr?" um "+zeitStr+" Uhr":""}${t.ort?" ("+t.ort+")":""}\n👉 Zu-/absagen: ${deepLink}`;
    remindBtn=`<a class="btn btn-sm" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-bell"></i>Erinnerung</a>`;
  }
  return `<div style="background:var(--surface);border:var(--border-s);border-left:3px solid ${m.col};border-radius:var(--rl);padding:10px 12px;margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
      <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px">${m.icon} ${esc(t.titel||m.label)}${sfBadge}</div>
      <div style="font-size:11px;color:var(--text2);white-space:nowrap">${datumStr}${zeitStr?" · "+zeitStr:""}</div>
    </div>
    ${t.ort?`<div style="font-size:11px;color:var(--text2)"><i class="ti ti-map-pin" style="font-size:11px"></i> ${esc(t.ort)}</div>`:""}
    ${notizClean?`<div style="font-size:11px;color:var(--text3)">${esc(notizClean)}</div>`:""}
    ${istSpiel?`<div style="display:flex;align-items:center;gap:6px;margin:6px 0"><span style="font-size:11px;color:var(--text2)">Ergebnis:</span><input type="text" value="${esc(t.ergebnis||"")}" placeholder="z. B. 3:2" onchange="tmSetResult(${Number(t.id)},this.value)" style="width:90px;padding:5px 8px;border:var(--border-s);border-radius:var(--r);font-size:12px;font-family:inherit"></div>`:""}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
      ${actions}${remindBtn}
      <button class="btn btn-sm" onclick="galerieOpen(${Number(t.id)},'${(t.titel||m.label).replace(/'/g,'')}')"><i class="ti ti-photo"></i>Fotos</button>
      <button class="btn btn-sm btn-d" style="margin-left:auto" onclick="tmDelete(${Number(t.id)})"><i class="ti ti-trash"></i></button>
    </div>
  </div>`;
}
async function tmSetResult(id,val){
  try{await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({ergebnis:val})});}catch(e){}
}
async function tmDelete(id){
  if(!confirm("Termin löschen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;tmLoad();}catch(e){toast("Netzwerkfehler","err");}
}
// Schnell-Sprung von einem Termin zum passenden Werkzeug, Datum vorbelegt.
// Spielform des Termins wird an Taktikboard + Rotation durchgereicht (Kopplung Schritt 5).
function tmJump(ziel,datum,spielform){
  if(spielform&&typeof FORMATIONS!=="undefined"&&FORMATIONS[spielform]){
    if(typeof taktikSetFormation==="function")taktikSetFormation(spielform);
    else tbFormation=spielform;
  }
  if(ziel==="planung"){
    switchTrainSub("planung");
    setTimeout(()=>{const d=document.getElementById("tp-date");if(d){d.value=datum;}toast("Plan für "+datum);},60);
  }else if(ziel==="aufstellung"){
    sv("kombi");
    setTimeout(()=>{const d=document.getElementById("lineup-date");if(d)d.value=datum;kombiLoadLineup();},400);
  }else if(ziel==="blitz"){
    switchTrainSub("spieltag");
    setTimeout(()=>{
      spieltagTeam=1; // Sprung vom Termin: Standard-Team; Multi-Team wird am Spieltag selbst gewählt
      const seg=document.getElementById("spieltag-team-seg");
      if(seg){seg.querySelectorAll(".seg-btn").forEach(b=>b.classList.toggle("active",b.dataset.val==="1"));}
      const d=document.getElementById("spieltag-date");if(d){d.value=datum;nomLoad();}toast("Spieltag "+datum);
    },120);
  }
}

// Multi-Team-Funino: bei Festivals stellt Adler 2–3 Teams. Da die Spiele NICHT
// zeitgleich laufen, wählt der Trainer das gerade aktive Team. Der Team-Index wird in
// den Supabase-Schlüssel kodiert (Team 1 = reines Datum -> abwärtskompatibel,
// Team 2/3 = "DATE__t2"/"__t3"). So sind Nominierung, Match-Uhr, Rotations-Timer,
// Action-Tracker und Liveticker sauber pro Team getrennt; der Delegate-Link ist über
// das team-eigene matchday-Token automatisch team-spezifisch.
let spieltagTeam=1;
function spieltagRawDate(){ return document.getElementById("spieltag-date")?.value||new Date().toISOString().slice(0,10); }
function spieltagKey(){ const d=spieltagRawDate(); return spieltagTeam>1?`${d}__t${spieltagTeam}`:d; }
function spieltagSetTeam(n,btn){
  const t=parseInt(n)||1;
  if(t===spieltagTeam)return;
  spieltagTeam=t;
  if(btn){btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");}
  // Laufende Uhren stoppen, damit der Team-Wechsel nicht die Uhr des anderen Teams weiterlaufen lässt.
  if(typeof rotStop==="function")rotStop();
  clearInterval(mcTickId);mcTickId=null;
  nomLoad(); // kaskadiert zu Nominierung + mcLoad + Rotation + Action-Tracker + Ticker mit dem neuen Key
}

// Spieltags-Nominierung: wer ist dabei / nicht / verletzt – speist Rotations-Timer + Blitz
let nomStatus={};
function nomInit(){
  const d=document.getElementById("spieltag-date");
  if(d&&!d.value)d.value=new Date().toISOString().slice(0,10);
  spieltagTeam=1; // Tab-Eintritt: Standard-Team
  const seg=document.getElementById("spieltag-team-seg");
  if(seg)seg.querySelectorAll(".seg-btn").forEach(b=>b.classList.toggle("active",b.dataset.val==="1"));
  nomLoad();
}
// Eltern-RSVP (Phase 10-M, Etappe 3): Rückmeldungen der Eltern zum Termin dieses Datums laden.
let nomRsvp={}, nomOvr=new Set(); // nomRsvp: name->{status,kommentar}; nomOvr: vom Trainer manuell überstimmte Namen
async function nomLoadRsvp(){
  nomRsvp={};
  const datum=spieltagRawDate();
  try{
    const tr=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(datum)}&select=id&limit=1`,{headers:sbAuthHeaders()});
    if(!tr.ok)return;
    const trows=await tr.json(); const tid=trows[0]&&trows[0].id;
    if(!tid)return;
    const rr=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${tid}&select=spieler_id,status,kommentar`,{headers:sbAuthHeaders()});
    if(!rr.ok)return;
    (await rr.json()).forEach(x=>{const k=KADER.find(kk=>kk._id===x.spieler_id); if(k)nomRsvp[k.name]={status:x.status,kommentar:x.kommentar};});
  }catch(e){}
}
async function nomLoad(){
  const datum=spieltagKey();
  nomStatus={}; nomOvr=new Set();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=eq.${encodeURIComponent(datum)}&select=data`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){const rows=await r.json();if(rows.length&&rows[0].data){const d={...rows[0].data};if(Array.isArray(d._ovr))nomOvr=new Set(d._ovr);delete d._ovr;nomStatus=d;}}
  }catch(e){}
  KADER.forEach(k=>{if(!nomStatus[k.name])nomStatus[k.name]="dabei";}); // Default: dabei
  await nomLoadRsvp();
  // Eltern-Zusagen automatisch übernehmen – außer wo der Trainer manuell überstimmt hat (nomOvr).
  Object.keys(nomRsvp).forEach(name=>{ if(!nomOvr.has(name)) nomStatus[name]=nomRsvp[name].status==="zugesagt"?"dabei":"nicht"; });
  nomRender();
  nomApplyToTools();
  if(document.getElementById("action-panel"))atInit(); // Aktionen fürs neue Datum laden
}
function nomSet(name,status){nomStatus[name]=status;nomOvr.add(name);nomRender();nomApplyToTools();nomSave();}
async function nomSave(){
  if(!document.getElementById("spieltag-date")?.value)return;
  const datum=spieltagKey();
  try{await fetch(`${SB_URL}/rest/v1/nominierungen?on_conflict=datum`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({datum,data:{...nomStatus,_ovr:[...nomOvr]}})});}catch(e){}
}
function nominierteSpieler(){return KADER.map(k=>k.name).filter(n=>nomStatus[n]==="dabei");}
function nomRender(){
  const box=document.getElementById("nom-panel");
  if(!box)return;
  const stCfg={dabei:{lbl:"Dabei",col:"#15803d"},nicht:{lbl:"Nicht",col:"#64748b"},verletzt:{lbl:"Verletzt",col:"#dc2626"}};
  const rvEmo={zugesagt:"✅",abgesagt:"❌",krank:"🤒"};
  const hasRsvp=Object.keys(nomRsvp).length>0;
  let sum="";
  if(hasRsvp){
    const c={zugesagt:0,abgesagt:0,krank:0};
    Object.values(nomRsvp).forEach(x=>{if(c[x.status]!=null)c[x.status]++;});
    sum=`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;padding:8px 10px;background:var(--surface2);border-radius:var(--r);font-size:11.5px">
      <span style="font-weight:600">Eltern-RSVP</span><span style="color:var(--text3)">(auto übernommen)</span><span>✅ ${c.zugesagt}</span><span>❌ ${c.abgesagt}</span><span>🤒 ${c.krank}</span><span style="color:var(--text3)">offen ${KADER.length-Object.keys(nomRsvp).length}</span>
      <button class="btn btn-sm" onclick="nomApplyRsvp()" style="margin-left:auto" title="Verwirft manuelle Trainer-Änderungen und koppelt wieder komplett an die Eltern-Zusagen"><i class="ti ti-refresh"></i>Auf RSVP zurücksetzen</button>
    </div>`;
  }
  box.innerHTML=`<div style="font-size:11px;color:var(--text2);margin-bottom:8px">${nominierteSpieler().length} von ${KADER.length} dabei</div>`+sum+
    KADER.map(k=>{
      const cur=nomStatus[k.name]||"dabei";
      const rv=nomRsvp[k.name];
      const badge=rv?`<span title="Eltern-Rückmeldung: ${esc(rv.status)}${rv.kommentar?' – '+esc(rv.kommentar):''}" style="font-size:13px;width:16px;text-align:center">${rvEmo[rv.status]||""}</span>`:'<span style="width:16px"></span>';
      return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
        ${badge}
        <span style="flex:1;font-size:12.5px">${getKader(k.name)?.nr?getKader(k.name).nr+" ":""}${esc(k.name)}</span>
        ${["dabei","nicht","verletzt"].map(s=>`<button onclick="nomSet('${k.name}','${s}')" style="min-height:36px;padding:5px 9px;font-size:11px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${cur===s?stCfg[s].col:"var(--surface)"};color:${cur===s?"#fff":"var(--text2)"}">${stCfg[s].lbl}</button>`).join("")}
      </div>`;
    }).join("");
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
let mcState=null, mcTickId=null, mcSpieldauer=20, mcTickerOpen=true, mcDelegateToken=null;
function mcElapsedSec(mc){
  const paused=mc.paused_ms||0;
  if(mc.clock_status==="running"&&mc.started_at){
    return (paused+(Date.now()-new Date(mc.started_at).getTime()))/1000;
  }
  return paused/1000;
}
// Minute fürs Anzeigen/den späteren Ticker – gedeckelt auf die Halbzeitdauer ("20.+" statt "23.")
function mcMinuteLabel(mc,dauer){
  if(!mc||mc.clock_status==="idle")return "–";
  if(mc.clock_status==="halftime")return "Halbzeit";
  if(mc.clock_status==="ended")return "Abgepfiffen";
  const sec=mcElapsedSec(mc);
  const minIn=Math.floor(sec/60);
  const offset=(mc.half||1)===2?dauer:0;
  if(minIn>=dauer) return (offset+dauer)+".+"; // Nachspielzeit
  return (offset+minIn+1)+".";
}
async function mcLoad(){
  const datum=spieltagKey();
  const realDate=spieltagRawDate(); // Spieldauer liegt am echten Termin-Datum, nicht am Team-Key
  try{
    const [mdRes,tmRes]=await Promise.all([
      fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&select=half,clock_status,started_at,paused_ms,ticker_open,delegate_token`,{headers:sbAuthHeaders()}),
      fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(realDate)}&select=spieldauer_min&order=id.desc&limit=1`,{headers:sbAuthHeaders()})
    ]);
    const mdRows=mdRes.ok?await mdRes.json():[];
    const tmRows=tmRes.ok?await tmRes.json():[];
    mcSpieldauer=(tmRows[0]&&tmRows[0].spieldauer_min)||20;
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
function mcStart(){ mcSave({half:1,clock_status:"running",started_at:new Date().toISOString(),paused_ms:0,spieldauer_min:mcSpieldauer}); rotStart(); }
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
  const label=mcMinuteLabel(mcState,mcSpieldauer);
  const s=mcState.clock_status;
  let controls="";
  if(s==="idle") controls=`<button class="btn btn-p" onclick="mcStart()"><i class="ti ti-player-play"></i>Anpfiff</button>`;
  else if(s==="running") controls=`<button class="btn" onclick="mcPause()"><i class="ti ti-player-pause"></i>Unterbrechung</button>`+
    (mcState.half===1?`<button class="btn" onclick="mcHalftimeStart()"><i class="ti ti-hourglass"></i>Halbzeit</button>`:`<button class="btn btn-d" onclick="mcEnd()"><i class="ti ti-flag"></i>Abpfiff</button>`);
  else if(s==="paused") controls=`<button class="btn btn-p" onclick="mcResume()"><i class="ti ti-player-play"></i>Weiter</button>`;
  else if(s==="halftime") controls=`<button class="btn btn-p" onclick="mcHalftimeEnd()"><i class="ti ti-player-play"></i>2. Halbzeit anpfeifen</button>`;
  else if(s==="ended") controls=`<button class="btn" onclick="mcReset()"><i class="ti ti-refresh"></i>Neu starten</button>`;
  box.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="font-size:28px;font-weight:800;min-width:70px">${label}</div>
    <div style="font-size:11px;color:var(--text2)">${mcState.half===2?"2. Halbzeit":"1. Halbzeit"} · ${mcSpieldauer} Min./HZ</div>
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
  gegentor:["Adler kämpfen weiter!","Kopf hoch, Team – weiter geht's!","Nächster Angriff, Adler!"]
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
  const minute=mcState?mcMinuteLabel(mcState,mcSpieldauer):"";
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
  const url=location.origin+location.pathname+"?ticker="+encodeURIComponent(key);
  const teamTxt=spieltagTeam>1?` (Adler ${spieltagTeam})`:"";
  const text=`📣 Liveticker U9${teamTxt}:\n${url}`;
  if(navigator.share){navigator.share({title:"Liveticker U9",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Ansehen-Link kopiert ✓"),()=>prompt("Ansehen-Link:",url));}
}
function tickerGoal(){
  if(!atSel){toast("Erst Spieler oben antippen","err");return;}
  tickerPush(atSel,"tor");
  // Torschütze zusätzlich als Aktion sichern → Datenquelle für Spielbericht (8-G) + Live-Quest (8-F).
  if(typeof atCounts==="object"){ if(!atCounts[atSel])atCounts[atSel]={}; atCounts[atSel].tor=(atCounts[atSel].tor||0)+1; }
  sbQueuedPost("match_actions",{datum:spieltagKey(),spieler:atSel,aktion:"tor"});
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
  const url=location.origin+location.pathname+"?delegate="+encodeURIComponent(mcDelegateToken);
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
      <button class="btn btn-sm" onclick="tickerShareDelegateLink()"><i class="ti ti-user-share"></i>Helfer-Link</button>
      <span style="font-size:10.5px;color:var(--text2)">${open?"Eltern sehen positive Highlights live.":"Eltern sehen: „Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.“"}</span>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <button class="btn btn-p" onclick="tickerGoal()" ${open?"":"disabled"}><i class="ti ti-ball-football"></i>Tor!</button>
      <button class="btn" onclick="tickerCounterGoal()" ${open?"":"disabled"}><i class="ti ti-shield-x"></i>Gegentor</button>
      <button class="btn btn-sm" onclick="matchReport()"><i class="ti ti-news"></i>Spielbericht</button>
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
      <button onclick="tickerDelete(${Number(e.id)})" title="Ticker-Eintrag löschen" aria-label="Löschen" style="border:none;background:transparent;cursor:pointer;color:#dc2626;font-size:13px;line-height:1;padding:2px 4px"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="color:var(--text3)">Noch keine Ticker-Einträge.</div>';
  }catch(e){}
}
// Ticker-Eintrag korrigieren = löschen (auch von Eltern-Helfern gesendete); der Eltern-Feed
// zeigt danach beim nächsten Poll den bereinigten Stand.
async function tickerDelete(id){
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
  matchReportShow(matchReportBuild(per,roster,tore,gegentore));
}
function matchReportShow(text){
  const old=document.getElementById("report-modal");if(old)old.remove();
  const modal=document.createElement("div");
  modal.id="report-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`<div style="font-weight:700;font-size:15px;margin-bottom:4px">📰 Automatischer Spielbericht</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px">Vorschlag zum Kopieren in die Eltern-Gruppe – frei anpassbar. „Neu würfeln" erzeugt eine andere Formulierung.</div>`;
  const ta=document.createElement("textarea");
  ta.id="report-text";ta.value=text;
  ta.style.cssText="width:100%;min-height:280px;font-family:inherit;font-size:13px;line-height:1.5;border:var(--border-s);border-radius:10px;padding:12px;resize:vertical;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px";
  bar.innerHTML=`<button class="btn btn-sm" onclick="matchReport()"><i class="ti ti-dice-5"></i>Neu würfeln</button>
    <button class="btn btn-p" onclick="matchReportCopy()"><i class="ti ti-copy"></i>Kopieren</button>
    <button class="btn btn-sm" onclick="document.getElementById('report-modal').remove()">Schließen</button>`;
  card.appendChild(ta);card.appendChild(bar);
  modal.appendChild(card);
  document.body.appendChild(modal);
}
function matchReportCopy(){
  const ta=document.getElementById("report-text");if(!ta)return;
  const text=ta.value;
  const done=()=>toast("Spielbericht kopiert ✓");
  if(navigator.share){navigator.share({title:"Spielbericht U9",text}).then(done).catch(()=>{});return;}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,()=>{ta.select();try{document.execCommand("copy");done();}catch(e){}});}
  else{ta.select();try{document.execCommand("copy");done();}catch(e){}}
}

/* ═══════════════════════════════════
   ELTERN-MATCHDAY-CARD – öffentlicher Read-Only-Link (?eltern / ?match=datum)
   Bewusst nur Logistik, keine Bewertungsdaten. Läuft ohne Login über den Anon-Key.
═══════════════════════════════════ */
async function renderElternView(datum){
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Lade Spieltag...</div>';
  try{
    const heute=new Date().toISOString().slice(0,10);
    const url=datum
      ? `${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(datum)}&published=eq.true&select=*`
      : `${SB_URL}/rest/v1/matchday?datum=gte.${heute}&published=eq.true&select=*&order=datum.asc&limit=1`;
    const r=await fetch(url,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
    const rows=r.ok?await r.json():[];
    if(!rows.length){root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Aktuell ist kein Spieltag hinterlegt.<br>Schau später nochmal rein.</div>';return;}
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
    root.innerHTML=`
      <div style="text-align:center;margin:8px 0 16px">
        <img src="logo.png" style="width:64px;height:64px" alt="SV Adler Dellbrück">
        <div style="font-size:18px;font-weight:800;color:#1e3a8a;margin-top:6px">${istTraining?"Training":"Spieltag"} U9</div>
        <div style="font-size:13px;color:#64748b">${datumStr}</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        ${!istTraining&&m.gegner?`<div style="text-align:center;font-size:19px;font-weight:800;color:#1e293b;margin-bottom:10px">⚽ gegen ${esc(m.gegner)}</div>`:""}
        ${!istTraining&&m.gegner_adresse?row("🏟️","Adresse Gegner",m.gegner_adresse):""}
        ${row("📍","Ort",m.ort)}
        ${row("⏰","Treffpunkt",m.treffpunkt)}
        ${row(istTraining?"🕐":"🔔",istTraining?"Trainingszeit":"Anpfiff",m.anpfiff)}
        ${row("ℹ️","Infos",m.infos)}
        ${routeUrl?`<a href="${routeUrl}" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:14px;background:#1e3a8a;color:#fff;padding:13px;border-radius:12px;text-decoration:none;font-weight:600">🗺️ Route ${istTraining?"zum Platz":"zum Gegner"}</a>`:""}
      </div>
      ${istTraining?`<div id="ev-dabei" style="margin-top:14px"></div><div id="ev-fahrt" style="margin-top:14px"></div>`:`<div id="ev-ticker" style="margin-top:14px"></div>`}
      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">SV Adler Dellbrück e.V. · Angaben ohne Gewähr</div>`;
    if(istTraining){edLoad(m.datum);fgLoad(m.datum);}
    else{
      elTickerLoad(m.datum,m.spieldauer_min||20);
      clearInterval(elTickerTimer);
      elTickerTimer=setInterval(()=>elTickerLoad(m.datum,m.spieldauer_min||20),20000);
    }
  }catch(e){root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Konnte nicht laden. Bitte später erneut versuchen.</div>';}
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
      ${rows.length?rows.map(e=>`<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px"><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</div>`).join(""):'<div style="font-size:12px;color:#94a3b8">Noch keine Ereignisse. Bleib dran!</div>'}
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
    const minuteNow=mcMinuteLabel({half:m.half,clock_status:m.clock_status,started_at:m.started_at,paused_ms:m.paused_ms},dauer);
    root.innerHTML=`
      <div style="text-align:center;margin:8px 0 16px">
        <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
        <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">Ticker-Helfer${m.gegner?` · gegen ${elternEsc(m.gegner)}`:""}</div>
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
    const minute=mcMinuteLabel({half:m.half,clock_status:m.clock_status,started_at:m.started_at,paused_ms:m.paused_ms},dauer);
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
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b">Lade Liveticker...</div>';
  async function loadClock(){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(key)}&select=gegner,half,clock_status,started_at,paused_ms,ticker_open,spieldauer_min`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
      const rows=r.ok?await r.json():[];
      tickerViewClock=rows[0]||null;
    }catch(e){}
  }
  function minuteNow(){
    if(!tickerViewClock)return "";
    return mcMinuteLabel({half:tickerViewClock.half,clock_status:tickerViewClock.clock_status,started_at:tickerViewClock.started_at,paused_ms:tickerViewClock.paused_ms},tickerViewClock.spieldauer_min||20);
  }
  async function draw(){
    const wolffFuss=tickerViewClock&&tickerViewClock.ticker_open===false;
    let events=[];
    if(!wolffFuss){
      try{
        const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(key)}&select=text,typ,minute,created_at&order=created_at.desc&limit=40`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
        events=r.ok?await r.json():[];
      }catch(e){}
    }
    const gegner=tickerViewClock&&tickerViewClock.gegner?` · gegen ${elternEsc(tickerViewClock.gegner)}`:"";
    root.innerHTML=`
      <div style="text-align:center;margin:8px 0 14px">
        <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
        <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">📣 Liveticker U9${gegner}</div>
        <div style="font-size:13px;color:#64748b"><span id="tv-minute">${elternEsc(minuteNow())}</span></div>
      </div>
      ${wolffFuss
        ? '<div style="text-align:center;font-size:12.5px;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">🤫 Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.</div>'
        : `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
            ${events.length?events.map(e=>`<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px"><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</div>`).join(""):'<div style="font-size:12.5px;color:#94a3b8">Noch keine Ereignisse. Der Ticker startet mit dem Anpfiff – bleib dran!</div>'}
          </div>`}
      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">Nur-Ansehen · aktualisiert automatisch · SV Adler Dellbrück e.V.</div>`;
  }
  await loadClock();
  await draw();
  // Minute jede Sekunde lokal aktualisieren (nur DOM-Textknoten), Ereignisse+Uhr alle 15s frisch ziehen.
  clearInterval(tickerViewMinuteTimer);
  tickerViewMinuteTimer=setInterval(()=>{const el=document.getElementById("tv-minute");if(el)el.textContent=minuteNow();},1000);
  clearInterval(tickerViewTimer);
  tickerViewTimer=setInterval(async()=>{await loadClock();await draw();},15000);
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
  const url=location.origin+location.pathname+"?match="+encodeURIComponent(datum);
  const text=`⚽ Spieltag-Infos U9 (${datum}):\n${url}`;
  if(navigator.share){navigator.share({title:"Spieltag U9",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Eltern-Link kopiert ✓"),()=>prompt("Eltern-Link:",url));}
}

// Rotations-Timer: faire Einsatzzeiten am Spieltag. Feld/Bank, Timer mit Piepton,
// Wechselvorschlag nach längster Bankzeit.
let rotField=[], rotBench=[], rotBenchSec={}, rotTimerId=null, rotElapsed=0, rotIntervalMin=5, rotTW=null;
// Feldgröße folgt der aktuellen Spielform (FORMATIONS): Funino 3, 4+1 = 4, 5+1 = 5.
function rotFieldSize(){ return ((typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{fieldCount:5}).fieldCount; }
// Korrektur 3: Der Torwart wird separat gehalten – er steht im Tor und rotiert NICHT
// mit den Feldspielern. Nur die Feldspieler wechseln zwischen Feld und Bank.
function rotSeedFromSquad(squad){
  const form=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{tw:true,fieldCount:5};
  rotTW=form.tw?(squad.find(n=>getKader(n)?.tw)||null):null;
  const outfield=squad.filter(n=>n!==rotTW);
  rotField=outfield.slice(0,form.fieldCount);
  rotBench=outfield.slice(form.fieldCount);
  rotBenchSec={};squad.forEach(n=>rotBenchSec[n]=0);
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
function magicLineup(){
  const squad=(typeof nominierteSpieler==="function"?nominierteSpieler():[]);
  const form=(typeof FORMATIONS!=="undefined"&&FORMATIONS[tbFormation])||{tw:true,fieldCount:5};
  const need=form.fieldCount+(form.tw?1:0);
  if(squad.length<need){toast(`Zu wenige nominierte Spieler (${squad.length}/${need}) für ${tbFormation}`,"err");return;}
  const keeper=form.tw?(squad.find(n=>getKader(n)?.tw)||null):null;
  const outfieldPool=squad.filter(n=>n!==keeper);
  let ordered=null;
  if(tbFormation==='4+1'&&outfieldPool.length>=4){
    const combo=calcBestCombos(outfieldPool); // nur nominierte Feldspieler, Kombinator liefert beste Raute
    if(combo&&combo[0]){
      const b=combo[0];
      const used=[b.aufpasser.name,b.flitzer_l.name,b.flitzer_r.name,b.jaeger.name];
      const rest=outfieldPool.filter(n=>!used.includes(n));
      ordered=[...used,...rest];
    }
  }
  if(!ordered){
    // Greedy nach Gesamtscore (Funino/5+1 oder 4+1-Fallback)
    ordered=outfieldPool.map(n=>{const pd=getPlayerData(n);return {n,s:pd?pd.total:0};}).sort((a,b)=>b.s-a.s).map(x=>x.n);
  }
  rotTW=keeper;
  rotField=ordered.slice(0,form.fieldCount);
  rotBench=ordered.slice(form.fieldCount);
  rotBenchSec={};squad.forEach(n=>rotBenchSec[n]=0);rotElapsed=0;
  rotRenderControls();rotRenderLive();
  toast("Auto-Aufstellung erstellt ✓ – frei anpassbar");
}
function fmtSec(s){const m=Math.floor(s/60),ss=s%60;return m+":"+(ss<10?"0":"")+ss;}
function rotRenderLive(){
  const live=document.getElementById("rot-live");
  if(!live)return;
  const rest=rotIntervalMin*60-rotElapsed;
  // Wechselvorschlag: längste Bankzeit rein für kürzeste Bankzeit (= längste Feldzeit)
  let sugg="";
  if(rotBench.length&&rotField.length){
    const benchTop=[...rotBench].sort((a,b)=>rotBenchSec[b]-rotBenchSec[a])[0];
    const fieldTired=[...rotField].sort((a,b)=>rotBenchSec[a]-rotBenchSec[b])[0];
    sugg=`<div style="padding:8px 10px;background:#fef9c3;border:1px solid #fde047;border-radius:var(--r);font-size:12.5px;color:#854d0e;margin-bottom:10px">🔁 Vorschlag: <strong>${esc(benchTop)}</strong> (Bank ${fmtSec(rotBenchSec[benchTop])}) rein für <strong>${esc(fieldTired)}</strong></div>`;
  }
  const chip=(n,onField)=>`<button onclick="rotMove('${n.replace(/'/g,"")}')" style="font-size:12.5px;padding:8px 10px;min-height:44px;border:var(--border-s);border-radius:16px;background:${onField?"var(--blue-bg)":"var(--surface2)"};cursor:pointer;font-family:inherit">${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)}${onField?"":' <span style="color:var(--text3);font-size:10px">'+fmtSec(rotBenchSec[n])+'</span>'}</button>`;
  const twRow=rotTW?`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fef3c7;border:1px solid #fcd34d;border-radius:var(--r);font-size:12.5px;color:#854d0e;margin-bottom:10px">🥅 <strong>Tor: ${esc(rotTW)}</strong><span style="font-size:10px;color:#a16207;margin-left:auto">rotiert getrennt</span></div>`:"";
  live.innerHTML=`
    <div style="text-align:center;font-size:30px;font-weight:800;color:${rest<=10?"#dc2626":"var(--text)"};margin-bottom:8px">${fmtSec(Math.max(0,rest))}</div>
    ${twRow}
    ${sugg}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:6px">Feld (${rotField.length}/${rotFieldSize()})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${rotField.map(n=>chip(n,true)).join("")||'<span style="font-size:11px;color:var(--text3)">leer</span>'}</div>
      </div>
      <div>
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text2);margin-bottom:6px">Bank (${rotBench.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${rotBench.map(n=>chip(n,false)).join("")||'<span style="font-size:11px;color:var(--text3)">leer</span>'}</div>
      </div>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-top:8px">Tipp: Spieler antippen = zwischen Feld und Bank wechseln.</div>`;
}
function rotMove(name){
  if(rotField.includes(name)){rotField=rotField.filter(n=>n!==name);rotBench.push(name);}
  else if(rotBench.includes(name)){
    if(rotField.length>=rotFieldSize()){toast("Feld ist voll ("+rotFieldSize()+") – erst jemanden rausnehmen","err");return;}
    rotBench=rotBench.filter(n=>n!==name);rotField.push(name);
  }
  rotRenderLive();
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
function rotTick(){
  rotElapsed++;
  rotBench.forEach(n=>{rotBenchSec[n]=(rotBenchSec[n]||0)+1;});
  if(rotElapsed>=rotIntervalMin*60){
    rotElapsed=0;rotBeep();try{navigator.vibrate&&navigator.vibrate([100,60,100]);}catch(e){}
  }
  rotRenderLive();
}
// Idempotente Start/Stop-Funktionen (statt reinem Toggle), damit die Match-Uhr den
// Rotations-Timer sicher mitsteuern kann, ohne einen bereits korrekten Zustand zu kippen.
function rotStart(){ if(!rotTimerId){rotTimerId=setInterval(rotTick,1000);requestWakeLock();} rotRenderControls();rotRenderLive(); }
function rotStop(){ if(rotTimerId){clearInterval(rotTimerId);rotTimerId=null;} rotRenderControls();rotRenderLive(); }
function rotToggle(){ if(rotTimerId)rotStop(); else rotStart(); }
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
async function loadTeamConfig(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=quests,belohnung,double_xp_until`,{headers:sbAuthHeaders()});
    if(!r.ok)return;
    const c=(await r.json())[0];
    if(c){
      if(Array.isArray(c.quests)&&c.quests.length){
        teamQuests=TEAM_QUESTS.map(def=>{const s=c.quests.find(x=>x.key===def.key);return s?{...def,label:s.label||def.label,target:Number(s.target)||def.target}:{...def};});
      }
      teamBelohnung=c.belohnung||"";
      teamDoubleXpUntil=c.double_xp_until||null;
    }
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
  toast(neu?"⚡ Double-XP aktiv – 72 Stunden!":"Booster beendet");
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
}
// Beim Laden bereits erfüllte Quests still als „erledigt" markieren (kein Confetti beim Öffnen).
function questSeedDone(){
  const counts=questCountsLive();
  questDone=new Set(teamQuests.filter(q=>(counts[q.key]||0)>=q.target).map(q=>q.key));
}
// Trainer-Editor: Ziel & Name je Quest anpassen + Freitext-Belohnung für die Kids.
function questEditorOpen(){
  document.getElementById("quest-editor")?.remove();
  const m=document.createElement("div");
  m.id="quest-editor";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:420px;width:100%;margin:auto">
    <div style="font-weight:700;margin-bottom:2px">🏆 Team-Quests anpassen</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Name & Ziel je Quest änderbar. Die Belohnung ist Freitext für die Kids.</div>
    <div id="qe-list">${teamQuests.map((q,i)=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
      <span style="font-size:18px;width:24px;text-align:center">${q.icon}</span>
      <input class="qe-label" data-i="${i}" value="${esc(q.label)}" style="flex:1;min-width:80px;padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
      <input class="qe-target" data-i="${i}" type="number" min="1" value="${q.target}" title="Ziel" style="width:64px;padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
    </div>`).join("")}</div>
    <label style="font-size:11px;color:var(--text2)">🎁 Nächste Belohnung für die Kids</label>
    <textarea id="qe-belohnung" rows="2" placeholder="z. B. Eis für alle beim nächsten Training!" style="width:100%;padding:8px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px;margin:4px 0 12px;box-sizing:border-box">${esc(teamBelohnung)}</textarea>
    <div style="margin:0 0 12px;padding:10px;border:1.5px dashed #f59e0b;border-radius:10px;background:#fffbeb">
      <div style="font-weight:700;font-size:12.5px;color:#92400e;margin-bottom:2px">⚡ Double-XP-Booster</div>
      <div style="font-size:11px;color:#78716c;margin-bottom:8px">${xpBoostActive()?`Aktiv bis ${new Date(teamDoubleXpUntil).toLocaleString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})} Uhr – alle XP zählen doppelt!`:"72-Stunden-Fenster (z. B. übers Wochenende). Den 2x-Multiplikator rechnet der Server."}</div>
      <button class="btn btn-sm ${xpBoostActive()?"":"btn-p"}" onclick="xpBoosterToggle(this)">${xpBoostActive()?"Booster beenden":"⚡ 72h aktivieren"}</button>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn" onclick="document.getElementById('quest-editor').remove()">Abbrechen</button>
      <button class="btn btn-p" onclick="questSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
    </div>
  </div>`;
  document.body.appendChild(m);
}
async function questSave(btn){
  const labels=[...document.querySelectorAll(".qe-label")], targets=[...document.querySelectorAll(".qe-target")];
  teamQuests=teamQuests.map((q,i)=>({...q,label:(labels[i]&&labels[i].value.trim())||q.label,target:Math.max(1,parseInt(targets[i]&&targets[i].value)||q.target)}));
  teamBelohnung=(document.getElementById("qe-belohnung")?.value||"").trim();
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({id:1,quests:teamQuests.map(q=>({key:q.key,label:q.label,target:q.target})),belohnung:teamBelohnung,updated_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  document.getElementById("quest-editor")?.remove();
  toast("Team-Quests gespeichert ✓");
  questSeedDone(); if(document.getElementById("action-panel"))atRender();
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
}
function atRender(){
  const box=document.getElementById("action-panel");
  if(!box)return;
  const squad=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():KADER.map(k=>k.name);
  const chips=squad.map(n=>`<button onclick="atPick('${n.replace(/'/g,"")}')" ${getKader(n)?.tw?'data-role="tw"':''} style="font-size:12px;padding:7px 10px;min-height:40px;border:var(--border-s);border-radius:16px;cursor:pointer;font-family:inherit;background:${atSel===n?"var(--blue)":"var(--surface2)"};color:${atSel===n?"#fff":"var(--text)"}">${getKader(n)?.tw?"🥅 ":(getKader(n)?.nr?getKader(n).nr+" ":"")}${esc(n)}${atSummary(n)?' <span style="font-size:9px">'+atSummary(n)+'</span>':''}</button>`).join("");
  const acts=atSel?atActionsFor(atSel):AT_ACTIONS;
  const isTw=atSel&&getKader(atSel)?.tw;
  const feed=atLog.slice(-5).reverse();
  box.innerHTML=`
    <div id="quest-strip" style="position:relative;overflow:hidden;background:var(--surface);border:var(--border-s);border-radius:12px;padding:10px 12px;margin-bottom:12px">${questStripHTML(questCountsLive())}</div>
    <button onclick="atLiveOpen()" style="width:100%;min-height:52px;margin-bottom:12px;border:none;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer">⚡ Live-Aktion (Vollbild)</button>
    ${voiceSupported?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <button id="voice-btn" class="btn btn-sm" onclick="voiceToggle()"><i class="ti ti-microphone"></i>Voice<span style="font-size:9px;background:#f59e0b;color:#fff;padding:1px 5px;border-radius:8px;margin-left:5px">Beta</span></button>
      <span style="font-size:10px;color:var(--text3);flex:1;min-width:140px">Sag z. B. „Pass Leon" – du bestätigst vor dem Senden. Braucht Netz &amp; Ruhe.</span>
    </div>`:''}
    <div style="font-size:11px;color:var(--text2);margin-bottom:6px">Spieler am Ball wählen:</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${chips}</div>
    ${isTw?'<div style="font-size:10.5px;color:#854d0e;font-weight:600;margin-bottom:6px">🥅 Torwart-Aktionen</div>':''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${acts.map(a=>`<button onclick="atTap('${a.key}')" ${atSel?"":"disabled"} style="min-height:56px;font-size:14px;font-weight:600;border:none;border-radius:var(--rl);cursor:pointer;font-family:inherit;background:${a.col};color:#fff;opacity:${atSel?1:.4}">${a.emo} ${a.label}</button>`).join("")}
    </div>
    ${atSel?`<div style="font-size:11px;color:var(--text2);margin-top:8px;text-align:center">Aktiv: <strong>${esc(atSel)}</strong> · ${atSummary(atSel)||"noch keine Aktion"}</div>`:'<div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center">Erst Spieler antippen, dann Aktion.</div>'}
    ${feed.length?`<div style="margin-top:12px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:4px">Letzte Aktionen – antippen zum Rückgängigmachen</div>
      ${feed.map(e=>`<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:5px 9px;background:var(--surface2);border-radius:8px;margin-bottom:3px">
        <span>${AT_EMO[e.aktion]||"•"}</span>
        <span style="flex:1">${esc(e.spieler)} · ${esc(e.label)}</span>
        <button onclick="atUndo(${e.uid})" title="Rückgängig" aria-label="Rückgängig" style="border:none;background:transparent;cursor:pointer;color:#dc2626;font-size:15px;line-height:1;padding:2px 4px"><i class="ti ti-arrow-back-up"></i></button>
      </div>`).join("")}
    </div>`:""}`;
}
function atPick(n){atSel=n;atRender();}

/* ═══════════════════════════════════
   LIVE-AKTION VOLLBILD (schneller Modus) – Aktion zuerst, dann Feld-Spieler.
   Ziel: minimale Taps am Spielfeldrand. Große Kacheln, nur die aktuell auf dem
   Feld stehenden Spieler (rotTW + rotField), sofortige Aufzeichnung + Haptik.
═══════════════════════════════════ */
let atLiveAction=null, atGegentore=0;
const AT_LIVE_ACTS=[AT_ACTIONS[0],AT_ACTIONS[1],AT_ACTIONS[2],{key:"parade",label:"Parade",col:"#0d9488",emo:"🧤"},AT_ACTIONS[3],{key:"tor",label:"Tor",col:"#7c3aed",emo:"⚽"},{key:"gegentor",label:"Gegentor",col:"#475569",emo:"🛡️",direct:true,wide:true}];
function atTore(){ return Object.values(atCounts).reduce((s,pl)=>s+(pl.tor||0),0); }
async function atLoadGegentore(){
  atGegentore=0;
  try{ const r=await fetch(`${SB_URL}/rest/v1/ticker_events?datum=eq.${encodeURIComponent(spieltagKey())}&typ=eq.gegentor&select=id`,{headers:sbAuthHeaders()}); if(r.ok)atGegentore=(await r.json()).length; }catch(e){}
}
function atOnFieldPlayers(){
  const onField=[];
  if(typeof rotTW!=="undefined"&&rotTW)onField.push(rotTW);
  if(typeof rotField!=="undefined"&&rotField.length)onField.push(...rotField);
  if(onField.length)return onField;
  return (typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():KADER.map(k=>k.name);
}
function atLiveOpen(){
  document.getElementById("at-live")?.remove();
  atLiveAction=null;
  if(!document.getElementById("at-live-style")){
    const st=document.createElement("style");st.id="at-live-style";
    st.textContent="@keyframes atFlash{0%{opacity:0;transform:scale(.6)}25%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.15)}}";
    document.head.appendChild(st);
  }
  const m=document.createElement("div");m.id="at-live";
  m.style.cssText="position:fixed;inset:0;z-index:9500;background:#0f172a;display:flex;flex-direction:column;color:#fff;overflow:hidden";
  document.body.appendChild(m);
  atLiveRender();
  atLoadGegentore().then(()=>atLiveRender()); // aktuellen Gegentor-Stand fürs Live-Ergebnis nachladen
}
function atLiveClose(){ document.getElementById("at-live")?.remove(); atLiveAction=null; if(document.getElementById("action-panel"))atRender(); }
function atLiveRender(){
  const m=document.getElementById("at-live"); if(!m)return;
  const counts=questCountsLive();
  const done=teamQuests.filter(q=>(counts[q.key]||0)>=q.target).length;
  const top=`<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#1e293b">
    <div style="flex:1;font-size:13px;font-weight:800">⚡ Live-Aktion${atLiveAction?"":" · Aktion wählen"}</div>
    <div title="Ergebnis (Tore:Gegentore)" style="font-size:17px;font-weight:900;padding:3px 12px;background:rgba(255,255,255,.14);border-radius:10px">${atTore()}:${atGegentore}</div>
    <div style="font-size:11px;color:#94a3b8">🏆 ${done}/${teamQuests.length}</div>
    <button onclick="atLiveClose()" aria-label="Schließen" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer">×</button></div>`;
  let body;
  if(!atLiveAction){
    body=`<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px">
      ${AT_LIVE_ACTS.map(a=>`<button onclick="atLivePick('${a.key}')" style="${a.wide?'grid-column:1/-1;':''}border:none;border-radius:18px;background:${a.col};color:#fff;font-family:inherit;cursor:pointer;display:flex;${a.wide?'flex-direction:row':'flex-direction:column'};align-items:center;justify-content:center;gap:8px;font-size:18px;font-weight:800">
        <span style="font-size:${a.wide?28:34}px">${a.emo}</span>${a.label}</button>`).join("")}
    </div>`;
  }else{
    const a=AT_LIVE_ACTS.find(x=>x.key===atLiveAction)||{label:atLiveAction,emo:"",col:"#1e293b"};
    const players=atOnFieldPlayers();
    body=`<div style="padding:12px 14px;font-size:16px;font-weight:800;background:${a.col}"> ${a.emo} ${a.label} – wer war's?</div>
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px;overflow-y:auto;align-content:start">
        ${players.map(n=>`<button onclick="atLiveRecord('${n.replace(/'/g,"")}')" style="min-height:66px;border:none;border-radius:16px;background:#1e293b;color:#fff;font-size:18px;font-weight:700;font-family:inherit;cursor:pointer">${getKader(n)?.tw?"🥅 ":(getKader(n)?.nr?getKader(n).nr+" ":"")}${esc(n)}</button>`).join("")||'<div style="color:#94a3b8;font-size:13px">Keine Feldspieler gesetzt – erst die Aufstellung/Rotation einrichten.</div>'}
      </div>
      <button onclick="atLiveAction=null;atLiveRender()" style="margin:0 14px 14px;padding:14px;border:none;border-radius:14px;background:rgba(255,255,255,.12);color:#fff;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer">← andere Aktion</button>`;
  }
  m.innerHTML=top+body;
}
function atLivePick(aktion){
  const a=AT_LIVE_ACTS.find(x=>x.key===aktion);
  if(a&&a.direct){ atLiveDirect(aktion); return; } // Gegentor: kein Spieler nötig → 1 Tap
  atLiveAction=aktion; atLiveRender();
}
function atLiveDirect(aktion){
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  if(aktion==="gegentor"){ atGegentore++; if(typeof tickerCounterGoal==="function")tickerCounterGoal(); }
  atLiveFlash("Gegentor","#f59e0b");
  atLiveRender();
}
function atLiveRecord(player){
  const aktion=atLiveAction;
  if(!aktion)return;
  atSel=player;
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  const a=AT_LIVE_ACTS.find(x=>x.key===aktion);
  atLiveAction=null;
  if(aktion==="tor")tickerGoal(); else atTap(aktion); // synchroner Teil bumpt atCounts sofort; Netz läuft im Hintergrund
  atLiveRender();  // Ergebnis + Zähler frisch
  atLiveFlash(`${a?a.emo:""} ${player}`);
}
function atLiveFlash(txt,color){
  const m=document.getElementById("at-live"); if(!m)return;
  const f=document.createElement("div");
  f.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:5;font-size:34px;font-weight:900;color:"+(color||"#22c55e")+";background:rgba(0,0,0,.3);animation:atFlash .6s ease-out forwards";
  f.textContent=txt+" ✓";
  m.appendChild(f);
  setTimeout(()=>f.remove(),600);
}
async function atTap(aktion){
  if(!atSel)return;
  const act=atActionsFor(atSel).find(a=>a.key===aktion)||{label:aktion};
  if(!atCounts[atSel])atCounts[atSel]={};
  atCounts[atSel][aktion]=(atCounts[atSel][aktion]||0)+1;
  const entry={uid:++atUid,id:null,spieler:atSel,aktion,label:act.label};
  atLog.push(entry);
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  atRender();
  // Paedagogik-Filter (Phase 4): nur positive Aktionen speisen den Eltern-Ticker – Undo
  // nimmt das interne Rating zurueck, ein bereits oeffentlich gepushter Ticker-Satz bleibt
  // stehen (geringes Risiko, da nur positive Ereignisse gepusht werden).
  if(TICKER_POSITIVE_KEYS.includes(aktion))tickerPush(atSel,aktion);
  questCheck(); // Team-Quest evtl. gerade geknackt → Confetti + Toast
  const datum=spieltagKey();
  const res=await sbQueuedPost("match_actions",{datum,spieler:atSel,aktion},"return=representation"); // offline -> Queue
  if(res.ok&&res.res){try{const rows=await res.res.json();if(rows&&rows[0]&&rows[0].id!=null)entry.id=rows[0].id;}catch(e){}}
}
// Undo (Korrektur 2): letzte Aktion am Spielfeldrand zurücknehmen – In-Memory-Zähler
// runter + die frisch angelegte Supabase-Zeile entfernen (gerade erst erstellt -> Hard-Delete ok).
async function atUndo(uid){
  const i=atLog.findIndex(e=>e.uid===uid);
  if(i<0)return;
  const e=atLog[i];
  if(atCounts[e.spieler]&&atCounts[e.spieler][e.aktion]){
    atCounts[e.spieler][e.aktion]--;
    if(atCounts[e.spieler][e.aktion]<=0)delete atCounts[e.spieler][e.aktion];
  }
  atLog.splice(i,1);
  try{navigator.vibrate&&navigator.vibrate(12);}catch(err){}
  atRender();
  if(e.id!=null){
    try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?id=eq.${e.id}`,{method:"DELETE",headers:sbAuthHeaders()});sbCheck401(r);}catch(err){}
  }
}

// Blitz-Rating: schnelle Nachbewertung nach dem Spiel (eigenes leichtes Protokoll,
// verfälscht NICHT die 37-Kriterien-Hauptbewertung). Karten-Flow, ein Spieler nach dem anderen.
let blitzIdx=0, blitzPlayers=[], blitzCrit={}, blitzCritPlayer=null;
const BLITZ_CRIT=[
  {key:"einsatz",label:"Einsatz & Zweikampf"},
  {key:"technik",label:"Technik am Ball"},
  {key:"verstaendnis",label:"Spielverständnis"},
  {key:"team",label:"Teamverhalten"},
  {key:"form",label:"Tagesform"}
];
function blitzInit(){
  // nur die nominierten (dabei) Spieler bewerten, falls eine Nominierung vorliegt
  blitzPlayers=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():KADER.map(k=>k.name);
  blitzIdx=0;
  const box=document.getElementById("blitz-panel");
  if(!box)return;
  box.innerHTML=`
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <span style="font-size:11px;color:var(--text2)">Bewertet von:</span>
      <select id="blitz-autor" style="min-height:40px;padding:6px 10px;border:var(--border-s);border-radius:var(--r);font-family:inherit">${TRAINER.map(t=>`<option>${t}</option>`).join("")}</select>
    </div>
    <div id="blitz-card"></div>
    <div id="blitz-saved" style="margin-top:12px"></div>`;
  blitzRenderCard();
  blitzLoadSaved();
}
// Gespeicherte Blitz-Bewertungen dieses Spieltags als Chips – ✕ loescht die Eintragung
// (Korrektur = loeschen + ueber "Von vorne" neu bewerten).
async function blitzLoadSaved(){
  const box=document.getElementById("blitz-saved");
  if(!box)return;
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/blitz_ratings?datum=eq.${encodeURIComponent(datum)}&select=id,spieler,wertung&order=created_at.asc`,{headers:sbAuthHeaders()});
    if(!r.ok){box.innerHTML="";return;}
    const rows=await r.json();
    if(!rows.length){box.innerHTML="";return;}
    const wCol={top:"#15803d",solide:"#64748b",blass:"#dc2626"};
    box.innerHTML=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:5px">Gespeicherte Bewertungen (${rows.length}) · ✕ zum Löschen/Korrigieren</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${rows.map(x=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:4px 9px;border-radius:14px;background:var(--surface2);border:var(--border-s)"><span style="width:8px;height:8px;border-radius:50%;background:${wCol[x.wertung]||"#64748b"}"></span>${esc(x.spieler)}<button onclick="blitzDelete(${Number(x.id)})" title="Bewertung löschen" aria-label="Löschen" style="border:none;background:transparent;cursor:pointer;color:#dc2626;font-size:13px;line-height:1;padding:0 2px">✕</button></span>`).join("")}</div>`;
  }catch(e){}
}
async function blitzDelete(id){
  try{const r=await fetch(`${SB_URL}/rest/v1/blitz_ratings?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  blitzLoadSaved();
  toast("Blitz-Bewertung gelöscht");
}
function blitzRenderCard(){
  const card=document.getElementById("blitz-card");
  if(!card)return;
  if(blitzIdx>=blitzPlayers.length){
    card.innerHTML=`<div style="text-align:center;padding:22px 16px;background:var(--surface);border:var(--border-s);border-radius:var(--rl)">
      <div style="font-size:30px">✅</div>
      <div style="font-weight:700;margin:6px 0">Alle durch!</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px">${blitzPlayers.length} Spieler bewertet.</div>
      <button class="btn" onclick="blitzIdx=0;blitzRenderCard()"><i class="ti ti-refresh"></i>Von vorne</button>
    </div>`;
    return;
  }
  const name=blitzPlayers[blitzIdx];const nr=getKader(name)?.nr;
  if(blitzCritPlayer!==name){blitzCrit={};BLITZ_CRIT.forEach(c=>blitzCrit[c.key]=2);blitzCritPlayer=name;} // Mitte vorbelegt
  const evidenz=(typeof atSummary==="function"&&atSummary(name))?`<div style="font-size:12px;color:var(--text2);margin-bottom:12px">Live-Aktionen: ${atSummary(name)}</div>`:"";
  const lvlBtn=(cKey,val,txt,col)=>{const on=blitzCrit[cKey]===val;return `<button onclick="blitzSetCrit('${cKey}',${val})" style="flex:1;min-height:40px;font-size:12px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${on?col:"var(--surface2)"};color:${on?"#fff":"var(--text2)"}">${txt}</button>`;};
  card.innerHTML=`<div style="padding:16px;background:var(--surface);border:var(--border-s);border-radius:var(--rl)">
    <div style="text-align:center">
      <div style="font-size:11px;color:var(--text3)">Spieler ${blitzIdx+1}/${blitzPlayers.length}</div>
      <div style="font-size:22px;font-weight:800;margin:6px 0 10px">${nr?nr+" ":""}${esc(name)}</div>
    </div>
    ${evidenz}
    ${BLITZ_CRIT.map(c=>`
      <div style="margin-bottom:8px">
        <div style="font-size:11.5px;font-weight:600;margin-bottom:4px">${c.label}</div>
        <div style="display:flex;gap:5px">
          ${lvlBtn(c.key,1,"schwach","#dc2626")}
          ${lvlBtn(c.key,2,"ok","#64748b")}
          ${lvlBtn(c.key,3,"stark","#15803d")}
        </div>
      </div>`).join("")}
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-p" style="flex:1;min-height:48px;font-size:15px" onclick="blitzRate()"><i class="ti ti-check"></i>Speichern & weiter</button>
      <button class="btn btn-sm" style="opacity:.7" onclick="blitzSkip()">›</button>
    </div>
  </div>`;
}
function blitzSetCrit(key,val){blitzCrit[key]=val;blitzRenderCard();}
async function blitzRate(){
  const name=blitzPlayers[blitzIdx];
  const datum=spieltagKey();
  const autor=document.getElementById("blitz-autor")?.value||"";
  const kriterien={...blitzCrit};
  const avg=BLITZ_CRIT.reduce((s,c)=>s+(kriterien[c.key]||2),0)/BLITZ_CRIT.length;
  const wertung=avg>=2.5?"top":avg>=1.7?"solide":"blass"; // Gesamt für Rückwärtskompatibilität
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  blitzIdx++;blitzCritPlayer=null;blitzRenderCard(); // optimistisch weiter
  const res=await sbQueuedPost("blitz_ratings",{datum,spieler:name,wertung,autor,kriterien}); // offline -> Queue
  if(res.ok)blitzLoadSaved(); // bei Online: gespeicherte Liste aktualisieren
}
function blitzSkip(){blitzIdx++;blitzCritPlayer=null;blitzRenderCard();}

// G2: Team-Pinnwand
async function tnLoad(){
  const wrap=document.getElementById("tn-list");
  if(!wrap)return;
  wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Lade Notizen...</div>';
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_notizen?select=*&order=pinned.desc,created_at.desc&limit=50`,{headers:sbTeamHeaders()});
    if(!r.ok){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Keine Verbindung zur Pinnwand</div>';return;}
    const rows=await r.json();
    if(!rows.length){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Noch keine Notizen – schreib die erste!</div>';return;}
    wrap.innerHTML=rows.map(n=>`
      <div style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:10px 12px;margin-bottom:8px${n.pinned?";border-left:3px solid var(--blue)":""}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:11px;font-weight:700">${n.pinned?"📌 ":""}${esc(n.autor||"?")}</span>
          <span style="font-size:10px;color:var(--text3)">${n.created_at?new Date(n.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</span>
        </div>
        <div style="font-size:12.5px;color:var(--text);line-height:1.5;margin-bottom:6px">${esc(n.text||"")}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="tnPin(${Number(n.id)},${n.pinned?"false":"true"})"><i class="ti ti-pin"></i>${n.pinned?"Lösen":"Anpinnen"}</button>
          <button class="btn btn-sm btn-d" onclick="tnDel(${Number(n.id)})"><i class="ti ti-trash"></i></button>
        </div>
      </div>`).join("");
  }catch(e){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Offline – Pinnwand nicht verfügbar</div>';}
}
async function tnSend(){
  const autor=document.getElementById("tn-autor")?.value||"";
  const text=(document.getElementById("tn-text")?.value||"").trim();
  if(!text){toast("Bitte Text eingeben","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_notizen`,{
      method:"POST",headers:sbTeamHeaders(),body:JSON.stringify({autor,text})
    });
    if(r.ok||r.status===201){document.getElementById("tn-text").value="";toast("Notiz gesendet ✓");tnLoad();}
    else toast("Fehler beim Senden","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tnPin(id,pinned){
  try{
    await fetch(`${SB_URL}/rest/v1/team_notizen?id=eq.${id}`,{
      method:"PATCH",headers:sbTeamHeaders(),body:JSON.stringify({pinned})
    });
    tnLoad();
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tnDel(id){
  if(!confirm("Notiz wirklich löschen?"))return;
  try{
    await fetch(`${SB_URL}/rest/v1/team_notizen?id=eq.${id}`,{method:"DELETE",headers:sbTeamHeaders()});
    tnLoad();
  }catch(e){toast("Netzwerkfehler","err");}
}

// G4: kompakte Auswertungs-Kacheln (nur Aggregation vorhandener Daten)
function teamStatsRender(){
  const wrap=document.getElementById("team-stats");
  if(!wrap)return;
  // Letzte Einheit + Ø-Nachbewertung
  const evalDates=Object.keys(EVAL_DATA).sort().reverse();
  let evalTile='<div style="font-size:11px;color:var(--text3)">Noch keine Einheit bewertet</div>';
  if(evalDates.length){
    const d=evalDates[0];const entries=EVAL_DATA[d]||[];
    let sum=0,cnt=0;
    entries.forEach(e=>Object.entries(e).forEach(([k,v])=>{if(typeof v==="number"&&k!=="formIdx"){sum+=v;cnt++;}}));
    const avg=cnt?(sum/cnt).toFixed(1):"–";
    evalTile=`<div style="font-size:16px;font-weight:700;color:var(--blue)">${avg} ★</div><div style="font-size:10px;color:var(--text2)">${new Date(d).toLocaleDateString("de-DE")}</div>`;
  }
  // Anwesenheitsquote letzte 4 Termine
  const awDates=Object.keys(AW_DATA).sort().reverse().slice(0,4);
  let quote="–";
  if(awDates.length){
    let da=0,ges=0;
    awDates.forEach(d=>{
      Object.entries(AW_DATA[d]||{}).forEach(([k,v])=>{
        if(k==="_trainers")return;
        ges++;if(v&&v.da)da++;
      });
    });
    if(ges)quote=Math.round(da/ges*100)+"%";
  }
  // Spieler ohne Bewertung seit > 8 Wochen
  const limit=Date.now()-56*24*60*60*1000;
  const stale=KADER.filter(k=>{
    const snaps=DB[k.name];
    if(!snaps||!snaps.length)return true;
    const lat=snaps[snaps.length-1];
    return !lat.datum||new Date(lat.datum).getTime()<limit;
  });
  const tile=(title,body)=>`<div style="background:var(--surface);border:var(--border-s);border-radius:var(--rl);padding:10px 12px"><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">${title}</div>${body}</div>`;
  wrap.innerHTML=
    tile("Letzte Einheit",evalTile)+
    tile("Anwesenheit (letzte 4)",`<div style="font-size:16px;font-weight:700;color:var(--teal)">${quote}</div><div style="font-size:10px;color:var(--text2)">${awDates.length} Termin${awDates.length!==1?"e":""}</div>`)+
    tile("Bewertung überfällig",`<div style="font-size:16px;font-weight:700;color:${stale.length?"#dc2626":"#15803d"};cursor:pointer" onclick="sv('bew')">${stale.length} Spieler</div><div style="font-size:10px;color:var(--text2)">${stale.length?"> 8 Wochen ohne Bewertung":"alle aktuell"}</div>`);
}

// L5: Daten-Backup – alle sechs Tabellen als eine JSON-Datei
async function teamBackupDownload(){
  const tabellen=["spielerprofile","quiz_progress","anwesenheit","trainings_eval","team_notizen","einheiten"];
  const backup={erstellt:new Date().toISOString(),app:"Adler U9 Spielerprofil"};
  try{
    for(const t of tabellen){
      const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*`,{headers:sbAuthHeaders()});
      if(sbCheck401(r))return;
      backup[t]=r.ok?await r.json():{fehler:"HTTP "+r.status};
    }
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="adler-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast("Backup heruntergeladen ✓");
  }catch(e){toast("Backup fehlgeschlagen: "+e.message,"err");}
}

// G3: geplante Einheiten speichern, laden & teilen
async function tpPlanSave(){
  const datum=document.getElementById("tp-date").value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  const plan={slots:tpSlots,forms:{},cats:{},coaches:{...tpCoaches},time:document.getElementById("tp-time")?.value||""};
  document.querySelectorAll(".tp-form-sel").forEach(s=>{if(s.id)plan.forms[s.id]=s.value;});
  document.querySelectorAll('[id^="tp-cat-"]').forEach(s=>{if(s.id)plan.cats[s.id]=s.value;});
  const trainer=tpGetCheckedTrainers();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/einheiten?on_conflict=datum`,{
      method:"POST",
      headers:{...sbTeamHeaders(),'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({datum,plan,trainer})
    });
    if(r.ok||r.status===201)toast("Plan gespeichert ✓");
    else toast("Fehler beim Speichern","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tpPlanLoad(){
  const datum=document.getElementById("tp-date").value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/einheiten?datum=eq.${encodeURIComponent(datum)}&select=*`,{headers:sbTeamHeaders()});
    if(!r.ok){toast("Fehler beim Laden","err");return;}
    const rows=await r.json();
    if(!rows.length){toast("Kein Plan für dieses Datum gespeichert","err");return;}
    const{plan,trainer}=rows[0];
    if(Array.isArray(trainer))document.querySelectorAll("#tp-trainer-checks input").forEach(cb=>{cb.checked=trainer.includes(cb.value);});
    if(plan&&Array.isArray(plan.slots))tpSlots=plan.slots;
    if(plan&&plan.coaches)tpCoaches={...plan.coaches}; // Stationen-Zuweisung wiederherstellen
    if(plan&&plan.time&&document.getElementById("tp-time"))document.getElementById("tp-time").value=plan.time;
    tpRenderTimeline();
    setTimeout(()=>{
      Object.entries(plan?.cats||{}).forEach(([id,val])=>{
        const sel=document.getElementById(id);
        if(sel&&val){sel.value=val;if(typeof tpOnCatChange==="function"){const m=id.match(/^tp-cat-(\d+)-(\d+)$/);if(m)tpOnCatChange(`tp-form-${m[1]}-${m[2]}`,m[1],m[2]);}}
      });
      Object.entries(plan?.forms||{}).forEach(([id,val])=>{
        const sel=document.getElementById(id);
        if(sel&&val!==""){sel.value=val;tpOnSelectChange(sel);}
      });
      addEvalSection();
      toast("Plan geladen ✓");
    },150);
  }catch(e){toast("Netzwerkfehler","err");}
}
function tpShareEinheit(){
  const datum=document.getElementById("tp-date").value||"";
  const zeit=document.getElementById("tp-time")?.value||"";
  const trainer=tpGetCheckedTrainers().join(", ");
  const allForms=typeof TRAININGSFORMEN!=="undefined"?TRAININGSFORMEN:[];
  let time=0;
  const zeilen=[`⚽ Trainingsplan U9 – ${datum}${zeit?" · "+zeit+" Uhr":""}`,`Trainer: ${trainer||"–"}`,""];
  tpSlots.forEach((slot,si)=>{
    const start=time,ende=time+slot.dauer;time=ende;
    zeilen.push(`${start}'–${ende}' ${slot.label}`);
    if((slot.typ||"main")==="abschluss"){zeilen.push("  Freies Spiel – alle Kinder zusammen");return;}
    document.querySelectorAll(`[id^="tp-form-${si}-"]`).forEach(sel=>{
      if(!sel.value)return;
      const f=allForms[parseInt(sel.value)];
      if(!f)return;
      const stationCoach=tpCoaches[sel.id]?" ("+tpCoaches[sel.id]+")":""; // Stationen-Board
      zeilen.push(`  • ${f.name}${stationCoach}${f.kurz?" – "+f.kurz:""}`);
      const coach=(f.coaching||"").split("\n")[0];
      if(coach)zeilen.push(`    🎯 ${coach}`);
    });
  });
  const text=zeilen.join("\n");
  if(navigator.share){
    navigator.share({title:"Trainingsplan U9 Adler",text}).catch(()=>{});
  }else{
    const modal=document.createElement("div");
    modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto">
      <div style="font-weight:700;margin-bottom:8px">Einheit teilen</div>
      <textarea readonly style="width:100%;height:200px;font-size:11px;font-family:monospace;border:var(--border-s);border-radius:var(--r);padding:8px;resize:none">${esc(text)}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-p" onclick="navigator.clipboard.writeText(this.closest('div[style*=fixed]').querySelector('textarea').value).then(()=>toast('Kopiert ✓'))"><i class="ti ti-copy"></i>Kopieren</button>
        <a class="btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>
        <button class="btn" onclick="this.closest('div[style*=fixed]').remove()">Schließen</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  }
}


/* ═══════════════════════════════════
   FUNDBÜRO (Welle 1, FEAT Y) – verlorene Trinkflaschen, Jacken & Co.
   Teamweite Sicht NUR über die security-definer-RPC fundbuero_board
   (Minimaldaten, keine Uploader-Identität). "Gehört uns!" läuft über
   fundbuero_claim. Fotos: privater Bucket 'fundbuero' (5 MB, nur Bilder,
   Limit serverseitig erzwungen), Anzeige per Auth-Download + Blob-URL.
═══════════════════════════════════ */
async function fundbueroOpen(){
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return;}
  document.getElementById("fb-modal")?.remove();
  const m=document.createElement("div");m.id="fb-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:800;font-size:16px">🧦 Fundbüro</div>
      <button onclick="document.getElementById('fb-modal').remove()" style="border:none;background:none;font-size:22px;color:var(--text2);cursor:pointer">×</button>
    </div>
    <div style="padding:10px;border:1.5px dashed var(--text3);border-radius:10px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">Etwas gefunden?</div>
      <input id="fb-titel" placeholder="Was? (z. B. blaue Trinkflasche)" maxlength="80" style="width:100%;box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;margin-bottom:6px">
      <input id="fb-foto" type="file" accept="image/jpeg, image/png, image/webp" capture="environment" style="width:100%;font-size:12px;margin-bottom:8px">
      <button class="btn btn-p btn-sm" onclick="fundbueroUpload(this)">📸 Einstellen</button>
    </div>
    <div id="fb-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  fundbueroRender();
}
async function fundbueroRender(){
  const body=document.getElementById("fb-body"); if(!body)return;
  let items=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/fundbuero_board`,{method:"POST",headers:sbAuthHeaders(),body:"{}"});if(r.ok)items=(await r.json())||[];}catch(e){}
  const istTrainer=(await authRole())==="trainer";
  if(!items.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Aktuell keine Fundstücke – super! 🎉</div>';return;}
  body.innerHTML=items.map(f=>`
    <div style="padding:12px;border:var(--border-s);border-radius:12px;margin-bottom:10px${f.status==="geklaert"?";opacity:.55":""}">
      ${f.foto_path?`<img id="fb-img-${f.id}" alt="" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;background:#f1f5f9;margin-bottom:8px">`:""}
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
        <div style="font-weight:700;font-size:14px">${esc(f.titel)}</div>
        <div style="font-size:10.5px;color:var(--text3);white-space:nowrap">${f.gefunden_am?new Date(f.gefunden_am+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}):""}</div>
      </div>
      ${f.beschreibung?`<div style="font-size:12px;color:var(--text2);margin-top:2px">${esc(f.beschreibung)}</div>`:""}
      <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
        ${f.status==="offen"
          ?`<button onclick="fundbueroClaim(${f.id})" style="flex:1;min-height:44px;border:none;border-radius:10px;background:#059669;color:#fff;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer">🙋 Gehört uns!</button>`
          :`<div style="flex:1;font-size:12.5px;font-weight:700;color:#059669">✅ Geklärt${f.claimed_label?` – ${esc(f.claimed_label)}`:""}</div>`}
        ${istTrainer?`<button onclick="fundbueroDelete(${f.id})" title="Löschen" style="min-width:44px;min-height:44px;border:var(--border-s);border-radius:10px;background:var(--surface);cursor:pointer">🗑</button>`:""}
      </div>
    </div>`).join("");
  items.forEach(f=>{if(f.foto_path)fundbueroFoto(f.id,f.foto_path);});
}
async function fundbueroFoto(id,path){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/fundbuero/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return;
    const img=document.getElementById("fb-img-"+id);
    if(img)img.src=URL.createObjectURL(await r.blob());
  }catch(e){}
}
async function fundbueroUpload(btn){
  const titel=(document.getElementById("fb-titel")?.value||"").trim();
  const input=document.getElementById("fb-foto");
  const file=input&&input.files&&input.files[0];
  if(!titel){toast("Bitte kurz beschreiben, was gefunden wurde","err");return;}
  if(btn)btn.disabled=true;
  try{
    let path=null;
    if(file){
      const blob=await fotoCompress(file,700); // 700px reicht fürs Wiedererkennen, schont Storage
      path=((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()))+".jpg";
      const up=await fetch(`${SB_URL}/storage/v1/object/fundbuero/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
      if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    }
    const r=await fetch(`${SB_URL}/rest/v1/fundbuero`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({titel,foto_path:path})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
    toast("Fundstück eingestellt ✓");
    const t=document.getElementById("fb-titel"); if(t)t.value="";
    if(input)input.value="";
    fundbueroRender();
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");}
  finally{if(btn)btn.disabled=false;}
}
async function fundbueroClaim(id){
  const label=(prompt("Wem gehört es? (z. B. Familie Mika)","")||"").trim();
  if(!label)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/fundbuero_claim`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_id:id,p_label:label})});
    if(!r.ok){toast("Konnte nicht markieren","err");return;}
    toast("Als geklärt markiert ✓");
    fundbueroRender();
  }catch(e){toast("Netzwerkfehler","err");}
}
async function fundbueroDelete(id){
  if(!confirm("Fundstück wirklich löschen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fundbuero?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Löschen fehlgeschlagen","err");return;}
    fundbueroRender();
  }catch(e){}
}

/* ═══════════════════════════════════
   TAKTIK-BIBLIOTHEK (Welle 1, FEAT AB)
   "Übung speichern" sichert den kompletten Board-Zustand als Template
   in taktik_templates (Trainer-only RLS): Formation, Token-Positionen
   (bereits in Feld-%), Ball und gezeichnete Strokes. Strokes werden
   beim Speichern auf 0..1 normalisiert UND ausgedünnt (jeder 3. Punkt,
   4 Nachkommastellen) -> wenige KB pro Template, kein JSONB-Ballast.
═══════════════════════════════════ */
function ttSnapshot(){
  const cv=document.getElementById("tb-draw");
  const w=(cv&&cv.width)||1, h=(cv&&cv.height)||1;
  const strokes=(dwStrokes||[]).filter(s=>s.points&&s.points.length>1).map(s=>({
    mode:s.mode,
    points:s.points.filter((_,i)=>i%3===0||i===s.points.length-1).map(p=>[+(p.x/w).toFixed(4),+(p.y/h).toFixed(4)])
  }));
  return {
    formation:tbFormation,
    field:tbField.map(p=>({name:p.name,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,cls:p.cls,role:p.role})),
    ball:{x:Math.round(tbBall.x*10)/10,y:Math.round(tbBall.y*10)/10},
    strokes
  };
}
async function ttSave(){
  if(!tbField||!tbField.length){toast("Erst eine Aufstellung aufs Feld stellen","err");return;}
  const name=(prompt("Name der Übung / Spielsituation:","")||"").trim();
  if(!name)return;
  const snap=ttSnapshot();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({name,formation:snap.formation,data:snap})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
    toast("💾 In Bibliothek gespeichert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function ttOpen(){
  document.getElementById("tt-modal")?.remove();
  const m=document.createElement("div");m.id="tt-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-weight:800;font-size:16px">📚 Taktik-Bibliothek</div>
      <button onclick="document.getElementById('tt-modal').remove()" style="border:none;background:none;font-size:22px;color:var(--text2);cursor:pointer">×</button>
    </div>
    <div id="tt-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  ttRender();
}
async function ttRender(){
  const body=document.getElementById("tt-body"); if(!body)return;
  let items=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?select=id,name,formation,created_at&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(r.ok)items=(await r.json())||[];
  }catch(e){}
  if(!items.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Noch keine Übungen gespeichert.<br>Board einrichten → „💾 Übung" drücken.</div>';return;}
  body.innerHTML=items.map(t=>`
    <div style="display:flex;align-items:center;gap:8px;padding:10px;border:var(--border-s);border-radius:12px;margin-bottom:8px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</div>
        <div style="font-size:11px;color:var(--text3)">${t.formation?esc(t.formation)+" · ":""}${new Date(t.created_at).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>
      </div>
      <button class="btn btn-p btn-sm" onclick="ttLoad(${t.id})">Laden</button>
      <button onclick="ttDelete(${t.id})" title="Löschen" style="min-width:40px;min-height:40px;border:var(--border-s);border-radius:10px;background:var(--surface);cursor:pointer">🗑</button>
    </div>`).join("");
}
async function ttLoad(id){
  let row=null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?id=eq.${id}&select=data`,{headers:sbAuthHeaders()});
    if(r.ok)row=((await r.json())||[])[0];
  }catch(e){}
  if(!row||!row.data){toast("Übung konnte nicht geladen werden","err");return;}
  const d=row.data;
  // Formation + Tokens direkt setzen (KEIN taktikSetup - das würde neu auto-befüllen)
  if(d.formation&&FORMATIONS[d.formation]){
    tbFormation=d.formation;
    document.querySelectorAll(".tb-form-btn").forEach(b=>b.classList.toggle("btn-p",b.dataset.form===d.formation));
  }
  tbField=(d.field||[]).map(p=>({...p}));
  const used=new Set(tbField.map(f=>f.name));
  tbBench=KADER.map(k=>k.name).filter(n=>!used.has(n));
  tbBall=d.ball?{...d.ball}:{x:50,y:50};
  taktikRender();
  // Strokes: Zeichenmodus aktivieren, Canvas dimensionieren, dann 0..1 -> Pixel
  if(d.strokes&&d.strokes.length){
    if(!dwOn)dwToggle();
    dwResize();
    const cv=document.getElementById("tb-draw");
    const w=(cv&&cv.width)||1, h=(cv&&cv.height)||1;
    dwStrokes=d.strokes.map(s=>({mode:s.mode,points:s.points.map(p=>({x:p[0]*w,y:p[1]*h}))}));
    dwRedraw();
  }else{
    dwStrokes=[];
    if(dwOn)dwRedraw();
  }
  document.getElementById("tt-modal")?.remove();
  toast("Übung aufs Board geladen ✓");
}
async function ttDelete(id){
  if(!confirm("Übung wirklich löschen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Löschen fehlgeschlagen","err");return;}
    ttRender();
  }catch(e){}
}

/* ═══════════════════════════════════
   AUSRÜSTUNGS-EXPORT (Welle 2, FEAT U) – Trainer-CSV für Sammelbestellungen.
   Daten kommen ausschliesslich aus der security-definer-RPC ausruestung_export
   (Minimaldaten name/nr/groessen, trainer-only). CSV mit ; als Trenner + BOM,
   damit Excel Umlaute und Spalten korrekt oeffnet.
═══════════════════════════════════ */
function _csvCell(v){
  const s=(v==null?"":String(v));
  return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
async function ausruestungExport(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  let rows=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/ausruestung_export`,{method:"POST",headers:sbAuthHeaders(),body:"{}"});
    if(sbCheck401(r))return;
    if(r.ok)rows=(await r.json())||[];
  }catch(e){toast("Netzwerkfehler","err");return;}
  if(!rows.length){toast("Keine Kaderdaten gefunden","err");return;}
  const mitGroesse=rows.filter(r=>r.trikot_groesse||r.schuh_groesse).length;
  const csv=["Name;Nummer;Trikot;Schuhe",...rows.map(r=>[_csvCell(r.name),_csvCell(r.nr),_csvCell(r.trikot_groesse),_csvCell(r.schuh_groesse)].join(";"))].join("\r\n");
  const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"}); // BOM fuer Excel
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="adler-ausruestung.csv";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast(`CSV exportiert – ${mitGroesse}/${rows.length} mit Größe ✓`);
}

/* ═══════════════════════════════════
   EVENT-GALERIE (Welle 2, FEAT W) – FOTOS-ONLY (bewusste Kostenentscheidung).
   Teamweite Sicht ueber die security-definer-RPC termin_gallery (Minimaldaten).
   Fotos: privater Bucket 'termin_media' (5 MB, nur Bilder, Limit serverseitig).
   Trainer moderiert (Loeschrecht via authRole). Anzeige per Auth-Download + Blob.
═══════════════════════════════════ */
async function galerieOpen(terminId,titel){
  if(!sbToken()){toast("Bitte zuerst anmelden","err");return;}
  document.getElementById("gal-modal")?.remove();
  const m=document.createElement("div");m.id="gal-modal";m.dataset.termin=terminId;
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:520px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:800;font-size:16px">📸 Fotos${titel?" · "+esc(titel):""}</div>
      <button onclick="document.getElementById('gal-modal').remove()" style="border:none;background:none;font-size:22px;color:var(--text2);cursor:pointer">×</button>
    </div>
    <div style="padding:10px;border:1.5px dashed var(--text3);border-radius:10px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">Foto hinzufügen</div>
      <input id="gal-foto" type="file" accept="image/jpeg, image/png, image/webp" capture="environment" style="width:100%;font-size:12px;margin-bottom:8px">
      <button class="btn btn-p btn-sm" onclick="galerieUpload(this,${terminId})">📸 Hochladen</button>
      <div style="font-size:10px;color:var(--text3);margin-top:6px">Nur Bilder, max. 5 MB. Für alle Team-Eltern sichtbar.</div>
    </div>
    <div id="gal-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  galerieRender(terminId);
}
async function galerieRender(terminId){
  const body=document.getElementById("gal-body"); if(!body)return;
  let items=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/termin_gallery`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_termin:terminId})});if(r.ok)items=(await r.json())||[];}catch(e){}
  const istTrainer=(await authRole())==="trainer";
  if(!items.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Noch keine Fotos – mach das erste! 📷</div>';return;}
  body.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
    ${items.map(f=>`<div style="position:relative">
      <img id="gal-img-${f.id}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:#f1f5f9">
      ${istTrainer?`<button onclick="galerieDelete(${f.id},'${esc(f.foto_path)}',${terminId})" title="Löschen" style="position:absolute;top:4px;right:4px;width:28px;height:28px;border:none;border-radius:8px;background:rgba(0,0,0,.55);color:#fff;cursor:pointer">🗑</button>`:""}
    </div>`).join("")}
  </div>`;
  items.forEach(f=>galerieFoto(f.id,f.foto_path));
}
async function galerieFoto(id,path){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return;
    const img=document.getElementById("gal-img-"+id);
    if(img)img.src=URL.createObjectURL(await r.blob());
  }catch(e){}
}
async function galerieUpload(btn,terminId){
  const input=document.getElementById("gal-foto");
  const file=input&&input.files&&input.files[0];
  if(!file){toast("Bitte ein Foto wählen","err");return;}
  if(file.size>5*1024*1024){toast("Foto zu groß (max. 5 MB)","err");return;} // schneller Client-Check; hartes Limit macht der Bucket
  if(btn)btn.disabled=true;
  try{
    const blob=await fotoCompress(file,1000); // 1000px: gute Event-Qualität, schont Storage
    const path=terminId+"/"+((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()))+".jpg";
    const up=await fetch(`${SB_URL}/storage/v1/object/termin_media/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    const r=await fetch(`${SB_URL}/rest/v1/termin_media`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({termin_id:terminId,foto_path:path})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
    toast("Foto hochgeladen ✓");
    if(input)input.value="";
    galerieRender(terminId);
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");}
  finally{if(btn)btn.disabled=false;}
}
async function galerieDelete(id,path,terminId){
  if(!confirm("Foto wirklich löschen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termin_media?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Löschen fehlgeschlagen","err");return;}
    try{await fetch(`${SB_URL}/storage/v1/object/termin_media/${path}`,{method:"DELETE",headers:{'Authorization':'Bearer '+sbToken()}});}catch(e){}
    galerieRender(terminId);
  }catch(e){}
}
