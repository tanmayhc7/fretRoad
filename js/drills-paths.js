/* Fret Paths: animated fretboard drills. A bright dot walks the neck one note at a time, with the sound and a click,
   so you can SEE which fret comes next instead of reading it. Watch and play along, no mic needed.
   The view is #v-path (route #practice-<id>). While it is open the header metronome is hidden (body.on-drill) and the
   drill screen shows its own metronome box at the top right. The tempo, clicks and time signature are the same MT state
   as the header metronome, so nothing else changes. Loaded after drills-noguitar.js; the metronome hooks are in metronome.js. */
var FINGER_NAMES=['index','middle','ring','little'];
var PATH_STR=['High E','B','G','D','A','Low E'];   /* row 0 is the thinnest string, as everywhere else */
var PATH_STAGES={
  up:  {name:'Diagonal up',   tip:'Low E frets 1-2-3-4, then one fret higher on each string: A 2-3-4-5, D 3-4-5-6, G 4-5-6-7, B 5-6-7-8, high E 6-7-8-9.'},
  turn:{name:'Turn',          tip:'On the high E play 9-8-7-6, coming back down.'},
  top: {name:'Spider 6-9',    tip:'Frets 6-7-8-9 on every string, from the high E down to the low E.'},
  back:{name:'Diagonal back', tip:'Low E frets 9-8-7-6, then one fret lower on each string: A 8-7-6-5, D 7-6-5-4, G 6-5-4-3, B 5-4-3-2, high E 4-3-2-1.'},
  low: {name:'Spider 1-4',    tip:'Frets 1-2-3-4 on every string, from the high E down to the low E.'}
};
/* a stage is a list of four-note groups: {s: string row, frets: [..], fingers: [..]} (finger 1 = the lowest fret of the group) */
function pathStageGroups(st){
  var g=[],i; function add(s,fr){ var lo=Math.min.apply(null,fr); g.push({s:s,frets:fr,fingers:fr.map(function(f){return f-lo+1}),st:st}); }
  if(st==='up')   for(i=0;i<6;i++) add(5-i,[1+i,2+i,3+i,4+i]);
  if(st==='turn') add(0,[9,8,7,6]);
  if(st==='top')  for(i=0;i<6;i++) add(i,[6,7,8,9]);
  if(st==='back') for(i=0;i<6;i++) add(5-i,[9-i,8-i,7-i,6-i]);
  if(st==='low')  for(i=0;i<6;i++) add(i,[1,2,3,4]);
  return g;
}
function pathBuild(stages){
  var groups=[],flat=[];
  stages.forEach(function(st,si){ pathStageGroups(st).forEach(function(g){ g.si=si; groups.push(g); }); });
  groups.forEach(function(g,gi){ g.frets.forEach(function(f,k){ flat.push({g:gi,k:k,s:g.s,f:f,fin:g.fingers[k]}); }); });
  return {groups:groups,flat:flat};
}
[
 {id:'pathdiagup',name:'Diagonal Climb',desc:'Frets 1-4 on the low E, then one fret higher on every string up to the high E, and 9-8-7-6 back down.',needs:0,kind:'path',tier:'Beginner',rounds:0,stages:['up','turn']},
 {id:'pathspiderlow',name:'Spider, Frets 1-4',desc:'1-2-3-4 on every string, from the high E down to the low E.',needs:0,kind:'path',tier:'Beginner',rounds:0,stages:['low']},
 {id:'pathspidertop',name:'Spider, Frets 6-9',desc:'6-7-8-9 on every string, from the high E down to the low E.',needs:0,kind:'path',tier:'Intermediate',rounds:0,stages:['top']},
 {id:'pathdiagback',name:'Diagonal Descent',desc:'9-8-7-6 on the low E, then one fret lower on every string up to the high E.',needs:0,kind:'path',tier:'Intermediate',rounds:0,stages:['back']},
 {id:'pathfull',name:'The Full Route',desc:'Diagonal up, turn, spider on 6-9, diagonal back, spider on 1-4. One hundred notes, then it loops.',needs:0,kind:'path',tier:'Intermediate',rounds:0,stages:['up','turn','top','back','low']}
].forEach(function(m){PRACTICE.push(m)});
if(window.__FRETROAD_TEST) window.__FRETROAD_TEST.pathBuild=pathBuild;

