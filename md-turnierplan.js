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
        <span style="flex:1;font-size:12.5px">${getKader(k.name)?.nr?getKader(k.name).nr+" ":""}${esc(k.name)}</span>
        ${["dabei","nicht","verletzt"].map(s=>`<button onclick="nomSet('${k.name}','${s}')" style="min-height:44px;padding:5px 9px;font-size:11px;border:var(--border-s);border-radius:var(--r);cursor:pointer;font-family:inherit;background:${cur===s?stCfg[s].col:"var(--surface)"};color:${cur===s?"#fff":"var(--text2)"}">${stCfg[s].lbl}</button>`).join("")}
      </div>`;
    }).join("");
}
