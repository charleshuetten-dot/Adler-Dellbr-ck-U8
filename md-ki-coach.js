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
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button id="ki-gen-btn" class="btn btn-p btn-sm" onclick="kiCoachGenerate()"><i class="ti ti-sparkles"></i>Übungen vorschlagen</button>
      <button class="btn btn-sm" onclick="kiCoachInsertNotes()" title="Deine letzten Trainer-Notizen als Kontext einfügen"><i class="ti ti-notes"></i>📓 Aus meinen Notizen</button>
    </div>
    <div id="ki-result" style="margin-top:12px"></div>
  </div>`;
  document.body.appendChild(m);
}
/* KI-Loop (18.1): der Trainer holt seine letzten Voice-Diary-Notizen als Kontext in den
   Prompt – bewusst per Klick (Trainer-in-the-Loop), nicht serverseitig-automatisch, damit
   der LLM-Key serverseitig bleibt und der Trainer sieht/steuert, was an die KI geht. */
async function kiCoachInsertNotes(){
  let notes=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/trainer_notes?select=text,datum&order=created_at.desc&limit=3`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)notes=await r.json();}catch(e){}
  if(!notes.length){toast("Noch keine Trainer-Notizen vorhanden","err");return;}
  const ta=document.getElementById("ki-prompt"); if(!ta)return;
  const ctx="Meine Beobachtungen aus dem letzten Spiel/Training: "+notes.map(n=>n.text.trim()).filter(Boolean).join(" • ")+". Leite daraus passende Übungen ab.";
  ta.value=(ta.value.trim()?ta.value.trim()+"\n\n":"")+ctx;
  ta.focus();
  toast("Notizen eingefügt – ergänze bei Bedarf");
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
