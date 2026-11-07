/* Animated fretboard, shared by the Practice drills (#v-path) and the Daily exercises (#v-warm).
   A bright dot walks the neck one note at a time (sound, string wobble, fret number on the dot), so you can SEE what to play.
   One instance of the board block and of the metronome box is built once and moved into whichever screen is open (faMount),
   and moved back out of the way when you leave (faUnmount). While mounted, body.on-drill hides the header metronome and the
   screen shows its own metronome box at the top right. The tempo, clicks and time signature are the same MT state as the
   header metronome (metronome.js calls faMetroSync / faMetroBeat / faTempo), so nothing else changes.
   A sequence is a list of phrases; each phrase is a few notes shown together (played ones teal, the rest dashed).
   Notation (faParse): notes are  <string><fret>[:<finger>][h|p|/]  with strings e B G D A E (e = thin high E, E = thick low E),
   h = hammer-on, p = pull-off, / = slide to this note, :x = no finger shown, and | starts a new phrase.  e.g.  "e5 e7h e5p | B5 B7h B5p" */
var FA={spec:null,phrases:[],flat:[],i:-1,drawnP:-1,drawnI:-2,playing:false,tNext:0,count:0,timer:0,board:null,per:1,loop:true,click:true,ownClick:false,built:false,mounted:false};
var FA_ENG=FA;   /* the engine that owns the metronome box right now: FA here, PK in pick-anim.js */
var FA_STR=['High E','B','G','D','A','Low E'], FA_LET={e:0,B:1,G:2,D:3,A:4,E:5}, FA_FINGER=['index','middle','ring','little'];
if(window.__FRETROAD_TEST){ window.__FRETROAD_TEST.FA=FA; }
/* fingers default to "fret minus the lowest fretted fret of the phrase, plus one" (max 4); give :n to override, :x for none */
function faParse(dsl,opts){
  opts=opts||{}; var out=[];
  String(dsl).split('|').forEach(function(ph){
    var steps=[];
    ph.trim().split(/\s+/).filter(Boolean).forEach(function(t){
      var m=/^([eBGDAE])(\d{1,2})(?::([0-4x]))?([hp\/]?)$/.exec(t); if(!m) throw new Error('fret animation: bad note "'+t+'"');
      steps.push({s:FA_LET[m[1]],f:+m[2],fin:m[3]===undefined?null:(m[3]==='x'?-1:+m[3]),t:m[4]||''});
    });
    var fr=steps.filter(function(x){return x.f>0}).map(function(x){return x.f}), lo=fr.length?Math.min.apply(null,fr):0;
    steps.forEach(function(x){ if(x.fin===null) x.fin=opts.nofinger?-1:(x.f===0?0:Math.min(4,x.f-lo+1)); });
    if(steps.length) out.push({steps:steps});
  });
  return out;
}
if(window.__FRETROAD_TEST){ window.__FRETROAD_TEST.faParse=faParse; }
function faClock(){ return window.ac?ac.currentTime:performance.now()/1000; }
function faGap(){ return 60/MT.bpm/FA.per; }
var FA_BLOCK='<div class="seq" id="dStage" aria-label="Stages of this drill" hidden></div>'+
 '<div class="board-wrap" id="boardD"></div>'+
 '<div class="dr-cap" id="dCap" aria-live="polite"><div class="dr-now" id="dNow"></div><p class="jsub" id="dNowSub"></p><div class="seq" id="dSeq" aria-label="The notes in this phrase"></div><div class="dr-prog" aria-hidden="true"><i id="dProg"></i></div><p class="jsub" id="dTip"></p></div>'+
 '<div class="acts dr-acts"><button class="btn primary" id="dPlay">Play</button><button class="btn" id="dPrev" aria-label="Previous note">&lsaquo; Note</button><button class="btn" id="dNext" aria-label="Next note">Note &rsaquo;</button><button class="btn quiet" id="dRestart">Restart</button>'+
 '<label class="dr-opt"><input type="checkbox" id="dLoop" checked> Loop</label><label class="dr-opt">Notes per click <select id="dPer"><option value="1">1</option><option value="2">2</option></select></label></div>'+
 '<p class="jsub dr-legend">Each dot shows the fret number (0 is the open string). The brass dot is the note to play now, teal dots are already played, dashed dots are coming next, and the pulsing ring is where the next group starts. h means hammer on, p pull off, / slide, and those notes sound softer because you do not pick them. Use the Sound button in the top bar to mute the notes.</p>';
