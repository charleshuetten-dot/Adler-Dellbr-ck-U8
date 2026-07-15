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
  const s=el.style, d=el.dataset; if(!s)return;
  if(d.elSwept)return;   // schon eingefärbt – Original in data-el-* bleibt gesichert
  let changed=false;
  const bg=_elRgb(s.backgroundColor);
  if(bg&&_elLum(bg)>216){ d.elBg=s.backgroundColor; s.backgroundColor=_elMix(bg,[17,24,39],0.90); changed=true; }   // helle Fläche → dunkel
  const col=_elRgb(s.color);
  if(col){ const L=_elLum(col);
    if(L<60){ d.elCol=s.color; s.color=_elMix(col,[226,232,240],0.86); changed=true; }        // fast-schwarze Tinte → deutlich hell
    else if(L<128){ d.elCol=s.color; s.color=_elMix(col,[226,232,240],0.5); changed=true; }   // dunkle Marken-/Textfarbe → aufhellen
  }
  ["Top","Right","Bottom","Left"].forEach(side=>{ const p="border"+side+"Color";
    const b=_elRgb(s[p]); if(b&&_elLum(b)>205){ d["elB"+side]=s[p]; s[p]=_elMix(b,[51,65,85],0.72); changed=true; }
  });
  if(changed)d.elSwept="1";
}
/* Zurücksetzen bei Dunkel→Hell: der Sweep hat Inline-Farben überschrieben (Original in
   data-el-* gesichert). Deckt auch Kopfzeile/Rahmen ab, die elternDashLoad NICHT neu
   rendert – dort blieb der Hintergrund sonst dunkel hängen (Toggle-Bug). */
function _elUnsweepOne(el){
  const s=el.style, d=el.dataset; if(!s||!d.elSwept)return;
  if("elBg" in d){ s.backgroundColor=d.elBg; delete d.elBg; }
  if("elCol" in d){ s.color=d.elCol; delete d.elCol; }
  ["Top","Right","Bottom","Left"].forEach(side=>{ const k="elB"+side; if(k in d){ s["border"+side+"Color"]=d[k]; delete d[k]; } });
  delete d.elSwept;
}
function elternThemeRestore(root){
  root=root||document.body; if(!root||root.nodeType!==1)return;
  if(root.dataset&&root.dataset.elSwept)_elUnsweepOne(root);
  const list=root.querySelectorAll?root.querySelectorAll("[data-el-swept]"):[];
  for(const el of list)_elUnsweepOne(el);
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
  else { elternThemeRestore(document.body); if(typeof elternDashLoad==="function")elternDashLoad(); } // hell: Inline-Farben überall zurücksetzen (auch Kopfzeile) + Dashboard neu
}
/* Kategorie-Fenster: die Panels liegen (versteckt) im #el-cat-overlay im DOM (damit die
   Async-Loader ihre Slots füllen); der Button zeigt nur das gewählte Panel im Vollbild-Overlay. */
