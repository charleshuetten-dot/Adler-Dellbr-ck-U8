/* ═══════════════════════════════════
   EVENT-GALERIE (Welle 2, FEAT W) – FOTOS-ONLY (bewusste Kostenentscheidung).
   Teamweite Sicht ueber die security-definer-RPC termin_gallery (Minimaldaten).
   Fotos: privater Bucket 'termin_media' (5 MB, nur Bilder, Limit serverseitig).
   Trainer moderiert (Loeschrecht via authRole). Anzeige per Auth-Download + Blob.
═══════════════════════════════════ */
// F2: Fotofreigabe-Übersicht fürs Team – zeigt VOR dem Posten, wer freigegeben ist und wer
// NICHT erkennbar gezeigt werden darf. Quelle: spieler.foto_stadionheft_ok (die EINE Freigabe
// für „Adler Nest" + Team-Galerie). Nur sinnvoll im Trainer-Kontext (KADER geladen).
function fotoConsentBannerHtml(){
  const kids=(typeof KADER!=="undefined"?KADER:[]).filter(k=>k.aktiv!==false);
  if(!kids.length)return "";
  const ok=kids.filter(k=>k.foto_stadionheft_ok), no=kids.filter(k=>!k.foto_stadionheft_ok);
  const noNames=no.map(k=>esc(k.name)).join(", ");
  return `<div style="padding:10px;border-radius:10px;margin-bottom:12px;background:${no.length?"#fff7ed":"#f0fdf4"};border:1px solid ${no.length?"#fdba74":"#86efac"}">
    <div style="font-size:11.5px;font-weight:800;color:${no.length?"#9a3412":"#15803d"};margin-bottom:2px">📸 Fotofreigabe: ✅ ${ok.length} frei${no.length?` · ⛔ ${no.length} ohne`:""}</div>
    ${no.length?`<div style="font-size:11.5px;color:#9a3412">Bitte <b>nicht erkennbar</b> zeigen: ${noNames}</div>`:'<div style="font-size:11px;color:#15803d">Alle aktiven Kinder haben Freigabe. 👍</div>'}
    <div style="font-size:10px;color:var(--text3);margin-top:3px">Freigabe je Kind im Kader änderbar.</div>
  </div>`;
}
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
    ${fotoConsentBannerHtml()}
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

