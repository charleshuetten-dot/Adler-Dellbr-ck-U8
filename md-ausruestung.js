/* ═══════════════════════════════════
   AUSRÜSTUNGS-EXPORT (Welle 2, FEAT U) – Trainer-CSV für Sammelbestellungen.
   Daten kommen ausschliesslich aus der security-definer-RPC ausruestung_export
   (Minimaldaten name/nr/groessen, trainer-only). CSV mit ; als Trenner + BOM,
   damit Excel Umlaute und Spalten korrekt oeffnet.
═══════════════════════════════════ */
// HOTFIX 18: In-App-Ausrüstungs-Manager statt CSV. Grid-View mit Trikot-/Schuhgrößen
// aller Spieler (Daten weiter aus der security-definer-RPC ausruestung_export).
async function ausruestungGrid(){
  if(!sbToken()){toast("Bitte als Trainer anmelden","err");return;}
  document.getElementById("ausr-modal")?.remove();
  const m=document.createElement("div");m.id="ausr-modal";
  m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto";
  m.onclick=e=>{if(e.target===m)m.remove();};
  m.innerHTML=`<div style="background:var(--surface);border-radius:var(--rl);padding:16px;max-width:460px;width:100%;margin:auto">
    ${mdlHead("ausr-modal","👕","Team-Ausrüstung","Bälle, Leibchen & Co. – wer hat was?","#1e3a8a")}
    <div id="ausr-body"><div style="text-align:center;padding:20px;color:var(--text3)">Lade…</div></div>
  </div>`;
  document.body.appendChild(m);
  ausruestungGridRender();
}
async function ausruestungGridRender(){
  const body=document.getElementById("ausr-body"); if(!body)return;
  let rows=[];
  try{
    const r=await fetch(`${SB_URL}/rest/v1/rpc/ausruestung_export`,{method:"POST",headers:sbAuthHeaders(),body:"{}"});
    if(sbCheck401(r))return;
    if(r.ok)rows=(await r.json())||[];
  }catch(e){}
  if(!rows.length){body.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Keine Kaderdaten gefunden.</div>';return;}
  const mitGroesse=rows.filter(r=>r.trikot_groesse||r.schuh_groesse).length;
  const cell=v=>v?esc(v):'<span style="color:var(--text3)">–</span>';
  body.innerHTML=`<div style="font-size:11px;color:var(--text3);margin-bottom:8px">${mitGroesse}/${rows.length} mit Größe · Eltern pflegen die Werte im Portal (Fan-Fakten &amp; Foto).</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="text-align:left;color:var(--text2);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px">
          <th style="padding:6px 8px">Nr</th><th style="padding:6px 8px">Name</th><th style="padding:6px 8px">👕 Trikot</th><th style="padding:6px 8px">👟 Schuh</th>
        </tr></thead>
        <tbody>${rows.map((r,i)=>`<tr style="border-top:1px solid var(--surface2);background:${i%2?'var(--surface2)':'transparent'}">
          <td style="padding:7px 8px;color:var(--text3)">${r.nr!=null?esc(r.nr):"–"}</td>
          <td style="padding:7px 8px;font-weight:600">${esc(r.name)}</td>
          <td style="padding:7px 8px">${cell(r.trikot_groesse)}</td>
          <td style="padding:7px 8px">${cell(r.schuh_groesse)}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
}