var PS={m:null,groups:[],flat:[],i:-1,drawnG:-1,drawnI:-2,playing:false,tNext:0,count:0,timer:0,board:null,per:1,loop:true,click:true,ownClick:false,built:false};
if(window.__FRETROAD_TEST) window.__FRETROAD_TEST.PS=PS;
function pathClock(){ return window.ac?ac.currentTime:performance.now()/1000; }
function pathGap(){ return 60/MT.bpm/PS.per; }
function pathBuildOnce(){
  if(PS.built) return; PS.built=true;
  PS.board=createBoard($('#boardD'),function(s,f){ pluck(OPEN[s]+f); PS.board.vib(s); });
  PS.click=save.pathClick!==false;
  $('#dBack').addEventListener('click',function(){ location.hash='map'; });
  $('#dPlay').addEventListener('click',function(){ PS.playing?pathPause():pathPlay(); });
  $('#dRestart').addEventListener('click',function(){ pathPause(); PS.i=-1; pathRender(-1); });
  $('#dPrev').addEventListener('click',function(){ pathPause(); if(PS.i<=0){ PS.i=-1; pathRender(-1); return; } PS.i--; pathNote(PS.i,pathClock()); });
  $('#dNext').addEventListener('click',function(){ pathPause(); if(PS.i>=PS.flat.length-1) return; PS.i++; pathNote(PS.i,pathClock()); });
  $('#dLoop').addEventListener('change',function(){ PS.loop=this.checked; });
  $('#dPer').addEventListener('change',function(){ PS.per=+this.value; });
  /* the drill screen's own metronome box */
  var sel=$('#dmSig'); SIGS.slice().sort(function(a,b){return a[1]-b[1]||a[0]-b[0]}).forEach(function(s){var o=document.createElement('option'); o.value=s[0]+'/'+s[1]; o.textContent=s[0]+'/'+s[1]; sel.appendChild(o)});
  sel.addEventListener('change',function(){ var p=this.value.split('/'); MT.num=+p[0]; MT.den=+p[1]; metroSet('num',+p[0]); MT.den=+p[1]; metroSet('den',+p[1]); $('#mSig').value=this.value; });
  $('#dmBpm').addEventListener('input',function(){ metroSet('bpm',+this.value); });
  $('#dmBpmN').addEventListener('change',function(){ metroSet('bpm',+this.value||MT.bpm); });
  $('#dmMinus').addEventListener('click',function(){ metroSet('bpm',MT.bpm-1); });
  $('#dmPlus').addEventListener('click',function(){ metroSet('bpm',MT.bpm+1); });
  $('#dmGo').addEventListener('click',function(){ PS.ownClick=false; MT.on?metroStop():metroStart(); });
  $('#dmTap').addEventListener('click',function(){ $('#mTap').click(); });
  $('#dmClick').addEventListener('change',function(){ PS.click=this.checked; save.pathClick=this.checked; persist(); });
  $('#dmClick').checked=PS.click;
}
function showPath(M){
  showView('path'); updateStat(); pathBuildOnce(); pathPause();
  PS.m=M; var b=pathBuild(M.stages); PS.groups=b.groups; PS.flat=b.flat; PS.i=-1; PS.drawnG=-1; PS.drawnI=-2;
  $('#dWhere').textContent='Practice · '+M.tier; $('#dTitle').textContent=M.name; $('#dSub').textContent=M.desc;
  var st=$('#dStage'); st.innerHTML='';
  M.stages.forEach(function(k,i){ var c=document.createElement('span'); c.className='chip'; c.dataset.si=i; c.textContent=(M.stages.length>1?(i+1)+'. ':'')+PATH_STAGES[k].name; c.title=PATH_STAGES[k].tip; st.appendChild(c); });
  $('#dPer').value=PS.per; $('#dLoop').checked=PS.loop;
  $('#dmSig').value=MT.num+'/'+MT.den; pathMetroSync(); pathPlayLabel();
  pathRender(-1);
}
function pathPlayLabel(){ var b=$('#dPlay'); b.textContent=PS.playing?'Pause':(PS.i>=PS.flat.length-1?'Play again':(PS.i>=0?'Resume':'Play')); b.classList.toggle('primary',true); b.setAttribute('aria-pressed',PS.playing?'true':'false'); }
/* draw note i on the neck (i = -1: the start position, nothing played yet) */
function pathRender(i){
  var b=PS.board, loc=i>=0?PS.flat[i]:{g:0,k:-1}, g=PS.groups[loc.g], ng=PS.groups[loc.g+1];
  function orb(j,kind){ b.orb('n'+j,{s:g.s,f:g.frets[j],kind:kind,label:String(g.frets[j])}); }
  if(PS.drawnG===loc.g&&i===PS.drawnI+1&&loc.k>0){
    orb(loc.k-1,'found'); orb(loc.k,'root'); b.link([g.s,g.frets[loc.k-1]],[g.s,g.frets[loc.k]],'',true);
  } else {
    b.clearOrbs(); b.clearLinks();
    g.frets.forEach(function(f,j){ orb(j,j<loc.k?'found':(j===loc.k?'root':'ghost')); });
    for(var j=1;j<=loc.k;j++) b.link([g.s,g.frets[j-1]],[g.s,g.frets[j]],'',true);
    if(ng) b.orb('nx',{s:ng.s,f:ng.frets[0],kind:'hint'});   /* where the next group starts */
  }
  PS.drawnG=loc.g; PS.drawnI=i;
  var now=$('#dNow'), sub=$('#dNowSub');
  if(i<0){ now.textContent='Press Play'; sub.textContent='First note: '+PATH_STR[g.s]+' string, fret '+g.frets[0]+' with your '+FINGER_NAMES[g.fingers[0]-1]+' finger.'; }
  else { var n=PS.flat[i]; now.textContent=PATH_STR[n.s]+' string, fret '+n.f; sub.textContent=FINGER_NAMES[n.fin-1][0].toUpperCase()+FINGER_NAMES[n.fin-1].slice(1)+' finger ('+n.fin+'). Group '+(loc.g+1)+' of '+PS.groups.length+', note '+(i+1)+' of '+PS.flat.length+'.'; }
  var seq=$('#dSeq'); seq.innerHTML=''; g.frets.forEach(function(f,j){ var c=document.createElement('span'); c.className='chip'+(j<loc.k?' ok':(j===loc.k?' on':'')); c.textContent=f; c.title=FINGER_NAMES[g.fingers[j]-1]+' finger'; seq.appendChild(c); });
  var chips=$('#dStage').children; for(var s=0;s<chips.length;s++) chips[s].className='chip'+(s<g.si?' ok':(s===g.si?' on':''));
  $('#dTip').textContent=PATH_STAGES[g.st].tip;
  $('#dProg').style.width=(Math.max(0,i+1)/PS.flat.length*100)+'%';
  pathPlayLabel();
}
function pathNote(i,at){
  pathRender(i); var n=PS.flat[i];
  pluck(OPEN[n.s]+n.f,Math.max(0,at-pathClock()),.85);
  PS.board.vib(n.s); PS.board.burst(n.s,n.f,'#e6b95f');
}
function pathPlay(){
  initAudio(); if(PS.i>=PS.flat.length-1){ PS.i=-1; pathRender(-1); }
  PS.playing=true; $('#dCap').setAttribute('aria-live','off');
  var start=pathClock()+.12; PS.count=MT.num; PS.tNext=start; PS.ownClick=false;
  if(PS.click&&window.ac){ if(MT.on) metroStop(); metroStart(start); PS.ownClick=true; }
  clearInterval(PS.timer); PS.timer=setInterval(pathTick,20); pathPlayLabel();
}
function pathTick(){
  var now=pathClock();
  while(PS.playing&&PS.tNext<=now+.03){
    if(PS.count>0){   /* one bar of count-in, shown as numbers */
      var nb=MT.num-PS.count+1; $('#dNow').textContent='Get ready: '+nb; $('#dNowSub').textContent='The first note comes in after '+MT.num+' clicks.'; PS.count--; PS.tNext+=60/MT.bpm; continue;
    }
    if(PS.i>=PS.flat.length-1){
      if(PS.loop){ PS.i=-1; PS.drawnG=-1; }
      else { pathFinish(); return; }
    }
    PS.i++; pathNote(PS.i,PS.tNext); PS.tNext+=pathGap();
  }
}
function pathFinish(){
  pathPause(); var id=PS.m&&PS.m.id; if(id){ (save.pathRuns||(save.pathRuns={}))[id]=(save.pathRuns[id]||0)+1; persist(); }
  $('#dNow').textContent='Round complete'; $('#dNowSub').textContent='Press Play again, or raise the tempo a few bpm if every note was clean.'; pathPlayLabel();
}
function pathPause(){
  PS.playing=false; clearInterval(PS.timer); PS.timer=0;
  if(PS.ownClick&&MT.on) metroStop(); PS.ownClick=false;
  var live=$('#dCap'); if(live) live.setAttribute('aria-live','polite'); if(PS.built) pathPlayLabel();
}
function pathStop(){ pathPause(); }   /* showView calls this when you leave the drill screen */
/* tempo or time signature changed while playing: restart the count so the notes stay on the clicks */
function pathTempo(){ if(!PS.playing) return; PS.count=0; PS.tNext=(PS.click&&MT.on)?MT.next:pathClock()+.06; }
/* keep the drill screen's metronome box in step with MT (called from metronome.js) */
function pathMetroSync(){
  var box=$('#drMetro'); if(!box||!PS.built) return;
  $('#dmBpm').value=MT.bpm; $('#dmBpmN').value=MT.bpm;
  var go=$('#dmGo'); go.textContent=MT.on?'Stop':'Start'; go.classList.toggle('primary',!MT.on);
  var spec=meterSpec(MT.num,MT.den), d=$('#dmDots'), h='';
  spec.levels.forEach(function(l,i){ h+='<i class="l'+l+'" data-i="'+i+'"></i>'; });
  if(d.children.length!==spec.levels.length||d.dataset.sig!==MT.num+'/'+MT.den){ d.innerHTML=h; d.dataset.sig=MT.num+'/'+MT.den; }
  if(!MT.on) for(var i=0;i<d.children.length;i++) d.children[i].classList.remove('on');
  $('#dmSig').value=MT.num+'/'+MT.den;
}
function pathMetroBeat(idx){ var d=$('#dmDots'); if(!d) return; for(var i=0;i<d.children.length;i++) d.children[i].classList.toggle('on',i===idx); }