function elternCatOpen(id){
  const ov=document.getElementById("el-cat-overlay"); if(!ov)return;
  const T={todo:"📌 Zu erledigen",mehr:"📰 Mehr vom Team",regeln:"📋 Regeln & Vereinbarungen",datenschutz:"🔒 Datenschutz & Freigaben",kontakt:"⚙️ Kontakt & Benachrichtigungen"};
  ov.querySelectorAll(".el-cat-panel").forEach(p=>p.style.display="none");
  const panel=document.getElementById("cat-"+id); if(panel)panel.style.display="block";
  const ttl=document.getElementById("el-cat-title"); if(ttl)ttl.textContent=T[id]||"";
  ov.style.display="block"; ov.scrollTop=0;
  if(typeof elternDarkActive==="function"&&elternDarkActive()&&typeof elternThemeSweep==="function")elternThemeSweep(ov);
}
function elternCatClose(){ const ov=document.getElementById("el-cat-overlay"); if(ov)ov.style.display="none"; }
/* „Zu erledigen"-Button aus-/einblenden + Zähler: nur zeigen, wenn mind. ein Slot gefüllt ist. */
function elternTodoSync(){
  const btn=document.getElementById("eltern-todo-btn"); if(!btn)return;
  const n=["eltern-checklist-slot","mitbring-slot","buedchen-slot","puls-nudge-slot"].filter(id=>{const el=document.getElementById(id);return el&&el.innerHTML.trim().length>0;}).length;
  btn.style.display=n?"flex":"none";
  const b=document.getElementById("eltern-todo-badge"); if(b)b.textContent=n?String(n):"";
}
async function elternDashLoad(){
  const body=document.getElementById("ep-dash-body");
  if(!body)return;
  const card=(inner)=>`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05)">${inner}</div>`;
  const heute=new Date().toISOString().slice(0,10);
  // UX 3: kam der Elternteil über einen Deep-Link (?rsvp=…)? Dann Nudge erzwingen + hinscrollen.
  let rsvpIntent=null; try{rsvpIntent=sessionStorage.getItem("adler_rsvp_intent");}catch(e){}
  let kids=[], termin=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?select=spieler_id,label,kader(id,name,nr,foto_stadionheft_ok)`,{headers:sbAuthHeaders()});if(r.ok)kids=await r.json();}catch(e){}
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
  // ── 📌 ZU ERLEDIGEN: alle offenen Punkte gebündelt, ganz oben. Die Loader füllen die Slots;
  //    ist alles leer, blendet elternTodoSync() die ganze Sektion aus. ──
  // 📌 To-Do's als Kategorie-Button (optisch wie die Kategorien unten); Inhalt öffnet sich im
  //    Overlay-Panel #cat-todo. Sichtbar nur, wenn offene Punkte da sind (elternTodoSync nach den Loadern).
  html+=`<button id="eltern-todo-btn" onclick="elternCatOpen('todo')" style="display:none;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:10px;border:none;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(217,119,6,.25)">
    <span style="font-size:22px;line-height:1">📌</span>
    <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:800">Zu erledigen</span><span style="display:block;font-size:11.5px;opacity:.92;margin-top:1px">Rückmeldungen, Mitbringen, Büdchen, „Wie war's"</span></span>
    <span id="eltern-todo-badge" style="background:#fff;color:#d97706;font-weight:800;font-size:12px;border-radius:12px;padding:2px 9px"></span>
    <span style="font-size:18px;opacity:.85">›</span>
  </button>`;
  html+=`<div id="match-gruss-slot"></div>`;  // A1: persönlicher Nach-dem-Spiel-Gruß (positiv, kein To-Do)
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
        return `<button onclick="${act}" style="flex:1;min-width:0;min-height:44px;padding:6px 3px;border-radius:10px;border:1.5px solid ${on?c.col:"#e2e8f0"};background:${on?c.col:"#fff"};color:${on?"#fff":"#334155"};font-family:inherit;font-size:11.5px;font-weight:700;line-height:1.15;cursor:pointer">${c.emo} ${c.lbl}</button>`;
      }).join("");
      return `<div style="border-top:1px solid #f1f5f9;margin-top:10px;padding-top:10px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-weight:700;font-size:14px">${esc(kd.name||"Kind")}</span>
          ${kd.nr!=null?`<span style="color:#94a3b8;font-weight:600;font-size:12px">#${kd.nr}</span>`:""}
          <span style="margin-left:auto;font-size:11.5px;font-weight:700;color:${st?EP_RSVP[st].col:"#b45309"}">${st?EP_RSVP[st].emo+" "+EP_RSVP[st].lbl:"❗ offen"}</span>
        </div>
        <div style="display:flex;gap:6px">${btns}</div>
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
      ${kids.length>=2?`<button onclick="elternRsvpAllYes(${termin.id})" style="width:100%;min-height:44px;margin-top:10px;padding:9px;border:1.5px solid #059669;border-radius:10px;background:#f0fdf4;color:#15803d;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">👍 Alle ${kids.length} Kinder zusagen</button>`:""}
      ${rsvpRows}
      <div style="font-size:10.5px;color:#94a3b8;margin-top:8px">Aktiven Status nochmal tippen = Rückmeldung entfernen. Deine Rückmeldung ist ein Hinweis – die endgültige Aufstellung entscheidet der Trainer.</div>
      ${termin.typ==="training"?'<div id="betreuung-card"></div>':""}
      ${termin.typ==="turnier"?'<div id="turnierplan-card"></div>':""}
      ${(termin.datum===heute&&(termin.typ==="spiel"||termin.typ==="turnier"))?elternTickerHtml(termin):""}
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button onclick="galerieOpen(${termin.id},'${(termin.titel||termin.gegner||m.label).replace(/'/g,'')}')" style="flex:1;min-width:130px;padding:9px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#7c3aed;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📸 Event-Fotos</button>
        <button onclick="elternTermineOpen()" style="flex:1;min-width:130px;padding:9px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📅 Alle Termine</button>
      </div>
    </div>`;
  }
  const sec=(t)=>`<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8;margin:18px 4px 8px">${t}</div>`;
  // ── TERMINE ── (Karussell + Kalender-Abo)
  html+=sec("📅 Termine");
  html+=elternTermineCarouselHtml(termineListe,kids,rsvpAll); // Schnell-Zu-/Absage für alle Termine (deckt „kommende Termine × Kinder" ab)
  html+=card(`<button onclick="elternTermineOpen()" style="width:100%;min-height:46px;padding:12px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer">📅 Alle Termine &amp; Kalender-Abo</button>`);
  // ── FÜR DIE KINDER ──
  html+=sec("🎮 Für die Kinder");
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🎮 Die Kabine (Kinder-Modus)</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Team-Galerie, Missionen und das Fußball-Quiz (${XP_ICON} Federn sammeln).</div>
    <button onclick="kabineOpen()" style="display:block;width:100%;min-height:48px;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-weight:800;font-size:14px;font-family:inherit;cursor:pointer">🎮 Kabine öffnen</button>`);
  html+=`<div id="eltern-level-slot" style="margin-bottom:12px"></div>`;  // C1: kollektives Team-Level
  html+=`<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin:2px 2px 6px">Dein Kind</div>`;
  html+=kids.map(k=>{const kd=k.kader||{};
    const nn=(kd.name||"").replace(/'/g,"");
    // Sekundär-Aktionen als kompaktes 2-Spalten-Raster (halbiert die Höhe pro Kind).
    const gBtn=(label,onclick,border,bg,color)=>`<button onclick="${onclick}" style="flex:1 1 calc(50% - 4px);min-width:130px;min-height:44px;padding:8px;border:1.5px solid ${border};border-radius:10px;background:${bg};color:${color};font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">${label}</button>`;
    return card(`<div style="font-weight:700;font-size:15px;margin-bottom:2px">${esc(kd.name||"Kind")}${kd.nr!=null?` <span style="color:#94a3b8;font-weight:600">#${kd.nr}</span>`:""}</div>
      <div id="xp-chip-${k.spieler_id}" style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:8px"></div>
      <button onclick="elternCardOpen(${k.spieler_id})" style="width:100%;min-height:44px;padding:11px;border:none;border-radius:10px;background:#1e3a8a;color:#fff;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer">🃏 Adler-Karte ansehen</button>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
        ${gBtn("🎖️ Abzeichen",`abzeichenOpen(${k.spieler_id},'${nn}')`,"#f59e0b","#fffbeb","#b45309")}
        ${gBtn("🎧 Sprachlob",`lobPlay(${k.spieler_id})`,"#db2777","#fdf2f8","#be185d")}
        ${gBtn("✏️ Fan-Fakten",`elternFanfactsOpen(${k.spieler_id},'${nn}')`,"#64748b","#fff","#475569")}
        ${gBtn("📊 Saison-Statistik",`childWrappedShare(${k.spieler_id})`,"#7c3aed","#fff","#7c3aed")}
      </div>`);
  }).join("");
  // ── MEHR VOM TEAM (einklappbar – Referenz/Selteneres, weniger Scrollen) ──
  let kasse=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/kasse_summary`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:"{}"});if(r.ok)kasse=await r.json();}catch(e){}
  // ── Kategorie-Buttons: öffnen je ein fokussiertes Fenster (statt Inline-Akkordeon). Die
  //    Inhalte liegen (versteckt) im Overlay, damit die Async-Loader ihre Slots weiter füllen. ──
  const catBtn=(id,emoji,title,desc,grad)=>`<button onclick="elternCatOpen('${id}')" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;margin-bottom:8px;border:none;border-radius:14px;background:${grad};color:#fff;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.08)"><span style="font-size:22px;line-height:1">${emoji}</span><span style="flex:1;min-width:0"><span style="display:block;font-size:14px;font-weight:800">${title}</span><span style="display:block;font-size:11.5px;opacity:.92;margin-top:1px">${desc}</span></span><span style="font-size:18px;opacity:.85">›</span></button>`;
  html+=sec("Mehr");
  html+=catBtn('mehr','📰','Mehr vom Team','Adler Nest, Börse, Fundbüro, Kasse','linear-gradient(135deg,#1e3a8a,#2563eb)');
  html+=catBtn('regeln','📋','Regeln &amp; Vereinbarungen','Fairplay-Codex &amp; Eltern-Leitfaden','linear-gradient(135deg,#16a34a,#059669)');
  html+=catBtn('datenschutz','🔒','Datenschutz &amp; Freigaben','Foto/Video, Notfallkarte, Datenexport','linear-gradient(135deg,#7c3aed,#6d28d9)');
  html+=catBtn('kontakt','⚙️','Kontakt &amp; Benachrichtigungen','Elterngespräch, Push, Einstellungen','linear-gradient(135deg,#475569,#334155)');
  html+=`<div id="el-cat-overlay" style="display:none;position:fixed;inset:0;z-index:10000;background:var(--bg,#f1f5f9);overflow-y:auto"><div style="max-width:560px;margin:0 auto;padding:12px 16px 40px">
    <div style="display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg,#f1f5f9);padding:8px 0 10px;z-index:1">
      <button onclick="elternCatClose()" aria-label="Zurück" style="border:none;background:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;color:#334155;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);flex:none">←</button>
      <div id="el-cat-title" style="font-size:17px;font-weight:800"></div>
    </div>
    <div id="cat-todo" class="el-cat-panel" style="display:none">
      <div id="eltern-checklist-slot"></div>
      <div id="mitbring-slot"></div>
      <div id="buedchen-slot"></div>
      <div id="puls-nudge-slot"></div>
    </div>
    <div id="cat-mehr" class="el-cat-panel" style="display:none">`;
  html+=card(`<div style="font-weight:700;margin-bottom:6px">📰 Adler Nest (Stadionheft)</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Das digitale Stadionheft mit Neuigkeiten, Ergebnissen und Geburtstagen.</div>
    <a href="${location.pathname}?heft" style="display:block;text-align:center;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;text-decoration:none">📰 Adler Nest öffnen</a>`);
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🛍️ Adler-Börse</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Zu kleine Schuhe oder Trikots? Gib sie an ein anderes Adler-Kind weiter.</div>
    <button onclick="boerseOpen()" style="width:100%;padding:11px;border:1.5px solid #2563eb;border-radius:10px;background:#fff;color:#1d4ed8;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Börse öffnen</button>`);
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🧦 Fundbüro</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Trinkflasche verschwunden? Jacke gefunden? Hier sammelt das Team.</div>
    <button onclick="fundbueroOpen()" style="width:100%;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Fundbüro öffnen</button>`);
  html+=`<div id="skill-slot"></div>`;        // Skill der Woche
  if(WAESCHE_AKTIV)html+=`<div id="waesche-slot"></div>`;  // Trikot-Wäsche-Rotator (aktuell ausgeblendet)
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
  html+=`</div>`; // /cat-mehr
  html+=`<div id="cat-regeln" class="el-cat-panel" style="display:none">`;
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🤝 Unser Fairplay-Codex</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Die Regeln, damit der Spielfeldrand ein guter Ort für die Kinder bleibt.</div>
    <button onclick="fairplayOpen()" style="width:100%;min-height:48px;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">Codex ansehen</button>
    <div id="fp-commit-slot" style="margin-top:10px"></div>
    <button onclick="fairplayQuizStart(window._elternKids||[])" style="width:100%;min-height:48px;margin-top:10px;padding:13px;border:1.5px solid #16a34a;border-radius:10px;background:#fff;color:#15803d;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer">🏅 Fairplay-Quiz spielen · ${XP_ICON} 50 Federn fürs Kind</button>`);
  html+=card(`<div style="font-weight:700;margin-bottom:6px">📖 ${esc(LEITFADEN_NAME)}</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Unsere ausformulierten Vereinbarungen: Pünktlichkeit, Aufsicht, Büdchen, Verhalten am Platz, App-Nutzung und mehr – jederzeit zum Nachlesen.</div>
    <button onclick="leitfadenOpen()" style="width:100%;min-height:48px;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">${esc(LEITFADEN_NAME)} öffnen</button>`);
  html+=`</div>`; // /cat-regeln
  // ── DATENSCHUTZ & FREIGABEN (NEU): Foto/Video + Notfallkarte pro Kind + Datenexport ──
  html+=`<div id="cat-datenschutz" class="el-cat-panel" style="display:none">`;
  html+=card(`<div style="font-weight:700;margin-bottom:6px">📸 Foto- &amp; Video-Freigabe</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Entscheide pro Kind getrennt, wo Bilder und Videos gezeigt werden dürfen (app-intern / Trainingsvideos / öffentlich) – jederzeit widerrufbar.</div>
    ${kids.map(k=>{const nn=((k.kader&&k.kader.name)||"").replace(/'/g,"");return `<button onclick="elternFotoConsentOpen(${k.spieler_id},'${nn}')" style="display:block;width:100%;min-height:44px;margin-bottom:6px;padding:10px;border:1.5px solid #7c3aed;border-radius:10px;background:#faf5ff;color:#6d28d9;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📸 ${esc((k.kader&&k.kader.name)||"Kind")}: Freigabe verwalten</button>`;}).join("")}`);
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🚑 Notfallkarte</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Allergien, Medikamente und ein Notfallkontakt pro Kind – sieht ausschließlich das Trainerteam.</div>
    ${kids.map(k=>{const nn=((k.kader&&k.kader.name)||"").replace(/'/g,"");return `<button onclick="notfallOpen(${k.spieler_id},'${nn}')" style="display:block;width:100%;min-height:44px;margin-bottom:6px;padding:10px;border:1.5px solid #dc2626;border-radius:10px;background:#fef2f2;color:#b91c1c;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🚑 ${esc((k.kader&&k.kader.name)||"Kind")}: Notfallkarte</button>`;}).join("")}`);
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🔒 Meine Daten</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Lade alle bei uns gespeicherten Daten deines Kindes als Datei herunter (Rückmeldungen, Federn, Metadaten).</div>
    <button onclick="elternDataExport(this)" style="width:100%;min-height:44px;padding:11px;border:1.5px solid #64748b;border-radius:10px;background:#fff;color:#475569;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Daten herunterladen (JSON)</button>`);
  html+=`</div>`; // /cat-datenschutz
  html+=`<div id="cat-kontakt" class="el-cat-panel" style="display:none">`;
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🗣️ Elterngespräch</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Du möchtest mit dem Trainer über dein Kind sprechen? Sag kurz Bescheid – der Trainer meldet sich zur Terminabstimmung.</div>
    <div id="eg-slot"></div>
    <button onclick="elternGespraechOpen()" style="width:100%;padding:11px;border:1.5px solid #7c3aed;border-radius:10px;background:#fff;color:#7c3aed;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">Elterngespräch anfragen</button>`);
  html+=`<div id="eltern-poll-slot"></div>`; // Terminvorschläge des Trainers fürs Elterngespräch
  html+=card(`<div style="font-weight:700;margin-bottom:6px">🔔 Benachrichtigungen</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:8px">Erinnerungen an Termine, offene Rückmeldungen und Neuigkeiten direkt aufs Handy.</div>
    <div id="push-slot-eltern"></div>`);
  html+=`</div>`; // /cat-kontakt
  html+=`</div></div>`; // /el-cat-overlay
  body.innerHTML=html;
  try{ const tb=document.getElementById("cat-todo"); if(tb){ new MutationObserver(elternTodoSync).observe(tb,{childList:true,subtree:true}); elternTodoSync(); } }catch(e){}
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
  pulsNudgeLoad();         // Puls-Erinnerung fürs jüngste Event ohne Feedback
  elternChecklistLoad(kids); // „Erste Schritte"-Checkliste (Adoption)
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
// Komfort für Mehrkind-Familien: alle eigenen Kinder mit einem Tap zusagen (nur die positive
// Sammel-Aktion, daher ohne Grund-Nachfrage). Federn je Kind idempotent, danach EIN Reload.
async function elternRsvpAllYes(terminId){
  const kids=window._elternKids||[]; let ok=0;
  for(const k of kids){
    try{
      const r=await fetch(`${SB_URL}/rest/v1/rueckmeldungen?on_conflict=termin_id,spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,spieler_id:k.spieler_id,status:"zugesagt",updated_at:new Date().toISOString()})});
      if(r.ok){ok++; xpAward(k.spieler_id,"rsvp","t"+terminId).catch(()=>{});}
    }catch(e){}
  }
  if(ok){toast(`👍 ${ok} Kind${ok>1?"er":""} zugesagt`); try{navigator.vibrate&&navigator.vibrate([30,40,30]);}catch(e){}}
  else toast("Konnte nicht speichern","err");
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
    const btns=Object.keys(EP_RSVP).map(s=>{const on=st===s,cc=EP_RSVP[s];
      const act=on?`tdRsvp(${t.id},${k.spieler_id},null)`:`tdRsvp(${t.id},${k.spieler_id},'${s}')`;
      return `<button onclick="${act}" style="flex:1;min-width:0;min-height:44px;padding:6px 3px;border-radius:9px;border:1.5px solid ${on?cc.col:"#e2e8f0"};background:${on?cc.col:"#fff"};color:${on?"#fff":"#334155"};font-family:inherit;font-size:11.5px;font-weight:700;line-height:1.15;cursor:pointer">${cc.emo} ${cc.lbl}</button>`;
    }).join("");
    return `<div style="margin-top:8px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">${esc(kd.name||"Kind")}</div><div style="display:flex;gap:6px">${btns}</div></div>`;
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
    ${(t.ort||t.heim===true)?routeBtn(t.ort||VEREIN_ADRESSE,{block:true}):""}
    ${infoRow("🏟️","Platz", t.platz?esc(t.platz):"")}
    ${infoRow("⚽","Spielform", spielformLbl)}
    <div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
      <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">✅ Rückmeldung</div>
      ${rsvpRows||'<div style="font-size:12px;color:#94a3b8">Kein Kind zugeordnet.</div>'}
    </div>
    <div id="td-nom"></div>
    <div id="td-betreuung"></div>
    <div id="td-buedchen"></div>
    <div id="td-helfer"></div>
    <div id="td-puls"></div>
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
  tdHelferLoad(t); // G4: Elternhelfer-Board (nur kommende Termine)
  tdPulsLoad(t); // F4: Eltern-Puls (nur bei vergangenem Training/Spiel)
}
/* F4: Eltern-Puls – anonyme 1-Tap-Stimmung nach Training/Spiel. Der Trainer sieht nur das
   Aggregat (puls_aggregate, keine user_ids). Ein Datensatz pro Elternteil/Termin (upsert). */
async function tdPulsLoad(t){
  const box=document.getElementById("td-puls"); if(!box)return;
  const today=new Date().toISOString().slice(0,10);
  if(!(["training","spiel","turnier"].includes(t.typ)&&t.datum<=today)){box.innerHTML="";return;}
  let mine=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/event_puls?termin_id=eq.${t.id}&select=mood,kommentar`,{headers:sbAuthHeaders()});if(r.ok){mine=(await r.json())[0]||null;}}catch(e){}
  tdPulsRender(t.id,mine);
}
function tdPulsRender(terminId,mine,bare){
  const box=document.getElementById("td-puls"); if(!box)return;
  const moods=[{v:3,e:"😀",l:"Top"},{v:2,e:"😐",l:"Ok"},{v:1,e:"😟",l:"Naja"}];
  const cur=mine?mine.mood:null;
  box.dataset.mood=cur||"";
  box.innerHTML=`<div style="${bare?"":"border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px"}">
    ${bare?"":`<div style="font-weight:700;font-size:13.5px;margin-bottom:2px">🌡️ Wie war's? <span style="font-weight:400;color:#94a3b8;font-size:11px">(anonym, nur fürs Trainerteam)</span></div>`}
    <div style="display:flex;gap:8px;margin:8px 0">
      ${moods.map(mo=>{const on=cur===mo.v;return `<button onclick="tdPulsSave(${terminId},${mo.v})" style="flex:1;padding:10px 6px;border-radius:10px;border:1.5px solid ${on?"#1e3a8a":"#e2e8f0"};background:${on?"#eef2ff":"#fff"};cursor:pointer;font-family:inherit"><div style="font-size:22px">${mo.e}</div><div style="font-size:10px;color:#64748b">${mo.l}</div></button>`;}).join("")}
    </div>
    <input id="td-puls-txt" type="text" maxlength="200" value="${mine&&mine.kommentar?esc(mine.kommentar):""}" placeholder="Optional: ein Satz Feedback…" onblur="tdPulsSaveText(${terminId})" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;box-sizing:border-box">
    <div id="td-puls-done" style="font-size:11px;color:#16a34a;margin-top:4px">${cur?"Danke fürs Feedback ✓":""}</div>
  </div>`;
}
async function tdPulsSave(terminId,mood){
  const txt=(document.getElementById("td-puls-txt")?.value||"").trim().slice(0,200);
  try{
    const r=await fetch(`${SB_URL}/rest/v1/event_puls?on_conflict=termin_id,user_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,mood,kommentar:txt||null})});
    if(!r.ok){toast("Konnte nicht speichern","err");return;}
    tdPulsRender(terminId,{mood,kommentar:txt});
    try{navigator.vibrate&&navigator.vibrate(40);}catch(e){}
  }catch(e){toast("Netzwerkfehler","err");}
}
async function tdPulsSaveText(terminId){
  const box=document.getElementById("td-puls"); const mood=box&&box.dataset.mood?Number(box.dataset.mood):0;
  if(!mood)return; // Stimmung zuerst wählen (mood ist Pflicht)
  const txt=(document.getElementById("td-puls-txt")?.value||"").trim().slice(0,200);
  try{await fetch(`${SB_URL}/rest/v1/event_puls?on_conflict=termin_id,user_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({termin_id:terminId,mood,kommentar:txt||null})});}catch(e){}
}

/* „Erste Schritte"-Checkliste: führt neue Familien durch die Einrichtung (Push, Notfallkarte,
   Foto-Freigabe, Fairplay-Codex). Erkennt den Status live; ausblendbar bis zum nächsten Tag;
   verschwindet ganz, sobald alles erledigt ist. Treibt die Adoption der Eltern-Features. */
async function elternChecklistLoad(kids){
  const slot=document.getElementById("eltern-checklist-slot"); if(!slot)return;
  kids=kids||[];
  try{ if(localStorage.getItem("adler_setup_hide")===new Date().toISOString().slice(0,10)){slot.innerHTML="";return;} }catch(e){}
  let committed=false; const notfallIds=new Set();
  try{const r=await fetch(`${SB_URL}/rest/v1/fairplay_commit?select=committed_at&limit=1`,{headers:sbAuthHeaders()});if(r.ok)committed=((await r.json())||[]).length>0;}catch(e){}
  try{const ids=kids.map(k=>k.spieler_id).join(",");if(ids){const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?spieler_id=in.(${ids})&select=spieler_id`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>notfallIds.add(x.spieler_id));}}catch(e){}
  const pushOn=(typeof Notification!=="undefined"&&Notification.permission==="granted");
  const fotoAll=kids.length>0&&kids.every(k=>k.kader&&k.kader.foto_stadionheft_ok);
  const notfallAll=kids.length>0&&kids.every(k=>notfallIds.has(k.spieler_id));
  const k0=kids[0]||{}, n0=((k0.kader&&k0.kader.name)||"").replace(/'/g,"");
  const items=[
    {done:pushOn,     icon:"🔔", label:"Benachrichtigungen aktivieren", act:`pushSubscribe('parent').then(ok=>{if(ok)elternChecklistLoad(window._elternKids||[]);})`},
    {done:notfallAll, icon:"🚑", label:"Notfallkarte hinterlegen",       act:`notfallOpen(${k0.spieler_id},'${n0}')`},
    {done:fotoAll,    icon:"📸", label:"Foto-Freigabe klären",           act:`elternFotoConsentOpen(${k0.spieler_id},'${n0}')`},
    {done:committed,  icon:"🤝", label:"Fairplay-Codex bestätigen",       act:`fairplayOpen()`}
  ];
  const open=items.filter(i=>!i.done).length;
  if(open===0){ slot.innerHTML=""; return; }
  const total=items.length, done=total-open;
  const rows=items.map(i=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #f1f5f9">
      <span style="font-size:18px;width:24px;text-align:center">${i.done?"✅":i.icon}</span>
      <span style="flex:1;font-size:13px;${i.done?"color:#94a3b8;text-decoration:line-through":"font-weight:600"}">${i.label}</span>
      ${i.done?'<span style="font-size:11px;color:#16a34a;font-weight:700">erledigt</span>':`<button onclick="${i.act}" style="padding:6px 12px;border:1.5px solid #1e3a8a;border-radius:8px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">öffnen</button>`}
    </div>`).join("");
  slot.innerHTML=`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05);border:1.5px solid #bfdbfe">
    <div style="display:flex;align-items:center;gap:8px"><div style="font-weight:800;font-size:14px">🚀 Erste Schritte</div><span style="margin-left:auto;font-size:11px;color:#64748b">${done}/${total} erledigt</span></div>
    <div style="height:6px;background:#e2e8f0;border-radius:4px;margin:8px 0;overflow:hidden"><div style="height:100%;width:${Math.round(done/total*100)}%;background:#16a34a;transition:width .3s"></div></div>
    ${rows}
    <button onclick="elternChecklistDismiss()" style="width:100%;margin-top:10px;padding:8px;border:none;background:none;color:#94a3b8;font-family:inherit;font-size:11.5px;cursor:pointer">Später · für heute ausblenden</button>
  </div>`;
}
function elternChecklistDismiss(){ try{localStorage.setItem("adler_setup_hide",new Date().toISOString().slice(0,10));}catch(e){} const s=document.getElementById("eltern-checklist-slot"); if(s)s.innerHTML=""; }
/* Puls-Erinnerung: sanfter Nudge für das jüngste vergangene Training/Spiel (≤14 Tage), zu dem
   dieser Elternteil noch KEIN Puls-Feedback gegeben hat. Ein Tap genügt (nutzt tdPulsRender/Save). */
async function pulsNudgeLoad(){
  const slot=document.getElementById("puls-nudge-slot"); if(!slot)return;
  const heute=new Date().toISOString().slice(0,10);
  const vor14=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  let evs=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=id,typ,titel,gegner,datum&typ=in.(training,spiel,turnier)&datum=lt.${heute}&datum=gte.${vor14}&order=datum.desc&limit=6`,{headers:sbAuthHeaders()});if(r.ok)evs=await r.json();}catch(e){}
  if(!evs.length)return;
  let answered=new Set();
  try{const ids=evs.map(e=>e.id).join(",");const r=await fetch(`${SB_URL}/rest/v1/event_puls?termin_id=in.(${ids})&select=termin_id`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(x=>answered.add(x.termin_id));}catch(e){}
  const first=evs.find(e=>!answered.has(e.id));
  if(!first)return;
  const m=(typeof TM_META!=="undefined"&&TM_META[first.typ])||{icon:"📅",label:first.typ};
  const d=new Date(first.datum+"T00:00:00"), ds=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()]+", "+d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"});
  slot.innerHTML=`<div style="background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,.05);border:1.5px solid #bfdbfe">
    <div style="font-weight:700;font-size:14px;margin-bottom:2px">🌡️ Wie war ${m.icon} ${esc(first.titel||first.gegner||m.label)}?</div>
    <div style="font-size:11.5px;color:#64748b">${ds} · anonym, nur fürs Trainerteam – ein Tap genügt.</div>
    <div id="td-puls"></div>
  </div>`;
  tdPulsRender(first.id,null,true);
}
/* G4: Elternhelfer-Board – pro kommendem Termin tragen sich Eltern für Aufgaben ein
   (Fahren, Aufbau, Fotografieren …). Alle eingeloggten sehen die Liste (Koordination). */
