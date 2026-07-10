/* ═══════════════════════════════════════════════════════════
   ADLER QUIZ LAYER (Modularisierung 6/8)
   Taktik-Quiz fuer die Kids: Szenarien-Renderer (TQ_BLOCKS),
   Fortschritt-Sync (quiz_progress, Anon-Key), Stickerheft,
   Team-Barometer, TTS-Vorlesen, Quiz-Konfetti, Haptik.
   Laedt nach views.js, vor dem Haupt-Skript. Top-Level:
   Progress-Load + TTS-Voice-Init (beide blockintern definiert).
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════
   TAKTIK-QUIZ
═══════════════════════════════════ */

const TQ_BLOCKS=[
  {name:"Grundlagen der Raute",icon:"ti-diamond"},
  {name:"ADLER & IGEL",icon:"ti-arrows-exchange"},
  {name:"Umschalten & Pressing",icon:"ti-bolt"},
  {name:"Spielaufbau",icon:"ti-arrow-up-right"},
  {name:"Flügel & Konter",icon:"ti-run"},
  {name:"Standards & Spielsituationen",icon:"ti-star"},
  {name:"Torwartspiel",icon:"ti-shield-check"},
  {name:"Ballbesitz & Geduld",icon:"ti-clock"},
  {name:"Verteidigen als Team",icon:"ti-shield"},
  {name:"Spielverständnis",icon:"ti-brain"}
];
const TQ_PROGRESS_KEY="adler_quiz_progress";
let tqActive=false,tqIdx=0,tqScore=0,tqTotal=0,tqChecked=false;
let tqBlock=-1,tqPlayer=null,tqPlayerRole="";
let tqScenarios=[];
let tqSelectedToken=null;
let tqCurrentOpps=[];

document.addEventListener("DOMContentLoaded",()=>{
  const field=document.getElementById("taktik-field");
  if(field)field.addEventListener("click",function(e){
    if(e.target.closest(".tb-token"))return; // B4: Click nach Token-Selektion (Maus) nicht als Feld-Tap werten
    if(!tqActive||!tqSelectedToken)return;
    const rect=field.getBoundingClientRect();
    const x=((e.clientX-rect.left)/rect.width)*100;
    const y=((e.clientY-rect.top)/rect.height)*100;
    const idx=parseInt(tqSelectedToken.dataset.idx);
    if(!isNaN(idx)&&tbField[idx]){
      tbField[idx].x=Math.max(3,Math.min(97,x));
      tbField[idx].y=Math.max(3,Math.min(97,y));
      tqSelectedToken.style.left=tbField[idx].x+"%";
      tqSelectedToken.style.top=tbField[idx].y+"%";
    }
    tqDeselectToken();
  });
});

// K2: Vibrations-Feedback (Feature-Detect, niemals blockierend)
function tqVibrate(pattern){
  try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(e){}
}

// K3: Konfetti ohne Paket (~25 Zeilen), respektiert prefers-reduced-motion
function confetti(container){
  if(!container)return;
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const farben=["#1a56db","#059669","#fbbf24","#f87171"];
  const n=40+Math.floor(Math.random()*21);
  for(let i=0;i<n;i++){
    const d=document.createElement("div");
    const dauer=1.5+Math.random();
    d.style.cssText=`position:absolute;top:0;left:${Math.random()*100}%;width:8px;height:8px;z-index:50;pointer-events:none;background:${farben[i%farben.length]};border-radius:${Math.random()<.5?"50%":"2px"};animation:tqConfetti ${dauer}s ease-in forwards;animation-delay:${Math.random()*.4}s`;
    container.appendChild(d);
    setTimeout(()=>d.remove(),(dauer+.5)*1000);
  }
}

// K6: Sticky Aufgaben-Chip über dem Feld
function tqChipSet(text){
  const field=document.getElementById("taktik-field");
  if(!field)return;
  let chip=document.getElementById("tq-task-chip");
  if(!chip){
    chip=document.createElement("div");
    chip.id="tq-task-chip";
    field.parentElement.insertBefore(chip,field);
  }
  chip.textContent=text;
}
function tqChipRemove(){document.getElementById("tq-task-chip")?.remove();}

// K1: einmaliges Einsteiger-Overlay
function tqShowTutorial(){
  if(localStorage.getItem("adler_quiz_tutorial_done"))return;
  const field=document.getElementById("taktik-field");
  if(!field||field.querySelector(".tq-tutorial"))return;
  const ov=document.createElement("div");
  ov.className="tq-tutorial";
  ov.innerHTML=`<div class="tut-hand">👆</div>
    <div class="tut-text">1. Tippe einen Spieler an<br>2. Tippe dahin, wo er hinlaufen soll</div>
    <button class="btn btn-p" style="min-height:48px;padding:12px 24px;font-size:14px">Los geht's!</button>`;
  ov.querySelector("button").onclick=()=>{
    try{localStorage.setItem("adler_quiz_tutorial_done","1");}catch(e){}
    ov.remove();
  };
  field.appendChild(ov);
}

function tqSelectToken(tok){
  if(tqSelectedToken===tok){tqDeselectToken();return;}
  tqDeselectToken();
  tqSelectedToken=tok;
  tok.style.boxShadow="0 0 0 3px #fff,0 0 0 6px var(--blue)";
  tok.style.transform="translate(-50%,-50%) scale(1.15)";
  tqVibrate(25); // K2
  const role=tbField[parseInt(tok.dataset.idx)]?.role||tok.dataset.player||"Spieler"; // K6
  const sc=tqScenarios&&tqScenarios[tqIdx];
  if(tqActive&&sc)tqChipSet(`▶ ${role} ausgewählt — tippe aufs Feld!`);
}
function tqDeselectToken(){
  if(tqSelectedToken){
    tqSelectedToken.style.boxShadow="";
    tqSelectedToken.style.transform="translate(-50%,-50%)";
    tqSelectedToken=null;
    const sc=tqScenarios&&tqScenarios[tqIdx]; // K6: zurück zum Task-Text
    if(tqActive&&sc)tqChipSet(`📋 ${sc.task}`);
  }
}

