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
  const url=window.location.origin+window.location.pathname+"?quiz";
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
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px">Wähle einen Block!</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:10px">Jeder Block hat 10 Fragen. Dein Fortschritt wird gespeichert.</div>
      <div class="tq-blocks">`;
    TQ_BLOCKS.forEach((b,i)=>{
      const bp=pp[i];
      const done=bp&&bp.score>=7;
      const pct=bp?Math.round(bp.score/bp.total*100):0;
      const medaille=bp?(bp.score>=9?" 🥇":bp.score>=7?" 🥈":bp.score>=5?" 🥉":""):""; // K4
      html+=`<div class="tq-block-card${done?" tq-block-done":""}" onclick="tqStartBlock(${i})">
        <div class="tq-block-title"><i class="ti ${b.icon}" style="margin-right:4px"></i>${b.name}${medaille}</div>
        <div class="tq-block-sub">Block ${i+1}${bp?" · "+bp.score+"/"+bp.total+" ("+pct+"%)":""}</div>
        <div class="tq-block-prog"><div class="tq-block-prog-fill" style="width:${bp?pct:0}%"></div></div>
      </div>`;
    });
    html+=`</div>`;
    html+=wqRenderLauncher(); // Fußball-Wissensquiz-Einstieg
    html+=tqRenderBarometer();
    html+=tqRenderStickers(pp);
    html+=`<div id="tq-challenge"></div>`;
    html+=`<div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn btn-sm" onclick="tqPlayer=null;tqStart()"><i class="ti ti-arrow-left"></i>Spieler wechseln</button>
        ${extern?"":'<button class="btn btn-sm" onclick="tqStop()" style="margin-left:auto"><i class="ti ti-x"></i>Schließen</button>'}
      </div>`;
  }
  html+=`</div>`;
  panel.innerHTML=html;
  if(tqPlayer)tqChallengeLoad(); // Wochen-Challenge im Spieler-Kontext nachladen
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
  {key:"wm",     name:"WM & EM",       icon:"🏆", col:"#f59e0b"},
  {key:"bl",     name:"Bundesliga",    icon:"⚽", col:"#16a34a"},
  {key:"regeln", name:"Regeln",        icon:"📏", col:"#2563eb"},
  {key:"adler",  name:"Adler-Wissen",  icon:"🦅", col:"#7c3aed"}
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
  {id:"ad_team",cat:"adler",q:"Was ist beim Fußball am allerwichtigsten?",opts:["Als Team zusammenspielen","Alleine dribbeln","Am lautesten schreien","Der teuerste Schuh"],correct:0,fun:"Teamwork! Zusammen sind wir Adler am stärksten. 🦅"}
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
      <div style="font-size:11px;opacity:.95;margin-bottom:8px">WM · Bundesliga · Regeln · 🦅 Adler-Wissen — sammle ${XP_ICON} Federn!</div>
      <div style="height:8px;background:rgba(255,255,255,.25);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#fbbf24;border-radius:4px;transition:width .4s"></div></div>
      <div style="font-size:10px;margin-top:5px;opacity:.9">${done}/${total} Fragen gelernt</div>
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
    const done=qs.filter(q=>prog[q.id]).length, pct=Math.round(done/qs.length*100), fertig=done>=qs.length;
    html+=`<div class="card" style="padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="wqStartCat('${c.key}')">
      <div style="font-size:26px;line-height:1">${c.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:var(--text)">${c.name}${fertig?" ✓":""}</div>
        <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;margin-top:5px"><div style="height:100%;width:${pct}%;background:${c.col};border-radius:3px"></div></div>
        <div style="font-size:10px;color:var(--text3);margin-top:3px">${done}/${qs.length} gelernt</div>
      </div>
      <div style="font-size:18px;color:var(--text3)">›</div>
    </div>`;
  });
  html+=`</div>
    <button class="btn btn-sm" style="margin-top:12px" onclick="wqExit()"><i class="ti ti-arrow-left"></i>Zurück zum Quiz</button>
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
