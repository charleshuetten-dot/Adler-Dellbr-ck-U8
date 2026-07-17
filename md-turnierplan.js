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
/* B2 – Faire Rollen: „jeder mal dran". Kapitän gibt es schon; hier zusätzlich die Rolle
   „Anstoß" und eine Fairness-Übersicht, wer eine Rolle noch nie hatte (⭐). */
let ANSTOSS_COUNT={}, matchAnstoss=null;
async function anstossLoad(){
  ANSTOSS_COUNT={}; matchAnstoss=null; const datum=spieltagKey();
  try{const r=await fetch(`${SB_URL}/rest/v1/match_actions?aktion=eq.anstoss&select=spieler,datum&order=created_at.desc`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok)(await r.json()).forEach(x=>{ANSTOSS_COUNT[x.spieler]=(ANSTOSS_COUNT[x.spieler]||0)+1; if(x.datum===datum&&!matchAnstoss)matchAnstoss=x.spieler;});}catch(e){}
}
async function anstossSet(name){
  if(!name)return; const datum=spieltagKey();
  try{ await fetch(`${SB_URL}/rest/v1/match_actions?datum=eq.${encodeURIComponent(datum)}&aktion=eq.anstoss`,{method:"DELETE",headers:sbAuthHeaders()}); }catch(e){}
  if(ANSTOSS_COUNT[matchAnstoss])ANSTOSS_COUNT[matchAnstoss]--;
  matchAnstoss=name; ANSTOSS_COUNT[name]=(ANSTOSS_COUNT[name]||0)+1;
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
  terminIdForDatum(datum).then(tid=>sbQueuedPost("match_actions",{datum,spieler:name,aktion:"anstoss",termin_id:tid}));
  toast(`🏁 ${name} stößt heute an`);
  rollenPanelRender();
}
async function rollenPanelRender(){
  const box=document.getElementById("rollen-panel"); if(!box)return;
  await anstossLoad(); // KAP_COUNT wird über kapitaenLoad in nomLoad gefüllt
  const squad=(typeof nominierteSpieler==="function"&&nominierteSpieler().length)?nominierteSpieler():KADER.map(k=>k.name);
  const nie=(cnt)=>squad.filter(n=>!(cnt[n]>0));
  const opts=(cnt,cur)=>squad.slice().sort((a,b)=>(cnt[a]||0)-(cnt[b]||0)).filter(n=>n!==cur).map(n=>`<option value="${esc(n)}">${getKader(n)?.nr?getKader(n).nr+" ":""}${esc(n)} · ${(cnt[n]||0)===0?"noch nie ⭐":(cnt[n]||0)+"×"}</option>`).join("");
  const row=(icon,label,cnt,cur,setFn)=>{
    const offen=nie(cnt);
    return `<div style="background:var(--surface);border:var(--border-s);border-radius:12px;padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="flex:1;font-size:12.5px;font-weight:700">${icon} ${label}${cur?`: <span style="color:var(--blue)">${esc(cur)}</span>`:""}</span>
        <select onchange="if(this.value)${setFn}(this.value)" style="padding:6px 8px;border:var(--border-s);border-radius:var(--r);font-family:inherit;font-size:12px;background:var(--surface2);color:var(--text)"><option value="">${cur?"wechseln…":"wählen…"}</option>${opts(cnt,cur)}</select>
      </div>
      ${offen.length?`<div style="font-size:10.5px;color:var(--text2);margin-top:5px">Noch nie dran ⭐: ${offen.map(esc).join(", ")}</div>`:`<div style="font-size:10.5px;color:#16a34a;margin-top:5px">Alle waren schon dran – fair verteilt ✓</div>`}
    </div>`;
  };
  box.innerHTML=`<div style="font-size:10.5px;color:var(--text3);margin-bottom:6px">Damit jedes Kind mal die besondere Rolle bekommt.</div>`+
    row("©️","Kapitän",(typeof KAP_COUNT!=="undefined"?KAP_COUNT:{}),(typeof matchKapitaen!=="undefined"?matchKapitaen:null),"kapitaenSet")+
    row("🏁","Anstoß",ANSTOSS_COUNT,matchAnstoss,"anstossSet");
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
  // C: explizit pausierte Kinder sind raus (außer der Trainer hat manuell überstimmt).
  if(typeof pauseLoad==="function"){ await pauseLoad(); Object.keys(PAUSE_MAP||{}).forEach(name=>{ if(!nomOvr.has(name)) nomStatus[name]="nicht"; }); }
  const nr=document.getElementById("nom-team-nr"); if(nr)nr.textContent=String(spieltagTeam);
  nomRender();
  if(document.getElementById("rollen-panel"))rollenPanelRender(); // B2: faire Rollen
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
        <span style="flex:1;font-size:12.5px">${getKader(k.name)?.nr?getKader(k.name).nr+" ":""}${esc(k.name)}${(typeof istPaused==="function"&&istPaused(k.name))?` <span title="Pausiert – zählt nicht mit" style="font-size:10px;font-weight:700;color:#b45309;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:1px 6px">⏸ bis ${pauseBisLabel(k.name)}</span>`:""}</span>
        ${["dabei","nicht","verletzt"].map(s=>`<button onclick="nomSet('${k.name}','${s}')" style="min-height:44px;padding:5px 9px;font-size:11px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${cur===s?stCfg[s].col:"var(--surface)"};color:${cur===s?"#fff":"var(--text2)"}">${stCfg[s].lbl}</button>`).join("")}
      </div>`;
    }).join("");
}

/* ═══════════════════════════════════
   M1: BLITZTURNIER – schnelles Turnier zum Trainingsabschluss. Teams kommen automatisch
   aus dem Kader (heutige Anwesenheit, falls erfasst), sind per Tipp verschiebbar, und
   Extra-Teams („Eltern", „Trainer") lassen sich von Hand ergänzen. Jeder gegen jeden,
   Rundenzeit mit Pfiff, Punktetafel, Sieger mit Konfetti. Reines Frontend + localStorage –
   kein Server, damit es am Platz auch ohne Netz läuft.
═══════════════════════════════════ */
const BLZ_FARBEN=["#1a56db","#dc2626","#059669","#7c3aed","#d97706"];
let BLZ=null;
function _blzHeute(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function blzSave(){try{localStorage.setItem("adler_blitz",JSON.stringify(BLZ));}catch(e){}}
function _blzLoad(){try{const s=JSON.parse(localStorage.getItem("adler_blitz")||"null");if(s&&s.datum===_blzHeute())return s;}catch(e){}return null;}
// Spielerpool: heutige Anwesenheit (nur wer da ist), sonst alle aktiven Kader-Kinder
function _blzPool(){
  const aktive=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false).map(k=>k.name);
  try{
    const day=(typeof AW_DATA!=="undefined"?AW_DATA:{})[_blzHeute()]||{};
    const da=aktive.filter(n=>day[n]&&day[n].da===true);
    if(da.length>=4)return {namen:da,quelle:"Anwesenheit heute"};
  }catch(e){}
  return {namen:aktive,quelle:"ganzer Kader"};
}
// Ausgewogene Auto-Einteilung: stärkstes Kind ins momentan schwächste Team (wie Spieltag-Einteilung)
function _blzAuto(n){
  const pool=_blzPool();
  const st=x=>(typeof teamStaerke==="function")?Math.max(0,teamStaerke(x)):0;
  const teams=[];for(let i=0;i<n;i++)teams.push({name:"Adler "+(i+1),spieler:[],fest:false});
  const summe=new Array(n).fill(0);
  pool.namen.slice().sort((a,b)=>st(b)-st(a)).forEach(name=>{
    let ziel=0;for(let t=1;t<n;t++){if(teams[t].spieler.length<teams[ziel].spieler.length||(teams[t].spieler.length===teams[ziel].spieler.length&&summe[t]<summe[ziel]))ziel=t;}
    teams[ziel].spieler.push(name);summe[ziel]+=st(name);
  });
  return {teams,quelle:pool.quelle};
}
// Berger-Rotation: jeder gegen jeden, fair verteilt (niemand spielt zweimal direkt hintereinander)
function _blzRR(n){
  const ids=[...Array(n).keys()];if(n%2)ids.push(-1);
  const runden=ids.length-1,halb=ids.length/2,out=[];
  let arr=ids.slice();
  for(let r=0;r<runden;r++){
    for(let i=0;i<halb;i++){const a=arr[i],b=arr[arr.length-1-i];if(a!==-1&&b!==-1)out.push([a,b]);}
    arr=[arr[0],arr[arr.length-1]].concat(arr.slice(1,arr.length-1));
  }
  return out;
}
function blitzOpen(){
  const alt=_blzLoad();
  if(alt){BLZ=alt;}
  else{const a=_blzAuto(2);BLZ={datum:_blzHeute(),phase:"setup",anzahl:2,runde:8,quelle:a.quelle,teams:a.teams,plan:[]};blzSave();}
  document.getElementById("blitz-modal")?.remove();
  const m=document.createElement("div");m.id="blitz-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Blitzturnier");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("blitz-modal","⚡","Blitzturnier","Schnelles Turnier zum Trainingsabschluss – Teams tippen, Pfiff, los","#d97706")}
    <div id="blitz-body"></div>
  </div>`;
  document.body.appendChild(m);
  blzRender();
}
function blzRender(){
  const el=document.getElementById("blitz-body");if(!el||!BLZ)return;
  el.innerHTML=(BLZ.phase==="setup")?_blzSetupHtml():_blzLiveHtml();
}
function _blzSetupHtml(){
  const chips=[2,3,4].map(n=>`<button onclick="blzAnzahl(${n})" style="flex:1;min-height:44px;border:var(--border-s);border-radius:10px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;background:${BLZ.anzahl===n?"#d97706":"var(--surface2)"};color:${BLZ.anzahl===n?"#fff":"var(--text2)"}">${n} Teams</button>`).join("");
  const teams=BLZ.teams.map((t,i)=>`<div style="border:var(--border-s);border-left:4px solid ${BLZ_FARBEN[i%BLZ_FARBEN.length]};border-radius:12px;padding:8px 10px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:6px">
        <button onclick="blzRename(${i})" title="Team umbenennen" style="border:none;background:transparent;font-family:inherit;font-size:13.5px;font-weight:800;color:var(--text);cursor:pointer;min-height:44px;padding:0;margin:-8px 0">${esc(t.name)} ✏️</button>
        <span style="margin-left:auto;font-size:11px;color:var(--text3)">${t.spieler.length?t.spieler.length+" Kinder":"ohne Kader-Kinder"}</span>
        ${t.fest?`<button onclick="blzTeamWeg(${i})" aria-label="Team entfernen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;min-width:44px;min-height:44px;margin:-8px -8px -8px 0"><i class="ti ti-trash"></i></button>`:""}
      </div>
      ${t.spieler.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${t.spieler.map(n=>`<button onclick="blzCycle('${jsq(n)}')" title="Tippen = ins nächste Team" style="min-height:44px;padding:6px 12px;border:var(--border-s);border-radius:18px;font-family:inherit;font-size:12.5px;cursor:pointer;background:var(--surface2);color:var(--text)">${esc(n)}</button>`).join("")}</div>`:""}
    </div>`).join("");
  return `<div style="display:flex;gap:8px;margin-bottom:10px">${chips}</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px">Quelle: ${esc(BLZ.quelle)} · Kind antippen = wandert ins nächste Team · Würfel = neu mischen</div>
    ${teams}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-sm" onclick="blzNeuMischen()">🎲 Neu mischen</button>
      <button class="btn btn-sm" onclick="blzTeamPlus()">➕ Team von Hand (z. B. Eltern)</button>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <label for="blz-runde" style="font-size:12.5px;color:var(--text2)">Spielzeit je Begegnung</label>
      <input id="blz-runde" type="number" min="1" max="30" value="${BLZ.runde}" style="width:64px;text-align:center;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surface2);color:var(--text)"> <span style="font-size:12.5px;color:var(--text2)">Min.</span>
    </div>
    <button class="btn btn-p" style="width:100%" onclick="blzStart()"><i class="ti ti-tournament"></i>Spielplan erzeugen &amp; los</button>`;
}
function blzAnzahl(n){const a=_blzAuto(n);BLZ.anzahl=n;BLZ.teams=a.teams.concat(BLZ.teams.filter(t=>t.fest));BLZ.quelle=a.quelle;blzSave();blzRender();}
function blzNeuMischen(){blzAnzahl(BLZ.anzahl);}
function blzCycle(name){
  const von=BLZ.teams.findIndex(t=>t.spieler.indexOf(name)>=0);if(von<0)return;
  BLZ.teams[von].spieler=BLZ.teams[von].spieler.filter(x=>x!==name);
  BLZ.teams[(von+1)%BLZ.teams.length].spieler.push(name);
  blzSave();blzRender();
}
function blzTeamPlus(){
  const name=(prompt("Name des Teams (z. B. Eltern, Trainer):")||"").trim();if(!name)return;
  BLZ.teams.push({name,spieler:[],fest:true});blzSave();blzRender();
}
function blzTeamWeg(i){BLZ.teams.splice(i,1);blzSave();blzRender();}
function blzRename(i){
  const name=(prompt("Neuer Team-Name:",BLZ.teams[i].name)||"").trim();if(!name)return;
  BLZ.teams[i].name=name;blzSave();blzRender();
}
function blzStart(){
  const r=Number(document.getElementById("blz-runde")?.value)||8;
  if(BLZ.teams.length<2){toast("Mindestens 2 Teams","err");return;}
  BLZ.runde=Math.min(30,Math.max(1,r));
  BLZ.plan=_blzRR(BLZ.teams.length).map(([a,b])=>({a,b,ta:null,tb:null}));
  BLZ.phase="live";blzSave();blzRender();
}
function _blzTabelle(){
  const t=BLZ.teams.map((team,i)=>({i,name:team.name,pkt:0,tore:0,geg:0,sp:0}));
  BLZ.plan.forEach(p=>{
    if(p.ta==null||p.tb==null)return;
    const A=t[p.a],B=t[p.b];A.sp++;B.sp++;A.tore+=p.ta;A.geg+=p.tb;B.tore+=p.tb;B.geg+=p.ta;
    if(p.ta>p.tb)A.pkt+=3;else if(p.ta<p.tb)B.pkt+=3;else{A.pkt++;B.pkt++;}
  });
  return t.sort((a,b)=>b.pkt-a.pkt||(b.tore-b.geg)-(a.tore-a.geg)||b.tore-a.tore);
}
function _blzLiveHtml(){
  const naechste=BLZ.plan.findIndex(p=>p.ta==null);
  const spiele=BLZ.plan.map((p,mi)=>{
    const A=BLZ.teams[p.a],B=BLZ.teams[p.b];
    const fA=BLZ_FARBEN[p.a%BLZ_FARBEN.length],fB=BLZ_FARBEN[p.b%BLZ_FARBEN.length];
    const step=(seite,wert)=>`<span style="display:inline-flex;align-items:center;gap:2px">
      <button onclick="blzTor(${mi},'${seite}',-1)" aria-label="Tor zurücknehmen" style="min-width:44px;min-height:44px;border:var(--border-s);border-radius:10px;background:var(--surface2);color:var(--text);font-size:16px;cursor:pointer">−</button>
      <b style="min-width:26px;text-align:center;font-size:17px">${wert==null?"–":wert}</b>
      <button onclick="blzTor(${mi},'${seite}',1)" aria-label="Tor" style="min-width:44px;min-height:44px;border:var(--border-s);border-radius:10px;background:var(--surface2);color:var(--text);font-size:16px;cursor:pointer">+</button>
    </span>`;
    return `<div style="border:var(--border-s);border-radius:12px;padding:8px 10px;margin-bottom:8px;${mi===naechste?"box-shadow:0 0 0 2px #d97706;":""}${p.ta!=null?"opacity:.75;":""}">
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:800;flex-wrap:wrap">
        <span style="color:${fA}">${esc(A.name)}</span><span style="color:var(--text3)">vs</span><span style="color:${fB}">${esc(B.name)}</span>
        ${mi===naechste?`<button class="btn btn-sm" style="margin-left:auto" onclick="blzTimerStart()">⏱️ ${BLZ.runde} Min.</button>`:""}
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px">${step("ta",p.ta)}<span style="font-weight:900">:</span>${step("tb",p.tb)}</div>
    </div>`;
  }).join("");
  const tab=_blzTabelle();
  const tabelle=`<div style="font-weight:800;font-size:13.5px;margin:12px 0 4px">📊 Tabelle</div>`
    +tab.map((z,pl)=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0">
      <span style="width:22px">${["🥇","🥈","🥉"][pl]||(pl+1)+"."}</span>
      <span style="flex:1;color:${BLZ_FARBEN[z.i%BLZ_FARBEN.length]};font-weight:700">${esc(z.name)}</span>
      <span style="font-size:11px;color:var(--text3)">${z.tore}:${z.geg}</span>
      <span style="font-weight:900;min-width:24px;text-align:right">${z.pkt}</span>
    </div>`).join("");
  return spiele+tabelle+`
    <button class="btn btn-p" style="width:100%;margin-top:12px" onclick="blzEnde()"><i class="ti ti-trophy"></i>Turnier beenden</button>
    <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="blzReset()">Neu starten (Teams ändern)</button>`;
}
function blzTor(mi,seite,delta){
  const p=BLZ.plan[mi];
  p[seite]=Math.max(0,(p[seite]==null?0:p[seite])+delta);
  const andere=seite==="ta"?"tb":"ta";if(p[andere]==null)p[andere]=0; // Ergebnis zählt erst, wenn beide Seiten stehen
  blzSave();blzRender();
}
function blzEnde(){
  const offen=BLZ.plan.filter(p=>p.ta==null).length;
  if(offen&&!confirm(offen+" Begegnung"+(offen===1?"":"en")+" ohne Ergebnis – trotzdem beenden?"))return;
  const tab=_blzTabelle();
  const erste=tab.filter(z=>z.pkt===tab[0].pkt&&(z.tore-z.geg)===(tab[0].tore-tab[0].geg));
  const el=document.getElementById("blitz-body");if(!el)return;
  el.innerHTML=`<div style="text-align:center;padding:14px 0">
      <div style="font-size:56px">🏆</div>
      <div style="font-size:20px;font-weight:900;margin:8px 0">${erste.map(z=>esc(z.name)).join(" & ")}</div>
      <div style="font-size:12.5px;color:var(--text2)">${erste.length>1?"Geteilter Turniersieg":"gewinnt das Blitzturnier"} – stark gespielt, alle zusammen! 🦅</div>
    </div>`
    +BLZ.plan.filter(p=>p.ta!=null).map(p=>`<div style="display:flex;gap:8px;font-size:12.5px;padding:2px 0;justify-content:center"><span>${esc(BLZ.teams[p.a].name)}</span><b>${p.ta}:${p.tb}</b><span>${esc(BLZ.teams[p.b].name)}</span></div>`).join("")
    +`<button class="btn btn-sm" style="width:100%;margin-top:12px" onclick="blzReset()">Neues Blitzturnier</button>`;
  try{if(typeof confetti==="function")confetti(el);}catch(e){}
  try{navigator.vibrate&&navigator.vibrate([60,40,60]);}catch(e){}
  try{localStorage.removeItem("adler_blitz");}catch(e){}
  BLZ=null;
}
function blzReset(){try{localStorage.removeItem("adler_blitz");}catch(e){}BLZ=null;blitzOpen();}
/* Rundentimer: eigener kleiner Vollbild-Countdown (der Stationstimer hängt am Trainingsplan) */
let _blzT=null;
function blzTimerStart(){
  const sek=(BLZ?BLZ.runde:8)*60;
  document.getElementById("blz-timer")?.remove();
  const ov=document.createElement("div");ov.id="blz-timer";
  ov.style.cssText="position:fixed;inset:0;background:#0b1220;color:#fff;z-index:11000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center";
  document.body.appendChild(ov);
  _blzT={left:sek,paused:false,timer:setInterval(_blzTick,1000)};
  try{if(typeof requestWakeLock==="function")requestWakeLock();}catch(e){}
  _blzTimerRender();
}
function _blzTick(){
  if(!_blzT||_blzT.paused)return;
  _blzT.left--;
  if(_blzT.left<=0){
    try{if(typeof stTimerWhistle==="function")stTimerWhistle();}catch(e){}
    clearInterval(_blzT.timer);_blzT.timer=null;_blzT.left=0;
  }
  _blzTimerRender();
}
function _blzTimerRender(){
  const ov=document.getElementById("blz-timer");if(!ov||!_blzT)return;
  const mm=Math.floor(_blzT.left/60),ss=_blzT.left%60;
  ov.innerHTML=`<div style="font-size:15px;opacity:.7">⚡ Blitzturnier</div>
    <div style="font-size:88px;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:2px">${_blzT.left?mm+":"+(ss<10?"0":"")+ss:"⏱️"}</div>
    ${_blzT.left?"":'<div style="font-size:22px;font-weight:800">Abpfiff!</div>'}
    <div style="display:flex;gap:10px;margin-top:24px">
      ${_blzT.left?`<button onclick="_blzT.paused=!_blzT.paused;_blzTimerRender()" style="padding:14px 24px;border:none;border-radius:12px;background:#334155;color:#fff;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer">${_blzT.paused?"▶ Weiter":"⏸ Pause"}</button>`:""}
      <button onclick="blzTimerStop()" style="padding:14px 24px;border:none;border-radius:12px;background:#16a34a;color:#fff;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer">Fertig</button>
    </div>`;
}
function blzTimerStop(){if(_blzT&&_blzT.timer)clearInterval(_blzT.timer);_blzT=null;document.getElementById("blz-timer")?.remove();try{if(typeof releaseWakeLock==="function")releaseWakeLock();}catch(e){}}


