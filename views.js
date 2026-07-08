/* ═══════════════════════════════════════════════════════════
   ADLER VIEWS LAYER (Modularisierung 5/8)
   Trainer-Ansichten: Live-Radar, Pills, onChange, DOM-Builder,
   Kader-View+Editor+Kontakte, Profil-View, Saison-Zertifikat,
   Konfetti, Adler-Karte (FUT-Canvas), Verlauf, Nav, Home-Dashboard.
   Laedt nach engine.js, vor dem Haupt-Skript.
   Top-Level: nur 2 Listener-Registrierungen (click-Delegation, WakeLock).
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════
   LIVE RADAR
═══════════════════════════════════ */
let liveChart=null;
let builtDimsTw=null; // welche Layout-Variante (Feld=false / TW=true) aktuell im DOM steht; null = leer
function updateLiveRadar(){
  const v=getV(),dims=currentDims();
  const{dims:ds}=calcScores(v,dims);
  const labels=dims.map(d=>d.label.split(" ")[0]);
  const data=dims.map(d=>ds[d.id]||0);
  const colors=dims.map(d=>d.col);
  const ctx=document.getElementById("live-radar");
  if(!ctx)return;
  if(liveChart){liveChart.data.labels=labels;liveChart.data.datasets[0].data=data;liveChart.update("none");return;}
  liveChart=new Chart(ctx,{type:"radar",data:{labels,datasets:[{label:"Profil",data,backgroundColor:"rgba(26,86,219,.1)",borderColor:"#1a56db",borderWidth:2,pointBackgroundColor:colors,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{min:0,max:100,ticks:{stepSize:25,font:{size:9},backdropColor:"transparent"},pointLabels:{font:{size:10},color:colors},grid:{color:"rgba(100,116,139,.15)"},angleLines:{color:"rgba(100,116,139,.15)"}}}}});
}

function updateRautePreview(rolle,tw){
  ["rp-auf","rp-jaeg","rp-links","rp-rechts","rp-tw"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.className="rpos";el.style.opacity="";}
  });
  // TW always highlighted
  const twEl=document.getElementById("rp-tw");
  if(twEl) twEl.classList.add("hl-tw");
  if(tw){
    document.getElementById("raute-hint").textContent="Torwart (+1) – Feld-Rolle berechnet";
    return;
  }
  if(!rolle)return;
  const pEl=document.getElementById(rolle.posId[rolle.prim]);
  const sEl=document.getElementById(rolle.posId[rolle.sek]);
  if(pEl)pEl.classList.add(rolle.hlCls[rolle.prim]);
  if(sEl&&sEl!==pEl)sEl.classList.add("sek");
  const vorlaeufig=countFilled()<totalCrit()?" (vorläufig)":""; // F2
  document.getElementById("raute-hint").textContent=`Primär: ${rolle.primLabel} · Sek: ${rolle.sekLabel}${vorlaeufig}`;
}

/* ═══════════════════════════════════
   TIER/MX HIGHLIGHTS & PILLS
═══════════════════════════════════ */
function updateTierHL(){
  const dims=currentDims();
  getAllT(dims).forEach(n=>[1,2,3,4].forEach(v=>{
    const l=document.getElementById(`tl-${n}-${v}`);
    if(l)l.classList.toggle("sel",!!document.querySelector(`input[name="${n}"][value="${v}"]`)?.checked);
  }));
}
function updateMxHL(){
  const dims=currentDims();
  getAllM(dims).forEach(n=>{
    const tr=document.getElementById(`mxr-${n}`);
    if(tr)tr.classList.toggle("mxsel",gv(n)!=null);
  });
}
function updateDimPills(){
  const dims=currentDims();
  dims.forEach(d=>{
    const tot=d.tier.length+d.mx.length;
    let done=0;
    d.tier.forEach(t=>{if(gv(t.n)!=null)done++;});
    d.mx.forEach(m=>{if(gv(m.n)!=null)done++;});
    const pill=document.getElementById(`dpill-${d.id}`);
    if(pill){pill.textContent=`${done}/${tot}`;pill.className=`dpill${done===tot?" done":""}`;}
  });
}

/* ═══════════════════════════════════
   onChange
═══════════════════════════════════ */
function onChange(){
  const filled=countFilled(),total=totalCrit();
  const pct=total?Math.round(filled/total*100):0;
  document.getElementById("pfill").style.width=pct+"%";
  document.getElementById("plbl").textContent=`${filled} / ${total}`;
  document.getElementById("live-prog").textContent=`${filled} / ${total}`;
  document.getElementById("live-pct").textContent=pct?`${pct}%`:"";
  const bsProg=document.getElementById("bs-prog");
  if(bsProg)bsProg.textContent=`${filled} / ${total}${pct?" · "+pct+"%":""}`;
  updateTierHL();updateMxHL();updateDimPills();updateLiveRadar();
  const tw=isTWPlayer();
  if(!tw&&filled>=12)updateRautePreview(calcRolle(getV(),getMeta().foot,true),false); // F2: neutralMissing für stabile Vorschau
  else if(tw)updateRautePreview(null,true);
  if(filled===total){
    const v=getV(),meta=getMeta();
    const result=meta.tw?generateFazitTW(v,meta):generateFazitFeld(v,meta);
    document.getElementById("fazit-out").value=result.text;
  } else if(filled>0){
    document.getElementById("fazit-out").value=`Analyse läuft... ${filled} von ${total} Kriterien bewertet.\n\nBitte alle Felder ausfüllen.`;
  }
}

function onPlayerSelect(){
  const name=document.getElementById("p-name").value;
  if(!name)return;
  const k=getKader(name);
  const tw=k?.tw||false;
  // Nur neu bauen, wenn sich die Layout-Variante (Feld/TW) ändert – sonst nur Werte zurücksetzen.
  if(builtDimsTw!==tw){
    buildDims(tw);
  }else{
    document.querySelectorAll('#dims-wrap input[type="radio"]').forEach(r=>r.checked=false);
    if(wizOn){wizIdx=0;wizRender();}
  }
  showBewSticky(name);
  updateRautePreview(null,tw);
  document.getElementById("raute-hint").textContent=tw?"Torwart + Feldspieler":"Bewertung ausfüllen";
  onChange();
}
function showBewSticky(name){
  const bar=document.getElementById("bew-sticky");
  const nm=document.getElementById("bs-name");
  if(nm)nm.textContent=name||"";
  if(bar)bar.style.display=name?"flex":"none";
}

/* ═══════════════════════════════════
   DOM BUILDER
═══════════════════════════════════ */
function buildDims(isTw){
  const dims=isTw?[...DIMS_FELD,...DIMS_TW]:DIMS_FELD;
  const wrap=document.getElementById("dims-wrap");
  wrap.innerHTML="";
  builtDimsTw=isTw;
  dims.forEach(d=>{
    const block=document.createElement("div");
    block.className="dim-block";
    const tot=d.tier.length+d.mx.length;
    const isTWDim=d.id.startsWith("tw_");
    block.innerHTML=`
      <div class="dim-head" onclick="toggleDim(this)">
        <div class="dim-iw" style="background:${d.col}22"><i class="ti ${d.icon}" style="font-size:15px;color:${d.col}"></i></div>
        <div style="flex:1">
          <div class="dim-ht">${isTWDim?"🥅 ":""}${d.label}</div>
          <div class="dim-hs">${d.tier.length} Beobachtungen · ${d.mx.length} Detailwerte · ${Math.round(d.w*100)}% Gewichtung</div>
        </div>
        <span class="dpill" id="dpill-${d.id}">0/${tot}</span>
        <i class="ti ti-chevron-down dchev"></i>
      </div>
      <div class="dim-body" id="dbody-${d.id}"></div>`;
    wrap.appendChild(block);
    const body=document.getElementById(`dbody-${d.id}`);
    const tt=document.createElement("table");tt.className="tier-t";
    tt.innerHTML=`<thead><tr><th>Beobachtung</th><th>Ansatz</th><th>Solide</th><th>Gut</th><th>Stark</th></tr></thead>`;
    const tb=document.createElement("tbody");
    d.tier.forEach(t=>{
      const tr=document.createElement("tr");
      let h=`<td class="cn">${t.l}<small>${t.h}</small></td>`;
      t.opts.forEach(o=>{
        const bc=o.v===1?"lb1":o.v===2?"lb2":o.v===3?"lb3":"lb4";
        h+=`<td><div class="topt"><label id="tl-${t.n}-${o.v}"><input type="radio" name="${t.n}" value="${o.v}" onchange="onChange()"><span class="lb ${bc}">${["","Ansatz","Solide","Gut","Stark"][o.v]}</span><span><span class="ltitle">${o.t}</span><span class="ldesc">${o.d}</span></span></label></div></td>`;
      });
      tr.innerHTML=h;tb.appendChild(tr);
    });
    tt.appendChild(tb);body.appendChild(tt);
    if(d.mx.length){ // Detail-Matrix nur rendern, wenn die Dimension welche hat (v2: leer)
    const sep=document.createElement("div");
    sep.style.cssText="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text2);padding:6px 0 4px;margin-top:4px";
    sep.textContent="Detail-Bewertung (1–5)";
    body.appendChild(sep);
    const mx=document.createElement("table");mx.className="mx-t";
    mx.innerHTML=`<thead><tr><th>Kriterium</th><th>1<br><span style="font-weight:400;font-size:9px">Noch nicht</span></th><th>2<br><span style="font-weight:400;font-size:9px">Ansatz</span></th><th>3<br><span style="font-weight:400;font-size:9px">Solide</span></th><th>4<br><span style="font-weight:400;font-size:9px">Gut</span></th><th>5<br><span style="font-weight:400;font-size:9px">Stark</span></th></tr></thead>`;
    const mb=document.createElement("tbody");
    d.mx.forEach(m=>{
      const tr=document.createElement("tr");tr.id=`mxr-${m.n}`;
      let h=`<td class="mc">${m.l}<small>${m.h}</small></td>`;
      for(let i=1;i<=5;i++)h+=`<td><input type="radio" class="mxr" name="${m.n}" value="${i}" onchange="onChange()"></td>`;
      tr.innerHTML=h;mb.appendChild(tr);
    });
    mx.appendChild(mb);// wrap mx for mobile scroll
    const mxWrap=document.createElement("div");
    mxWrap.className="mx-wrap";
    const mxHint=document.createElement("div");
    mxHint.className="mx-scroll-hint";
    mxHint.innerHTML='<i class="ti ti-arrows-left-right" style="font-size:12px"></i>Seitwärts scrollen für alle Spalten';
    body.appendChild(mxHint);
    mxWrap.appendChild(mx);
    body.appendChild(mxWrap);
    } // /if d.mx.length
  });
  if(liveChart){liveChart.destroy();liveChart=null;}
  setTimeout(()=>{
    const emptyData=dims.map(()=>0);
    const labels=dims.map(d=>d.label.split(" ")[0]);
    const colors=dims.map(d=>d.col);
    const ctx=document.getElementById("live-radar");if(!ctx)return;
    if(liveChart)return; // B5: paralleler buildDims-Timeout hat schon einen Chart erstellt
    const existing=Chart.getChart(ctx);
    if(existing)existing.destroy();
    liveChart=new Chart(ctx,{type:"radar",data:{labels,datasets:[{label:"Profil",data:emptyData,backgroundColor:"rgba(26,86,219,.1)",borderColor:"#1a56db",borderWidth:2,pointBackgroundColor:colors,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{min:0,max:100,ticks:{stepSize:25,font:{size:9},backdropColor:"transparent"},pointLabels:{font:{size:10},color:colors},grid:{color:"rgba(100,116,139,.15)"},angleLines:{color:"rgba(100,116,139,.15)"}}}}});
  },80);
  if(wizOn){wizIdx=0;wizRender();} // Fokus-Modus nach Neuaufbau (Spielerwechsel) neu ausrichten
}

/* Quick-Rate Fokus-Modus: eine Dimension pro Screen. Reine Sichtebene über dasselbe
   Formular – die Radio-Buttons bleiben im DOM, daher Speichern/Fortschritt unverändert. */
let wizIdx=0, wizOn=false;
function wizToggle(){
  const blocks=document.querySelectorAll("#dims-wrap .dim-block");
  if(!blocks.length){toast("Erst einen Spieler wählen","err");return;}
  wizOn=!wizOn;
  const wrap=document.getElementById("dims-wrap");
  const nav=document.getElementById("wiz-nav");
  const btn=document.getElementById("wiz-toggle");
  if(wizOn){
    wrap.classList.add("wiz-active");
    nav.style.display="block";
    btn.innerHTML='<i class="ti ti-list"></i>Alle anzeigen';
    wizIdx=0;wizRender();
  }else{
    wrap.classList.remove("wiz-active");
    nav.style.display="none";
    btn.innerHTML='<i class="ti ti-cards"></i>Fokus-Modus';
    wrap.querySelectorAll(".dim-block").forEach(b=>b.classList.remove("wiz-current"));
  }
}
function wizGo(delta){
  const blocks=document.querySelectorAll("#dims-wrap .dim-block");
  wizIdx=Math.max(0,Math.min(blocks.length-1,wizIdx+delta));
  wizRender();
  document.getElementById("wiz-nav").scrollIntoView({behavior:"smooth",block:"start"});
}
function wizRender(){
  const blocks=[...document.querySelectorAll("#dims-wrap .dim-block")];
  if(!blocks.length)return;
  if(wizIdx>=blocks.length)wizIdx=blocks.length-1;
  blocks.forEach((b,i)=>{
    b.classList.toggle("wiz-current",i===wizIdx);
    if(i===wizIdx){const body=b.querySelector(".dim-body");if(body)body.classList.remove("coll");}
  });
  const cur=blocks[wizIdx];
  const label=cur.querySelector(".dim-ht")?.textContent||("Dimension "+(wizIdx+1));
  const dots=blocks.map((b,i)=>`<span style="width:9px;height:9px;border-radius:50%;background:${i===wizIdx?'var(--blue)':'var(--border)'};display:inline-block"></span>`).join(" ");
  const letzte=wizIdx===blocks.length-1;
  const nav=document.getElementById("wiz-nav");
  nav.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--surface);border:var(--border-s);border-radius:var(--r);margin-bottom:8px;position:sticky;top:0;z-index:15">
      <button class="btn btn-sm" style="min-width:44px;min-height:44px${wizIdx===0?';opacity:.4':''}" onclick="wizGo(-1)"><i class="ti ti-chevron-left"></i></button>
      <div style="text-align:center;flex:1">
        <div style="font-size:13px;font-weight:700;color:var(--text)">${label} · ${wizIdx+1}/${blocks.length}</div>
        <div style="margin-top:4px;display:flex;gap:5px;justify-content:center">${dots}</div>
      </div>
      <button class="btn ${letzte?'btn-p':''} btn-sm" style="min-width:44px;min-height:44px" onclick="${letzte?"document.querySelector('button[onclick=\\\"savePlayer()\\\"]').scrollIntoView({behavior:'smooth'})":"wizGo(1)"}">${letzte?'<i class="ti ti-check"></i>':'<i class="ti ti-chevron-right"></i>'}</button>
    </div>`;
}

function toggleDim(head){
  const body=head.nextElementSibling;
  const icon=head.querySelector(".dchev");
  body.classList.toggle("coll");
  icon.style.transform=body.classList.contains("coll")?"rotate(-90deg)":"";
}


/* ═══════════════════════════════════
   KADER VIEW
═══════════════════════════════════ */
let activeFilter="all";
function setF(f,btn){
  activeFilter=f;
  document.querySelectorAll(".ftag").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");renderKader();
}

// B6: Delegierter Listener statt Inline-Handler mit interpolierten Daten (XSS-Schutz)
document.addEventListener("click",e=>{
  const editBtn=e.target.closest("[data-edit-player]");
  if(editBtn){const n=editBtn.dataset.name,idx=parseInt(editBtn.dataset.snapIdx);const snap=DB[n]&&DB[n][idx];if(snap)loadPlayerToForm(snap);return;}
  const delBtn=e.target.closest("[data-del-player]");
  if(delBtn){delPlayer(delBtn.dataset.name);return;}
  const delSnapBtn=e.target.closest("[data-del-snap]");
  if(delSnapBtn){delSnapshot(delSnapBtn.dataset.name,delSnapBtn.dataset.datum,delSnapBtn.dataset.id);return;}
});

/* ═══════════════════════════════════
   KADER aus Supabase (nur Trainer). Mutiert das bestehende KADER-Array in-place,
   damit die const-Bindung + alle getKader()/KADER.map()-Aufrufe unveraendert bleiben.
   Anon-Modi (Eltern/Delegate/Quiz) rufen loadKader NIE auf und sehen nie geb/medical.
═══════════════════════════════════ */
async function loadKader(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kader?select=*&order=sort_order.asc,name.asc`,{headers:sbAuthHeaders()});
    // Bewusst KEIN sbCheck401: laeuft auch im Eltern-/Delegate-Modus (Top-Level-Init).
    // Ohne Trainer-Token liefert die RLS 401 -> hartkodierter KADER bleibt (name/nr/tw only).
    if(!r.ok)return;
    const rows=await r.json();
    if(rows.length){
      KADER.splice(0,KADER.length,...rows.map(x=>{
        const o={name:x.name,tw:!!x.tw,twPrio:x.tw_prio||0,_id:x.id,sort_order:x.sort_order};
        if(x.nr!=null)o.nr=x.nr;
        if(x.geb)o.geb=x.geb;
        if(x.medical)o.medical=x.medical;
        if(x.starker_fuss)o.starker_fuss=x.starker_fuss;
        if(x.lieblingsposition)o.lieblingsposition=x.lieblingsposition;
        if(x.foto_path)o.foto_path=x.foto_path;
        o.foto_stadionheft_ok=!!x.foto_stadionheft_ok; // HOTFIX 19 digital: Foto-Freigabe fürs Eltern-Heft
        return o;
      }));
    }
  }catch(e){}
}
// Kader-Verwaltung: Modal mit editierbaren Zeilen (name/nr/tw/twPrio/geb/medical).
function kaderEditRow(k,i){
  return `<div class="kader-edit-row" data-id="${k._id||''}" style="border:var(--border-s);border-radius:var(--r);padding:8px;margin-bottom:8px">
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input class="ke-name" value="${esc(k.name||'')}" placeholder="Name" style="flex:1;min-width:80px;padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit">
      <input class="ke-nr" type="number" value="${k.nr!=null?k.nr:''}" placeholder="Nr" style="width:56px;padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit">
      <button onclick="kaderEditDelete(this,'${esc(k.name||'')}','${k._id||''}')" title="Spieler löschen" style="border:none;background:transparent;color:#dc2626;cursor:pointer;font-size:15px"><i class="ti ti-trash"></i></button>
    </div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
      <label style="font-size:12px;display:flex;align-items:center;gap:4px"><input class="ke-tw" type="checkbox" ${k.tw?"checked":""}>🥅 TW</label>
      <select class="ke-prio" style="padding:6px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
        <option value="0"${(k.twPrio||0)===0?" selected":""}>kein TW</option>
        <option value="1"${k.twPrio===1?" selected":""}>TW primär</option>
        <option value="2"${k.twPrio===2?" selected":""}>TW Option</option>
      </select>
      <input class="ke-geb" type="date" value="${esc(k.geb||'')}" title="Geburtstag" style="padding:6px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
    </div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
      <select class="ke-fuss" title="Starker Fuß" style="padding:6px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
        <option value=""${!k.starker_fuss?" selected":""}>Fuß?</option>
        <option value="R"${k.starker_fuss==="R"?" selected":""}>Rechts</option>
        <option value="L"${k.starker_fuss==="L"?" selected":""}>Links</option>
        <option value="B"${k.starker_fuss==="B"?" selected":""}>Beidfüßig</option>
      </select>
      <input class="ke-pos" value="${esc(k.lieblingsposition||'')}" placeholder="Lieblingsposition" style="flex:1;min-width:90px;padding:6px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;color:var(--text2)">Foto (Karte):</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" onchange="kaderRowFoto(this)" style="font-size:11px;flex:1">
      ${k.foto_path?'<span style="font-size:10px;color:#059669">✓ vorhanden</span>':''}
    </div>
    <label style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;font-size:11px;color:var(--text2)" title="Nur mit ausdrücklicher Eltern-Zustimmung. Ohne Häkchen erscheinen im Eltern-Heft nur die Initialen.">
      <input class="ke-fotook" type="checkbox" ${k.foto_stadionheft_ok?"checked":""} style="margin-top:1px">
      <span>📰 Foto fürs <b>digitale Eltern-Stadionheft</b> freigegeben <span style="color:var(--text3)">(Eltern-Einwilligung eingeholt)</span></span>
    </label>
    <input class="ke-medical" value="${esc(k.medical||'')}" placeholder="Medical-Hinweis (z. B. Asthma, Allergie…)" style="width:100%;padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px">
    ${k._id?`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px">
      <button type="button" class="btn btn-sm" onclick="kontakteEditOpen(${k._id})" title="Kontakte & Eltern-Login" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:10px;line-height:1.2"><i class="ti ti-address-book" style="font-size:17px"></i>Kontakte</button>
      <button type="button" class="btn btn-sm" onclick="kindLinkShare(${k._id})" title="Persönlicher 1-Tap Zu-/Absage-Link ohne Login" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:10px;line-height:1.2"><i class="ti ti-calendar-check" style="font-size:17px"></i>Zu-/Absage</button>
      <button type="button" class="btn btn-sm" onclick="childWrappedShare(${k._id})" title="Persönliche Saison-Rückblick-Karte zum Teilen mit der Familie" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;font-size:10px;line-height:1.2"><i class="ti ti-movie" style="font-size:17px"></i>Saison</button>
    </div>`:'<div style="font-size:10px;color:var(--text3);margin-top:6px">Erst speichern – dann sind Kontakte, Links & Saison-Karte verfügbar.</div>'}
  </div>`;
}
// Foto aus einer Kader-Zeile hochladen (nutzt den aktuellen Namen der Zeile).
function kaderRowFoto(input){
  const row=input.closest(".kader-edit-row");
  const name=row?.querySelector(".ke-name")?.value.trim();
  if(!name){toast("Erst Namen eintragen (und Spieler speichern)","err");input.value="";return;}
  const file=input.files&&input.files[0];
  if(file)fotoUpload(name,file,input);
}
function kaderEditOpen(){
  if(!sbToken()){toast("Bitte zuerst als Trainer anmelden","err");return;}
  const modal=document.createElement("div");
  modal.id="kader-edit-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:440px;width:100%;margin:auto">
    <div style="font-weight:700;margin-bottom:4px">Kader verwalten</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Geburtstag & Medical-Hinweise sind nur für Trainer sichtbar (nicht für Eltern).</div>
    <div id="kader-edit-list">${KADER.map((k,i)=>kaderEditRow(k,i)).join("")}</div>
    <button class="btn btn-sm" onclick="kaderEditAdd()" style="margin-bottom:12px"><i class="ti ti-plus"></i>Spieler hinzufügen</button>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-p" onclick="kaderSaveAll(this)"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn" onclick="document.getElementById('kader-edit-modal').remove()">Schließen</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}
