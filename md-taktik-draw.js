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

