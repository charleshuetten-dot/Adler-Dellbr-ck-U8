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
  if(typeof elternThemeInit==="function"){ elternThemeInit(); elternThemeSweep(root); } // Login-Screen dem Theme folgen lassen
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
  root.innerHTML=`<div class="ep-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 4px 12px">
      <div style="font-size:18px;font-weight:800">🦅 Eltern-Bereich</div>
      <div style="display:flex;align-items:center;gap:10px">
        <button id="theme-toggle" onclick="toggleTheme()" title="Hell / Dunkel umschalten" aria-label="Theme umschalten" style="border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:15px;line-height:1">🌙</button>
        <button onclick="elternTourStart()" title="Kurze Tour" aria-label="Hilfe/Tour" style="border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:15px;line-height:1">❓</button>
        <button onclick="elternPortalLogout()" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer">Abmelden</button>
      </div>
    </div>
    <div id="ep-dash-body"><div style="text-align:center;padding:40px;color:#64748b">Lade…</div></div>
  </div>`;
  if(typeof applyTheme==="function")applyTheme(localStorage.getItem("adler_theme")); // Toggle-Icon + data-theme
  if(typeof elternThemeInit==="function"){ elternThemeInit(); elternThemeSweep(document.getElementById("eltern-portal")||document.body); } // Kopfzeile bei Dark einfärben
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
const EP_RSVP={zugesagt:{lbl:"Zusage",emo:"👍",col:"#059669"},unsicher:{lbl:"Unsicher",emo:"🤔",col:"#ca8a04"},abgesagt:{lbl:"Absage",emo:"👎",col:"#dc2626"},krank:{lbl:"Krank",emo:"🤒",col:"#d97706"}};
// Schnell-Rückmeldung im Karussell: die drei vom PO gewünschten Stufen.
const EP_RSVP_QUICK=["zugesagt","unsicher","abgesagt"];
/* ── Tag/Nacht-Modus für den Eltern-Bereich ──────────────────────────────────
   Der Eltern-Bereich ist mit festen Hell-Farben (Inline-Styles) gebaut und reagiert
   – anders als die Trainer-App – nicht auf die CSS-Variablen. Statt hunderte Literale
   umzuschreiben, färbt ein zentraler, luminanz-basierter „Sweep" ein: sehr helle
   Flächen → dunkel, sehr dunkler Text → hell. Marken-/Akzentfarben (mittlere Helligkeit)
   bleiben. Läuft nur bei aktivem Dark-Theme, ist idempotent und erfasst per
   MutationObserver auch später geöffnete Modals/Slots. Body-Hintergrund kommt schon
   aus var(--bg) und ist damit ohnehin theme-fähig. */
