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
  localStorage.setItem(SB_TOKEN_KEY_ELTERN,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token||null,expires_at:expiresAt})); // eigenes Fach – ueberschreibt den Trainer nicht mehr
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
    localStorage.removeItem(SB_TOKEN_KEY_ELTERN); // Session ohne Profil/Rolle → verwerfen
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
function elternPortalLogout(){ localStorage.removeItem(SB_TOKEN_KEY_ELTERN); document.getElementById("eltern-portal")?.remove(); renderElternPortal(); }
function elternPortalDashboard(root){
  root.innerHTML=`<div style="max-width:440px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 4px 12px">
      <div style="font-size:18px;font-weight:800">🦅 Eltern-Bereich</div>
      <div style="display:flex;align-items:center;gap:10px">
        <button onclick="elternTourStart()" title="Kurze Tour" aria-label="Hilfe/Tour" style="border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:15px;line-height:1">❓</button>
        <button onclick="elternPortalLogout()" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer">Abmelden</button>
      </div>
    </div>
    <div id="ep-dash-body"><div style="text-align:center;padding:40px;color:#64748b">Lade…</div></div>
  </div>`;
  dsgvoEnsureConsent(elternDashLoad); // Dashboard erst nach Datenschutz-Einwilligung laden
}
// Datenschutz-Einwilligung beim (ersten) Eltern-Login. Server-Nachweis in dsgvo_consent
// (user_id + Version + Zeitstempel). Bei neuer Version (Text-Update) → erneute Einwilligung.
const DSGVO_VERSION="1.0";
async function dsgvoEnsureConsent(onOk){
  let has=false;
  try{const r=await fetch(`${SB_URL}/rest/v1/dsgvo_consent?select=version&version=eq.${encodeURIComponent(DSGVO_VERSION)}`,{headers:sbAuthHeaders()});if(r.ok)has=((await r.json())||[]).length>0;}catch(e){}
  if(has){onOk();return;}
  dsgvoRenderGate(onOk);
}
function dsgvoRenderGate(onOk){
  const body=document.getElementById("ep-dash-body"); if(!body){onOk();return;}
  window._dsgvoOnOk=onOk;
  body.innerHTML=`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;font-size:12.5px;line-height:1.55;color:#334155">
    <div style="font-size:16px;font-weight:800;color:#1a1a2e;margin-bottom:6px">Datenschutz & Einwilligung</div>
    <p style="margin:0 0 8px">Bevor du den Eltern-Bereich nutzt, bitten wir um deine Einwilligung. So gehen wir mit euren Daten um:</p>
    <ul style="margin:0 0 8px 18px;padding:0">
      <li><b>Wozu:</b> Organisation des Trainings- und Spielbetriebs der U9 (Termine, Rückmeldungen, Aufstellung, altersgerechte Förderung).</li>
      <li><b>Sicherheit:</b> Zugang nur per persönlichem Login (Einmal-Code an eure E-Mail, kein Passwort). Du siehst ausschließlich die Daten deines eigenen Kindes – technisch per Zugriffsregeln (Row-Level-Security) erzwungen.</li>
      <li><b>Fotos:</b> Kinderfotos liegen in einem privaten, zugriffsgeschützten Speicher und werden nur mit ausdrücklicher, kindbezogener Freigabe verwendet (Standard: aus).</li>
      <li><b>Keine Weitergabe:</b> keine Nutzung zu Werbezwecken, kein Verkauf; keine Zahlungs-/Kontodaten in der App.</li>
      <li><b>Technik:</b> Hosting/Datenbank über Supabase (EU); Wetter über open-meteo, Karten über OpenStreetMap – dorthin gehen nur Orts-/Termindaten, keine personenbezogenen Daten.</li>
    </ul>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;font-size:11.5px;color:#92400e;margin:8px 0">
      <b>Vom Verein auszufüllen:</b> Verantwortlicher: [Name/Anschrift] · Datenschutz-Kontakt: [E-Mail] · Rechtsgrundlage: [z. B. Einwilligung Art. 6/9 DSGVO] · Speicherdauer: [z. B. bis Saisonende/Austritt] · Rechte (Auskunft, Löschung, Widerruf) über den Kontakt · Vollständige Datenschutzerklärung: [Link].
    </div>
    <label style="display:flex;align-items:flex-start;gap:8px;margin:10px 0;font-size:12.5px;cursor:pointer">
      <input type="checkbox" id="dsgvo-cb" style="margin-top:3px" onchange="var b=document.getElementById('dsgvo-ok');b.disabled=!this.checked;b.style.opacity=this.checked?'1':'.5'">
      <span>Ich habe die Hinweise gelesen und willige in die beschriebene Verarbeitung ein. Die Einwilligung kann ich jederzeit für die Zukunft widerrufen.</span>
    </label>
    <button id="dsgvo-ok" disabled onclick="dsgvoAccept()" style="width:100%;min-height:46px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;opacity:.5">Zustimmen & fortfahren</button>
    <div style="text-align:center;margin-top:8px"><button onclick="elternPortalLogout()" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer">Ablehnen & abmelden</button></div>
  </div>`;
}
async function dsgvoAccept(){
  const btn=document.getElementById("dsgvo-ok"); if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/dsgvo_consent`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({version:DSGVO_VERSION})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Konnte nicht speichern","err");if(btn)btn.disabled=false;return;}
  }catch(e){toast("Netzwerkfehler","err");if(btn)btn.disabled=false;return;}
  toast("Danke – Einwilligung gespeichert ✓");
  const ok=window._dsgvoOnOk; window._dsgvoOnOk=null; if(typeof ok==="function")ok();
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
  window._elternKids=kids;   // fürs Fairplay-Quiz (Federn fürs eigene Kind)
  let termineListe=[]; // UX 6: Timeline – die nächsten Termine, nicht nur der eine
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&datum=gte.${heute}&order=datum.asc&limit=12`,{headers:sbAuthHeaders()});if(r.ok){termineListe=await r.json();termin=termineListe[0]||null;}}catch(e){}
  ELTERN_TERMINE=termineListe; // für den „Alle Termine"-Dialog + Kalender-Export
  let rsvp={};
  if(termin){
    try{const ids=kids.map(k=>k.spieler_id).join(",");const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${termin.id}&spieler_id=in.(${ids})&select=spieler_id,status,kommentar`,{headers:sbAuthHeaders()});if(r.ok){(await r.json()).forEach(x=>rsvp[x.spieler_id]=x);}}catch(e){}
  }
  let html="";
  if(termin&&termin.platz_status)html+=elternPlatzAmpelBanner(termin);   // ganz oben: findet statt / Ausweich / fällt aus
  if(termin&&(termin.typ==="spiel"||termin.typ==="turnier"))html+='<div id="pause-card"></div>';  // ganz oben, noch vor dem Termin
  if(!termin){
    html+=card('<div style="font-weight:700;margin-bottom:2px">📅 Nächster Termin</div><div style="color:#64748b;font-size:13px">Aktuell ist kein Termin geplant.</div>');
  }else{
    const m=(typeof TM_META!=="undefined"&&TM_META[termin.typ])||{icon:"📅",label:termin.typ,col:"#1e3a8a"};
    const d=new Date(termin.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=termin.uhrzeit?String(termin.uhrzeit).slice(0,5)+" Uhr":"";
    const offen=kids.filter(k=>!rsvp[k.spieler_id]);
    const trainerJa=Object.keys(termin.trainer_status||{}).filter(n=>(termin.trainer_status||{})[n]==="ja");
    // Zu-/Absage direkt am Termin – erneuter Klick auf den aktiven Status entfernt ihn wieder.
    const rsvpRows=kids.map(k=>{
      const kd=k.kader||{}, cur=rsvp[k.spieler_id], st=cur?cur.status:null;
      const btns=Object.keys(EP_RSVP).map(s=>{
        const on=st===s, c=EP_RSVP[s];
        const act=on?`elternRsvpClear(${termin.id},${k.spieler_id})`:`elternRsvp(${termin.id},${k.spieler_id},'${s}')`;
        return `<button onclick="${act}" style="flex:1;min-width:84px;padding:10px 6px;border-radius:10px;border:1.5px solid ${on?c.col:"#e2e8f0"};background:${on?c.col:"#fff"};color:${on?"#fff":"#334155"};font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">${c.emo} ${c.lbl}</button>`;
      }).join("");
      return `<div style="border-top:1px solid #f1f5f9;margin-top:10px;padding-top:10px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-weight:700;font-size:14px">${esc(kd.name||"Kind")}</span>
          ${kd.nr!=null?`<span style="color:#94a3b8;font-weight:600;font-size:12px">#${kd.nr}</span>`:""}
          <span style="margin-left:auto;font-size:11.5px;font-weight:700;color:${st?EP_RSVP[st].col:"#b45309"}">${st?EP_RSVP[st].emo+" "+EP_RSVP[st].lbl:"❗ offen"}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${btns}</div>
        ${st?`<div style="font-size:10.5px;color:#94a3b8;margin-top:5px">Nochmal auf „${EP_RSVP[st].lbl}" tippen, um die Rückmeldung zu entfernen.</div>`:""}
        ${cur&&cur.kommentar?`<div style="font-size:11px;color:#64748b;margin-top:3px">„${esc(cur.kommentar)}"</div>`:""}
        ${st==="zugesagt"?`<button onclick="elternCarpoolOpen(${k.spieler_id},${termin.id})" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🚗 Fahrgemeinschaft</button>`:""}
      </div>`;
    }).join("");
    html+=`<div id="termin-card" style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;${offen.length?"border:2px solid #f59e0b;box-shadow:0 4px 16px rgba(245,158,11,.18)":""}">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8">Nächster Termin</div>
        ${offen.length?`<span style="margin-left:auto;font-size:10px;font-weight:800;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:20px;padding:2px 8px">❗ Rückmeldung fehlt</span>`:""}
      </div>
      <div style="font-size:16px;font-weight:800;margin-top:2px">${m.icon} ${esc(termin.titel||termin.gegner||m.label)}</div>
      <div style="font-size:12.5px;color:#64748b;margin-top:3px">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}${zeit?" · "+zeit:""}${termin.ort?" · "+mapsAnchor(termin.ort):""}${termin.platz?" · 🏟️ "+esc(termin.platz):""}</div>
      <div id="wetter-eltern"></div>
      ${trainerJa.length?`<div style="font-size:11.5px;color:#64748b;margin-top:4px">👤 Trainer dabei: ${trainerJa.map(esc).join(", ")}</div>`:""}
      ${rsvpRows}
      <div style="font-size:10.5px;color:#94a3b8;margin-top:8px">Deine Rückmeldung ist ein Hinweis für den Trainer – die endgültige Aufstellung entscheidet er.</div>
      ${termin.typ==="training"?'<div id="betreuung-card"></div>':""}
      ${termin.typ==="turnier"?'<div id="turnierplan-card"></div>':""}
      ${elternTickerHtml(termin)}
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="galerieOpen(${termin.id},'${(termin.titel||termin.gegner||m.label).replace(/'/g,'')}')" style="flex:1;min-width:130px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#7c3aed;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📸 Event-Fotos</button>
        <button onclick="elternTermineOpen()" style="flex:1;min-width:130px;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📅 Alle Termine</button>
      </div>
    </div>`;
  }
  // ── Kabine (Kinder-Modus) – das Quiz lebt ausschließlich hier ──
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🎮 Für die Kinder</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Die Kabine ist der Kinder-Modus: Team-Galerie, Missionen und das Fußball-Quiz (${XP_ICON} Federn sammeln).</div>
    <button onclick="kabineOpen()" style="display:block;width:100%;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer">🎮 Kabine öffnen (Kinder-Modus)</button>`);
  // ── Für dein Kind: Karte, Abzeichen, Fan-Fakten (ohne Zu-/Absage, auch ohne Termin erreichbar) ──
  html+=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin:2px 2px 6px">Für dein Kind</div>`;
  html+=kids.map(k=>{const kd=k.kader||{};
    return card(`<div style="font-weight:700;font-size:15px;margin-bottom:2px">${esc(kd.name||"Kind")}${kd.nr!=null?` <span style="color:#94a3b8;font-weight:600">#${kd.nr}</span>`:""}</div>
      <div id="xp-chip-${k.spieler_id}" style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:8px"></div>
      <button onclick="elternCardOpen(${k.spieler_id})" style="width:100%;padding:9px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🃏 Adler-Karte ansehen</button>
      <button onclick="abzeichenOpen(${k.spieler_id},'${(kd.name||'').replace(/'/g,'')}')" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#b45309;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🎖️ Technik-Abzeichen</button>
      <button onclick="childWrappedShare(${k.spieler_id})" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#7c3aed;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🎬 Saison-Rückblick (Wrapped)</button>
      <button onclick="elternFanfactsOpen(${k.spieler_id},'${(kd.name||'').replace(/'/g,'')}')" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #64748b;border-radius:10px;background:#fff;color:#475569;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">✏️ Fan-Fakten &amp; Foto</button>
      <div style="font-size:10.5px;color:#94a3b8;margin-top:6px">Foto: Unter „Fan-Fakten &amp; Foto" steuerst du selbst, ob das Bild deines Kindes im „Adler Horst" und in der Team-Galerie erscheint.</div>`);
  }).join("");
  // Mehr vom Team: Stadionheft (öffentliche Leseansicht)
  html+=card(`<div style="font-weight:700;margin-bottom:6px">📰 Mehr vom Team</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Das digitale Stadionheft mit Neuigkeiten, Ergebnissen und Geburtstagen.</div>
    <a href="${location.pathname}?heft" style="display:block;text-align:center;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;text-decoration:none">📰 Adler Horst öffnen</a>`);
  // Fairplay-Codex (Phase 18.3) – die goldenen Regeln fürs Verhalten am Spielfeldrand
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🤝 Unser Fairplay-Codex</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Die Regeln, damit der Spielfeldrand ein guter Ort für die Kinder bleibt.</div>
    <button onclick="fairplayOpen()" style="width:100%;padding:11px;border:none;border-radius:10px;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">Codex ansehen</button>
    <button onclick="fairplayQuizStart(window._elternKids||[])" style="width:100%;margin-top:8px;padding:11px;border:1.5px solid #16a34a;border-radius:10px;background:#fff;color:#15803d;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🏅 Fairplay-Quiz spielen · ${XP_ICON} 50 Federn fürs Kind</button>`);
  // Adler-Börse (Phase 23.1): interner Flohmarkt
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🛍️ Adler-Börse</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Zu kleine Schuhe oder Trikots? Gib sie an ein anderes Adler-Kind weiter.</div>
    <button onclick="boerseOpen()" style="width:100%;padding:11px;border:1.5px solid #2563eb;border-radius:10px;background:#fff;color:#1d4ed8;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Börse öffnen</button>`);
  // FEAT Y: Fundbüro – Board + Upload für alle eingeloggten Eltern
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🧦 Fundbüro</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Trinkflasche verschwunden? Jacke gefunden? Hier sammelt das Team.</div>
    <button onclick="fundbueroOpen()" style="width:100%;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Fundbüro öffnen</button>`);
  html+=`<div id="skill-slot"></div>`;        // Skill der Woche
  if(WAESCHE_AKTIV)html+=`<div id="waesche-slot"></div>`;  // Trikot-Wäsche-Rotator (aktuell ausgeblendet)
  html+=`<div id="mitbring-slot"></div>`;     // Event-Mitbringliste (async, nur bei kommenden Events)
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
  html+=`<div id="ak-slot"></div>`; // FEAT Z: Adler-Kasse (async, nur wenn Link gesetzt)
  body.innerHTML=html;
  if(termin&&termin.datum)wetterInto("wetter-eltern",termin.datum,termin.ort,termin.uhrzeit); // Wetter am Termin-Ort + Uhrzeit
  if(termin&&termin.typ==="training")elternBetreuungLoad(termin.id,kids); // wer bleibt vor Ort
  if(termin&&termin.typ==="turnier")elternTurnierplanLoad(termin);        // Begegnungen, Turnierbaum, Aushang
  if(termin&&(termin.typ==="spiel"||termin.typ==="turnier"))elternPauseLoad(termin,kids);
  if(!window._eTourChecked){window._eTourChecked=true;setTimeout(elternTourMaybe,700);} // Eltern-Tour einmalig
  kabineCodeHash().catch(()=>{});   // Hash vorladen, damit die Kabine auch offline wieder aufgeht
  adlerkasseLinkGet().then(l=>{const el=document.getElementById("ak-slot");if(!el)return;el.innerHTML=adlerkasseCardHtml(l)+(l?akShareBtnHtml():"");if(l)window._akLink=l;}).catch(()=>{});
  elternMitbringLoad(kids);                    // Event-Mitbringliste: wer bringt was mit
  if(WAESCHE_AKTIV)elternWaescheLoad(kids);    // Trikot-Wäsche-Rotator (aktuell ausgeblendet)
  elternSkillLoad(kids);   // Skill der Woche
  // Kam das Kind über „← Zurück zur Kabine" aus dem Quiz? Dann nicht im Eltern-Hub landen.
  let backToKabine=false; try{backToKabine=sessionStorage.getItem("adler_open_kabine")==="1";sessionStorage.removeItem("adler_open_kabine");}catch(e){}
  if(backToKabine)setTimeout(kabineOpen,50);
  // FEAT S: XP-Chips async füllen (RPC xp_total – Eltern sehen nur das eigene Kind)
  kids.forEach(k=>{xpTotal(k.spieler_id).then(t=>{const el=document.getElementById("xp-chip-"+k.spieler_id);if(el){const b=xpBadge(t);el.textContent=`${XP_ICON} ${t} ${XP_LABEL} · ${b.emo} ${b.t}`;}}).catch(()=>{});});
  // UX 3: Deep-Link-Intent genau einmal abarbeiten – zur Termin-Karte scrollen + kurz pulsen lassen
  if(rsvpIntent){
    try{sessionStorage.removeItem("adler_rsvp_intent");}catch(e){}
    const w=document.getElementById("termin-card");
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
  if(status==="zugesagt"){const d=await xpAward(spielerId,"rsvp","t"+terminId);if(d>0)setTimeout(()=>toast(`${XP_ICON} +${d} ${XP_LABEL} gesammelt!`),1100);}
  elternDashLoad();
}
// Rückmeldung wieder entfernen (erneuter Klick auf den aktiven Status). Eltern dürfen nur die
// Zeile des eigenen Kindes löschen (RLS). Gesammelte Adler-Federn bleiben (append-only Ledger).
async function elternRsvpClear(terminId,spielerId){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&spieler_id=eq.${spielerId}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok){toast("Konnte nicht entfernen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Rückmeldung entfernt");
  elternDashLoad();
}
// Alle kommenden Termine als Dialog + Kalender-Export (.ics) – gleiche Quelle wie die Liste.
let ELTERN_TERMINE=[];
function elternTermineOpen(){
  const rows=ELTERN_TERMINE||[];
  document.getElementById("et-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="et-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Alle Termine");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10030;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const list=rows.length?rows.map((t,i)=>{
    const tm=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
    const td=new Date(t.datum+"T00:00:00");
    const twtag=["So","Mo","Di","Mi","Do","Fr","Sa"][td.getDay()];
    const tzeit=t.uhrzeit?String(t.uhrzeit).slice(0,5):"";
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #f1f5f9${i===0?";background:#eff6ff;border-radius:8px":""}">
      <div style="font-size:20px;width:28px;text-align:center">${tm.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px">${esc(t.titel||t.gegner||tm.label)}${i===0?' <span style="font-size:10px;color:#2563eb;font-weight:800">· NÄCHSTER</span>':""}</div>
        <div style="font-size:11px;color:#64748b">${twtag} ${td.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${tzeit?" · "+tzeit+" Uhr":""}${t.ort?" · "+esc(t.ort):""}${t.platz?" · 🏟️ "+esc(t.platz):""}</div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${tm.col};background:${tm.col}18;border-radius:6px;padding:3px 7px;white-space:nowrap">${tm.label}</span>
    </div>`;}).join(""):'<div style="font-size:12.5px;color:#94a3b8;padding:10px 0">Aktuell sind keine Termine geplant.</div>';
  const c=document.createElement("div");
  c.style.cssText="background:#fff;color:#1a1a2e;max-width:440px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:10px">📅 Alle Termine</div>
    <div style="max-height:55vh;overflow-y:auto">${list}</div>
    ${rows.length?`<button onclick="elternTermineIcs()" style="width:100%;margin-top:12px;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📥 Alle in meinen Kalender</button>`:""}
    <button onclick="document.getElementById('et-modal').remove()" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;background:#f1f5f9;color:#334155;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Schließen</button>`;
  modal.appendChild(c);document.body.appendChild(modal);
}
function elternTermineIcs(){
  const rows=ELTERN_TERMINE||[];
  if(!rows.length){toast("Keine Termine","err");return;}
  const dtStamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SV Adler Dellbrück//U9//DE","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Adler U9 Termine"];
  rows.forEach(t=>{
    const tm=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{label:t.typ};
    const time=(t.uhrzeit?String(t.uhrzeit).slice(0,5):"")||"17:00";
    lines.push("BEGIN:VEVENT","UID:adler-"+t.id+"-"+t.datum+"@adler-u9","DTSTAMP:"+dtStamp,
      "DTSTART:"+icsLocalStart(t.datum,time),"DTEND:"+icsLocalPlus(t.datum,time,90),
      "SUMMARY:"+icsEscape((tm.label||"Termin")+": "+(t.titel||t.gegner||tm.label||"")));
    if(t.ort)lines.push("LOCATION:"+icsEscape(t.ort));
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="adler-u9-termine.ics";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast("Kalenderdatei erstellt ✓");
}
// Eltern-Betreuung beim Training: wer bleibt vor Ort. Alle Eltern sehen die Liste (betreuung_board).
async function elternBetreuungLoad(terminId,kids){
  const box=document.getElementById("betreuung-card"); if(!box)return;
  const ids=(kids||[]).map(k=>k.spieler_id);
  let mine={};
  try{const r=await fetch(`${SB_URL}/rest/v1/betreuung?termin_id=eq.${terminId}&spieler_id=in.(${ids.join(",")})&select=spieler_id,will_stay`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>mine[x.spieler_id]=x.will_stay);}catch(e){}
  let board=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/betreuung_board`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:terminId})});if(r.ok)board=((await r.json())||[]).map(x=>x.name);}catch(e){}
  const toggles=(kids||[]).map(k=>{const kd=k.kader||{};const stay=mine[k.spieler_id]===true;
    return `<button onclick="elternBetreuungToggle(${terminId},${k.spieler_id},${stay?"false":"true"})" style="width:100%;margin-top:6px;padding:11px;border:1.5px solid ${stay?"#059669":"#cbd5e1"};border-radius:10px;background:${stay?"#059669":"#fff"};color:${stay?"#fff":"#334155"};font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">${stay?"✅ "+esc(kd.name||"Kind")+" – ich bleibe vor Ort":"🙋 "+esc(kd.name||"Kind")+": ich bleibe vor Ort"}</button>`;}).join("");
  const list=board.length?`<b style="color:#059669">${board.map(esc).join(", ")}</b>`:`<span style="color:#b45309;font-weight:700">noch niemand – bitte helft mit ⚠️</span>`;
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">🙋 Betreuung beim Training</div>
    <div style="font-size:11.5px;color:#64748b;margin-bottom:6px">Mindestens ein Elternteil sollte während des Trainings vor Ort bleiben.</div>
    <div style="font-size:12.5px;margin-bottom:4px">Vor Ort: ${list}</div>
    ${toggles}
  </div>`;
}
async function elternBetreuungToggle(terminId,spielerId,stay){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/betreuung?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:spielerId,will_stay:stay,updated_at:new Date().toISOString()})});
    if(!r.ok){toast("Konnte nicht speichern","err");return;}
    toast(stay?"Danke – du bleibst vor Ort ✓":"Notiert – du bleibst nicht vor Ort");
    elternDashLoad();
  }catch(e){toast("Netzwerkfehler","err");}
}
// Eltern-Feature-Tour: kurzer Überblick beim ersten Login (einmalig), jederzeit neu startbar.
const ELTERN_TOUR=[
  {emo:"🦅", t:"Willkommen im Eltern-Bereich", d:"Hier läuft alles rund um dein Kind bei der U9 zusammen. Du kannst diese Tour später jederzeit über das ❓ oben neu starten."},
  {emo:"👍", t:"Zu- & Absagen", d:"Melde dein Kind direkt oben am nächsten Termin zu oder ab. Tippst du den aktiven Status nochmal an, wird die Rückmeldung wieder entfernt. Über „Alle Termine\" siehst du alles Kommende und kannst es in deinen Kalender laden."},
  {emo:"🙋", t:"Alles rund um den Termin", d:"In derselben Karte findest du Wetter, Treffpunkt und Fahrgemeinschaften. Beim Training gibst du an, ob du vor Ort bleibst – so seht ihr alle, dass immer jemand da ist. Bei Spielen und Turnieren führt dich der 📣 Liveticker zum Spielstand, auch wenn du nicht dabei sein kannst."},
  {emo:"🎮", t:"Die Kabine (Kinder-Modus)", d:"Gib dein Handy bedenkenlos weiter: In der Kabine spielt dein Kind das Taktik- und das Fußball-Quiz, sammelt 🪶 Federn und stöbert in Team-Galerie und Missionen. Zurück in den Eltern-Bereich geht es nur mit einem Code."},
  {emo:"🃏", t:"Für dein Kind", d:"Sammelkarte, Technik-Abzeichen (die hakst du zuhause ab), Saison-Rückblick und Fan-Fakten. Dort entscheidest du auch, ob das Foto deines Kindes im „Adler Horst\" und in der Team-Galerie erscheinen darf – ohne dein Häkchen bleiben es nur die Initialen."},
  {emo:"📰", t:"Team, Heft & Adler-Kasse", d:"Der „Adler Horst\" ist unser digitales Stadionheft. Und über „Fan-Link teilen\" schickst du Oma, Opa und Fans den Spenden-Link zur Mannschaftskasse. Viel Spaß! 🎉"},
];
let elternTourIdx=0;
function elternTourMaybe(){ try{if(localStorage.getItem("adler_eltern_tour"))return;}catch(e){} elternTourStart(); }
function elternTourStart(){ elternTourIdx=0; elternTourRender(); }
function elternTourNext(){ if(elternTourIdx<ELTERN_TOUR.length-1){elternTourIdx++;elternTourRender();}else elternTourClose(); }
function elternTourPrev(){ if(elternTourIdx>0){elternTourIdx--;elternTourRender();} }
function elternTourClose(){ try{localStorage.setItem("adler_eltern_tour","1");}catch(e){} document.getElementById("eltern-tour-ov")?.remove(); }
function elternTourRender(){
  document.getElementById("eltern-tour-ov")?.remove();
  const s=ELTERN_TOUR[elternTourIdx]; if(!s){elternTourClose();return;}
  const last=elternTourIdx===ELTERN_TOUR.length-1;
  const ov=document.createElement("div"); ov.id="eltern-tour-ov";
  ov.style.cssText="position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:20px";
  ov.innerHTML=`<div style="background:#fff;color:#1a1a2e;max-width:360px;width:100%;border-radius:18px;padding:22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.5)">
    <div style="font-size:42px;line-height:1">${s.emo}</div>
    <div style="font-size:18px;font-weight:800;margin:8px 0 8px">${esc(s.t)}</div>
    <div style="font-size:13.5px;color:#475569;line-height:1.5;text-align:left">${esc(s.d)}</div>
    <div style="display:flex;gap:6px;justify-content:center;margin:16px 0 4px">${ELTERN_TOUR.map((_,i)=>`<span style="width:7px;height:7px;border-radius:50%;background:${i===elternTourIdx?'#1e3a8a':'#cbd5e1'}"></span>`).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      ${elternTourIdx>0?`<button onclick="elternTourPrev()" style="padding:9px 14px;border:1.5px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Zurück</button>`:`<button onclick="elternTourClose()" style="padding:9px 14px;border:none;background:none;color:#64748b;font-family:inherit;font-size:13px;cursor:pointer">Überspringen</button>`}
      <button onclick="elternTourNext()" style="margin-left:auto;padding:9px 16px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">${last?"Fertig 🚀":"Weiter"}</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
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
  const d=adlerCardDataFromChild(p); d.spielerId=spielerId; elternCardShow(d);
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
  const cardWrap=cardHoloWrap(canvas); // FUT 2.0: Foil-Overlay über der Karte
  modal.appendChild(cardWrap);
  cardApplyGlow(canvas, d.counts&&d.counts.trainings); // Meilenstein-Glanz (Zähler kommen aus der RPC)
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
  bar.innerHTML=`<button class="btn btn-p" onclick="adlerCardShare()"><i class="ti ti-share"></i>Karte teilen</button>
    <button class="btn" onclick="document.getElementById('adler-card-modal').remove()">Schließen</button>`;
  modal.appendChild(bar);
  document.body.appendChild(modal);
  // Federn-Stand → Karten-Skin (in render() gebacken) + Foil-Tier + Unboxing-Feier + Skin-Galerie
  if(d.spielerId){ xpTotal(d.spielerId).then(f=>{ if(document.getElementById("adler-card-modal")){ d.federn=f; render(); cardHoloSetTier(cardWrap,cardSkinFor(f)); cardTierCelebrateMaybe(cardWrap,d.spielerId,f); modal.appendChild(cardSkinGalleryEl(f)); } }).catch(()=>{}); }
  if(d.fotoPath){ const img=await fotoLoadImage(d.fotoPath); if(img&&document.getElementById("adler-card-modal")){ rawPhoto=img; render(); } }
}
/* ═══════════════════════════════════
   TECHNIK-ABZEICHEN – echte Off-Screen-Challenges, ELTERN haken ab.
   Schafft das Kind eine Übung zuhause/beim Spielen → Eltern bestätigen → Federn (einmalig
   pro Abzeichen via quelle_id). Erledigte kommen aus xp_events_for (append-only punkte_log).
   IDs sind STABIL (nie umbenennen → sonst Doppel-Gutschrift). Vertrauens-Modell ok: kein
   Ranking, Federn speisen nur die eigene Karte – „Schummeln" bringt niemandem etwas.
═══════════════════════════════════ */
const TECHNIK_ABZEICHEN=[
  {id:"ab_jonglier",emo:"🤹",name:"Ball-Jongleur",desc:"Halte den Ball 5× hoch, ohne dass er runterfällt."},
  {id:"ab_beidfuss",emo:"🦶",name:"Beidfüßer",desc:"Spiele 10× mit rechts und 10× mit links gegen eine Wand."},
  {id:"ab_slalom",emo:"🐍",name:"Slalom-König",desc:"Dribble durch 5 Hütchen (oder Schuhe), ohne eins umzuwerfen."},
  {id:"ab_innenseite",emo:"🎯",name:"Pass-Meister",desc:"Triff eine Wand aus 3 m 10× mit der Fuß-Innenseite."},
  {id:"ab_sohle",emo:"↩️",name:"Sohlen-Roller",desc:"Rolle den Ball 10× mit der Sohle vor und zurück."},
  {id:"ab_torschuss",emo:"⚽",name:"Torjäger",desc:"Triff 5× aus 5 m ins (kleine) Tor."},
  {id:"ab_kopfball",emo:"🧠",name:"Kopfball-Held",desc:"Köpfe einen weichen Ball 3× ganz sanft."},
  {id:"ab_ausdauer",emo:"🏃",name:"Ausdauer-Adler",desc:"Spiele oder laufe 10 Minuten am Stück ohne Pause."},
  {id:"ab_trick",emo:"✨",name:"Trick-Meister",desc:"Übe einen Übersteiger und schaff ihn 3× hintereinander."},
  {id:"ab_stoppen",emo:"🛑",name:"Ball-Stopper",desc:"Nimm einen zugeworfenen Ball 5× sauber an und stoppe ihn."}
];
async function abzeichenOpen(spielerId,name){
  document.getElementById("abzeichen-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="abzeichen-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Technik-Abzeichen");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:#fff;color:#1a1a2e;max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🎖️ Technik-Abzeichen${name?" · "+esc(name):""}</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:12px">Übt zuhause und beim Spielen. Wenn dein Kind ein Abzeichen schafft, hakst du es ab – es gibt Adler-Federn ${XP_ICON}!</div>
    <div id="abzeichen-list" style="display:flex;flex-direction:column;gap:8px"><div style="color:#94a3b8;font-size:12px">Lade…</div></div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('abzeichen-modal').remove()">Schließen</button>`;
  modal.appendChild(card);document.body.appendChild(modal);
  abzeichenRender(spielerId);
}
async function abzeichenRender(spielerId){
  const box=document.getElementById("abzeichen-list"); if(!box)return;
  let done=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_events_for`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_quelle:"abzeichen"})});if(r.ok)done=(await r.json())||[];}catch(e){}
  const doneSet=new Set(done), geschafft=TECHNIK_ABZEICHEN.filter(a=>doneSet.has(a.id)).length;
  box.innerHTML=`<div style="font-size:11px;font-weight:800;color:#b45309;margin-bottom:2px">${geschafft}/${TECHNIK_ABZEICHEN.length} geschafft</div>`+
    TECHNIK_ABZEICHEN.map(a=>{
      const on=doneSet.has(a.id);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border:1.5px solid ${on?"#16a34a":"#e2e8f0"};border-radius:12px;background:${on?"#f0fdf4":"#fff"}">
        <div style="font-size:26px;line-height:1;${on?"":"filter:grayscale(.3);opacity:.85"}">${a.emo}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#1a1a2e">${esc(a.name)}${on?" ✓":""}</div>
          <div style="font-size:11px;color:#64748b;line-height:1.3">${esc(a.desc)}</div>
        </div>
        ${on?`<span style="font-size:11px;font-weight:800;color:#16a34a">✓ geschafft</span>`
             :`<button onclick="abzeichenAward(${spielerId},'${a.id}',this)" style="flex:none;padding:8px 10px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap">Als geschafft eintragen</button>`}
      </div>`;
    }).join("");
}
async function abzeichenAward(spielerId,badgeId,btn){
  if(btn)btn.disabled=true;
  try{
    const d=await xpAward(spielerId,"abzeichen",badgeId);
    if(d>0){
      toast(`🎖️ Abzeichen geschafft – ${XP_ICON} +${d} ${XP_LABEL}!`);
      try{navigator.vibrate&&navigator.vibrate([40,60,40,60,120]);}catch(e){}
      if(typeof confetti==="function")confetti(document.getElementById("abzeichen-modal"));
    }else{
      toast("Dieses Abzeichen hat dein Kind schon 👍");
    }
    abzeichenRender(spielerId);
  }catch(e){ toast("Hat nicht geklappt (online & angemeldet?)","err"); if(btn)btn.disabled=false; }
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
/* Event-Mitbringliste (Phase 21.2, umgebaut): Trainer-Überblick, WAS die Eltern zu
   den kommenden Event-Terminen mitbringen. Kein Geld mehr – die alten Geld-Töpfe
   (kassen_topf) sind abgelöst. Eintragen tun die Eltern in ihrem Bereich; der
   Trainer sieht hier die Liste und kann bei Bedarf einzelne Einträge entfernen. */
async function mitbringTrainerOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("mitbring-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="mitbring-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Event-Mitbringliste");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="mitbring-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML='<div style="text-align:center;padding:30px;color:var(--text3)">Lade …</div>';
  modal.appendChild(c);document.body.appendChild(modal);
  await mitbringTrainerRender();
}
async function mitbringTrainerRender(){
  const c=document.getElementById("mitbring-card"); if(!c)return;
  let events=[]; try{events=await mitbringEventsLaden();}catch(e){}
  let itemsMap={}; try{itemsMap=await mitbringItems(events.map(e=>e.id));}catch(e){}
  const fmtD=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
  const body=events.length?events.map(ev=>{
    const items=itemsMap[ev.id]||[];
    const liste=items.length
      ? items.map(it=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 0;border-top:1px solid var(--surface2)">
          <span style="flex:1">🍽️ <b>${esc(it.was)}</b>${it.wer?` <span style="color:var(--text3)">· ${esc(it.wer)}</span>`:""}</span>
          <button onclick="mitbringDeleteTrainer(${it.id})" aria-label="Eintrag löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:32px;min-height:32px"><i class="ti ti-trash"></i></button>
        </div>`).join("")
      : `<div style="font-size:12px;color:var(--text3);padding:4px 0">Noch nichts eingetragen.</div>`;
    return `<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-bottom:10px">
      <div style="font-weight:800;font-size:14px">🎉 ${esc(ev.titel||"Event")}</div>
      <div style="font-size:11.5px;color:var(--text2);margin-bottom:6px">${fmtD(ev.datum)}${ev.ort?" · "+esc(ev.ort):""} · ${items.length} ${items.length===1?"Eintrag":"Einträge"}</div>
      ${liste}
    </div>`;
  }).join(""):'<div style="font-size:13px;color:var(--text3);margin-bottom:10px">Kein kommender Event-Termin. Lege im Kalender einen Termin vom Typ „🎉 Event" an – dann tragen die Eltern hier ein, was sie mitbringen.</div>';
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🎉 Event-Mitbringliste</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Wer bringt was mit? Die Eltern tragen es in ihrem Bereich ein – hier siehst du den Überblick. Kein Geld.</div>
    ${body}
    <div style="display:flex;margin-top:8px"><button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('mitbring-modal').remove()">Schließen</button></div>`;
}
async function mitbringDeleteTrainer(id){
  if(!confirm("Diesen Eintrag löschen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht löschen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  mitbringTrainerRender();
}

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
  let spendenLink=""; try{const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=spenden_link`,{headers:sbAuthHeaders()});if(r.ok)spendenLink=(((await r.json())[0])||{}).spenden_link||"";}catch(e){}
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
      <button onclick="kasseDelEntry(${x.id},'${jsq(x.zweck||"")}')" title="Löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
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
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text2);margin:16px 0 6px">🦅 Adler-Kasse (Fan-Spenden-Link)</div>
    <div style="display:flex;gap:6px">
      <input id="ak-link" value="${esc(spendenLink)}" placeholder="https://paypal.me/deinLink" style="flex:1;min-width:130px;${inp}">
      <button class="btn btn-sm" onclick="adlerkasseSave()"><i class="ti ti-device-floppy"></i>Speichern</button>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-top:4px">Dauerhafter Spenden-Button für Fans (Liveticker) &amp; Eltern-Portal. Leer lassen = kein Button.</div>
    <div style="font-size:10px;color:var(--text3);margin-top:12px">Rein informativ – die App verwaltet kein Geld. Zahlungen laufen extern über PayPal.</div>`;
}
async function adlerkasseSave(){
  const link=(document.getElementById("ak-link")?.value||"").trim()||null;
  if(link&&!/^https?:\/\//i.test(link)){toast("Bitte einen vollständigen Link mit https:// eingeben","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({id:1,spenden_link:link,updated_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast(link?"🦅 Adler-Kasse-Link gespeichert ✓":"Link entfernt");
}
async function kasseAddEntry(){
  const sign=parseInt(document.getElementById("k-typ")?.value)||1;
  const val=Math.abs(parseFloat(document.getElementById("k-betrag")?.value)||0);
  if(!val){toast("Betrag eingeben","err");return;}
  const zweck=(document.getElementById("k-zweck")?.value||"").trim()||null;
  try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({betrag:sign*val,zweck})});if(sbCheck401(r))return;if(!r.ok){toast("Fehler","err");return;}}catch(e){return;}
  kasseRender();
}
async function kasseDelEntry(id,zweck){ if(!confirm(`Kassen-Eintrag wirklich löschen?

${zweck||""}`))return; try{const r=await fetch(`${SB_URL}/rest/v1/teamkasse?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){} kasseRender(); }
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
async function kasseDelUmlage(id){ if(!confirm("Umlage wirklich löschen?"))return; try{const r=await fetch(`${SB_URL}/rest/v1/kasse_umlagen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){} kasseRender(); }

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
      <button onclick="kabineQuiz('taktik')" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎯</span>Taktik-Quiz</button>
      <button onclick="kabineQuiz('wissen')" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🧠</span>Fußball-Wissen</button>
      <button onclick="kabineShowGallery()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🖼️</span>Team-Galerie</button>
      <button onclick="kabineShowQuests()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🏆</span>Missionen</button>
      <button onclick="kabineSkillWoche()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎬</span>Skill der Woche</button>
      <button onclick="kabineHype()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎵</span>Kabinen-Hype</button>
    </div>
    <button onclick="kabineExit()" style="margin:0 16px 18px;padding:12px;border:none;border-radius:14px;background:rgba(0,0,0,.25);color:#fff;font-family:inherit;font-size:14px;cursor:pointer">🔒 Für Erwachsene: Kabine verlassen</button>`;
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
      const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=kabine_code_hash`,{headers:sbAuthHeaders()});
      if(r.ok){
        const h=((await r.json())[0]||{}).kabine_code_hash;
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
  const combos=calcBestCombos(verfuegbareSpieler()); // nie abgesagte Spieler vorschlagen
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
      <button class="btn btn-p" onclick="kombiToMatch()" title="Diese Aufstellung als Startelf ins Live-Match (Rotations-Timer) laden"><i class="ti ti-arrow-right"></i>In Match übernehmen</button>
    </div>`;
}
// HOTFIX 15: geplante Aufstellung (kombiLineup) als Startelf ins Live-Match (Rotations-Timer) laden.
function kombiToMatch(){
  const feld=[kombiLineup.auf,kombiLineup.fll,kombiLineup.flr,kombiLineup.jaeg].filter(Boolean);
  if(!feld.length){toast("Erst die Aufstellung festlegen","err");return;}
  tbFormation="4+1"; // die Raute-Aufstellung ist eine 4+1-Formation
  rotTW=kombiLineup.tw||null;
  rotField=[...feld];
  const squad=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():Object.keys(DB);
  const inLineup=new Set([rotTW,...feld].filter(Boolean));
  rotBench=squad.filter(n=>!inLineup.has(n));
  rotBenchSec={};rotFieldSec={};[...squad,...inLineup].forEach(n=>{rotBenchSec[n]=0;rotFieldSec[n]=0;});
  rotElapsed=0;
  toast("✅ Aufstellung ins Match übernommen");
  if(typeof go==="function")go("spieltag");
  setTimeout(()=>{ if(typeof rotRenderControls==="function")rotRenderControls(); if(typeof rotRenderLive==="function")rotRenderLive(); },120);
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
    meta.textContent="Stand: "+now+" · "+TRAINER.join(", ")+" · 4+1 Raute";
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
    const combo=calcBestCombos(verfuegbareSpieler()); // nie abgesagte Spieler aufs Feld stellen
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
    if(s.mode==="pass"){ctx.strokeStyle="#fde047";ctx.setLineDash([9,7]);}   // HOTFIX 17: High-Vis Neon-Gelb
    else{ctx.strokeStyle="#ffffff";ctx.setLineDash([]);}                      // HOTFIX 17: High-Vis Weiß
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
    if(s.mode==="pass"){ctx.strokeStyle="#fde047";ctx.setLineDash([W*0.03,W*0.022]);}  // HOTFIX 17: High-Vis Neon-Gelb
    else{ctx.strokeStyle="#ffffff";ctx.setLineDash([]);}                                 // HOTFIX 17: High-Vis Weiß
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
  const titelRow=document.getElementById("tm-titel-row");
  if(titelRow)titelRow.style.display=t==="training"?"none":"block"; // Training braucht keinen Titel/Gegner
  const lbl=document.getElementById("tm-titel-lbl");
  if(lbl)lbl.textContent=t==="event"?"Titel (z. B. Saisonabschluss, Weihnachtsfeier)":"Gegner / Titel";
  const platzRow=document.getElementById("tm-platz")?.closest(".mg");
  if(platzRow)platzRow.style.display=t==="training"?"block":"none"; // Platz nur beim Training relevant
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
    platz: (document.getElementById("tm-platz")?.value||"").trim()||null,
    uhrzeit: zeit||null,
    saison: saisonForDate(datum),
    spielform: istSpiel?tmSpielform:null,
    gegner: istSpiel?(titel||null):null,
    spieldauer_min: istSpiel?parseInt(document.getElementById("tm-dauer")?.value||"20"):20,
    halbzeiten: istSpiel?(parseInt(document.getElementById("tm-halbzeiten")?.value)||2):2
  };
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){terminIdCacheClear();toast("Termin angelegt ✓");document.getElementById("tm-titel").value="";document.getElementById("tm-ort").value="";const pz=document.getElementById("tm-platz");if(pz)pz.value="";const rb=document.getElementById("tm-addr-results");if(rb)rb.innerHTML="";tmLoad();}
    else toast("Fehler beim Anlegen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
// Gegner-Adresse per Name finden (OpenStreetMap). Trainer tippt Verein/Platz -> Vorschläge ->
// Klick übernimmt die Adresse ins Ort-Feld (füttert auch das Termin-Wetter via Geocoding).
async function gegnerAddrSearch(){
  const box=document.getElementById("tm-addr-results"); if(!box)return;
  const gegner=(document.getElementById("tm-titel")?.value||"").trim();
  const ort=(document.getElementById("tm-ort")?.value||"").trim();
  const q=ort||gegner;
  if(!q){toast("Erst Gegner/Ort eintippen","err");return;}
  box.innerHTML=`<div style="font-size:11px;color:var(--text3);padding:6px 2px">🔍 Suche „${esc(q)}"…</div>`;
  const res=await osmSearch(q);
  if(!res.length){ box.innerHTML=`<div style="font-size:11px;color:var(--text3);padding:6px 2px">Keine Adresse gefunden – bitte manuell eintragen.</div>`; return; }
  box.innerHTML=`<div style="font-size:10px;color:var(--text3);margin:6px 2px 2px">Tippe die passende Adresse an:</div>`+
    res.map(r=>`<button type="button" onclick="gegnerAddrPick(this)" data-addr="${esc(r.label).replace(/"/g,"&quot;")}" style="display:block;width:100%;text-align:left;margin-top:4px;padding:8px 10px;border:var(--border-s);border-radius:8px;background:var(--surface);font-family:inherit;font-size:11.5px;color:var(--text);cursor:pointer;white-space:normal;line-height:1.3">📍 ${esc(r.label)}</button>`).join("");
}
function gegnerAddrPick(btn){
  const addr=btn.getAttribute("data-addr")||"";
  const inp=document.getElementById("tm-ort"); if(inp)inp.value=addr;
  const name=(document.getElementById("tm-titel")?.value||"").trim();
  const box=document.getElementById("tm-addr-results");
  if(box)box.innerHTML=`<div style="font-size:11px;color:#16a34a;padding:4px 2px">✓ Adresse übernommen – Wetter nutzt jetzt diesen Ort.</div>`+
    (name?`<button type="button" class="btn btn-sm" style="margin-top:4px" onclick="gegnerQuickSave()"><i class="ti ti-address-book"></i>„${esc(name)}" als Gegner merken</button>`:"");
}

/* ═══════════════════════════════════
   GEGNER-DATENBANK – Adresse + Ansprechpartner/Kontakt pro Gegner.
   Enthält Kontaktdaten Dritter → Tabelle `gegner` ist RLS-strikt trainer-only.
   Bei der Termin-Anlage füllt ein bekannter Gegner die Adresse automatisch; der
   Ansprechpartner erscheint (klickbar) am nächsten Spiel im Trainer-Dashboard.
═══════════════════════════════════ */
let GEGNER_CACHE=null;
async function gegnerLoad(force){
  if(GEGNER_CACHE&&!force){gegnerDatalistFill();return GEGNER_CACHE;}
  try{const r=await fetch(`${SB_URL}/rest/v1/gegner?select=*&order=name.asc`,{headers:sbAuthHeaders()});if(r.ok)GEGNER_CACHE=await r.json();}catch(e){}
  GEGNER_CACHE=GEGNER_CACHE||[];
  gegnerDatalistFill();
  return GEGNER_CACHE;
}
function gegnerDatalistFill(){
  const dl=document.getElementById("gegner-datalist"); if(!dl||!GEGNER_CACHE)return;
  dl.innerHTML=GEGNER_CACHE.map(g=>`<option value="${esc(g.name)}">`).join("");
}
async function gegnerFind(name){
  if(!name)return null;
  const list=await gegnerLoad(), n=name.trim().toLowerCase();
  return list.find(g=>g.name.toLowerCase()===n) || list.find(g=>n.includes(g.name.toLowerCase())) || null;
}
async function gegnerAutofill(){
  const name=(document.getElementById("tm-titel")?.value||"").trim();
  if(!name)return;
  const g=await gegnerFind(name); if(!g)return;
  const ort=document.getElementById("tm-ort");
  if(ort&&!ort.value.trim()&&g.adresse)ort.value=g.adresse;
  const box=document.getElementById("tm-addr-results");
  if(box)box.innerHTML=`<div style="font-size:11px;color:#16a34a;padding:4px 2px">✓ Gegner erkannt – Adresse${(g.ansprechpartner||g.telefon)?" & Kontakt":""} aus der Datenbank.</div>`;
}
// Telefonnummer → wa.me-Format (nur Ziffern, deutscher Ländercode 49). 0170… → 49170…
function waNumber(tel){
  if(!tel)return "";
  let d=String(tel).replace(/[^\d+]/g,"");
  if(d.charAt(0)==="+")d=d.slice(1);
  else if(d.slice(0,2)==="00")d=d.slice(2);
  else if(d.charAt(0)==="0")d="49"+d.slice(1); // deutsche Nummer
  return d.replace(/\D/g,"");
}
async function gegnerContactInto(elId,name){
  const g=await gegnerFind(name);
  const el=document.getElementById(elId);
  if(!el||!g||!(g.ansprechpartner||g.telefon))return;
  const tel=g.telefon?String(g.telefon).replace(/\s/g,""):"", wa=waNumber(g.telefon);
  el.innerHTML=`<div style="font-size:11.5px;color:var(--text2);margin-top:6px">📇 ${esc(g.ansprechpartner||"Ansprechpartner")}${g.telefon?` · <a href="tel:${esc(tel)}" style="color:var(--blue);font-weight:700;text-decoration:none">☎ ${esc(g.telefon)}</a>${wa?` · <a href="https://wa.me/${wa}" target="_blank" rel="noopener" style="color:#25D366;font-weight:700;text-decoration:none">💬 WhatsApp</a>`:""}`:""}</div>`;
}
async function gegnerQuickSave(){
  const name=(document.getElementById("tm-titel")?.value||"").trim();
  const adresse=(document.getElementById("tm-ort")?.value||"").trim();
  if(!name){toast("Kein Gegnername","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/gegner?on_conflict=name`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({name,adresse:adresse||null})});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){toast("Als Gegner gemerkt ✓ – Kontakt in der Gegner-Datenbank ergänzen");await gegnerLoad(true);}
    else toast("Speichern fehlgeschlagen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function gegnerManageOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("gegner-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="gegner-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Gegner-Datenbank");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:520px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🗂️ Gegner-Datenbank</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Adresse & Ansprechpartner pro Gegner – nur für Trainer sichtbar. Bei der Termin-Anlage füllt sich die Adresse dann automatisch.</div>
    <div id="gegner-list" style="margin-bottom:8px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div id="gegner-form"></div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('gegner-modal').remove()">Schließen</button>`;
  modal.appendChild(card);document.body.appendChild(modal);
  await gegnerLoad(true);
  gegnerRenderList(); gegnerFormRender(null);
}
function gegnerRenderList(){
  const box=document.getElementById("gegner-list"); if(!box)return;
  const list=GEGNER_CACHE||[];
  if(!list.length){box.innerHTML=`<div style="font-size:12px;color:var(--text3)">Noch keine Gegner gespeichert.</div>`;return;}
  box.innerHTML=list.map(g=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:var(--border)">
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700">${esc(g.name)}</div>
      ${g.adresse?`<div style="font-size:11px;color:var(--text2)">📍 ${esc(g.adresse)}</div>`:""}
      ${(g.ansprechpartner||g.telefon)?`<div style="font-size:11px;color:var(--text2)">📇 ${esc(g.ansprechpartner||"")}${g.telefon?` · <a href="tel:${esc(String(g.telefon).replace(/\s/g,""))}" style="color:var(--blue);text-decoration:none">☎ ${esc(g.telefon)}</a> · <a href="https://wa.me/${waNumber(g.telefon)}" target="_blank" rel="noopener" style="color:#25D366;text-decoration:none">💬 WhatsApp</a>`:""}</div>`:""}
    </div>
    <button class="btn btn-sm" onclick="gegnerEdit(${g.id})"><i class="ti ti-edit"></i></button>
  </div>`).join("");
}
// Bisherige Spiele gegen diesen Gegner (aus den geladenen Terminen + termine.ergebnis).
function gegnerHistoryHtml(name){
  if(!name)return "";
  const n=name.trim().toLowerCase();
  const games=(TM_TERMINE||[]).filter(t=>(t.typ==="spiel"||t.typ==="turnier")&&((t.gegner||"").toLowerCase().includes(n)||(t.titel||"").toLowerCase().includes(n)))
    .sort((a,b)=>String(b.datum).localeCompare(String(a.datum))).slice(0,6);
  if(!games.length)return "";
  return `<div style="margin-top:12px;border-top:var(--border-s);padding-top:10px">
    <div style="font-size:11px;font-weight:800;color:var(--text2);margin-bottom:4px">📊 Bisherige Spiele</div>
    ${games.map(t=>{const d=new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});
      return `<div style="font-size:11px;color:var(--text2);padding:2px 0">${d} · ${esc(t.titel||t.gegner||"Spiel")}${t.ergebnis?` · <b style="color:var(--text)">${esc(t.ergebnis)}</b>`:` · <span style="color:var(--text3)">kein Ergebnis</span>`}</div>`;}).join("")}
  </div>`;
}
function gegnerFormRender(g){
  const box=document.getElementById("gegner-form"); if(!box)return;
  g=g||{};
  const fld="width:100%;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  box.innerHTML=`<div style="border-top:var(--border-s);padding-top:10px">
    <div style="font-size:11px;font-weight:800;color:var(--text2);margin-bottom:6px">${g.id?"✏️ Gegner bearbeiten":"➕ Neuer Gegner"}</div>
    <input type="hidden" id="gg-id" value="${g.id||""}">
    <label style="font-size:11px;color:var(--text2)">Name*<input id="gg-name" value="${esc(g.name||"")}" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2)">Adresse<input id="gg-adresse" value="${esc(g.adresse||"")}" placeholder="Straße, PLZ Ort" style="${fld}"></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <label style="font-size:11px;color:var(--text2)">Ansprechpartner<input id="gg-ap" value="${esc(g.ansprechpartner||"")}" style="${fld}"></label>
      <label style="font-size:11px;color:var(--text2)">Telefon<input id="gg-tel" value="${esc(g.telefon||"")}" style="${fld}"></label>
    </div>
    <label style="font-size:11px;color:var(--text2)">E-Mail<input id="gg-email" value="${esc(g.email||"")}" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2)">Notiz<input id="gg-notiz" value="${esc(g.notiz||"")}" style="${fld}"></label>
    <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
      <button class="btn btn-p btn-sm" onclick="gegnerSave()"><i class="ti ti-device-floppy"></i>Speichern</button>
      ${g.id?`<button class="btn btn-sm" onclick="gegnerFormRender(null)">Neu</button><button class="btn btn-sm" style="margin-left:auto;color:#dc2626" onclick="gegnerDelete(${g.id})"><i class="ti ti-trash"></i>Löschen</button>`:""}
    </div>
    ${g.id?gegnerHistoryHtml(g.name):""}
  </div>`;
}
function gegnerEdit(id){ const g=(GEGNER_CACHE||[]).find(x=>x.id===id); gegnerFormRender(g||null); }
async function gegnerSave(){
  const name=(document.getElementById("gg-name")?.value||"").trim();
  if(!name){toast("Name fehlt","err");return;}
  const id=document.getElementById("gg-id")?.value;
  const v=i=>(document.getElementById(i)?.value||"").trim()||null;
  const body={name, adresse:v("gg-adresse"), ansprechpartner:v("gg-ap"), telefon:v("gg-tel"), email:v("gg-email"), notiz:v("gg-notiz")};
  try{
    let r;
    if(id) r=await fetch(`${SB_URL}/rest/v1/gegner?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify(body)});
    else   r=await fetch(`${SB_URL}/rest/v1/gegner?on_conflict=name`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){ toast("Gegner gespeichert ✓"); await gegnerLoad(true); gegnerRenderList(); gegnerFormRender(null); }
    else toast("Speichern fehlgeschlagen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function gegnerDelete(id){
  const g=(GEGNER_CACHE||[]).find(x=>x.id===id);
  if(!confirm(`Gegner wirklich löschen?

${g?g.name:""}

Kontaktdaten und Historie gehen verloren.`))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/gegner?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    toast("Gegner gelöscht"); await gegnerLoad(true); gegnerRenderList(); gegnerFormRender(null);
  }catch(e){toast("Netzwerkfehler","err");}
}
let TM_TERMINE=[]; // zuletzt geladene Termine (für .ics-Lookup + Gegner-Historie)
async function tmLoad(){
  const up=document.getElementById("tm-upcoming"),pa=document.getElementById("tm-past");
  if(!up||!pa)return;
  gegnerLoad(); // Gegner-Datenbank → Datalist für Auto-Fill
  up.innerHTML='<div style="font-size:11px;color:var(--text3)">Lade...</div>';pa.innerHTML="";
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&order=datum.asc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){up.innerHTML='<div style="font-size:11px;color:var(--text3)">Keine Verbindung</div>';return;}
    const rows=await r.json();
    TM_TERMINE=rows;
    const heute=new Date().toISOString().slice(0,10);
    const kommend=rows.filter(t=>t.datum>=heute);
    const vergangen=rows.filter(t=>t.datum<heute).reverse();
    up.innerHTML=kommend.length?kommend.map(tmCard).join(""):'<div style="font-size:11px;color:var(--text3);padding:6px">Keine kommenden Termine.</div>';
    pa.innerHTML=vergangen.length?vergangen.slice(0,20).map(tmCard).join(""):'<div style="font-size:11px;color:var(--text3);padding:6px">Noch keine vergangenen Termine.</div>';
    kommend.forEach(t=>wetterInto("wx-tm-"+t.id,t.datum,t.ort,t.uhrzeit)); // Wetter je Termin (stundengenau, self-limitiert)
  }catch(e){up.innerHTML='<div style="font-size:11px;color:var(--text3)">Offline</div>';}
}
// Einzel-Termin als .ics (Kalender-Datei) – nutzt die vorhandenen ics-Helfer.
function tmIcsOne(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t){toast("Termin nicht gefunden","err");return;}
  const m=TM_META[t.typ]||TM_META.training;
  const time=(t.uhrzeit?String(t.uhrzeit).slice(0,5):"")||"17:00";
  const dtStamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SV Adler Dellbrück//U9//DE","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VEVENT","UID:adler-"+t.id+"-"+t.datum+"@adler-u9","DTSTAMP:"+dtStamp,
    "DTSTART:"+icsLocalStart(t.datum,time),"DTEND:"+icsLocalPlus(t.datum,time,90),
    "SUMMARY:"+icsEscape((m.label||"Termin")+": "+(t.titel||m.label||""))];
  if(t.ort)lines.push("LOCATION:"+icsEscape(t.ort));
  lines.push("END:VEVENT","END:VCALENDAR");
  const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="adler-termin.ics";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast("Kalenderdatei erstellt ✓");
}
// Offene RSVPs auf einen Blick + WhatsApp-Sammelerinnerung (nur die Nachricht wird vorbefüllt).
async function rsvpOverviewOpen(terminId){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(terminId))||{};
  const m=TM_META[t.typ]||TM_META.training;
  let rm=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&select=spieler_id,status`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rm=await r.json();}catch(e){}
  const byId={}; rm.forEach(x=>byId[x.spieler_id]=x.status);
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  const groups={offen:[],zugesagt:[],abgesagt:[],krank:[]};
  kids.forEach(k=>{const s=byId[k.id]||"offen"; (groups[s]||groups.offen).push(k.name);});
  const d=new Date(t.datum+"T00:00:00"), wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const datumStr=wtag+" "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const zeitStr=t.uhrzeit?String(t.uhrzeit).slice(0,5):"";
  const deepLink=appRoot()+"?portal&rsvp="+terminId;
  const waText=`🦅 SV Adler U9 – bitte kurz rückmelden fürs nächste ${m.label}:\n${t.titel||m.label} am ${datumStr}${zeitStr?" um "+zeitStr+" Uhr":""}\nNoch offen: ${groups.offen.length} Kind(er)\n👉 Zu-/absagen: ${deepLink}`;
  document.getElementById("rsvp-ov-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="rsvp-ov-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Rückmeldungen");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const sec=(title,arr,col,emo)=>arr.length?`<div style="margin-top:8px"><div style="font-size:11px;font-weight:800;color:${col}">${emo} ${title} (${arr.length})</div><div style="font-size:12px;color:var(--text2);line-height:1.5">${arr.map(esc).join(", ")}</div></div>`:"";
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">📋 Rückmeldungen</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${m.icon} ${esc(t.titel||m.label)} · ${datumStr}${zeitStr?" · "+zeitStr:""}</div>
    <div style="font-size:13px;font-weight:800;color:${groups.offen.length?"#b45309":"#16a34a"}">${groups.offen.length?groups.offen.length+" noch offen":"Alle haben geantwortet 🎉"}</div>
    ${sec("Offen",groups.offen,"#b45309","❓")}
    ${sec("Zusagen",groups.zugesagt,"#059669","👍")}
    ${sec("Absagen",groups.abgesagt,"#dc2626","👎")}
    ${sec("Krank",groups.krank,"#d97706","🤒")}
    <div style="display:flex;gap:8px;margin-top:14px">
      ${groups.offen.length?`<a class="btn btn-p btn-sm" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i>Erinnerung senden</a>`:""}
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('rsvp-ov-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
}
/* Platz-Ampel: drei Fat-Finger-Buttons je Termin. Setzt termine.platz_status live;
   die Eltern sehen den Status oben im Dashboard. Optionaler kurzer Zusatz (z. B.
   "Halle 2" beim Ausweichplatz oder der Grund bei Absage). */
const PLATZ_AMPEL={
  normal:  {emo:"🟢", lbl:"Findet statt", col:"#16a34a"},
  ausweich:{emo:"🟡", lbl:"Ausweichplatz", col:"#d97706"},
  abgesagt:{emo:"🔴", lbl:"Fällt aus",     col:"#dc2626"}
};
function platzAmpelTrainer(t){
  const cur=t.platz_status||null;
  const btns=Object.keys(PLATZ_AMPEL).map(k=>{
    const a=PLATZ_AMPEL[k], on=cur===k;
    return `<button onclick="platzAmpelSet(${Number(t.id)},'${k}')" style="flex:1;min-width:96px;min-height:46px;border:2px solid ${a.col};border-radius:10px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:800;background:${on?a.col:"var(--surface)"};color:${on?"#fff":a.col}">${a.emo} ${a.lbl}</button>`;
  }).join("");
  const zusatz=cur?`<input id="pa-note-${t.id}" value="${esc(t.platz_status_note||"")}" placeholder="${cur==="ausweich"?"Wohin? z. B. Halle 2":cur==="abgesagt"?"Grund (optional)":"Hinweis (optional)"}" onchange="platzAmpelNote(${Number(t.id)},this.value)" style="width:100%;min-height:40px;margin-top:6px;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:12px;background:var(--surface2);color:var(--text);box-sizing:border-box">`:"";
  return `<div style="margin:8px 0;padding:8px;background:var(--surface2);border-radius:10px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text3);margin-bottom:5px">📣 Platz-Status für die Eltern</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${btns}</div>${zusatz}
  </div>`;
}
async function platzAmpelSet(id,status){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),
      body:JSON.stringify({platz_status:status,platz_status_at:new Date().toISOString()})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht setzen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(t){t.platz_status=status;t.platz_status_at=new Date().toISOString();}
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  toast(`Eltern sehen jetzt: ${PLATZ_AMPEL[status].emo} ${PLATZ_AMPEL[status].lbl}`);
  tmLoad();  // Liste neu rendern → aktiver Button + Hinweisfeld
}
async function platzAmpelNote(id,val){
  const note=(val||"").trim()||null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({platz_status_note:note})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(t)t.platz_status_note=note;
  toast("Hinweis gespeichert ✓");
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
  actions+=`<button class="btn btn-sm" onclick="tmEdit(${Number(t.id)})" title="Termin bearbeiten"><i class="ti ti-edit"></i>Bearbeiten</button>`;
  actions+=`<button class="btn btn-sm" onclick="tmIcsOne(${Number(t.id)})" title="In den Kalender"><i class="ti ti-calendar-plus"></i>Kalender</button>`;
  if(t.datum>=new Date().toISOString().slice(0,10)) actions+=`<button class="btn btn-sm" onclick="rsvpOverviewOpen(${Number(t.id)})" title="Wer hat schon geantwortet?"><i class="ti ti-list-check"></i>Rückmeldungen</button>`;
  const zeitStr=t.uhrzeit?String(t.uhrzeit).slice(0,5):((/Uhrzeit:\s*(\d{1,2}:\d{2})/.exec(t.notiz||"")||[])[1]||"");
  const sfBadge=(istSpiel&&t.spielform)?`<span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:${m.col}22;color:${m.col}">${esc(t.spielform)}</span>`:"";
  const notizClean=(t.notiz&&!/^Uhrzeit:/.test(t.notiz))?t.notiz:"";
  // UX 3: Trainer-Erinnerung per WhatsApp – Deep-Link (?portal&rsvp=…) fuehrt Eltern direkt zur
  // Rueckmeldung. Fuellt nur die Nachricht vor; Absenden/Empfaenger waehlt der Trainer selbst.
  let remindBtn="";
  if(t.datum>=new Date().toISOString().slice(0,10)){
    const deepLink=appRoot()+"?portal&rsvp="+t.id;
    const waText=`🦅 SV Adler U9 – bitte kurz rückmelden fürs nächste ${m.label}:\n${t.titel||m.label} am ${datumStr}${zeitStr?" um "+zeitStr+" Uhr":""}${t.ort?" ("+t.ort+")":""}\n👉 Zu-/absagen: ${deepLink}`;
    remindBtn=`<a class="btn btn-sm" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-bell"></i>Erinnerung</a>`;
  }
  return `<div style="background:var(--surface);border:var(--border-s);border-left:3px solid ${m.col};border-radius:var(--rl);padding:10px 12px;margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
      <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px">${m.icon} ${esc(t.titel||m.label)}${sfBadge}</div>
      <div style="font-size:11px;color:var(--text2);white-space:nowrap">${datumStr}${zeitStr?" · "+zeitStr:""}</div>
    </div>
    ${t.ort?`<div style="font-size:11px;color:var(--text2)"><i class="ti ti-map-pin" style="font-size:11px"></i> ${mapsAnchor(t.ort)}</div>`:""}
    ${t.platz?`<div style="font-size:11px;color:var(--text2)">🏟️ Platz: ${esc(t.platz)}</div>`:""}
    ${t.datum>=new Date().toISOString().slice(0,10)?platzAmpelTrainer(t):""}
    <div id="wx-tm-${t.id}"></div>
    ${t.datum>=new Date().toISOString().slice(0,10)?`<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:6px">
      <span style="font-size:10px;color:var(--text3);font-weight:700">Trainer dabei?</span>
      ${(typeof TRAINER!=="undefined"?TRAINER:[]).map(tn=>{const stt=(t.trainer_status||{})[tn];const bg=stt==="ja"?"#16a34a":stt==="nein"?"#dc2626":"var(--surface2)";const col=stt?"#fff":"var(--text2)";const mk=stt==="ja"?" ✓":stt==="nein"?" ✕":"";return `<button onclick="tmTrainerToggle(${Number(t.id)},'${tn.replace(/'/g,"")}')" style="border:var(--border-s);border-radius:12px;padding:2px 8px;font-size:10.5px;font-weight:700;background:${bg};color:${col};cursor:pointer;font-family:inherit">${esc(tn)}${mk}</button>`;}).join("")}
    </div>`:""}
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
  // HOTFIX 3: Löschen räumt via ON DELETE CASCADE automatisch Anwesenheit, Live-Aktionen,
  // Rückmeldungen und Event-Fotos dieses Termins mit weg (Server-seitig). XP-Ledger bleibt.
  if(!confirm("Termin wirklich löschen?\n\nAlle zugehörigen Anwesenheiten, Live-Aktionen, Rückmeldungen und Event-Fotos werden mitgelöscht. (Gesammelte Adler-"+XP_LABEL+" bleiben erhalten.)"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;terminIdCacheClear();tmLoad();}catch(e){toast("Netzwerkfehler","err");}
}
// Kommenden/vergangenen Termin bearbeiten (Datum, Uhrzeit, Gegner/Titel, Ort, Platz, Spielform).
function tmEdit(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t){toast("Termin nicht gefunden","err");return;}
  const isSpiel=(t.typ==="spiel"||t.typ==="turnier"), isTraining=t.typ==="training";
  document.getElementById("tm-edit-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="tm-edit-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Termin bearbeiten");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const fld="width:100%;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const PLATZ=["Käfig","vorne links","vorne rechts","hinten links","hinten rechts","Halle"];
  const platzOpts=`<option value=""${!t.platz?" selected":""}>– kein Platz –</option>`+PLATZ.map(p=>`<option${p===t.platz?" selected":""}>${p}</option>`).join("");
  const sfOpts=["funino","4+1","5+1"].map(s=>`<option${s===t.spielform?" selected":""}>${s}</option>`).join("");
  // Spieldauer war im Bearbeiten-Dialog gar nicht vorhanden: einmal angelegt, nie änderbar.
  const hz=Number(t.halbzeiten)||2, dauer=Number(t.spieldauer_min)||20;
  const hzOpts=[[1,"1 Spielzeit"],[2,"2 Halbzeiten"]].map(([v,l])=>`<option value="${v}"${v===hz?" selected":""}>${l}</option>`).join("");
  const dauerOpts=[8,10,12,15,20,25,30].map(v=>`<option value="${v}"${v===dauer?" selected":""}>${v} Min.</option>`).join("");
  const m=TM_META[t.typ]||{icon:"📅",label:t.typ};
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:440px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:10px">✏️ ${m.icon} Termin bearbeiten</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label style="font-size:11px;color:var(--text2)">Datum<input type="date" id="te-datum" value="${t.datum}" style="${fld}"></label>
      <label style="font-size:11px;color:var(--text2)">Uhrzeit<input type="time" id="te-zeit" value="${t.uhrzeit?String(t.uhrzeit).slice(0,5):''}" style="${fld}"></label>
    </div>
    ${!isTraining?`<label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Gegner / Titel<input id="te-titel" value="${esc(t.titel||'')}" style="${fld}"></label>`:''}
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Ort / Adresse<input id="te-ort" value="${esc(t.ort||'')}" style="${fld}"></label>
    ${isTraining?`<label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Platz<select id="te-platz" style="${fld}">${platzOpts}</select></label>`:''}
    ${isSpiel?`<label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Spielform<select id="te-sf" style="${fld}">${sfOpts}</select></label>`:''}
    ${isSpiel?`<div style="margin-top:8px"><div style="font-size:11px;color:var(--text2);margin-bottom:3px">Spieldauer</div>
      <div style="display:flex;gap:6px">
        <select id="te-hz" style="${fld}">${hzOpts}</select>
        <select id="te-dauer" style="${fld}">${dauerOpts}</select>
      </div></div>`:''}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-p btn-sm" onclick="tmEditSave(${Number(t.id)})"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('tm-edit-modal').remove()">Abbrechen</button>
    </div>`;
  modal.appendChild(c);document.body.appendChild(modal);
}
async function tmEditSave(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id))||{};
  const isSpiel=(t.typ==="spiel"||t.typ==="turnier");
  const g=i=>document.getElementById(i);
  const datum=g("te-datum")?.value;
  if(!datum){toast("Bitte Datum wählen","err");return;}
  const body={datum, uhrzeit:(g("te-zeit")?.value||"")||null, ort:(g("te-ort")?.value||"").trim()||null};
  if(g("te-titel")){const tt=(g("te-titel").value||"").trim()||null; body.titel=tt; body.gegner=isSpiel?tt:null;}
  if(g("te-platz"))body.platz=(g("te-platz").value||"").trim()||null;
  if(g("te-sf"))body.spielform=g("te-sf").value||null;
  if(g("te-dauer"))body.spieldauer_min=parseInt(g("te-dauer").value)||20;
  if(g("te-hz"))body.halbzeiten=parseInt(g("te-hz").value)||2;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok){toast("Termin aktualisiert ✓");terminIdCacheClear();document.getElementById("tm-edit-modal")?.remove();tmLoad();}
    else toast("Speichern fehlgeschlagen","err");
  }catch(e){toast("Netzwerkfehler","err");}
}
// Trainer-Verfügbarkeit am Termin togglen: neutral → dabei (ja) → nicht (nein) → neutral.
async function tmTrainerToggle(id,name){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t)return;
  const st=Object.assign({},t.trainer_status||{});
  st[name]= st[name]==="ja"?"nein":st[name]==="nein"?undefined:"ja";
  if(st[name]===undefined)delete st[name];
  t.trainer_status=st;
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({trainer_status:st})});if(sbCheck401(r))return;}catch(e){}
  tmLoad();
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
      spieltagDatesLoad(datum);toast("Spieltag "+datum);
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
// HOTFIX 9: Team aus einem Ticker-/Match-Key ableiten (Datum__t2 -> " · Adler 2"); Team 1 = leer.
function teamLabelFromKey(key){ const m=/__t(\d+)$/.exec(String(key||"")); return m?` · Adler ${m[1]}`:""; }
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