function kaderEditAdd(){
  const list=document.getElementById("kader-edit-list");
  if(list)list.insertAdjacentHTML("beforeend",kaderEditRow({name:"",tw:false,twPrio:0},KADER.length));
}
async function kaderEditDelete(btn,name,id){
  if(!confirm(`${name||"Spieler"} aus dem Kader entfernen?`))return;
  if(id){
    try{const r=await fetch(`${SB_URL}/rest/v1/kader?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  }
  btn.closest(".kader-edit-row")?.remove();
}
/* ═══════════════════════════════════
   KONTAKTE & ELTERN-LOGIN pro Kind (Phase 10-M, Etappe 1) – trainer-verwaltet.
   • Login-E-Mails → eltern_kinder (wer darf sich im Portal anmelden & zu-/absagen)
   • Telefonnummern → kind_kontakte (beliebig viele: Vater/Mutter/Oma…)
   Sofort-speichernd (Add/Delete schreiben direkt), RLS erlaubt Schreiben nur Trainern.
═══════════════════════════════════ */
function kontakteEditOpen(spielerId){
  if(!spielerId){toast("Bitte den Spieler zuerst speichern","err");return;}
  const k=KADER.find(x=>x._id===spielerId);
  document.getElementById("kontakte-modal")?.remove();
  const modal=document.createElement("div");
  modal.id="kontakte-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:420px;width:100%;margin:auto">
    <div style="font-weight:700;margin-bottom:2px">📇 ${esc(k?k.name:"Spieler")} – Kontakte & Eltern-Login</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Login-E-Mails: wer sich im Eltern-Bereich anmelden & zu-/absagen darf. Telefonnummern: beliebig viele (Vater, Mutter, Oma…).</div>
    <div id="kontakte-body"><div style="color:var(--text3);font-size:12px;padding:12px">Lade…</div></div>
    <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" onclick="document.getElementById('kontakte-modal').remove()">Schließen</button></div>
  </div>`;
  document.body.appendChild(modal);
  kontakteRender(spielerId);
}
async function kontakteRender(sid){
  const body=document.getElementById("kontakte-body");
  if(!body)return;
  let emails=[],phones=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?spieler_id=eq.${sid}&select=id,email,label&order=id`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)emails=await r.json();}catch(e){}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_kontakte?spieler_id=eq.${sid}&select=id,name,rolle,telefon&order=id`,{headers:sbAuthHeaders()});if(r.ok)phones=await r.json();}catch(e){}
  const inp="padding:7px;border:var(--border-s);border-radius:6px;font-family:inherit;font-size:12px";
  body.innerHTML=`
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">🔑 Login-E-Mails</div>
    ${emails.length?emails.map(e=>`<div style="display:flex;align-items:center;gap:6px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--surface2)">
      <span style="flex:1;word-break:break-all">${esc(e.email)}${e.label?` <span style="color:var(--text3);font-size:11px">(${esc(e.label)})</span>`:""}</span>
      <button onclick="kontakteDelEmail(${e.id},${sid})" title="Entfernen" style="border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Noch keine Login-E-Mail.</div>'}
    <div style="display:flex;gap:6px;margin:8px 0 16px;flex-wrap:wrap">
      <input id="kk-new-email" type="email" placeholder="eltern@mail.de" style="flex:2;min-width:130px;${inp}">
      <input id="kk-new-email-label" placeholder="Rolle (optional)" style="flex:1;min-width:80px;${inp}">
      <button class="btn btn-sm" onclick="kontakteAddEmail(${sid})"><i class="ti ti-plus"></i></button>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:6px">📞 Telefonnummern</div>
    ${phones.length?phones.map(p=>`<div style="display:flex;align-items:center;gap:6px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--surface2)">
      <span style="flex:1">${esc(p.telefon)}${(p.name||p.rolle)?` <span style="color:var(--text3);font-size:11px">(${esc([p.rolle,p.name].filter(Boolean).join(" · "))})</span>`:""}</span>
      <button onclick="kontakteDelPhone(${p.id},${sid})" title="Entfernen" style="border:none;background:transparent;color:#dc2626;cursor:pointer"><i class="ti ti-trash"></i></button>
    </div>`).join(""):'<div style="font-size:12px;color:var(--text3)">Noch keine Nummer.</div>'}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <input id="kk-new-tel" type="tel" placeholder="Telefon" style="flex:2;min-width:110px;${inp}">
      <input id="kk-new-rolle" placeholder="Rolle (z. B. Mutter)" style="flex:1;min-width:90px;${inp}">
      <input id="kk-new-name" placeholder="Name (optional)" style="flex:1;min-width:90px;${inp}">
      <button class="btn btn-sm" onclick="kontakteAddPhone(${sid})"><i class="ti ti-plus"></i></button>
    </div>`;
}
async function kontakteAddEmail(sid){
  const email=(document.getElementById("kk-new-email")?.value||"").trim().toLowerCase();
  const label=(document.getElementById("kk-new-email-label")?.value||"").trim();
  if(!email||!/.+@.+\..+/.test(email)){toast("Gültige E-Mail eingeben","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?on_conflict=spieler_id,email`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify({spieler_id:sid,email,label:label||null})});if(sbCheck401(r))return;if(!r.ok){toast("Konnte nicht speichern","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Login-E-Mail hinterlegt ✓");
  kontakteRender(sid);
}
async function kontakteDelEmail(id,sid){
  try{const r=await fetch(`${SB_URL}/rest/v1/eltern_kinder?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  kontakteRender(sid);
}
async function kontakteAddPhone(sid){
  const telefon=(document.getElementById("kk-new-tel")?.value||"").trim();
  const rolle=(document.getElementById("kk-new-rolle")?.value||"").trim();
  const name=(document.getElementById("kk-new-name")?.value||"").trim();
  if(!telefon){toast("Telefonnummer eingeben","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_kontakte`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({spieler_id:sid,telefon,rolle:rolle||null,name:name||null})});if(sbCheck401(r))return;if(!r.ok){toast("Konnte nicht speichern","err");return;}}catch(e){toast("Netzwerkfehler","err");return;}
  toast("Nummer hinterlegt ✓");
  kontakteRender(sid);
}
async function kontakteDelPhone(id,sid){
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_kontakte?id=eq.${id}`,{method:"DELETE",headers:sbAuthHeaders()});if(sbCheck401(r))return;}catch(e){}
  kontakteRender(sid);
}
// Persönlichen 1-Tap Zu-/Absage-Link (?kind=<token>) eines Kindes an die Familie teilen.
async function kindLinkShare(spielerId){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  let token=null, nm="";
  try{const r=await fetch(`${SB_URL}/rest/v1/kader?id=eq.${spielerId}&select=name,rsvp_token`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok){const row=(await r.json())[0];if(row){token=row.rsvp_token;nm=row.name||"";}}}catch(e){}
  if(!token){toast("Kein Link gefunden","err");return;}
  const url=location.origin+location.pathname+"?kind="+encodeURIComponent(token);
  const text=`⚽ Zu-/Absage für ${nm||"dein Kind"} (1 Tipp, kein Login):\n${url}`;
  if(navigator.share){navigator.share({title:"Zu-/Absage-Link "+nm,text,url}).catch(()=>{});}
  else{navigator.clipboard?.writeText(url).then(()=>toast("Link kopiert ✓"),()=>prompt("Link:",url));}
}
// Adler-Wrapped pro Kind: persönliche Saison-Karte (Bild) für die Familie. Daten aus get_child_wrapped.
async function childWrappedShare(spielerId){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  toast("🎬 Saison-Karte wird erstellt…");
  let d=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/get_child_wrapped`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify({p_spieler:spielerId})});if(sbCheck401(r))return;if(r.ok)d=await r.json();}catch(e){}
  if(!d||!d.ok){toast("Konnte Saison-Daten nicht laden","err");return;}
  const logo=new Image();
  logo.onload=()=>drawChildWrapped(logo,d);
  logo.onerror=()=>drawChildWrapped(null,d);
  logo.src="logo.png";
}
function drawChildWrapped(logoImg,d){
  const W=640,H=800,c=document.createElement("canvas");c.width=W;c.height=H;const ctx=c.getContext("2d");
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#5b21b6");g.addColorStop(1,"#1e3a8a");
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";ctx.textBaseline="alphabetic";
  if(logoImg){try{ctx.drawImage(logoImg,W/2-40,42,80,80);}catch(e){}}
  ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="bold 15px Arial";ctx.fillText("🦅 ADLER WRAPPED",W/2,150);
  ctx.fillStyle="#facc15";ctx.font="bold 38px Arial";ctx.fillText(((d.name||"")+"s Saison"),W/2,196);
  const rows=[["⚽",d.tore||0,"Tore"],["🔥",d.aktionen||0,"Ballaktionen"],["⏱️",d.einsatz_min||0,"Minuten Spielzeit"],[XP_ICON,d.xp||0,XP_LABEL+" gesammelt"],["📅",d.spiele||0,"Spiele bestritten"]];
  let y=254;
  rows.forEach(r=>{
    ctx.fillStyle="rgba(255,255,255,.1)";tbRoundRect(ctx,70,y,W-140,82,16);ctx.fill();
    ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="32px Arial";ctx.fillText(r[0],96,y+53);
    ctx.font="bold 38px Arial";ctx.fillStyle="#facc15";ctx.fillText(String(r[1]),150,y+54);
    ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.9)";ctx.font="bold 20px Arial";ctx.fillText(r[2],W-96,y+51);
    ctx.textAlign="center";y+=96;
  });
  ctx.fillStyle="rgba(255,255,255,.92)";ctx.font="bold 22px Arial";ctx.fillText("Stark gemacht! 🦅❤️",W/2,H-38);
  c.toBlob(async(blob)=>{
    if(!blob){toast("Bild konnte nicht erzeugt werden","err");return;}
    const file=new File([blob],"adler-wrapped.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ try{await navigator.share({files:[file],title:"Adler Wrapped"});}catch(e){} }
    else{ const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="adler-wrapped.png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast("Saison-Karte heruntergeladen ✓"); }
  },"image/png");
}
async function kaderSaveAll(btn){
  const rows=[...document.querySelectorAll(".kader-edit-row")];
  const payload=[];
  rows.forEach((row,i)=>{
    const name=row.querySelector(".ke-name").value.trim();
    if(!name)return;
    const nrV=row.querySelector(".ke-nr").value;
    const geb=row.querySelector(".ke-geb").value;
    const medical=row.querySelector(".ke-medical").value.trim();
    const fuss=row.querySelector(".ke-fuss")?.value||"";
    const pos=row.querySelector(".ke-pos")?.value.trim()||"";
    payload.push({
      name, nr:nrV!==""?parseInt(nrV):null,
      tw:row.querySelector(".ke-tw").checked,
      tw_prio:parseInt(row.querySelector(".ke-prio").value)||0,
      geb:geb||null, medical:medical||null,
      starker_fuss:fuss||null, lieblingsposition:pos||null, sort_order:i+1,
      foto_stadionheft_ok:row.querySelector(".ke-fotook")?.checked||false // HOTFIX 19 digital: Foto-Freigabe
    });
  });
  if(!payload.length){toast("Kein Spieler eingetragen","err");return;}
  if(btn)btn.disabled=true;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/kader?on_conflict=name`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(payload)});
    if(sbCheck401(r)){return;}
    if(r.ok||r.status===201){
      await loadKader();
      renderKader();
      if(typeof refreshSelects==="function")refreshSelects();
      document.getElementById("kader-edit-modal")?.remove();
      toast("Kader gespeichert ✓");
    }else toast("Fehler beim Speichern","err");
  }catch(e){toast("Netzwerkfehler","err");}
  finally{if(btn)btn.disabled=false;}
}
// Saison-Backup: alle relevanten Tabellen als JSON-Download sichern.
async function backupExport(){
  if(!sbToken()){toast("Bitte zuerst als Trainer anmelden","err");return;}
  toast("Backup wird erstellt…");
  const tables=["kader","spielerprofile","termine","matchday","blitz_ratings","match_actions","ticker_events","nominierungen","anwesenheit","trainings_eval"];
  const dump={_meta:{app:"U9 Adler Dellbrück",exported_at:new Date().toISOString(),tables}};
  try{
    for(const t of tables){
      try{
        const r=await fetch(`${SB_URL}/rest/v1/${t}?select=*`,{headers:sbAuthHeaders()});
        dump[t]=r.ok?await r.json():{error:r.status};
      }catch(e){dump[t]={error:"fetch"};}
    }
    const blob=new Blob([JSON.stringify(dump,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`adler-u9-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast("Backup heruntergeladen ✓");
  }catch(e){toast("Backup fehlgeschlagen","err");}
}