const HELFER_TASKS=["🚗 Fahren","🛠️ Aufbau","📸 Fotografieren","🥤 Getränke","👀 Betreuung","🧺 Wäsche"];
function _sbUid(){ try{const t=sbToken();return t?JSON.parse(atob(t.split(".")[1])).sub:null;}catch(e){return null;} }
function _helferName(){ const kids=window._elternKids||[]; const n=(kids[0]&&kids[0].kader&&kids[0].kader.name)?kids[0].kader.name:"Unsere"; return n+" Familie"; }
async function tdHelferLoad(t){
  const box=document.getElementById("td-helfer"); if(!box)return;
  if(t.datum<new Date().toISOString().slice(0,10)){box.innerHTML="";return;} // nur kommende Events
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/event_helfer?termin_id=eq.${t.id}&select=id,name,aufgabe,user_id&order=created_at.asc`,{headers:sbAuthHeaders()});if(r.ok)rows=await r.json();}catch(e){}
  const uid=_sbUid();
  const mine=new Set(rows.filter(x=>x.user_id===uid).map(x=>x.aufgabe));
  const list=rows.length?rows.map(x=>`<div style="display:flex;align-items:center;gap:6px;font-size:12.5px;padding:3px 0">
      <span style="flex:1">${esc(x.aufgabe)} · <b>${esc(x.name)}</b></span>
      ${x.user_id===uid?`<button onclick="tdHelferDel(${x.id},${t.id})" style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:14px">✕</button>`:""}
    </div>`).join(""):'<div style="font-size:12px;color:#94a3b8">Noch niemand eingetragen – mach den Anfang!</div>';
  const buttons=HELFER_TASKS.map(task=>{const on=mine.has(task);const esct=task.replace(/'/g,"");
    return `<button onclick="${on?`tdHelferDelTask(${t.id},'${esct}')`:`tdHelferAdd(${t.id},'${esct}')`}" style="padding:7px 10px;border-radius:9px;border:1.5px solid ${on?"#16a34a":"#e2e8f0"};background:${on?"#f0fdf4":"#fff"};color:${on?"#15803d":"#334155"};font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">${on?"✓ ":""}${esc(task)}</button>`;}).join("");
  box.innerHTML=`<div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:10px">
    <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">🙌 Wer hilft mit?</div>
    <div style="font-size:11px;color:#64748b;margin-bottom:6px">Tippe eine Aufgabe an, um dich (als „${esc(_helferName())}") einzutragen.</div>
    ${list}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${buttons}</div>
  </div>`;
}
function _helferReload(terminId){ const t=(ELTERN_TERMINE||[]).find(x=>Number(x.id)===Number(terminId))||{id:terminId,datum:new Date().toISOString().slice(0,10)}; tdHelferLoad(t); }
async function tdHelferAdd(terminId,task){
  try{const r=await fetch(`${SB_URL}/rest/v1/event_helfer`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({termin_id:terminId,name:_helferName(),aufgabe:task})});if(!r.ok){toast("Konnte nicht eintragen","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  _helferReload(terminId);
}
async function tdHelferDel(id,terminId){
  try{await fetch(`${SB_URL}/rest/v1/event_helfer?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){}
  _helferReload(terminId);
}
async function tdHelferDelTask(terminId,task){
  try{await fetch(`${SB_URL}/rest/v1/event_helfer?termin_id=eq.${terminId}&aufgabe=eq.${encodeURIComponent(task)}&user_id=eq.${_sbUid()}`,{method:"DELETE",headers:sbAuthHeaders()});}catch(e){}
  _helferReload(terminId);
}
/* F1: Notfall-/Gesundheitskarte (Art. 9 DSGVO – Gesundheitsdaten). Eltern pflegen sie fürs
   eigene Kind; der Trainer sieht sie NUR lesend (RLS kn_trainer_read). Speichern nur mit
   ausdrücklicher Einwilligung; Widerruf durch Leeren der Karte. */
const NF_FIELDS=[
  {k:"notfallkontakt",l:"Notfallkontakt (Name)",ph:"z. B. Mama – Anna Muster"},
  {k:"notfall_tel",l:"Notfall-Telefon",ph:"z. B. 0170 …",tel:true},
  {k:"allergien",l:"Allergien",ph:"z. B. Nüsse, Insektenstiche",area:true},
  {k:"medikamente",l:"Medikamente / Bedarf",ph:"z. B. Asthmaspray in der Tasche",area:true},
  {k:"krankenversicherung",l:"Krankenversicherung",ph:"z. B. AOK"},
  {k:"blutgruppe",l:"Blutgruppe (optional)",ph:"z. B. 0+"},
  {k:"arzt",l:"Kinderarzt (optional)",ph:"Name / Telefon"},
  {k:"hinweise",l:"Weitere Hinweise",ph:"was das Trainerteam im Notfall wissen sollte",area:true}
];
async function notfallOpen(spielerId,name){
  let cur={};
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?spieler_id=eq.${spielerId}&select=*`,{headers:sbAuthHeaders()});if(r.ok)cur=(await r.json())[0]||{};}catch(e){}
  document.getElementById("nf-modal")?.remove();
  const modal=document.createElement("div"); modal.id="nf-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="background:#fff;color:#1a1a2e;max-width:480px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  const field=f=>`<label style="display:block;font-size:12px;font-weight:700;margin-top:10px">${f.l}</label>`+
    (f.area?`<textarea id="nf-${f.k}" rows="2" placeholder="${f.ph}" style="width:100%;margin-top:3px;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical">${esc(cur[f.k]||"")}</textarea>`
      :`<input id="nf-${f.k}" type="${f.tel?"tel":"text"}" placeholder="${f.ph}" value="${esc(cur[f.k]||"")}" style="width:100%;margin-top:3px;padding:9px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;box-sizing:border-box">`);
  c.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
      <div style="font-weight:800;font-size:16px">🚑 Notfallkarte · ${esc(name)}</div>
      <button onclick="document.getElementById('nf-modal').remove()" style="border:none;background:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:11.5px;color:#64748b;margin-bottom:6px">Diese Angaben sieht ausschließlich das <b>Trainerteam</b> – schreibgeschützt, damit im Notfall am Platz alles griffbereit ist. Du kannst sie jederzeit ändern oder leeren.</div>
    ${NF_FIELDS.map(field).join("")}
    <label style="display:flex;gap:8px;align-items:flex-start;margin-top:14px;font-size:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px">
      <input id="nf-consent" type="checkbox" ${cur.einwilligung?"checked":""} style="margin-top:2px;width:18px;height:18px;flex:none">
      <span>Ich willige ein, dass diese <b>Gesundheitsdaten</b> zum Zweck der Notfallvorsorge gespeichert und dem Trainerteam angezeigt werden (Art. 9 DSGVO). Widerruf jederzeit durch Leeren der Karte.</span>
    </label>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" onclick="notfallSave(${spielerId})" style="flex:1;min-height:46px">Speichern</button>
      ${cur.spieler_id?`<button class="btn btn-sm btn-d" onclick="notfallClear(${spielerId})" style="min-height:46px">Karte leeren</button>`:""}
    </div>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
async function notfallSave(spielerId){
  const consent=document.getElementById("nf-consent")?.checked;
  if(!consent){toast("Bitte zuerst der Speicherung zustimmen","err");return;}
  const body={spieler_id:spielerId,einwilligung:true,updated_at:new Date().toISOString()};
  NF_FIELDS.forEach(f=>{const v=(document.getElementById("nf-"+f.k)?.value||"").trim();body[f.k]=v||null;});
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(!r.ok){toast((typeof sbDeniedMsg==="function")?sbDeniedMsg(r):"Konnte nicht speichern","err");return;}
    document.getElementById("nf-modal")?.remove();
    toast("Notfallkarte gespeichert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}
async function notfallClear(spielerId){
  if(!confirm("Notfallkarte wirklich leeren? Alle Angaben werden gelöscht."))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kind_notfall?spieler_id=eq.${spielerId}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok){toast("Konnte nicht löschen","err");return;}
    document.getElementById("nf-modal")?.remove();
    toast("Notfallkarte geleert ✓");
  }catch(e){toast("Netzwerkfehler","err");}
}

/* ── Foto- & Video-Einwilligung (3 Stufen, DSGVO) ──
   Eltern entscheiden pro Kind getrennt: app-intern / Trainingsvideos / öffentlich.
   Zweckgebunden, dokumentiert (updated_at/by serverseitig), jederzeit widerrufbar.
   Stufe 1 spiegelt via DB-Trigger auf kader.foto_stadionheft_ok (Heft/Galerie/Edge-Function). */
const FOTO_STUFEN=[
  {k:"intern",   emo:"🖼️", t:"App-intern (geschlossene Gruppe)", d:"Team-Galerie, Sammelkarte, „Die Kabine“ und das „Adler Nest“. Sichtbar nur für eingeloggte Eltern und das Trainerteam dieses Teams.", risk:"gering"},
  {k:"video",    emo:"🎥", t:"Trainingsvideos zur Analyse",       d:"Kurze Videoclips zur Technik-/Taktik-Analyse. Ausschließlich für das Trainerteam, nicht öffentlich, nach der Saison gelöscht.", risk:"mittel"},
  {k:"public_ok",emo:"🌍", t:"Öffentlich",                        d:"Vereins-Website, Social Media (z. B. Instagram) und öffentliche Aushänge. Achtung: verlässt die App und kann im Netz dauerhaft auffindbar bleiben.", risk:"hoch"}
];
const FOTO_CONSENT_DEFAULT="Wir bitten um deine Einwilligung, Foto- und Videoaufnahmen deines Kindes im Rahmen des Vereinssports zu verwenden. Du entscheidest für jede der drei Stufen getrennt und kannst jede Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Die Teilnahme deines Kindes am Training und an Spielen ist unabhängig von dieser Einwilligung – ein „Nein“ hat keinerlei Nachteile. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO sowie §§ 22, 23 KunstUrhG.";
async function elternFotoConsentTextLoad(){
  try{const r=await fetch(`${SB_URL}/rest/v1/team_config?select=foto_consent_text&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const t=((await r.json())[0]||{}).foto_consent_text; if(t&&t.trim())return t;}}catch(e){}
  return FOTO_CONSENT_DEFAULT;
}
async function elternFotoConsentOpen(spielerId,name){
  let cur={}; let txt=FOTO_CONSENT_DEFAULT;
  try{const r=await fetch(`${SB_URL}/rest/v1/foto_consent?spieler_id=eq.${spielerId}&select=*`,{headers:sbAuthHeaders()});if(r.ok)cur=(await r.json())[0]||{};}catch(e){}
  txt=await elternFotoConsentTextLoad();
  document.getElementById("fc-modal")?.remove();
  const modal=document.createElement("div"); modal.id="fc-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10050;display:flex;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const riskCol={gering:"#16a34a",mittel:"#d97706",hoch:"#dc2626"};
  const row=s=>`<label style="display:flex;gap:10px;align-items:flex-start;padding:11px;border:1px solid #e2e8f0;border-radius:10px;margin-top:8px;cursor:pointer">
    <input id="fc-${s.k}" type="checkbox" ${cur[s.k]?"checked":""} style="margin-top:2px;width:20px;height:20px;flex:none;accent-color:#7c3aed">
    <span style="flex:1">
      <span style="font-weight:700;font-size:13.5px">${s.emo} ${s.t} <span style="font-size:10.5px;font-weight:700;color:${riskCol[s.risk]}">· Risiko ${s.risk}</span></span>
      <span style="display:block;font-size:11.5px;color:#64748b;margin-top:2px;line-height:1.5">${s.d}</span>
    </span></label>`;
  const upd=cur.updated_at?`<div style="font-size:10.5px;color:#94a3b8;margin-top:10px">Zuletzt aktualisiert: ${new Date(cur.updated_at).toLocaleDateString("de-DE")}${cur.updated_by?" · "+esc(cur.updated_by):""}</div>`:"";
  const c=document.createElement("div");
  c.style.cssText="background:#fff;color:#1a1a2e;max-width:500px;width:100%;margin:auto;border-radius:16px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  c.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
      <div style="font-weight:800;font-size:16px">📸 Foto- &amp; Video-Freigabe · ${esc(name)}</div>
      <button onclick="document.getElementById('fc-modal').remove()" style="border:none;background:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1">×</button>
    </div>
    <div style="font-size:11.5px;color:#475569;line-height:1.6;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:11px;margin:8px 0 4px">${esc(txt)}</div>
    ${FOTO_STUFEN.map(row).join("")}
    <div style="font-size:10.5px;color:#94a3b8;margin-top:10px;line-height:1.5">ℹ️ Bei <b>Gruppenfotos</b> zeigen wir dein Kind öffentlich nur, wenn <u>alle</u> abgebildeten Familien der Stufe „Öffentlich“ zugestimmt haben. Freiwillig &amp; jederzeit widerrufbar.</div>
    ${upd}
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" onclick="elternFotoConsentSave(${spielerId})" style="flex:1;min-height:46px">Speichern</button>
      <button class="btn btn-sm btn-d" onclick="elternFotoConsentRevoke(${spielerId})" style="min-height:46px">Alles widerrufen</button>
    </div>`;
  modal.appendChild(c); document.body.appendChild(modal);
}
async function elternFotoConsentSave(spielerId){
  const body={spieler_id:spielerId};
  FOTO_STUFEN.forEach(s=>{body[s.k]=!!document.getElementById("fc-"+s.k)?.checked;});
  try{
    const r=await fetch(`${SB_URL}/rest/v1/foto_consent?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(body)});
    if(!r.ok){toast((typeof sbDeniedMsg==="function")?sbDeniedMsg(r):"Konnte nicht speichern","err");return;}
    document.getElementById("fc-modal")?.remove();
    toast("Foto-Freigabe gespeichert ✓");
    if(window._elternKids&&typeof elternChecklistLoad==="function")elternChecklistLoad(window._elternKids);
  }catch(e){toast("Netzwerkfehler","err");}
}
async function elternFotoConsentRevoke(spielerId){
  if(!confirm("Wirklich alle Foto- und Video-Freigaben für dein Kind widerrufen?"))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/foto_consent?on_conflict=spieler_id`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({spieler_id:spielerId,intern:false,video:false,public_ok:false})});
    if(!r.ok){toast("Konnte nicht widerrufen","err");return;}
    document.getElementById("fc-modal")?.remove();
    toast("Alle Freigaben widerrufen ✓");
    if(window._elternKids&&typeof elternChecklistLoad==="function")elternChecklistLoad(window._elternKids);
  }catch(e){toast("Netzwerkfehler","err");}
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
// G5: Saison-Kalender-Abo – öffentliche Edge Function liefert ein live-aktualisiertes .ics.
const SEASON_ICS_HTTPS=SB_URL+"/functions/v1/season-ics";
const SEASON_ICS_WEBCAL="webcal://"+SB_URL.replace(/^https?:\/\//,"")+"/functions/v1/season-ics";
function saisonAboCopy(){
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(SEASON_ICS_HTTPS).then(()=>toast("Abo-Link kopiert ✓ – im Kalender 'Aus URL abonnieren' einfügen"),()=>toast("Kopieren nicht möglich","err"));
  else toast("Kopieren nicht möglich","err");
}
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
    ${rows.length?`<button onclick="elternTermineIcs()" style="width:100%;margin-top:12px;padding:11px;border:1.5px solid #1e3a8a;border-radius:10px;background:#fff;color:#1e3a8a;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">📥 Alle in meinen Kalender (einmalig)</button>`:""}
    <a href="${SEASON_ICS_WEBCAL}" style="display:block;text-align:center;width:100%;margin-top:8px;padding:11px;border:1.5px solid #16a34a;border-radius:10px;background:#f0fdf4;color:#15803d;font-family:inherit;font-size:13px;font-weight:700;text-decoration:none;box-sizing:border-box">🔔 Termine abonnieren (aktualisiert sich automatisch)</a>
    <button onclick="saisonAboCopy()" style="width:100%;margin-top:6px;padding:9px;border:none;border-radius:10px;background:#f1f5f9;color:#475569;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">🔗 Abo-Link kopieren (für Google/Apple Kalender)</button>
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