var FA_METRO='<div class="dm-head"><b>Metronome</b><span class="mdots dm-dots" id="dmDots" aria-hidden="true"></span></div>'+
 '<div class="dm-bpm"><button class="btn" id="dmMinus" aria-label="Slower">&minus;</button><span><input type="number" id="dmBpmN" min="30" max="240" aria-label="Tempo in beats per minute"> bpm</span><button class="btn" id="dmPlus" aria-label="Faster">+</button></div>'+
 '<input type="range" id="dmBpm" min="30" max="240" step="1" aria-label="Tempo slider">'+
 '<div class="dm-row"><button class="btn primary" id="dmGo">Start</button><button class="btn" id="dmTap">Tap tempo</button><label>Time<select id="dmSig"></select></label></div>'+
 '<label class="dm-click"><input type="checkbox" id="dmClick" checked> Click along with Play</label>';
function faBuildMetro(){
  if($('#drMetro')) return;
  var park=$('#faPark'); if(!park){ park=document.createElement('div'); park.id='faPark'; park.hidden=true; document.body.appendChild(park); }
  var mb=document.createElement('div'); mb.id='drMetro'; mb.className='dr-metro'; mb.setAttribute('role','group'); mb.setAttribute('aria-label','Drill metronome'); mb.innerHTML=FA_METRO; park.appendChild(mb);
  FA.click=save.pathClick!==false; PK_CLICK_SYNC(); $('#dmClick').checked=FA.click;
  var sel=$('#dmSig'); SIGS.slice().sort(function(a,b){return a[1]-b[1]||a[0]-b[0]}).forEach(function(s){var o=document.createElement('option'); o.value=s[0]+'/'+s[1]; o.textContent=s[0]+'/'+s[1]; sel.appendChild(o)});
  sel.addEventListener('change',function(){ var p=this.value.split('/'); MT.num=+p[0]; MT.den=+p[1]; metroSet('num',+p[0]); MT.den=+p[1]; metroSet('den',+p[1]); $('#mSig').value=this.value; });
  $('#dmBpm').addEventListener('input',function(){ metroSet('bpm',+this.value); });
  $('#dmBpmN').addEventListener('change',function(){ metroSet('bpm',+this.value||MT.bpm); });
  $('#dmMinus').addEventListener('click',function(){ metroSet('bpm',MT.bpm-1); });
  $('#dmPlus').addEventListener('click',function(){ metroSet('bpm',MT.bpm+1); });
  $('#dmGo').addEventListener('click',function(){ FA_ENG.ownClick=false; MT.on?metroStop():metroStart(); });
  $('#dmTap').addEventListener('click',function(){ $('#mTap').click(); });
  $('#dmClick').addEventListener('change',function(){ FA.click=this.checked; PK_CLICK_SYNC(); save.pathClick=this.checked; persist(); });
}
function PK_CLICK_SYNC(){ if(window.PK) PK.click=FA.click; }
function faBuild(){
  if(FA.built) return; FA.built=true;
  faBuildMetro();
  var park=$('#faPark');
  var blk=document.createElement('div'); blk.id='faBlock'; blk.innerHTML=FA_BLOCK; park.appendChild(blk);
  FA.board=createBoard($('#boardD'),function(s,f){ pluck(OPEN[s]+f); FA.board.vib(s); });
  $('#dPlay').addEventListener('click',function(){ FA.playing?faPause():faPlay(); });
  $('#dRestart').addEventListener('click',function(){ faPause(); FA.i=-1; faRender(-1); });
  $('#dPrev').addEventListener('click',function(){ faPause(); if(FA.i<=0){ FA.i=-1; faRender(-1); return; } FA.i--; faNote(FA.i,faClock()); });
  $('#dNext').addEventListener('click',function(){ faPause(); if(FA.i>=FA.flat.length-1) return; FA.i++; faNote(FA.i,faClock()); });
  $('#dLoop').addEventListener('change',function(){ FA.loop=this.checked; });
  $('#dPer').addEventListener('change',function(){ FA.per=+this.value; });
}
/* show a sequence in a screen: slot gets the board block, metroSlot gets the metronome box.
   spec = {id, phrases, stages?:[{name,tip}], tip?, per?, loop?, noPlay?, onRound?} (phrase.si = index into stages) */