function renderKader(){
  const names=Object.keys(DB).sort();const wrap=document.getElementById("kader-content");
  if(!window._dbLoaded&&!names.length){wrap.innerHTML=skeletonRows(3);return;} // L2
  const filtered=names.filter(n=>{
    const lat=DB[n][DB[n].length-1];
    if(activeFilter==="all")return true;
    if(activeFilter==="tw")return lat.tw===true||getKader(n)?.tw;
    if(activeFilter==="A"||activeFilter==="B")return lat.grp===activeFilter;
    return lat.position===activeFilter;
  });
  if(!filtered.length){wrap.innerHTML='<div class="empty"><i class="ti ti-filter"></i>Kein Spieler für diesen Filter</div>';renderRauteMap(names);return;}
  const dimCols=["#1a56db","#7c3aed","#d97706","#059669","#0e7490"];
  let html=`<table class="kader-t"><thead><tr><th>Spieler</th><th>Rolle</th><th>Grp</th><th>Tech.</th><th>Wahr.</th><th>Phys.</th><th>Ges.</th><th>Pot.</th><th>Von</th><th></th></tr></thead><tbody>`;
  filtered.forEach(name=>{
    const lat=DB[name][DB[name].length-1];
    const sc=safeParse(lat.scores,[0,0,0,0,0]);
    const isTw=lat.tw===true||getKader(name)?.tw;
    const prim=lat.position||"flex";
    const bMap={aufpasser:"rb-auf",jaeger:"rb-jaeg",flitzer_l:"rb-links",flitzer_r:"rb-rechts",flex:"rb-flex"};
    const lMap={aufpasser:"Aufpasser",jaeger:"Jäger",flitzer_l:"Flitzer L",flitzer_r:"Flitzer R",flex:"Flexibel"};
    const tot=lat.total_score||0,pot=lat.pot_score||0;
    const grpB=lat.grp==="A"?'<span class="grp-a">A</span>':lat.grp==="B"?'<span class="grp-b">B</span>':'<span style="font-size:10px;color:var(--text3)">–</span>';
    const mini=val=>{let s='<div class="sm">';for(let i=0;i<5;i++)s+=`<div class="sm-s${val>=(i+1)*20?" on":""}"></div>`;return s+'</div>';};
    const snBadge=DB[name].length>1?`<span style="font-size:9px;color:var(--teal);font-weight:600;margin-left:4px">×${DB[name].length}</span>`:"";
    html+=`<tr>
      <td><div style="font-weight:600;font-size:12.5px">${getKader(name)?.nr?`<span style="font-size:9px;font-weight:700;color:var(--text3);background:var(--surface2);border:var(--border);border-radius:8px;padding:1px 5px;margin-right:4px">${getKader(name).nr}</span>`:""}${esc(name)}${isTw?" 🥅":""}</div><div style="font-size:10px;color:var(--text2)">${esc(lat.datum||'')}${snBadge}</div></td>
      <td><span class="rbadge ${bMap[prim]||'rb-flex'}">${isTw?`TW / ${esc(lMap[prim]||prim)}`:esc(lMap[prim]||prim)}</span>${lat.sek_rolle&&!isTw?`<br><span style="font-size:10px;color:var(--text2)">${esc(lat.sek_rolle)}</span>`:""}</td>
      <td>${grpB}</td>
      ${[0,1,2].map(i=>`<td><span style="font-size:11px;font-weight:600;color:${dimCols[i]}">${sc[i]||0}%</span>${mini(sc[i]||0)}</td>`).join("")}
      <td><span style="font-weight:700;font-size:13px">${tot}%</span></td>
      <td><span style="font-size:11px;color:var(--teal);font-weight:600">${pot}%</span></td>
      <td style="font-size:11px;color:var(--text2)">${esc(lat.trainer||'–')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" data-edit-player data-name="${esc(name)}" data-snap-idx="${DB[name].length-1}" title="Laden"><i class="ti ti-edit"></i></button>
        <button class="btn btn-sm btn-d" data-del-player data-name="${esc(name)}"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;
  });
  html+="</tbody></table>";
  wrap.innerHTML='<div class="kader-wrap">'+html+'</div>';
  renderRauteMap(names);
}

function renderRauteMap(names){
  const wrap=document.getElementById("raute-map");
  if(!names.length){wrap.innerHTML='<div class="empty" style="padding:1rem;font-size:12px">Noch keine Spieler bewertet</div>';return;}
  const posMap={aufpasser:[],flitzer_l:[],flitzer_r:[],jaeger:[],flex:[]};
  const twList=[];
  names.forEach(n=>{
    const lat=DB[n][DB[n].length-1];
    const p=lat.position||"flex";
    const isTw=lat.tw===true||getKader(n)?.tw;
    if(isTw){twList.push(n);}
    else{(posMap[p]||posMap.flex).push(n);}
  });
  const cfg={aufpasser:{label:"Aufpasser",col:"#1a56db",bg:"#e8f0fe"},flitzer_l:{label:"Flitzer L",col:"#b45309",bg:"#fffbeb"},flitzer_r:{label:"Flitzer R",col:"#15803d",bg:"#f0fdf4"},jaeger:{label:"Jäger",col:"#c2410c",bg:"#fff7ed"}};
  let html="";
  // TW row - show priority
  const tw1=twList.filter(n=>{const k=getKader(n);return k&&k.twPrio===1;});
  const tw2=twList.filter(n=>{const k=getKader(n);return k&&k.twPrio===2;});
  html+='<div style="padding:8px 10px;background:#fef9c3;border:1px solid #fcd34d;border-radius:var(--r);margin-bottom:8px;font-size:12px;color:#854d0e">';
  html+='<span style="font-weight:700">🥅 Torwart (+1):</span> ';
  if(tw1.length>0) html+='<span style="font-weight:600">'+tw1.map(esc).join(', ')+'</span> <span style="font-size:10px;opacity:.7">(primär)</span>';
  if(tw2.length>0) html+=(tw1.length>0?' · ':'')+tw2.map(esc).join(', ')+' <span style="font-size:10px;opacity:.7">(Option)</span>';
  if(twList.length===0) html+='<span style="font-style:italic;opacity:.6">Noch nicht bewertet</span>';
  html+='</div>';
  html+=`<div class="rk-grid">
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.jaeger.col};background:${cfg.jaeger.bg}"><div class="rk-pos-lbl" style="color:${cfg.jaeger.col}">${cfg.jaeger.label}</div>${posMap.jaeger.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:11px;color:${cfg.jaeger.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.flitzer_l.col};background:${cfg.flitzer_l.bg}"><div class="rk-pos-lbl" style="color:${cfg.flitzer_l.col}">${cfg.flitzer_l.label}</div>${posMap.flitzer_l.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:11px;color:${cfg.flitzer_l.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.flitzer_r.col};background:${cfg.flitzer_r.bg}"><div class="rk-pos-lbl" style="color:${cfg.flitzer_r.col}">${cfg.flitzer_r.label}</div>${posMap.flitzer_r.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:11px;color:${cfg.flitzer_r.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
    <div class="rk-pos" style="border-color:${cfg.aufpasser.col};background:${cfg.aufpasser.bg}"><div class="rk-pos-lbl" style="color:${cfg.aufpasser.col}">${cfg.aufpasser.label}</div>${posMap.aufpasser.map(n=>`<div class="rk-player"><i class="ti ti-user" style="font-size:11px;color:${cfg.aufpasser.col}"></i>${esc(n)}</div>`).join("")||'<div class="rk-empty">Offen</div>'}</div>
    <div></div>
  </div>`;
  if(posMap.flex.length>0)html+=`<div style="margin-top:.75rem;font-size:11.5px;color:var(--text2)"><i class="ti ti-adjustments" style="font-size:13px"></i> Noch ohne feste Rolle: ${posMap.flex.map(n=>esc(n)).join(", ")}</div>`;
  wrap.innerHTML=html;
}

async function delPlayer(name){
  if(!confirm(`Alle Bewertungen von '${name}' löschen?`))return;
  try{
    // Prefer:return=representation, damit ein von RLS still gefiltertes Delete (0 betroffene
    // Zeilen -> trotzdem HTTP 200/204) NICHT als Erfolg gemeldet wird
    const r=await fetch(`${SB_URL}/rest/v1/spielerprofile?name=eq.${encodeURIComponent(name)}`,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=representation'})});
    if(sbCheck401(r))return;
    if(r.ok){
      const deleted=await r.json().catch(()=>[]);
      if(deleted.length>0){await loadDB();renderKader();toast(name+" gelöscht");}
      else{toast("Löschen fehlgeschlagen – keine Berechtigung oder Datensatz nicht gefunden","err");}
    }else{toast("Fehler beim Löschen","err");}
  }catch{toast("Netzwerkfehler","err");}
}

async function delSnapshot(name,datum,id){
  if(!confirm(`Bewertung von ${name} (${datum}) löschen?`))return;
  try{
    let url;
    if(id&&id!=='undefined'&&id!==''){
      url=`${SB_URL}/rest/v1/spielerprofile?id=eq.${encodeURIComponent(id)}`;
    } else {
      url=`${SB_URL}/rest/v1/spielerprofile?name=eq.${encodeURIComponent(name)}&datum=eq.${encodeURIComponent(datum)}`;
    }
    const r=await fetch(url,{method:"DELETE",headers:sbAuthHeaders({'Prefer':'return=representation'})});
    if(sbCheck401(r))return;
    if(r.ok){
      const deleted=await r.json().catch(()=>[]);
      if(deleted.length>0){
        await loadDB();
        renderVerlauf();
        showSt("save-status",`Bewertung von ${name} (${datum}) gelöscht`,"ok");
      } else {
        toast("Löschen fehlgeschlagen – keine Berechtigung oder Datensatz nicht gefunden","err");
      }
    } else {
      toast("Fehler beim Löschen","err");
    }
  }catch(e){toast("Netzwerkfehler: "+e.message,"err");}
}

/* ═══════════════════════════════════
   PROFIL VIEW
═══════════════════════════════════ */
let rchart=null,rchartTimer=0;
function renderProfil(){
  const name=document.getElementById("psel-profil").value;
  if(!window._dbLoaded&&!Object.keys(DB).length){document.getElementById("profil-content").innerHTML=skeletonRows(3);return;} // L2
  if(!name){document.getElementById("profil-content").innerHTML='<div class="empty"><i class="ti ti-user-circle"></i>Spieler auswählen</div>';return;}
  const snaps=DB[name]||[];if(!snaps.length)return;
  const lat=snaps[snaps.length-1];
  const sc=safeParse(lat.scores,[0,0,0,0,0]);
  const tot=lat.total_score||0,pot=lat.pot_score||0;
  const isTw=lat.tw===true||getKader(name)?.tw;
  const dims=isTw?[...DIMS_FELD,...DIMS_TW]:DIMS_FELD;
  const prim=lat.prim_rolle||"–",sek=lat.sek_rolle||"–";
  const bMap={aufpasser:"rb-auf",jaeger:"rb-jaeg",flitzer_l:"rb-links",flitzer_r:"rb-rechts"};
  const grpB=lat.grp==="A"?'<span class="grp-a">A-Gruppe</span>':lat.grp==="B"?'<span class="grp-b">B-Gruppe</span>':"";
  const dl=dims.map(d=>d.label.split(" ")[0]);
  const cols=dims.map(d=>d.col);
  const scPad=dl.map((_,i)=>sc[i]||0);
  const summary=lat.summary||"";

  // Stärken & Felder aus dem Fazit extrahieren (schnelle Anzeige)
  const st=[];const ef=[];
  (lat.fazit||"").split("\n").forEach(line=>{
    if(line.startsWith("  + "))st.push(line.slice(4));
    if(line.startsWith("  → "))ef.push(line.slice(4));
  });

  const printBtn=document.getElementById("print-profil-btn");
  if(printBtn)printBtn.style.display=name?"inline-flex":"none";
  const zertBtn=document.getElementById("zert-profil-btn");
  if(zertBtn)zertBtn.style.display=name?"inline-flex":"none";
  const cardBtn=document.getElementById("card-profil-btn");
  if(cardBtn)cardBtn.style.display=name?"inline-flex":"none";
  document.getElementById("profil-content").innerHTML=`
    <div class="player-card">
      <div class="av ${isTw?"tw":""}">${name.slice(0,2).toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:15px">${esc(name)}${isTw?" 🥅":""}</div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:4px">
          <span class="rbadge ${bMap[lat.position]||'rb-flex'}">${esc(prim)}</span>
          ${!isTw?`<span style="font-size:10.5px;color:var(--text2)">Sek: ${esc(sek)}</span>`:""}
          ${grpB}
          <span style="font-size:10.5px;color:var(--text2)">${esc(lat.trainer||"")} · ${esc(lat.datum||"")}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:var(--text2)">Niveau</div>
        <div style="font-size:26px;font-weight:700;color:var(--blue)">${tot}%</div>
        <div style="font-size:10.5px;color:var(--teal);font-weight:500">Potenzial ~${pot}%</div>
      </div>
    </div>

    ${summary?`<div class="summary-box">
      <h3><i class="ti ti-sparkles" style="font-size:13px"></i>Zusammenfassung</h3>
      <div class="summary-text">${esc(summary)}</div>
      <div class="summary-tags">
        ${st.slice(0,3).map(s=>`<span class="stag pos">+ ${esc(s.split("–")[0].trim())}</span>`).join("")}
        ${ef.slice(0,2).map(e=>`<span class="stag neg">→ ${esc(e.split(":")[0].trim())}</span>`).join("")}
      </div>
    </div>`:""}

    <div class="radar-profil-wrap">
      <div style="position:relative;height:270px"><canvas id="rc" role="img" aria-label="Radar ${esc(name)}">Spielerprofil ${esc(name)}</canvas></div>
      <div>${dl.map((l,i)=>`<div class="rl-item"><div class="rl-nm" style="color:${cols[i]}">${l}</div><div class="rl-bw"><div class="rl-bf" style="width:${scPad[i]}%;background:${cols[i]}"></div></div><div class="rl-vl">${scPad[i]}%</div></div>`).join("")}</div>
    </div>

    ${st.length>0||ef.length>0?`<div class="massnahmen-box">
      <div class="mb-title"><i class="ti ti-list-check" style="font-size:14px"></i>Konkrete Maßnahmen & Erkenntnisse</div>
      ${st.slice(0,5).map(s=>`<div class="mb-item"><div class="mb-icon" style="background:#dcfce7"><i class="ti ti-plus" style="font-size:11px;color:#15803d"></i></div><div class="mb-text">${esc(s)}</div></div>`).join("")}
      ${ef.slice(0,5).map(e=>`<div class="mb-item"><div class="mb-icon" style="background:#fee2e2"><i class="ti ti-arrow-right" style="font-size:11px;color:#b91c1c"></i></div><div class="mb-text">${esc(e)}</div></div>`).join("")}
    </div>`:""}

    <div class="sl"><i class="ti ti-file-description"></i>Vollständiges Profil</div>
    <div class="detail-box"><div class="fazit-display">${esc(lat.fazit||'–')}</div></div>
    <div class="brow">
      <button class="btn" data-edit-player data-name="${esc(name)}" data-snap-idx="${snaps.length-1}"><i class="ti ti-edit"></i>Profil bearbeiten</button>
    </div>`;

  if(rchart){rchart.destroy();rchart=null;}
  clearTimeout(rchartTimer);
  rchartTimer=setTimeout(()=>{
    const ctx=document.getElementById("rc");if(!ctx)return;
    rchart=new Chart(ctx,{type:"radar",data:{labels:dl,datasets:[{label:name,data:scPad,backgroundColor:`${cols[0]}18`,borderColor:cols[0],borderWidth:2,pointBackgroundColor:cols,pointRadius:4,pointHoverRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{min:0,max:100,ticks:{stepSize:25,font:{size:9},backdropColor:"transparent"},pointLabels:{font:{size:11},color:cols},grid:{color:"rgba(100,116,139,.15)"},angleLines:{color:"rgba(100,116,139,.15)"}}}}});
  },80);
}

/* ═══════════════════════════════════
   SAISON-ZERTIFIKAT (Print, self-contained)
═══════════════════════════════════ */
function saisonLabel(){
  // Saison läuft Jul–Jun: ab Juli gehört das laufende Jahr zur Saison JJJJ/JJ+1
  const d=new Date(),y=d.getFullYear();
  const start=d.getMonth()>=6?y:y-1;
  return `${start} / ${start+1}`;
}

/* ═══════════════════════════════════
   ADLER WRAPPED (Phase 9-H) – Saison-Rückblick im Story-Format.
   Holt die serverseitig aggregierten Saison-Daten (RPC get_season_wrapped,
   umgeht den PostgREST-1000-Zeilen-Cap) und zeigt sie als Vollbild-Slides
   mit Auto-Advance, Tap-Navigation (links zurück / rechts weiter) und
   Konfetti-Finale. Reines Vanilla-JS/CSS, confetti() recycelt.
═══════════════════════════════════ */
const AWRAP_MS=4800; // Anzeigedauer je Slide
let awrapIdx=0, awrapSlides=[], awrapTimer=0, awrapFotoUrls=[]; // FEAT X: Galerie-Blob-URLs
// FEAT X: Saison-Galerie fuer Wrapped laden (Trainer-only RPC), Fotos als Blob-URLs
// (DOM-Background, kein Canvas -> kein Taint). Alte URLs revoken (Speicher).
async function wrappedLoadFotos(saison){
  awrapFotoUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});
  awrapFotoUrls=[];
  let paths=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/rpc/season_gallery`,{method:"POST",headers:sbAuthHeaders(),body:JSON.stringify({p_saison:saison||null})});if(r.ok)paths=((await r.json())||[]).map(x=>x.foto_path).filter(Boolean);}catch(e){}
  const urls=await Promise.all(paths.slice(0,8).map(async p=>{
    try{const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/termin_media/${p}`,{headers:{'Authorization':'Bearer '+sbToken()}});if(!r.ok)return null;return URL.createObjectURL(await r.blob());}catch(e){return null;}
  }));
  awrapFotoUrls=urls.filter(Boolean);
  return awrapFotoUrls;
}
// HOTFIX 7: Wrapped ist standardmäßig gesperrt (Teaser). Trainer kann trotzdem eine Vorschau öffnen.
function adlerWrappedTeaser(){
  try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
  if(confirm("🎬 Adler Wrapped ist der große Saison-Rückblick – die volle Story gibt's am Saisonende.\n\nMöchtest du jetzt schon eine Vorschau mit dem aktuellen Stand ansehen?"))adlerWrappedOpen();
}
async function adlerWrappedOpen(){
  const btn=document.getElementById("wrapped-btn");
  if(btn)btn.disabled=true;
  let d=null;
  const call=body=>fetch(`${SB_URL}/rest/v1/rpc/get_season_wrapped`,{method:"POST",headers:{...sbAuthHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{ const r=await call({p_saison:saisonLabel()}); if(sbCheck401(r)){if(btn)btn.disabled=false;return;} if(r.ok)d=await r.json(); }catch(e){}
  // Fallback: leere Saison → gesamte Historie zeigen
  if(d&&!d.spiele&&!d.trainings&&!d.tore&&!d.aktionen){ try{ const r=await call({p_saison:null}); if(r.ok)d=await r.json(); }catch(e){} }
  if(!d){if(btn)btn.disabled=false;toast("Rückblick konnte nicht geladen werden","err");return;}
  const fotos=await wrappedLoadFotos(d.saison||saisonLabel()); // FEAT X
  if(btn)btn.disabled=false;
  adlerWrappedShow(d,fotos);
}
function adlerWrappedSlides(d,fotos){
  const g=(a,b)=>`linear-gradient(160deg,${a},${b})`;
  const S=[];
  S.push({bg:g("#0f172a","#1e3a8a"),html:`<div>
    <div class="aw-pop" style="font-size:64px">🦅</div>
    <div class="aw-pop d1" style="font-size:30px;font-weight:900;letter-spacing:1px;margin-top:8px">ADLER WRAPPED</div>
    <div class="aw-pop d2" style="font-size:16px;opacity:.85;margin-top:6px">Saison ${esc(String(d.saison||""))}</div>
    <div class="aw-pop d3" style="font-size:12px;opacity:.6;margin-top:24px">Tippe rechts → weiter · links ← zurück</div></div>`});
  S.push({bg:g("#155e75","#06b6d4"),html:`<div>
    <div class="aw-pop" style="font-size:14px;opacity:.85;text-transform:uppercase;letter-spacing:2px">Ihr wart fleißig</div>
    <div class="aw-big aw-pop d1">${d.spiele||0}</div>
    <div class="aw-pop d1" style="font-size:19px;font-weight:800">Spiele & Turniere</div>
    <div class="aw-pop d2" style="font-size:15px;opacity:.85;margin-top:18px">und <b>${d.trainings||0}</b> Trainingseinheiten 💪</div></div>`});
  S.push({bg:g("#9a3412","#f97316"),html:`<div>
    <div class="aw-pop" style="font-size:14px;opacity:.85;text-transform:uppercase;letter-spacing:2px">Gemeinsam erzielt</div>
    <div class="aw-big aw-pop d1">${d.tore||0}</div>
    <div class="aw-pop d1" style="font-size:22px;font-weight:800">Tore ⚽</div></div>`});
  S.push({bg:g("#5b21b6","#8b5cf6"),html:`<div>
    <div class="aw-big aw-pop">${d.aktionen||0}</div>
    <div class="aw-pop d1" style="font-size:20px;font-weight:800">Ballaktionen 🔥</div>
    <div class="aw-pop d2" style="font-size:15px;opacity:.85;margin-top:16px">darunter <b>${d.paesse||0}</b> Pässe und <b>${d.paraden||0}</b> Paraden 🧤</div></div>`});
  S.push({bg:g("#065f46","#10b981"),html:`<div>
    <div class="aw-pop" style="font-size:14px;opacity:.85;text-transform:uppercase;letter-spacing:2px">Team-Missionen</div>
    <div class="aw-big aw-pop d1">${d.quests_geschafft||0}</div>
    <div class="aw-pop d1" style="font-size:20px;font-weight:800">Quests geknackt 🏆</div></div>`});
  const awards=[];
  if(d.top_torschuetze&&d.top_torschuetze.name)awards.push(["⚽","Torschützenkönig",d.top_torschuetze]);
  if(d.fleissigste&&d.fleissigste.name)awards.push(["🏃","Fleißbiene (Training)",d.fleissigste]);
  if(d.top_aktiv&&d.top_aktiv.name)awards.push(["🔥","Aktivposten",d.top_aktiv]);
  const awardsHtml=awards.length?awards.map((a,i)=>`<div class="aw-pop d${i+1}" style="background:rgba(255,255,255,.14);border-radius:14px;padding:11px 16px;margin:8px auto;max-width:280px">
    <div style="font-size:26px">${a[0]}</div>
    <div style="font-size:19px;font-weight:800">${esc(a[2].name)}</div>
    <div style="font-size:12px;opacity:.85">${a[1]} · ${a[2].wert}</div></div>`).join("")
    :`<div class="aw-pop" style="opacity:.85;font-size:15px">Sammelt Aktionen am Spieltag – dann gibt's hier eure Helden! 🦅</div>`;
  S.push({bg:g("#1e3a8a","#3b82f6"),confetti:true,html:`<div>
    <div class="aw-pop" style="font-size:22px;font-weight:900;margin-bottom:14px">🏅 Eure Saison-Helden</div>${awardsHtml}</div>`});
  S.push({bg:g("#7c2d12","#dc2626"),confetti:true,html:`<div>
    <div class="aw-pop" style="font-size:58px">🦅❤️</div>
    <div class="aw-pop d1" style="font-size:26px;font-weight:900;margin-top:10px">Was für eine Saison, Adler!</div>
    <div class="aw-pop d2" style="font-size:15px;opacity:.85;margin-top:10px">${d.spieler_anzahl||0} Kinder · ein Team</div></div>`});
  // FEAT X: Galerie-Fotos als Hintergrund einstreuen (Gradient-Overlay -> Text bleibt lesbar).
  // Rein DOM (background-image), daher kein Canvas-Taint. Fotos sind lokale Blob-URLs.
  if(fotos&&fotos.length){
    const overlay=(slide,foto)=>{slide.bg=slide.bg.replace(/linear-gradient\(160deg,\s*([^,]+),\s*([^)]+)\)/,(m,a,b)=>`linear-gradient(160deg,${a.trim()}cc,${b.trim()}cc), url("${foto}") center/cover`);};
    [1,2,3,4,5].forEach((si,k)=>{ if(S[si]&&fotos[k])overlay(S[si],fotos[k]); }); // Intro & Finale bleiben clean
    S.splice(S.length-1,0,{bg:`linear-gradient(160deg,#0f172acc,#1e293bcc), url("${fotos[0]}") center/cover`,html:`<div>
      <div class="aw-pop" style="font-size:14px;opacity:.9;text-transform:uppercase;letter-spacing:2px">Unsere Momente</div>
      <div class="aw-pop d1" style="font-size:26px;font-weight:900;margin-top:8px">📸 ${fotos.length} Erinnerungen</div>
      <div class="aw-pop d2" style="font-size:14px;opacity:.85;margin-top:10px">Eine Saison zum Nie-Vergessen 🦅</div></div>`});
  }
  return S;
}
function adlerWrappedShow(d,fotos){
  awrapSlides=adlerWrappedSlides(d,fotos); awrapIdx=0;
  if(!document.getElementById("wrapped-style")){
    const st=document.createElement("style");st.id="wrapped-style";
    st.textContent=`@keyframes awrapPop{0%{opacity:0;transform:translateY(28px) scale(.9)}100%{opacity:1;transform:none}}
      #adler-wrapped .aw-pop{animation:awrapPop .55s cubic-bezier(.2,.8,.2,1) both}
      #adler-wrapped .aw-pop.d1{animation-delay:.16s}#adler-wrapped .aw-pop.d2{animation-delay:.34s}#adler-wrapped .aw-pop.d3{animation-delay:.52s}
      #adler-wrapped .aw-big{font-size:88px;font-weight:900;line-height:1;letter-spacing:-2px;margin:6px 0}`;
    document.head.appendChild(st);
  }
  const modal=document.createElement("div");
  modal.id="adler-wrapped";
  modal.style.cssText="position:fixed;inset:0;z-index:10000;overflow:hidden;color:#fff;font-family:inherit;display:flex;flex-direction:column";
  modal.innerHTML=`
    <div id="aw-bars" style="display:flex;gap:4px;padding:12px 12px 4px;position:relative;z-index:3"></div>
    <button onclick="adlerWrappedClose()" aria-label="Schließen" style="position:absolute;top:30px;right:12px;z-index:4;background:rgba(0,0,0,.25);border:none;color:#fff;font-size:22px;width:36px;height:36px;border-radius:50%;cursor:pointer">×</button>
    <div id="aw-stage" style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px;position:relative;z-index:1"></div>
    <div style="position:absolute;top:32px;bottom:0;left:0;right:0;z-index:2;display:flex">
      <div style="flex:1" onclick="adlerWrappedPrev()"></div>
      <div style="flex:2" onclick="adlerWrappedNext()"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector("#aw-bars").innerHTML=awrapSlides.map((_,i)=>`<div style="flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.28);overflow:hidden"><div class="aw-barfill" data-i="${i}" style="height:100%;width:0;background:#fff"></div></div>`).join("");
  adlerWrappedRender();
}
function adlerWrappedRender(){
  const modal=document.getElementById("adler-wrapped");
  if(!modal)return;
  clearTimeout(awrapTimer);
  const s=awrapSlides[awrapIdx];
  modal.style.background=s.bg;
  modal.querySelector("#aw-stage").innerHTML=s.html;
  modal.querySelectorAll(".aw-barfill").forEach(f=>{
    const i=+f.dataset.i;
    if(i<awrapIdx){f.style.transition="none";f.style.width="100%";}
    else if(i===awrapIdx){f.style.transition="none";f.style.width="0";void f.offsetWidth;f.style.transition=`width ${AWRAP_MS}ms linear`;f.style.width="100%";}
    else{f.style.transition="none";f.style.width="0";}
  });
  if(s.confetti&&typeof confetti==="function")confetti(modal);
  awrapTimer=setTimeout(adlerWrappedNext,AWRAP_MS);
}
function adlerWrappedNext(){ if(!document.getElementById("adler-wrapped"))return; if(awrapIdx>=awrapSlides.length-1){adlerWrappedClose();return;} awrapIdx++; adlerWrappedRender(); }
function adlerWrappedPrev(){ if(!document.getElementById("adler-wrapped"))return; if(awrapIdx<=0){adlerWrappedRender();return;} awrapIdx--; adlerWrappedRender(); }
function adlerWrappedClose(){ clearTimeout(awrapTimer); awrapFotoUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}}); awrapFotoUrls=[]; document.getElementById("adler-wrapped")?.remove(); }
function printZertifikat(){
  const name=document.getElementById("psel-profil")?.value;
  if(!name){toast("Erst einen Spieler wählen","err");return;}
  const snaps=DB[name]||[];if(!snaps.length){toast("Keine Bewertung vorhanden","err");return;}
  const lat=snaps[snaps.length-1];
  const isTw=lat.tw===true||getKader(name)?.tw;
  const prim=lat.prim_rolle||"Allrounder";
  // Stärken aus dem Fazit ("  + …")
  const st=[];
  (lat.fazit||"").split("\n").forEach(line=>{ if(line.startsWith("  + "))st.push(line.slice(4).split("–")[0].trim()); });
  const top=st.slice(0,3);
  const staerkenHtml=top.length
    ? top.map(s=>`<div class="zt-i"><b>✔</b><span>${esc(s)}</span></div>`).join("")
    : `<div class="zt-i"><b>✔</b><span>Mit vollem Einsatz dabei – Woche für Woche</span></div>`;
  const tot=lat.total_score||0,pot=lat.pot_score||0;
  const text=`Für eine großartige Saison bei der U9 I des SV Adler Dellbrück. `+
    `Du hast dich als ${esc(prim)}${isTw?" und im Tor":""} weiterentwickelt, im Training angepackt `+
    `und Teil unserer Raute-Familie geworden. Weiter so – wir sind stolz auf dich!`;

  document.getElementById("zert-print").innerHTML=`
    <div class="zert-card">
      <div class="zert-crest"><img src="logo.png" alt="SV Adler Dellbrück"></div>
      <div class="zert-club">SV Adler Dellbrück e.V. · U9 I</div>
      <div class="zert-title">Saison-Zertifikat</div>
      <div class="zert-season">Saison ${saisonLabel()}</div>
      <div class="zert-for">verliehen an</div>
      <div class="zert-name">${esc(name)}${isTw?" 🥅":""}</div>
      <div class="zert-role">Rolle in der Raute: ${esc(prim)}</div>
      <div class="zert-text">${text}</div>
      <div class="zert-staerken">
        <div class="zt-h">Deine Stärken in dieser Saison</div>
        ${staerkenHtml}
      </div>
      <div class="zert-badges">
        <div class="zb">Entwicklungsstand<b>${tot}%</b></div>
        <div class="zb">Potenzial<b>~${pot}%</b></div>
      </div>
      <div class="zert-sign">
        <div>Trainerteam<br>${(typeof TRAINER!=="undefined"?TRAINER:["Sandy","Charles","Finn","Kenneth","Peter"]).join(" · ")}</div>
        <div>Dellbrück, ${new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"long",year:"numeric"})}</div>
      </div>
    </div>`;

  document.body.classList.add("printing-zert");
  const cleanup=()=>{document.body.classList.remove("printing-zert");window.removeEventListener("afterprint",cleanup);};
  window.addEventListener("afterprint",cleanup);
  setTimeout(cleanup,3000); // Fallback, falls afterprint nicht feuert
  window.print();
}

/* ═══════════════════════════════════
   PHASE 7-D: ADLER-KARTE (FUT-Style, nativ auf Canvas gezeichnet)
   Paedagogisch: keine harten Prozentzahlen, sondern positive Badges. JEDES Kind
   bekommt seine Top-3-Staerken – so wirkt keine Karte "leer". Trikotnummer statt
   Overall-Rating. Design-Farbe = staerkste Dimension. Foto (D2) wird per Blob
   gezeichnet (kein CORS); ohne Foto zeigt die Karte die Initialen.
═══════════════════════════════════ */
const CARD_BADGES={
  f_tempo:{icon:"🚀",label:"Dynamik-Rakete"}, f_ballkontrolle:{icon:"🎩",label:"Ball-Zauberer"},
  f_pass:{icon:"🎯",label:"Pass-Meister"}, f_abschluss:{icon:"⚽",label:"Torjäger"},
  f_raum:{icon:"🧭",label:"Feld-Leser"}, f_umschalt:{icon:"⚡",label:"Umschalt-Blitz"},
  f_laufweg:{icon:"🏃",label:"Wege-Finder"}, f_defense:{icon:"🛡️",label:"Abwehr-Boss"},
  f_koord:{icon:"🤸",label:"Wirbelwind"}, f_einsatz:{icon:"🔥",label:"Kampf-Herz"},
  f_selbst:{icon:"🦁",label:"Mutig"}, f_team:{icon:"🤝",label:"Teamplayer"},
  f_sozial:{icon:"💛",label:"Herz des Teams"}, f_resil:{icon:"💪",label:"Steh-auf-Typ"},
  f_coach:{icon:"🧠",label:"Blitz-Lerner"}, f_freude:{icon:"😄",label:"Fußball-Fan"}
};
const CARD_THEMES={
  tech:{a:"#1e3a8a",b:"#3b82f6",name:"TECHNIK"}, raute:{a:"#5b21b6",b:"#8b5cf6",name:"SPIELWITZ"},
  phys:{a:"#9a3412",b:"#f97316",name:"DYNAMIK"}, mental:{a:"#065f46",b:"#10b981",name:"CHARAKTER"},
  entw:{a:"#155e75",b:"#06b6d4",name:"TALENT"}, keeper:{a:"#854d0e",b:"#eab308",name:"TORWART"}
};
/* Meilenstein-Karten (Phase 11-R): Design nach TEILNAHME, nicht Leistung.
   ≥10 Trainings → Gold, ≥20 → Hero. Überschreibt das Dim-Theme. Metallischer Verlauf,
   Doppelrahmen, Glanz + Siegel werden in adlerCardDraw gebacken (bleiben im PNG-Export). */
const CARD_MILESTONES=[
  {min:20, a:"#2a0e57", b:"#f59e0b", name:"HERO", medal:"hero", border:"#fcd34d"},
  {min:10, a:"#5c4300", b:"#e9c94a", name:"GOLD", medal:"gold", border:"#ffe08a"}
];
function cardMilestoneTheme(trainings){ const t=Number(trainings)||0; return CARD_MILESTONES.find(m=>t>=m.min)||null; }
// On-Screen-Glanz (nur im Modal, nicht im Export): sanftes Gold-/Hero-Pulsieren um die Karte.
function cardApplyGlow(canvas,trainings){
  if(!canvas)return;
  const ms=cardMilestoneTheme(trainings);
  if(!ms){canvas.style.animation="";return;}
  if(!document.getElementById("card-glow-style")){
    const st=document.createElement("style");st.id="card-glow-style";
    st.textContent="@keyframes cardGlowGold{0%,100%{box-shadow:0 12px 40px rgba(0,0,0,.5)}50%{box-shadow:0 0 34px rgba(255,215,0,.6),0 12px 40px rgba(0,0,0,.5)}}@keyframes cardGlowHero{0%,100%{box-shadow:0 0 22px rgba(245,158,11,.5),0 12px 40px rgba(0,0,0,.5)}50%{box-shadow:0 0 48px rgba(236,72,153,.75),0 12px 40px rgba(0,0,0,.5)}}";
    document.head.appendChild(st);
  }
  canvas.style.animation=(ms.medal==="hero"?"cardGlowHero 1.8s":"cardGlowGold 2.4s")+" ease-in-out infinite";
}
// Position ausschreiben: "Flitzer R" -> "Rechter Flitzer", Codes -> Klartext.
function cardPosLabel(pos){
  if(!pos)return pos;
  const p=String(pos).trim(), low=p.toLowerCase();
  const direct={aufpasser:"Aufpasser","jäger":"Jäger",jaeger:"Jäger",torwart:"Torwart",tw:"Torwart",allrounder:"Allrounder",flitzer:"Flitzer",flitzer_l:"Linker Flitzer",flitzer_r:"Rechter Flitzer"};
  if(direct[low])return direct[low];
  const m=low.match(/^(.+?)\s+(r|l|rechts|links)$/);
  if(m){const seite=/^(r|rechts)$/.test(m[2])?"Rechter":"Linker",base=m[1].trim();return seite+" "+base.charAt(0).toUpperCase()+base.slice(1);}
  return p;
}
function adlerCardData(name){
  const snaps=DB[name]||[];
  if(!snaps.length)return null;
  const lat=snaps[snaps.length-1];
  const v=typeof lat.radios==="string"?safeParse(lat.radios,{}):(lat.radios||{});
  const k=getKader(name)||{};
  // Top-3 Staerken (nach Wert; bei Gleichstand egal) – jedes Kind bekommt 3 Badges
  const strengths=Object.keys(CARD_BADGES).map(key=>({key,val:v[key]||0})).sort((a,b)=>b.val-a.val).slice(0,3);
  // Design-Farbe: staerkste Dimension (TW -> Gold)
  const{dims:ds}=calcScores(v,DIMS_FELD);
  const topDim=Object.entries(ds).sort((a,b)=>b[1]-a[1])[0]||["tech",0];
  const theme=k.tw?CARD_THEMES.keeper:(CARD_THEMES[topDim[0]]||CARD_THEMES.tech);
  const posMap={aufpasser:"Aufpasser",jaeger:"Jäger",flitzer_l:"Flitzer",flitzer_r:"Flitzer"};
  const pos=k.lieblingsposition||(k.tw?"Torwart":(posMap[lat.position]||lat.prim_rolle||"Allrounder"));
  const fussMap={L:"linker Fuß",R:"rechter Fuß",B:"beidfüßig"};
  return {name,nr:k.nr,tw:!!k.tw,geb:k.geb,fotoPath:k.foto_path,pos:cardPosLabel(pos),fuss:fussMap[k.starker_fuss||lat.strong_foot]||"",
          alter:k.geb?homeAlter(k.geb):(lat.age||null), badges:strengths.map(s=>CARD_BADGES[s.key]), theme};
}
function adlerCardDraw(ctx,W,H,d,photoImg){
  // Meilenstein-Theme (Teilnahme, nicht Leistung) überschreibt das Dim-Theme.
  const ms=(d.counts&&cardMilestoneTheme(d.counts.trainings))||null;
  const th=ms||d.theme;
  const medal=ms?ms.medal:null;
  ctx.clearRect(0,0,W,H);
  // Hintergrund-Verlauf – Meilenstein: diagonal + dreistufig (metallischer Schimmer)
  const g=medal?ctx.createLinearGradient(0,0,W,H):ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,th.a); if(medal){g.addColorStop(.5,th.b);g.addColorStop(1,th.a);} else {g.addColorStop(1,th.b);}
  tbRoundRect(ctx,10,10,W-20,H-20,28);ctx.fillStyle=g;ctx.fill();
  ctx.save();tbRoundRect(ctx,10,10,W-20,H-20,28);ctx.clip();
  // Glanz-Diagonale (Meilenstein deutlich stärker)
  ctx.globalAlpha=medal?.22:.08;ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W*.6,0);ctx.lineTo(0,H*.5);ctx.closePath();ctx.fill();
  if(medal){ctx.globalAlpha=.13;ctx.beginPath();ctx.moveTo(W,H*.22);ctx.lineTo(W,H*.44);ctx.lineTo(0,H*.92);ctx.lineTo(0,H*.7);ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;ctx.restore();
  // Rahmen – Meilenstein: metallischer Doppelrahmen + Siegel oben mittig
  if(medal){
    ctx.lineWidth=6;ctx.strokeStyle=ms.border;tbRoundRect(ctx,11,11,W-22,H-22,27);ctx.stroke();
    ctx.lineWidth=2;ctx.strokeStyle="rgba(255,255,255,.5)";tbRoundRect(ctx,17,17,W-34,H-34,22);ctx.stroke();
    ctx.font="800 12px Arial";
    const seal=(medal==="hero"?"🦸 HERO":"🏅 GOLD")+" · "+(d.counts.trainings||0)+" Trainings";
    const sw=ctx.measureText(seal).width, pw=sw+22;
    ctx.save();tbRoundRect(ctx,(W-pw)/2,20,pw,24,12);ctx.fillStyle=ms.border;ctx.fill();ctx.restore();
    ctx.fillStyle="#3a2a00";ctx.textAlign="center";ctx.fillText(seal,W/2,36);
    ctx.shadowColor="rgba(0,0,0,.32)";ctx.shadowBlur=3;ctx.shadowOffsetY=1; // Lesbarkeit auf Gold/Hero
  }else{
    ctx.lineWidth=3;ctx.strokeStyle="rgba(255,255,255,.85)";tbRoundRect(ctx,10,10,W-20,H-20,28);ctx.stroke();
  }

  // ── Kopf: Trikotnummer (statt Overall) + Positions-Pill + Theme ──
  ctx.textAlign="left";ctx.fillStyle="#fff";
  ctx.font="800 48px Arial";ctx.fillText(d.nr!=null?String(d.nr):"–",38,80);
  const pos=(d.pos||"").toUpperCase();
  if(pos){
    ctx.font="700 14px Arial";const pw=ctx.measureText(pos).width;
    ctx.save();tbRoundRect(ctx,38,92,pw+22,26,13);ctx.fillStyle="rgba(255,255,255,.20)";ctx.fill();ctx.restore();
    ctx.fillStyle="#fff";ctx.fillText(pos,49,110);
  }
  ctx.font="600 12px Arial";ctx.fillStyle="rgba(255,255,255,.8)";ctx.fillText(th.name,40,134);
  // Wappen oben rechts
  ctx.textAlign="right";ctx.font="34px Arial";ctx.fillText(d.tw?"🧤":"🦅",W-34,84);

  // ── Foto / Initialen (mit Glow) ──
  const cx=W/2, cy=H*0.315, rad=W*0.225;
  const rg=ctx.createRadialGradient(cx,cy,rad*0.6,cx,cy,rad*1.5);
  rg.addColorStop(0,"rgba(255,255,255,.28)");rg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=rg;ctx.beginPath();ctx.arc(cx,cy,rad*1.5,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.closePath();ctx.clip();
  if(photoImg){ ctx.drawImage(photoImg,cx-rad,cy-rad,rad*2,rad*2); }
  else{
    ctx.fillStyle="rgba(255,255,255,.18)";ctx.fillRect(cx-rad,cy-rad,rad*2,rad*2);
    ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="800 "+Math.round(rad)+"px Arial";
    ctx.fillText((d.name||"?").slice(0,2).toUpperCase(),cx,cy+rad*0.35);
  }
  ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.lineWidth=3;ctx.strokeStyle="rgba(255,255,255,.9)";ctx.stroke();

  // ── Name + Alter/Fuß ──
  const nameY=cy+rad+44;
  ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="800 33px Arial";
  ctx.fillText(d.name||"", W/2, nameY);
  ctx.font="600 15px Arial";ctx.fillStyle="rgba(255,255,255,.9)";
  const sub=[d.spitzname?'„'+d.spitzname+'“':"",d.alter?d.alter+" Jahre":"",d.fuss||""].filter(Boolean).join("  ·  ");
  if(sub)ctx.fillText(sub,W/2,nameY+24);

  // ── Einsatz-Zähler (Fleiß statt Skill-Ranking): positionsgerecht (TW → Paraden) ──
  const c=d.counts||null;
  const first=d.tw?{ic:"🧤",v:c&&c.paraden,l:"PARADEN"}:{ic:"⚽",v:c&&c.tore,l:"TORE"};
  const quad=[first,{ic:"🎯",v:c&&c.aktionen,l:"AKTIONEN"},{ic:"👟",v:c&&c.spiele,l:"SPIELE"},{ic:"🏃",v:c&&c.trainings,l:"TRAININGS"}];
  const ty=nameY+50, tbh=88, tw4=(W-80)/4;
  ctx.save();tbRoundRect(ctx,40,ty,W-80,tbh,16);ctx.fillStyle="rgba(0,0,0,.20)";ctx.fill();ctx.restore();
  quad.forEach((t,i)=>{
    const tx=40+tw4*i+tw4/2;
    ctx.textAlign="center";
    ctx.font="20px Arial";ctx.fillStyle="#fff";ctx.fillText(t.ic,tx,ty+28);
    ctx.font="800 26px Arial";ctx.fillText((c&&t.v!=null)?String(t.v):"–",tx,ty+58);
    ctx.font="600 10px Arial";ctx.fillStyle="rgba(255,255,255,.85)";ctx.fillText(t.l,tx,ty+75);
    if(i<3){ctx.strokeStyle="rgba(255,255,255,.16)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40+tw4*(i+1),ty+14);ctx.lineTo(40+tw4*(i+1),ty+tbh-14);ctx.stroke();}
  });

  // ── Badges (immer 3) ──
  const by=ty+tbh+16, bh=118;
  ctx.save();tbRoundRect(ctx,30,by,W-60,bh,18);ctx.fillStyle="rgba(0,0,0,.24)";ctx.fill();ctx.restore();
  const bw=(W-60)/3;
  (d.badges||[]).slice(0,3).forEach((b,i)=>{
    const bx=30+bw*i+bw/2;
    ctx.textAlign="center";ctx.font="30px Arial";ctx.fillStyle="#fff";ctx.fillText(b.icon,bx,by+50);
    ctx.font="700 12px Arial";
    const words=(b.label||"").split(" ");
    ctx.fillText(words[0]||"",bx,by+78);
    if(words[1])ctx.fillText(words.slice(1).join(" "),bx,by+94);
  });

  // ── Quiz-Wissen (Fleiß-Wert, nur wenn gequizzt) ──
  if(c&&c.quizBloecke>0){
    ctx.textAlign="center";ctx.font="600 13px Arial";ctx.fillStyle="rgba(255,255,255,.92)";
    ctx.fillText(`🧠 Quiz: ${c.quizRichtig} richtige · ${c.quizBloecke} ${c.quizBloecke===1?"Block":"Blöcke"}`, W/2, by+bh+30);
  }

  // ── Fußzeile ──
  ctx.textAlign="center";ctx.font="600 12px Arial";ctx.fillStyle="rgba(255,255,255,.8)";
  ctx.fillText("SV Adler Dellbrück · U9 · Saison "+saisonLabel(), W/2, H-22);
  ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.shadowOffsetY=0;
}
/* Foto-Pipeline (D2): Kompression nativ (Canvas+toBlob), Upload in den privaten
   Bucket, Laden per authentifiziertem GET -> Blob -> Object-URL (kein CORS/tainted
   canvas). Comic-Filter bewusst entfernt: clientseitig nicht überzeugend, echte
   Cartoonisierung bräuchte ein KI-Modell (Foto müsste extern verarbeitet werden –
   widerspricht dem Datenschutz-Konzept "Foto verlässt das Gerät nie ungebrannt"). */
function fotoLoadFromFile(file){
  // EXIF-Orientierung beruecksichtigen, wo verfuegbar (createImageBitmap), sonst Fallback.
  if(window.createImageBitmap){
    return createImageBitmap(file,{imageOrientation:"from-image"}).catch(()=>fotoLoadFallback(file));
  }
  return fotoLoadFallback(file);
}
function fotoLoadFallback(file){
  return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
}
async function fotoCompress(file,size=400){
  const img=await fotoLoadFromFile(file);
  const iw=img.width||img.naturalWidth, ih=img.height||img.naturalHeight;
  const s=Math.min(iw,ih), sx=(iw-s)/2, sy=(ih-s)/2; // zentriert quadratisch zuschneiden
  const cv=document.createElement("canvas");cv.width=size;cv.height=size;
  cv.getContext("2d").drawImage(img,sx,sy,s,s,0,0,size,size);
  return await new Promise(r=>cv.toBlob(r,"image/jpeg",0.82)); // JPEG-Default (iOS-sicher), spart Traffic
}
// Einsatz-Zähler für die Karte: Fleiß-/Dabeisein-Metriken (kein Skill-Ranking, damit
// sich die Kinder nicht in ihren Fähigkeiten vergleichen). Tore = match_actions-Zeilen,
// Spiele = Nominierungen "dabei", Trainings = Anwesenheit "da". Läuft nur mit Trainer-Token.
const CARD_POS_AKTIONEN=["pass","dribbling","gewinn","parade","aufbau","heraus","tor"]; // positiv (verlust/fehler bewusst raus)
async function adlerCardStats(name){
  const enc=encodeURIComponent(name), out={tore:0,paraden:0,aktionen:0,spiele:0,trainings:0,quizRichtig:0,quizBloecke:0};
  try{ // ein Query für alle Ballaktionen des Kindes → Tore/Paraden/Aktionen daraus ableiten
    const r=await fetch(`${SB_URL}/rest/v1/match_actions?spieler=eq.${enc}&select=aktion&limit=10000`,{headers:sbAuthHeaders()});
    if(!sbCheck401(r)&&r.ok){
      (await r.json()).forEach(a=>{
        if(a.aktion==="tor")out.tore++;
        if(a.aktion==="parade")out.paraden++;
        if(CARD_POS_AKTIONEN.includes(a.aktion))out.aktionen++;
      });
    }
  }catch(e){}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/nominierungen?select=data`,{headers:sbAuthHeaders()});
    if(r.ok){out.spiele=(await r.json()).filter(x=>x.data&&x.data[name]==="dabei").length;}
  }catch(e){}
  try{
    const r=await fetch(`${SB_URL}/rest/v1/anwesenheit?select=data`,{headers:sbAuthHeaders()});
    if(r.ok){out.trainings=(await r.json()).filter(x=>x.data&&x.data[name]&&x.data[name].da===true).length;}
  }catch(e){}
  try{ // Quiz läuft anonym über den Anon-Key – hier auch damit lesen (garantiert erlaubt)
    const r=await fetch(`${SB_URL}/rest/v1/quiz_progress?player=eq.${enc}&select=score,block`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
    if(r.ok){const rows=await r.json();out.quizBloecke=rows.length;out.quizRichtig=rows.reduce((s,x)=>s+(x.score||0),0);}
  }catch(e){}
  return out;
}
async function fotoLoadImage(path){
  if(!path||!sbToken())return null;
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/spielerfotos/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return null;
    const blob=await r.blob();
    const url=URL.createObjectURL(blob);
    return await new Promise((res,rej)=>{const i=new Image();i.onload=()=>{res(i);};i.onerror=rej;i.src=url;});
  }catch(e){return null;}
}
async function fotoUpload(name,file,btn){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  if(btn)btn.disabled=true;
  try{
    const blob=await fotoCompress(file);
    const path=(crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now()))+".jpg";
    const up=await fetch(`${SB_URL}/storage/v1/object/spielerfotos/${path}`,{method:"POST",headers:{'Authorization':'Bearer '+sbToken(),'Content-Type':'image/jpeg'},body:blob});
    if(!up.ok){toast("Foto-Upload fehlgeschlagen","err");return;}
    const pr=await fetch(`${SB_URL}/rest/v1/kader?name=eq.${encodeURIComponent(name)}`,{method:"PATCH",headers:sbAuthHeaders(),body:JSON.stringify({foto_path:path})});
    if(sbCheck401(pr))return;
    await loadKader();
    toast("Foto gespeichert ✓");
  }catch(e){toast("Foto konnte nicht verarbeitet werden","err");}
  finally{if(btn)btn.disabled=false;}
}