function elternDarkActive(){
  const a=document.documentElement.getAttribute("data-theme");
  if(a==="dark")return true; if(a==="light")return false;
  return !!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function _elRgb(s){ const m=/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(s||""); if(!m)return null; const a=m[4]==null?1:parseFloat(m[4]); return a===0?null:[+m[1],+m[2],+m[3]]; }
function _elLum(c){ return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }
function _elMix(c,t,p){ return `rgb(${Math.round(c[0]+(t[0]-c[0])*p)}, ${Math.round(c[1]+(t[1]-c[1])*p)}, ${Math.round(c[2]+(t[2]-c[2])*p)})`; }
function _elSweepOne(el){
  const s=el.style; if(!s)return;
  const bg=_elRgb(s.backgroundColor);
  if(bg&&_elLum(bg)>216) s.backgroundColor=_elMix(bg,[17,24,39],0.90);   // helle Fläche → dunkel
  const col=_elRgb(s.color);
  if(col){ const L=_elLum(col);
    if(L<60) s.color=_elMix(col,[226,232,240],0.86);        // fast-schwarze Tinte → deutlich hell
    else if(L<128) s.color=_elMix(col,[226,232,240],0.5);   // dunkle Marken-/Textfarbe → aufhellen
  }
  ["borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"].forEach(p=>{
    const b=_elRgb(s[p]); if(b&&_elLum(b)>205) s[p]=_elMix(b,[51,65,85],0.72);
  });
}
function elternThemeSweep(root){
  if(!elternDarkActive())return;
  root=root||document.body; if(!root||root.nodeType!==1)return;
  if(root.hasAttribute&&root.hasAttribute("style"))_elSweepOne(root);
  const list=root.querySelectorAll?root.querySelectorAll("[style]"):[];
  for(const el of list)_elSweepOne(el);
}
let _elThemeObs=null;
function elternThemeInit(){
  if(_elThemeObs||!document.body)return;
  _elThemeObs=new MutationObserver(muts=>{
    if(!elternDarkActive())return;
    for(const mu of muts) for(const n of mu.addedNodes) if(n.nodeType===1) elternThemeSweep(n);
  });
  _elThemeObs.observe(document.body,{childList:true,subtree:true});
}
// Wird vom globalen toggleTheme (core.js) aufgerufen.
function elternThemeOnToggle(){
  if(!document.getElementById("ep-dash-body"))return;      // nur im Eltern-Dashboard
  if(typeof applyTheme==="function")applyTheme(localStorage.getItem("adler_theme")); // Toggle-Icon
  if(elternDarkActive())elternThemeSweep(document.body);   // dunkel: direkt einfärben
  else if(typeof elternDashLoad==="function")elternDashLoad(); // hell: sauber neu rendern
}
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
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&datum=gte.${heute}&order=datum.asc,uhrzeit.asc.nullslast&limit=15`,{headers:sbAuthHeaders()});if(r.ok){termineListe=await r.json();termin=termineListe[0]||null;}}catch(e){}
  ELTERN_TERMINE=termineListe; // für den „Alle Termine"-Dialog + Kalender-Export
  let rsvp={};
  if(termin){
    try{const ids=kids.map(k=>k.spieler_id).join(",");const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${termin.id}&spieler_id=in.(${ids})&select=spieler_id,status,kommentar`,{headers:sbAuthHeaders()});if(r.ok){(await r.json()).forEach(x=>rsvp[x.spieler_id]=x);}}catch(e){}
  }
  // Rückmeldungen für ALLE kommenden Termine (fürs Schnell-Karussell)
  let rsvpAll={};
  try{
    const tids=termineListe.map(t=>t.id).join(","), kidIds=kids.map(k=>k.spieler_id).join(",");
    if(tids&&kidIds){
      const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=in.(${tids})&spieler_id=in.(${kidIds})&select=termin_id,spieler_id,status`,{headers:sbAuthHeaders()});
      if(r.ok)(await r.json()).forEach(x=>{(rsvpAll[x.termin_id]=rsvpAll[x.termin_id]||{})[x.spieler_id]=x.status;});
    }
  }catch(e){}
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
      <div style="font-size:16px;font-weight:800;margin-top:2px">${m.icon} ${esc(termin.titel||termin.gegner||m.label)}${heimLabel(termin)?` <span style="font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;background:${termin.heim?"#dcfce7":"#fef3c7"};color:${termin.heim?"#15803d":"#b45309"};white-space:nowrap">${heimLabel(termin)}</span>`:""}</div>
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
  html+=`<div id="match-gruss-slot"></div>`;  // A1: persönlicher Nach-dem-Spiel-Gruß pro Kind
  html+=`<div id="eltern-level-slot" style="margin-bottom:12px"></div>`;  // C1: kollektives Team-Level
  html+=elternTermineCarouselHtml(termineListe,kids,rsvpAll); // Schnell-Zu-/Absage für alle Termine
  // Mitbringliste (Events) + Büdchendienst (Heimspiele) bewusst weit oben – das sind To-dos.
  html+=`<div id="mitbring-slot"></div>`;     // Event-Mitbringliste (async, nur bei kommenden Events)
  html+=`<div id="buedchen-slot"></div>`;     // Büdchen-Einteilung bei Heimspielen (async)
  // Push-Benachrichtigungen aktivieren (nur wenn der Browser sie unterstützt)
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🔔 Benachrichtigungen</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Erinnerungen an Termine, offene Rückmeldungen und Neuigkeiten direkt aufs Handy.</div>
    <div id="push-slot-eltern"></div>`);
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
      <button onclick="lobPlay(${k.spieler_id})" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #db2777;border-radius:10px;background:#fdf2f8;color:#be185d;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🎧 Sprachlob vom Trainer anhören</button>
      <button onclick="abzeichenOpen(${k.spieler_id},'${(kd.name||'').replace(/'/g,'')}')" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#b45309;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🎖️ Technik-Abzeichen</button>
      <button onclick="childWrappedShare(${k.spieler_id})" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#7c3aed;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🎬 Saison-Rückblick (Wrapped)</button>
      <button onclick="elternFanfactsOpen(${k.spieler_id},'${(kd.name||'').replace(/'/g,'')}')" style="width:100%;margin-top:8px;padding:9px;border:1.5px solid #64748b;border-radius:10px;background:#fff;color:#475569;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">✏️ Fan-Fakten &amp; Foto</button>
      <div style="font-size:10.5px;color:#94a3b8;margin-top:6px">Foto: Unter „Fan-Fakten &amp; Foto" steuerst du selbst, ob das Bild deines Kindes im „Adler Nest" und in der Team-Galerie erscheint.</div>`);
  }).join("");
  // Mehr vom Team: Stadionheft (öffentliche Leseansicht)
  html+=card(`<div style="font-weight:700;margin-bottom:6px">📰 Mehr vom Team</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Das digitale Stadionheft mit Neuigkeiten, Ergebnissen und Geburtstagen.</div>
    <a href="${location.pathname}?heft" style="display:block;text-align:center;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;text-decoration:none">📰 Adler Nest öffnen</a>`);
  // R2: „Regeln & Vereinbarungen" einklappbar (weniger Scrollen).
  html+=`<details class="el-sect"><summary>📋 Regeln & Vereinbarungen</summary><div>`;
  // Fairplay-Codex (Phase 18.3) – die goldenen Regeln fürs Verhalten am Spielfeldrand
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🤝 Unser Fairplay-Codex</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Die Regeln, damit der Spielfeldrand ein guter Ort für die Kinder bleibt.</div>
    <button onclick="fairplayOpen()" style="width:100%;min-height:48px;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">Codex ansehen</button>
    <div id="fp-commit-slot" style="margin-top:10px"></div>
    <button onclick="fairplayQuizStart(window._elternKids||[])" style="width:100%;min-height:48px;margin-top:10px;padding:13px;border:1.5px solid #16a34a;border-radius:10px;background:#fff;color:#15803d;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer">🏅 Fairplay-Quiz spielen · ${XP_ICON} 50 Federn fürs Kind</button>`);
  // Ausführlicher Eltern-Leitfaden – die ausformulierten Vereinbarungen fürs Miteinander
  html+=card(`<div style="font-weight:700;margin-bottom:6px">📖 ${esc(LEITFADEN_NAME)}</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Unsere ausformulierten Vereinbarungen: Pünktlichkeit, Aufsicht, Büdchen, Verhalten am Platz, App-Nutzung und mehr – jederzeit zum Nachlesen.</div>
    <button onclick="leitfadenOpen()" style="width:100%;min-height:48px;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">${esc(LEITFADEN_NAME)} öffnen</button>`);
  html+=`</div></details>`; // /Regeln & Vereinbarungen
  // Elterngespräch anfragen – signalisiert dem Trainer den Bedarf
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🗣️ Elterngespräch</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Du möchtest mit dem Trainer über dein Kind sprechen? Sag kurz Bescheid – der Trainer meldet sich zur Terminabstimmung.</div>
    <div id="eg-slot"></div>
    <button onclick="elternGespraechOpen()" style="width:100%;padding:11px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#7c3aed;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Elterngespräch anfragen</button>`);
  html+=`<div id="eltern-poll-slot"></div>`; // Terminvorschläge des Trainers fürs Elterngespräch
  // R2: „Mitmachen im Team" einklappbar.
  html+=`<details class="el-sect"><summary>🤝 Mitmachen im Team</summary><div>`;
  // Adler-Börse (Phase 23.1): interner Flohmarkt
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🛍️ Adler-Börse</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Zu kleine Schuhe oder Trikots? Gib sie an ein anderes Adler-Kind weiter.</div>
    <button onclick="boerseOpen()" style="width:100%;padding:11px;border:1.5px solid #2563eb;border-radius:10px;background:#fff;color:#1d4ed8;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Börse öffnen</button>`);
  // FEAT Y: Fundbüro – Board + Upload für alle eingeloggten Eltern
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🧦 Fundbüro</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Trinkflasche verschwunden? Jacke gefunden? Hier sammelt das Team.</div>
    <button onclick="fundbueroOpen()" style="width:100%;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Fundbüro öffnen</button>`);
  html+=`</div></details>`; // /Mitmachen im Team
  html+=`<div id="skill-slot"></div>`;        // Skill der Woche
  if(WAESCHE_AKTIV)html+=`<div id="waesche-slot"></div>`;  // Trikot-Wäsche-Rotator (aktuell ausgeblendet)
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
  // R7: DSGVO – Eltern laden alle Daten ihres Kindes als Datei herunter.
  html+=`<details class="el-sect"><summary>🔒 Datenschutz</summary><div>`+card(`<div style="font-weight:700;margin-bottom:6px">📥 Meine Daten</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Lade alle bei uns gespeicherten Daten deines Kindes als Datei herunter (Rückmeldungen, Federn, Metadaten).</div>
    <button onclick="elternDataExport(this)" style="width:100%;min-height:44px;padding:11px;border:1.5px solid #64748b;border-radius:10px;background:#fff;color:#475569;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Daten herunterladen (JSON)</button>`)+`</div></details>`;
  body.innerHTML=html;
  elternThemeInit();          // Observer für Modals/Slots (einmalig)
  elternThemeSweep(body);     // Dashboard bei Dark-Theme einfärben
  if(termin&&termin.datum)wetterInto("wetter-eltern",termin.datum,termin.ort,termin.uhrzeit); // Wetter am Termin-Ort + Uhrzeit
  if(termin&&termin.typ==="training")elternBetreuungLoad(termin.id,kids); // wer bleibt vor Ort
  if(termin&&termin.typ==="turnier")elternTurnierplanLoad(termin);        // Begegnungen, Turnierbaum, Aushang
  if(termin&&(termin.typ==="spiel"||termin.typ==="turnier"))elternPauseLoad(termin,kids);
  if(!window._eTourChecked){window._eTourChecked=true;setTimeout(elternTourMaybe,700);} // Eltern-Tour einmalig
  kabineCodeHash().catch(()=>{});   // Hash vorladen, damit die Kabine auch offline wieder aufgeht
  adlerkasseLinkGet().then(l=>{const el=document.getElementById("ak-slot");if(!el)return;el.innerHTML=adlerkasseCardHtml(l)+(l?akShareBtnHtml():"");if(l)window._akLink=l;}).catch(()=>{});
  elternMitbringLoad(kids);                    // Event-Mitbringliste: wer bringt was mit
  elternBuedchenLoad(termineListe,kids);       // Büdchen-Einteilung bei Heimspielen
  elternGespraechStatus();                     // laufende Elterngespräch-Anfrage anzeigen
  elternPollLoad();                            // Terminvorschläge des Trainers (Elterngespräch-Doodle)
  fairplayCommitLoad();                        // Fairplay-Codex: Commitment-Status / Bestätigung
  if(termin)elternTickerLoad(termin);          // Liveticker: Team des Kindes automatisch erkennen
  if(typeof pushRenderInto==="function")pushRenderInto("push-slot-eltern","parent"); // Push-An/Aus
  elternMatchGrussLoad(kids);                   // A1/A2: Nach-dem-Spiel-Gruß pro Kind
  if(typeof teamLevelLoad==="function")teamLevelLoad("eltern-level-slot"); // C1: Team-Level
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
/* Schnell-Karussell: alle kommenden Termine als horizontal wischbare Karten, jede mit
   Zusage/Unsicher/Absage je Kind. Nutzt dieselben elternRsvp/elternRsvpClear wie oben. */