function faMount(slot,metroSlot,spec){
  faBuild(); faPause(); if(window.pkPark) pkPark(); FA_ENG=FA;
  slot.appendChild($('#faBlock')); metroSlot.appendChild($('#drMetro')); document.body.classList.add('on-drill'); FA.mounted=true;
  FA.spec=spec; FA.phrases=spec.phrases; FA.flat=[];
  FA.phrases.forEach(function(ph,p){ ph.steps.forEach(function(st,k){ FA.flat.push({p:p,k:k,s:st.s,f:st.f,fin:st.fin,t:st.t}); }); });
  FA.per=spec.per||1; FA.loop=spec.loop!==false; FA.i=-1; FA.drawnP=-1; FA.drawnI=-2;
  $('#dPer').value=FA.per; $('#dLoop').checked=FA.loop; $('#dmClick').checked=FA.click; $('#dPlay').hidden=!!spec.noPlay;
  var st=$('#dStage'); st.innerHTML=''; st.hidden=!(spec.stages&&spec.stages.length>1);
  (spec.stages||[]).forEach(function(s,i){ var c=document.createElement('span'); c.className='chip'; c.textContent=(spec.stages.length>1?(i+1)+'. ':'')+s.name; c.title=s.tip||''; st.appendChild(c); });
  $('#dmSig').value=MT.num+'/'+MT.den; faMetroSync(); faRender(-1);
}
function faPark(){
  var p=$('#faPark'); if(!p) return; faPause(); if(window.pkPause) pkPause();
  ['#faBlock','#pkBlock','#drMetro'].forEach(function(id){ var e=$(id); if(e) p.appendChild(e); });
  document.body.classList.remove('on-drill'); FA.mounted=false; if(window.PK) PK.mounted=false;
}
function faUnmount(){ if(FA.mounted||(window.PK&&PK.mounted)) faPark(); }
function faPlayLabel(){ var b=$('#dPlay'); b.textContent=FA.playing?'Pause':(FA.i>=FA.flat.length-1&&FA.i>=0?'Play again':(FA.i>=0?'Resume':'Play')); b.setAttribute('aria-pressed',FA.playing?'true':'false'); }
/* draw note i on the neck (i = -1: the start position, nothing played yet) */
function faLink(ph,j){
  var a=ph.steps[j-1], c=ph.steps[j]; if(a.s===c.s&&a.f===c.f) return;
  FA.board.link([a.s,a.f],[c.s,c.f],c.t,true);
}
function faRender(i){
  var b=FA.board, loc=i>=0?FA.flat[i]:{p:0,k:-1}, ph=FA.phrases[loc.p], np=FA.phrases[loc.p+1];
  function orb(j,kind){ var st=ph.steps[j]; b.orb('n'+j,{s:st.s,f:st.f,kind:kind,label:String(st.f)}); }
  if(FA.drawnP===loc.p&&i===FA.drawnI+1&&loc.k>0){
    orb(loc.k-1,'found'); orb(loc.k,'root'); faLink(ph,loc.k);
  } else {
    b.clearOrbs(); b.clearLinks();
    ph.steps.forEach(function(_,j){ if(j>loc.k) orb(j,'ghost'); });
    ph.steps.forEach(function(_,j){ if(j<loc.k) orb(j,'found'); });
    if(loc.k>=0) orb(loc.k,'root');
    for(var j=1;j<=loc.k;j++) faLink(ph,j);
    if(np) b.orb('nx',{s:np.steps[0].s,f:np.steps[0].f,kind:'hint'});   /* where the next group starts */
  }
  FA.drawnP=loc.p; FA.drawnI=i;
  var now=$('#dNow'), sub=$('#dNowSub');
  function where(n){ return FA_STR[n.s]+' string, '+(n.f===0?'open':'fret '+n.f); }
  function fingerText(n){ return n.fin>0?(FA_FINGER[n.fin-1][0].toUpperCase()+FA_FINGER[n.fin-1].slice(1)+' finger ('+n.fin+'). '):(n.fin===0?'Open string, no finger. ':''); }
  if(i<0){ var f0=ph.steps[0]; now.textContent='Press '+(FA.spec&&FA.spec.noPlay?'Start the timer':'Play'); sub.textContent='First note: '+where(f0)+'. '+fingerText(f0); }
  else {
    var n=FA.flat[i], verb={h:'Hammer on: ',p:'Pull off to: ','/':'Slide to: '}[n.t]||'';
    now.textContent=verb+where(n);
    sub.textContent=fingerText(n)+(n.t==='h'?'Do not pick it, bring the finger down firmly. ':(n.t==='p'?'Flick the string as you lift the finger. ':(n.t==='/'?'Keep the finger pressed while you slide. ':'')))+'Group '+(loc.p+1)+' of '+FA.phrases.length+', note '+(i+1)+' of '+FA.flat.length+'.';
  }
  var seq=$('#dSeq'); seq.innerHTML=''; ph.steps.forEach(function(st,j){ var c=document.createElement('span'); c.className='chip'+(j<loc.k?' ok':(j===loc.k?' on':'')); c.textContent=st.f+(st.t==='/'?'/':st.t); c.title=(st.fin>0?FA_FINGER[st.fin-1]+' finger':''); seq.appendChild(c); });
  var chips=$('#dStage').children; for(var s=0;s<chips.length;s++) chips[s].className='chip'+(s<ph.si?' ok':(s===ph.si?' on':''));
  var stg=FA.spec&&FA.spec.stages&&FA.spec.stages[ph.si||0]; $('#dTip').textContent=(FA.spec&&FA.spec.tip)||(stg&&stg.tip)||'';
  $('#dProg').style.width=(Math.max(0,i+1)/FA.flat.length*100)+'%';
  faPlayLabel();
}
function faNote(i,at){
  faRender(i); var n=FA.flat[i];
  pluck(OPEN[n.s]+n.f,Math.max(0,at-faClock()),n.t?.5:.85);   /* hammer-ons, pull-offs and slides are not picked, so they sound softer */
  FA.board.vib(n.s); FA.board.burst(n.s,n.f,'#e6b95f');
}
function faPlay(){
  if(!FA.flat.length) return;
  initAudio(); if(FA.i>=FA.flat.length-1){ FA.i=-1; faRender(-1); }
  FA.playing=true; $('#dCap').setAttribute('aria-live','off');
  var start=faClock()+.12; FA.count=MT.num; FA.tNext=start; FA.ownClick=false;
  if(FA.click&&window.ac){ if(MT.on) metroStop(); metroStart(start); FA.ownClick=true; }
  clearInterval(FA.timer); FA.timer=setInterval(faTick,20); faPlayLabel();
}
function faTick(){
  var now=faClock();
  while(FA.playing&&FA.tNext<=now+.03){
    if(FA.count>0){   /* one bar of count-in, shown as numbers */
      var nb=MT.num-FA.count+1; $('#dNow').textContent='Get ready: '+nb; $('#dNowSub').textContent='The first note comes in after '+MT.num+' clicks.'; FA.count--; FA.tNext+=60/MT.bpm; continue;
    }
    if(FA.i>=FA.flat.length-1){
      if(FA.spec&&FA.spec.onRound) FA.spec.onRound();
      if(FA.loop){ FA.i=-1; FA.drawnP=-1; } else { faFinish(); return; }
    }
    FA.i++; faNote(FA.i,FA.tNext); FA.tNext+=faGap();
  }
}
function faFinish(){
  faPause(); $('#dNow').textContent='Round complete'; $('#dNowSub').textContent='Press Play again, or raise the tempo a few bpm if every note was clean.'; faPlayLabel();
}
function faPause(){
  FA.playing=false; clearInterval(FA.timer); FA.timer=0;
  if(FA.ownClick&&MT.on) metroStop(); FA.ownClick=false;
  if(FA.built){ $('#dCap').setAttribute('aria-live','polite'); faPlayLabel(); }
}
function faIsPlaying(){ return FA.playing; }
/* tempo or time signature changed while playing: restart the count so the notes stay on the clicks (called from metronome.js) */
function faTempo(){ var E=FA_ENG; if(!E.playing) return; E.count=0; E.tNext=(E.click&&MT.on)?MT.next:faClock()+.06; }
/* keep the metronome box in step with MT (called from metronome.js) */
function faMetroSync(){
  if(!$('#dmGo')) return;
  $('#dmBpm').value=MT.bpm; $('#dmBpmN').value=MT.bpm;
  var go=$('#dmGo'); go.textContent=MT.on?'Stop':'Start'; go.classList.toggle('primary',!MT.on);
  var spec=meterSpec(MT.num,MT.den), d=$('#dmDots'), h='';
  spec.levels.forEach(function(l,i){ h+='<i class="l'+l+'" data-i="'+i+'"></i>'; });
  if(d.children.length!==spec.levels.length||d.dataset.sig!==MT.num+'/'+MT.den){ d.innerHTML=h; d.dataset.sig=MT.num+'/'+MT.den; }
  if(!MT.on) for(var i=0;i<d.children.length;i++) d.children[i].classList.remove('on');
  $('#dmSig').value=MT.num+'/'+MT.den;
}
function faMetroBeat(idx){ var d=$('#dmDots'); if(!d) return; for(var i=0;i<d.children.length;i++) d.children[i].classList.toggle('on',i===idx); }