let adlerCardBlob=null;
async function adlerCardOpen(){
  const name=document.getElementById("psel-profil")?.value;
  if(!name){toast("Erst einen Spieler wählen","err");return;}
  const d=adlerCardData(name);
  if(!d){toast("Keine Bewertung vorhanden","err");return;}
  d.counts=null; // Einsatz-Zähler laden asynchron nach
  const W=500,H=780;
  const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext("2d");
  let rawPhoto=null;
  function render(){
    adlerCardDraw(ctx,W,H,d,rawPhoto);
    canvas.toBlob(b=>{adlerCardBlob=b;},"image/png");
  }
  render(); // sofort (Initialen + "–"), Foto und Zähler laden asynchron nach
  const modal=document.createElement("div");
  modal.id="adler-card-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  canvas.style.cssText="max-width:100%;width:300px;height:auto;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.5)";
  modal.appendChild(canvas);
  const bar=document.createElement("div");
  bar.style.cssText="display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
  bar.innerHTML=`<button class="btn btn-p" onclick="adlerCardShare()"><i class="ti ti-share"></i>Karte teilen</button>
    <button class="btn" onclick="document.getElementById('adler-card-modal').remove()">Schließen</button>`;
  modal.appendChild(bar);
  document.body.appendChild(modal);
  // Einsatz-Zähler laden und neu zeichnen (Modal-Guard gegen Race, falls schon geschlossen)
  adlerCardStats(name).then(c=>{ if(document.getElementById("adler-card-modal")){ d.counts=c; render(); cardApplyGlow(canvas,c.trainings); } });
  // Foto (falls vorhanden) laden und neu zeichnen
  if(d.fotoPath){ const img=await fotoLoadImage(d.fotoPath); if(img&&document.getElementById("adler-card-modal")){ rawPhoto=img; render(); } }
}
async function adlerCardShare(){
  if(!adlerCardBlob){toast("Karte noch nicht bereit","err");return;}
  const file=new File([adlerCardBlob],"adler-karte.png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:"Adler-Karte",text:"Meine Adler-Sammelkarte ⚽"});}catch(e){}
  }else{
    const a=document.createElement("a");a.href=URL.createObjectURL(adlerCardBlob);a.download="adler-karte.png";
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast("Karte heruntergeladen ✓");
  }
}