/* ═══════════════════════════════════
   M2/M3: HEIMTURNIER – wir richten selbst aus. Teams direkt aus der Gegner-DB (Vereine
   dürfen mehrere Mannschaften stellen → automatische „2"/„3"-Nummerierung), 2–4 Gruppen
   je nach Meldezahl, 1–4 Felder parallel, Spielform (FUNiño, 4+1, 5+1 …) mit hinterlegtem,
   anpassbarem Regelwerk. Der Plan geht per öffentlichem Link (?turnier=<slug>) ohne Login
   an die Gast-Trainer – er enthält NUR Teamnamen, nie Kindernamen.
   Formate: Liga (jeder gegen jeden), Gruppen + Finalrunde, Festival (keine Tabelle).
═══════════════════════════════════ */
let _HT=null;
function _htSlug(){ return Math.random().toString(36).slice(2,8)+Math.random().toString(36).slice(2,6); }
function _htUrl(slug){ return appRoot()+"?turnier="+encodeURIComponent(slug); }
const HT_FORMATE={liga:"Liga – jeder gegen jeden",gruppen:"Gruppen + Finalrunde",festival:"Festival – alle spielen, keine Tabelle"};
const HT_SPIELFORM={funino:"FUNiño (3 gegen 3)",f4:"4+1",f5:"5+1",f6:"6+1",f7:"7 gegen 7",frei:"eigene Spielform"};
/* Regel-Vorlagen je Spielform – bewusst als VORLAGE beschriftet, der Trainer passt sie an
   die eigene Ausschreibung/Kreis-Vorgaben an (die Details sind regional unterschiedlich). */