function elternTermineCarouselHtml(rows,kids,rsvpAll){
  const upcoming=(rows||[]).slice(0,10);
  if(upcoming.length<2)return ""; // bei nur 1 Termin steht der schon oben mit voller Info
  rsvpAll=rsvpAll||{};
  const cards=upcoming.map(t=>{
    const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
    const d=new Date(t.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
    const rr=rsvpAll[t.id]||{};
    const kidRows=(kids||[]).map(k=>{
      const kd=k.kader||{}, st=rr[k.spieler_id]||null;
      const btns=EP_RSVP_QUICK.map(s=>{
        const on=st===s, c=EP_RSVP[s];
        const act=on?`elternRsvpClear(${t.id},${k.spieler_id})`:`elternRsvp(${t.id},${k.spieler_id},'${s}')`;
        return `<button onclick="${act}" title="${c.lbl}" aria-label="${esc(kd.name||"Kind")}: ${c.lbl}" style="width:36px;height:36px;flex:none;border-radius:9px;border:1.5px solid ${on?c.col:"#e2e8f0"};background:${on?c.col:"#fff"};color:${on?"#fff":"#334155"};font-size:16px;line-height:1;cursor:pointer">${c.emo}</button>`;
      }).join("");
      return `<div style="display:flex;align-items:center;gap:5px;margin-top:7px">
        <span style="flex:1;min-width:0;font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(kd.name||"Kind")}</span>${btns}</div>`;
    }).join("");
    return `<div style="min-width:236px;max-width:250px;flex:none;scroll-snap-align:start;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px">
      <div onclick="terminDetailOpen(${t.id})" style="cursor:pointer">
        <div style="font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.icon} ${esc(t.titel||t.gegner||m.label)}</div>
        <div style="font-size:11px;color:#64748b">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit?" · "+zeit:""}${heimLabel(t)?" · "+heimLabel(t):""}${t.ort?" · "+esc(t.ort):""}</div>
      </div>
      ${kidRows}
      <div onclick="terminDetailOpen(${t.id})" style="cursor:pointer;text-align:right;font-size:11px;font-weight:800;color:#2563eb;margin-top:8px">Alle Infos ›</div>
    </div>`;
  }).join("");
  return `<div style="background:#fff;border-radius:14px;padding:14px 14px 8px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">
    <div style="font-weight:700;margin-bottom:2px">📅 Deine nächsten Termine</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:10px">Schnell 👍 zusagen · 🤔 unsicher · 👎 absagen · „Alle Infos" für Details. Wischen →</div>
    <div style="display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;-webkit-overflow-scrolling:touch">${cards}</div>
  </div>`;
}

/* Großes Termin-Fenster (Eltern): alle Infos zu einem Termin – Adresse, Spielform,
   Rückmeldung je Kind, Betreuung (Training), Büdchen-Einteilung (Heimspiel),
   Nominierungsstatus, Wetter. Aktionen zeichnen das Fenster frisch (terminDetailOpen). */
// Adresse fürs Eltern-Detailfenster: echte Adresse als Karten-Link; beim Heimspiel ohne
// Eintrag die Vereinsadresse; beim Auswärtsspiel ohne Eintrag ein klarer Hinweis.
function tdAdresse(t){
  if(t.ort)return mapsAnchor(t.ort);
  if(t.heim===true)return mapsAnchor(VEREIN_ADRESSE);
  if((t.typ==="spiel"||t.typ==="turnier")&&t.heim===false)return '<span style="color:#b45309">folgt – bitte beim Trainer erfragen</span>';
  return "";
}
async function terminDetailOpen(id){
  const t=(ELTERN_TERMINE||[]).find(x=>Number(x.id)===Number(id)); if(!t){toast("Termin nicht gefunden","err");return;}
  const kids=window._elternKids||[];
  const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
  const d=new Date(t.datum+"T00:00:00");
  const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
  const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
  const istSpiel=(t.typ==="spiel"||t.typ==="turnier");
  const kidIds=kids.map(k=>k.spieler_id);
  let rsvp={};
  try{const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${t.id}&spieler_id=in.(${kidIds.join(",")})&select=spieler_id,status`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>rsvp[x.spieler_id]=x.status);}catch(e){}
  document.getElementById("td-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="td-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Termin-Details");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10040;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:#fff;color:#1a1a2e;max-width:460px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const rsvpRows=kids.map(k=>{
    const kd=k.kader||{}, st=rsvp[k.spieler_id]||null;
    const btns=EP_RSVP_QUICK.map(s=>{const on=st===s,cc=EP_RSVP[s];
      const act=on?`tdRsvp(${t.id},${k.spieler_id},null)`:`tdRsvp(${t.id},${k.spieler_id},'${s}')`;
      return `<button onclick="${act}" style="flex:1;min-width:70px;padding:9px 6px;border-radius:9px;border:1.5px solid ${on?cc.col:"#e2e8f0"};background:${on?cc.col:"#fff"};color:${on?"#fff":"#334155"};font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">${cc.emo} ${cc.lbl}</button>`;
    }).join("");
    return `<div style="margin-top:8px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">${esc(kd.name||"Kind")}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${btns}</div></div>`;
  }).join("");
  const infoRow=(icon,label,val)=> val?`<div style="display:flex;gap:8px;font-size:13px;padding:4px 0"><span style="width:20px">${icon}</span><span style="color:#64748b;min-width:72px">${label}</span><span style="flex:1;font-weight:600;min-width:0">${val}</span></div>`:"";
  const spielformLbl = (istSpiel&&t.spielform)?`${esc(t.spielform)}${t.spieldauer_min?` · ${t.halbzeiten||1}× ${t.spieldauer_min} Min`:""}`:"";
  c.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px">
      <div style="font-size:17px;font-weight:800;min-width:0">${m.icon} ${esc(t.titel||t.gegner||m.label)}</div>
      <button onclick="document.getElementById('td-modal').remove()" style="border:none;background:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1;flex:none">×</button>
    </div>
    <div style="font-size:12.5px;color:#64748b;margin-bottom:10px">${wtag} ${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}${zeit?" · "+zeit:""}</div>
    <div id="td-wetter" style="margin-bottom:6px"></div>
    ${istSpiel?infoRow(t.heim===true?"🏠":t.heim===false?"✈️":"❓","Spielort", t.heim===true?"🏠 Heimspiel":t.heim===false?"✈️ Auswärtsspiel":'<span style="color:#b45309">Heim/Auswärts trägt der Trainer noch nach</span>'):""}
    ${infoRow("📍","Adresse", tdAdresse(t))}
    ${infoRow("🏟️","Platz", t.platz?esc(t.platz):"")}
    ${infoRow("⚽","Spielform", spielformLbl)}
    <div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
      <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">✅ Rückmeldung</div>
      ${rsvpRows||'<div style="font-size:12px;color:#94a3b8">Kein Kind zugeordnet.</div>'}
    </div>
    <div id="td-nom"></div>
    <div id="td-betreuung"></div>
    <div id="td-buedchen"></div>
    ${t.typ==="event"?`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
      <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">🎉 Mitbringliste</div>
      <div style="font-size:11.5px;color:#64748b;margin-bottom:8px">Wer bringt was mit? (Salat, Kuchen, Getränke, Pavillon …)</div>
      <button onclick="tdMitbringGoto()" style="width:100%;min-height:48px;padding:12px;border:1.5px solid #16a34a;border-radius:10px;background:#f0fdf4;color:#15803d;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">🎉 Mitbringliste öffnen</button>
    </div>`:""}
    <button onclick="document.getElementById('td-modal').remove()" style="width:100%;margin-top:14px;padding:11px;border:none;border-radius:10px;background:#f1f5f9;color:#334155;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Schließen</button>`;
  modal.appendChild(c);document.body.appendChild(modal);
  if(t.datum)wetterInto("td-wetter",t.datum,t.ort,t.uhrzeit);
  tdNomLoad(t,kids);
  if(t.typ==="training")tdBetreuungLoad(t,kids);
  if(istSpiel&&t.heim===true)tdBuedchenLoad(t,kids);
}
async function tdRsvp(terminId,spielerId,status){
  try{
    if(status===null){
      const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?termin_id=eq.${terminId}&spieler_id=eq.${spielerId}`,{method:"DELETE",headers:sbAuthHeaders()});
      if(!r.ok){toast("Konnte nicht entfernen","err");return;}
    }else{
      const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:spielerId,status,updated_at:new Date().toISOString()})});
      if(!r.ok){toast("Konnte nicht speichern","err");return;}
      if(status==="zugesagt"){const dd=await xpAward(spielerId,"rsvp","t"+terminId);if(dd>0)setTimeout(()=>toast(`${XP_ICON} +${dd} ${XP_LABEL} gesammelt!`),900);}
    }
  }catch(e){toast("Netzwerkfehler","err");return;}
  terminDetailOpen(terminId); // Fenster frisch zeichnen
}
async function tdNomLoad(t,kids){
  const box=document.getElementById("td-nom"); if(!box)return;
  if(t.typ!=="spiel"&&t.typ!=="turnier"){box.innerHTML="";return;}
  const zeilen=[];
  for(const k of (kids||[])){
    const nm=esc((k.kader&&k.kader.name)||"Kind");
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rpc/kind_nominierungsstatus`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:k.spieler_id,p_datum:t.datum})});
      if(!r.ok)continue; const s=await r.json();
      if(!s||!s.ok)continue;
      let html;
      if(s.eingeteilt){
        // Trainer hat final entschieden.
        if(s.nominiert)          html=`<b style="color:#059669">✅ nominiert – dabei!</b>`;
        else if(s.status==="verletzt") html=`<b style="color:#dc2626">🩹 verletzt – diesmal Pause</b>`;
        else                     html=`<b style="color:#b45309">😌 diesmal pausiert</b>`;
        if(!s.nominiert&&s.grund) html+=`<div style="font-size:11px;color:#64748b">${esc(s.grund)}</div>`;
      }else{
        // Noch keine Entscheidung – nicht als "pausiert" darstellen.
        html=`<span style="color:#64748b">📋 Aufstellung wählt der Trainer noch${s.zugesagt?` · <span style="color:#059669;font-weight:700">deine Zusage liegt vor 👍</span>`:``}</span>`;
      }
      zeilen.push(`<div style="font-size:12.5px;padding:3px 0">${nm}: ${html}</div>`);
    }catch(e){}
  }
  box.innerHTML=zeilen.length?`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px"><div style="font-weight:700;font-size:13.5px;margin-bottom:2px">📋 Kader-Nominierung</div>${zeilen.join("")}<div style="font-size:10.5px;color:#94a3b8;margin-top:5px">Deine Zusage zeigt dem Trainer, wer verfügbar ist. Den endgültigen Kader stellt er daraus zusammen.</div></div>`:"";
}
async function tdBetreuungLoad(t,kids){
  const box=document.getElementById("td-betreuung"); if(!box)return;
  const ids=(kids||[]).map(k=>k.spieler_id);
  let mine={}, board=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/betreuung?termin_id=eq.${t.id}&spieler_id=in.(${ids.join(",")})&select=spieler_id,will_stay`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>mine[x.spieler_id]=x.will_stay);}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/betreuung_board`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:t.id})});if(r.ok)board=((await r.json())||[]).map(x=>x.name);}catch(e){}
  const toggles=(kids||[]).map(k=>{const kd=k.kader||{}, stay=mine[k.spieler_id]===true;
    return `<button onclick="tdBetreuungToggle(${t.id},${k.spieler_id},${stay?"false":"true"})" style="width:100%;margin-top:6px;padding:11px;border:1.5px solid ${stay?"#059669":"#cbd5e1"};border-radius:10px;background:${stay?"#059669":"#fff"};color:${stay?"#fff":"#334155"};font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">${stay?"✅ "+esc(kd.name||"Kind")+" – ich bleibe vor Ort":"🙋 "+esc(kd.name||"Kind")+": ich bleibe vor Ort"}</button>`;}).join("");
  const list=board.length?`<b style="color:#059669">${board.map(esc).join(", ")}</b>`:`<span style="color:#b45309;font-weight:700">noch niemand – bitte helft mit ⚠️</span>`;
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">🙋 Betreuung beim Training</div>
    <div style="font-size:12.5px;margin-bottom:4px">Vor Ort: ${list}</div>${toggles}</div>`;
}
async function tdBetreuungToggle(terminId,spielerId,stay){
  try{const r=await fetch(`${SB_URL}/rest/v1/betreuung?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:spielerId,will_stay:stay,updated_at:new Date().toISOString()})});if(!r.ok){toast("Konnte nicht speichern","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  terminDetailOpen(terminId);
}
async function tdBuedchenLoad(t,kids){
  const box=document.getElementById("td-buedchen"); if(!box)return;
  let fam=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/buedchen_plan`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:t.id})});if(r.ok)fam=await r.json();}catch(e){}
  const meineIds=(kids||[]).map(k=>k.spieler_id);
  const meine=(fam||[]).find(f=>meineIds.includes(f.spieler_id));
  const namen=(fam&&fam.length)?fam.map(f=>esc(f.name)+"s Familie").join(" & "):"– wird eingeteilt –";
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px${meine?";background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:10px 12px":""}">
    <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">🍿 Büdchen (2 Familien)</div>
    <div style="font-size:12.5px">Eingeteilt: <b>${namen}</b></div>
    ${meine?`<div style="margin-top:6px;font-size:12.5px;color:#15803d;font-weight:700">Ihr seid diesmal dran – danke fürs Büdchen! 🙌</div>
      <button onclick="tdBuedchenOptout(${t.id},${meine.spieler_id})" style="width:100%;margin-top:8px;min-height:44px;border:1.5px solid #dc2626;border-radius:10px;background:#fff;color:#dc2626;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Wir können nicht – nächste Familie</button>`:""}</div>`;
}
// Vom Event-Termin-Detail zur Mitbringliste auf dem Dashboard (liegt jetzt weit oben).
function tdMitbringGoto(){
  document.getElementById("td-modal")?.remove();
  const el=document.getElementById("mitbring-slot");
  if(el){ el.scrollIntoView({behavior:"smooth",block:"start"}); try{el.animate([{opacity:.35},{opacity:1}],{duration:500,iterations:2});}catch(e){} }
  else toast("Die Mitbringliste erscheint, sobald das Event näher rückt.");
}
async function tdBuedchenOptout(terminId,spielerId){
  if(!confirm("Ihr könnt beim Büdchen nicht? Dann rückt die nächste Familie nach."))return;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/buedchen_optout`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_termin:terminId,p_spieler:spielerId})});if(sbCheck401(r))return;if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht ändern"),"err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Danke – die nächste Familie rückt nach.");
  terminDetailOpen(terminId);
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
        <div style="font-size:11px;color:#64748b">${twtag} ${td.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${tzeit?" · "+tzeit+" Uhr":""}${heimLabel(t)?" · "+heimLabel(t):""}${t.ort?" · "+esc(t.ort):""}${t.platz?" · 🏟️ "+esc(t.platz):""}</div>
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
  {emo:"🃏", t:"Für dein Kind", d:"Sammelkarte, Technik-Abzeichen (die hakst du zuhause ab), Saison-Rückblick und Fan-Fakten. Dort entscheidest du auch, ob das Foto deines Kindes im „Adler Nest\" und in der Team-Galerie erscheinen darf – ohne dein Häkchen bleiben es nur die Initialen."},
  {emo:"📰", t:"Team, Heft & Adler-Kasse", d:"Der „Adler Nest\" ist unser digitales Stadionheft. Und über „Fan-Link teilen\" schickst du Oma, Opa und Fans den Spenden-Link zur Mannschaftskasse. Viel Spaß! 🎉"},
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
  // z-index über der Kabine (10050), damit die Karte auch aus dem Kinder-Modus sichtbar ist.
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10060;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;overflow-y:auto";
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
async function abzeichenOpen(spielerId,name,kidsMode){
  document.getElementById("abzeichen-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="abzeichen-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Technik-Abzeichen");
  // kidsMode: über der Kabine (10050) sichtbar und ohne Abhak-Buttons (Kinder tragen nichts selbst ein).
  modal.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:${kidsMode?10060:10001};display:flex;flex-direction:column;padding:14px;overflow-y:auto`;
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const card=document.createElement("div");
  card.style.cssText="background:#fff;color:#1a1a2e;max-width:480px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`<div style="font-weight:800;font-size:16px;margin-bottom:2px">🎖️ Technik-Abzeichen${name?" · "+esc(name):""}</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:12px">${kidsMode?`Das hast du schon geschafft! Neue Abzeichen trägt Mama oder Papa im Eltern-Bereich ein – dann gibt's Adler-Federn ${XP_ICON}.`:`Übt zuhause und beim Spielen. Wenn dein Kind ein Abzeichen schafft, hakst du es ab – es gibt Adler-Federn ${XP_ICON}!`}</div>
    <div id="abzeichen-list" style="display:flex;flex-direction:column;gap:8px"><div style="color:#94a3b8;font-size:12px">Lade…</div></div>
    <button class="btn btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('abzeichen-modal').remove()">Schließen</button>`;
  modal.appendChild(card);document.body.appendChild(modal);
  abzeichenRender(spielerId,kidsMode);
}
async function abzeichenRender(spielerId,kidsMode){
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
             :(kidsMode?`<span style="font-size:11px;font-weight:700;color:#94a3b8;white-space:nowrap">noch offen</span>`
             :`<button onclick="abzeichenAward(${spielerId},'${a.id}',this)" style="flex:none;padding:8px 10px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap">Als geschafft eintragen</button>`)}
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
    <div id="kab-arena" style="padding:0 16px 4px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px;align-content:center">
      <button onclick="kabineQuiz('taktik')" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎯</span>Taktik-Quiz</button>
      <button onclick="kabineQuiz('wissen')" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🧠</span>Fußball-Wissen</button>
      <button onclick="kabineShowGallery()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🖼️</span>Team-Galerie</button>
      <button onclick="kabineShowQuests()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🏆</span>Missionen</button>
      <button onclick="kabineMyCard()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🃏</span>Meine Karte</button>
      <button onclick="kabineAbzeichen()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎖️</span>Abzeichen</button>
      <button onclick="kabineSkillWoche()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎬</span>Skill der Woche</button>
      <button onclick="kabineHype()" style="border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;min-height:120px"><span style="font-size:44px">🎵</span>Kabinen-Hype</button>
      <button onclick="kabineAlbum()" style="grid-column:1/-1;border:none;border-radius:22px;background:rgba(255,255,255,.12);color:#fff;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;font-size:17px;font-weight:800;min-height:76px"><span style="font-size:34px">📖</span>Sammelalbum</button>
    </div>
    </div>
    <button onclick="kabineExit()" style="margin:0 16px 18px;padding:12px;border:none;border-radius:14px;background:rgba(0,0,0,.25);color:#fff;font-family:inherit;font-size:14px;cursor:pointer">🔒 Für Erwachsene: Kabine verlassen</button>`;
  teamLevelLoad("kab-level");                                  // C1: Team-Level
  if(typeof arenaKabineLoad==="function")arenaKabineLoad("kab-arena"); // C3: Einlauf-Song/Schlachtruf
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


