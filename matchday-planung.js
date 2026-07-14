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
/* Pro-Modus (17.4): Board auf Vollbild maximieren + feste Bank rechts. Reiner CSS-State
   (body.taktik-pro), zusätzlich best-effort echtes Fullscreen fürs Tablet an der Linie. */
function taktikProToggle(){
  const on=document.body.classList.toggle("taktik-pro");
  document.getElementById("tb-pro-btn")?.classList.toggle("btn-p",on);
  try{
    if(on){document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{});}
    else if(document.fullscreenElement){document.exitFullscreen&&document.exitFullscreen().catch(()=>{});}
  }catch(e){}
  try{navigator.vibrate&&navigator.vibrate(30);}catch(e){}
}
// Verlässt der Trainer das Fullscreen per ESC/Systemgeste, den Pro-State mitziehen.
document.addEventListener("fullscreenchange",()=>{
  if(!document.fullscreenElement&&document.body.classList.contains("taktik-pro")){
    document.body.classList.remove("taktik-pro");
    document.getElementById("tb-pro-btn")?.classList.remove("btn-p");
  }
});

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
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&order=datum.asc,uhrzeit.asc.nullslast`,{headers:sbAuthHeaders()});
    if(sbCheck401(r))return;
    if(!r.ok){up.innerHTML='<div style="font-size:11px;color:var(--text3)">Keine Verbindung</div>';return;}
    const rows=await r.json();
    TM_TERMINE=rows;
    const heute=new Date().toISOString().slice(0,10);
    const kommend=rows.filter(t=>t.datum>=heute);
    const vergangen=rows.filter(t=>t.datum<heute).reverse();
    up.innerHTML=kommend.length?kommend.map(tmCard).join(""):'<div style="font-size:11px;color:var(--text3);padding:6px">Keine kommenden Termine.</div>';
    const car=document.getElementById("tm-carousel"); if(car)car.innerHTML=tmCarouselHtml(kommend); // Karussell der nächsten Termine
    pa.innerHTML=vergangen.length?vergangen.slice(0,20).map(tmCard).join(""):'<div style="font-size:11px;color:var(--text3);padding:6px">Noch keine vergangenen Termine.</div>';
    kommend.forEach(t=>wetterInto("wx-tm-"+t.id,t.datum,t.ort,t.uhrzeit)); // Wetter je Termin (stundengenau, self-limitiert)
    kommend.filter(t=>t.heim===true&&(t.typ==="spiel"||t.typ==="turnier")).forEach(buedchenTrainerFill); // Büdchen je Heimspiel
  }catch(e){up.innerHTML='<div style="font-size:11px;color:var(--text3)">Offline</div>';}
}
// Karussell der nächsten Termine (Trainer): kompakte, chronologische Karten; Klick springt zur Detailkarte.
function tmCarouselHtml(rows){
  const up=(rows||[]).slice(0,10);
  if(up.length<2)return "";
  const cards=up.map(t=>{
    const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1e3a8a"};
    const d=new Date(t.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
    const hb=heimLabel(t);
    return `<div onclick="tmCarouselJump(${t.id})" style="min-width:180px;max-width:200px;flex:none;scroll-snap-align:start;background:var(--surface2);border:var(--border-s);border-left:3px solid ${m.col};border-radius:12px;padding:10px;cursor:pointer">
      <div style="font-size:12.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.icon} ${esc(t.titel||m.label)}</div>
      <div style="font-size:10.5px;color:var(--text2);margin-top:2px">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit?" · "+zeit:""}</div>
      ${hb?`<div style="font-size:10px;font-weight:700;margin-top:3px;color:${t.heim?"#15803d":"#b45309"}">${hb}</div>`:""}
    </div>`;
  }).join("");
  return `<div style="margin-bottom:12px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--text2);margin-bottom:6px">📅 Nächste Termine · wischen & antippen zum Anspringen →</div>
    <div style="display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px">${cards}</div>
  </div>`;
}
// Karussell-Klick: ist die Detailkarte auf der Seite (Termine-Tab), dorthin scrollen.
// Sonst – z. B. von der Startseite – das Termin-Detailfenster öffnen.
function tmCarouselJump(id){
  const el=document.getElementById("tm-card-"+id);
  if(el){el.scrollIntoView({behavior:"smooth",block:"start"});return;}
  tmDetailOpen(id);
}
// Trainer-Termin-Detailfenster: zeigt die volle Terminkarte (mit allen Aktionen) als Overlay.
function tmDetailOpen(id){
  const t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(id));
  if(!t){ if(typeof go==="function")go("termine"); return; }
  document.getElementById("tmd-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="tmd-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-label","Termin-Details");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10040;display:flex;flex-direction:column;padding:14px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const c=document.createElement("div");
  c.style.cssText="max-width:460px;width:100%;margin:auto";
  c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button onclick="document.getElementById('tmd-modal').remove()" aria-label="Schließen" style="border:none;background:rgba(255,255,255,.92);width:40px;height:40px;border-radius:50%;font-size:22px;color:#334155;cursor:pointer;line-height:1">×</button></div>${tmCard(t)}`;
  modal.appendChild(c);document.body.appendChild(modal);
  // Nachlader wie in der Terminliste anstoßen (Wetter + Büdchen füllen ihre Slots per id).
  try{ wetterInto("wx-tm-"+t.id,t.datum,t.ort,t.uhrzeit); }catch(e){}
  if(t.heim===true&&(t.typ==="spiel"||t.typ==="turnier")){ try{ buedchenTrainerFill(t); }catch(e){} }
}
// Archiv (vergangene Termine) ein-/ausklappen – standardmäßig zu, damit nur Kommendes im Fokus ist.
function tmToggleArchiv(){
  const pa=document.getElementById("tm-past"), btn=document.getElementById("tm-archiv-btn");
  if(!pa)return;
  const show=pa.style.display==="none";
  pa.style.display=show?"block":"none";
  if(btn)btn.innerHTML=`<i class="ti ti-archive"></i>🗄️ Archiv: vergangene Termine ${show?"ausblenden":"anzeigen"}`;
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
  let t=(TM_TERMINE||[]).find(x=>Number(x.id)===Number(terminId));
  if(!t){ try{const r=await fetch(`${SB_URL}/rest/v1/termine?id=eq.${terminId}&select=*&limit=1`,{headers:sbAuthHeaders()});if(r.ok)t=(await r.json())[0];}catch(e){} } // von der Startseite: Termin nachladen
  t=t||{};
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
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      ${groups.offen.length?`<a class="btn btn-p btn-sm" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>`:""}
      ${groups.offen.length?`<button class="btn btn-sm" onclick="rsvpPushErinnern(${terminId},'${(t.titel||m.label).replace(/'/g,'')}','${datumStr}${zeitStr?' '+zeitStr+' Uhr':''}')"><i class="ti ti-bell"></i>Als Push</button>`:""}
      <button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('rsvp-ov-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);document.body.appendChild(modal);
}
// Push-Erinnerung an die (subscribten) Eltern – gleicher Deep-Link wie die WhatsApp-Erinnerung.
async function rsvpPushErinnern(terminId, titel, wann){
  const url=appRoot()+"?portal&rsvp="+terminId;
  await pushSendToParents("🦅 Bitte kurz rückmelden", `${titel} · ${wann} – bitte zu- oder absagen.`, url);
}
/* Platz-Ampel: drei Fat-Finger-Buttons je Termin. Setzt termine.platz_status live;
   die Eltern sehen den Status oben im Dashboard. Optionaler kurzer Zusatz (z. B.
   "Halle 2" beim Ausweichplatz oder der Grund bei Absage). */
const PLATZ_AMPEL={
  normal:  {emo:"🟢", lbl:"Findet statt", col:"#16a34a"},
  ausweich:{emo:"🟡", lbl:"Ausweichplatz", col:"#d97706", hidden:true}, // aktuell ausgeblendet (hidden:false = wieder da)
  abgesagt:{emo:"🔴", lbl:"Fällt aus",     col:"#dc2626"}
};
function platzAmpelTrainer(t){
  const cur=t.platz_status||null;
  const btns=Object.keys(PLATZ_AMPEL).filter(k=>!PLATZ_AMPEL[k].hidden).map(k=>{
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
  }else if(istSpiel){
    actions=`<button class="btn btn-sm" onclick="tmJump('aufstellung','${t.datum}','${t.spielform||''}')"><i class="ti ti-users-group"></i>Aufstellung</button>
      <button class="btn btn-sm" onclick="tmJump('blitz','${t.datum}','${t.spielform||''}')"><i class="ti ti-bolt"></i>Auswertung</button>
      <button class="btn btn-sm" onclick="mdOpen('${t.datum}','${t.typ}')"><i class="ti ti-users"></i>Eltern-Info</button>`;
  }else{ // Event (Grillfest & Co.) – keine Trainingsplanung/Aufstellung, sondern die Mitbringliste
    actions=`<button class="btn btn-sm" onclick="mitbringTrainerOpen()"><i class="ti ti-basket"></i>Mitbringliste</button>
      <button class="btn btn-sm" onclick="mdOpen('${t.datum}','${t.typ}')"><i class="ti ti-users"></i>Eltern-Info</button>`;
  }
  actions+=`<button class="btn btn-sm" onclick="tmEdit(${Number(t.id)})" title="Termin bearbeiten"><i class="ti ti-edit"></i>Bearbeiten</button>`;
  actions+=`<button class="btn btn-sm" onclick="tmIcsOne(${Number(t.id)})" title="In den Kalender"><i class="ti ti-calendar-plus"></i>Kalender</button>`;
  if(t.datum>=new Date().toISOString().slice(0,10)) actions+=`<button class="btn btn-sm" onclick="rsvpOverviewOpen(${Number(t.id)})" title="Wer hat schon geantwortet?"><i class="ti ti-list-check"></i>Rückmeldungen</button>`;
  const zeitStr=t.uhrzeit?String(t.uhrzeit).slice(0,5):((/Uhrzeit:\s*(\d{1,2}:\d{2})/.exec(t.notiz||"")||[])[1]||"");
  const sfBadge=(istSpiel&&t.spielform)?`<span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:${m.col}22;color:${m.col}">${esc(t.spielform)}</span>`:"";
  const hb=heimLabel(t), hBadge=hb?`<span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:${t.heim?"#dcfce7":"#fef3c7"};color:${t.heim?"#15803d":"#b45309"}">${hb}</span>`:"";
  const notizClean=(t.notiz&&!/^Uhrzeit:/.test(t.notiz))?t.notiz:"";
  // UX 3: Trainer-Erinnerung per WhatsApp – Deep-Link (?portal&rsvp=…) fuehrt Eltern direkt zur
  // Rueckmeldung. Fuellt nur die Nachricht vor; Absenden/Empfaenger waehlt der Trainer selbst.
  let remindBtn="";
  if(t.datum>=new Date().toISOString().slice(0,10)){
    const deepLink=appRoot()+"?portal&rsvp="+t.id;
    const waText=`🦅 SV Adler U9 – bitte kurz rückmelden fürs nächste ${m.label}:\n${t.titel||m.label} am ${datumStr}${zeitStr?" um "+zeitStr+" Uhr":""}${t.ort?" ("+t.ort+")":""}\n👉 Zu-/absagen: ${deepLink}`;
    remindBtn=`<a class="btn btn-sm" href="https://wa.me/?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-bell"></i>Erinnerung</a>`;
  }
  return `<div id="tm-card-${t.id}" style="background:var(--surface);border:var(--border-s);border-left:3px solid ${m.col};border-radius:var(--rl);padding:10px 12px;margin-bottom:8px;scroll-margin-top:60px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
      <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${m.icon} ${esc(t.titel||m.label)}${hBadge}${sfBadge}</div>
      <div style="font-size:11px;color:var(--text2);white-space:nowrap">${datumStr}${zeitStr?" · "+zeitStr:""}</div>
    </div>
    ${t.ort?`<div style="font-size:11px;color:var(--text2)"><i class="ti ti-map-pin" style="font-size:11px"></i> ${mapsAnchor(t.ort)}</div>`:""}
    ${t.platz?`<div style="font-size:11px;color:var(--text2)">🏟️ Platz: ${esc(t.platz)}</div>`:""}
    ${t.datum>=new Date().toISOString().slice(0,10)?platzAmpelTrainer(t):""}
    <div id="wx-tm-${t.id}"></div>
    ${(t.heim===true&&(t.typ==="spiel"||t.typ==="turnier")&&t.datum>=new Date().toISOString().slice(0,10))?`<div id="bd-tm-${t.id}" style="font-size:11px;color:var(--text2);margin-top:4px">🍿 Büdchen: lädt …</div>`:""}
    ${t.datum>=new Date().toISOString().slice(0,10)?`<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:6px">
      <span style="font-size:10px;color:var(--text3);font-weight:700">Trainer dabei?</span>
      ${(typeof TRAINER!=="undefined"?TRAINER:[]).map(tn=>{const stt=(t.trainer_status||{})[tn];const bg=stt==="ja"?"#16a34a":stt==="unsicher"?"#ca8a04":stt==="nein"?"#dc2626":"var(--surface2)";const col=stt?"#fff":"var(--text2)";const mk=stt==="ja"?" ✓":stt==="unsicher"?" 🤔":stt==="nein"?" ✕":"";return `<button onclick="tmTrainerToggle(${Number(t.id)},'${tn.replace(/'/g,"")}')" title="Tippen wechselt: dabei → unsicher → nicht dabei → offen" style="border:var(--border-s);border-radius:12px;padding:2px 8px;font-size:10.5px;font-weight:700;background:${bg};color:${col};cursor:pointer;font-family:inherit">${esc(tn)}${mk}</button>`;}).join("")}
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
  const PLATZ=isSpiel?PLATZ_SPIEL:PLATZ_TRAINING;
  const platzCur=t.platz||(isSpiel?tmPlatzDefault(t.typ):""); // Spiele ohne Eintrag: sinnvolle Vorbelegung
  const platzOpts=`<option value=""${!platzCur?" selected":""}>– kein Platz –</option>`+PLATZ.map(p=>`<option${p===platzCur?" selected":""}>${p}</option>`).join("");
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
    ${(isTraining||isSpiel)?`<label style="font-size:11px;color:var(--text2);display:block;margin-top:8px">${isSpiel?"Spielfeld-Aufteilung":"Platz"}<select id="te-platz" style="${fld}">${platzOpts}</select></label>`:''}
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
  // Zyklus: (offen) → ja → unsicher → nein → (offen)
  st[name]= st[name]==="ja"?"unsicher":st[name]==="unsicher"?"nein":st[name]==="nein"?undefined:"ja";
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
    // tp-date ist ein Termin-Dropdown; das Ziel-Datum als Option sicherstellen (nach dem async Fill).
    const setD=()=>{ if(typeof terminSelectEnsure==="function")terminSelectEnsure("tp-date",datum); else {const d=document.getElementById("tp-date");if(d)d.value=datum;} };
    setTimeout(setD,120); setTimeout(()=>{setD();toast("Plan für "+datum);},450);
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