function tqGetProgress(){
  try{return JSON.parse(localStorage.getItem(TQ_PROGRESS_KEY)||"{}");}catch(e){return{};}
}
function tqSaveProgress(player,block,score,total){
  const p=tqGetProgress();
  if(!p[player])p[player]={};
  const prev=p[player][block];
  if(!prev||score>prev.score||(score===prev.score&&total<prev.total)){
    p[player][block]={score,total,date:new Date().toISOString().slice(0,10)};
  }
  localStorage.setItem(TQ_PROGRESS_KEY,JSON.stringify(p));
  tqSyncToSupabase(player,block,p[player][block]);
}
async function tqSyncToSupabase(player,block,data){
  try{
    await fetch(`${SB_URL}/rest/v1/quiz_progress?on_conflict=player,block`,{
      method:"POST",
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify({player,block,score:data.score,total:data.total,date:data.date})
    });
  }catch(e){console.log("Quiz sync failed",e);}
}
async function tqLoadProgressFromSupabase(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/quiz_progress?select=*`,{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    if(!r.ok)return;
    const rows=await r.json();
    if(!rows.length)return;
    const p=tqGetProgress();
    rows.forEach(row=>{
      if(!p[row.player])p[row.player]={};
      const prev=p[row.player][row.block];
      if(!prev||row.score>prev.score){
        p[row.player][row.block]={score:row.score,total:row.total,date:row.date};
      }
    });
    localStorage.setItem(TQ_PROGRESS_KEY,JSON.stringify(p));
  }catch(e){console.log("Quiz load from Supabase failed",e);}
}
tqLoadProgressFromSupabase();

function tqShareQuiz(){
  const url=appRoot()+"?quiz";
  const text="⚽ Adler U9 Taktik-Quiz – Teste dein Wissen über die Raute!\n"+url;
  if(navigator.share){
    navigator.share({title:"Adler U9 Taktik-Quiz",text:"Teste dein Wissen über die Raute!",url:url}).catch(()=>{});
  }else{
    const modal=document.createElement("div");
    modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center";
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    modal.innerHTML=`<div style="background:white;border-radius:12px;padding:20px;max-width:360px;width:90%;text-align:center">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px">Quiz teilen</div>
      <input type="text" value="${url}" readonly style="width:100%;padding:8px;border:var(--border-s);border-radius:6px;font-size:12px;margin-bottom:10px;text-align:center" onclick="this.select()">
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-p btn-sm" onclick="navigator.clipboard.writeText('${url}');toast('Link kopiert ✓');this.closest('div[style*=fixed]').remove()"><i class="ti ti-copy"></i>Kopieren</button>
        <a href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" class="btn btn-sm" style="background:#25D366;color:white;border-color:#25D366;text-decoration:none"><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>
        <a href="mailto:?subject=${encodeURIComponent("Adler U9 Taktik-Quiz")}&body=${encodeURIComponent(text)}" class="btn btn-sm" style="text-decoration:none"><i class="ti ti-mail"></i>E-Mail</a>
      </div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="margin-top:10px;background:none;border:none;cursor:pointer;font-size:11px;color:var(--text2)">Schließen</button>
    </div>`;
    document.body.appendChild(modal);
  }
}

function tqResetProgress(){
  const progress=tqGetProgress();
  const players=Object.keys(progress);
  if(!players.length){toast("Keine Ergebnisse vorhanden","err");return;}
  const modal=document.createElement("div");
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center";
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  modal.innerHTML=`<div style="background:white;border-radius:12px;padding:20px;max-width:340px;width:90%">
    <div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#dc2626">Quiz-Ergebnisse zurücksetzen</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Wähle welche Ergebnisse gelöscht werden sollen:</div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px">
      <label style="font-size:12px;display:flex;align-items:center;gap:6px"><input type="checkbox" value="__ALL__" class="tq-reset-cb"><strong>Alle Spieler</strong></label>
      ${players.map(p=>`<label style="font-size:12px;display:flex;align-items:center;gap:6px"><input type="checkbox" value="${p}" class="tq-reset-cb">${p}</label>`).join("")}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-sm" onclick="this.closest('div[style*=fixed]').remove()">Abbrechen</button>
      <button class="btn btn-sm" style="background:#dc2626;color:white;border-color:#dc2626" onclick="tqDoReset(this.closest('div[style*=fixed]'))"><i class="ti ti-trash"></i>Löschen</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

function tqDoReset(modal){
  const checks=modal.querySelectorAll(".tq-reset-cb:checked");
  if(!checks.length){toast("Niemand ausgewählt","err");return;}
  const p=tqGetProgress();
  const all=Array.from(checks).some(c=>c.value==="__ALL__");
  // Das loescht den muehsam erspielten Fortschritt der Kinder – und laesst sich nicht rueckgaengig machen.
  const wen=all?"ALLER Kinder":Array.from(checks).map(c=>c.value).join(", ");
  if(!confirm(`Quiz-Fortschritt wirklich löschen?

${wen}

Das kann nicht rückgängig gemacht werden. Bereits verdiente Adler-Federn bleiben erhalten.`))return;
  if(all){
    localStorage.removeItem(TQ_PROGRESS_KEY);
    fetch(`${SB_URL}/rest/v1/quiz_progress?player=neq.`,{method:"DELETE",headers:sbAuthHeaders()}).then(r=>sbCheck401(r)).catch(()=>{});
  }else{
    const names=Array.from(checks).map(c=>c.value);
    names.forEach(n=>{
      delete p[n];
      fetch(`${SB_URL}/rest/v1/quiz_progress?player=eq.${encodeURIComponent(n)}`,{method:"DELETE",headers:sbAuthHeaders()}).then(r=>sbCheck401(r)).catch(()=>{});
    });
    localStorage.setItem(TQ_PROGRESS_KEY,JSON.stringify(p));
  }
  modal.remove();
  tqRenderTrainerView();
  toast("Quiz-Ergebnisse zurückgesetzt ✓");
}

function tqRenderTrainerView(){
  const wrap=document.getElementById("tq-trainer-view");
  if(!wrap)return;
  const progress=tqGetProgress();
  const players=KADER.map(k=>k.name);
  if(!Object.keys(progress).length){
    wrap.innerHTML='<div style="color:var(--text2);font-size:12px;padding:8px">Noch keine Quiz-Ergebnisse vorhanden.</div>';
    return;
  }
  let html='<div style="overflow-x:auto"><table class="card" style="width:100%;border-collapse:collapse;font-size:11px">';
  html+='<tr style="background:var(--surface2);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2)">';
  html+='<td style="padding:6px 8px">Spieler</td>';
  TQ_BLOCKS.forEach((b,i)=>{html+=`<td style="padding:6px 4px;text-align:center;min-width:50px" title="${b.name}"><i class="${b.icon}" style="font-size:12px"></i><br>${i+1}</td>`;});
  html+='<td style="padding:6px 8px;text-align:center">Gesamt</td></tr>';
  players.forEach(name=>{
    const pp=progress[name]||{};
    let totalScore=0,totalQ=0;
    html+=`<tr style="border-top:var(--border)"><td style="padding:5px 8px;font-weight:600">${esc(name)}</td>`;
    TQ_BLOCKS.forEach((b,i)=>{
      const d=pp[i];
      if(d){
        const pct=Math.round(d.score/d.total*100);
        const col=pct>=80?"#16a34a":pct>=50?"#b45309":"#dc2626";
        const medaille=d.score>=9?" 🥇":d.score>=7?" 🥈":d.score>=5?" 🥉":""; // K4
        totalScore+=d.score;totalQ+=d.total;
        html+=`<td style="padding:5px 4px;text-align:center;color:${col};font-weight:700" title="${d.score}/${d.total} am ${d.date}">${pct}%${medaille}</td>`;
      }else{
        html+='<td style="padding:5px 4px;text-align:center;color:var(--text3)">–</td>';
      }
    });
    const totalPct=totalQ?Math.round(totalScore/totalQ*100):0;
    const totalCol=totalQ===0?"var(--text3)":totalPct>=80?"#16a34a":totalPct>=50?"#b45309":"#dc2626";
    html+=`<td style="padding:5px 8px;text-align:center;font-weight:700;color:${totalCol}">${totalQ?totalPct+"%":"–"}</td></tr>`;
  });
  html+='</table></div>';
  html+='<div style="font-size:10px;color:var(--text3);margin-top:6px">Hover über eine Zelle für Details. Block-Nummern: ';
  html+=TQ_BLOCKS.map((b,i)=>`${i+1}=${b.name}`).join(", ")+'</div>';
  wrap.innerHTML=html;
}

// Vorlese-Funktion (Web Speech API, nativ – keine Bibliothek). Hilft U9-Kindern, die
// die Szenario-Texte noch nicht flüssig lesen. Zweiter Tipp stoppt (Toggle).
// TTS-Stimmenauswahl: getVoices() ist async (erst nach voiceschanged befüllt) -> cachen,
// bevorzugt eine freundliche deutsche Stimme aus der Wunschliste, sonst sauberer Fallback.
let _ttsVoices=[];
function _loadTtsVoices(){ try{_ttsVoices=(window.speechSynthesis&&speechSynthesis.getVoices())||[];}catch(e){} }
if("speechSynthesis" in window){ _loadTtsVoices(); try{speechSynthesis.onvoiceschanged=_loadTtsVoices;}catch(e){} }
function ttsGermanVoice(){
  const vs=_ttsVoices.length?_ttsVoices:(("speechSynthesis" in window)?(speechSynthesis.getVoices()||[]):[]);
  const de=vs.filter(v=>/^de(-|_)/i.test(v.lang||""));
  const pref=["Google Deutsch","Anna","Petra","Helena","Markus","Yannick","Microsoft Katja","Microsoft Hedda"];
  for(const name of pref){ const m=de.find(v=>v.name&&v.name.includes(name)); if(m)return m; }
  return de[0]||null; // sonst irgendeine deutsche, sonst Default-Stimme
}
function tqSpeak(btn){
  if(!("speechSynthesis" in window)){toast("Vorlesen wird auf diesem Gerät nicht unterstützt");return;}
  if(speechSynthesis.speaking){speechSynthesis.cancel();if(btn)btn.textContent="🔊";return;}
  const sc=tqScenarios[tqIdx];
  if(!sc)return;
  const u=new SpeechSynthesisUtterance(tqPersonalize(sc.desc)+". "+sc.task);
  u.lang="de-DE";u.rate=.9;u.pitch=1.1; // freundlicher Klang für die Kids
  const v=ttsGermanVoice(); if(v)u.voice=v;
  u.onend=()=>{if(btn)btn.textContent="🔊";};
  if(btn)btn.textContent="⏹️";
  speechSynthesis.speak(u);
}

function tqPersonalize(text){
  if(!tqPlayer)return text;
  // J2: dir/Dir/dich NICHT ersetzen ("Merke es dir" darf nicht zu "Merke es Hugo" werden)
  // du/Du NICHT ersetzen: Verb bliebe unkonjugiert ("Wie nimmst du" -> "Wie nimmst Hugo" ist falsch,
  // korrekt wäre "nimmt"). "Dein" -> Name+"s" bleibt, das ist als Possessiv grammatisch unproblematisch.
  return text.replace(/\bDein\b/g,tqPlayer+"s");
}

function tqStart(){
  const panel=document.getElementById("tq-panel");
  panel.style.display="block";
  document.body.classList.remove("tq-playing"); // Auswahl: Feld ausblenden
  const extern=document.body.classList.contains("quiz-extern"); // im Kinder-Quiz gibt es kein "Schließen"
  const progress=tqGetProgress();
  const pp=tqPlayer?progress[tqPlayer]||{}:{};
  let html=`<div class="tq-panel">
    <div style="font-size:10px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">`;
  if(!tqPlayer){
    html+=`Wer bist du?</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">Wähle deinen Namen, damit wir deinen Fortschritt speichern können!</div>
      <div class="tq-player-grid">`;
    KADER.forEach(k=>{
      html+=`<div class="tq-player-btn" onclick="tqSelectPlayer('${k.name}')">
        <div class="tq-player-icon">⚽</div>
        <div class="tq-player-name">${esc(k.name)}</div>
        ${k.nr?`<div style="font-size:9px;color:var(--text3)">#${k.nr}</div>`:""}
      </div>`;
    });
    html+=`</div>${extern?"":'<button class="btn btn-sm" onclick="tqStop()" style="margin-top:8px"><i class="ti ti-x"></i>Abbrechen</button>'}`;
  } else {
    html+=`🧑 ${tqPlayer}${tqPlayerRole?" – "+tqPlayerRole:""}</div>
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px">Wähle ein Quiz!</div>`;
    html+=tqRenderTaktikLauncher(pp); // Taktik-Quiz hinter Button (aufgeräumt, wie das Wissensquiz)
    html+=wqRenderLauncher();         // Fußball-Wissensquiz
    html+=`<div id="tq-challenge"></div>`;
    if(!extern)html+=`<div style="display:flex;margin-top:10px">
        <button class="btn btn-sm" onclick="tqStop()" style="margin-left:auto"><i class="ti ti-x"></i>Schließen</button>
      </div>`;
  }
  html+=`</div>`;
  panel.innerHTML=html;
  if(tqPlayer)tqChallengeLoad(); // Wochen-Challenge im Spieler-Kontext nachladen
}
// Taktik-Quiz-Einstieg als Karte (wie wqRenderLauncher) – klappt die 10 Blöcke auf.
function tqRenderTaktikLauncher(pp){
  pp=pp||{};
  const done=TQ_BLOCKS.filter((b,i)=>pp[i]&&pp[i].score>=7).length, total=TQ_BLOCKS.length;
  const pct=Math.round(done/total*100);
  return `<div class="card" style="padding:0;margin-top:10px;overflow:hidden;cursor:pointer" onclick="tqBlocksShow()">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:12px 14px;color:#fff">
      <div style="font-size:14px;font-weight:800;margin-bottom:2px">🎯 Taktik-Quiz</div>
      <div style="font-size:11px;opacity:.95;margin-bottom:8px">Die Raute verstehen – ${total} Blöcke Spielverständnis</div>
      <div style="height:8px;background:rgba(255,255,255,.25);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#fbbf24;border-radius:4px;transition:width .4s"></div></div>
      <div style="font-size:10px;margin-top:5px;opacity:.9">${done}/${total} Blöcke gemeistert</div>
    </div>
  </div>`;
}
/* Gemeinsames Auswahl-Layout beider Quiz: Icon links, Titel, Fortschrittsbalken, ›.
   Taktik-Quiz und Fußball-Wissen sehen dadurch identisch aus. */
function quizChoiceCard(o){
  return `<div class="card" style="padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="${o.onclick}">
    <div style="font-size:26px;line-height:1;width:30px;text-align:center">${o.icon}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700;color:var(--text)">${o.titel}${o.fertig?" ✓":""}</div>
      <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;margin-top:5px"><div style="height:100%;width:${o.pct}%;background:${o.col};border-radius:3px"></div></div>
      <div style="font-size:10px;color:var(--text3);margin-top:3px">${o.sub}</div>
    </div>
    <div style="font-size:18px;color:var(--text3)">›</div>
  </div>`;
}
// Block-Auswahl des Taktik-Quiz (aus tqStart ausgelagert) inkl. Barometer + Sticker-Heft.
function tqBlocksShow(){
  if(!tqPlayer){tqStart();return;}
  const panel=document.getElementById("tq-panel"); panel.style.display="block";
  document.body.classList.remove("tq-playing"); // Block-Auswahl: Feld ausblenden
  const pp=(tqGetProgress()[tqPlayer])||{};
  let html=`<div class="tq-panel">
    <div style="font-size:10px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">🎯 Taktik-Quiz · ${esc(tqPlayer)}</div>
    <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:2px">Wähle einen Block!</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Jeder Block hat 10 Fragen. Dein Fortschritt wird gespeichert.</div>
    <div style="display:flex;flex-direction:column;gap:8px">`;
  TQ_BLOCKS.forEach((b,i)=>{
    const bp=pp[i];
    const pct=bp?Math.round(bp.score/bp.total*100):0;
    const medaille=bp?(bp.score>=9?" 🥇":bp.score>=7?" 🥈":bp.score>=5?" 🥉":""):"";
    html+=quizChoiceCard({
      icon:`<i class="ti ${b.icon}" style="color:var(--purple)"></i>`,
      titel:`${b.name}${medaille}`, fertig:!!(bp&&bp.score>=7), pct, col:"var(--purple)",
      sub:`Block ${i+1}${bp?" · "+bp.score+"/"+bp.total+" richtig":" · 10 Fragen"}`,
      onclick:`tqStartBlock(${i})`
    });
  });
  html+=`</div>`;
  html+=tqRenderBarometer();
  html+=tqRenderStickers(pp);
  html+=`<button class="btn btn-sm" style="margin-top:12px" onclick="tqStart()"><i class="ti ti-arrow-left"></i>Zurück zur Quiz-Auswahl</button>`;
  html+=`</div>`;
  panel.innerHTML=html;
}
// Wochen-Challenge im Quiz: aktive Aufgabe anzeigen + "Geschafft" -> Federn fürs gewählte Kind.
async function tqChallengeLoad(){
  const box=document.getElementById("tq-challenge"); if(!box||!tqPlayer)return;
  let ch=null;
  try{const r=await fetch(`${SB_URL}/rest/v1/wochen_challenge?aktiv=eq.true&select=id,text&order=created_at.desc&limit=1`,{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});if(r.ok)ch=(await r.json())[0];}catch(e){}
  if(!ch){box.innerHTML="";return;}
  box.innerHTML=`<div style="background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:var(--rl);padding:12px;margin-top:10px;color:#fff">
    <div style="font-size:12px;font-weight:800;margin-bottom:4px">🏆 Wochen-Challenge</div>
    <div style="font-size:13px;line-height:1.4;margin-bottom:10px">${esc(ch.text)}</div>
    <button onclick="wcDone(${ch.id},this)" style="width:100%;min-height:44px;border:none;border-radius:10px;background:#fbbf24;color:#1e293b;font-family:inherit;font-weight:800;font-size:13.5px;cursor:pointer">✅ Geschafft! (+${XP_ICON} 20 ${XP_LABEL})</button>
  </div>`;
}
async function wcDone(challengeId,btn){
  if(!tqPlayer){toast("Erst Spieler wählen","err");return;}
  if(btn)btn.disabled=true;
  try{
    const d=await xpAwardByName(tqPlayer,"challenge","wc"+challengeId);
    if(d>0){ toast(`🏆 Challenge geschafft – ${XP_ICON} +${d} ${XP_LABEL} für ${tqPlayer}!`); try{navigator.vibrate&&navigator.vibrate([40,60,40,60,120]);}catch(e){} if(typeof confetti==="function")confetti(document.getElementById("tq-panel")||document.body); if(btn){btn.textContent="✅ Erledigt – super!";btn.style.background="#22c55e";btn.style.color="#fff";} }
    else { toast(tqPlayer+" hat diese Challenge schon geschafft 👍"); if(btn)btn.textContent="✅ Schon erledigt"; }
  }catch(e){ toast("Hat nicht geklappt (online & angemeldet?)","err"); if(btn)btn.disabled=false; }
}
// Adler-Stickerheft: pro gemeistertem Block (>=7) ein farbiger Sticker, sonst ausgegraut
const TQ_STICKERS=["💎","🦅","⚡","🎯","🏃","🥅","🛡️","👟","🧠","🔥"];
function tqRenderStickers(pp){
  pp=pp||{};
  const items=TQ_BLOCKS.map((b,i)=>{
    const bp=pp[i];
    const gold=bp&&bp.score>=9, done=bp&&bp.score>=7;
    const emo=TQ_STICKERS[i]||"⭐";
    const style=done?"":"filter:grayscale(100%);opacity:.35";
    return `<div style="text-align:center">
      <div style="font-size:30px;line-height:1.1;${style}">${emo}</div>
      <div style="font-size:8px;color:var(--text3);line-height:1.1;margin-top:2px">${done?(gold?"🥇 ":"")+esc(b.name.split(" ")[0]):"?"}</div>
    </div>`;
  }).join("");
  const geschafft=TQ_BLOCKS.filter((b,i)=>pp[i]&&pp[i].score>=7).length;
  return `<div class="card" style="padding:10px 12px;margin-top:10px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--purple);margin-bottom:8px">🏅 Dein Sticker-Heft (${geschafft}/${TQ_BLOCKS.length})</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${items}</div>
  </div>`;
}
// Kooperatives Team-Barometer: Summe aller gelösten Aufgaben des Teams -> gemeinsames Ziel
function tqRenderBarometer(){
  const prog=tqGetProgress();
  let solved=0;
  Object.values(prog).forEach(p=>Object.values(p).forEach(bp=>{solved+=bp.score||0;}));
  const step=50;
  const ziel=Math.max(step,Math.ceil((solved+1)/step)*step);
  const pct=Math.round(solved/ziel*100);
  const rest=ziel-solved;
  return `<div style="background:linear-gradient(135deg,#065f46,#059669);border-radius:var(--rl);padding:12px;margin-top:10px;color:#fff">
    <div style="font-size:12px;font-weight:700;margin-bottom:6px">🎯 Team-Ziel: gemeinsam ${ziel} Aufgaben lösen!</div>
    <div style="height:12px;background:rgba(255,255,255,.25);border-radius:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#fbbf24;border-radius:6px;transition:width .4s"></div></div>
    <div style="font-size:11px;margin-top:6px;opacity:.95">${solved} geschafft · noch ${rest} bis zum nächsten Ziel 🎉</div>
  </div>`;
}

function tqSelectPlayer(name){
  tqPlayer=name;
  const snaps=typeof DB!=="undefined"&&DB[name];
  if(snaps&&snaps.length){
    const lat=snaps[snaps.length-1];
    tqPlayerRole=lat.prim_rolle||lat.position||"";
  }else{tqPlayerRole="";}
  const mode=window._quizMode; window._quizMode=null; // aus der Kabine direkt ins gewählte Quiz
  if(mode==="taktik"){tqBlocksShow();return;}
  if(mode==="wissen"){wqStart();return;}
  tqStart();
}

function tqStartBlock(block){
  tqBlock=block;
  const start=block*10,end=Math.min(start+10,TQ_SCENARIOS.length);
  tqScenarios=TQ_SCENARIOS.slice(start,end);
  tqActive=true;tqIdx=0;tqScore=0;tqTotal=0;tqChecked=false;
  document.getElementById("taktik-field")?.classList.add("quiz-mode");
  tqLoadScenario(0);
  tqShowTutorial(); // K1: nur beim allerersten Mal pro Gerät
}

function tqStop(){
  if("speechSynthesis" in window)speechSynthesis.cancel();
  tbCancelActiveDrags(); // Cleanup-Fix
  document.body.classList.remove("tq-playing");
  tqActive=false;tqBlock=-1;tqCurrentOpps=[];
  tqChipRemove(); // K6
  document.getElementById("taktik-field")?.classList.remove("quiz-mode");
  if(document.body.classList.contains("quiz-extern")){
    tqStart();return;
  }
  document.getElementById("tq-panel").style.display="none";
  taktikReset("adler");
}

function tqLoadScenario(idx){
  const sc=tqScenarios[idx];
  if(!sc){tqShowResult();return;}
  document.body.classList.add("tq-playing"); // Taktikfeld einblenden (Szenario aktiv)
  const panel=document.getElementById("tq-panel");
  panel.style.display="block";
  const pName=tqPlayer||"Du";
  panel.innerHTML=`
    <div class="tq-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:10px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.5px">${TQ_BLOCKS[tqBlock]?.name||"Quiz"} · ${idx+1}/${tqScenarios.length}</div>
        <div class="tq-score">⭐ ${tqScore}/${tqTotal}</div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div class="tq-situation" style="flex:1">${sc.title}</div>
        <button onclick="tqSpeak(this)" title="Vorlesen" aria-label="Aufgabe vorlesen" style="flex:none;min-width:44px;min-height:44px;border:var(--border-s);border-radius:var(--r);background:var(--surface);font-size:20px;cursor:pointer">🔊</button>
      </div>
      <div class="tq-hint">${tqPersonalize(sc.desc)}</div>
      <div class="tq-task">📋 ${esc(pName)}, ${sc.task.charAt(0).toLowerCase()+sc.task.slice(1)}</div>
      <div style="font-size:10px;color:var(--text3);margin-top:4px">💡 ${sc.hint}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px;line-height:1.5">👆 Tippe Spieler an, dann tippe aufs Feld um ihn zu bewegen</div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn btn-p btn-sm" onclick="tqCheck()"><i class="ti ti-check"></i>Prüfen</button>
        <button class="btn btn-sm" id="tq-skip-btn" onclick="tqSkip()">Überspringen</button>
        <button class="btn btn-sm" onclick="tqStop()" style="margin-left:auto"><i class="ti ti-x"></i></button>
      </div>
      <div id="tq-feedback"></div>
    </div>`;

  tbField=sc.start.map(s=>({name:s.name,x:s.x,y:s.y,cls:s.cls,role:s.role,locked:s.locked||false}));
  tbBall={x:sc.ball.from.x,y:sc.ball.from.y};
  tbBench=[];
  tqChipSet(`📋 ${sc.task}`); // K6: Aufgabe bleibt beim Scrollen sichtbar
  tqCurrentOpps=sc.opps||[]; // B2: VOR taktikRender setzen, sonst rendert es die Gegner des vorherigen Szenarios
  taktikRender();

  const tokensEl=document.getElementById("taktik-tokens");
  const fieldEl=document.getElementById("taktik-field");

  if(sc.opps){
    // B2: Gegner sind bereits von taktikRender gerendert – hier nur noch Einlauf-Animation
    const oppEls=tokensEl.querySelectorAll(".tb-opp");
    sc.opps.forEach((o,oi)=>{
      const el=oppEls[oi];
      if(!el||!o.to)return;
      el.style.left=o.x+"%";el.style.top=o.y+"%";
      el.style.setProperty("--sfx",o.x+"%");el.style.setProperty("--sfy",o.y+"%");
      el.style.setProperty("--stx",o.to.x+"%");el.style.setProperty("--sty",o.to.y+"%");
      el.classList.add("tq-anim-tok");
      el.addEventListener("animationend",()=>{el.style.left=o.to.x+"%";el.style.top=o.to.y+"%";el.classList.remove("tq-anim-tok");},{once:true});
    });
  }

  const ballEl=tokensEl.querySelector(".tb-ball");
  if(ballEl&&(sc.ball.from.x!==sc.ball.to.x||sc.ball.from.y!==sc.ball.to.y)){
    ballEl.style.setProperty("--bfx",sc.ball.from.x+"%");
    ballEl.style.setProperty("--bfy",sc.ball.from.y+"%");
    ballEl.style.setProperty("--btx",sc.ball.to.x+"%");
    ballEl.style.setProperty("--bty",sc.ball.to.y+"%");
    ballEl.classList.add("tq-anim-ball");
    ballEl.addEventListener("animationend",()=>{
      ballEl.style.left=sc.ball.to.x+"%";ballEl.style.top=sc.ball.to.y+"%";
      ballEl.classList.remove("tq-anim-ball");
      tbBall.x=sc.ball.to.x;tbBall.y=sc.ball.to.y;
    },{once:true});
  }

  if(sc.anim){
    sc.anim.forEach(a=>{
      const pi=sc.start.findIndex(s=>s.role===a.role);
      if(pi<0)return;
      const t=tokensEl.querySelectorAll(".tb-token:not(.tb-opp)")[pi];
      if(!t)return;
      t.style.setProperty("--sfx",sc.start[pi].x+"%");
      t.style.setProperty("--sfy",sc.start[pi].y+"%");
      t.style.setProperty("--stx",a.to.x+"%");
      t.style.setProperty("--sty",a.to.y+"%");
      t.classList.add("tq-anim-tok");
      t.addEventListener("animationend",()=>{
        t.style.left=a.to.x+"%";t.style.top=a.to.y+"%";
        tbField[pi].x=a.to.x;tbField[pi].y=a.to.y;
        t.classList.remove("tq-anim-tok");
      },{once:true});
    });
  }
}

function tqCheck(){
  const sc=tqScenarios[tqIdx];
  if(!sc)return;
  const targets=sc.targets;
  let hits=0,total=Object.keys(targets).length;
  const details=[];

  Object.entries(targets).forEach(([role,tgt])=>{
    const player=tbField.find(p=>p.role===role);
    if(!player){details.push({role,ok:false});return;}
    const alts=Array.isArray(tgt)?tgt:[tgt];
    const ok=alts.some(t=>{const d=Math.sqrt((player.x-t.x)**2+(player.y-t.y)**2);return d<=t.r;});
    if(ok)hits++;
    details.push({role,ok});
  });

  if(tqChecked)return;
  tqChecked=true;tqTotal++;
  const fb=document.getElementById("tq-feedback");
  const cheers=["🎉 MEGA!","🔥 STARK!","💪 KLASSE!","⚡ BOOM!","🌟 SUPER!","🚀 WOW!","🦅 ADLER!"];
  const encourages=["Schau dir die Lösung an! 💡","So geht's richtig! 👀","Lern-Chance! 📚","Merke es dir für nächstes Mal! 🧠"];
  if(hits===total){
    tqScore++;
    tqVibrate([40,60,40]); // K2
    tqRewardAnimation(sc); // K7: Tokens gleiten ins perfekte Rautenbild
    const cheer=cheers[Math.floor(Math.random()*cheers.length)];
    fb.innerHTML=`<div class="tq-feedback correct" style="text-align:center"><div style="font-size:28px;margin-bottom:4px">${cheer}</div><strong>Richtig!</strong> ${hits}/${total} Positionen korrekt!<br>${sc.explain.correct}</div>`;
  } else if(hits>0){
    // C6: Teil-Treffer bekommen wärmeres Partial-Feedback statt komplett rot
    tqVibrate(80); // K2
    fb.innerHTML=`<div class="tq-feedback partial"><div style="font-size:20px;margin-bottom:4px">💪 Fast!</div><strong>${hits}/${total} richtig.</strong><br>${sc.explain.wrong}</div>`;
    tqShowSolution(sc);
  } else {
    tqVibrate(80); // K2
    const enc=encourages[Math.floor(Math.random()*encourages.length)];
    fb.innerHTML=`<div class="tq-feedback wrong"><div style="font-size:20px;margin-bottom:4px">${enc}</div><strong>${hits}/${total} richtig.</strong><br>${sc.explain.wrong}</div>`;
    tqShowSolution(sc);
  }
  fb.innerHTML+=`<button class="btn btn-p btn-sm" style="margin-top:8px" onclick="tqNext()"><i class="ti ti-arrow-right"></i>Weiter</button>`;
  const checkBtn=document.querySelector('#tq-panel button[onclick="tqCheck()"]');
  if(checkBtn){checkBtn.disabled=true;checkBtn.style.opacity=".4";checkBtn.style.pointerEvents="none";}
  const skipBtn=document.getElementById("tq-skip-btn"); // B3: Überspringen nach Prüfen ebenfalls sperren
  if(skipBtn){skipBtn.disabled=true;skipBtn.style.opacity=".4";skipBtn.style.pointerEvents="none";}
}

// K7: bei voll richtig gleiten die Ziel-Tokens sanft in die exakten Zielzentren, danach Puls
function tqRewardAnimation(sc){
  const tokensEl=document.getElementById("taktik-tokens");
  if(!tokensEl)return;
  Object.entries(sc.targets).forEach(([role,tgt])=>{
    const idx=tbField.findIndex(p=>p.role===role);
    if(idx<0)return;
    const p=tbField[idx];
    const alts=Array.isArray(tgt)?tgt:[tgt];
    let best=alts[0],bd=Infinity; // nächstgelegene Alternative
    alts.forEach(t=>{const d=(p.x-t.x)**2+(p.y-t.y)**2;if(d<bd){bd=d;best=t;}});
    const tok=tokensEl.querySelector(`.tb-token[data-idx="${idx}"]`);
    if(!tok)return;
    tok.style.transition="left .5s ease-out,top .5s ease-out";
    tok.style.left=best.x+"%";tok.style.top=best.y+"%";
    p.x=best.x;p.y=best.y;
    tok.addEventListener("transitionend",()=>{tok.style.transition="";},{once:true});
  });
  setTimeout(()=>{
    tokensEl.querySelectorAll(".tb-token").forEach(t=>{
      t.classList.add("tq-pulse");
      t.addEventListener("animationend",()=>t.classList.remove("tq-pulse"),{once:true});
    });
  },550);
}

function tqShowSolution(sc){
  const tokensEl=document.getElementById("taktik-tokens");
  if(!tokensEl)return;
  Object.entries(sc.targets).forEach(([role,tgt])=>{
    const alts=Array.isArray(tgt)?tgt:[tgt]; // C7: alle Alternativen zeigen – erste voll, weitere halbtransparent
    alts.forEach((t,ai)=>{
      const marker=document.createElement("div");
      marker.style.cssText=`position:absolute;z-index:7;left:${t.x}%;top:${t.y}%;transform:translate(-50%,-50%);width:${t.r*2.2}%;aspect-ratio:1;border-radius:50%;border:3px dashed #22c55e;background:rgba(34,197,94,.15);pointer-events:none;display:flex;align-items:center;justify-content:center;opacity:${ai===0?1:.5}`;
      marker.innerHTML=`<span style="font-size:7px;font-weight:700;color:#15803d;text-align:center;line-height:1.2">${role}${ai>0?" (auch ok)":""}</span>`;
      tokensEl.appendChild(marker);
    });
  });
}

function tqSkip(){
  if(tqChecked){tqNext();return;} // B3: nach "Prüfen" nicht doppelt zählen
  tqTotal++;
  tqNext();
}

function tqNext(){
  if("speechSynthesis" in window)speechSynthesis.cancel(); // Vorlesen des alten Szenarios stoppen
  tbCancelActiveDrags(); // falls noch ein Finger mitten im Drag ist (Cleanup-Fix)
  tqIdx++;tqChecked=false;
  if(tqIdx>=tqScenarios.length){tqShowResult();return;}
  tqLoadScenario(tqIdx);
}

function tqShowResult(){
  document.body.classList.remove("tq-playing"); // Ergebnis: Feld ausblenden
  if(tqPlayer&&tqBlock>=0)tqSaveProgress(tqPlayer,tqBlock,tqScore,tqTotal);
  const panel=document.getElementById("tq-panel");
  const pct=tqTotal?Math.round(tqScore/tqTotal*100):0;
  const pName=tqPlayer||"Du";
  const resultMsg=pct>=80?{emoji:"🏆🦅🏆",title:"TAKTIK-PROFI!",sub:pName+" versteht die Raute – das war stark!"}:pct>=60?{emoji:"🌟⚽🌟",title:"RICHTIG GUT!",sub:pName+" ist auf dem besten Weg zum Taktik-Profi!"}:pct>=40?{emoji:"💪⚡💪",title:"GUTER START!",sub:pName+" wird immer besser – einfach weiter üben!"}:{emoji:"🦅🔥🦅",title:"WEITER SO!",sub:"Jeder Adler fängt mal klein an – "+pName+" schafft das!"};
  const medaille=tqScore>=9?"🥇":tqScore>=7?"🥈":tqScore>=5?"🥉":""; // K4
  panel.innerHTML=`
    <div class="tq-panel" id="tq-result-panel" style="text-align:center;position:relative;overflow:hidden">
      <div style="font-size:36px;margin-bottom:4px">${resultMsg.emoji}</div>
      <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px">${medaille?medaille+" ":""}${resultMsg.title}</div>
      <div style="font-size:16px;font-weight:600;color:var(--text)">${tqScore} von ${tqTotal} richtig!</div>
      <div style="font-size:13px;color:var(--text2);margin:4px 0 12px">${resultMsg.sub}</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-p btn-sm" onclick="tqStartBlock(${tqBlock})"><i class="ti ti-refresh"></i>Nochmal</button>
        <button class="btn btn-sm" onclick="tqStart()"><i class="ti ti-layout-grid"></i>Andere Blöcke</button>
        <button class="btn btn-sm" onclick="tqStop()">Beenden</button>
      </div>
    </div>`;
  tqVibrate([30,50,30,50,120]); // K2: Blockabschluss
  if(pct>=70)confetti(document.getElementById("tq-result-panel")); // K3
  tqChipRemove(); // K6
  // FEAT S: Quiz-XP – greift nur, wenn auf dem Gerät eine Eltern-/Trainer-Session liegt
  // (anon = stiller No-Op). Server kappt auf 1 Gutschrift pro Kind und Tag.
  if(tqPlayer)xpAwardByName(tqPlayer,"quiz").then(d=>{if(d>0)setTimeout(()=>toast(`${XP_ICON} +${d} ${XP_LABEL} für ${tqPlayer}!`),1400);}).catch(()=>{});
  if(!document.body.classList.contains("quiz-extern"))taktikReset("adler");
}

/* ═══════════════════════════════════
   FUSSBALL-WISSENSQUIZ (kindgerecht, U9)
   Kuratierte Fragenbank (keine KI → immer korrekt, offline, gratis). Vier Kategorien:
   WM/EM · Bundesliga-Legenden · Regeln · Adler-Wissen. Multiple-Choice, Optionen werden
   pro Frage gemischt. Federn-Vergabe: quelle="wissensquiz", quelle_id=Frage-ID → der Server
   schreibt pro Frage GENAU EINMAL gut (idempotent). Dadurch KEIN Tages-Zwang und kein
   Farmen: Nachschub nur, wenn wir neue Fragen ergänzen. Läuft anonym (localStorage-Fortschritt);
   Federn nur, wenn eine Eltern-/Trainer-Session auf dem Gerät liegt (sonst stiller No-Op).
   WICHTIG: Frage-IDs sind stabil und dürfen NIE umbenannt werden (sonst Doppel-Gutschrift).
═══════════════════════════════════ */
const WQ_CATS=[
  {key:"wm",      name:"WM & EM",        icon:"🏆", col:"#f59e0b"},
  {key:"bl",      name:"Bundesliga",     icon:"⚽", col:"#16a34a"},
  {key:"legenden",name:"Legenden",       icon:"👑", col:"#b45309"},
  {key:"stars",   name:"Aktuelle Stars", icon:"🌟", col:"#eab308"},
  {key:"kurios",  name:"Lustige Momente",icon:"😄", col:"#ec4899"},
  {key:"wappen",  name:"Wappen & Farben",icon:"🛡️", col:"#0891b2"},
  {key:"woerter", name:"Fußball-Wörter", icon:"📖", col:"#0d9488"},
  {key:"fairplay",name:"Fair Play",      icon:"🤝", col:"#22c55e"},
  {key:"regeln",  name:"Regeln",         icon:"📏", col:"#2563eb"},
  {key:"adler",   name:"Adler-Wissen",   icon:"🦅", col:"#7c3aed"}
];
// correct = Index in opts (Anzeige wird gemischt). fun = kindgerechter Fakt nach der Antwort.
const WQ_QUESTIONS=[
  // ── WM & EM ──
  {id:"wm_wm2014",cat:"wm",q:"Wer wurde 2014 Fußball-Weltmeister?",opts:["Deutschland 🇩🇪","Brasilien 🇧🇷","Spanien 🇪🇸","Frankreich 🇫🇷"],correct:0,fun:"Deutschland gewann 2014 in Brasilien – zum 4. Mal!"},
  {id:"wm_alle4",cat:"wm",q:"Wie oft findet die Fußball-WM statt?",opts:["Jedes Jahr","Alle 2 Jahre","Alle 4 Jahre","Alle 10 Jahre"],correct:2,fun:"Nur alle 4 Jahre – deshalb ist sie so besonders!"},
  {id:"wm_sterne",cat:"wm",q:"Wie viele Sterne hat Deutschland über dem Trikot-Wappen?",opts:["1","2","4","6"],correct:2,fun:"4 Sterne für 4 WM-Titel: 1954, 1974, 1990 und 2014."},
  {id:"wm_emkont",cat:"wm",q:"Bei der EM spielen Länder aus welchem Erdteil?",opts:["Europa","Afrika","Asien","Amerika"],correct:0,fun:"EM heißt Europameisterschaft – nur europäische Länder."},
  {id:"wm_pokal",cat:"wm",q:"Welche Farbe hat der WM-Pokal?",opts:["Gold","Silber","Bronze","Blau"],correct:0,fun:"Der WM-Pokal glänzt golden!"},
  {id:"wm_2014land",cat:"wm",q:"In welchem Land war die WM 2014?",opts:["Brasilien 🇧🇷","Deutschland","England","Japan"],correct:0,fun:"2014 wurde in Brasilien gespielt – und Deutschland gewann dort."},
  {id:"wm_pokalheld",cat:"wm",q:"Wer darf am Ende den Pokal in die Höhe halten?",opts:["Die Sieger-Mannschaft","Der Schiedsrichter","Die Zuschauer","Der Busfahrer"],correct:0,fun:"Die Weltmeister feiern gemeinsam mit dem Pokal!"},
  // ── Bundesliga (evergreen) ──
  {id:"bl_hoechste",cat:"bl",q:"Wie heißt die höchste Fußball-Liga in Deutschland?",opts:["Bundesliga","Kreisliga","Weltliga","Stadtliga"],correct:0,fun:"Die Bundesliga – dort spielen die besten deutschen Teams."},
  {id:"bl_bvbstadt",cat:"bl",q:"In welcher Stadt spielt Borussia Dortmund?",opts:["Dortmund","Hamburg","Stuttgart","Bremen"],correct:0,fun:"Borussia Dortmund – kurz BVB – kommt aus Dortmund."},
  {id:"bl_bvbfarben",cat:"bl",q:"Welche Farben hat Borussia Dortmund?",opts:["Schwarz-Gelb","Rot-Weiß","Blau-Weiß","Grün-Weiß"],correct:0,fun:"Schwarz-Gelb – deshalb heißen sie 'die Schwarzgelben'."},
  {id:"bl_bayernstadt",cat:"bl",q:"In welcher Stadt spielt der FC Bayern?",opts:["München","Berlin","Köln","Leipzig"],correct:0,fun:"Der FC Bayern kommt aus München."},
  {id:"bl_koelntier",cat:"bl",q:"Welches Tier ist das Maskottchen vom 1. FC Köln?",opts:["Ein Geißbock 🐐","Ein Löwe 🦁","Ein Bär 🐻","Ein Adler 🦅"],correct:0,fun:"Der Geißbock 'Hennes' ist das Maskottchen des 1. FC Köln."},
  {id:"bl_anzahl",cat:"bl",q:"Wie viele Mannschaften spielen in der Bundesliga?",opts:["18","10","24","30"],correct:0,fun:"18 Teams spielen jede Saison um die Meisterschale."},
  {id:"bl_schale",cat:"bl",q:"Welche Farbe hat die Meisterschale (Pokal für den Bundesliga-Sieger)?",opts:["Silber","Gold","Grün","Schwarz"],correct:0,fun:"Die Meisterschale ist silbern und schon über 100 Jahre alt."},
  {id:"bl_koelnstadt",cat:"bl",q:"Welcher große Verein spielt bei uns in der Nähe, in Köln?",opts:["1. FC Köln","FC Bayern","Schalke 04","Hertha BSC"],correct:0,fun:"Der 1. FC Köln spielt in unserer Stadt Köln!"},
  // ── Regeln ──
  {id:"reg_elf",cat:"regeln",q:"Wie viele Spieler stehen bei den Großen pro Team auf dem Feld?",opts:["11","7","9","15"],correct:0,fun:"11 Spieler pro Team – einer davon ist der Torwart."},
  {id:"reg_dauer",cat:"regeln",q:"Wie lange dauert ein Profi-Spiel insgesamt?",opts:["90 Minuten","30 Minuten","60 Minuten","120 Minuten"],correct:0,fun:"2 × 45 Minuten = 90 Minuten."},
  {id:"reg_hand",cat:"regeln",q:"Wer darf den Ball mit der Hand fangen?",opts:["Der Torwart","Jeder Spieler","Der Trainer","Niemand"],correct:0,fun:"Nur der Torwart darf im Strafraum die Hände nehmen."},
  {id:"reg_rot",cat:"regeln",q:"Welche Karte bedeutet: Der Spieler muss vom Platz?",opts:["Rote Karte 🟥","Gelbe Karte 🟨","Grüne Karte 🟩","Blaue Karte 🟦"],correct:0,fun:"Rote Karte = raus! Gelb ist nur eine Warnung."},
  {id:"reg_einwurf",cat:"regeln",q:"Der Ball rollt über die Seitenlinie. Was gibt es?",opts:["Einwurf","Elfmeter","Tor","Ecke"],correct:0,fun:"Einwurf – mit beiden Händen über dem Kopf."},
  {id:"reg_elfmeter",cat:"regeln",q:"Was gibt der Schiedsrichter bei einem Foul im Strafraum?",opts:["Elfmeter","Einwurf","Anstoß","Abstoß"],correct:0,fun:"Elfmeter – ein Schuss allein gegen den Torwart."},
  {id:"reg_ecke",cat:"regeln",q:"Ein Verteidiger schießt den Ball über die eigene Torauslinie. Was gibt es?",opts:["Eckball","Einwurf","Elfmeter","Freistoß"],correct:0,fun:"Eckball – aus der Ecke wird geflankt."},
  {id:"reg_pfeife",cat:"regeln",q:"Womit gibt der Schiedsrichter seine Signale?",opts:["Mit einer Pfeife","Mit einer Trommel","Mit einem Handy","Mit einer Hupe"],correct:0,fun:"Die Pfeife – und die Assistenten winken mit Fahnen."},
  // ── Adler-Wissen (Verein) ──
  {id:"ad_verein",cat:"adler",q:"Wie heißt unser Verein?",opts:["SV Adler Dellbrück","FC Bayern","1. FC Köln","Adler Mannheim"],correct:0,fun:"Wir sind der SV Adler Dellbrück – unser Team! 🦅"},
  {id:"ad_tier",cat:"adler",q:"Welches Tier ist unser Wappentier?",opts:["Der Adler 🦅","Der Löwe 🦁","Der Bär 🐻","Der Tiger 🐯"],correct:0,fun:"Der Adler – stark, schnell und fliegt hoch hinaus!"},
  {id:"ad_stadtteil",cat:"adler",q:"In welchem Kölner Stadtteil spielen wir?",opts:["Dellbrück","Ehrenfeld","Nippes","Chorweiler"],correct:0,fun:"Dellbrück – das steckt sogar in unserem Namen!"},
  {id:"ad_federn",cat:"adler",q:"Was sammelt ihr in der App für gute Sachen?",opts:["Adler-Federn 🪶","Sterne","Münzen","Diamanten"],correct:0,fun:"Adler-Federn! Je mehr du sammelst, desto cooler deine Karte."},
  {id:"ad_gewinnen",cat:"adler",q:"Wie viele Tore braucht man, um ein Spiel zu gewinnen?",opts:["Mehr als der Gegner","Immer genau 10","Genau 3","Gar keine"],correct:0,fun:"Ein Tor mehr als der Gegner reicht zum Sieg – und Spaß gehört immer dazu!"},
  {id:"ad_team",cat:"adler",q:"Was ist beim Fußball am allerwichtigsten?",opts:["Als Team zusammenspielen","Alleine dribbeln","Am lautesten schreien","Der teuerste Schuh"],correct:0,fun:"Teamwork! Zusammen sind wir Adler am stärksten. 🦅"},
  // ── WM & EM (Auffüllung auf 20; opts[0]=richtig, wird beim Rendern gemischt) ──
  {id:"wm_gastgeber2006",cat:"wm",q:"In welchem Land war die WM 2006, das „Sommermärchen\"?",opts:["Deutschland","Italien","Brasilien","Spanien"],correct:0,fun:"2006 in Deutschland – alle nannten es das „Sommermärchen\"."},
  {id:"wm_klose",cat:"wm",q:"Welcher deutsche Spieler schoss die meisten WM-Tore aller Zeiten?",opts:["Miroslav Klose","Thomas Müller","Lukas Podolski","Mario Götze"],correct:0,fun:"Miroslav Klose hält mit 16 Toren den WM-Rekord."},
  {id:"wm_goetze2014",cat:"wm",q:"Wer schoss das Siegtor im WM-Finale 2014?",opts:["Mario Götze","Thomas Müller","Toni Kroos","Manuel Neuer"],correct:0,fun:"Mario Götze traf in der Verlängerung zum 1:0-Sieg."},
  {id:"wm_7_1",cat:"wm",q:"Wie hoch gewann Deutschland 2014 im Halbfinale gegen Brasilien?",opts:["7:1","3:0","2:1","4:4"],correct:0,fun:"Das legendäre 7:1 gegen Gastgeber Brasilien!"},
  {id:"wm_argentinien2022",cat:"wm",q:"Welches Land wurde 2022 Weltmeister?",opts:["Argentinien 🇦🇷","Frankreich 🇫🇷","Deutschland","Brasilien"],correct:0,fun:"Argentinien gewann 2022 nach einem großen Finale."},
  {id:"wm_messi_wm",cat:"wm",q:"Wer führte Argentinien 2022 zum WM-Titel?",opts:["Lionel Messi","Diego Maradona","Neymar","Kylian Mbappé"],correct:0,fun:"Lionel Messi krönte sich 2022 endlich zum Weltmeister."},
  {id:"wm_frauen2003",cat:"wm",q:"Wie oft wurden die deutschen Frauen schon Fußball-Weltmeister?",opts:["2 Mal","5 Mal","noch nie","10 Mal"],correct:0,fun:"Die DFB-Frauen gewannen die WM 2003 und 2007."},
  {id:"wm_kontinent",cat:"wm",q:"Bei der WM spielen Länder aus …?",opts:["der ganzen Welt","nur Europa","nur Deutschland","nur Südamerika"],correct:0,fun:"Weltmeisterschaft = Teams aus aller Welt."},
  {id:"wm_finaledauer",cat:"wm",q:"Wie lange kann ein WM-Finale mit Verlängerung dauern?",opts:["120 Minuten","90 Minuten","60 Minuten","150 Minuten"],correct:0,fun:"Mit Verlängerung sind es 120 Minuten – dann kommt das Elfmeterschießen."},
  {id:"wm_elfmeterschiessen",cat:"wm",q:"Was passiert im Finale, wenn nach der Verlängerung kein Sieger feststeht?",opts:["Elfmeterschießen","Neues Spiel","Beide gewinnen","Münzwurf"],correct:0,fun:"Dann entscheidet das Elfmeterschießen – Nerven wie Drahtseile!"},
  {id:"wm_2018",cat:"wm",q:"In welchem Land war die WM 2018?",opts:["Russland","Katar","Brasilien","Frankreich"],correct:0,fun:"2018 in Russland – Frankreich wurde dort Weltmeister."},
  {id:"wm_1954",cat:"wm",q:"Wie heißt Deutschlands berühmter WM-Sieg von 1954?",opts:["Das Wunder von Bern","Das Sommermärchen","Die Nacht von Sevilla","Das Maracanã"],correct:0,fun:"1954 gewann Deutschland überraschend – das „Wunder von Bern\"."},
  {id:"wm_erste",cat:"wm",q:"Wo fand die allererste Fußball-WM (1930) statt?",opts:["Uruguay","Deutschland","England","Brasilien"],correct:0,fun:"Die erste WM war 1930 in Uruguay – die gewannen sie auch gleich."},
  // ── Bundesliga (Auffüllung auf 20) ──
  {id:"bl_bayernfarbe",cat:"bl",q:"In welcher Farbe spielt der FC Bayern zuhause?",opts:["Rot","Blau","Grün","Gelb"],correct:0,fun:"Bayern in Rot – „die Roten\"."},
  {id:"bl_rekordmeister",cat:"bl",q:"Welcher Verein wurde am häufigsten Deutscher Meister?",opts:["FC Bayern München","Borussia Dortmund","1. FC Köln","Hamburger SV"],correct:0,fun:"Der FC Bayern ist mit Abstand Rekordmeister."},
  {id:"bl_schalkestadt",cat:"bl",q:"In welcher Stadt spielt Schalke 04?",opts:["Gelsenkirchen","Dortmund","Essen","Bochum"],correct:0,fun:"Schalke 04 kommt aus Gelsenkirchen."},
  {id:"bl_derby",cat:"bl",q:"Das „Revierderby\" ist das Spiel zwischen Dortmund und …?",opts:["Schalke 04","FC Bayern","Werder Bremen","VfB Stuttgart"],correct:0,fun:"Dortmund gegen Schalke – das hitzige Revierderby!"},
  {id:"bl_absteiger",cat:"bl",q:"Was passiert mit den letzten Mannschaften der Bundesliga am Saisonende?",opts:["Sie steigen ab","Sie werden Meister","Nichts","Sie bekommen einen Pokal"],correct:0,fun:"Die Schlechtesten steigen in die 2. Bundesliga ab."},
  {id:"bl_zweite",cat:"bl",q:"Wie heißt die Liga direkt unter der Bundesliga?",opts:["2. Bundesliga","Kreisliga","Champions League","Weltliga"],correct:0,fun:"Die 2. Bundesliga – von dort steigt man auf."},
  {id:"bl_spieltage",cat:"bl",q:"Wie oft spielt in der Bundesliga jedes Team gegen jedes?",opts:["2 Mal (Hin- und Rückspiel)","1 Mal","5 Mal","gar nicht"],correct:0,fun:"Hin- und Rückspiel – einmal zuhause, einmal auswärts."},
  {id:"bl_werderstadt",cat:"bl",q:"In welcher Stadt spielt Werder Bremen?",opts:["Bremen","Hamburg","Hannover","Berlin"],correct:0,fun:"Werder Bremen kommt aus Bremen."},
  {id:"bl_hsvstadt",cat:"bl",q:"In welcher Stadt spielt der Hamburger SV?",opts:["Hamburg","München","Köln","Leipzig"],correct:0,fun:"Der HSV kommt aus Hamburg."},
  {id:"bl_leipzigstadt",cat:"bl",q:"In welcher Stadt spielt RB Leipzig?",opts:["Leipzig","Dresden","Berlin","Wolfsburg"],correct:0,fun:"RB Leipzig kommt aus Leipzig."},
  {id:"bl_punktesieg",cat:"bl",q:"Wie viele Punkte gibt es in der Bundesliga für einen Sieg?",opts:["3 Punkte","1 Punkt","2 Punkte","5 Punkte"],correct:0,fun:"3 Punkte für den Sieg, 1 fürs Unentschieden."},
  {id:"bl_torjaegerkanone",cat:"bl",q:"Wie heißt der Preis für den besten Bundesliga-Torschützen?",opts:["Die Torjägerkanone","Der Goldene Ball","Die Meisterschale","Der Silberschuh"],correct:0,fun:"Die „Torjägerkanone\" für die meisten Tore einer Saison."},
  // ── Legenden (evergreen, alle dauerhaft) ──
  {id:"leg_beckenbauer",cat:"legenden",q:"Franz Beckenbauer wurde „Der …\" genannt?",opts:["Kaiser","König","Bomber","Zauberer"],correct:0,fun:"Franz Beckenbauer – „Der Kaiser\", deutsche Legende."},
  {id:"leg_bomber",cat:"legenden",q:"Wie nannte man den Torjäger Gerd Müller?",opts:["Der Bomber","Der Kaiser","Der Blitz","Die Mauer"],correct:0,fun:"Gerd Müller – „Der Bomber der Nation\"."},
  {id:"leg_pele",cat:"legenden",q:"Aus welchem Land kommt die Legende Pelé?",opts:["Brasilien 🇧🇷","Argentinien","Deutschland","Portugal"],correct:0,fun:"Pelé aus Brasilien gewann sogar 3 Weltmeisterschaften."},
  {id:"leg_maradona",cat:"legenden",q:"Aus welchem Land kommt Diego Maradona?",opts:["Argentinien 🇦🇷","Brasilien","Spanien","Italien"],correct:0,fun:"Diego Maradona führte Argentinien 1986 zum WM-Titel."},
  {id:"leg_cruyff",cat:"legenden",q:"Johan Cruyff war eine Legende aus welchem Land?",opts:["Niederlande 🇳🇱","Deutschland","England","Frankreich"],correct:0,fun:"Johan Cruyff – nach ihm ist sogar ein berühmter Trick benannt."},
  {id:"leg_kahn",cat:"legenden",q:"Oliver Kahn war ein berühmter deutscher …?",opts:["Torwart","Stürmer","Trainer","Schiedsrichter"],correct:0,fun:"Oliver Kahn – „der Titan\" im Tor."},
  {id:"leg_matthaeus",cat:"legenden",q:"Bei wie vielen Weltmeisterschaften spielte Lothar Matthäus – Rekord?",opts:["5","1","3","10"],correct:0,fun:"Lothar Matthäus stand bei 5 Weltmeisterschaften auf dem Platz!"},
  {id:"leg_ronaldo_br",cat:"legenden",q:"Der Brasilianer Ronaldo (Weltmeister 2002) war ein berühmter …?",opts:["Stürmer","Torwart","Trainer","Schiedsrichter"],correct:0,fun:"Ronaldo aus Brasilien war einer der besten Stürmer aller Zeiten."},
  {id:"leg_zidane",cat:"legenden",q:"Zinédine Zidane wurde mit Frankreich 1998 …?",opts:["Weltmeister","Absteiger","Torwart","Schiedsrichter"],correct:0,fun:"Zidane führte Frankreich 1998 zum WM-Titel."},
  {id:"leg_beckham",cat:"legenden",q:"Wofür war David Beckham besonders berühmt?",opts:["Seine Freistöße","Seine Paraden","Seine Grätschen","Seine Einwürfe"],correct:0,fun:"David Beckham (England) trat traumhafte Freistöße."},
  {id:"leg_seeler",cat:"legenden",q:"Uwe Seeler war die Legende von welchem Verein?",opts:["Hamburger SV","FC Bayern","1. FC Köln","Schalke 04"],correct:0,fun:"Uwe Seeler – die treue Legende des HSV."},
  {id:"leg_lahm",cat:"legenden",q:"Philipp Lahm hob 2014 als Kapitän was in die Höhe?",opts:["Den WM-Pokal","Die Meisterschale","Einen Ballon","Die Torjägerkanone"],correct:0,fun:"Philipp Lahm war 2014 der Weltmeister-Kapitän."},
  {id:"leg_podolski",cat:"legenden",q:"Für welchen Verein schlägt das Herz von Lukas „Poldi\" Podolski?",opts:["1. FC Köln","FC Bayern","Schalke 04","Dortmund"],correct:0,fun:"Lukas Podolski liebt den 1. FC Köln – seine Heimat."},
  {id:"leg_schweinsteiger",cat:"legenden",q:"Bastian „Schweini\" Schweinsteiger wurde 2014 mit Deutschland …?",opts:["Weltmeister","Torwart","Trainer","Absteiger"],correct:0,fun:"„Schweini\" war einer der Helden von 2014."},
  {id:"leg_maier",cat:"legenden",q:"Sepp Maier war ein legendärer deutscher …?",opts:["Torwart","Stürmer","Verteidiger","Trainer"],correct:0,fun:"Sepp Maier – „die Katze von Anzing\" im Tor."},
  {id:"leg_goldenerball",cat:"legenden",q:"Der Preis für den besten Spieler der Welt heißt …?",opts:["Goldener Ball (Ballon d'Or)","Goldener Schuh","Silberball","Weltpokal"],correct:0,fun:"Der „Ballon d'Or\" kürt jedes Jahr den Weltfußballer."},
  {id:"leg_ronaldinho",cat:"legenden",q:"Der Brasilianer Ronaldinho war berühmt für …?",opts:["Tricks und sein Lachen","Paraden","Grätschen","Kopfbälle"],correct:0,fun:"Ronaldinho zauberte mit Tricks und lachte dabei immer."},
  {id:"leg_gerdbayern",cat:"legenden",q:"Für welchen Verein ist Gerd Müller Rekordtorschütze?",opts:["FC Bayern München","1. FC Köln","HSV","Schalke 04"],correct:0,fun:"Gerd Müller schoss unfassbar viele Tore für den FC Bayern."},
  {id:"leg_ballack",cat:"legenden",q:"Welche Rückennummer trug Michael Ballack meist bei Deutschland?",opts:["Die 13","Die 1","Die 99","Die 7"],correct:0,fun:"Michael Ballack, der Spielmacher mit der Nummer 13."},
  {id:"leg_walter",cat:"legenden",q:"Fritz Walter war Kapitän beim „Wunder von Bern\" – in welchem Jahr?",opts:["1954","1974","1990","2014"],correct:0,fun:"Fritz Walter führte 1954 zum ersten deutschen WM-Titel."},
  // ── Aktuelle Stars (BEWUSST nur dauerhafte Fakten: Nation/Position/Trait) ──
  {id:"star_messi_land",cat:"stars",q:"Aus welchem Land kommt Lionel Messi?",opts:["Argentinien 🇦🇷","Brasilien","Portugal","Spanien"],correct:0,fun:"Lionel Messi ist Argentinier – Weltmeister 2022."},
  {id:"star_ronaldo_land",cat:"stars",q:"Aus welchem Land kommt Cristiano Ronaldo?",opts:["Portugal 🇵🇹","Brasilien","Spanien","Argentinien"],correct:0,fun:"Cristiano Ronaldo kommt aus Portugal."},
  {id:"star_mbappe_land",cat:"stars",q:"Aus welchem Land kommt Kylian Mbappé?",opts:["Frankreich 🇫🇷","England","Belgien","Brasilien"],correct:0,fun:"Kylian Mbappé ist Franzose und Weltmeister 2018."},
  {id:"star_haaland_land",cat:"stars",q:"Aus welchem Land kommt Erling Haaland?",opts:["Norwegen 🇳🇴","Schweden","Dänemark","Island"],correct:0,fun:"Erling Haaland aus Norwegen – eine echte Tor-Maschine."},
  {id:"star_haaland_pos",cat:"stars",q:"Auf welcher Position spielt Erling Haaland?",opts:["Stürmer","Torwart","Innenverteidiger","Schiedsrichter"],correct:0,fun:"Haaland ist ein Mittelstürmer, der ständig trifft."},
  {id:"star_neuer_pos",cat:"stars",q:"Auf welcher Position spielt Manuel Neuer?",opts:["Torwart","Stürmer","Flügel","Trainer"],correct:0,fun:"Manuel Neuer ist einer der besten Torhüter der Welt."},
  {id:"star_neuer_land",cat:"stars",q:"Für welches Land spielt Manuel Neuer?",opts:["Deutschland 🇩🇪","Österreich","Schweiz","Niederlande"],correct:0,fun:"Manuel Neuer war 2014 Deutschlands Weltmeister-Torwart."},
  {id:"star_musiala_land",cat:"stars",q:"Für welche Nationalmannschaft spielt Jamal Musiala?",opts:["Deutschland","Spanien","Brasilien","Italien"],correct:0,fun:"Jamal Musiala ist ein großes deutsches Talent."},
  {id:"star_wirtz_land",cat:"stars",q:"Für welches Land spielt Florian Wirtz?",opts:["Deutschland","Frankreich","England","Spanien"],correct:0,fun:"Florian Wirtz ist ein deutsches Riesentalent im Mittelfeld."},
  {id:"star_kane_land",cat:"stars",q:"Aus welchem Land kommt Torjäger Harry Kane?",opts:["England 🏴","Deutschland","Irland","Wales"],correct:0,fun:"Harry Kane ist Englands Kapitän und Rekordtorschütze."},
  {id:"star_kane_pos",cat:"stars",q:"Auf welcher Position spielt Harry Kane?",opts:["Stürmer","Torwart","Verteidiger","Schiedsrichter"],correct:0,fun:"Harry Kane ist ein klassischer Mittelstürmer."},
  {id:"star_bellingham_land",cat:"stars",q:"Für welches Land spielt Jude Bellingham?",opts:["England 🏴","Frankreich","Deutschland","Spanien"],correct:0,fun:"Jude Bellingham ist ein englischer Mittelfeldstar."},
  {id:"star_vinicius_land",cat:"stars",q:"Aus welchem Land kommt Vinícius Júnior?",opts:["Brasilien 🇧🇷","Portugal","Argentinien","Frankreich"],correct:0,fun:"Vinícius Júnior ist ein brasilianischer Flügelflitzer."},
  {id:"star_messi_trait",cat:"stars",q:"Wofür ist Lionel Messi besonders berühmt?",opts:["Dribbeln und Tore","Weite Abschläge","Elfmeter-Paraden","Einwürfe"],correct:0,fun:"Messi dribbelt und trifft wie kaum ein anderer."},
  {id:"star_ronaldo_trait",cat:"stars",q:"Worin ist Cristiano Ronaldo besonders stark?",opts:["Kopfball und Sprungkraft","Torwartspiel","Einwerfen","Pfeifen"],correct:0,fun:"Ronaldo springt extrem hoch – ideal für Kopfbälle."},
  {id:"star_mbappe_trait",cat:"stars",q:"Was macht Kylian Mbappé so gefährlich?",opts:["Seine Schnelligkeit","Seine Abschläge","Seine Paraden","Sein Einwurf"],correct:0,fun:"Mbappé ist blitzschnell – kaum einzuholen."},
  {id:"star_sane_land",cat:"stars",q:"Für welche Nationalmannschaft spielt Leroy Sané?",opts:["Deutschland","Frankreich","Ghana","England"],correct:0,fun:"Leroy Sané ist ein schneller deutscher Flügelspieler."},
  {id:"star_pedri_land",cat:"stars",q:"Für welches Land spielt Pedri?",opts:["Spanien 🇪🇸","Portugal","Italien","Brasilien"],correct:0,fun:"Pedri ist ein spanisches Mittelfeld-Juwel."},
  {id:"star_yamal_land",cat:"stars",q:"Der junge Star Lamine Yamal spielt für welches Land?",opts:["Spanien 🇪🇸","Frankreich","Marokko","Brasilien"],correct:0,fun:"Lamine Yamal wurde ganz jung spanischer Nationalspieler."},
  {id:"star_griezmann_land",cat:"stars",q:"Für welches Land spielt Antoine Griezmann?",opts:["Frankreich 🇫🇷","Spanien","Belgien","Portugal"],correct:0,fun:"Antoine Griezmann wurde 2018 mit Frankreich Weltmeister."},
  // ── Lustige Momente / Kurioses (echte Fakten) ──
  {id:"kur_eigentor",cat:"kurios",q:"Wie nennt man es, wenn man aus Versehen ins eigene Tor trifft?",opts:["Eigentor","Supertor","Doppeltor","Fehltor"],correct:0,fun:"Ein „Eigentor\" zählt für die andere Mannschaft – autsch!"},
  {id:"kur_nachspiel",cat:"kurios",q:"Was gibt der Schiri am Ende oft zu den 90 Minuten dazu?",opts:["Nachspielzeit","Pausenzeit","Extrazeit für Fans","Nichts"],correct:0,fun:"In der Nachspielzeit fallen oft noch wichtige Tore!"},
  {id:"kur_ballmaterial",cat:"kurios",q:"Woraus ist ein moderner Fußball meistens?",opts:["Kunststoff/Leder","Glas","Holz","Stein"],correct:0,fun:"Heute meist Kunststoff – leicht und wasserfest."},
  {id:"kur_maracana",cat:"kurios",q:"Das riesige Maracanã-Stadion steht in welchem Land?",opts:["Brasilien 🇧🇷","Deutschland","Spanien","Japan"],correct:0,fun:"Ins Maracanã passten früher fast 200.000 Fans!"},
  {id:"kur_wembley",cat:"kurios",q:"Das berühmte Wembley-Stadion steht in welcher Stadt?",opts:["London","Paris","Rom","Madrid"],correct:0,fun:"Wembley in London – mit einem riesigen Bogen über dem Dach."},
  {id:"kur_vuvuzela",cat:"kurios",q:"Wie hieß das laute Tröten-Instrument bei der WM 2010 in Südafrika?",opts:["Vuvuzela","Trompete","Tuba","Pfeife"],correct:0,fun:"Die Vuvuzela summte wie ein riesiger Bienenschwarm!"},
  {id:"kur_handgottes",cat:"kurios",q:"Maradonas berühmtes Hand-Tor von 1986 heißt …?",opts:["Die Hand Gottes","Der Fuß des Teufels","Das Wunder-Tor","Das Glückstor"],correct:0,fun:"Die „Hand Gottes\" – der Schiri sah das Handspiel einfach nicht."},
  {id:"kur_trikottausch",cat:"kurios",q:"Was tauschen Spieler nach dem Spiel oft als Zeichen des Respekts?",opts:["Trikots","Schuhe","Bälle","Handschuhe"],correct:0,fun:"Trikottausch – eine nette Geste zum Schluss."},
  {id:"kur_panenka",cat:"kurios",q:"Ein frech in die Mitte gehobener Elfmeter heißt …?",opts:["Panenka","Bananenschuss","Grätsche","Kopfball"],correct:0,fun:"Der „Panenka\" – benannt nach Antonín Panenka, der ihn erfand."},
  {id:"kur_fallrueckzieher",cat:"kurios",q:"Wie heißt der akrobatische Schuss nach hinten über den eigenen Kopf?",opts:["Fallrückzieher","Panenka","Hackentor","Kopfball"],correct:0,fun:"Der Fallrückzieher – spektakulär und wunderschön!"},
  {id:"kur_bananenflanke",cat:"kurios",q:"Ein Ball, der sich in der Luft krümmt, fliegt als …?",opts:["Bananenflanke","Geradeaus-Ball","Rückpass","Abstoß"],correct:0,fun:"Die „Bananenflanke\" dreht sich in einer Kurve."},
  {id:"kur_blitztor",cat:"kurios",q:"Ein Tor gleich in der ersten Minute nennt man …?",opts:["Blitztor","Nachttor","Spättor","Zaubertor"],correct:0,fun:"Ein „Blitztor\" überrascht alle ganz früh im Spiel."},
  {id:"kur_twtor",cat:"kurios",q:"Warum läuft ein Torwart in der Schlussminute manchmal mit nach vorne?",opts:["Um bei einer Ecke ein Tor zu köpfen","Um sich auszuruhen","Um zu jubeln","Aus Versehen"],correct:0,fun:"Manchmal köpfen Torhüter bei Ecken sogar den Ausgleich!"},
  {id:"kur_goldenerschuh",cat:"kurios",q:"Der Preis für Europas besten Torschützen heißt Goldener …?",opts:["Schuh","Ball","Pokal","Stern"],correct:0,fun:"Der „Goldene Schuh\" für die meisten Liga-Tore Europas."},
  {id:"kur_maskottchen",cat:"kurios",q:"Was begleitet große Turniere und knuddelt mit den Fans?",opts:["Ein Maskottchen","Ein Gespenst","Ein Roboter","Ein Auto"],correct:0,fun:"Jede WM hat ein eigenes lustiges Maskottchen."},
  {id:"kur_laola",cat:"kurios",q:"Wie heißt die Welle, die Fans mit den Armen durchs Stadion schicken?",opts:["La-Ola-Welle","Fan-Sturm","Jubel-Kette","Arm-Tanz"],correct:0,fun:"Die „La-Ola-Welle\" läuft einmal rund ums Stadion!"},
  {id:"kur_konfetti",cat:"kurios",q:"Was regnet oft vom Himmel, wenn ein Team Meister wird?",opts:["Konfetti","Schnee","Sand","Bälle"],correct:0,fun:"Konfetti, Jubel und Pokal – so feiert der Meister!"},
  {id:"kur_dusche",cat:"kurios",q:"Womit überschütten Spieler ihren Trainer gern beim Titel-Jubel?",opts:["Mit einer kalten Getränkedusche","Mit Sand","Mit Konfetti-Kanonen","Mit Luftballons"],correct:0,fun:"Die berühmte eiskalte Getränkedusche für den Trainer!"},
  {id:"kur_rasen",cat:"kurios",q:"Worauf spielen Profis meistens?",opts:["Auf echtem Rasen","Auf Sand","Auf Eis","Auf Beton"],correct:0,fun:"Profi-Rasen wird gepflegt wie ein Garten – sattgrün und kurz."},
  {id:"kur_nummer1",cat:"kurios",q:"Welche Rückennummer trägt traditionell der Torwart?",opts:["Die 1","Die 10","Die 7","Die 99"],correct:0,fun:"Die Nummer 1 gehört klassisch dem Torhüter."},
  // ── Wappen & Farben (dauerhaft) ──
  {id:"wap_bayernfarbe",cat:"wappen",q:"In welcher Farbe spielt der FC Bayern zuhause?",opts:["Rot","Blau","Grün","Gelb"],correct:0,fun:"Der FC Bayern – „die Roten\"."},
  {id:"wap_dortmundspitz",cat:"wappen",q:"Wie lautet der Spitzname von Borussia Dortmund?",opts:["Die Schwarzgelben","Die Roten","Die Blauen","Die Grünen"],correct:0,fun:"„Die Schwarzgelben\" – wegen Schwarz-Gelb."},
  {id:"wap_schalkefarbe",cat:"wappen",q:"Welche Vereinsfarbe hat Schalke 04?",opts:["Königsblau","Rot","Grün","Orange"],correct:0,fun:"Schalke spielt in Königsblau."},
  {id:"wap_koeln",cat:"wappen",q:"Welches Tier ziert das Wappen des 1. FC Köln?",opts:["Ein Geißbock 🐐","Ein Löwe","Ein Adler","Ein Pferd"],correct:0,fun:"Der Geißbock „Hennes\" – Wappentier und Maskottchen."},
  {id:"wap_wolfsburg",cat:"wappen",q:"Welches Tier steckt schon im Namen des VfL Wolfsburg?",opts:["Der Wolf 🐺","Der Bär","Der Fuchs","Der Hund"],correct:0,fun:"Wolfsburg – „die Wölfe\"."},
  {id:"wap_frankfurt",cat:"wappen",q:"Welches Tier ist das Wappentier von Eintracht Frankfurt?",opts:["Der Adler 🦅","Der Löwe","Der Stier","Der Hahn"],correct:0,fun:"Ein Adler – wie bei uns Adler Dellbrück!"},
  {id:"wap_leverkusen",cat:"wappen",q:"Welches Tier steckt im Wappen von Bayer 04 Leverkusen?",opts:["Ein Löwe 🦁","Ein Bär","Ein Adler","Ein Wolf"],correct:0,fun:"Ein Löwe schmückt das Leverkusener Wappen."},
  {id:"wap_stuttgart",cat:"wappen",q:"Welches Tier steht im Wappen des VfB Stuttgart?",opts:["Ein Pferd 🐎","Ein Hirsch","Ein Adler","Ein Löwe"],correct:0,fun:"Das schwarze Ross ist das Zeichen von Stuttgart."},
  {id:"wap_gladbach",cat:"wappen",q:"Wie lautet der Spitzname von Borussia Mönchengladbach?",opts:["Die Fohlen","Die Wölfe","Die Roten","Die Adler"],correct:0,fun:"Gladbach – „die Fohlen\"."},
  {id:"wap_werder",cat:"wappen",q:"Welche Farben trägt Werder Bremen?",opts:["Grün-Weiß","Rot-Schwarz","Blau-Gelb","Lila"],correct:0,fun:"Werder Bremen spielt in Grün-Weiß."},
  {id:"wap_hsv",cat:"wappen",q:"Welche Form hat das Logo des Hamburger SV?",opts:["Eine Raute","Eine Krone","Eine Sonne","Ein Anker"],correct:0,fun:"Die blaue Raute des HSV – wie unser Raute-Spielsystem!"},
  {id:"wap_leipzig",cat:"wappen",q:"In welcher Farbe spielt RB Leipzig zuhause?",opts:["Weiß mit Rot","Grün","Schwarz","Gelb"],correct:0,fun:"RB Leipzig spielt in Weiß mit Rot und hat einen Stier im Logo."},
  {id:"wap_barca",cat:"wappen",q:"In welchen Farben spielt der FC Barcelona?",opts:["Blau-Rot","Weiß","Grün","Gelb-Schwarz"],correct:0,fun:"Barça in Blau-Rot – „Blaugrana\"."},
  {id:"wap_real",cat:"wappen",q:"In welcher Farbe spielt Real Madrid zuhause?",opts:["Weiß","Rot","Blau","Schwarz"],correct:0,fun:"Real Madrid – ganz in Weiß, „die Königlichen\"."},
  {id:"wap_juve",cat:"wappen",q:"In welchen Farben spielt Juventus Turin?",opts:["Schwarz-Weiß","Rot-Blau","Grün-Weiß","Gelb"],correct:0,fun:"Juve spielt Schwarz-Weiß gestreift."},
  {id:"wap_liverpool",cat:"wappen",q:"In welcher Farbe spielt der FC Liverpool?",opts:["Rot","Blau","Weiß","Grün"],correct:0,fun:"Liverpool spielt in Rot – „the Reds\"."},
  {id:"wap_city",cat:"wappen",q:"In welcher Farbe spielt Manchester City?",opts:["Hellblau","Rot","Schwarz","Gelb"],correct:0,fun:"Manchester City in Himmelblau."},
  {id:"wap_united",cat:"wappen",q:"In welcher Farbe spielt Manchester United zuhause?",opts:["Rot","Blau","Grün","Weiß"],correct:0,fun:"Man United – „the Red Devils\" in Rot."},
  {id:"wap_ajax",cat:"wappen",q:"In welchen Farben spielt Ajax Amsterdam?",opts:["Rot-Weiß","Blau","Grün","Schwarz"],correct:0,fun:"Ajax spielt Weiß mit breitem rotem Streifen."},
  {id:"wap_psg",cat:"wappen",q:"In welchen Farben spielt Paris Saint-Germain?",opts:["Blau-Rot","Grün-Weiß","Schwarz","Gelb"],correct:0,fun:"PSG aus Paris spielt in Blau mit Rot."},
  // ── Fußball-Wörter erklärt (evergreen, lehrreich) ──
  {id:"wo_hattrick",cat:"woerter",q:"Drei Tore eines Spielers in einem Spiel nennt man …?",opts:["Hattrick","Dreipack-Bonus","Triple","Goldtor"],correct:0,fun:"Ein Hattrick – drei Tore, ein Held!"},
  {id:"wo_derby",cat:"woerter",q:"Ein Spiel zweier Nachbar-Vereine heißt …?",opts:["Derby","Pokal","Turnier","Test"],correct:0,fun:"Ein Derby ist besonders heiß – Nachbarn gegen Nachbarn."},
  {id:"wo_flanke",cat:"woerter",q:"Ein hoher Ball von der Seite in die Mitte heißt …?",opts:["Flanke","Rückpass","Abstoß","Einwurf"],correct:0,fun:"Eine Flanke bringt den Ball zum Kopfball-Stürmer."},
  {id:"wo_abseits",cat:"woerter",q:"Ganz einfach: Abseits ist, wenn ein Angreifer …?",opts:["hinter dem letzten Verteidiger auf den Ball wartet","den Ball mit der Hand nimmt","zu schnell läuft","zu laut ruft"],correct:0,fun:"Abseits verhindert das „Lauern\" direkt am gegnerischen Tor."},
  {id:"wo_konter",cat:"woerter",q:"Schnell nach Ballgewinn nach vorne stürmen nennt man …?",opts:["Konter","Rückzug","Auszeit","Foul"],correct:0,fun:"Ein Konter überrascht den Gegner blitzschnell."},
  {id:"wo_elfmeter",cat:"woerter",q:"Ein Strafstoß von 11 Metern heißt auch …?",opts:["Elfmeter","Freistoß","Einwurf","Eckball"],correct:0,fun:"Elfmeter – 11 Meter, nur du gegen den Torwart."},
  {id:"wo_freistoss",cat:"woerter",q:"Nach einem Foul außerhalb des Strafraums gibt es einen …?",opts:["Freistoß","Elfmeter","Einwurf","Abstoß"],correct:0,fun:"Ein Freistoß – der Gegner muss Abstand halten."},
  {id:"wo_eckball",cat:"woerter",q:"Verteidiger schießt den Ball über die eigene Torlinie – es gibt einen …?",opts:["Eckball","Einwurf","Elfmeter","Tor"],correct:0,fun:"Eckball – von der Fahne wird geflankt."},
  {id:"wo_einwurf",cat:"woerter",q:"Der Ball geht über die Seitenlinie – zurück kommt er per …?",opts:["Einwurf","Eckball","Freistoß","Abschlag"],correct:0,fun:"Einwurf – mit beiden Händen über dem Kopf."},
  {id:"wo_abstoss",cat:"woerter",q:"Der Angreifer schießt über die Torlinie – es gibt einen …?",opts:["Abstoß","Eckball","Elfmeter","Einwurf"],correct:0,fun:"Der Abstoß bringt den Ball vom Tor aus wieder ins Spiel."},
  {id:"wo_dribbling",cat:"woerter",q:"Den Ball eng am Fuß am Gegner vorbeiführen heißt …?",opts:["Dribbling","Passen","Grätschen","Köpfen"],correct:0,fun:"Dribbling – tänzeln mit dem Ball!"},
  {id:"wo_graetsche",cat:"woerter",q:"Mit gestrecktem Bein den Ball erobern nennt man …?",opts:["Grätsche","Flanke","Kopfball","Fallrückzieher"],correct:0,fun:"Eine Grätsche – vorsichtig, sonst gibt's ein Foul!"},
  {id:"wo_volley",cat:"woerter",q:"Einen Ball direkt aus der Luft schießen heißt …?",opts:["Volleyschuss","Rückpass","Kopfball","Einwurf"],correct:0,fun:"Ein Volley – direkt aus der Luft getroffen."},
  {id:"wo_kopfball",cat:"woerter",q:"Den Ball mit dem Kopf spielen ist ein …?",opts:["Kopfball","Handspiel","Einwurf","Abschlag"],correct:0,fun:"Kopfball – Augen auf und mit der Stirn treffen!"},
  {id:"wo_assist",cat:"woerter",q:"Wer den Pass direkt vor dem Tor spielt, macht einen …?",opts:["Assist (Vorlage)","Fehler","Einwurf","Rückpass"],correct:0,fun:"Ein Assist – die Vorlage ist fast so wertvoll wie das Tor."},
  {id:"wo_pressing",cat:"woerter",q:"Den Gegner früh gemeinsam unter Druck setzen nennt man …?",opts:["Pressing","Bummeln","Auszeit","Rückzug"],correct:0,fun:"Pressing – sofort zusammen den Ball zurückerobern!"},
  {id:"wo_doppelpass",cat:"woerter",q:"Kurzer Pass hin und direkt zurück heißt …?",opts:["Doppelpass","Fehlpass","Rückwurf","Abschlag"],correct:0,fun:"Der Doppelpass – „du zu mir, ich zu dir\" – überlistet Gegner."},
  {id:"wo_manndeckung",cat:"woerter",q:"Einen bestimmten Gegner immer bewachen heißt …?",opts:["Manndeckung","Freilaufen","Konter","Dribbling"],correct:0,fun:"Manndeckung – du bleibst wie ein Schatten an deinem Gegner."},
  {id:"wo_nachspielzeit",cat:"woerter",q:"Die Extra-Minuten am Spielende heißen …?",opts:["Nachspielzeit","Halbzeit","Auszeit","Pause"],correct:0,fun:"Nachspielzeit – hier fallen oft noch wichtige Tore!"},
  {id:"wo_verlaengerung",cat:"woerter",q:"Steht es im Pokal nach 90 Minuten unentschieden, gibt es …?",opts:["Verlängerung","sofort Elfmeter","ein neues Spiel","nichts"],correct:0,fun:"30 Minuten Verlängerung – danach ggf. Elfmeterschießen."},
  // ── Fair Play & Werte (passt zur Jugendarbeit) ──
  {id:"fp_handschlag",cat:"fairplay",q:"Was machen faire Teams vor und nach dem Spiel?",opts:["Sich die Hand geben","Sich auslachen","Weglaufen","Streiten"],correct:0,fun:"Handschlag – Respekt vor dem Gegner gehört dazu!"},
  {id:"fp_entschuldigen",cat:"fairplay",q:"Du foulst aus Versehen einen Gegner. Was ist fair?",opts:["Sich entschuldigen","Weiterlaufen","Lachen","Schimpfen"],correct:0,fun:"Ein kurzes „Sorry\" zeigt echte Größe."},
  {id:"fp_verletzt",cat:"fairplay",q:"Ein Gegner liegt verletzt am Boden. Was ist fair?",opts:["Den Ball ins Aus spielen","Schnell ein Tor schießen","Weiterspielen","Jubeln"],correct:0,fun:"Fair: Ball raus, damit geholfen werden kann."},
  {id:"fp_schiri",cat:"fairplay",q:"Wie verhältst du dich gegenüber dem Schiedsrichter?",opts:["Respektvoll, auch bei Fehlern","Anschreien","Auslachen","Ignorieren"],correct:0,fun:"Auch Schiris machen mal Fehler – Respekt bleibt trotzdem."},
  {id:"fp_verlieren",cat:"fairplay",q:"Deine Mannschaft verliert. Was macht ein guter Verlierer?",opts:["Dem Gegner gratulieren","Schimpfen und schmollen","Den Ball wegkicken","Nach Hause rennen"],correct:0,fun:"Fair verlieren ist genauso wichtig wie fair gewinnen."},
  {id:"fp_gewinnen",cat:"fairplay",q:"Ihr habt hoch gewonnen. Was ist fair gegenüber dem Gegner?",opts:["Nicht auslachen, fair bleiben","Auslachen","Angeben","Übertrieben jubeln"],correct:0,fun:"Sieger sein heißt auch, den Gegner zu achten."},
  {id:"fp_mut",cat:"fairplay",q:"Ein Mitspieler macht einen Fehler. Was hilft ihm?",opts:["Mut machen","Auslachen","Schimpfen","Ignorieren"],correct:0,fun:"„Kopf hoch, weiter geht's!\" – das macht ein Team stark."},
  {id:"fp_abspiel",cat:"fairplay",q:"Ein Mitspieler steht viel besser als du. Was tust du?",opts:["Abspielen","Alleine schießen","Den Ball halten","Meckern"],correct:0,fun:"Abspielen! Zusammen schießt man mehr Tore."},
  {id:"fp_neuling",cat:"fairplay",q:"Ein neues, schüchternes Kind kommt ins Team. Was ist fair?",opts:["Freundlich aufnehmen und helfen","Auslachen","Ignorieren","Ärgern"],correct:0,fun:"Jeder war mal neu – gemeinsam wird man besser."},
  {id:"fp_warumregeln",cat:"fairplay",q:"Warum gibt es überhaupt Regeln im Fußball?",opts:["Damit es fair und sicher ist","Damit es langweilig ist","Ohne Grund","Damit einer immer gewinnt"],correct:0,fun:"Regeln sorgen für Fairness und Sicherheit für alle."},
  {id:"fp_meckern",cat:"fairplay",q:"Zu viel Meckern beim Schiedsrichter kann was geben?",opts:["Eine Gelbe Karte","Ein Tor","Applaus","Nichts"],correct:0,fun:"Meckern kann sogar Gelb kosten – lieber ruhig bleiben."},
  {id:"fp_aufraeumen",cat:"fairplay",q:"Was machen faire Teams nach dem Spiel mit ihrem Müll in der Kabine?",opts:["Aufräumen","Liegen lassen","Verstecken","Auf den Platz werfen"],correct:0,fun:"Ordnung halten – auch das gehört zu einem guten Team."},
  {id:"fp_zuhoeren",cat:"fairplay",q:"Der Trainer erklärt etwas. Was ist gut?",opts:["Zuhören","Reinreden","Weglaufen","Quatschen"],correct:0,fun:"Gut zuhören hilft dir, schnell besser zu werden."},
  {id:"fp_anfeuern",cat:"fairplay",q:"Wie unterstützt du Mitspieler, die auf der Bank sitzen?",opts:["Anfeuern","Auslachen","Schmollen","Stören"],correct:0,fun:"Lautes Anfeuern gibt dem Team Extra-Kraft!"},
  {id:"fp_aufhelfen",cat:"fairplay",q:"Ein Gegner ist hingefallen. Was ist eine nette Geste?",opts:["Hand reichen zum Aufstehen","Wegschauen","Lachen","Wegschieben"],correct:0,fun:"Dem Gegner aufhelfen – echte Sportlichkeit!"},
  {id:"fp_mitfreuen",cat:"fairplay",q:"Ein Mitspieler schießt viele Tore. Was ist fair?",opts:["Sich mitfreuen","Neidisch sein","Nicht mehr abspielen","Schmollen"],correct:0,fun:"Mitfreuen! Sein Tor ist auch euer Tor."},
  {id:"fp_spass",cat:"fairplay",q:"Was zählt am Ende oft mehr als das Gewinnen?",opts:["Spaß und Fairness","Nur der Pokal","Angeben","Gegner ärgern"],correct:0,fun:"Spaß, Fairness und Freunde – dafür spielen wir Fußball!"},
  {id:"fp_teilen",cat:"fairplay",q:"Ein Mitspieler hat sein Wasser vergessen. Was tust du?",opts:["Teilen","Auslachen","Verstecken","Alles selbst trinken"],correct:0,fun:"Teilen ist Teamgeist – heute er, morgen du."},
  {id:"fp_puenktlich",cat:"fairplay",q:"Warum kommst du pünktlich zum Training?",opts:["Aus Respekt vor dem Team","Ist egal","Damit andere warten","Nur wenn ich Lust habe"],correct:0,fun:"Pünktlich sein zeigt: Dir ist dein Team wichtig."},
  {id:"fp_gruessen",cat:"fairplay",q:"Wie begrüßt du deine Trainer und Mitspieler?",opts:["Freundlich Hallo sagen","Ignorieren","Anrempeln","Weglaufen"],correct:0,fun:"Ein freundliches Hallo startet jedes Training gut."}
];

const WQ_PROGRESS_KEY="adler_wq_progress";
let wqCat="",wqQs=[],wqIdx=0,wqScore=0,wqAnsweredNow=false;

function wqGetProgress(){ try{return JSON.parse(localStorage.getItem(WQ_PROGRESS_KEY)||"{}");}catch(e){return{};} }
function wqSaveCorrect(player,qid){
  const p=wqGetProgress();
  if(!p[player])p[player]={};
  p[player][qid]=1;
  try{localStorage.setItem(WQ_PROGRESS_KEY,JSON.stringify(p));}catch(e){}
}
function wqPlayerDone(){ const p=(wqGetProgress()[tqPlayer])||{}; return WQ_QUESTIONS.filter(q=>p[q.id]).length; }

// Einstiegs-Karte für die Spieler-Auswahl-Ansicht (tqStart) – zeigt Gesamt-Fortschritt.
function wqRenderLauncher(){
  if(!tqPlayer)return "";
  const done=wqPlayerDone(), total=WQ_QUESTIONS.length, pct=Math.round(done/total*100);
  return `<div class="card" style="padding:0;margin-top:10px;overflow:hidden;cursor:pointer" onclick="wqStart()">
    <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:12px 14px;color:#fff">
      <div style="font-size:14px;font-weight:800;margin-bottom:2px">🧠 Fußball-Wissen</div>
      <div style="font-size:11px;opacity:.95;margin-bottom:8px">${WQ_CATS.length} Kategorien · WM, Bundesliga, Legenden, Stars & mehr — sammle ${XP_ICON} Federn!</div>
      <div style="height:8px;background:rgba(255,255,255,.25);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#fbbf24;border-radius:4px;transition:width .4s"></div></div>
      <div style="font-size:10px;margin-top:5px;opacity:.9">${done}/${total} richtig beantwortet</div>
    </div>
  </div>`;
}

// Kategorie-Übersicht
function wqStart(){
  if(!tqPlayer){tqStart();return;}
  document.body.classList.add("wq-active");
  if("speechSynthesis" in window)speechSynthesis.cancel();
  const panel=document.getElementById("tq-panel"); panel.style.display="block";
  const prog=(wqGetProgress()[tqPlayer])||{};
  let html=`<div class="tq-panel">
    <div style="font-size:10px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">🧠 Fußball-Wissen · ${esc(tqPlayer)}</div>
    <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:2px">Wähle eine Kategorie!</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Jede richtige Antwort bringt beim ersten Mal ${XP_ICON} Federn.</div>
    <div style="display:flex;flex-direction:column;gap:8px">`;
  WQ_CATS.forEach(c=>{
    const qs=WQ_QUESTIONS.filter(q=>q.cat===c.key);
    const done=qs.filter(q=>prog[q.id]).length, pct=Math.round(done/qs.length*100);
    html+=quizChoiceCard({
      icon:c.icon, titel:c.name, fertig:done>=qs.length, pct, col:c.col,
      sub:`${done}/${qs.length} richtig`, onclick:`wqStartCat('${c.key}')`
    });
  });
  html+=`</div>
    <button class="btn btn-sm" style="margin-top:12px" onclick="wqExit()"><i class="ti ti-arrow-left"></i>Zurück zur Quiz-Auswahl</button>
  </div>`;
  panel.innerHTML=html;
}

function wqStartCat(key){
  wqCat=key; wqIdx=0; wqScore=0;
  const prog=(wqGetProgress()[tqPlayer])||{};
  const qs=WQ_QUESTIONS.filter(q=>q.cat===key).slice();
  qs.sort((a,b)=>(prog[a.id]?1:0)-(prog[b.id]?1:0)); // noch nicht gelernte Fragen zuerst
  wqQs=qs;
  wqRenderQ();
}

function wqRenderQ(){
  const q=wqQs[wqIdx];
  if(!q){wqResult();return;}
  wqAnsweredNow=false;
  const cat=WQ_CATS.find(c=>c.key===q.cat)||{name:"Quiz",icon:"🧠"};
  const opts=q.opts.map((t,i)=>({t,ok:i===q.correct}));
  for(let i=opts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];} // Fisher-Yates
  const panel=document.getElementById("tq-panel"); panel.style.display="block";
  panel.innerHTML=`<div class="tq-panel">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:.5px">${cat.icon} ${cat.name} · ${wqIdx+1}/${wqQs.length}</div>
      <div class="tq-score">✅ ${wqScore}/${wqIdx}</div>
    </div>
    <div class="wq-question">${esc(q.q)}</div>
    <div class="wq-opts">
      ${opts.map(o=>`<button class="wq-opt" data-ok="${o.ok?1:0}" onclick="wqAnswer(this)">${esc(o.t)}</button>`).join("")}
    </div>
    <div id="wq-feedback"></div>
  </div>`;
}

function wqAnswer(el){
  if(wqAnsweredNow)return;
  wqAnsweredNow=true;
  const q=wqQs[wqIdx];
  const ok=el.dataset.ok==="1";
  el.parentElement.querySelectorAll(".wq-opt").forEach(b=>{
    b.disabled=true; b.style.pointerEvents="none";
    if(b.dataset.ok==="1")b.classList.add("wq-correct");
    else if(b===el)b.classList.add("wq-wrong");
  });
  const fb=document.getElementById("wq-feedback");
  if(ok){
    wqScore++;
    tqVibrate([40,60,40]);
    const wasNew=!((wqGetProgress()[tqPlayer])||{})[q.id];
    wqSaveCorrect(tqPlayer,q.id);
    fb.innerHTML=`<div class="wq-fb wq-fb-ok">🎉 Richtig!<span>${esc(q.fun)}</span></div>`;
    confetti(document.getElementById("tq-panel"));
    if(wasNew&&tqPlayer){
      // Federn nur mit Session; Server gibt pro Frage genau einmal (idempotent).
      xpAwardByName(tqPlayer,"wissensquiz",q.id).then(d=>{
        if(d>0){ fb.insertAdjacentHTML("afterbegin",`<div class="wq-federn">${XP_ICON} +${d} ${XP_LABEL}!</div>`); try{navigator.vibrate&&navigator.vibrate([30,50,30]);}catch(e){} }
      }).catch(()=>{});
    }
  }else{
    tqVibrate(80);
    fb.innerHTML=`<div class="wq-fb wq-fb-no">Fast! Die richtige Antwort ist grün. 💡<span>${esc(q.fun)}</span></div>`;
  }
  fb.innerHTML+=`<button class="btn btn-p btn-sm" style="margin-top:10px;width:100%;min-height:48px" onclick="wqNext()"><i class="ti ti-arrow-right"></i>Weiter</button>`;
}

function wqNext(){
  wqIdx++;
  if(wqIdx>=wqQs.length){wqResult();return;}
  wqRenderQ();
}

function wqResult(){
  const total=wqQs.length, pct=total?Math.round(wqScore/total*100):0;
  const cat=WQ_CATS.find(c=>c.key===wqCat)||{name:"Quiz"};
  const msg=pct>=80?{e:"🏆🦅🏆",t:"WISSENS-PROFI!"}:pct>=60?{e:"🌟⚽🌟",t:"RICHTIG GUT!"}:pct>=40?{e:"💪⚡💪",t:"GUT GEMACHT!"}:{e:"🦅🔥🦅",t:"WEITER SO!"};
  const panel=document.getElementById("tq-panel");
  panel.innerHTML=`<div class="tq-panel" id="wq-result-panel" style="text-align:center;position:relative;overflow:hidden">
    <div style="font-size:36px;margin-bottom:4px">${msg.e}</div>
    <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px">${msg.t}</div>
    <div style="font-size:16px;font-weight:600;color:var(--text)">${wqScore} von ${total} richtig!</div>
    <div style="font-size:12px;color:var(--text2);margin:4px 0 12px">Kategorie: ${cat.name}</div>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-p btn-sm" onclick="wqStartCat('${wqCat}')"><i class="ti ti-refresh"></i>Nochmal</button>
      <button class="btn btn-sm" onclick="wqStart()"><i class="ti ti-layout-grid"></i>Andere Kategorie</button>
      <button class="btn btn-sm" onclick="wqExit()">Fertig</button>
    </div>
  </div>`;
  tqVibrate([30,50,30,50,120]);
  if(pct>=70)confetti(document.getElementById("wq-result-panel"));
}

function wqExit(){
  document.body.classList.remove("wq-active");
  if("speechSynthesis" in window)speechSynthesis.cancel();
  tqStart();
}

// Einmaliger Willkommens-/Erklär-Overlay im Kids-Modus: Adler-Federn + Karten-System.
function kidsIntroMaybe(){
  try{if(localStorage.getItem("adler_kids_intro"))return;}catch(e){}
  if(document.getElementById("kids-intro"))return;
  const ov=document.createElement("div");
  ov.id="kids-intro";
  ov.style.cssText="position:fixed;inset:0;z-index:10002;background:linear-gradient(160deg,#0ea5e9,#6366f1);display:flex;align-items:center;justify-content:center;padding:20px";
  ov.innerHTML=`<div style="background:#fff;border-radius:18px;padding:20px;max-width:340px;width:100%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font-size:40px">🦅🪶</div>
    <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin:4px 0 10px">Willkommen beim Adler-Quiz!</div>
    <div style="text-align:left;font-size:13px;color:#334155;line-height:1.5">
      <div style="margin-bottom:8px">🪶 <b>Adler-Federn</b> bekommst du für jede <b>richtige Antwort</b> (jede Frage einmal) und für <b>Technik-Abzeichen</b>.</div>
      <div style="margin-bottom:8px">🃏 Deine <b>Adler-Karte</b> wird immer cooler: mit mehr Federn schaltest du neue Designs frei – 🥉 Bronze, 🥈 Silber, 🥇 Gold und mehr!</div>
      <div>🎯 Es gibt <b>Taktik</b> (die Raute) und <b>Fußball-Wissen</b> (WM, Bundesliga, Regeln, Legenden …).</div>
    </div>
    <button class="btn btn-p" style="width:100%;min-height:48px;margin-top:14px;font-size:15px;font-weight:800" onclick="kidsIntroClose()">Los geht's! 🚀</button>
  </div>`;
  document.body.appendChild(ov);
}
function kidsIntroClose(){ try{localStorage.setItem("adler_kids_intro","1");}catch(e){} document.getElementById("kids-intro")?.remove(); }