/* ═══════════════════════════════════
   VERLAUF VIEW
═══════════════════════════════════ */
let vchart=null,vchartTimer=0;
function renderVerlauf(){
  const name=document.getElementById("psel-verlauf").value;
  if(!name){document.getElementById("verlauf-content").innerHTML='<div class="empty"><i class="ti ti-chart-line"></i>Spieler auswählen</div>';return;}
  const snaps=DB[name]||[];
  const isTw=getKader(name)?.tw||false;
  const dims=isTw?[...DIMS_FELD,...DIMS_TW]:DIMS_FELD;
  const dl=dims.map(d=>d.label.split(" ")[0]);
  const cols=dims.map(d=>d.col);
  const dates=snaps.map(s=>s.datum||'–');
  const datasets=dl.map((l,i)=>({label:l,data:snaps.map(s=>{const sc=safeParse(s.scores,[]);return sc[i]||0;}),borderColor:cols[i],backgroundColor:"transparent",borderWidth:2,pointRadius:4,tension:.3}));
  let deltaHtml="";
  if(snaps.length>=2){
    const prev=snaps[snaps.length-2],curr=snaps[snaps.length-1];
    const scP=safeParse(prev.scores,[]);const scC=safeParse(curr.scores,[]);
    const totD=(curr.total_score||0)-(prev.total_score||0);
    deltaHtml=`<div class="delta-box"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:8px"><i class="ti ti-trending-up" style="font-size:13px"></i> Delta ${esc(prev.datum||'–')} → ${esc(curr.datum||'–')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${dl.map((l,i)=>{const d=(scC[i]||0)-(scP[i]||0);return`<span class="hp">${l}: <span class="${d>0?'dp':d<0?'dn':''}">${d>0?'+':''}${d}%</span></span>`;}).join("")}</div>
    <div style="font-size:12.5px;font-weight:600">Gesamt: <span class="${totD>0?'dp':totD<0?'dn':''}">${totD>0?'+':''}${totD}%</span></div></div>`;
  }
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
    <div style="font-weight:700;font-size:14px">${esc(name)}${isTw?" 🥅":""}</div>
    <span style="font-size:11px;color:var(--text2)">${snaps.length} Bewertung${snaps.length!==1?"en":""}</span>
  </div>
  ${snaps.length>=2?deltaHtml:""}
  ${snaps.length<2?'<div class="status s-info show" style="margin-bottom:.75rem">Mind. 2 Bewertungen für Verlaufsdiagramm nötig.</div>':""}
  <div style="position:relative;height:240px;margin-bottom:1rem"><canvas id="vc" role="img" aria-label="Verlauf ${esc(name)}">Entwicklung</canvas></div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:1rem">${dl.map((l,i)=>`<span style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:500;color:var(--text2)"><span style="width:14px;height:3px;background:${cols[i]};display:inline-block;border-radius:2px"></span>${l}</span>`).join("")}</div>
  <div class="sl"><i class="ti ti-history"></i>Alle Snapshots</div>`;
  snaps.forEach((s,idx)=>{
    const sc=safeParse(s.scores,[]);
    const prev=idx>0?safeParse(snaps[idx-1].scores,null):null;
    const bMap={aufpasser:"rb-auf",jaeger:"rb-jaeg",flitzer_l:"rb-links",flitzer_r:"rb-rechts"};
    html+=`<div class="hi">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">
        <span style="font-weight:600;font-size:13px">${esc(s.datum||'–')}</span>
        <span class="rbadge ${bMap[s.position]||'rb-flex'}">${esc(s.prim_rolle||s.position||'–')}</span>
        <span style="font-size:10.5px;color:var(--text2)">${esc(s.trainer||'')}</span>
        <span style="font-size:14px;font-weight:700;color:var(--blue)">${s.total_score||0}%</span>
        <button data-del-snap data-name="${esc(name)}" data-datum="${esc(s.datum||'')}" data-id="${esc(s.id||'')}" style="padding:3px 8px;font-size:10px;background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;font-family:inherit">Löschen</button>
      </div>
      <div class="hs">${dl.map((l,i)=>{const d=prev?(sc[i]||0)-(prev[i]||0):0;const ds=d>0?`<span class="dp"> +${d}</span>`:d<0?`<span class="dn"> ${d}</span>`:"";return`<span class="hp">${l}: ${sc[i]||0}%${ds}</span>`;}).join("")}</div>
    </div>`;
  });
  document.getElementById("verlauf-content").innerHTML=html;
  const vPrintBtn=document.getElementById("print-verlauf-btn");
  if(vPrintBtn)vPrintBtn.style.display=name?"inline-flex":"none";
  if(vchart){vchart.destroy();vchart=null;}
  clearTimeout(vchartTimer);
  vchartTimer=setTimeout(()=>{
    const ctx=document.getElementById("vc");if(!ctx)return;
    vchart=new Chart(ctx,{type:"line",data:{labels:dates,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{stepSize:25}}}}});
  },80);
}

