/* ═══════════════════════════════════
   KALENDER / TERMINE – das Rückgrat, das Training, Spiele und Turniere verbindet
═══════════════════════════════════ */
let tmTyp="training", tmSpielform="4+1", tmHeim=true;
// Heimadresse des SV Adler Dellbrück – wird bei Training & Heimspielen vorbelegt.
const VEREIN_ADRESSE="Thurner Kamp 97, 51069 Köln";
// Nächstes Trainingsdatum: wir trainieren Mo & Fr – das jeweils nächste dieser Tage.
function tmNextTrainingDate(){
  const d=new Date(); d.setHours(0,0,0,0);
  for(let i=0;i<8;i++){ const t=new Date(d.getTime()+i*86400000); const wd=t.getDay(); if(wd===1||wd===5)return t.toISOString().slice(0,10); }
  return d.toISOString().slice(0,10);
}
const TM_META={training:{icon:"🏃",label:"Training",col:"#1a56db"},spiel:{icon:"⚽",label:"Spiel",col:"#059669"},turnier:{icon:"🏆",label:"Turnier",col:"#c2410c"},event:{icon:"🎉",label:"Event",col:"#7c3aed"}}; // UX 7: Event mit Freitext-Titel (Saisonabschluss etc.)
// Saison-Zuordnung aus einem Datum (Saison läuft Jul–Jun)
function saisonForDate(datum){
  const d=new Date((datum||new Date().toISOString().slice(0,10))+"T00:00:00");
  const y=d.getFullYear(), start=d.getMonth()>=6?y:y-1;
  return start+"/"+String(start+1).slice(2);
}
// Platz-/Spielfeld-Auswahl: beim Training das ganze Vereinsgelände granular; bei Spiel/Turnier
// ist der Platz mit anderen Teams geteilt -> nur die zwei realen Aufteilungen.
const PLATZ_TRAINING=["Käfig","vorne links","vorne rechts","hinten links","hinten rechts","Halle"];
const PLATZ_SPIEL=["links + Käfig","vorne rechts"];
function tmPlatzDefault(typ){ return (typ==="spiel"||typ==="turnier")?"links + Käfig":"vorne links"; }
function tmPlatzFill(typ){
  const sel=document.getElementById("tm-platz"); if(!sel)return;
  const istSpiel=(typ==="spiel"||typ==="turnier");
  const opts=istSpiel?PLATZ_SPIEL:PLATZ_TRAINING, def=tmPlatzDefault(typ);
  sel.innerHTML=`<option value="">– kein Platz –</option>`+opts.map(p=>`<option${p===def?" selected":""}>${esc(p)}</option>`).join("");
  const lbl=document.getElementById("tm-platz-lbl"); if(lbl)lbl.textContent=istSpiel?"Spielfeld-Aufteilung":"Platz (Training)";
}
function tmSetTyp(t,btn){
  tmTyp=t;
  if(btn){btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");}
  const istSpiel=(t==="spiel"||t==="turnier");
  const disp=(id,on)=>{const el=document.getElementById(id);if(el)el.style.display=on?"block":"none";};
  disp("tm-titel-row", t!=="training");                 // Training braucht keinen Titel/Gegner
  const lbl=document.getElementById("tm-titel-lbl"); if(lbl)lbl.textContent=t==="event"?"Titel (z. B. Saisonabschluss, Weihnachtsfeier)":"Gegner / Titel";
  // Platz gibt es bei Training UND Spiel/Turnier (jeweils eigene Optionen) – nur beim Event nicht.
  const platzRow=document.getElementById("tm-platz")?.closest(".mg"); if(platzRow)platzRow.style.display=(t==="training"||istSpiel)?"block":"none";
  disp("tm-spielform-row", istSpiel);
  disp("tm-dauer-row", istSpiel);
  disp("tm-heim-row", istSpiel);                          // Heim/Auswärts nur bei Spiel/Turnier
  const gdb=document.getElementById("tm-gegnerdb-btn"); if(gdb)gdb.style.display=istSpiel?"inline-flex":"none"; // Gegner-DB nur bei Spiel/Turnier (nicht bei Training/Event)
  const zeit=document.getElementById("tm-zeit"), datum=document.getElementById("tm-datum"), ort=document.getElementById("tm-ort");
  tmPlatzFill(t);                                         // Optionen + Vorbelegung passend zum Typ
  if(t==="training"){
    if(zeit)zeit.value="16:45";                          // Mo & Fr 16:45–18:00
    if(ort)ort.value=VEREIN_ADRESSE;                     // Training immer auf dem Vereinsgelände
    if(datum&&!datum.value)datum.value=tmNextTrainingDate();
  } else if(istSpiel){
    tmSetHeim(true);                                      // Standard: Heimspiel → Vereinsadresse
  } else if(t==="event"){
    if(ort&&ort.value===VEREIN_ADRESSE)ort.value="";     // Event: übernommene Vereinsadresse nicht erzwingen
  }
}
// Heim/Auswärts umschalten. Heim → Vereinsadresse vorbelegen; Auswärts → freigeben.
function tmSetHeim(isHeim,btn){
  tmHeim=!!isHeim;
  const seg=document.getElementById("tm-heim-seg");
  if(seg){ seg.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active")); const a=btn||seg.querySelector('.seg-btn[data-val="'+(isHeim?"heim":"ausw")+'"]'); if(a)a.classList.add("active"); }
  const ort=document.getElementById("tm-ort");
  if(ort){ if(isHeim)ort.value=VEREIN_ADRESSE; else if(ort.value===VEREIN_ADRESSE)ort.value=""; }
}
// Heim/Auswärts-Kennzeichnung für Spiele & Turniere (leer bei Training/Event oder unbekannt).
function heimLabel(t){
  if(!t||(t.typ!=="spiel"&&t.typ!=="turnier")||t.heim==null)return "";
  return t.heim?"🏠 Heim":"✈️ Auswärts";
}
function tmSetSpielform(f,btn){
  tmSpielform=f;
  btn.parentElement.querySelectorAll(".seg-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
}
function tmInit(){
  tmSetTyp("training"); // Standard-Typ + Vorbelegung (Zeit 16:45, Platz „vorne links", Vereinsadresse, nächstes Mo/Fr)
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
    heim: istSpiel?tmHeim:null,
    spieldauer_min: istSpiel?parseInt(document.getElementById("tm-dauer")?.value||"10"):20,
    halbzeiten: istSpiel?(parseInt(document.getElementById("tm-halbzeiten")?.value)||1):2
  };
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify(body)});
    if(sbCheck401(r))return;
    if(r.ok||r.status===201){terminIdCacheClear();toast("Termin angelegt ✓");document.getElementById("tm-titel").value="";const rb=document.getElementById("tm-addr-results");if(rb)rb.innerHTML="";tmSetTyp(tmTyp);tmLoad();}
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