const HT_REGELN={
  funino:"FUNiño – 3 gegen 3 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 3 gegen 3 auf vier Minitore, ohne Torwart\n• Tore zählen nur aus der Schusszone vor den Toren\n• Eindribbeln statt Einwurf, Ecke und Abstoß\n• Nach jedem Tor und in festen Abständen wird gewechselt – alle spielen gleich viel\n• Ohne Schiedsrichter: die Kinder entscheiden selbst, die Trainer begleiten\n• Fair-Play-Regel: Zuschauer feuern an, coachen nicht",
  f4:"4+1 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 4 Feldspieler + Torwart, fliegender Wechsel\n• Kein Abseits\n• Eindribbeln oder Einpassen statt Einwurf\n• Abstoß und Freistoß: Gegner mindestens 3 m Abstand\n• Torwart darf den Rückpass aufnehmen\n• Fair-Play-Liga: ohne Schiedsrichter, die Trainer begleiten das Spiel\n• Zuschauerzone mit Abstand zum Spielfeld – anfeuern ja, coachen nein",
  f5:"5+1 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 5 Feldspieler + Torwart, fliegender Wechsel\n• Kein Abseits\n• Einwurf oder Eindribbeln (je nach Ausschreibung)\n• Freistöße indirekt, Gegner mindestens 3 m Abstand\n• Fair-Play-Liga: ohne Schiedsrichter, die Trainer begleiten das Spiel\n• Zuschauerzone mit Abstand zum Spielfeld – anfeuern ja, coachen nein",
  f6:"6+1 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 6 Feldspieler + Torwart, fliegender Wechsel\n• Kein Abseits\n• Einwurf regulär\n• Freistöße indirekt, Gegner mindestens 3 m Abstand\n• Spielbegleiter statt Schiedsrichter (je nach Ausschreibung)",
  f7:"7 gegen 7 (Vorlage, bitte an eure Ausschreibung anpassen)\n• 6 Feldspieler + Torwart, fliegender Wechsel\n• Abseits je nach Kreis-Ausschreibung\n• Einwurf regulär, Freistöße nach Ausschreibung\n• Schiedsrichter oder Spielbegleiter je nach Turnierordnung",
  frei:"Eigene Spielform – Regeln hier eintragen."
};
const HT_INFOS_VORLAGE="📍 Treffpunkt: Thurner Kamp 97, 51069 Köln\n⏰ Bitte 30 Minuten vor dem ersten Spiel da sein\n🅿️ Parken: \n🚻 Kabinen/WC: \n🥤 Büdchen mit Kaffee, Kaltgetränken und Kuchen vor Ort\n📞 Turnierleitung: ";
const HT_GRLABEL=["A","B","C","D"];
// Platzhalter der Finalrunde lesbar machen ("A1" = Erster Gruppe A, "S|Halbfinale 1" = Sieger HF 1 …)
function _htName(v,teams){
  if(typeof v==="number")return teams[v]||"?";
  const s=String(v);
  let m=/^([A-D])(\d+)$/.exec(s); if(m)return `${m[2]}. Gruppe ${m[1]}`;
  m=/^S\|(.+)$/.exec(s); if(m)return "Sieger "+m[1];
  m=/^V\|(.+)$/.exec(s); if(m)return "Verlierer "+m[1];
  if(s==="GS1")return "Bester Gruppensieger";
  if(s==="GS2")return "Zweitbester Gruppensieger";
  if(s==="GS3")return "Drittbester Gruppensieger";
  if(s==="GZ1")return "Bester Gruppenzweiter";
  return s;
}
// Gruppen-Einteilung: Teamliste in <gruppen> Blöcke (Reihenfolge bestimmt der Trainer)
function _htGruppenN(row){
  const n=(row.teams||[]).length, g=Math.min(4,Math.max(2,Number((row.config||{}).gruppen)||2));
  const out=[]; const basis=Math.floor(n/g); let rest=n%g, start=0;
  for(let i=0;i<g;i++){const groesse=basis+(i<rest?1:0);out.push([...Array(groesse).keys()].map(x=>x+start));start+=groesse;}
  return out;
}
function _htGrVorschlag(n){ if(n>=12&&n%4===0)return 4; if(n>=9&&n%3===0)return 3; if(n>=13)return 4; if(n>=10)return 3; return 2; }
/* Spielplan-Generator: Begegnungen je Format, dann Zeitfenster füllen (bis zu <felder>
   Spiele parallel, kein Team doppelt im selben Fenster). Finalrunde startet erst nach den
   Gruppenspielen (+ Puffer); Finale/Platz 3 nach den Halbfinals; das Finale spielt allein. */