// Turnier-Modus: mehrere Kurzspiele je Turniertag schnell erfassen (Ergebnis-Log + Bilanz).
// Einsatzzeiten laufen über den Rotations-Timer am selben Datum ohnehin kumulativ weiter.
async function turnierOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("turnier-modal")?.remove();
  const modal=document.createElement("div");modal.id="turnier-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Turnier-Modus");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const p=(spieltagRawDate()||"").split("-"); const ds=p.length===3?`${p[2]}.${p[1]}.${p[0]}`:spieltagRawDate();
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🏆 Turnier-Modus</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">${esc(ds)}${spieltagTeam>1?" · Adler "+spieltagTeam:""} · Kurzspiele erfassen. Einsatzzeiten laufen über den Rotations-Timer weiter.</div>
    <div id="turnier-tally" style="margin-bottom:10px"></div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:4px 0 6px">📅 Spielplan</div>
    <div id="turnier-plan" style="margin-bottom:14px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin:4px 0 6px">⚽ Gespielte Spiele</div>
    <div id="turnier-list" style="margin-bottom:12px"><div style="color:var(--text3);font-size:12px">Lade…</div></div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Spontanes Spiel ohne Plan eintragen:</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <input id="turnier-gegner" type="text" placeholder="Gegner" style="flex:1;min-width:110px;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text)">
      <input id="turnier-tore" type="number" min="0" value="0" title="eigene Tore" style="width:52px;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text);text-align:center">
      <span style="font-weight:800">:</span>
      <input id="turnier-geg" type="number" min="0" value="0" title="Gegentore" style="width:52px;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text);text-align:center">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
      <button class="btn btn-p" onclick="turnierAdd()"><i class="ti ti-plus"></i>Spiel eintragen</button>
      <button class="btn btn-sm" onclick="document.getElementById('turnier-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
  await Promise.all([turnierPlanLoad(),turnierTerminLoad()]);
  turnierRender();
}
async function turnierRender(){
  const list=document.getElementById("turnier-list"), tally=document.getElementById("turnier-tally");
  if(!list)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/turnier_spiele?datum=eq.${encodeURIComponent(spieltagKey())}&select=*&order=created_at.asc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  turnierPlanRender(rows);
  if(!rows.length){list.innerHTML='<div style="color:var(--text3);font-size:12.5px;padding:6px 0">Noch kein Spiel gespielt. 🏆</div>';if(tally)tally.innerHTML="";return;}
  let s=0,u=0,n=0,tf=0,ga=0;
  rows.forEach(x=>{tf+=x.tore;ga+=x.gegentore;if(x.tore>x.gegentore)s++;else if(x.tore===x.gegentore)u++;else n++;});
  if(tally)tally.innerHTML=`<div class="card" style="padding:10px 12px;display:flex;gap:8px;justify-content:space-around;text-align:center">
    <div><div style="font-size:18px;font-weight:800;color:#15803d">${s}</div><div style="font-size:9px;color:var(--text2)">Siege</div></div>
    <div><div style="font-size:18px;font-weight:800;color:#a16207">${u}</div><div style="font-size:9px;color:var(--text2)">Unent.</div></div>
    <div><div style="font-size:18px;font-weight:800;color:#dc2626">${n}</div><div style="font-size:9px;color:var(--text2)">Niederl.</div></div>
    <div><div style="font-size:18px;font-weight:800;color:var(--text)">${tf}:${ga}</div><div style="font-size:9px;color:var(--text2)">Tore</div></div>
  </div>`;
  list.innerHTML=rows.map((x,i)=>{const w=x.tore>x.gegentore?"#15803d":x.tore===x.gegentore?"#a16207":"#dc2626";
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--surface2)">
      <span style="font-size:10px;color:var(--text3);width:18px">${i+1}.</span>
      <span style="flex:1;font-size:13px">${x.gegner?esc(x.gegner):"Gegner "+(i+1)}</span>
      <span style="font-weight:800;color:${w}">${x.tore}:${x.gegentore}</span>
      <button onclick="turnierDelete(${x.id})" title="löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;font-size:13px;padding:2px 4px"><i class="ti ti-trash"></i></button>
    </div>`;}).join("");
}
/* ═══════════════════════════════════
   TURNIERPLAN – Begegnungen VOR dem Turnier erfassen.
   Bisher kannte der Turnier-Modus nur gespielte Spiele (turnier_spiele). Jetzt gibt es
   den Spielplan (turnier_plan): Uhrzeit, Gegner, Feld, Runde. Ergebnisse haengen per
   plan_id daran. Dazu am Termin ein Link zum Online-Turnierbaum und der hochgeladene
   Aushang (Foto/PDF) – der funktioniert auch, wenn am Platz kein Netz ist.
═══════════════════════════════════ */
const TP_EIGENE=/adler|dellbr[üu]ck|u\s?9|wir|heim/i;
/* Auf jedem Aushang stehen Zeilen, die keine Begegnung sind – sonst erfinden wir Gegner.
   Zusammengesetzte Woerter ohne Wortgrenze suchen ("Kaffeepause"), kurze mehrdeutige
   Woerter dagegen MIT Wortgrenze, sonst faellt "SV Endenich" dem "ende" zum Opfer. */
const TP_KEIN_SPIEL=/(kaffee|pause|ehrung|auslosung|einlaufen|aufw[äa]rmen|er[öo]ffnung|begr[üu][ßs]ung|fr[üu]hst[üu]ck|imbiss|freilos|spielfrei|halbzeit|turnierende|turnierbeginn)/i;
const TP_KEIN_SPIEL2=/\b(ende|beginn|abschluss|mittag|start)\b/i;

/* Der Aushang wird kopiert oder abgetippt und sieht nie gleich aus. Deshalb: Uhrzeit,
   Feld und Runde per Muster herausziehen, den Rest als Begegnung deuten und das eigene
   Team herausrechnen. Was keinen Gegner ergibt, wird verworfen statt geraten. */
function turnierPlanParse(text){
  const zeilen=String(text||"").split(/\r?\n/);
  const treffer=[];
  zeilen.forEach(roh=>{
    let z=roh.replace(/\t/g," ").trim();
    if(!z||z.length<3)return;
    if(TP_KEIN_SPIEL.test(z)||TP_KEIN_SPIEL2.test(z))return;   // Pause, Siegerehrung, Freilos …
    const mZeit=z.match(/\b(\d{1,2})[:.](\d{2})\b/);
    const uhrzeit=mZeit?String(mZeit[1]).padStart(2,"0")+":"+mZeit[2]:null;
    if(mZeit)z=z.replace(mZeit[0]," ");
    const mFeld=z.match(/\b(?:Feld|Platz|Court)\s*([0-9A-Za-z]{1,3})\b/i);
    const feld=mFeld?mFeld[0].replace(/\s+/," "):null;
    if(mFeld)z=z.replace(mFeld[0]," ");
    const mRunde=z.match(/\b(Gruppe\s*[A-Z0-9]|Vorrunde|Zwischenrunde|Halbfinale|Viertelfinale|Finale|Spiel\s*um\s*Platz\s*\d+)\b/i);
    const runde=mRunde?mRunde[0]:null;
    if(mRunde)z=z.replace(mRunde[0]," ");
    z=z.replace(/\b\d+\s*[:\-]\s*\d+\b/g," ")            // bereits eingetragene Ergebnisse ignorieren
       .replace(/^\s*\d+[.)]\s*/,"")                      // "1." / "3)" am Zeilenanfang
       .replace(/\s{2,}/g," ").trim();
    let gegner=null;
    const paar=z.split(/\s+(?:-|–|—|vs\.?|gegen|:)\s+/i);
    if(paar.length>=2){
      const fremd=paar.filter(p=>p.trim()&&!TP_EIGENE.test(p));
      gegner=(fremd.length?fremd[0]:paar[1]).trim();
    }else if(z&&!TP_EIGENE.test(z)){
      gegner=z.trim();
    }
    gegner=(gegner||"").replace(/[|;,.\-–—]+$/,"").trim();
    // Ein Gegner braucht Buchstaben. "---" oder "3" sind keine Mannschaft.
    if(!gegner||!/[A-Za-zÄÖÜäöüß]{2,}/.test(gegner))return; // lieber nichts als Unsinn
    treffer.push({uhrzeit,gegner,feld,runde});
  });
  return treffer;
}

let TP_PLAN=[], TP_TERMIN=null;

/* Spielplan + Quellen (Link/Aushang). ergebnisse = turnier_spiele, damit jede geplante
   Begegnung ihr Ergebnis direkt zeigt bzw. ein Eingabefeld anbietet. */
function turnierPlanRender(ergebnisse){
  const box=document.getElementById("turnier-plan");
  if(!box)return;
  const erg={}; (ergebnisse||[]).forEach(x=>{ if(x.plan_id)erg[x.plan_id]=x; });
  const fld="padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";

  // Quellen: Link zum Online-Turnierbaum und hochgeladener Aushang
  let quellen="";
  if(!TP_TERMIN){
    quellen=`<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Für dieses Datum ist kein Termin hinterlegt – Link und Aushang lassen sich erst danach speichern.</div>`;
  }else{
    quellen=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        <input id="tp-url" value="${esc(TP_TERMIN.turnierplan_url||"")}" placeholder="https://… Link zum Turnierbaum" style="flex:1;min-width:160px;${fld}">
        <button class="btn btn-sm" onclick="turnierPlanUrlSave()"><i class="ti ti-device-floppy"></i>Speichern</button>
        ${TP_TERMIN.turnierplan_url?`<a class="btn btn-sm" href="${esc(TP_TERMIN.turnierplan_url)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link"></i>Öffnen</a>`:""}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        <input id="tp-datei" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="flex:1;min-width:150px;font-size:11px">
        <button class="btn btn-sm" onclick="turnierPlanDateiUpload(this)"><i class="ti ti-upload"></i>Aushang hochladen</button>
        ${TP_TERMIN.turnierplan_datei?`<button class="btn btn-sm" onclick="turnierPlanDateiOeffnen()"><i class="ti ti-file-text"></i>Aushang ansehen</button>`:""}
      </div>`;
  }

  let plan;
  if(!TP_PLAN.length){
    plan=`<div style="font-size:12px;color:var(--text3);padding:4px 0">Noch kein Spielplan. Kopiere die Begegnungen von der Turnierseite und füge sie unten ein.</div>`;
  }else{
    plan=TP_PLAN.map(p=>{
      const e=erg[p.id];
      const kopf=`<div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${esc(p.gegner||"?")}</div>
          <div style="font-size:10.5px;color:var(--text2)">${p.uhrzeit?esc(p.uhrzeit)+" Uhr":""}${p.feld?" · "+esc(p.feld):""}${p.runde?" · "+esc(p.runde):""}</div>
        </div>`;
      if(e){
        const w=e.tore>e.gegentore?"#15803d":e.tore===e.gegentore?"#a16207":"#dc2626";
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--surface2)">
          ${kopf}<span style="font-weight:800;color:${w};font-size:15px">${e.tore}:${e.gegentore}</span>
          <button onclick="turnierPlanDelete(${p.id},'${jsq(p.gegner||"")}')" aria-label="Begegnung entfernen" style="min-width:40px;min-height:40px;border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
        </div>`;
      }
      return `<div style="display:flex;align-items:center;gap:6px;padding:8px 0;border-top:1px solid var(--surface2);flex-wrap:wrap">
        ${kopf}
        <input id="tp-tore-${p.id}" type="number" min="0" value="0" style="width:52px;text-align:center;${fld}">
        <span style="font-weight:800">:</span>
        <input id="tp-geg-${p.id}" type="number" min="0" value="0" style="width:52px;text-align:center;${fld}">
        <button class="btn btn-sm btn-p" onclick="turnierPlanErgebnis(${p.id},'${jsq(p.gegner||"")}')">Ergebnis</button>
        <button onclick="turnierPlanDelete(${p.id},'${jsq(p.gegner||"")}')" aria-label="Begegnung entfernen" style="min-width:40px;min-height:40px;border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
      </div>`;
    }).join("");
  }

  box.innerHTML=quellen+plan+
    `<details style="margin-top:10px">
      <summary style="cursor:pointer;font-size:12px;font-weight:600;color:var(--blue)">📋 Spielplan einfügen</summary>
      <div style="font-size:11px;color:var(--text2);margin:6px 0">Begegnungen von der Turnierseite kopieren und hier einfügen. Uhrzeit, Feld und Runde werden erkannt; Pausen und Siegerehrung ignoriert.</div>
      <textarea id="tp-import" rows="4" placeholder="09:00 Feld 1 SV Adler Dellbrück - FC Musterstadt&#10;09:20 Feld 2 TuS Beispiel - SV Adler Dellbrück" style="${fld};width:100%;resize:vertical"></textarea>
      <button class="btn btn-sm" style="margin-top:6px" onclick="turnierPlanImportPreview()"><i class="ti ti-eye"></i>Vorschau</button>
      <div id="tp-import-preview"></div>
    </details>`;
}

async function turnierPlanLoad(){
  TP_PLAN=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/turnier_plan?datum=eq.${encodeURIComponent(spieltagKey())}&select=*&order=sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(r.ok)TP_PLAN=await r.json();
  }catch(e){}
}
async function turnierTerminLoad(){
  TP_TERMIN=null;
  const d=spieltagRawDate(); if(!d)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?datum=eq.${encodeURIComponent(d)}&select=id,turnierplan_url,turnierplan_datei&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok)TP_TERMIN=(await r.json())[0]||null;
  }catch(e){}
}
async function turnierPlanImportPreview(){
  const txt=document.getElementById("tp-import")?.value||"";
  const treffer=turnierPlanParse(txt);
  const box=document.getElementById("tp-import-preview");
  if(!box)return;
  if(!treffer.length){ box.innerHTML='<div style="font-size:11.5px;color:#b45309">Keine Begegnung erkannt. Zeilen brauchen mindestens einen Gegnernamen.</div>'; return; }
  window._tpImport=treffer;
  box.innerHTML=`<div style="font-size:11.5px;color:var(--text2);margin:6px 0">${treffer.length} Begegnung(en) erkannt – bitte prüfen:</div>`
    +treffer.map(t=>`<div style="font-size:12px;padding:3px 0;border-top:1px solid var(--surface2)">${t.uhrzeit||"--:--"} · <b>${esc(t.gegner)}</b>${t.feld?" · "+esc(t.feld):""}${t.runde?" · "+esc(t.runde):""}</div>`).join("")
    +`<button class="btn btn-p btn-sm" style="margin-top:8px" onclick="turnierPlanImportSave()"><i class="ti ti-check"></i>${treffer.length} übernehmen</button>`;
}
async function turnierPlanImportSave(){
  const treffer=window._tpImport||[];
  if(!treffer.length)return;
  const basis=TP_PLAN.length;
  const rows=treffer.map((t,i)=>({datum:spieltagKey(),sort:basis+i,uhrzeit:t.uhrzeit,gegner:t.gegner,feld:t.feld,runde:t.runde}));
  try{
    const r=await fetch(`${SB_URL}/rest/v1/turnier_plan`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(rows)});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Spielplan konnte nicht gespeichert werden"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast(`${rows.length} Begegnungen übernommen ✓`);
  window._tpImport=null;
  const ta=document.getElementById("tp-import"); if(ta)ta.value="";
  await turnierPlanLoad(); turnierRender();
}
async function turnierPlanDelete(id,gegner){
  if(!confirm(`Begegnung gegen ${gegner||"?"} aus dem Spielplan entfernen?`))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/turnier_plan?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  await turnierPlanLoad(); turnierRender();
}
// Ergebnis direkt an der geplanten Begegnung eintragen (haengt per plan_id daran)
async function turnierPlanErgebnis(planId,gegner){
  const t=parseInt(document.getElementById("tp-tore-"+planId)?.value)||0;
  const g=parseInt(document.getElementById("tp-geg-"+planId)?.value)||0;
  const _r=await sbQueuedPost("turnier_spiele",{datum:spieltagKey(),gegner:gegner||null,tore:t,gegentore:g,plan_id:planId},"return=minimal");
  if(_r&&_r.queued)toast("📶 Offline – Ergebnis wird nachgetragen");
  else toast("Ergebnis eingetragen ✓");
  turnierRender();
}
async function turnierPlanUrlSave(){
  if(!TP_TERMIN){toast("Für dieses Datum gibt es keinen Termin","err");return;}
  const url=(document.getElementById("tp-url")?.value||"").trim();
  if(url&&!/^https?:\/\//i.test(url)){toast("Bitte eine vollständige Adresse (https://…)","err");return;}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${TP_TERMIN.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({turnierplan_url:url||null})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  TP_TERMIN.turnierplan_url=url||null;
  toast(url?"Turnierplan-Link gespeichert ✓":"Link entfernt");
  turnierRender();
}
async function turnierPlanDateiUpload(btn){
  if(!TP_TERMIN){toast("Für dieses Datum gibt es keinen Termin","err");return;}
  const input=document.getElementById("tp-datei");
  const file=input&&input.files&&input.files[0];
  if(!file){toast("Bitte eine Datei wählen","err");return;}
  if(file.size>5*1024*1024){toast("Datei zu groß (max. 5 MB)","err");return;}
  const istPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(file.name);
  if(btn)btn.disabled=true;
  try{
    const körper=istPdf?file:await fotoCompress(file,1600); // Foto vom Aushang: lesbar, aber sparsam
    const pfad=`plan/${TP_TERMIN.id}-${Date.now()}.${istPdf?"pdf":"jpg"}`;
    const up=await fetch(`${SB_URL}/storage/v1/object/termin_media/${pfad}`,{method:"POST",
      headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':istPdf?"application/pdf":"image/jpeg"},body:körper});
    if(!up.ok){toast("Upload fehlgeschlagen","err");return;}
    const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${TP_TERMIN.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({turnierplan_datei:pfad})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
    TP_TERMIN.turnierplan_datei=pfad;
    toast("Turnierplan hochgeladen ✓");
    if(input)input.value="";
    turnierRender();
  }catch(e){toast("Datei konnte nicht verarbeitet werden","err");}
  finally{if(btn)btn.disabled=false;}
}
// Der Bucket ist privat: die Datei wird mit dem Token geholt und lokal geöffnet.
async function turnierPlanDateiOeffnen(){
  if(!TP_TERMIN||!TP_TERMIN.turnierplan_datei)return;
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${TP_TERMIN.turnierplan_datei}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok){toast("Datei nicht gefunden","err");return;}
    const url=URL.createObjectURL(await r.blob());
    window.open(url,"_blank","noopener");
  }catch(e){toast("Netzwerkfehler","err");}
}

async function turnierAdd(){
  const g=(document.getElementById("turnier-gegner")?.value||"").trim();
  const tore=parseInt(document.getElementById("turnier-tore")?.value)||0;
  const geg=parseInt(document.getElementById("turnier-geg")?.value)||0;
  const _r=await sbQueuedPost("turnier_spiele",{datum:spieltagKey(),gegner:g||null,tore,gegentore:geg},"return=minimal");
  if(_r&&_r.queued)toast("📶 Offline – Spiel wird nachgetragen");
  ["turnier-gegner"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  ["turnier-tore","turnier-geg"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="0";});
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  turnierRender();
}
async function turnierDelete(id){
  if(!confirm("Dieses Turnier-Spiel wirklich löschen?"))return;
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/turnier_spiele?id=eq.${id}&select=*`,{headers:sbAuthHeaders()});if(r.ok)row=(await r.json())[0];}catch(e){}
  try{await fetch(`${SB_URL}/rest/v1/turnier_spiele?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){}
  turnierRender();
  if(row&&typeof toastUndo==="function")toastUndo("Spiel gelöscht",async()=>{
    try{await fetch(`${SB_URL}/rest/v1/turnier_spiele`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({datum:row.datum,gegner:row.gegner,tore:row.tore,gegentore:row.gegentore})});}catch(e){}
    turnierRender();
  });
}
// Spieltags-Nominierung: wer ist dabei / nicht / verletzt – speist Rotations-Timer + Blitz
let nomStatus={};
// Match-Datum nur aus hinterlegten Spieltagen (termine typ spiel/turnier) wählbar – kein Freitext.
async function spieltagDatesLoad(preferDatum){
  const sel=document.getElementById("spieltag-date"); if(!sel)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?typ=in.(spiel,turnier)&select=datum,gegner,typ&order=datum.asc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  const seen=new Set(), items=[];
  rows.forEach(t=>{if(t.datum&&!seen.has(t.datum)){seen.add(t.datum);items.push(t);}});
  if(!items.length){ sel.innerHTML='<option value="">— kein Spieltag angelegt (unter Orga anlegen) —</option>'; nomLoad(); return; }
  const heute=new Date().toISOString().slice(0,10);
  const def=(preferDatum&&seen.has(preferDatum))?preferDatum:((items.find(t=>t.datum>=heute)||{}).datum||items[items.length-1].datum);
  const fmt=(t)=>{const d=new Date(t.datum+"T00:00:00");const wd=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];const ds=d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});const g=t.typ==="turnier"?"🏆 Turnier":(t.gegner?"vs "+t.gegner:"Spiel");return `${wd} ${ds} · ${g}`;};
  sel.innerHTML=items.map(t=>`<option value="${esc(t.datum)}"${t.datum===def?" selected":""}>${esc(fmt(t))}</option>`).join("");
  nomLoad();
}
function nomInit(){
  spieltagTeam=1; // Tab-Eintritt: Standard-Team
  const seg=document.getElementById("spieltag-team-seg");
  if(seg)seg.querySelectorAll(".seg-btn").forEach(b=>b.classList.toggle("active",b.dataset.val==="1"));
  spieltagDatesLoad(); // Spieltag-Dropdown aus hinterlegten Terminen befüllen (ruft dann nomLoad)
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

/* Return-to-Play-Ampel (Phase 18.2): Kinder, die in den letzten 14 Tagen ein Training
   oder Spiel mit "krank" abgesagt haben und heute wieder dabei sind, werden in der
   Live-Aufstellung mit 🩹 markiert – Signal an den Trainer: heute Belastung dosieren. */
let RECOVERY=new Set();
function istRecovery(n){ return RECOVERY.has(n); }
async function recoveryLoad(){
  RECOVERY=new Set();
  const heute=spieltagRawDate();
  const grenze=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?status=eq.krank&select=spieler_id,termine(datum)`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return;
    (await r.json()).forEach(x=>{
      const d=x.termine&&x.termine.datum;
      if(!d||d<grenze||d>heute)return;           // nur die letzten 14 Tage
      const k=KADER.find(kk=>kk._id===x.spieler_id);
      if(k)RECOVERY.add(k.name);
    });
    // Wer HEUTE krank gemeldet ist, ist nicht "zurück" – der spielt ja gar nicht.
    Object.keys(nomRsvp).forEach(n=>{ if(nomRsvp[n]&&nomRsvp[n].status==="krank")RECOVERY.delete(n); });
  }catch(e){}
}

/* Kapitäns-Tracker (Phase 17.2): jedes Kind soll mal die Binde tragen. Die App führt
   Buch (Zählung über alle Spiele) und meldet den Kapitän live in den Eltern-Ticker.
   Kapitän = match_actions-Zeile aktion='kapitaen'; genau einer je Spiel. */
let matchKapitaen=null, KAP_COUNT={};
async function kapitaenLoad(){
  matchKapitaen=null; KAP_COUNT={};
  const datum=spieltagKey();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/match_actions?aktion=eq.kapitaen&select=spieler,datum&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(sbCheck401(r)||!r.ok)return;
    (await r.json()).forEach(x=>{
      KAP_COUNT[x.spieler]=(KAP_COUNT[x.spieler]||0)+1;
      if(x.datum===datum&&!matchKapitaen)matchKapitaen=x.spieler; // jüngster für dieses Spiel
    });
  }catch(e){}
}
async function kapitaenSet(name){
  if(!name)return;
  const datum=spieltagKey();
  // genau ein Kapitän je Spiel: alten Eintrag dieses Datums entfernen
  try{ await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&aktion=eq.kapitaen`,{method:"DELETE",headers:sbAuthHeaders()}); }catch(e){}
  if(KAP_COUNT[matchKapitaen])KAP_COUNT[matchKapitaen]--; // Zähler des alten zurück
  matchKapitaen=name;
  KAP_COUNT[name]=(KAP_COUNT[name]||0)+1;
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  terminIdForDatum(datum).then(tid=>sbQueuedPost("match_actions",{datum,spieler:name,aktion:"kapitaen",termin_id:tid}));
  tickerPush(name,"kapitaen");   // Highlight für die Eltern
  toast(`©️ ${name} ist heute Kapitän`);
  rotRenderLive();
}
// Kapitäns-Zeile für die Live-Ansicht: aktueller Kapitän + faire Auswahl mit Zählung.
function kapitaenRow(){
  // fairste Wahl zuerst: aufsteigend nach bisheriger Kapitäns-Zahl
  const squad=[...rotField,...rotBench,...(rotTW?[rotTW]:[])].sort((a,b)=>(KAP_COUNT[a]||0)-(KAP_COUNT[b]||0));
  if(matchKapitaen){
    const n=KAP_COUNT[matchKapitaen]||1;
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:var(--r);font-size:12.5px;color:#3730a3;margin-bottom:10px">
      ©️ <strong>Kapitän: ${esc(matchKapitaen)}</strong><span style="font-size:10px;color:#6366f1">${n}. Mal</span>
      <select onchange="if(this.value)kapitaenSet(this.value)" style="margin-left:auto;padding:6px 8px;border:var(--border-s);border-radius:var(--r);font-family:inherit;font-size:12px;background:var(--surface)">
        <option value="">wechseln…</option>${squad.filter(n=>n!==matchKapitaen).map(kapitaenOpt).join("")}
      </select></div>`;
  }
  return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f5f3ff;border:1px dashed #c7d2fe;border-radius:var(--r);font-size:12.5px;color:#4338ca;margin-bottom:10px">
    ©️ <strong>Kapitän heute:</strong>
    <select onchange="if(this.value)kapitaenSet(this.value)" style="flex:1;padding:6px 8px;border:var(--border-s);border-radius:var(--r);font-family:inherit;font-size:12px;background:var(--surface)">
      <option value="">— wählen (fair: wer noch nie dran war) —</option>${squad.map(kapitaenOpt).join("")}
    </select></div>`;
}
function kapitaenOpt(n){
  const c=KAP_COUNT[n]||0;
  const label=c===0?"noch nie ⭐":c+"×";
  return `<option value="${esc(n)}">${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)} · ${label}</option>`;
}
async function nomLoad(){
  const datum=spieltagKey();
  nomStatus={}; nomOvr=new Set();
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?datum=eq.${encodeURIComponent(datum)}&select=data`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){const rows=await r.json();if(rows.length&&rows[0].data){const d={...rows[0].data};if(Array.isArray(d._ovr))nomOvr=new Set(d._ovr);delete d._ovr;nomStatus=d;}}
  }catch(e){}
  // HOTFIX 14: strikte Trennung Orga/Match – KEIN pauschales "dabei" mehr. Nur explizit
  // Gesetzte (gespeichert / Eltern-Zusage / Trainer-Override) sind dabei; der Rest bleibt "offen".
  KADER.forEach(k=>{if(!nomStatus[k.name])nomStatus[k.name]="offen";});
  await nomLoadRsvp();
  await recoveryLoad();   // Return-to-Play: kürzlich krank gemeldete Kinder markieren
  await kapitaenLoad();   // Kapitän dieses Spiels + Fairness-Zählung
  // Eltern-Zusagen automatisch übernehmen – außer wo der Trainer manuell überstimmt hat (nomOvr).
  Object.keys(nomRsvp).forEach(name=>{ if(!nomOvr.has(name)) nomStatus[name]=nomRsvp[name].status==="zugesagt"?"dabei":"nicht"; });
  const nr=document.getElementById("nom-team-nr"); if(nr)nr.textContent=String(spieltagTeam);
  nomRender();
  await teamsLoad();   // Einteilung gehört zum Datum, nicht zum einzelnen Team
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
      const cur=nomStatus[k.name]||"offen";
      const rv=nomRsvp[k.name];
      const badge=rv?`<span title="Eltern-Rückmeldung: ${esc(rv.status)}${rv.kommentar?' – '+esc(rv.kommentar):''}" style="font-size:13px;width:16px;text-align:center">${rvEmo[rv.status]||""}</span>`:'<span style="width:16px"></span>';
      return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
        ${badge}
        <span style="flex:1;font-size:12.5px">${getKader(k.name)?.nr?getKader(k.name).nr+" ":""}${esc(k.name)}</span>
        ${["dabei","nicht","verletzt"].map(s=>`<button onclick="nomSet('${k.name}','${s}')" style="min-height:44px;padding:5px 9px;font-size:11px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${cur===s?stCfg[s].col:"var(--surface)"};color:${cur===s?"#fff":"var(--text2)"}">${stCfg[s].lbl}</button>`).join("")}
      </div>`;
    }).join("");
}
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
  bar.innerHTML=`${radioBtn}<button class="btn btn-sm" onclick="reportGenerate(true)"><i class="ti ti-refresh"></i>Neu würfeln</button>
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
        <a href="${appRoot()}?heft" style="text-align:center;background:#fff;border:1.5px solid #1e3a8a;color:#1e3a8a;padding:13px 8px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px">📰 Adler Horst</a>
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
  const root=document.createElement("div");
  root.style.cssText="max-width:440px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML=elternLoader("Liveticker wird geladen …");
  let adlerkasseHtml=""; // FEAT Z: Spenden-Button, einmal geladen (draw() laeuft alle 15s)
  async function loadClock(){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/matchday?datum=eq.${encodeURIComponent(key)}&select=gegner,half,clock_status,started_at,paused_ms,ticker_open,spieldauer_min,halbzeiten`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
      const rows=r.ok?await r.json():[];
      tickerViewClock=rows[0]||null;
    }catch(e){}
  }
  function minuteNow(){
    if(!tickerViewClock)return "";
    return mcMinuteLabel({half:tickerViewClock.half,clock_status:tickerViewClock.clock_status,started_at:tickerViewClock.started_at,paused_ms:tickerViewClock.paused_ms},tickerViewClock.spieldauer_min||20,tickerViewClock.halbzeiten||2);
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
        <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-top:6px">📣 Liveticker U9${teamLabelFromKey(key)}${gegner}</div>
        <div style="font-size:13px;color:#64748b"><span id="tv-minute">${elternEsc(minuteNow())}</span></div>
      </div>
      ${wolffFuss
        ? '<div style="text-align:center;font-size:12.5px;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">🤫 Trainer fokussieren sich zu 100% auf die Kids – kein Ticker heute.</div>'
        : `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px">
            ${events.length?events.map(e=>`<div style="display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px"><span style="font-size:16px;flex:0 0 auto">${elTickerIcon(e.typ)}</span><span><strong style="color:#1e3a8a">${e.minute?elternEsc(e.minute):""}</strong> ${elternEsc(e.text)}</span></div>`).join(""):'<div style="font-size:12.5px;color:#94a3b8">Noch keine Ereignisse. Der Ticker startet mit dem Anpfiff – bleib dran!</div>'}
          </div>`}
      ${adlerkasseHtml}
      <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:14px">Nur-Ansehen · aktualisiert automatisch · SV Adler Dellbrück e.V.</div>`;
  }
  await loadClock();
  adlerkasseHtml=adlerkasseCardHtml(await adlerkasseLinkGet()); // FEAT Z
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
    <span style="font-size:7px;color:#bbf7d0">${fmtSec(rotFieldSec[n]||0)}</span></button>`;};
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
  // HOTFIX 12: jeder Chip zeigt seine Zeit – grün = Spielzeit (Feld), rot = Bankzeit
  const chip=(n,onField)=>{
    const sek=onField?(rotFieldSec[n]||0):(rotBenchSec[n]||0);
    const tcol=onField?"#15803d":"#dc2626";
    const reco=istRecovery(n);
    const rand=reco?"2px solid #f97316":"var(--border-s)"; // orangener Rand: kürzlich krank
    return `<button onclick="rotMove('${n.replace(/'/g,"")}')" title="${reco?'Kürzlich krank – heute Belastung dosieren':''}" style="font-size:12.5px;padding:8px 10px;min-height:44px;border:${rand};border-radius:16px;background:${onField?"var(--blue-bg)":"var(--surface2)"};cursor:pointer;font-family:inherit">${reco?"🩹 ":""}${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)} <span style="color:${tcol};font-size:10px;font-weight:700">${fmtSec(sek)}</span></button>`;
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
    <div style="text-align:center;font-size:30px;font-weight:800;color:${rest<=10?"#dc2626":"var(--text)"};margin-bottom:8px">${fmtSec(Math.max(0,rest))}</div>
    ${twRow}
    ${kapitaenRow()}
    ${recoHinweis}
    ${sugg}
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
function rotTick(){
  rotElapsed++;
  rotBench.forEach(n=>{rotBenchSec[n]=(rotBenchSec[n]||0)+1;});
  rotField.forEach(n=>{rotFieldSec[n]=(rotFieldSec[n]||0)+1;}); // HOTFIX 12: Spielzeit der Feldspieler
  if(rotTW)rotFieldSec[rotTW]=(rotFieldSec[rotTW]||0)+1; // Torwart spielt auch (feste Position)
  if(rotElapsed>=rotIntervalMin*60){
    rotElapsed=0;rotBeep();try{navigator.vibrate&&navigator.vibrate([100,60,100]);}catch(e){}
  }
  if((++rotPersistCtr%30)===0)rotPersistTimes(); // Faire Einsatzzeiten: alle 30s sichern
  rotRenderLive();
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
// HOTFIX 4: waehlbare Quest-Aktionen (qkey) im CRUD-Editor
const QUEST_KEYS=[
  {key:"pass",label:"Pässe"},{key:"dribbling",label:"Dribblings"},{key:"gewinn",label:"Ballgewinne"},
  {key:"parade",label:"Paraden (TW)"},{key:"tor",label:"Tore"},{key:"aufbau",label:"Spielaufbau"},{key:"heraus",label:"Herausspielen"}
];
async function loadTeamConfig(){
  // Belohnung + Booster bleiben in team_config; Quests kommen aus der team_quests-Tabelle
  try{
    const r=await fetch(`${SB_URL}/rest/v1/team_config?id=eq.1&select=belohnung,double_xp_until`,{headers:sbAuthHeaders()});
    if(r.ok){const c=(await r.json())[0]; if(c){teamBelohnung=c.belohnung||""; teamDoubleXpUntil=c.double_xp_until||null;}}
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
    <label style="font-size:11px;color:var(--text2)">🎁 Nächste Belohnung für die Kids</label>
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
  if(btn)btn.disabled=true;
  try{
    // HOTFIX 4: Quests -> team_quests (replace-all), Belohnung bleibt in team_config
    const del=await fetch(`${SB_URL}/rest/v1/team_quests?team=eq.adler1`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(del))return;
    if(clean.length){
      const ins=await fetch(`${SB_URL}/rest/v1/team_quests`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(clean.map((q,i)=>({team:'adler1',qkey:q.key,icon:q.icon,label:q.label,target:q.target,aktiv:true,sort:i})))});
      if(!ins.ok){toast("Speichern fehlgeschlagen","err");return;}
    }
    await fetch(`${SB_URL}/rest/v1/team_config?on_conflict=id`,{method:"POST",headers:sbAuthHeaders({'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify({id:1,belohnung:teamBelohnung,updated_at:new Date().toISOString()})});
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  teamQuests=clean.map(q=>({...q}));
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
let atLiveClockId=null;
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
  clearInterval(atLiveClockId);
  atLiveClockId=setInterval(()=>{const el=document.getElementById("at-live-min");if(el&&typeof mcState!=="undefined"&&mcState)el.textContent=mcMinuteLabel(mcState,typeof mcSpieldauer!=="undefined"?mcSpieldauer:20,typeof mcHalbzeiten!=="undefined"?mcHalbzeiten:2);},1000);
}
function atLiveClose(){ clearInterval(atLiveClockId); document.getElementById("at-live")?.remove(); atLiveAction=null; if(document.getElementById("action-panel"))atRender(); }
function atLiveRender(){
  const m=document.getElementById("at-live"); if(!m)return;
  const counts=questCountsLive();
  const done=teamQuests.filter(q=>(counts[q.key]||0)>=q.target).length;
  const top=`<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#1e293b">
    <div style="flex:1;font-size:13px;font-weight:800">⚡ Live-Aktion${atLiveAction?"":" · Aktion wählen"}</div>
    <div title="Ergebnis (Tore:Gegentore)" style="font-size:17px;font-weight:900;padding:3px 12px;background:rgba(255,255,255,.14);border-radius:10px">${atTore()}:${atGegentore}</div>
    <div style="font-size:11px;color:#94a3b8">🏆 ${done}/${teamQuests.length}</div>
    <button onclick="atLiveClose()" aria-label="Schließen" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer">×</button></div>`;
  // Fokus-Modus: Uhr (live) + Wechsel-Vorschlag direkt im Vollbild
  const minute=(typeof mcState!=="undefined"&&mcState)?mcMinuteLabel(mcState,typeof mcSpieldauer!=="undefined"?mcSpieldauer:20,typeof mcHalbzeiten!=="undefined"?mcHalbzeiten:2):"";
  let subHint="";
  if(typeof rotBench!=="undefined"&&rotBench&&rotBench.length&&rotField&&rotField.length){
    const benchTop=[...rotBench].sort((a,b)=>(rotBenchSec[b]||0)-(rotBenchSec[a]||0))[0];
    const fieldTired=[...rotField].sort((a,b)=>(rotBenchSec[a]||0)-(rotBenchSec[b]||0))[0];
    if(benchTop&&fieldTired)subHint=`🔁 ${esc(benchTop)} → ${esc(fieldTired)}`;
  }
  const info=(minute||subHint)?`<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:#172033;font-size:12.5px;border-top:1px solid rgba(255,255,255,.06)">
    <span style="font-weight:800">⏱ <span id="at-live-min">${esc(minute)}</span></span>
    ${subHint?`<span style="color:#fbbf24;font-weight:700;margin-left:auto">${subHint}</span>`:""}
  </div>`:'<span id="at-live-min" style="display:none"></span>';
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
  m.innerHTML=top+info+body;
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
  const tid=await terminIdForDatum(datum); // HOTFIX 3-FE: FK-Kopplung für ON DELETE CASCADE
  const res=await sbQueuedPost("match_actions",{datum,spieler:atSel,aktion,termin_id:tid},"return=representation"); // offline -> Queue
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
  if(!confirm("Blitz-Bewertung wirklich löschen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/blitz_ratings?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  blitzLoadSaved();
  toast("Blitz-Bewertung gelöscht");
}
function blitzRenderCard(){
  const card=document.getElementById("blitz-card");
  if(!card)return;
  if(blitzIdx>=blitzPlayers.length){
    card.innerHTML=`<div class="card" style="text-align:center;padding:22px 16px">
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
  card.innerHTML=`<div class="card" style="padding:16px">
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
      <div class="card" style="padding:10px 12px;margin-bottom:8px${n.pinned?";border-left:3px solid var(--blue)":""}">
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
    const d=evalDates[0];const entries=(EVAL_DATA[d]||[]).filter(e=>!e.skipped); // Übersprungene zählen nicht mit
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
  const tile=(title,body)=>`<div class="card" style="padding:10px 12px"><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:4px">${title}</div>${body}</div>`;
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
      ${t.formation==="KI-Übung"
        ?`<button class="btn btn-sm" onclick="ttViewKi(${t.id})"><i class="ti ti-eye"></i>Ansehen</button>`
        :`<button class="btn btn-p btn-sm" onclick="ttLoad(${t.id})">Laden</button>`}
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
// HOTFIX 18: In-App-Ausrüstungs-Manager statt CSV. Grid-View mit Trikot-/Schuhgrößen
// aller Spieler (Daten weiter aus der security-definer-RPC ausruestung_export).
async function ausruestungGrid(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("ausr-modal")?.remove();
  const m=document.createElement("div");m.id="ausr-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:800;font-size:16px">👕 Team-Ausrüstung</div>
      <button onclick="document.getElementById('ausr-modal').remove()" style="border:none;background:none;font-size:22px;color:var(--text2);cursor:pointer">×</button>
    </div>
    <div id="ausr-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  ausruestungGridRender();
}
async function ausruestungGridRender(){
  const body=document.getElementById("ausr-body"); if(!body)return;
  let rows=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/ausruestung_export`,{method:"POST",headers:sbAuthHeaders(),body:"{}"});
    if(sbCheck401(r))return;
    if(r.ok)rows=(await r.json())||[];
  }catch(e){}
  if(!rows.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Keine Kaderdaten gefunden.</div>';return;}
  const mitGroesse=rows.filter(r=>r.trikot_groesse||r.schuh_groesse).length;
  const cell=v=>v?esc(v):'<span style="color:var(--text3)">–</span>';
  body.innerHTML=`<div style="font-size:11px;color:var(--text3);margin-bottom:8px">${mitGroesse}/${rows.length} mit Größe · Eltern pflegen die Werte im Portal (Fan-Fakten &amp; Foto).</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="text-align:left;color:var(--text2);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">
          <th style="padding:6px 8px">Nr</th><th style="padding:6px 8px">Name</th><th style="padding:6px 8px">👕 Trikot</th><th style="padding:6px 8px">👟 Schuh</th>
        </tr></thead>
        <tbody>${rows.map((r,i)=>`<tr style="border-top:1px solid var(--surface2);background:${i%2?'var(--surface2)':'transparent'}">
          <td style="padding:7px 8px;color:var(--text3)">${r.nr!=null?esc(r.nr):"–"}</td>
          <td style="padding:7px 8px;font-weight:600">${esc(r.name)}</td>
          <td style="padding:7px 8px">${cell(r.trikot_groesse)}</td>
          <td style="padding:7px 8px">${cell(r.schuh_groesse)}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
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

/* ═══════════════════════════════════
   ADLER-KASSE (Welle 2, FEAT Z-light) – dauerhafter Spenden-Button.
   Link kommt aus der Minimal-RPC adlerkasse_link (anon + auth callable).
   NUR statischer Redirect zu PayPal – die App fasst KEIN Geld an, kein
   Login noetig. Button erscheint nur, wenn ein echter http(s)-Link gesetzt ist.
═══════════════════════════════════ */
async function adlerkasseLinkGet(){
  try{
    const h=sbToken()?sbAuthHeaders():{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'};
    const r=await fetch(`${SB_URL}/rest/v1/rpc/adlerkasse_link`,{method:"POST",headers:h,body:"{}"});
    if(!r.ok)return null;
    const v=await r.json();
    const s=(v==null?"":String(v)).trim();
    return s||null;
  }catch(e){return null;}
}
function adlerkasseCardHtml(link){
  if(!link||!/^https?:\/\//i.test(link))return ""; // nur echte http(s)-Links (kein javascript: o.ä.)
  return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-top:12px;text-align:center">
    <div style="font-size:15px;font-weight:800;color:#1e3a8a">🦅 Adler-Kasse</div>
    <div style="font-size:12px;color:#64748b;margin:4px 0 10px">Danke, dass du unsere Jungs anfeuerst! Jeder Euro fließt direkt in die Mannschaft – fürs Eis nach dem Sieg 🍦, den Ausflug, die nächste Belohnung.</div>
    <a href="${esc(link)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0070ba;color:#fff;border-radius:10px;padding:11px 22px;font-weight:800;font-size:14px;text-decoration:none">☕ Kleinigkeit spenden</a>
    <div style="font-size:9.5px;color:#cbd5e1;margin-top:8px">Zahlung läuft extern über PayPal. Die App fasst kein Geld an.</div>
  </div>`;
}

/* Fairplay-Codex (Phase 18.3): statisches Vollbild-Overlay mit den goldenen Regeln
   für den Spielfeldrand. Kontrastreich (draußen lesbar), kein Backend, kein DSGVO-Thema. */
const FAIRPLAY_REGELN=[
  {emo:"👏", t:"Anfeuern statt anweisen", d:"Coachen ist Trainer-Sache. Ihr feuert an – das gibt den Kindern Rückenwind, ohne sie zu verwirren."},
  {emo:"🎉", t:"Jedes Kind bejubeln", d:"Ein gutes Dribbling ist ein gutes Dribbling – egal, welches Trikot. Auch die Gegner sind Kinder."},
  {emo:"🙌", t:"Fehler gehören dazu", d:"Ein Fehlpass ist kein Drama. Mut machen statt meckern – so trauen sich die Kinder etwas."},
  {emo:"⚖️", t:"Der Schiri hat immer recht", d:"Auch wenn er mal irrt. Respekt vor der Entscheidung – die Kinder schauen sich genau ab, wie wir reagieren."},
  {emo:"🤝", t:"Ergebnis ist Nebensache", d:"Bei der U9 zählt Spaß, Bewegung und Dazulernen. Die Tabelle merkt sich in fünf Jahren keiner – das Gefühl schon."},
  {emo:"🚗", t:"Wir sind ein Team – auch abseits", d:"Pünktlich sein, Fahrgemeinschaften teilen, mit anpacken. Was wir vorleben, lernen die Kinder."}
];
/* Adler-Börse (Phase 23.1): interner Flohmarkt. Preise sind Freitext ("Zu verschenken").
   Fotos im vorhandenen fundbuero-Bucket (privat, nur Angemeldete), Prefix "boerse/". */
async function boerseOpen(){
  document.getElementById("boerse-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="boerse-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Adler-Börse");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="boerse-card";
  c.style.cssText="background:var(--surface,#fff);color:var(--text,#0f172a);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  modal.appendChild(c);document.body.appendChild(modal);
  await boerseRender();
}
async function boerseRender(){
  const c=document.getElementById("boerse-card"); if(!c)return;
  const meineId=(typeof sbUserId==="function")?sbUserId():null;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/boerse_listings?select=*&order=created_at.desc`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)rows=await r.json();}catch(e){}
  const fld="padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-family:inherit;font-size:13px;box-sizing:border-box;background:#fff;color:#0f172a";
  const liste=rows.map(x=>{
    const meins=x.created_by===meineId;
    const reserviert=!!x.reserviert_von;
    const vonMir=x.reserviert_von===meineId;
    let aktion;
    if(meins)aktion=`<button onclick="boerseDelete(${x.id})" style="min-height:40px;padding:6px 12px;border:1.5px solid #fca5a5;border-radius:10px;background:#fef2f2;color:#dc2626;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Entfernen</button>`;
    else if(vonMir)aktion=`<button onclick="boerseFreigeben(${x.id})" style="min-height:40px;padding:6px 12px;border:1.5px solid #94a3b8;border-radius:10px;background:#f8fafc;color:#475569;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">✓ von dir – freigeben</button>`;
    else if(reserviert)aktion=`<span style="font-size:12px;color:#b45309;font-weight:700">reserviert</span>`;
    else aktion=`<button onclick="boerseReservieren(${x.id})" style="min-height:40px;padding:6px 14px;border:none;border-radius:10px;background:#059669;color:#fff;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">Nehme ich</button>`;
    return `<div style="display:flex;gap:10px;padding:10px 0;border-top:1px solid #f1f5f9">
      ${x.foto_path?`<img id="bo-img-${x.id}" alt="" style="width:56px;height:56px;flex:none;border-radius:10px;object-fit:cover;background:#f1f5f9">`:`<div style="width:56px;height:56px;flex:none;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:24px">🛍️</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:13.5px;font-weight:700">${esc(x.titel)}</div>
        <div style="font-size:11.5px;color:#64748b">${x.groesse?"Gr. "+esc(x.groesse)+" · ":""}${esc(x.preis||"")}</div>
        <div style="margin-top:6px">${aktion}</div>
      </div>
    </div>`;
  }).join("");
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🛍️ Adler-Börse</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:12px">Zu klein geworden? Hier findet es ein neues Adler-Kind. Preis frei (z. B. „Zu verschenken").</div>
    ${liste||'<div style="font-size:12px;color:#94a3b8;padding:6px 0">Noch nichts drin. Stell das Erste ein!</div>'}
    <div style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:12px">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:6px">Etwas anbieten</div>
      <input id="bo-titel" placeholder="Was? z. B. Fußballschuhe blau" style="width:100%;margin-bottom:6px;${fld}">
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <input id="bo-groesse" placeholder="Größe" style="flex:1;${fld}">
        <input id="bo-preis" placeholder="Preis / „Zu verschenken“" style="flex:2;${fld}">
      </div>
      <input id="bo-foto" type="file" accept="image/jpeg,image/png,image/webp" style="width:100%;margin-bottom:8px;font-size:11px">
      <div style="display:flex;gap:8px">
        <button onclick="boerseAdd(this)" style="min-height:44px;padding:0 14px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Einstellen</button>
        <button onclick="document.getElementById('boerse-modal').remove()" style="margin-left:auto;min-height:44px;padding:0 14px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#475569;font-family:inherit;font-size:13px;cursor:pointer">Schließen</button>
      </div>
    </div>`;
  rows.forEach(x=>{ if(x.foto_path)boerseFoto(x.id,x.foto_path); });
}
async function boerseFoto(id,path){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/fundbuero/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return;
    const img=document.getElementById("bo-img-"+id);
    if(img)img.src=URL.createObjectURL(await r.blob());
  }catch(e){}
}
async function boerseAdd(btn){
  const titel=(document.getElementById("bo-titel")?.value||"").trim();
  if(!titel){toast("Bitte kurz beschreiben, was du anbietest","err");return;}
  const groesse=(document.getElementById("bo-groesse")?.value||"").trim()||null;
  const preis=(document.getElementById("bo-preis")?.value||"").trim()||null;
  const input=document.getElementById("bo-foto");
  const file=input&&input.files&&input.files[0];
  if(btn)btn.disabled=true;
  try{
    let path=null;
    if(file){
      const blob=await fotoCompress(file,800);
      path="boerse/"+((window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now()))+".jpg";
      const up=await fetch(`${SB_URL}/storage/v1/object/fundbuero/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
      if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    }
    const r=await fetch(`${SB_URL}/rest/v1/boerse_listings`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({titel,groesse,preis,foto_path:path})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht einstellen"),"err");return;}
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Eingestellt ✓");
  boerseRender();
}
async function boerseReservieren(id){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/boerse_reservieren`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_frei:false})});
    if(sbCheck401(r))return;
    const d=await r.json().catch(()=>({}));
    if(d&&d.ok&&d.von_mir)toast("Für euch reserviert ✓ Beim nächsten Training abholen.");
    else if(d&&d.ok)toast("Schon vergeben – jemand war schneller.","err");
  }catch(e){toast("Netzwerkfehler","err");}
  boerseRender();
}
async function boerseFreigeben(id){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/boerse_reservieren`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_frei:true})});
    if(sbCheck401(r))return;
  }catch(e){}
  boerseRender();
}
async function boerseDelete(id){
  if(!confirm("Dieses Angebot entfernen?"))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/boerse_listings?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht entfernen"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  boerseRender();
}

/* Skill der Woche (Phase 22.2): Trainer setzt eine Heim-Challenge mit Video-Link. */
async function skillWocheOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("skw-modal")?.remove();
  let cur=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)cur=(await r.json())[0]||null;}catch(e){}
  const modal=document.createElement("div");
  modal.id="skw-modal";modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const fld="width:100%;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  const c=document.createElement("div");
  c.style.cssText="background:var(--surface);color:var(--text);max-width:440px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🎬 Skill der Woche</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Kurze Heim-Challenge mit Video-Link. Schafft es das Kind, geben die Eltern 50 Federn frei.</div>
    ${cur?`<div style="font-size:11px;color:var(--text2);background:var(--surface2);border-radius:8px;padding:8px 10px;margin-bottom:10px">Aktuell: <b>${esc(cur.titel)}</b></div>`:""}
    <label style="font-size:11px;color:var(--text2)">Titel<input id="skw-titel" value="${esc(cur?.titel||"")}" placeholder="z. B. 10× Ball hochhalten" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Video-Link (YouTube o. ä.)<input id="skw-url" value="${esc(cur?.video_url||"")}" placeholder="https://…" style="${fld}"></label>
    <label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">Beschreibung (optional)<textarea id="skw-besch" rows="2" style="${fld};resize:vertical">${esc(cur?.beschreibung||"")}</textarea></label>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-p btn-sm" onclick="skillWocheSave(this)"><i class="ti ti-device-floppy"></i>Als aktuelle Challenge setzen</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('skw-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(c);document.body.appendChild(modal);
}
async function skillWocheSave(btn){
  const titel=(document.getElementById("skw-titel")?.value||"").trim();
  if(!titel){toast("Bitte einen Titel","err");return;}
  const url=(document.getElementById("skw-url")?.value||"").trim();
  if(url&&!/^https?:\/\//i.test(url)){toast("Bitte einen vollständigen Link (https://…)","err");return;}
  const besch=(document.getElementById("skw-besch")?.value||"").trim()||null;
  if(btn)btn.disabled=true;
  try{
    // alte deaktivieren, neue als aktiv einfügen (Historie bleibt, neue Challenge = neue Federn)
    await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({aktiv:false})});
    const r=await fetch(`${SB_URL}/rest/v1/skill_woche`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({titel,video_url:url||null,beschreibung:besch,aktiv:true})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Skill der Woche gesetzt ✓");
  document.getElementById("skw-modal")?.remove();
}

/* Skill der Woche bei den Eltern: aktive Challenge + "Geschafft" (50 Federn fürs Kind). */
async function elternSkillLoad(kids){
  const slot=document.getElementById("skill-slot"); if(!slot)return;
  let sk=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/skill_woche?aktiv=eq.true&select=*&order=created_at.desc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)sk=(await r.json())[0]||null;}catch(e){}
  if(!sk){ slot.innerHTML=""; return; }
  const kidBtns=(kids||[]).map(k=>`<button onclick="skillGeschafft(${sk.id},${k.spieler_id},'${jsq((k.kader&&k.kader.name)||"")}')" style="flex:1;min-width:130px;min-height:44px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#6d28d9;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🎉 ${esc((k.kader&&k.kader.name)||"Kind")} hat's geschafft</button>`).join("");
  slot.innerHTML=`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
    <div style="font-weight:700;margin-bottom:2px">🎬 Skill der Woche</div>
    <div style="font-size:14px;font-weight:700;color:#6d28d9;margin:2px 0">${esc(sk.titel)}</div>
    ${sk.beschreibung?`<div style="font-size:12.5px;color:#475569;margin-bottom:8px">${esc(sk.beschreibung)}</div>`:""}
    ${sk.video_url?`<a href="${esc(sk.video_url)}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:11px;border:1.5px solid #7c3aed;border-radius:10px;background:#faf5ff;color:#6d28d9;font-weight:700;font-size:13px;text-decoration:none;margin-bottom:8px">▶️ Video ansehen</a>`:""}
    <div style="font-size:11px;color:#64748b;margin-bottom:8px">Zuhause geübt und geschafft? Dann Federn freigeben:</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${kidBtns}</div>
  </div>`;
}
async function skillGeschafft(skillId,spielerId,name){
  if(!confirm(`${name||"Dein Kind"} hat den Skill geschafft?\n\nEs gibt 50 Federn fürs Kind.`))return;
  let neu=0;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_quelle:'skillwoche',p_quelle_id:String(skillId)})});
    if(r.ok){const d=await r.json(); if(d>0)neu=d;}
    else if(r.status===403){toast("Nur fürs eigene Kind","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast(neu>0?`Stark! 🪶 +${neu} Federn fürs Kind`:"Diesen Skill hattet ihr schon – gut geübt! 💪");
}

/* Trikot-Wäsche-Rotator (Phase 21.1) bei den Eltern: wer wäscht als Nächstes?
   Meldet sich eine Familie, bekommt das Kind 100 Federn. Anstupsen, wenn die eigene
   Familie lange nicht dran war. Bezahlung/Wäsche läuft real – die App trackt nur.
   AKTUELL AUSGEBLENDET: alle Eltern waschen die Trikots selbst. Zum Reaktivieren
   einfach WAESCHE_AKTIV auf true setzen – Slot, Loader und Federn kommen zurück. */
const WAESCHE_AKTIV=false;
async function elternWaescheLoad(kids){
  const slot=document.getElementById("waesche-slot"); if(!slot)return;
  let log=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/waesche_log?select=datum,spieler_id,kader(name)&order=datum.desc,id.desc&limit=8`,{headers:sbAuthHeaders()});
    if(r.ok)log=await r.json();
  }catch(e){}
  const meineIds=(kids||[]).map(k=>k.spieler_id);
  // Wann war die eigene Familie zuletzt dran?
  const meinLetzter=log.find(x=>meineIds.includes(x.spieler_id));
  const tageHer=meinLetzter?Math.floor((Date.now()-new Date(meinLetzter.datum).getTime())/864e5):null;
  const langeNichtDran=tageHer===null||tageHer>49; // ~7 Wochen oder noch nie
  const fmt=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  const verlauf=log.length
    ? log.slice(0,5).map(x=>`<div style="display:flex;gap:6px;font-size:12px;padding:3px 0;border-top:1px solid #f1f5f9"><span style="color:#94a3b8;width:44px">${fmt(x.datum)}</span><span>${esc((x.kader&&x.kader.name)||"—")}s Familie</span></div>`).join("")
    : `<div style="font-size:12px;color:#94a3b8;padding:4px 0">Noch niemand eingetragen.</div>`;
  const kidBtns=(kids||[]).map(k=>`<button onclick="waescheUebernehmen(${k.spieler_id},'${jsq((k.kader&&k.kader.name)||"")}')" style="flex:1;min-width:130px;min-height:44px;padding:9px;border:1.5px solid #2563eb;border-radius:10px;background:#fff;color:#1d4ed8;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🧺 ${esc((k.kader&&k.kader.name)||"Kind")} übernimmt</button>`).join("");
  slot.innerHTML=`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
    <div style="font-weight:700;margin-bottom:2px">🧺 Trikot-Wäsche</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Wer nimmt die Trikots mit? Übernimmt deine Familie, gibt's ${XP_ICON} <b>100 Federn</b> fürs Kind.</div>
    ${langeNichtDran?`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 10px;font-size:12px;color:#1e40af;margin-bottom:8px">👋 ${tageHer===null?"Ihr wart noch nicht dran":"Ihr wart lange nicht dran"} – mögt ihr diesmal?</div>`:""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">${kidBtns}</div>
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;margin-bottom:2px">Zuletzt gewaschen</div>
    ${verlauf}
  </div>`;
}
async function waescheUebernehmen(spielerId,name){
  if(!confirm(`${name||"Dein Kind"}s Familie übernimmt die nächste Wäsche?\n\nDanke! Es gibt 100 Federn fürs Kind.`))return;
  const heute=new Date().toISOString().slice(0,10);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/waesche_log`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({spieler_id:spielerId,datum:heute})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht eintragen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  // 100 Federn – pro Wasch-Termin (quelle_id = Datum) einmal, Server dedupliziert.
  let neu=0;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler_id:spielerId,p_quelle:'waesche',p_quelle_id:heute})});
    if(r.ok){const d=await r.json(); if(d>0)neu=d;}
  }catch(e){}
  toast(neu>0?`Danke! 🪶 +${neu} Federn fürs Kind`:"Eingetragen – danke!");
  if(typeof elternDashLoad==="function")elternDashLoad();
}