/* ═══════════════════════════════════
   NAV
═══════════════════════════════════ */
/* ═══════════════════════════════════
   NAVIGATION – 5 Tabs, datengetriebener 2-Ebenen-Router
   TABS: Bottom-Nav-Tab -> Sektionen (dynamische Sub-Tab-Leiste).
   SECS: Sektion -> Container-ID + Init-Funktion (+ sub:true = liegt im Host #view-training).
   sv()/switchTrainSub() bleiben als Kompatibilitäts-Shims für Altaufrufe erhalten.
═══════════════════════════════════ */
const TABS={
  home:    {sections:[
    {key:"home",    label:"Dashboard", icon:"ti-home"},
  ]},
  team:    {sections:[
    {key:"kader",   label:"Kader",    icon:"ti-users"},
    {key:"profil",  label:"Profil",   icon:"ti-user"},
    {key:"bew",     label:"Bewerten", icon:"ti-clipboard-list"},
    {key:"verlauf", label:"Verlauf",  icon:"ti-chart-line"},
  ]},
  training:{sections:[
    {key:"anwesenheit", label:"Anwesenheit", icon:"ti-checkbox"},
    {key:"planung",     label:"Planung",     icon:"ti-calendar-event"},
    {key:"formen",      label:"Formen",      icon:"ti-ball-football"},
    {key:"quizresults", label:"Quiz",        icon:"ti-brain"},
  ]},
  spieltag:{sections:[
    {key:"spieltag", label:"Match",       icon:"ti-whistle"},
    {key:"kombi",    label:"Aufstellung", icon:"ti-users-group"},
    {key:"analyse",  label:"Analyse",     icon:"ti-chart-dots"},
  ]},
  taktik:  {sections:[
    {key:"taktik",   label:"Taktikboard", icon:"ti-arrows-move"},
  ]},
  orga:    {sections:[
    {key:"termine",  label:"Termine",  icon:"ti-calendar"},
    {key:"team",     label:"Pinnwand", icon:"ti-clipboard"},
  ]},
};
const SECS={
  home:       {cid:"view-home",            init:()=>renderHome()},
  bew:        {cid:"view-bew"},
  kader:      {cid:"view-kader",           init:()=>renderKader()},
  profil:     {cid:"view-profil",          init:()=>renderProfil()},
  verlauf:    {cid:"view-verlauf",         init:()=>renderVerlauf()},
  kombi:      {cid:"view-kombi",           init:()=>renderKombi()},
  taktik:     {cid:"view-taktik",          init:()=>taktikInit()},
  formen:     {cid:"train-sub-formen",     sub:true, init:()=>renderTraining()},
  termine:    {cid:"train-sub-termine",    sub:true, init:()=>tmInit()},
  planung:    {cid:"train-sub-planung",    sub:true, init:()=>{tpRenderTimeline();addEvalSection();}},
  anwesenheit:{cid:"train-sub-anwesenheit",sub:true, init:()=>awRenderList()},
  quizresults:{cid:"train-sub-quizresults",sub:true, init:()=>tqRenderTrainerView()},
  team:       {cid:"train-sub-team",       sub:true, init:()=>{tnLoad();teamStatsRender();tvInit();}},
  analyse:    {cid:"train-sub-analyse",    sub:true, init:()=>anInit()},
  spieltag:   {cid:"train-sub-spieltag",   sub:true, init:()=>{rotRenderControls();nomInit();}},
};
const tabState={}; // zuletzt geöffnete Sektion je Tab (UX: Rückkehr an dieselbe Stelle)
let curSection="bew"; // aktuell sichtbare Sektion (für Pull-to-Refresh)
function sectionTab(key){ for(const t in TABS){ if(TABS[t].sections.some(s=>s.key===key))return t; } return null; }