function _htGen(teams,cfg){
  const n=teams.length;
  let ms=[];
  if(cfg.format==="gruppen"&&n>=4){
    const gruppen=_htGruppenN({teams,config:cfg});
    const rr=gruppen.map((idxs,g)=>_blzRR(idxs.length).map(([x,y])=>({a:idxs[x],b:idxs[y],phase:"Gruppe "+HT_GRLABEL[g]})));
    const max=Math.max(...rr.map(r=>r.length));           // Gruppen abwechselnd = faire Pausen
    for(let i=0;i<max;i++)rr.forEach(r=>{if(r[i])ms.push(r[i]);});
    if(gruppen.length===2){
      const plaetze=Math.min(gruppen[0].length,gruppen[1].length);
      for(let r=plaetze-1;r>=0;r--)ms.push({a:"A"+(r+1),b:"B"+(r+1),phase:r===0?"Finale":"Spiel um Platz "+(2*r+1)});
    }else if(gruppen.length===3){
      ms.push({a:"GS3",b:"GZ1",phase:"Spiel um Platz 3"});
      ms.push({a:"GS1",b:"GS2",phase:"Finale"});
    }else{
      ms.push({a:"A1",b:"C1",phase:"Halbfinale 1"});
      ms.push({a:"B1",b:"D1",phase:"Halbfinale 2"});
      ms.push({a:"V|Halbfinale 1",b:"V|Halbfinale 2",phase:"Spiel um Platz 3"});
      ms.push({a:"S|Halbfinale 1",b:"S|Halbfinale 2",phase:"Finale"});
    }
  }else{
    ms=_blzRR(n).map(([a,b])=>({a,b,phase:cfg.format==="festival"?"Festival":"Runde"}));
  }
  const felder=Math.min(4,Math.max(1,Number(cfg.felder)||1)), dauer=Math.max(1,Number(cfg.spieldauer)||10), pause=Math.max(0,Number(cfg.pause)||0), puffer=Math.max(0,Number(cfg.puffer)||0);
  const [sh,sm]=(cfg.start||"10:00").split(":").map(Number);
  let slot=0, extra=0; const done=[]; const queue=ms.slice();
  while(queue.length&&slot<300){
    const belegt=new Set(); let f=1, slotGruppe=false, slotHF=false;
    for(let i=0;i<queue.length&&f<=felder;){
      const m=queue[i], finale=m.phase==="Finale", platzh=typeof m.a==="string";
      const gruppenOffen=queue.some(q=>typeof q.a==="number"&&/^(Gruppe|Runde|Festival)/.test(q.phase));
      const hfOffen=queue.some(q=>/^Halbfinale/.test(q.phase))||slotHF;
      // Finalrunde nie im selben Fenster wie ein Gruppenspiel; Finale/Platz 3 erst NACH den Halbfinals
      const wartet=platzh&&(gruppenOffen||slotGruppe||(/^[SV]\|/.test(String(m.a))&&hfOffen));
      if(!belegt.has(String(m.a))&&!belegt.has(String(m.b))&&!wartet&&(!finale||(f===1&&!belegt.size))){
        if(platzh&&!extra)extra=puffer;                    // Verschnaufpause vor der Finalrunde
        const t=sh*60+sm+slot*(dauer+pause)+extra;
        m.zeit=String(Math.floor(t/60)%24).padStart(2,"0")+":"+String(t%60).padStart(2,"0");
        m.feld=f++; belegt.add(String(m.a)); belegt.add(String(m.b));
        if(typeof m.a==="number")slotGruppe=true;
        if(/^Halbfinale/.test(m.phase))slotHF=true;
        done.push(m); queue.splice(i,1);
        if(finale)break;
      }else i++;
    }
    slot++;
  }
  return done.map(m=>({...m,ta:null,tb:null}));
}
// Tabelle über eine Teilmenge des Plans (nur echte Team-Indizes, nur mit Ergebnis)
function _htTabelle(plan,idxs,teams){
  const t={}; idxs.forEach(i=>t[i]={i,name:teams[i],pkt:0,tore:0,geg:0,sp:0});
  plan.forEach(p=>{
    if(typeof p.a!=="number"||typeof p.b!=="number"||p.ta==null||p.tb==null)return;
    if(!t[p.a]||!t[p.b])return;
    const A=t[p.a],B=t[p.b];A.sp++;B.sp++;A.tore+=p.ta;A.geg+=p.tb;B.tore+=p.tb;B.geg+=p.ta;
    if(p.ta>p.tb)A.pkt+=3;else if(p.ta<p.tb)B.pkt+=3;else{A.pkt++;B.pkt++;}
  });
  return Object.values(t).sort((a,b)=>b.pkt-a.pkt||(b.tore-b.geg)-(a.tore-a.geg)||b.tore-a.tore);
}
async function htOpen(){
  document.getElementById("hturnier-modal")?.remove();
  const m=document.createElement("div");m.id="hturnier-modal";
  m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","Heimturnier");
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10002;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);color:var(--text);border-radius:16px;padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("hturnier-modal","🏆","Heimturnier","Wir richten aus – Spielplan erstellen und per Link an alle Trainer","#b45309")}
    <div id="ht-body"><div style="font-size:12px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  htListe();
}
async function htListe(){
  _HT=null;
  const el=document.getElementById("ht-body"); if(!el)return;
  let rows=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/heimturnier?select=id,slug,name,datum,teams,aktiv&order=created_at.desc&limit=10`,{headers:sbAuthHeaders()});if(!sbCheck401(r)&&r.ok)rows=(await r.json())||[];}catch(e){}
  const fld="box-sizing:border-box;padding:9px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13.5px;background:var(--surface2);color:var(--text)";
  el.innerHTML=`
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:6px">
      <input id="ht-name" placeholder="Turniername, z. B. Adler-Cup 2026" style="${fld}">
      <div style="display:flex;gap:8px"><input id="ht-datum" type="date" style="${fld};flex:1"><button class="btn btn-p btn-sm" onclick="htNeu(this)"><i class="ti ti-plus"></i>Anlegen</button></div>
    </div>
    <div style="font-weight:800;font-size:13px;margin:12px 0 6px">Unsere Turniere</div>
    ${rows.length?rows.map(t=>`<div style="display:flex;align-items:center;gap:8px;border:var(--border-s);border-left:4px solid #b45309;border-radius:12px;padding:10px 12px;margin-bottom:8px">
        <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:800">${esc(t.name)}</div>
        <div style="font-size:11px;color:var(--text2)">${t.datum?new Date(t.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})+" · ":""}${(t.teams||[]).length} Teams</div></div>
        <button class="btn btn-sm btn-p" onclick="htEdit(${t.id})">Öffnen</button>
      </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Noch kein Heimturnier angelegt.</div>'}`;
}
async function htNeu(btn){
  const name=(document.getElementById("ht-name")?.value||"").trim();
  const datum=document.getElementById("ht-datum")?.value||null;
  if(!name){toast("Bitte einen Turniernamen eingeben","err");return;}
  if(btn)btn.disabled=true;
  try{
    const body={slug:_htSlug(),name,datum,ort:(typeof VEREIN_ADRESSE!=="undefined"?VEREIN_ADRESSE:"Thurner Kamp 97, 51069 Köln"),
      config:{felder:1,start:"10:00",spieldauer:12,pause:3,puffer:10,format:"liga",gruppen:2,spielform:"f4",regeln:HT_REGELN.f4,infos:HT_INFOS_VORLAGE},teams:["SV Adler Dellbrück"]};
    const r=await fetch(`${SB_URL}/rest/v1/heimturnier`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'return=representation'},body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(!r.ok){toast(sbDeniedMsg(r,"Konnte nicht anlegen"),"err");return;}
    const row=(await r.json())[0];
    toast("🏆 Turnier angelegt");
    htEdit(row.id);
  }catch(e){toast("Netzwerkfehler","err");}
  finally{if(btn)btn.disabled=false;}
}
async function htEdit(id){
  const el=document.getElementById("ht-body"); if(!el)return;
  el.innerHTML='<div style="font-size:12px;color:var(--text3)">Lade…</div>';
  try{const r=await fetch(`${SB_URL}/rest/v1/heimturnier?id=eq.${id}&select=*`,{headers:sbAuthHeaders()});if(r.ok)_HT=((await r.json())||[])[0]||null;}catch(e){}
  if(!_HT){el.innerHTML='<div style="font-size:12px;color:var(--text3)">Nicht gefunden.</div>';return;}
  // Gegner-DB einmal laden – daraus werden die Schnellwahl-Chips
  if(!window._htGegner){
    try{const r=await fetch(`${SB_URL}/rest/v1/gegner?select=name&order=name.asc&limit=60`,{headers:sbAuthHeaders()});if(r.ok)window._htGegner=((await r.json())||[]).map(g=>g.name);}catch(e){}
    if(!window._htGegner)window._htGegner=[];
  }
  htRender();
}
async function htPatch(fields){
  if(!_HT)return false;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/heimturnier?id=eq.${_HT.id}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({...fields,updated_at:new Date().toISOString()})});
    if(!r.ok&&r.status!==204){toast(sbDeniedMsg(r,"Konnte nicht speichern"),"err");return false;}
    Object.assign(_HT,fields);
    return true;
  }catch(e){toast("Netzwerkfehler","err");return false;}
}
function htRender(){
  const el=document.getElementById("ht-body"); if(!el||!_HT)return;
  const cfg=_HT.config||{}, teams=_HT.teams||[], plan=_HT.plan||[];
  const fld="box-sizing:border-box;padding:8px;border:var(--border-s);border-radius:8px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text)";
  const istGruppen=cfg.format==="gruppen";
  const gruppen=istGruppen?_htGruppenN(_HT):null;
  const grVon=i=>{if(!gruppen)return "";const g=gruppen.findIndex(idxs=>idxs.indexOf(i)>=0);return g>=0?HT_GRLABEL[g]:"";};
  const teamZeile=(name,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:2px 0">
      ${istGruppen?`<span style="font-size:10px;font-weight:800;color:#b45309;width:18px">${grVon(i)}</span>`:""}
      <span style="flex:1;font-size:13px">${esc(name)}</span>
      ${i>0?`<button onclick="htTeamHoch(${i})" aria-label="nach oben" style="min-width:44px;min-height:44px;margin:-8px 0;border:none;background:transparent;color:var(--text3);cursor:pointer"><i class="ti ti-arrow-up"></i></button>`:'<span style="min-width:44px"></span>'}
      <button onclick="htTeamWeg(${i})" aria-label="Team entfernen" style="min-width:44px;min-height:44px;margin:-8px 0;border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`;
  // Schnellwahl aus der Gegner-DB: Tippen fügt hinzu; nochmal tippen = zweite Mannschaft („… 2")
  const dbChips=(window._htGegner||[]).length?`<div style="font-size:11px;color:var(--text2);margin:6px 0 4px">Aus der Gegner-Datenbank (nochmal tippen = 2. Mannschaft):</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${(window._htGegner||[]).map(g=>`<button onclick="htTeamAusDB('${jsq(g)}')" style="min-height:44px;padding:6px 12px;border:var(--border-s);border-radius:18px;font-family:inherit;font-size:12px;cursor:pointer;background:var(--surface2);color:var(--text)">${esc(g)}</button>`).join("")}</div>`:"";
  // Spielplan-Zeilen mit Ergebnis-Steppern (Platzhalter erst nach „Finalrunde füllen" spielbar)
  const spielZeile=(p,mi)=>{
    const echt=typeof p.a==="number"&&typeof p.b==="number";
    const step=(seite,wert)=>`<span style="display:inline-flex;align-items:center;gap:2px">
      <button onclick="htTor(${mi},'${seite}',-1)" aria-label="Tor zurücknehmen" style="min-width:44px;min-height:44px;border:var(--border-s);border-radius:10px;background:var(--surface2);color:var(--text);font-size:15px;cursor:pointer">−</button>
      <b style="min-width:24px;text-align:center;font-size:16px">${wert==null?"–":wert}</b>
      <button onclick="htTor(${mi},'${seite}',1)" aria-label="Tor" style="min-width:44px;min-height:44px;border:var(--border-s);border-radius:10px;background:var(--surface2);color:var(--text);font-size:15px;cursor:pointer">+</button>
    </span>`;
    return `<div style="border:var(--border-s);border-radius:12px;padding:8px 10px;margin-bottom:8px;${p.ta!=null?"opacity:.78;":""}">
      <div style="font-size:10.5px;color:var(--text2);display:flex;gap:8px"><b>${esc(p.zeit||"")}</b><span>Feld ${p.feld||1}</span><span style="margin-left:auto;color:#b45309;font-weight:700">${esc(p.phase||"")}</span></div>
      <div style="font-size:13px;font-weight:800;margin-top:2px">${esc(_htName(p.a,teams))} <span style="color:var(--text3);font-weight:400">vs</span> ${esc(_htName(p.b,teams))}</div>
      ${echt?`<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px">${step("ta",p.ta)}<span style="font-weight:900">:</span>${step("tb",p.tb)}</div>`:'<div style="font-size:11px;color:var(--text3);margin-top:4px">Wird über „Finalrunde füllen" besetzt.</div>'}
    </div>`;
  };
  // Tabellen (Festival: bewusst keine)
  let tabellen="";
  if(plan.length&&cfg.format!=="festival"){
    const blocks=istGruppen
      ?_htGruppenN(_HT).map((idxs,g)=>["Gruppe "+HT_GRLABEL[g],idxs])
      :[["Tabelle",teams.map((_,i)=>i)]];
    tabellen=blocks.map(([titel,idxs])=>`<div style="font-weight:800;font-size:13px;margin:10px 0 2px">📊 ${titel}</div>`
      +_htTabelle(plan,idxs,teams).map((z,pl)=>`<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:2px 0">
        <span style="width:20px">${pl+1}.</span><span style="flex:1">${esc(z.name)}</span>
        <span style="font-size:10.5px;color:var(--text3)">${z.tore}:${z.geg}</span><b style="min-width:22px;text-align:right">${z.pkt}</b>
      </div>`).join("")).join("");
  }
  const url=_htUrl(_HT.slug);
  const finalsOffen=istGruppen&&plan.some(p=>typeof p.a==="string");
  const vorschlag=_htGrVorschlag(teams.length);
  el.innerHTML=`
    <button class="btn btn-sm" style="margin-bottom:10px" onclick="htListe()"><i class="ti ti-arrow-left"></i>Alle Turniere</button>
    <div style="font-size:15px;font-weight:900;margin-bottom:8px">${esc(_HT.name)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <label style="font-size:11px;color:var(--text2)">Datum<input id="ht-e-datum" type="date" value="${esc(_HT.datum||"")}" style="${fld};width:100%;margin-top:3px"></label>
      <label style="font-size:11px;color:var(--text2)">Start<input id="ht-e-start" type="time" value="${esc(cfg.start||"10:00")}" style="${fld};width:100%;margin-top:3px"></label>
      <label style="font-size:11px;color:var(--text2)">Spielfelder<select id="ht-e-felder" style="${fld};width:100%;margin-top:3px">${[1,2,3,4].map(f=>`<option value="${f}"${cfg.felder==f?" selected":""}>${f} ${f===1?"Feld":"Felder parallel"}</option>`).join("")}</select></label>
      <label style="font-size:11px;color:var(--text2)">Format<select id="ht-e-format" onchange="htRenderCfg()" style="${fld};width:100%;margin-top:3px">${Object.entries(HT_FORMATE).map(([k,v])=>`<option value="${k}"${cfg.format===k?" selected":""}>${v}</option>`).join("")}</select></label>
      ${istGruppen?`<label style="font-size:11px;color:var(--text2)">Gruppen<select id="ht-e-gruppen" style="${fld};width:100%;margin-top:3px">${[2,3,4].map(g=>`<option value="${g}"${(cfg.gruppen||2)==g?" selected":""}>${g} Gruppen${g===vorschlag?" (Vorschlag)":""}</option>`).join("")}</select></label>`:""}
      <label style="font-size:11px;color:var(--text2)">Spielform<select id="ht-e-spielform" style="${fld};width:100%;margin-top:3px">${Object.entries(HT_SPIELFORM).map(([k,v])=>`<option value="${k}"${(cfg.spielform||"f4")===k?" selected":""}>${v}</option>`).join("")}</select></label>
      <label style="font-size:11px;color:var(--text2)">Spielzeit (Min.)<input id="ht-e-dauer" type="number" min="4" max="30" value="${cfg.spieldauer||12}" style="${fld};width:100%;margin-top:3px"></label>
      <label style="font-size:11px;color:var(--text2)">Pause (Min.)<input id="ht-e-pause" type="number" min="0" max="15" value="${cfg.pause==null?3:cfg.pause}" style="${fld};width:100%;margin-top:3px"></label>
      <label style="font-size:11px;color:var(--text2)">Puffer vor Finalrunde (Min.)<input id="ht-e-puffer" type="number" min="0" max="60" value="${cfg.puffer==null?10:cfg.puffer}" style="${fld};width:100%;margin-top:3px"></label>
    </div>
    ${istGruppen?`<div style="font-size:11px;color:var(--text3);margin-bottom:8px">${teams.length} Teams → Vorschlag: <b>${vorschlag} Gruppen</b>. Finalrunde: 2 Gruppen = Platzierungsspiele Rang gegen Rang · 3 Gruppen = Finale der besten Gruppensieger · 4 Gruppen = Überkreuz-Halbfinals + Finale.</div>`:""}
    <div style="font-weight:800;font-size:13px;margin:10px 0 4px">Teams <span style="font-weight:400;font-size:11px;color:var(--text3)">(${teams.length}${istGruppen?" · Reihenfolge = Gruppen-Blöcke, ↑ zum Sortieren":""})</span></div>
    ${teams.map(teamZeile).join("")}
    ${dbChips}
    <div style="display:flex;gap:6px;margin:6px 0 10px">
      <input id="ht-team-neu" placeholder="Team von Hand, z. B. FC Musterstadt" style="${fld};flex:1;min-width:0" onkeydown="if(event.key==='Enter')htTeamPlus()">
      <button class="btn btn-sm" onclick="htTeamPlus()"><i class="ti ti-plus"></i></button>
    </div>
    <details style="margin-bottom:10px"${plan.length?"":" open"}>
      <summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--blue);min-height:44px;display:flex;align-items:center">📖 Regelwerk &amp; Infos für Gastvereine</summary>
      <div style="font-size:11px;color:var(--text2);margin:6px 0 4px">Regelwerk (steht auf der öffentlichen Turnierseite):</div>
      <textarea id="ht-e-regeln" rows="7" style="${fld};width:100%;resize:vertical">${esc(cfg.regeln||"")}</textarea>
      <button class="btn btn-sm" style="margin-top:4px" onclick="htRegelnVorlage()">↺ Vorlage zur gewählten Spielform laden</button>
      <div style="font-size:11px;color:var(--text2);margin:10px 0 4px">Infos für die Gastvereine (Anreise, Parken, Turnierleitung …):</div>
      <textarea id="ht-e-infos" rows="6" style="${fld};width:100%;resize:vertical">${esc(cfg.infos||"")}</textarea>
      <button class="btn btn-sm btn-p" style="margin-top:6px" onclick="htTexteSave(this)"><i class="ti ti-device-floppy"></i>Regeln &amp; Infos speichern</button>
    </details>
    <button class="btn btn-p" style="width:100%" onclick="htGenerieren()"><i class="ti ti-calendar-bolt"></i>${plan.length?"Spielplan NEU erzeugen":"Spielplan erzeugen"}</button>
    ${plan.length?`
      <div style="font-weight:800;font-size:13.5px;margin:14px 0 6px">📅 Spielplan <span style="font-weight:400;font-size:11px;color:var(--text3)">(${plan.length} Spiele · ${HT_SPIELFORM[cfg.spielform]||""})</span></div>
      ${plan.map(spielZeile).join("")}
      ${finalsOffen?`<button class="btn btn-sm" style="width:100%" onclick="htFinalsFill()">🏁 Finalrunde füllen (nach Gruppen bzw. Halbfinals)</button>`:""}
      ${tabellen}
      ${cfg.format==="festival"?'<div style="font-size:11.5px;color:#16a34a;margin-top:6px">🦅 Festival-Modus: alle spielen gleich viel, bewusst keine Tabelle (DFB-Kinderfußball).</div>':""}
      <div style="font-weight:800;font-size:13.5px;margin:14px 0 6px">📤 An die Gast-Trainer</div>
      <div style="font-size:11px;color:var(--text2);word-break:break-all;background:var(--surface2);border-radius:8px;padding:8px 10px;margin-bottom:8px">${esc(url)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-p" onclick="htShare()"><i class="ti ti-share"></i>Link teilen</button>
        <a class="btn btn-sm" href="https://wa.me/?text=${encodeURIComponent("🏆 "+_HT.name+" – Spielplan & Live-Ergebnisse: "+url)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a class="btn btn-sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link"></i>Ansicht öffnen</a>
      </div>
      <div style="text-align:center;margin-top:10px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}" alt="QR-Code zum Turnierplan" width="180" height="180" style="border-radius:10px;background:#fff;padding:6px"></div>
    `:""}
    <button class="btn btn-sm" style="width:100%;margin-top:14px;color:#dc2626" onclick="htDelete()"><i class="ti ti-trash"></i>Turnier löschen</button>`;
}
// Formatwechsel: Gruppen-Auswahl ein-/ausblenden, ohne Eingaben zu verlieren
function htRenderCfg(){ Object.assign(_HT.config,_htCfgLesen()); htRender(); }
function _htCfgLesen(){
  const alt=_HT&&_HT.config||{};
  return {
    felder:Number(document.getElementById("ht-e-felder")?.value)||alt.felder||1,
    start:document.getElementById("ht-e-start")?.value||alt.start||"10:00",
    spieldauer:Number(document.getElementById("ht-e-dauer")?.value)||alt.spieldauer||12,
    pause:document.getElementById("ht-e-pause")?(Number(document.getElementById("ht-e-pause").value)||0):(alt.pause==null?3:alt.pause),
    puffer:document.getElementById("ht-e-puffer")?(Number(document.getElementById("ht-e-puffer").value)||0):(alt.puffer==null?10:alt.puffer),
    format:document.getElementById("ht-e-format")?.value||alt.format||"liga",
    gruppen:Number(document.getElementById("ht-e-gruppen")?.value)||alt.gruppen||2,
    spielform:document.getElementById("ht-e-spielform")?.value||alt.spielform||"f4",
    regeln:document.getElementById("ht-e-regeln")?document.getElementById("ht-e-regeln").value:(alt.regeln||""),
    infos:document.getElementById("ht-e-infos")?document.getElementById("ht-e-infos").value:(alt.infos||"")
  };
}
function htRegelnVorlage(){
  const sf=document.getElementById("ht-e-spielform")?.value||"f4";
  const ta=document.getElementById("ht-e-regeln"); if(!ta)return;
  if(ta.value.trim()&&!confirm("Regelwerk durch die Vorlage ersetzen?"))return;
  ta.value=HT_REGELN[sf]||"";
}
async function htTexteSave(btn){
  if(btn)btn.disabled=true;
  const ok=await htPatch({config:_htCfgLesen(),datum:document.getElementById("ht-e-datum")?.value||_HT.datum});
  if(btn)btn.disabled=false;
  if(ok)toast("Gespeichert ✓");
}
// Aus der Gegner-DB: erster Tipp = Vereinsname, weitere Tipps = „… 2", „… 3" (mehrere Mannschaften)
async function htTeamAusDB(name){
  const teams=_HT.teams||[];
  let neu=name, nr=2;
  while(teams.some(t=>t.toLowerCase()===neu.toLowerCase())){neu=name+" "+nr;nr++;}
  if(await htPatch({teams:[...teams,neu],config:_htCfgLesen(),datum:document.getElementById("ht-e-datum")?.value||_HT.datum}))htRender();
}
async function htTeamPlus(){
  const inp=document.getElementById("ht-team-neu");
  const name=(inp?.value||"").trim(); if(!name)return;
  if((_HT.teams||[]).some(t=>t.toLowerCase()===name.toLowerCase())){toast("Team ist schon dabei – für eine zweite Mannschaft z. B. „… 2“ anhängen","err");return;}
  if(await htPatch({teams:[...(_HT.teams||[]),name],config:_htCfgLesen(),datum:document.getElementById("ht-e-datum")?.value||_HT.datum}))htRender();
}
async function htTeamWeg(i){
  const teams=(_HT.teams||[]).slice();
  if((_HT.plan||[]).length&&!confirm("Team entfernen? Der Spielplan muss danach neu erzeugt werden."))return;
  teams.splice(i,1);
  if(await htPatch({teams,plan:[]}))htRender();
}
async function htTeamHoch(i){
  const teams=(_HT.teams||[]).slice();
  const t=teams.splice(i,1)[0];teams.splice(i-1,0,t);
  if(await htPatch({teams}))htRender();
}
async function htGenerieren(){
  const teams=_HT.teams||[];
  if(teams.length<3){toast("Mindestens 3 Teams eintragen","err");return;}
  const cfg=_htCfgLesen();
  if(cfg.format==="gruppen"&&teams.length<cfg.gruppen*2){toast("Zu wenige Teams für "+cfg.gruppen+" Gruppen","err");return;}
  const hatErg=(_HT.plan||[]).some(p=>p.ta!=null);
  if(hatErg&&!confirm("Es gibt schon Ergebnisse – Spielplan wirklich neu erzeugen? Alle Ergebnisse gehen verloren."))return;
  const plan=_htGen(teams,cfg);
  if(await htPatch({config:cfg,plan,datum:document.getElementById("ht-e-datum")?.value||_HT.datum})){
    toast("📅 Spielplan steht – "+plan.length+" Spiele");
    htRender();
  }
}
async function htTor(mi,seite,delta){
  const plan=(_HT.plan||[]).slice();
  const p=plan[mi]; if(!p)return;
  p[seite]=Math.max(0,(p[seite]==null?0:p[seite])+delta);
  const andere=seite==="ta"?"tb":"ta"; if(p[andere]==null)p[andere]=0;
  if(await htPatch({plan}))htRender();
}
/* Finalrunde füllen: löst Platzhalter auf, sobald die Daten da sind.
   Gruppen-Ränge (A1…D3) nach der Gruppenphase; GS/GZ (3 Gruppen) im Quer-Vergleich
   aller Gruppensieger bzw. Zweiten; Sieger/Verlierer der Halbfinals (4 Gruppen)
   nach den HF-Ergebnissen – bei HF-Unentschieden bitte erst einen Sieger eintragen. */
async function htFinalsFill(){
  const plan=(_HT.plan||[]).slice(), teams=_HT.teams||[];
  const offenGruppe=plan.some(p=>typeof p.a==="number"&&/^Gruppe/.test(p.phase||"")&&p.ta==null);
  if(offenGruppe&&!confirm("Noch nicht alle Gruppenspiele haben ein Ergebnis – Platzhalter trotzdem nach aktuellem Stand füllen?"))return;
  const gruppen=_htGruppenN(_HT);
  const tabs=gruppen.map((idxs,g)=>_htTabelle(plan.filter(p=>p.phase==="Gruppe "+HT_GRLABEL[g]),idxs,teams));
  const cmp=(a,b)=>b.pkt-a.pkt||(b.tore-b.geg)-(a.tore-a.geg)||b.tore-a.tore;
  const sieger=tabs.map(t=>t[0]).filter(Boolean).sort(cmp);
  const zweite=tabs.map(t=>t[1]).filter(Boolean).sort(cmp);
  let hfUnentschieden=false;
  const aufloesen=v=>{
    const s=String(v);
    let m=/^([A-D])(\d+)$/.exec(s);
    if(m){const rang=(tabs[HT_GRLABEL.indexOf(m[1])]||[])[Number(m[2])-1];return rang?rang.i:v;}
    m=/^GS(\d)$/.exec(s); if(m)return sieger[Number(m[1])-1]?sieger[Number(m[1])-1].i:v;
    if(s==="GZ1")return zweite[0]?zweite[0].i:v;
    m=/^([SV])\|(.+)$/.exec(s);
    if(m){
      const hf=plan.find(p=>p.phase===m[2]&&typeof p.a==="number"&&typeof p.b==="number"&&p.ta!=null);
      if(!hf)return v;
      if(hf.ta===hf.tb){hfUnentschieden=true;return v;}
      const siegerIdx=hf.ta>hf.tb?hf.a:hf.b, verliererIdx=hf.ta>hf.tb?hf.b:hf.a;
      return m[1]==="S"?siegerIdx:verliererIdx;
    }
    return v;
  };
  plan.forEach(p=>{if(typeof p.a==="string")p.a=aufloesen(p.a);if(typeof p.b==="string")p.b=aufloesen(p.b);});
  if(await htPatch({plan})){
    toast(hfUnentschieden?"Halbfinale unentschieden – bitte erst einen Sieger eintragen (z. B. nach Neunmeter)":"🏁 Finalrunde gefüllt");
    htRender();
  }
}
function htShare(){
  const url=_htUrl(_HT.slug);
  if(navigator.share){navigator.share({title:_HT.name,text:"🏆 "+_HT.name+" – Spielplan & Live-Ergebnisse",url}).catch(()=>{});return;}
  try{navigator.clipboard.writeText(url);toast("Link kopiert ✓");}catch(e){prompt("Link kopieren:",url);}
}
async function htDelete(){
  if(!confirm(`„${_HT.name}" samt Spielplan wirklich löschen?`))return;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/heimturnier?id=eq.${_HT.id}`,{method:"DELETE",headers:sbAuthHeaders()});
    if(!r.ok&&r.status!==204){toast("Konnte nicht löschen","err");return;}
  }catch(e){toast("Netzwerkfehler","err");return;}
  toast("Gelöscht ✓");
  htListe();
}
/* ── M3: Öffentliche Turnierseite (?turnier=<slug>) – kein Login, nur Teamnamen.
   Eigenes helles Layout (unabhängig vom App-Theme), Auto-Aktualisierung alle 30 s. ── */
async function renderHeimturnierView(slug){
  document.body.style.cssText="margin:0;background:#f1f5f9;font-family:Inter,system-ui,sans-serif;color:#0f172a";
  const wrap=document.createElement("div");
  wrap.id="ht-public";
  wrap.style.cssText="max-width:560px;margin:0 auto;padding:14px 14px 40px";
  document.body.appendChild(wrap);
  const laden=async()=>{
    let row=null;
    try{const r=await fetch(`${SB_URL}/rest/v1/heimturnier?slug=eq.${encodeURIComponent(slug)}&select=*`,{headers:sbAuthHeaders()});if(r.ok)row=((await r.json())||[])[0]||null;}catch(e){}
    _htPublicRender(wrap,row);
  };
  await laden();
  setInterval(()=>{if(!document.hidden)laden();},30000);
}
function _htPublicRender(wrap,row){
  if(!row){wrap.innerHTML=`<div style="text-align:center;padding:60px 20px"><div style="font-size:44px">🏆</div><div style="font-weight:800;margin-top:8px">Turnier nicht gefunden</div><div style="font-size:13px;color:#64748b;margin-top:4px">Der Link ist abgelaufen oder falsch – bitte beim Veranstalter nachfragen.</div></div>`;return;}
  const teams=row.teams||[], plan=row.plan||[], cfg=row.config||{};
  const dat=row.datum?new Date(row.datum+"T00:00:00").toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"}):"";
  const zeilen=plan.map(p=>`<tr style="border-top:1px solid #e2e8f0;${p.ta!=null?"background:#f8fafc;":""}">
      <td style="padding:7px 6px;font-weight:700;white-space:nowrap">${esc(p.zeit||"")}</td>
      <td style="padding:7px 4px;color:#64748b;white-space:nowrap">F${p.feld||1}</td>
      <td style="padding:7px 6px">${esc(_htName(p.a,teams))} – ${esc(_htName(p.b,teams))}<div style="font-size:10px;color:#b45309;font-weight:700">${esc(p.phase||"")}</div></td>
      <td style="padding:7px 6px;text-align:right;font-weight:900;white-space:nowrap">${p.ta!=null?p.ta+" : "+p.tb:"–"}</td>
    </tr>`).join("");
  let tabellen="";
  if(plan.length&&cfg.format!=="festival"){
    const blocks=cfg.format==="gruppen"
      ?_htGruppenN(row).map((idxs,g)=>["Gruppe "+HT_GRLABEL[g],idxs])
      :[["Tabelle",teams.map((_,i)=>i)]];
    tabellen=blocks.map(([titel,idxs])=>`<div style="background:#fff;border-radius:14px;padding:12px 14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-weight:800;font-size:14px;margin-bottom:6px">📊 ${titel}</div>
      ${_htTabelle(plan,idxs,teams).map((z,pl)=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0">
        <span style="width:22px;color:#64748b">${pl+1}.</span><span style="flex:1;font-weight:600">${esc(z.name)}</span>
        <span style="font-size:11px;color:#94a3b8">${z.sp} Sp. · ${z.tore}:${z.geg}</span><b style="min-width:24px;text-align:right">${z.pkt}</b>
      </div>`).join("")}
    </div>`).join("");
  }else if(plan.length){
    tabellen=`<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:12px 14px;margin-top:12px;font-size:13px;color:#065f46">🦅 Festival-Turnier: Alle spielen gleich viel – auf eine Tabelle verzichten wir bewusst (Kinderfußball!).</div>`;
  }
  const sf=HT_SPIELFORM[cfg.spielform]||"";
  wrap.innerHTML=`
    <div style="background:linear-gradient(135deg,#1e3a8a,#b45309);border-radius:16px;padding:18px 16px;color:#fff;text-align:center">
      <div style="font-size:36px">🏆</div>
      <div style="font-size:20px;font-weight:900;margin-top:4px">${esc(row.name)}</div>
      <div style="font-size:12.5px;opacity:.9;margin-top:4px">${esc(dat)}${row.ort?" · "+esc(row.ort):""}</div>
      ${sf?`<div style="display:inline-block;margin-top:8px;background:rgba(255,255,255,.18);border-radius:12px;padding:3px 12px;font-size:12px;font-weight:800">⚽ ${esc(sf)}</div>`:""}
      <div style="font-size:11px;opacity:.75;margin-top:6px">Veranstalter: SV Adler Dellbrück U9 · Ergebnisse live</div>
    </div>
    ${plan.length?`<div style="background:#fff;border-radius:14px;padding:8px 4px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">${zeilen}</table>
    </div>`:'<div style="background:#fff;border-radius:14px;padding:20px;margin-top:12px;text-align:center;color:#64748b;font-size:13px">Der Spielplan wird gerade erstellt – gleich nochmal schauen.</div>'}
    ${tabellen}
    ${cfg.regeln?`<details style="background:#fff;border-radius:14px;padding:12px 14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <summary style="font-weight:800;font-size:14px;cursor:pointer;min-height:44px;display:flex;align-items:center">📖 Regelwerk (${esc(sf||"Spielform")})</summary>
      <div style="font-size:13px;line-height:1.55;white-space:pre-wrap;margin-top:6px;color:#334155">${esc(cfg.regeln)}</div>
    </details>`:""}
    ${cfg.infos?`<div style="background:#fff;border-radius:14px;padding:12px 14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="font-weight:800;font-size:14px;margin-bottom:6px">ℹ️ Infos für die Gastvereine</div>
      <div style="font-size:13px;line-height:1.55;white-space:pre-wrap;color:#334155">${esc(cfg.infos)}</div>
    </div>`:""}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="location.reload()" style="flex:1;min-height:44px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🔄 Aktualisieren</button>
      <button onclick="window.print()" style="flex:1;min-height:44px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">🖨️ Drucken</button>
    </div>
    <div style="text-align:center;font-size:10.5px;color:#94a3b8;margin-top:10px">Aktualisiert sich automatisch · Stand ${new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})} Uhr</div>`;
}