/* Event-Mitbringliste bei den Eltern (löst die Geld-Töpfe ab): zu jedem kommenden
   Event-Termin (typ='event') tragen die Eltern ein, WAS sie mitbringen – Salat,
   Kuchen, Getränke, Pavillon … Reine Absprache, kein Geld. Alle sehen die Liste,
   jeder darf eintragen; löschen darf man nur den eigenen Eintrag (RLS). */
async function mitbringEventsLaden(){
  const heute=new Date().toISOString().slice(0,10);
  const r=await fetch(`${SB_URL}/rest/v1/termine?typ=eq.event&datum=gte.${heute}&select=id,titel,datum,ort&order=datum.asc&limit=4`,{headers:sbAuthHeaders()});
  if(!r.ok)return [];
  return await r.json();
}
async function mitbringItems(terminIds){
  const map={};
  if(!terminIds.length)return map;
  const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen?termin_id=in.(${terminIds.join(",")})&select=id,termin_id,was,wer,created_by&order=id.asc`,{headers:sbAuthHeaders()});
  if(r.ok)(await r.json()).forEach(x=>{(map[x.termin_id]=map[x.termin_id]||[]).push(x);});
  return map;
}
async function elternMitbringLoad(kids){
  const slot=document.getElementById("mitbring-slot"); if(!slot)return;
  window._elternKids=kids||window._elternKids||[];
  let events=[]; try{events=await mitbringEventsLaden();}catch(e){}
  if(!events.length){ slot.innerHTML=""; return; }
  let itemsMap={}; try{itemsMap=await mitbringItems(events.map(e=>e.id));}catch(e){}
  let uid=""; try{uid=sbUserId()||"";}catch(e){}
  const fmtD=d=>new Date(d+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
  const kidOpts=(kids||[]).map(k=>`<option value="${k.spieler_id}">${esc((k.kader&&k.kader.name)||"Kind")}</option>`).join("");
  slot.innerHTML=events.map(ev=>{
    const items=itemsMap[ev.id]||[];
    const liste=items.length
      ? items.map(it=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 0;border-top:1px solid #f1f5f9">
          <span style="flex:1">🍽️ <b>${esc(it.was)}</b>${it.wer?` <span style="color:#94a3b8">· ${esc(it.wer)}</span>`:""}</span>
          ${(uid&&it.created_by===uid)?`<button onclick="mitbringDelete(${it.id})" aria-label="Eintrag löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:32px;min-height:32px;font-size:15px">✕</button>`:""}
        </div>`).join("")
      : `<div style="font-size:12px;color:#94a3b8;padding:4px 0">Noch nichts eingetragen – mach den Anfang! 🎉</div>`;
    const kidSel=(kids&&kids.length>1)?`<select id="mb-kid-${ev.id}" style="min-height:44px;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:13px;background:#fff">${kidOpts}</select>`:"";
    return `<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
      <div style="font-weight:700;margin-bottom:2px">🎉 ${esc(ev.titel||"Event")} · Mitbringliste</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:8px">${fmtD(ev.datum)}${ev.ort?" · "+esc(ev.ort):""} — wer bringt was mit? (Salat, Kuchen, Getränke, Pavillon …)</div>
      ${liste}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        <input id="mb-was-${ev.id}" placeholder="Was bringst du mit?" style="flex:1;min-width:150px;min-height:44px;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:13px" onkeydown="if(event.key==='Enter')mitbringAdd(${ev.id})">
        ${kidSel}
        <button onclick="mitbringAdd(${ev.id})" style="min-height:44px;padding:9px 16px;border:none;border-radius:10px;background:#16a34a;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Eintragen</button>
      </div>
    </div>`;
  }).join("");
}
async function mitbringAdd(terminId){
  const inp=document.getElementById("mb-was-"+terminId);
  const was=(inp&&inp.value||"").trim();
  if(!was){toast("Bitte eintragen, was du mitbringst","err");return;}
  const kids=window._elternKids||[];
  let wer="", spielerId=null;
  const sel=document.getElementById("mb-kid-"+terminId);
  if(sel&&sel.value){ spielerId=Number(sel.value); const k=kids.find(x=>x.spieler_id===spielerId); wer=(k&&k.kader&&k.kader.name)||""; }
  else if(kids.length){ spielerId=kids[0].spieler_id; wer=(kids[0].kader&&kids[0].kader.name)||""; }
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify({termin_id:terminId,was,wer:wer||null,spieler_id:spielerId})});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht eintragen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  if(inp)inp.value="";
  toast("Eingetragen – danke! 🎉");
  elternMitbringLoad(kids);
}
async function mitbringDelete(id){
  if(!confirm("Deinen Eintrag entfernen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_mitbringen?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht löschen"),"err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  elternMitbringLoad(window._elternKids||[]);
}

/* Fairplay-Quiz für die Eltern (Phase 18.3): fester Fragensatz rund um den Codex.
   Bestehen bringt dem Kind 50 Federn – genau EINMAL, serverseitig über xp_award_event
   dedupliziert. Wiederholen zum Üben ist erlaubt, Federn gibt es nur beim ersten Mal. */
const FAIRPLAY_QUIZ=[
  {q:"Dein Kind vertändelt den Ball kurz vorm Tor. Was hilft ihm am meisten?",
   opts:["Weiter anfeuern und Mut machen","Laut schimpfen","Genervt den Kopf schütteln"],correct:0,
   fun:"Mut machen! Kinder trauen sich mehr, wenn sie sich sicher fühlen."},
  {q:"Der Schiri pfeift ein Foul, das keins war. Wie reagierst du am Rand?",
   opts:["Ruhig bleiben, Entscheidung akzeptieren","Lautstark protestieren","Auf den Schiri zeigen und meckern"],correct:0,
   fun:"Die Kinder schauen sich genau ab, wie wir mit Fehlern umgehen."},
  {q:"Ein Kind der gegnerischen Mannschaft macht ein tolles Tor. Und jetzt?",
   opts:["Ruhig anerkennen – das war stark","Still bleiben, ist ja der Gegner","Buhen"],correct:0,
   fun:"Ein gutes Tor ist ein gutes Tor – egal welches Trikot."},
  {q:"Vom Spielfeldrand Taktik-Kommandos ins Spiel rufen – gute Idee?",
   opts:["Nein, das Coachen macht der Trainer","Ja, je lauter desto besser","Nur bei wichtigen Spielen"],correct:0,
   fun:"Zu viele Rufe verwirren die Kinder. Anfeuern ja, anweisen nein."},
  {q:"Euer Team verliert deutlich. Was tut der Heimweg dem Kind gut?",
   opts:["Positives hervorheben, Spaß betonen","Jeden Fehler durchgehen","Schweigen und schlechte Laune"],correct:0,
   fun:"Bei der U9 zählt das Gefühl, nicht das Ergebnis."},
  {q:"Ein Mitspieler deines Kindes weint nach einem Fehler. Was ist stark?",
   opts:["Ihn aufmuntern – Kopf hoch!","Ihm sagen, er soll sich zusammenreißen","Weggucken"],correct:0,
   fun:"Ein Team hält zusammen – auch am Spielfeldrand."}
];
let FQ_IDX=0, FQ_RICHTIG=0, FQ_KIDS=[];
function fairplayQuizStart(kids){
  FQ_IDX=0; FQ_RICHTIG=0; FQ_KIDS=(kids||[]).slice();
  document.getElementById("fq-ov")?.remove();
  const ov=document.createElement("div");
  ov.id="fq-ov";
  ov.style.cssText="position:fixed;inset:0;z-index:10055;background:linear-gradient(160deg,#0e3a5f,#0b2f4d);color:#fff;overflow-y:auto;font-family:inherit";
  document.body.appendChild(ov);
  fairplayQuizRender();
}
function fairplayQuizRender(){
  const ov=document.getElementById("fq-ov"); if(!ov)return;
  const q=FAIRPLAY_QUIZ[FQ_IDX];
  // Antworten mischen, damit die richtige nicht immer oben steht
  const order=q.opts.map((t,i)=>({t,i})).sort(()=>Math.random()-0.5);
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:24px 18px 40px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-size:13px;font-weight:800;opacity:.9">🤝 Fairplay-Quiz</div>
      <button onclick="document.getElementById('fq-ov').remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer">✕</button>
    </div>
    <div style="height:6px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden;margin-bottom:16px"><div style="height:100%;width:${Math.round(FQ_IDX/FAIRPLAY_QUIZ.length*100)}%;background:#38bdf8;border-radius:3px;transition:width .3s"></div></div>
    <div style="font-size:11px;opacity:.8;margin-bottom:6px">Frage ${FQ_IDX+1} von ${FAIRPLAY_QUIZ.length}</div>
    <div style="font-size:18px;font-weight:800;line-height:1.4;margin-bottom:18px">${esc(q.q)}</div>
    <div id="fq-opts" style="display:flex;flex-direction:column;gap:10px">
      ${order.map(o=>`<button onclick="fairplayQuizAnswer(${o.i},this)" style="text-align:left;padding:15px 16px;min-height:56px;border:2px solid rgba(255,255,255,.25);border-radius:14px;background:rgba(255,255,255,.08);color:#fff;font-family:inherit;font-size:14.5px;font-weight:600;cursor:pointer">${esc(o.t)}</button>`).join("")}
    </div>
    <div id="fq-feedback" style="margin-top:16px"></div>
  </div>`;
}
function fairplayQuizAnswer(i,btn){
  const q=FAIRPLAY_QUIZ[FQ_IDX];
  document.querySelectorAll("#fq-opts button").forEach(b=>b.disabled=true);
  const richtig=i===q.correct;
  if(richtig)FQ_RICHTIG++;
  btn.style.borderColor=richtig?"#22c55e":"#ef4444";
  btn.style.background=richtig?"rgba(34,197,94,.25)":"rgba(239,68,68,.25)";
  try{navigator.vibrate&&navigator.vibrate(richtig?20:[40,40,40]);}catch(e){}
  document.getElementById("fq-feedback").innerHTML=`<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:12px 14px">
    <div style="font-size:14px;font-weight:800">${richtig?"👍 Genau!":"💡 Fast – so geht's fairer:"}</div>
    <div style="font-size:13px;opacity:.95;margin-top:3px">${esc(q.fun)}</div>
    <button onclick="fairplayQuizNext()" style="width:100%;min-height:48px;margin-top:12px;border:none;border-radius:12px;background:#fff;color:#0b2f4d;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer">${FQ_IDX<FAIRPLAY_QUIZ.length-1?"Weiter":"Fertig 🎉"}</button>
  </div>`;
}
function fairplayQuizNext(){
  if(FQ_IDX<FAIRPLAY_QUIZ.length-1){FQ_IDX++;fairplayQuizRender();}
  else fairplayQuizResult();
}
async function fairplayQuizResult(){
  const ov=document.getElementById("fq-ov"); if(!ov)return;
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:60px 18px;text-align:center;opacity:.85">Federn werden gutgeschrieben …</div>`;
  // Federn fürs eigene Kind – genau einmal (Server dedupliziert). Bei mehreren Kindern jedes.
  let neu=0, schonGehabt=false;
  for(const k of FQ_KIDS){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/xp_award_event`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({p_spieler_id:k.spieler_id,p_quelle:'fairplay_quiz',p_quelle_id:'done'})});
      if(r.ok){const d=await r.json(); if(d>0)neu+=d; else schonGehabt=true;}
    }catch(e){}
  }
  if(!document.getElementById("fq-ov"))return;
  try{navigator.vibrate&&navigator.vibrate([100,50,100,50,200]);}catch(e){}
  const federnZeile=neu>0
    ? `<div style="font-size:17px;font-weight:900;color:#fde047">🪶 +${neu} Federn fürs Kind!</div>`
    : (schonGehabt?`<div style="font-size:14px;opacity:.92">Die Federn hattet ihr schon – aber Üben schadet nie. 💚</div>`
                  :`<div style="font-size:13px;opacity:.85">Melde dich an, damit die Federn beim Kind landen.</div>`);
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:40px 18px;text-align:center">
    <div style="font-size:56px">🏅</div>
    <div style="font-size:24px;font-weight:900;margin-top:8px">${FQ_RICHTIG} von ${FAIRPLAY_QUIZ.length} richtig</div>
    <div style="font-size:14px;opacity:.9;margin:8px 0 16px">Danke, dass ihr Fairplay vorlebt – die Kinder schauen es sich ab.</div>
    ${federnZeile}
    <button onclick="document.getElementById('fq-ov').remove()" style="width:100%;min-height:52px;margin-top:22px;border:none;border-radius:14px;background:#fff;color:#0b2f4d;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer">Schließen</button>
  </div>`;
}

// Regeln aus der DB laden; leer/offline → die fest verdrahteten als Fallback.
async function fairplayRegelnLaden(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fairplay_regeln?select=emoji,titel,text&order=sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok){
      const rows=await r.json();
      if(rows.length)return rows.map(x=>({emo:x.emoji||"•",t:x.titel||"",d:x.text||""}));
    }
  }catch(e){}
  return FAIRPLAY_REGELN;
}
async function fairplayOpen(){
  document.getElementById("fairplay-ov")?.remove();
  const ov=document.createElement("div");
  ov.id="fairplay-ov";
  ov.style.cssText="position:fixed;inset:0;z-index:10050;background:linear-gradient(160deg,#065f46,#064e3b);color:#fff;overflow-y:auto;font-family:inherit;-webkit-overflow-scrolling:touch";
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:80px 18px;text-align:center;opacity:.85">Lade Codex …</div>`;
  document.body.appendChild(ov);
  const regeln=await fairplayRegelnLaden();
  if(!document.getElementById("fairplay-ov"))return; // zwischenzeitlich geschlossen
  ov.innerHTML=`<div style="max-width:520px;margin:0 auto;padding:24px 18px 40px">
    <div style="text-align:center;margin-bottom:6px;font-size:40px">🦅</div>
    <div style="text-align:center;font-size:22px;font-weight:900;letter-spacing:.3px">Unser Fairplay-Codex</div>
    <div style="text-align:center;font-size:13px;opacity:.9;margin:6px 0 20px">SV Adler Dellbrück · U9 – für einen guten Spielfeldrand</div>
    ${regeln.map((r,i)=>`<div style="display:flex;gap:14px;align-items:flex-start;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:16px;margin-bottom:12px">
      <div style="font-size:30px;line-height:1">${esc(r.emo)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:800">${i+1}. ${esc(r.t)}</div>
        <div style="font-size:13.5px;opacity:.95;line-height:1.55;margin-top:3px">${esc(r.d)}</div>
      </div>
    </div>`).join("")}
    <div style="text-align:center;font-size:13px;opacity:.9;margin:16px 0 20px">Danke, dass ihr das mittragt. 💚</div>
    <button onclick="document.getElementById('fairplay-ov').remove()" style="width:100%;min-height:52px;border:none;border-radius:14px;background:#fff;color:#065f46;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer">Verstanden 👍</button>
  </div>`;
}

/* Trainer-Editor für den Fairplay-Codex. Der Trainer pflegt die Regeln, die Eltern
   sehen sie im Overlay. Gespeichert wird als komplette Liste (delete-all + insert) –
   die Datenmenge ist winzig und das erspart id-Jonglieren beim Umsortieren. */
let FP_EDIT=[];
async function fairplayEditOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("fpe-modal")?.remove();
  FP_EDIT=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/fairplay_regeln?select=emoji,titel,text&order=sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok)FP_EDIT=(await r.json()).map(x=>({emo:x.emoji||"",titel:x.titel||"",text:x.text||""}));
  }catch(e){}
  if(!FP_EDIT.length)FP_EDIT=FAIRPLAY_REGELN.map(r=>({emo:r.emo,titel:r.t,text:r.d}));
  const modal=document.createElement("div");
  modal.id="fpe-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Fairplay-Codex bearbeiten");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10001;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.id="fpe-card";
  c.style.cssText="background:var(--surface);color:var(--text);max-width:460px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  modal.appendChild(c);document.body.appendChild(modal);
  fairplayEditRender();
}
function fairplayEditRender(){
  const c=document.getElementById("fpe-card"); if(!c)return;
  const fld="padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box";
  c.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🤝 Fairplay-Codex bearbeiten</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Diese Regeln sehen die Eltern im Codex-Overlay. Reihenfolge mit den Pfeilen.</div>
    ${FP_EDIT.map((r,i)=>`<div style="border:var(--border-s);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input value="${esc(r.emo)}" oninput="FP_EDIT[${i}].emo=this.value" maxlength="4" style="width:52px;text-align:center;font-size:18px;${fld}">
        <input value="${esc(r.titel)}" oninput="FP_EDIT[${i}].titel=this.value" placeholder="Titel der Regel" style="flex:1;font-weight:700;${fld}">
      </div>
      <textarea oninput="FP_EDIT[${i}].text=this.value" rows="2" placeholder="Kurze Erklärung (optional)" style="width:100%;resize:vertical;${fld}">${esc(r.text)}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn btn-sm" onclick="fairplayEditMove(${i},-1)" ${i===0?"disabled":""} title="nach oben"><i class="ti ti-arrow-up"></i></button>
        <button class="btn btn-sm" onclick="fairplayEditMove(${i},1)" ${i===FP_EDIT.length-1?"disabled":""} title="nach unten"><i class="ti ti-arrow-down"></i></button>
        <button class="btn btn-sm btn-d" style="margin-left:auto" onclick="fairplayEditDel(${i})"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join("")}
    <button class="btn btn-sm" style="width:100%;margin-bottom:12px" onclick="fairplayEditAdd()"><i class="ti ti-plus"></i>Regel hinzufügen</button>
    <div style="display:flex;gap:8px">
      <button class="btn btn-p btn-sm" onclick="fairplayEditSave(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('fpe-modal').remove()">Schließen</button>
    </div>`;
}
function fairplayEditAdd(){ FP_EDIT.push({emo:"⭐",titel:"",text:""}); fairplayEditRender(); }
function fairplayEditDel(i){ FP_EDIT.splice(i,1); fairplayEditRender(); }
function fairplayEditMove(i,dir){ const j=i+dir; if(j<0||j>=FP_EDIT.length)return; const t=FP_EDIT[i];FP_EDIT[i]=FP_EDIT[j];FP_EDIT[j]=t; fairplayEditRender(); }
async function fairplayEditSave(btn){
  const rows=FP_EDIT.map((r,i)=>({sort:i,emoji:(r.emo||"").trim()||null,titel:(r.titel||"").trim(),text:(r.text||"").trim()||null}))
                    .filter(r=>r.titel); // Regeln ohne Titel verwerfen
  if(!rows.length){toast("Mindestens eine Regel mit Titel","err");return;}
  if(btn)btn.disabled=true;
  try{
    // Ganze Liste ersetzen: erst leeren, dann neu einfügen.
    const del=await fetch(`${SB_URL}/rest/v1/fairplay_regeln?id=gt.0`,{method:"DELETE",headers:sbAuthHeaders()});
    if(sbCheck401(del))return;
    if(!del.ok){toast(sbDeniedMsg(del,"Konnte nicht speichern"),"err");return;}
    const ins=await fetch(`${SB_URL}/rest/v1/fairplay_regeln`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=minimal'},body:JSON.stringify(rows)});
    if(!ins.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  finally{if(btn)btn.disabled=false;}
  toast("Codex gespeichert ✓ Die Eltern sehen ihn sofort.");
  document.getElementById("fpe-modal")?.remove();
}

/* Platz-Ampel-Banner für die Eltern – nur wenn der Trainer einen Status gesetzt hat.
   Farben aus der gemeinsamen PLATZ_AMPEL-Definition, kontrastreich für draußen. */
function elternPlatzAmpelBanner(termin){
  const s=termin.platz_status; const a=(typeof PLATZ_AMPEL!=="undefined"&&PLATZ_AMPEL[s]);
  if(!a)return "";
  const bg=s==="abgesagt"?"#dc2626":s==="ausweich"?"#d97706":"#16a34a";
  const wann=termin.platz_status_at?new Date(termin.platz_status_at).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
  const text=s==="abgesagt"?"Der Termin fällt heute aus."
            :s==="ausweich"?"Heute auf den Ausweichplatz."
            :"Der Termin findet statt.";
  return `<div style="background:${bg};color:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 4px 16px ${bg}55">
    <div style="font-size:18px;font-weight:900;display:flex;align-items:center;gap:8px">${a.emo} ${esc(a.lbl)}</div>
    <div style="font-size:13.5px;opacity:.97;margin-top:4px">${text}${termin.platz_status_note?` <b>${esc(termin.platz_status_note)}</b>`:""}</div>
    ${wann?`<div style="font-size:10.5px;opacity:.8;margin-top:6px">Aktualisiert ${wann} Uhr vom Trainer</div>`:""}
  </div>`;
}

/* Pausiert mein Kind? Die Nominierungen sind trainer-only, deshalb fragt die RPC
   kind_nominierungsstatus nur nach dem eigenen Kind. Angezeigt wird die Karte NUR,
   wenn der Trainer die Einteilung übertragen hat UND das Kind zugesagt hatte –
   sonst wäre "nicht nominiert" bloß der Normalzustand vor der Einteilung. */
async function elternPauseLoad(termin,kids){
  const box=document.getElementById("pause-card");
  if(!box||!termin)return;
  const treffer=[];
  for(const k of kids){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_nominierungsstatus`,{method:"POST",
        headers:{...sbAuthHeaders(),'Content-Type':'application/json'},
        body:JSON.stringify({p_spieler:k.spieler_id,p_datum:termin.datum})});
      if(!r.ok)continue;
      const s=await r.json();
      if(s&&s.ok&&s.eingeteilt&&!s.nominiert&&s.zugesagt)
        treffer.push({name:(k.kader&&k.kader.name)||"Dein Kind",grund:s.grund});
    }catch(e){}
  }
  if(!treffer.length){ box.innerHTML=""; return; }
  const m=(typeof TM_META!=="undefined"&&TM_META[termin.typ])||{label:termin.typ};
  box.innerHTML=treffer.map(t=>`<div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:14px;padding:16px;margin-bottom:12px">
    <div style="font-size:15px;font-weight:800;color:#92400e">😌 Diesmal pausiert ${esc(t.name)}</div>
    <div style="font-size:12.5px;color:#92400e;line-height:1.55;margin-top:6px">
      Beim ${esc(m.label)} am ${new Date(termin.datum+"T00:00:00").toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})} ist der Kader voll –
      ${esc(t.name)} ist diesmal nicht dabei. Beim nächsten Mal ist er wieder eingeplant.
    </div>
    ${t.grund?`<div style="margin-top:8px;background:#fff;border-radius:8px;padding:8px 10px;font-size:12.5px;color:#334155">${esc(t.grund)}<div style="font-size:10px;color:#94a3b8;margin-top:3px">Nachricht vom Trainer</div></div>`:""}
  </div>`).join("");
}

/* Turnierplan für die Eltern: Begegnungen, Link zum Turnierbaum, Aushang (Foto/PDF).
   Der Plan liegt je Team unter "<datum>" bzw. "<datum>__t2/3" – wir holen alle
   Varianten des Tages und gruppieren sie, damit Eltern von Adler 2 ihre Spiele finden. */
async function elternTurnierplanLoad(termin){
  const box=document.getElementById("turnierplan-card");
  if(!box||!termin)return;
  let plan=[], ergebnisse=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/turnier_plan?datum=like.${encodeURIComponent(termin.datum)}*&select=*&order=datum.asc,sort.asc,id.asc`,{headers:sbAuthHeaders()});
    if(r.ok)plan=await r.json();
  }catch(e){}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/turnier_spiele?datum=like.${encodeURIComponent(termin.datum)}*&select=plan_id,tore,gegentore`,{headers:sbAuthHeaders()});
    if(r.ok)ergebnisse=await r.json();
  }catch(e){}
  const erg={}; ergebnisse.forEach(x=>{ if(x.plan_id)erg[x.plan_id]=x; });

  const knoepfe=[];
  if(termin.turnierplan_url)knoepfe.push(`<a href="${esc(termin.turnierplan_url)}" target="_blank" rel="noopener noreferrer" style="flex:1;min-width:130px;text-align:center;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-size:13px;font-weight:700;text-decoration:none">🔗 Turnierbaum</a>`);
  if(termin.turnierplan_datei)knoepfe.push(`<button onclick="elternAushangOeffnen('${jsq(termin.turnierplan_datei)}')" style="flex:1;min-width:130px;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📄 Aushang ansehen</button>`);

  if(!plan.length&&!knoepfe.length){ box.innerHTML=""; return; }

  let liste="";
  if(plan.length){
    const gruppen={};
    plan.forEach(p=>{ const t=teamLabelFromKey(p.datum)||" · Adler 1"; (gruppen[t]=gruppen[t]||[]).push(p); });
    const mehrere=Object.keys(gruppen).length>1;
    liste=Object.entries(gruppen).map(([label,zeilen])=>
      (mehrere?`<div style="font-size:11px;font-weight:700;color:#64748b;margin:8px 0 2px">${esc(label.replace(/^ · /,""))}</div>`:"")
      +zeilen.map(p=>{
        const e=erg[p.id];
        const farbe=e?(e.tore>e.gegentore?"#059669":e.tore===e.gegentore?"#b45309":"#dc2626"):"#94a3b8";
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #f1f5f9">
          <span style="font-size:11.5px;color:#64748b;width:44px">${p.uhrzeit?esc(p.uhrzeit):"--:--"}</span>
          <span style="flex:1;font-size:12.5px">${esc(p.gegner||"?")}${p.feld?`<span style="color:#94a3b8;font-size:10.5px"> · ${esc(p.feld)}</span>`:""}</span>
          <span style="font-weight:800;font-size:13px;color:${farbe}">${e?`${e.tore}:${e.gegentore}`:"–"}</span>
        </div>`;
      }).join("")).join("");
  }
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-size:12.5px;font-weight:700;color:#1e3a8a;margin-bottom:2px">🏆 Turnierplan</div>
    ${plan.length?`<div style="font-size:11px;color:#94a3b8;margin-bottom:2px">Ergebnisse erscheinen, sobald der Trainer sie einträgt.</div>`:""}
    ${liste}
    ${knoepfe.length?`<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">${knoepfe.join("")}</div>`:""}
  </div>`;
}
// Der Bucket ist privat – Datei mit dem Eltern-Token holen und lokal öffnen.
async function elternAushangOeffnen(pfad){
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${pfad}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok){toast("Aushang nicht gefunden","err");return;}
    window.open(URL.createObjectURL(await r.blob()),"_blank","noopener");
  }catch(e){toast("Netzwerkfehler","err");}
}

/* Fan-Link: Eltern geben den Spenden-Link an Oma, Opa & Fans weiter.
   Nur Weitergabe eines Links – die App fasst weiterhin kein Geld an. */
function akShareBtnHtml(){
  return `<button onclick="akShare()" style="width:100%;margin-top:8px;padding:10px;border:1.5px solid #0070ba;border-radius:10px;background:#fff;color:#0070ba;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📤 Fan-Link teilen (Oma, Opa &amp; Fans)</button>`;
}
function akShare(){
  const url=window._akLink; if(!url)return;
  const text=`🦅 Unterstütz die U9 vom SV Adler Dellbrück!\nJeder Euro fließt direkt in die Mannschaft:\n${url}`;
  if(navigator.share){navigator.share({title:"Adler-Kasse U9",text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Fan-Link kopiert ✓"),()=>prompt("Fan-Link:",url));}
}

/* Liveticker für Eltern: nur bei Spiel/Turnier. Der Ticker-Key ist das Termin-Datum,
   bei Adler 2/3 mit Suffix __t<n> (siehe spieltagKey()). Team wird kurz abgefragt. */
function elternTicker(datum,team){
  const key=Number(team)>1?`${datum}__t${Number(team)}`:datum;
  location.href=location.pathname+"?ticker="+encodeURIComponent(key);
}
function elternTickerHtml(termin){
  if(termin.typ!=="spiel"&&termin.typ!=="turnier")return "";
  const chip=n=>`<button onclick="elternTicker('${termin.datum}',${n})" style="flex:1;min-width:88px;padding:8px 6px;border:1.5px solid #dc2626;border-radius:10px;background:#fff;color:#dc2626;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Adler ${n}</button>`;
  return `<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-size:12.5px;font-weight:700;color:#dc2626;margin-bottom:2px">📣 Liveticker</div>
    <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">Nicht dabei? Hier gibt's Tore und Spielstand live. Welches Team spielt dein Kind?</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${chip(1)}${chip(2)}${chip(3)}</div>
  </div>`;
}

/* ═══════════════════════════════════
   KI-TRAININGS-ASSISTENT (Welle 3, FEAT AC) – "Adler-Coach".
   Ruft die Edge Function ki-uebung (Auth-Zwang: nur Trainer; Rate-Limit
   20/Tag; LLM-Key nur serverseitig; erzwungenes JSON-Schema). Client:
   AbortController-Timeout (die UI haengt nie), robuste Fehleranzeige,
   Trainer-in-the-Loop – Uebungen werden nur auf Klick in der Taktik-
   Bibliothek gespeichert (taktik_templates mit data.typ="ki").
═══════════════════════════════════ */
let kiLastUebungen=[];
function kiCoachOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("ki-modal")?.remove();
  const m=document.createElement("div");m.id="ki-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  const chip=t=>`<button onclick="document.getElementById('ki-prompt').value='${t.replace(/'/g,"")}'" style="border:var(--border-s);background:var(--surface);border-radius:14px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit">${t}</button>`;
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-weight:800;font-size:16px">🤖 Adler-Coach (KI)</div>
      <button onclick="document.getElementById('ki-modal').remove()" style="border:none;background:none;font-size:22px;color:var(--text2);cursor:pointer">×</button>
    </div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:10px">Beschreibe, was du trainieren willst – der Coach schlägt altersgerechte U8/U9-Übungen vor. Du entscheidest, was in die Bibliothek kommt.</div>
    <textarea id="ki-prompt" rows="2" placeholder="z. B. 2 Übungen für Zweikampfhärte" style="width:100%;box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px"></textarea>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${chip("Dribbling & Ballführung")}${chip("Passspiel in der Raute")}${chip("Torschuss mit Spaß")}${chip("Zweikampf & Mut")}</div>
    <button id="ki-gen-btn" class="btn btn-p btn-sm" onclick="kiCoachGenerate()"><i class="ti ti-sparkles"></i>Übungen vorschlagen</button>
    <div id="ki-result" style="margin-top:12px"></div>
  </div>`;
  document.body.appendChild(m);
}
async function kiCoachGenerate(){
  const prompt=(document.getElementById("ki-prompt")?.value||"").trim();
  if(!prompt){toast("Bitte kurz beschreiben","err");return;}
  const out=document.getElementById("ki-result"), btn=document.getElementById("ki-gen-btn");
  if(out)out.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">🧠 Adler-Coach denkt nach…</div>';
  if(btn)btn.disabled=true;
  const ctrl=new AbortController(), to=setTimeout(()=>ctrl.abort(),30000); // UI haengt nie
  try{
    const r=await fetch(`${SB_URL}/functions/v1/ki-uebung`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({prompt}),signal:ctrl.signal});
    clearTimeout(to);
    const d=await r.json().catch(()=>({}));
    if(!r.ok){ if(out)out.innerHTML=`<div style="color:#dc2626;font-size:13px;padding:10px">${esc(d.error||("Fehler "+r.status))}</div>`; return; }
    kiCoachRender(d.uebungen||[], d.rest);
  }catch(e){
    clearTimeout(to);
    if(out)out.innerHTML=`<div style="color:#dc2626;font-size:13px;padding:10px">${e&&e.name==="AbortError"?"Zeitüberschreitung – bitte nochmal versuchen.":"Netzwerkfehler – bist du online?"}</div>`;
  }finally{ if(btn)btn.disabled=false; }
}
// Kategorien für die Bibliothek (gleiche Keys wie renderTraining/PERIOD_CATS).
const KI_KATS=[["aufwaermen","Aufwärmen"],["raute","Raute & Grundordnung"],["passspiel","Passspiel"],["wahrnehmung","Wahrnehmung & IQ"],["technik","Technik & Ball"],["pressing","Pressing & Umschalten"],["spass","Spaß & Wettbewerb"],["torwart","Torwart"],["individual","Individual"],["mindset","Mindset"]];
function kiCoachRender(uebungen,rest){
  kiLastUebungen=uebungen||[];
  const out=document.getElementById("ki-result"); if(!out)return;
  if(!kiLastUebungen.length){out.innerHTML='<div style="padding:10px;color:var(--text3);font-size:13px">Keine Übungen erhalten – bitte anders formulieren.</div>';return;}
  out.innerHTML=kiLastUebungen.map((u,i)=>`<div style="border:var(--border-s);border-radius:12px;padding:12px;margin-bottom:10px">
    <div style="font-weight:800;font-size:14px">${esc(u.titel||"Übung")}</div>
    <div style="font-size:11px;color:var(--text2);margin:2px 0 6px">${u.dauer?"⏱ "+esc(u.dauer):""}${u.material?" · 🎒 "+esc(u.material):""}</div>
    <div style="font-size:12.5px;line-height:1.5;white-space:pre-wrap">${esc(u.beschreibung||"")}</div>
    ${u.variante?`<div style="font-size:11.5px;color:var(--text2);margin-top:5px">➕ ${esc(u.variante)}</div>`:""}
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px">
      <label style="font-size:11px;color:var(--text2)">Kategorie:
        <select id="ki-kat-${i}" style="padding:6px 8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:12px;background:var(--surface);color:var(--text)">
          ${KI_KATS.map(([k,l])=>`<option value="${k}"${k==="technik"?" selected":""}>${l}</option>`).join("")}
        </select>
      </label>
      <button class="btn btn-sm btn-p" onclick="kiCoachSaveForm(${i})"><i class="ti ti-clipboard-list"></i>In Bibliothek übernehmen</button>
    </div>
  </div>`).join("")+(rest!=null?`<div style="font-size:10px;color:var(--text3);text-align:center;margin-top:2px">Noch ${esc(rest)} KI-Anfragen heute frei</div>`:"");
}
async function kiCoachSave(i){
  const u=kiLastUebungen[i]; if(!u)return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/taktik_templates`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({name:(u.titel||"KI-Übung").slice(0,120),formation:"KI-Übung",data:{typ:"ki",titel:u.titel,dauer:u.dauer,material:u.material,beschreibung:u.beschreibung,variante:u.variante}})});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
    toast("💾 In Bibliothek gespeichert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
// KI-Übung aus der Bibliothek als Text-Modal ansehen (nicht aufs Board laden)
async function ttViewKi(id){
  let row=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/taktik_templates?id=eq.${id}&select=name,data`,{headers:sbAuthHeaders()});if(r.ok)row=((await r.json())||[])[0];}catch(e){}
  if(!row||!row.data){toast("Übung nicht gefunden","err");return;}
  const u=row.data;
  document.getElementById("tt-modal")?.remove();
  const m=document.createElement("div");m.id="tt-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:440px;width:100%;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-weight:800;font-size:16px">🤖 ${esc(u.titel||row.name||"Übung")}</div>
      <button onclick="document.getElementById('tt-modal').remove()" style="border:none;background:none;font-size:22px;color:var(--text2);cursor:pointer">×</button>
    </div>
    <div style="font-size:11.5px;color:var(--text2);margin-bottom:8px">${u.dauer?"⏱ "+esc(u.dauer):""}${u.material?" · 🎒 "+esc(u.material):""}</div>
    <div style="font-size:13.5px;line-height:1.6;white-space:pre-wrap">${esc(u.beschreibung||"")}</div>
    ${u.variante?`<div style="font-size:12.5px;color:var(--text2);margin-top:8px">➕ <b>Variante:</b> ${esc(u.variante)}</div>`:""}
  </div>`;
  document.body.appendChild(m);
}

// FEAT AC-Folge: KI-Übung als echte Trainingsform speichern (Tabelle trainingsformen,
// gleicher Weg wie saveCustomTraining). Danach ist sie via tpAllForms() in ALLEN
// Planungs-Dropdowns waehlbar (jede Phase, jedes Datum) -> Trainer setzt sie an die
// gewuenschte Stelle. Navigiert direkt in die Planung.
async function kiCoachSaveForm(i){
  const u=kiLastUebungen[i]; if(!u)return;
  const kat=document.getElementById("ki-kat-"+i)?.value||"technik"; // vom Trainer gewählte Kategorie
  const ablauf=(u.beschreibung||"")+(u.variante?"\n\nVariante: "+u.variante:"");
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  // Spalten exakt wie in trainingsformen: KEIN svg (existiert nicht), tags ist text (kein Array).
  const form={
    name:(u.titel||"KI-Übung").slice(0,120),
    kat:kat,
    ablauf:ablauf,
    varianten:u.variante||"",
    coaching:"Vom Adler-Coach (KI) vorgeschlagen – altersgerecht für U8/U9.",
    spieler:"", feld:u.material||"", dauer:u.dauer||"",
    spass:5, diff:2,
    custom:true, focus:false, tags:"KI-Coach",
    kurz:(u.beschreibung||"").slice(0,80)
  };
  try{
    // Trainer-Token (RLS: trainingsformen schreibbar nur fuer is_trainer, NICHT anon)
    const r=await fetch(`${SB_URL}/rest/v1/trainingsformen`,{method:"POST",headers:sbAuthHeaders({'Prefer':'return=minimal'}),body:JSON.stringify(form)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  if(typeof CUSTOM_FORMS!=="undefined")CUSTOM_FORMS.push(form);
  document.getElementById("ki-modal")?.remove();
  toast("🏃 In Trainings-Bibliothek – jetzt in der Planung wählbar ✓");
  if(typeof go==="function")go("planung"); // direkt zur Planung, dort in gewünschte Phase setzen
}