function renderSubbar(tabId,activeKey){
  const bar=document.getElementById("tab-subbar");
  if(!bar)return;
  const secs=TABS[tabId].sections;
  if(secs.length<=1){ bar.style.display="none"; bar.innerHTML=""; return; }
  bar.style.display="flex";
  bar.innerHTML=secs.map(s=>`<button class="sub-tab${s.key===activeKey?' active':''}" onclick="go('${s.key}')"><i class="ti ${s.icon}"></i>${s.label}</button>`).join("");
}
function _open(key){
  const sec=SECS[key]; if(!sec)return;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".train-sub").forEach(v=>v.classList.remove("active"));
  if(sec.sub)document.getElementById("view-training")?.classList.add("active"); // passiver Host sichtbar machen
  document.getElementById(sec.cid)?.classList.add("active");
}
function go(key){
  const tabId=sectionTab(key); if(!tabId||!SECS[key])return;
  document.querySelectorAll("#main-nav .nb").forEach(b=>b.classList.remove("active"));
  document.getElementById("nb-"+tabId)?.classList.add("active");
  renderSubbar(tabId,key);
  const reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(document.startViewTransition&&!reduce)document.startViewTransition(()=>_open(key));else _open(key);
  // Nebenwirkungen (aus altem _svApply/switchTrainSub übernommen)
  if(key==="taktik")requestWakeLock();else releaseWakeLock();
  // Rotations-Timer/Match-Uhr-Tick stoppen beim Verlassen des Spieltags (try/catch: ggf. noch in TDZ beim Start)
  try{ if(key!=="spieltag"&&rotTimerId){clearInterval(rotTimerId);rotTimerId=null;} }catch(e){}
  try{ if(key!=="spieltag"&&mcTickId){clearInterval(mcTickId);mcTickId=null;} }catch(e){}
  if(SECS[key].init)setTimeout(SECS[key].init,50);
  tabState[tabId]=key;
  curSection=key;
}
function openTab(tabId){ if(!TABS[tabId])return; go(tabState[tabId]||TABS[tabId].sections[0].key); }
// Kompatibilitäts-Shims: bestehende sv()/switchTrainSub()-Aufrufe im Code bleiben gültig
function sv(name){ if(name==="training"){openTab("training");return;} go(name); }
function switchTrainSub(sub){ go(sub); }

