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