/* ═══════════════════════════════════
   HOME – Trainer-Dashboard
   Next-Event (aus termine), Geburtstags-Alerts (KADER.geb, optional gepflegt),
   Quick-Stats aus DB/KADER. Reine Lesesicht mit Schnellsprüngen.
═══════════════════════════════════ */
function homeAlter(geb){ // Alter in Jahren aus YYYY-MM-DD
  const g=new Date(geb+"T00:00:00"),h=new Date();
  let a=h.getFullYear()-g.getFullYear();
  if(h.getMonth()<g.getMonth()||(h.getMonth()===g.getMonth()&&h.getDate()<g.getDate()))a--;
  return a;
}
function homeGebTage(geb){ // Tage bis zum nächsten Geburtstag (0 = heute)
  const h=new Date();h.setHours(0,0,0,0);
  const g=new Date(geb+"T00:00:00");
  const next=new Date(h.getFullYear(),g.getMonth(),g.getDate());
  if(next<h)next.setFullYear(h.getFullYear()+1);
  return Math.round((next-h)/86400000);
}
async function renderHome(){
  const box=document.getElementById("home-content");
  if(!box)return;
  const heute=new Date().toISOString().slice(0,10);
  const card=(inner,accent)=>`<div style="background:var(--surface);border:var(--border-s);${accent?`border-left:3px solid ${accent};`:""}border-radius:var(--rl);padding:12px 14px;margin-bottom:10px">${inner}</div>`;

  // ── Quick-Stats (sofort, aus lokalen Daten) ──
  const names=Object.keys(DB||{});
  const bewertet=names.filter(n=>DB[n]&&DB[n].length).length;
  const cutoff=new Date(Date.now()-56*86400000).toISOString().slice(0,10); // 8 Wochen
  const stale=KADER.filter(k=>{
    const s=DB[k.name];
    if(!s||!s.length)return true;
    return (s[s.length-1].datum||"0000")<cutoff;
  }).length;
  const statTile=(val,lbl,col,jump)=>`<div onclick="${jump}" class="card" style="flex:1;min-width:90px;padding:10px;text-align:center;cursor:pointer">
    <div style="font-size:22px;font-weight:800;color:${col}">${val}</div>
    <div style="font-size:10px;color:var(--text2)">${lbl}</div></div>`;

  // ── Geburtstage (nur wenn geb im KADER gepflegt) ──
  const mitGeb=KADER.filter(k=>k.geb);
  let gebHtml="";
  if(!mitGeb.length){
    gebHtml=card(`<div style="font-size:12px;color:var(--text2)">🎂 Geburtstage: noch keine Daten im Kader gepflegt (Feld <code>geb:"JJJJ-MM-TT"</code> je Spieler ergänzen).</div>`);
  }else{
    const soon=mitGeb.map(k=>({k,d:homeGebTage(k.geb)})).filter(x=>x.d<=14).sort((a,b)=>a.d-b.d);
    if(soon.length){
      gebHtml=card(soon.map(x=>`<div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 0">
        <span style="font-size:16px">${x.d===0?"🎉":"🎂"}</span>
        <strong>${esc(x.k.name)}</strong>
        <span style="color:var(--text2);font-size:11.5px">${x.d===0?`wird HEUTE ${homeAlter(x.k.geb)+1}!`:`wird in ${x.d} Tag${x.d===1?"":"en"} ${homeAlter(x.k.geb)+1}`}</span>
      </div>`).join(""),"#d97706");
    }
  }

  const questTeaser=card(`<div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:6px">🏆 Team-Quests fürs nächste Spiel</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${teamQuests.map(q=>`<span style="font-size:11.5px;background:var(--surface2);border-radius:12px;padding:3px 9px">${q.icon} ${esc(q.label)} · ${q.target}</span>`).join("")}</div>
    ${teamBelohnung?`<div style="font-size:11px;color:var(--text2);margin-top:6px">🎁 Belohnung: <strong>${esc(teamBelohnung)}</strong></div>`:""}
    <div style="font-size:10.5px;color:var(--text3);margin-top:6px">Live-Fortschritt + Konfetti während des Spiels im Action-Tracker.</div>`,"#7c3aed");

  box.innerHTML=`
    <div class="sl nt"><i class="ti ti-home"></i>Trainer-Dashboard</div>
    <div id="home-next">${card('<div style="font-size:12px;color:var(--text3)">Lade nächsten Termin...</div>')}</div>
    ${gebHtml}
    ${questTeaser}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      ${statTile(KADER.length,"Kader","var(--blue)","go('kader')")}
      ${statTile(bewertet+"/"+KADER.length,"bewertet (v2)","#059669","go('bew')")}
      ${statTile(stale,"überfällig >8 Wo","#dc2626","go('bew')")}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-p" style="flex:1;min-height:46px" onclick="openTab('spieltag')"><i class="ti ti-whistle"></i>Spieltag</button>
      <button class="btn" style="flex:1;min-height:46px" onclick="go('anwesenheit')"><i class="ti ti-checkbox"></i>Anwesenheit</button>
      <button class="btn" style="flex:1;min-height:46px" onclick="go('termine')"><i class="ti ti-calendar-plus"></i>Termin</button>
    </div>
    <button onclick="kasseOpen()" style="width:100%;min-height:44px;margin-top:8px;border:var(--border-s);border-radius:var(--rl);cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;color:var(--text);background:var(--surface)">💰 Teamkasse</button>
    <button onclick="fundbueroOpen()" style="width:100%;min-height:44px;margin-top:8px;border:var(--border-s);border-radius:var(--rl);cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;color:var(--text);background:var(--surface)">🧦 Fundbüro</button>
    <button onclick="ausruestungGrid()" style="width:100%;min-height:44px;margin-top:8px;border:var(--border-s);border-radius:var(--rl);cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;color:var(--text);background:var(--surface)">👕 Team-Ausrüstung</button>
    <button onclick="stadionheftOpen()" style="width:100%;min-height:44px;margin-top:8px;border:var(--border-s);border-radius:var(--rl);cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;color:var(--text);background:var(--surface)">📰 Stadionheft erstellen & drucken</button>
    <button id="wrapped-btn" onclick="adlerWrappedTeaser()" style="width:100%;min-height:48px;margin-top:12px;border:1.5px dashed #cbd5e1;border-radius:var(--rl);cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;color:#94a3b8;background:var(--surface)">🔒 Adler Wrapped · Saison-Rückblick (am Saisonende)</button>`;

  // ── Next Event (async nachladen, damit das Dashboard sofort steht) ──
  try{
    const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&datum=gte.${heute}&order=datum.asc&limit=2`,{headers:sbAuthHeaders()});
    const slot=document.getElementById("home-next");
    if(!slot)return; // Nutzer hat den Tab schon verlassen
    if(!r.ok){slot.innerHTML=card('<div style="font-size:12px;color:var(--text3)">Termine offline nicht verfügbar.</div>');return;}
    const rows=await r.json();
    if(!rows.length){slot.innerHTML=card(`<div style="font-size:12.5px">📅 Kein Termin geplant. <a href="#" onclick="go('termine');return false" style="color:var(--blue)">Jetzt anlegen</a></div>`);return;}
    const t=rows[0];
    const m=(typeof TM_META!=="undefined"&&TM_META[t.typ])||{icon:"📅",label:t.typ,col:"#1a56db"};
    const d=new Date(t.datum+"T00:00:00");
    const wtag=["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
    const inTagen=Math.round((d-new Date(heute+"T00:00:00"))/86400000);
    const wann=inTagen===0?"HEUTE":inTagen===1?"morgen":`in ${inTagen} Tagen`;
    const zeit=t.uhrzeit?String(t.uhrzeit).slice(0,5)+" Uhr":"";
    const istSpiel=t.typ==="spiel"||t.typ==="turnier";
    slot.innerHTML=card(`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">Nächster Termin · ${wann}</div>
          <div style="font-size:15px;font-weight:800;margin-top:2px">${m.icon} ${esc(t.titel||t.gegner||m.label)}${t.spielform?` <span style="font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:10px;background:${m.col}22;color:${m.col}">${esc(t.spielform)}</span>`:""}</div>
          <div style="font-size:11.5px;color:var(--text2);margin-top:2px">${wtag} ${d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}${zeit?" · "+zeit:""}${t.ort?" · "+esc(t.ort):""}</div>
        </div>
        ${istSpiel?`<button class="btn btn-p btn-sm" onclick="tmJump('blitz','${t.datum}','${t.spielform||''}')" style="white-space:nowrap"><i class="ti ti-whistle"></i>Matchday</button>`
                  :`<button class="btn btn-sm" onclick="tmJump('planung','${t.datum}')" style="white-space:nowrap"><i class="ti ti-clipboard-list"></i>Plan</button>`}
      </div>`,m.col);
  }catch(e){
    const slot=document.getElementById("home-next");
    if(slot)slot.innerHTML=card('<div style="font-size:12px;color:var(--text3)">Offline – kein Terminabruf.</div>');
  }
}

// Wake Lock API (nativ) – verhindert, dass das Display während der Nutzung ausgeht
let wakeLock=null;
async function requestWakeLock(){
  try{if("wakeLock" in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request("screen");}catch(e){}
}
function releaseWakeLock(){try{if(wakeLock){wakeLock.release();wakeLock=null;}}catch(e){}}
// Nach Tab-Wechsel/Bildschirm-Aus wird der Lock vom System freigegeben – wieder anfordern
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&document.getElementById("view-taktik")?.classList.contains("active"))requestWakeLock();
});


/* ═══════════════════════════════════
   STADIONHEFT (FEAT X, Print) – druckbares Programmheft mit Mannschafts-
   vorstellung. Fotos werden als Data-URL EINGEBETTET (Auth-Download ->
   Blob -> FileReader), damit sie im Druck garantiert da sind – keine
   ablaufenden Signed-URLs, kein CORS-Problem. Muster wie printZertifikat.
═══════════════════════════════════ */
async function heftFotoDataUrl(path){
  if(!path)return null;
  try{
    const r=await fetch(`${SB_URL}/storage/v1/object/authenticated/spielerfotos/${path}`,{headers:{'Authorization':'Bearer '+sbToken()}});
    if(!r.ok)return null;
    const blob=await r.blob();
    return await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>res(null);fr.readAsDataURL(blob);});
  }catch(e){return null;}
}
/* ═══ HOTFIX 19: Stadionheft-Editor (WYSIWYG) – ersetzt den Direktdruck.
   Trainer bearbeitet Titel, Einleitung, „Spieler im Fokus" + Trainer-Kommentar,
   sieht eine Live-Vorschau und druckt. Texte bleiben in localStorage erhalten.
   heftBuildHtml(cfg,{mask}) baut das Heft rein – die Nachnamen-Maskierung ist
   bereits eingebaut (Aktivierung folgt in der DSGVO-Etappe). ═══ */
let heftKader=[], heftFanfacts={}, heftTermin=null, heftFotos=[];
let heftCfg={titel:"Stadionheft U9 I", einleitung:"", fokusId:"", fokusText:"", kommentar:""};
function heftCfgLoad(){ try{const s=JSON.parse(localStorage.getItem("adler_heft_cfg")||"null"); if(s&&typeof s==="object")heftCfg=Object.assign(heftCfg,s);}catch(e){} }
function heftCfgSave(){ try{localStorage.setItem("adler_heft_cfg",JSON.stringify(heftCfg));}catch(e){} }
// DSGVO: Nachname zu Initiale kürzen ("Max Mustermann" -> "Max M."); Einzelnamen bleiben.
function heftMaskName(name){ const p=String(name||"").trim().split(/\s+/); if(p.length<2)return p[0]||""; return p[0]+" "+p[p.length-1].charAt(0).toUpperCase()+"."; }
function heftBuildHtml(cfg,opts){
  opts=opts||{}; const mask=!!opts.mask; const nm=n=>mask?heftMaskName(n):n;
  const cards=heftKader.map((k,i)=>{
    const foto=heftFotos[i];
    const initialen=(k.name||"?").trim().slice(0,1).toUpperCase();
    const spitz=heftFanfacts[k.id];
    const pos=k.lieblingsposition?cardPosLabel(k.lieblingsposition):(k.tw?"Torwart":"");
    return `<div class="heft-card">
      <div class="heft-foto">${foto?`<img src="${foto}" alt="">`:`<span>${esc(initialen)}</span>`}${k.nr!=null?`<div class="heft-nr">${esc(k.nr)}</div>`:""}</div>
      <div class="heft-name">${esc(nm(k.name))}${k.tw?" 🥅":""}</div>
      ${spitz?`<div class="heft-spitz">„${esc(spitz)}"</div>`:""}
      ${pos?`<div class="heft-pos">${esc(pos)}</div>`:""}
    </div>`;
  }).join("");
  let spielHtml="";
  if(heftTermin){
    const tm=(typeof TM_META!=="undefined"&&TM_META[heftTermin.typ])||{icon:"⚽"};
    const d=new Date(heftTermin.datum+"T00:00:00");
    spielHtml=`<div class="heft-match">${tm.icon} Nächstes Spiel: ${esc(heftTermin.titel||heftTermin.gegner||"")} · ${d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}${heftTermin.uhrzeit?" · "+String(heftTermin.uhrzeit).slice(0,5)+" Uhr":""}${heftTermin.ort?" · "+esc(heftTermin.ort):""}</div>`;
  }
  const einl=cfg.einleitung&&cfg.einleitung.trim()?`<div class="heft-intro">${esc(cfg.einleitung).replace(/\n/g,"<br>")}</div>`:"";
  let fokusHtml="";
  if(cfg.fokusId){
    const idx=heftKader.findIndex(k=>String(k.id)===String(cfg.fokusId));
    if(idx>=0){
      const k=heftKader[idx], foto=heftFotos[idx];
      const initialen=(k.name||"?").trim().slice(0,1).toUpperCase();
      fokusHtml=`<div class="heft-fokus">
        <div class="heft-fokus-foto">${foto?`<img src="${foto}" alt="">`:`<span>${esc(initialen)}</span>`}</div>
        <div class="heft-fokus-body">
          <div class="heft-fokus-badge">⭐ Spieler im Fokus</div>
          <div class="heft-fokus-name">${esc(nm(k.name))}${k.nr!=null?` · #${esc(k.nr)}`:""}</div>
          ${cfg.fokusText&&cfg.fokusText.trim()?`<div class="heft-fokus-text">${esc(cfg.fokusText).replace(/\n/g,"<br>")}</div>`:""}
        </div></div>`;
    }
  }
  const komm=cfg.kommentar&&cfg.kommentar.trim()?`<div class="heft-komm"><div class="heft-komm-h">📣 Ein Wort vom Trainerteam</div><div>${esc(cfg.kommentar).replace(/\n/g,"<br>")}</div></div>`:"";
  return `<div class="heft-wrap">
    <div class="heft-head">
      <img src="logo.png" alt="SV Adler Dellbrück">
      <div class="heft-club">SV ADLER DELLBRÜCK e.V.</div>
      <div class="heft-title">${esc(cfg.titel||"Stadionheft U9")}</div>
      <div class="heft-club">Saison ${typeof saisonLabel==="function"?saisonLabel():""} · unsere Mannschaft</div>
    </div>
    ${spielHtml}
    ${einl}
    ${fokusHtml}
    <div class="heft-grid">${cards}</div>
    ${komm}
    <div class="heft-foot">Auf geht's, Adler! 🦅 · Trainerteam ${(typeof TRAINER!=="undefined"?TRAINER:["Sandy","Charles","Finn","Kenneth","Peter"]).join(" · ")}</div>
  </div>`;
}
async function stadionheftOpen(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  toast("📰 Stadionheft wird geladen…");
  heftKader=[];heftFanfacts={};heftTermin=null;heftFotos=[];
  try{const r=await fetch(`${SB_URL}/rest/v1/kader?select=id,name,nr,foto_path,lieblingsposition,tw,aktiv&order=nr.asc.nullslast`,{headers:sbAuthHeaders()});if(sbCheck401(r))return;if(r.ok)heftKader=(await r.json()).filter(k=>k.aktiv!==false);}catch(e){}
  if(!heftKader.length){toast("Kein Kader gefunden","err");return;}
  try{const r=await fetch(`${SB_URL}/rest/v1/kind_fanfacts?select=spieler_id,spitzname`,{headers:sbAuthHeaders()});if(r.ok)(await r.json()).forEach(f=>{if(f.spitzname)heftFanfacts[f.spieler_id]=f.spitzname;});}catch(e){}
  const heute=new Date().toISOString().slice(0,10);
  try{const r=await fetch(`${SB_URL}/rest/v1/termine?select=*&typ=in.(spiel,turnier)&datum=gte.${heute}&order=datum.asc&limit=1`,{headers:sbAuthHeaders()});if(r.ok)heftTermin=(await r.json())[0]||null;}catch(e){}
  heftFotos=await Promise.all(heftKader.map(k=>heftFotoDataUrl(k.foto_path)));
  heftCfgLoad();
  // HOTFIX 19 digital: Server-Stand ist die Quelle der Wahrheit (geräteübergreifend). Nur überschreiben, wenn eine Zeile existiert.
  try{
    const r=await fetch(`${SB_URL}/rest/v1/stadionheft?team=eq.adler1&select=*&limit=1`,{headers:sbAuthHeaders()});
    if(r.ok){const row=(await r.json())[0]; if(row){
      heftCfg.titel=row.titel||heftCfg.titel;
      heftCfg.einleitung=row.einleitung||"";
      heftCfg.fokusId=row.fokus_spieler_id!=null?String(row.fokus_spieler_id):"";
      heftCfg.fokusText=row.fokus_text||"";
      heftCfg.kommentar=row.kommentar||"";
      heftCfg.published=!!row.published;
      heftCfg._pubAt=row.updated_at;
    }}
  }catch(e){}
  heftRenderEditor();
}
function heftRenderEditor(){
  const old=document.getElementById("heft-modal");if(old)old.remove();
  const modal=document.createElement("div");
  modal.id="heft-modal";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;flex-direction:column;padding:12px;overflow-y:auto";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  const kaderOpts=`<option value="">— keiner —</option>`+heftKader.map(k=>`<option value="${esc(k.id)}"${String(heftCfg.fokusId)===String(k.id)?" selected":""}>${esc(k.name)}${k.nr!=null?" (#"+esc(k.nr)+")":""}</option>`).join("");
  const fld="width:100%;padding:8px 10px;border:var(--border-s);border-radius:10px;font-family:inherit;font-size:13px;background:var(--surface2);color:var(--text);box-sizing:border-box;resize:vertical";
  const card=document.createElement("div");
  card.style.cssText="background:var(--surface);color:var(--text);max-width:900px;width:100%;margin:auto;border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.4)";
  card.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><div style="font-weight:800;font-size:16px">📰 Stadionheft-Editor</div><span style="font-size:11px;color:var(--text2)">frei bearbeiten · Vorschau live · Texte werden gemerkt</span></div>
    <div style="display:grid;grid-template-columns:1fr;gap:16px">
      <div style="display:flex;flex-direction:column;gap:10px">
        <label style="font-size:11px;font-weight:700;color:var(--text2)">Titel
          <input id="heft-f-titel" type="text" value="${esc(heftCfg.titel||"")}" style="${fld};min-height:40px;font-size:14px"></label>
        <label style="font-size:11px;font-weight:700;color:var(--text2)">Einleitung / Grußwort
          <textarea id="heft-f-einl" rows="3" style="${fld}">${esc(heftCfg.einleitung||"")}</textarea></label>
        <label style="font-size:11px;font-weight:700;color:var(--text2)">⭐ Spieler im Fokus
          <select id="heft-f-fokus" style="${fld};min-height:40px;font-size:14px">${kaderOpts}</select></label>
        <label style="font-size:11px;font-weight:700;color:var(--text2)">Text zum Spieler im Fokus
          <textarea id="heft-f-fokustext" rows="2" style="${fld}">${esc(heftCfg.fokusText||"")}</textarea></label>
        <label style="font-size:11px;font-weight:700;color:var(--text2)">📣 Trainer-Kommentar
          <textarea id="heft-f-komm" rows="3" style="${fld}">${esc(heftCfg.kommentar||"")}</textarea></label>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px">Vorschau</div>
        <div id="heft-preview" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;max-height:60vh;overflow:auto"></div>
      </div>
    </div>
    <label style="display:flex;align-items:flex-start;gap:8px;margin-top:12px;padding:9px 11px;background:var(--surface2);border:var(--border-s);border-radius:10px;cursor:pointer">
      <input type="checkbox" id="heft-f-mask" ${heftCfg.mask?"checked":""} style="margin-top:2px;width:18px;height:18px;flex:0 0 auto">
      <span style="font-size:12px;color:var(--text)"><strong>🔒 Eltern-Version (Nachnamen maskiert)</strong><br><span style="font-size:11px;color:var(--text2)">DSGVO: Fürs Verteilen/Aushängen werden Nachnamen zu „Max M." gekürzt. Für die interne Trainer-Version aus lassen.</span></span>
    </label>
    <label style="display:flex;align-items:flex-start;gap:8px;margin-top:8px;padding:9px 11px;background:${heftCfg.published?"#dcfce7":"var(--surface2)"};border:var(--border-s);border-radius:10px;cursor:pointer">
      <input type="checkbox" id="heft-f-pub" ${heftCfg.published?"checked":""} style="margin-top:2px;width:18px;height:18px;flex:0 0 auto">
      <span style="font-size:12px;color:var(--text)"><strong>👨‍👩‍👧 Für Eltern veröffentlichen (digital)</strong><br><span style="font-size:11px;color:var(--text2)">Sichtbar im Eltern-Bereich. Namen erscheinen dort <b>immer maskiert</b>; Fotos nur bei Einwilligung.${heftCfg.published&&heftCfg._pubAt?" · zuletzt "+new Date(heftCfg._pubAt).toLocaleString("de-DE"):""}</span></span>
    </label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px">
      <button class="btn btn-p" onclick="heftSaveDb()"><i class="ti ti-device-floppy"></i>Speichern</button>
      <button class="btn btn-sm" onclick="heftPrintNow()"><i class="ti ti-printer"></i>Drucken</button>
      <button class="btn btn-sm" onclick="document.getElementById('heft-modal').remove()">Schließen</button>
    </div>`;
  modal.appendChild(card);
  document.body.appendChild(modal);
  const bind=(id,key)=>{const el=document.getElementById(id);if(el)el.oninput=()=>{heftCfg[key]=el.value;heftCfgSave();heftRenderPreview();};};
  bind("heft-f-titel","titel");bind("heft-f-einl","einleitung");bind("heft-f-fokustext","fokusText");bind("heft-f-komm","kommentar");
  const fokusEl=document.getElementById("heft-f-fokus");if(fokusEl)fokusEl.onchange=()=>{heftCfg.fokusId=fokusEl.value;heftCfgSave();heftRenderPreview();};
  const maskEl=document.getElementById("heft-f-mask");if(maskEl)maskEl.onchange=()=>{heftCfg.mask=maskEl.checked;heftCfgSave();heftRenderPreview();};
  const pubEl=document.getElementById("heft-f-pub");if(pubEl)pubEl.onchange=()=>{heftCfg.published=pubEl.checked;};
  heftRenderPreview();
}
// HOTFIX 19 digital: Editor-Inhalt in die stadionheft-Tabelle schreiben (+ Veröffentlichen-Status).
async function heftSaveDb(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  const payload={team:"adler1",titel:heftCfg.titel||"Stadionheft U9",einleitung:heftCfg.einleitung||"",fokus_spieler_id:heftCfg.fokusId?Number(heftCfg.fokusId):null,fokus_text:heftCfg.fokusText||"",kommentar:heftCfg.kommentar||"",published:!!heftCfg.published,updated_at:new Date().toISOString()};
  try{
    const r=await fetch(`${SB_URL}/rest/v1/stadionheft?on_conflict=team`,{method:"POST",headers:{...sbAuthHeaders(),'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(payload)});
    if(sbCheck401(r))return;
    if(!r.ok){toast("Speichern fehlgeschlagen ("+r.status+")","err");return;}
    heftCfg._pubAt=payload.updated_at; heftCfgSave();
    toast(heftCfg.published?"✅ Gespeichert & für Eltern veröffentlicht":"✅ Gespeichert (nicht veröffentlicht)");
    heftRenderEditor();
  }catch(e){ toast("Netzwerkfehler beim Speichern","err"); }
}
function heftRenderPreview(){ const box=document.getElementById("heft-preview"); if(box)box.innerHTML=heftBuildHtml(heftCfg,{mask:!!heftCfg.mask}); }
function heftPrintNow(){
  document.getElementById("heft-print").innerHTML=heftBuildHtml(heftCfg,{mask:!!heftCfg.mask});
  document.body.classList.add("printing-heft");
  const cleanup=()=>{document.body.classList.remove("printing-heft");window.removeEventListener("afterprint",cleanup);};
  window.addEventListener("afterprint",cleanup);
  setTimeout(cleanup,4000);
  window.print();
}
/* HOTFIX 19 digital: öffentliche Eltern-Ansicht des Stadionhefts (?heft). Ruft die
   Edge Function stadionheft-view – Namen kommen bereits maskiert, Fotos nur bei
   Einwilligung (sonst Initialen). Kein Login, keine Trainer-Daten. */
async function renderStadionheftView(){
  const root=document.createElement("div");
  root.style.cssText="max-width:460px;margin:0 auto;padding:16px;font-family:inherit;min-height:100vh;background:#f1f5f9";
  document.body.appendChild(root);
  root.innerHTML=(typeof elternLoader==="function")?elternLoader("Stadionheft wird geladen …"):'<div style="text-align:center;padding:48px;color:#64748b">Lade Stadionheft…</div>';
  let d=null;
  try{
    const r=await fetch(`${SB_URL}/functions/v1/stadionheft-view`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({team:"adler1"})});
    d=r.ok?await r.json():null;
  }catch(e){}
  if(!d||!d.published){
    root.innerHTML='<div style="text-align:center;padding:48px;color:#64748b"><img src="logo.png" style="width:56px;height:56px" alt=""><div style="margin-top:12px">Aktuell ist kein Stadionheft veröffentlicht.<br>Schau bald wieder rein! 🦅</div></div>';
    return;
  }
  const h=d.heft||{};
  const avatar=(sp,size)=>`<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#1a56db,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${Math.round(size*0.38)}px;font-weight:800">${sp.foto_url?`<img src="${sp.foto_url}" alt="" style="width:100%;height:100%;object-fit:cover">`:`<span>${elternEsc((sp.name||"?").slice(0,1).toUpperCase())}</span>`}</div>`;
  const cards=(d.spieler||[]).map(sp=>{
    const pos=sp.lieblingsposition?(typeof cardPosLabel==="function"?cardPosLabel(sp.lieblingsposition):sp.lieblingsposition):(sp.tw?"Torwart":"");
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px;text-align:center">
      <div style="width:64px;margin:0 auto 6px;position:relative">${avatar(sp,64)}${sp.nr!=null?`<div style="position:absolute;bottom:-2px;right:-2px;min-width:20px;height:20px;background:#facc15;color:#1e293b;border-radius:10px;border:2px solid #fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 3px">${elternEsc(sp.nr)}</div>`:""}</div>
      <div style="font-size:14px;font-weight:800;color:#1e293b">${elternEsc(sp.name)}${sp.tw?" 🥅":""}</div>
      ${sp.spitzname?`<div style="font-size:10.5px;color:#64748b;font-style:italic">„${elternEsc(sp.spitzname)}"</div>`:""}
      ${pos?`<div style="font-size:10.5px;color:#1a56db;font-weight:700">${elternEsc(pos)}</div>`:""}
    </div>`;
  }).join("");
  const fk=h.fokus;
  const fokusHtml=fk?`<div style="display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#fef9c3,#fef3c7);border:1px solid #fde047;border-radius:14px;padding:12px;margin-bottom:12px">
    <div style="flex:0 0 auto">${avatar(fk,66)}</div>
    <div><div style="font-size:10.5px;font-weight:800;color:#a16207;text-transform:uppercase;letter-spacing:.5px">⭐ Spieler im Fokus</div>
      <div style="font-size:16px;font-weight:900;color:#1e293b">${elternEsc(fk.name)}${fk.nr!=null?" · #"+elternEsc(fk.nr):""}</div>
      ${fk.text?`<div style="font-size:12px;color:#475569;margin-top:2px;line-height:1.4">${elternEsc(fk.text).replace(/\n/g,"<br>")}</div>`:""}</div></div>`:"";
  root.innerHTML=`<div class="elt-fade">
    <div style="text-align:center;margin:8px 0 14px">
      <img src="logo.png" style="width:56px;height:56px" alt="SV Adler Dellbrück">
      <div style="font-size:12px;color:#64748b;font-weight:600;letter-spacing:.5px">SV ADLER DELLBRÜCK e.V.</div>
      <div style="font-size:22px;font-weight:900;color:#1a56db;margin:2px 0">${elternEsc(h.titel||"Stadionheft U9")}</div>
    </div>
    ${h.einleitung?`<div style="background:#fff;border-left:3px solid #1a56db;border-radius:8px;padding:10px 12px;font-size:13px;color:#334155;line-height:1.5;margin-bottom:12px">${elternEsc(h.einleitung).replace(/\n/g,"<br>")}</div>`:""}
    ${fokusHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${cards}</div>
    ${h.kommentar?`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:11px 13px;margin-top:12px;font-size:12.5px;color:#1e3a8a;line-height:1.5"><div style="font-weight:800;margin-bottom:3px">📣 Ein Wort vom Trainerteam</div>${elternEsc(h.kommentar).replace(/\n/g,"<br>")}</div>`:""}
    <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">Auf geht's, Adler! 🦅 · SV Adler Dellbrück e.V.</div></div>`;
}
