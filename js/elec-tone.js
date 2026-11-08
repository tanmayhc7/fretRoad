/* Electric guitar: pickups and tone. An interactive lesson: set the pickup selector, the tone knob and the volume knob, then play the
   strings and hear how the sound changes. The route is #practice-electricpickups (view #v-elec); no guitar needed.
   The sound is a small physical model, not a recording:
   - A string vibrates in harmonics. A magnetic pickup under the string at distance x (a fraction of the string length, measured from the bridge)
     hears harmonic n with weight sin(n*pi*x): the pickup sits at a node of some harmonics and a peak of others, so a pickup near the bridge sounds
     thin and bright and one near the neck sounds round and full. Two pickups on together add their weights, which makes notches (the "quack").
   - A pickup is also a coil, so it has a resonant peak, and a wide coil (a humbucker) smooths out the highest harmonics.
   - The tone knob is a low-pass filter. The volume knob comes before the amp's overdrive, so turning it down also cleans the sound up.
   Loaded after drills-pick.js. */
var EL={gt:'strat',pos:{strat:0,lp:0},vol:8,tone:10,drive:false,f0:110,note:'A string',blind:null,score:{ok:0,n:0},steps:{},timers:[],built:false};
if(window.__FRETROAD_TEST) window.__FRETROAD_TEST.EL=EL;
/* x = pickup centre as a fraction of the string length from the bridge; w = coil width as a fraction (wide coils lose the highest harmonics);
   fr, q = coil resonance; g = output */
var EL_G={
  strat:{name:'Strat-style',blurb:'Three single-coil pickups and a 5-way switch.',out:1,
    pickups:{bridge:{label:'Bridge',x:.065,w:.010,fr:4600,q:1.6,g:1,h:16},mid:{label:'Middle',x:.150,w:.010,fr:4600,q:1.6,g:.95,h:16},neck:{label:'Neck',x:.245,w:.010,fr:4300,q:1.5,g:.95,h:16}},
    pos:[
      {id:'bridge',name:'Bridge',use:['bridge'],text:'Bright, sharp and twangy. The pickup sits close to the bridge, where the string moves least, so it hears thin, biting highs and little of the low, round part of the note.',good:'Lead lines that cut through, country twang, rock rhythm.'},
      {id:'bm',name:'Bridge + middle',use:['bridge','mid'],text:'Glassy and quacky. With two pickups on, some harmonics cancel, which leaves a hollow, chiming, almost out-of-phase sound. It is the famous in-between "quack" of the 5-way switch.',good:'Funk rhythm, clean sparkly chords.'},
      {id:'mid',name:'Middle',use:['mid'],text:'Smooth and a little hollow: less bite than the bridge, less warmth than the neck.',good:'Clean rhythm playing.'},
      {id:'mn',name:'Middle + neck',use:['mid','neck'],text:'The same quack as position 2, but warmer and rounder because the neck pickup is in the mix.',good:'Soft clean chords, mellow blues.'},
      {id:'neck',name:'Neck',use:['neck'],text:'Round, warm and full. The pickup sits under the loudest part of the string, so it hears a strong low note and softer highs.',good:'Smooth leads, blues, jazzy chords.'}]},
  lp:{name:'Les Paul-style',blurb:'Two humbuckers and a 3-way switch.',out:1.35,
    pickups:{bridge:{label:'Bridge',x:.060,w:.030,fr:2900,q:1.1,g:1.5,h:26},neck:{label:'Neck',x:.215,w:.030,fr:2600,q:1.0,g:1.4,h:26}},
    pos:[
      {id:'bridge',name:'Bridge',use:['bridge'],text:'Thick, bright and punchy. A humbucker is two coils wired to cancel hum. It has more output and a thicker midrange than a single coil, so it is a little less glassy.',good:'Driving, distorted rhythm and lead.'},
      {id:'both',name:'Both',use:['bridge','neck'],text:'Balanced: bright but full. Both pickups together give the classic all-round sound.',good:'Rhythm playing in any style.'},
      {id:'neck',name:'Neck',use:['neck'],text:'Warm, dark and creamy. The neck humbucker is wide and far from the bridge, so the highs are soft.',good:'Smooth lead lines, jazz.'}]}
};
var EL_STR=[{n:'6 · low E',m:40},{n:'5 · A',m:45},{n:'4 · D',m:50},{n:'3 · G',m:55},{n:'2 · B',m:59},{n:'1 · high E',m:64}];
var EL_CH={em:{label:'Strum Em',midi:[40,47,52,55,59,64]},pw:{label:'Power chord',midi:[40,47,52]}};
var EL_STEPS=[
  {id:'bridge',t:'Play a string with the bridge pickup.'},
  {id:'neck',t:'Switch to the neck pickup and play the same string. Hear it get rounder.'},
  {id:'both',t:'Try an in-between position, with two pickups on (the quack).'},
  {id:'tone',t:'Roll the tone knob down below 4 and play. The highs disappear.'},
  {id:'drive',t:'Turn on overdrive and play the power chord. Then turn the volume down and listen to it clean up.'}];
function elG(){ return EL_G[EL.gt]; }
function elPosIdx(){ return EL.blind&&!EL.blind.done?EL.blind.pos:EL.pos[EL.gt]; }
function elMidi(m){ return 440*Math.pow(2,(m-69)/12); }
function elToneHz(t){ return 400*Math.pow(30,t/10); }               /* tone 0 = 400 Hz, 10 = 12 kHz */
function elToneMag(f,t){ var fc=elToneHz(t),r=f/fc; return 1/Math.sqrt(1+r*r*r*r); }
function elRes(f,pk){ var r=f/pk.fr; return 1/Math.sqrt(Math.pow(1-r*r,2)+Math.pow(r/pk.q,2)); }
/* the signed weight of every harmonic of a string at f0 for a pickup position (the tone knob is not included: it is a real filter) */
function elHarm(gt,posIdx,f0){
  var G=EL_G[gt],P=G.pos[posIdx],a=[],n,N=Math.max(4,Math.min(40,Math.floor(14000/f0)));
  for(n=1;n<=N;n++){
    var s=0,f=n*f0; P.use.forEach(function(id){ var k=G.pickups[id],t=n*Math.PI*k.w,sinc=t?Math.sin(t)/t:1; s+=k.g*Math.sin(n*Math.PI*k.x)*sinc*elRes(f,k); });
    a.push(s*Math.sin(n*Math.PI*.12)/n);                          /* the pick plucks the string 12% of its length from the bridge */
  }
  var L=Math.sqrt(a.reduce(function(t,v){return t+v*v},0))||1;
  return a.map(function(v){return v/L});                           /* equal total energy for every position, so only the shape differs */
}
/* how bright a setting is: the energy-weighted average harmonic number after the tone filter */
function elBright(gt,posIdx,f0,tone){
  var a=elHarm(gt,posIdx,f0),num=0,den=0; a.forEach(function(v,i){ var m=elToneMag((i+1)*f0,tone),e=v*v*m*m; num+=(i+1)*e; den+=e; });
  return den?num/den:1;
}
if(window.__FRETROAD_TEST){ window.__FRETROAD_TEST.elBright=elBright; window.__FRETROAD_TEST.elHarm=elHarm; }
function elClearTimers(){ EL.timers.forEach(clearTimeout); EL.timers=[]; }
/* play one note (a midi number) with the current settings, d seconds from now */
function elVoice(m,d,vel){
  if(!soundOn) return; initAudio(); if(!ac) return; if(ac.state==='suspended') ac.resume();
  var f0=elMidi(m),a=elHarm(EL.gt,elPosIdx(),f0),G=elG(),real=new Float32Array(a.length+1),imag=new Float32Array(a.length+1);
  a.forEach(function(v,i){ imag[i+1]=v; });
  var wave=ac.createPeriodicWave(real,imag,{disableNormalization:true}), t0=ac.currentTime+(d||0)+.005;
  var o=ac.createOscillator(); o.setPeriodicWave(wave); o.frequency.value=f0;
  var env=ac.createGain(); env.gain.setValueAtTime(0,t0); env.gain.linearRampToValueAtTime(.34*G.out*(vel||.8),t0+.004); env.gain.exponentialRampToValueAtTime(.0008,t0+2.6);
  var str=ac.createBiquadFilter(); str.type='lowpass'; str.Q.value=.5; str.frequency.setValueAtTime(11000,t0); str.frequency.exponentialRampToValueAtTime(1500,t0+1.6);
  var tone=ac.createBiquadFilter(); tone.type='lowpass'; tone.Q.value=.707; tone.frequency.value=elToneHz(EL.tone);
  var vol=ac.createGain(); vol.gain.value=Math.pow(EL.vol/10,1.6);
  o.connect(env); env.connect(str); str.connect(tone); tone.connect(vol);
  if(EL.drive){
    var pre=ac.createGain(); pre.gain.value=9; var sh=ac.createWaveShaper(),c=new Float32Array(1024); for(var i=0;i<1024;i++){ var x=i/512-1; c[i]=Math.tanh(x*3); } sh.curve=c; sh.oversample='4x';
    var post=ac.createGain(); post.gain.value=.55; vol.connect(pre); pre.connect(sh); sh.connect(post); post.connect(master);
  } else vol.connect(master);
  o.start(t0); o.stop(t0+2.8);
}
function elPlayList(list,gap,label){
  elVoiceList(list,gap); EL.note=label; EL.f0=elMidi(list[0]); elNoteCheck(list.length>3?'chord':(list.length===3?'power':'single')); elDraw();
}
function elVoiceList(list,gap){ list.forEach(function(m,i){ elVoice(m,i*(gap||0),.8); }); }
/* the lesson checklist */
function elNoteCheck(kind){
  if(EL.blind&&!EL.blind.done) return;
  var P=elG().pos[EL.pos[EL.gt]],id=P.id,s=EL.steps;
  if(id==='bridge') s.bridge=true; if(id==='neck') s.neck=true; if(id==='bm'||id==='mn'||id==='both') s.both=true;
  if(EL.tone<=4) s.tone=true; if(EL.drive&&EL.vol>0) s.drive=true;
  elSteps();
  if(EL_STEPS.every(function(x){return s[x.id]})&&!save.elecDone){ save.elecDone=true; persist(); toast('Pickup lesson complete. Now try the blind test.'); }
}
function elSteps(){
  var ul=$('#elSteps'); if(!ul) return; var n=0;
  EL_STEPS.forEach(function(x,i){ var li=ul.children[i], on=!!EL.steps[x.id]; if(on) n++; li.className=on?'on':''; li.querySelector('b').textContent=on?'✓':String(i+1); });
  $('#elStepN').textContent=n+' of '+EL_STEPS.length;
}
/* ---------- drawing ---------- */
/* the guitar is drawn lying down: neck on the left, bridge on the right, high E on top (like tab). x = fraction of the string length from the bridge */
var EL_NUT=44,EL_BR=534,EL_L=EL_BR-EL_NUT,EL_SY=[40,76,112,148,184,220];
function elPX(x){ return EL_BR-x*EL_L; }
function elSvgGuitar(){
  var G=elG(),h='<svg id="elGt" viewBox="0 0 580 290" role="img" aria-label="An electric guitar lying down, neck on the left, with the pickups lit that are switched on. Click a string to pluck it.">';
  h+='<path class="el-body" d="M338 78 C338 24 402 14 440 22 C484 14 552 24 562 78 C578 118 578 168 562 208 C552 262 484 272 440 264 C402 272 338 262 338 212 C350 176 350 114 338 78Z"/>';
  h+='<rect class="el-neck" x="'+EL_NUT+'" y="22" width="300" height="236"/>';
  for(var f=1;f<=12;f++){ var fx=EL_NUT+EL_L*(1-Math.pow(2,-f/12)); if(fx>338) break; h+='<line class="el-fret" x1="'+fx.toFixed(1)+'" x2="'+fx.toFixed(1)+'" y1="22" y2="258"/>'; if([3,5,7,9].indexOf(f)>=0) h+='<circle class="el-dot" cx="'+(fx-EL_L*(Math.pow(2,-(f-1)/12)-Math.pow(2,-f/12))/2).toFixed(1)+'" cy="130" r="4"/>'; }
  h+='<rect class="el-nut" x="'+(EL_NUT-4)+'" y="22" width="5" height="236"/>';
  Object.keys(G.pickups).forEach(function(id){ var k=G.pickups[id],x=elPX(k.x); h+='<g class="el-pk" data-pk="'+id+'"><rect x="'+(x-k.h/2)+'" y="14" width="'+k.h+'" height="252" rx="6"/><text x="'+x+'" y="284" text-anchor="middle">'+k.label+'</text></g>'; });
  h+='<rect class="el-bridge" x="'+(EL_BR-3)+'" y="22" width="9" height="236" rx="3"/>';
  var nm=['e','B','G','D','A','E'];
  for(var s=0;s<6;s++){ var y=EL_SY[s]; h+='<g class="el-sg" data-s="'+s+'"><text class="el-sn" x="20" y="'+(y+4)+'" text-anchor="middle">'+nm[s]+'</text><line class="el-str" x1="'+EL_NUT+'" x2="'+(EL_BR+2)+'" y1="'+y+'" y2="'+y+'" stroke-width="'+[1.2,1.6,2.1,2.8,3.4,4][s]+'"/><rect x="2" y="'+(y-17)+'" width="'+(EL_BR+8)+'" height="34" fill="transparent"/></g>'; }
  return h+'</svg>';
}
function elSvgPlate(){
  var G=elG(),n=G.pos.length,h='<svg id="elPlate" viewBox="0 0 440 150" role="group" aria-label="Controls: pickup selector, volume and tone">';
  h+='<rect class="el-plate" x="2" y="2" width="436" height="146" rx="16"/>';
  var x0=44,x1=224,gap=(x1-x0)/(n-1);
  h+='<text class="el-lb" x="'+(x0+(x1-x0)/2)+'" y="24" text-anchor="middle">Pickup selector</text><rect class="el-slot" x="'+(x0-8)+'" y="54" width="'+(x1-x0+16)+'" height="14" rx="7"/>';
  for(var i=0;i<n;i++){ var cx=x0+i*gap; h+='<g class="el-notch" data-i="'+i+'"><circle cx="'+cx+'" cy="61" r="4"/><text x="'+cx+'" y="94" text-anchor="middle">'+(i+1)+'</text><rect x="'+(cx-gap/2)+'" y="40" width="'+gap+'" height="62" fill="transparent"/></g>'; }
  h+='<g id="elLever" class="el-lever" tabindex="0" role="slider" aria-label="Pickup selector" aria-valuemin="1" aria-valuemax="'+n+'"><rect x="-8" y="38" width="16" height="46" rx="6"/><line x1="0" x2="0" y1="46" y2="76"/></g>';
  h+='<text class="el-lb" x="'+x0+'" y="124" text-anchor="middle">Bridge</text><text class="el-lb" x="'+x1+'" y="124" text-anchor="middle">Neck</text>';
  [['vol','Volume',308],['tone','Tone',388]].forEach(function(k){
    h+='<g class="el-knob" id="elK_'+k[0]+'" data-k="'+k[0]+'" transform="translate('+k[2]+' 66)" tabindex="0" role="slider" aria-label="'+k[1]+'" aria-valuemin="0" aria-valuemax="10"><circle class="kb" r="26"/><g class="ticks">';
    for(var t=0;t<=10;t++){ var an=(-135+t*27)*Math.PI/180; h+='<line x1="'+(Math.sin(an)*31).toFixed(1)+'" y1="'+(-Math.cos(an)*31).toFixed(1)+'" x2="'+(Math.sin(an)*35).toFixed(1)+'" y2="'+(-Math.cos(an)*35).toFixed(1)+'"/>'; }
    h+='</g><line class="ptr" x1="0" y1="-6" x2="0" y2="-22"/></g><text class="el-lb" x="'+k[2]+'" y="124" text-anchor="middle">'+k[1]+' <tspan class="kv" id="elV_'+k[0]+'"></tspan></text>';
  });
  return h+'</svg>';
}
function elBuild(){
  if(EL.built) return; EL.built=true; var root=$('#elRoot');
  root.innerHTML='<div class="lv-head"><button class="btn" id="eBack">Back to the map</button><span class="where">Practice · Beginner</span></div>'+
   '<h1>Electric guitar: pickups and tone</h1><p class="jsub">Set the switch and the knobs, then pluck the strings. Nothing here needs a guitar: listen to how the same note changes.</p>'+
   '<div class="el-grid"><div class="el-left card"><div id="elGtHost"></div><div id="elPlateHost"></div></div>'+
   '<div class="el-right">'+
    '<div class="el-seg" role="group" aria-label="Guitar type" id="elTypes"></div>'+
    '<div class="card el-info" aria-live="polite"><h2 id="elPosName"></h2><p id="elPosText"></p><p class="jsub" id="elPosGood"></p><p class="jsub" id="elKnobText"></p></div>'+
    '<div class="card"><div class="el-posrow" role="radiogroup" aria-label="Pickup position" id="elPosBtns"></div>'+
     '<div class="el-play" id="elStrings"></div>'+
     '<div class="el-play"><button class="btn" id="elEm"></button><button class="btn" id="elPw"></button><label class="chk"><input type="checkbox" id="elDrive"> Overdrive</label></div>'+
     '<div class="el-play"><button class="btn primary" id="elAll">Hear every position</button><button class="btn" id="elBlind">Blind test</button></div>'+
     '<p class="jsub" id="elBlindMsg" aria-live="polite"></p></div>'+
    '<div class="card"><h3 class="el-h">What you are hearing</h3><div class="el-meter"><span>Dark</span><div class="mt"><i id="elBr"></i></div><span>Bright</span></div><svg id="elSpec" viewBox="0 0 240 70" role="img" aria-label="The strength of each harmonic of the note"></svg><p class="jsub" id="elSpecNote"></p></div>'+
    '<div class="card"><h3 class="el-h">Try this <span class="jsub" id="elStepN"></span></h3><ol class="el-steps" id="elSteps"></ol></div>'+
   '</div></div>';
  $('#eBack').addEventListener('click',function(){ location.hash='map'; });
  Object.keys(EL_G).forEach(function(k){ var b=document.createElement('button'); b.type='button'; b.className='btn lvlseg'; b.dataset.gt=k; b.textContent=EL_G[k].name; b.addEventListener('click',function(){ elStop(); EL.blind=null; EL.gt=k; elRebuild(); }); $('#elTypes').appendChild(b); });
  EL_STR.forEach(function(s,i){ var b=document.createElement('button'); b.type='button'; b.className='btn el-s'; b.textContent=s.n; b.addEventListener('click',function(){ elStop(false); elPlayList([s.m],0,s.n.replace(/^\d · /,'')+' string'); elWobble(5-i); }); $('#elStrings').appendChild(b); });
  $('#elEm').textContent=EL_CH.em.label; $('#elPw').textContent=EL_CH.pw.label;
  $('#elEm').addEventListener('click',function(){ elStop(false); elPlayList(EL_CH.em.midi,.035,'Em chord'); EL_CH.em.midi.forEach(function(m,i){ elWobble(5-i); }); });
  $('#elPw').addEventListener('click',function(){ elStop(false); elPlayList(EL_CH.pw.midi,.02,'power chord'); [5,4,3].forEach(elWobble); });
  $('#elDrive').addEventListener('change',function(){ EL.drive=this.checked; elDraw(); });
  $('#elAll').addEventListener('click',elHearAll);
  $('#elBlind').addEventListener('click',elBlindStart);
  elRebuild();
}
function elRebuild(){
  $('#elGtHost').innerHTML=elSvgGuitar(); $('#elPlateHost').innerHTML=elSvgPlate();
  var pb=$('#elPosBtns'); pb.innerHTML='';
  elG().pos.forEach(function(P,i){ var b=document.createElement('button'); b.type='button'; b.className='btn el-p'; b.setAttribute('role','radio'); b.dataset.i=i; b.innerHTML='<b>'+(i+1)+'</b> '+P.name; b.addEventListener('click',function(){ elChoose(i); }); pb.appendChild(b); });
  var ul=$('#elSteps'); ul.innerHTML=''; EL_STEPS.forEach(function(x){ var li=document.createElement('li'); li.innerHTML='<b></b><span></span>'; li.querySelector('span').textContent=x.t; ul.appendChild(li); });
  document.querySelectorAll('#elGt .el-sg').forEach(function(g){ g.addEventListener('pointerdown',function(){ var s=+g.dataset.s; elStop(false); elPlayList([EL_STR[5-s].m],0,EL_STR[5-s].n.replace(/^\d · /,'')+' string'); elWobble(s); }); });
  document.querySelectorAll('#elPlate .el-notch').forEach(function(g){ g.addEventListener('click',function(){ elChoose(+g.dataset.i); }); });
  var lv=$('#elLever'); lv.addEventListener('keydown',function(e){ var n=elG().pos.length,i=EL.pos[EL.gt]; if(e.key==='ArrowRight'||e.key==='ArrowUp') elChoose(Math.min(n-1,i+1)); else if(e.key==='ArrowLeft'||e.key==='ArrowDown') elChoose(Math.max(0,i-1)); else return; e.preventDefault(); });
  var drag=false; function leverTo(e){ var svg=$('#elPlate'),r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*440,n=elG().pos.length,x0=44,x1=224,i=Math.round((x-x0)/((x1-x0)/(n-1))); elChoose(Math.max(0,Math.min(n-1,i))); }
  lv.addEventListener('pointerdown',function(e){ drag=true; lv.setPointerCapture(e.pointerId); e.preventDefault(); lv.focus(); });
  lv.addEventListener('pointermove',function(e){ if(drag) leverTo(e); });
  lv.addEventListener('pointerup',function(){ drag=false; }); lv.addEventListener('pointercancel',function(){ drag=false; });
  ['vol','tone'].forEach(function(k){
    var g=$('#elK_'+k),on=false;
    function setFrom(e){ var r=g.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,a=Math.atan2(e.clientX-cx,-(e.clientY-cy))*180/Math.PI; if(a>135||a<-135) a=a>0?135:-135; EL[k]=Math.round((a+135)/27*2)/2; elDraw(); }
    g.addEventListener('pointerdown',function(e){ on=true; g.setPointerCapture(e.pointerId); g.focus(); setFrom(e); e.preventDefault(); });
    g.addEventListener('pointermove',function(e){ if(on) setFrom(e); });
    g.addEventListener('pointerup',function(){ on=false; }); g.addEventListener('pointercancel',function(){ on=false; });
    g.addEventListener('keydown',function(e){ var d=(e.key==='ArrowRight'||e.key==='ArrowUp')?1:((e.key==='ArrowLeft'||e.key==='ArrowDown')?-1:0); if(!d) return; EL[k]=Math.max(0,Math.min(10,EL[k]+d)); elDraw(); e.preventDefault(); });
  });
  elDraw(); elSteps();
}
function elWobble(s){ var g=document.querySelector('#elGt .el-sg[data-s="'+s+'"] .el-str'); if(!g) return; g.classList.remove('hit'); void g.getBoundingClientRect(); g.classList.add('hit'); setTimeout(function(){ g.classList.remove('hit'); },420); }
function elChoose(i){
  if(EL.blind&&!EL.blind.done){ elBlindAnswer(i); return; }
  elStop(false); EL.pos[EL.gt]=i; elDraw();
}
function elDraw(){
  var G=elG(),n=G.pos.length,i=elPosIdx(),P=G.pos[i],shown=(EL.blind&&!EL.blind.done)?-1:EL.pos[EL.gt];
  var blind=EL.blind&&!EL.blind.done;
  document.querySelectorAll('#elTypes .lvlseg').forEach(function(b){ var on=b.dataset.gt===EL.gt; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false'); });
  document.querySelectorAll('#elGt .el-pk').forEach(function(g){ g.classList.toggle('on',!blind&&G.pos[shown].use.indexOf(g.dataset.pk)>=0); });
  document.querySelectorAll('#elPosBtns .el-p').forEach(function(b){ var on=(+b.dataset.i===shown); b.classList.toggle('on',on); b.setAttribute('aria-checked',on?'true':'false'); });
  var x0=44,x1=224,lx=shown<0?(x0+x1)/2:x0+shown*(x1-x0)/(n-1), lv=$('#elLever');
  lv.setAttribute('transform','translate('+lx+' 0)'); lv.setAttribute('aria-valuenow',shown<0?'':shown+1); lv.setAttribute('aria-valuetext',blind?'hidden during the blind test':(shown+1)+', '+P.name);
  lv.classList.toggle('hid',blind);
  document.querySelectorAll('#elPlate .el-notch').forEach(function(g){ g.classList.toggle('on',+g.dataset.i===shown); });
  ['vol','tone'].forEach(function(k){ var g=$('#elK_'+k); g.querySelector('.ptr').setAttribute('transform','rotate('+(-135+EL[k]*27)+')'); g.setAttribute('aria-valuenow',EL[k]); $('#elV_'+k).textContent=EL[k]; });
  $('#elPosName').textContent=blind?'Blind test':(shown+1)+' · '+P.name;
  $('#elPosText').textContent=blind?'The position is hidden. Listen, then press the position button you think it was. The tone and volume knobs and overdrive still count.':P.text;
  $('#elPosGood').textContent=blind?'':'Good for: '+P.good;
  $('#elKnobText').textContent='Tone is a filter that removes treble: at '+EL.tone+' it is '+(EL.tone>=8?'wide open and bright':(EL.tone>=4?'a little rounded':'dark and muffled'))+'. Volume '+EL.vol+(EL.drive?': with overdrive on, a lower volume feeds the amp less signal, so it sounds cleaner.':'.');
  $('#elDrive').checked=EL.drive;
  /* the harmonics of the last note, after the pickups and the tone filter */
  var a=elHarm(EL.gt,i,EL.f0),M=[],mx=0; a.forEach(function(v,k){ var m=Math.abs(v)*elToneMag((k+1)*EL.f0,EL.tone); M.push(m); if(m>mx) mx=m; });
  var sp=$('#elSpec'),bars='',H=Math.min(24,M.length),w=240/H;
  for(var k=0;k<H;k++){ var hh=Math.max(1,Math.pow(M[k]/.55,.6)*64); bars+='<rect x="'+(k*w+1)+'" y="'+(68-hh)+'" width="'+(w-2)+'" height="'+hh+'" rx="1.5"/>'; }
  sp.innerHTML=bars; $('#elSpecNote').textContent='Harmonics 1 to '+H+' of the '+EL.note+', after the pickups and the tone knob. Tall bars on the right are treble.';
  var br=elBright(EL.gt,i,EL.f0,EL.tone); $('#elBr').style.width=Math.max(4,Math.min(100,(br-1)/5*100))+'%';
}
function elStop(keepBlind){ elClearTimers(); }
/* play the same chord through every position, one after the other */
function elHearAll(){
  elClearTimers(); EL.blind=null; $('#elBlindMsg').textContent=''; var G=elG(),keep=EL.pos[EL.gt];
  G.pos.forEach(function(P,i){
    EL.timers.push(setTimeout(function(){ EL.pos[EL.gt]=i; $('#elBlindMsg').textContent='Position '+(i+1)+': '+P.name; elPlayList([EL_CH.em.midi[3]],0,'G string'); elWobble(2); },i*1500));
  });
  EL.timers.push(setTimeout(function(){ $('#elBlindMsg').textContent='That was every position on the same note. Which one do you like?'; },G.pos.length*1500));
}
/* blind test: a hidden position plays on a random string; choose which one it was */
function elBlindStart(){
  elClearTimers(); var n=elG().pos.length; EL.blind={pos:Math.floor(Math.random()*n),done:false,m:EL_STR[Math.floor(Math.random()*6)].m};
  $('#elBlindMsg').textContent='Listen... then press the position you think it was.'; elDraw(); elBlindPlay();
}
function elBlindPlay(){ if(!EL.blind) return; elVoice(EL.blind.m,0,.8); EL.f0=elMidi(EL.blind.m); }
function elBlindAnswer(i){
  var b=EL.blind,P=elG().pos[b.pos]; b.done=true; EL.score.n++; var ok=(i===b.pos); if(ok) EL.score.ok++;
  EL.pos[EL.gt]=b.pos; $('#elBlindMsg').textContent=(ok?'Right: ':'It was ')+(b.pos+1)+' · '+P.name+'. '+EL.score.ok+' of '+EL.score.n+' so far. Press Blind test for another.'; elDraw();
}
function showElec(M){
  showView('elec'); updateStat(); elBuild(); EL.blind=null; elClearTimers(); $('#elBlindMsg').textContent=''; elDraw(); elSteps();
}
var _elLeave=null;
PRACTICE.push({id:'electricpickups',name:'Electric Guitar: Pickups and Tone',desc:'Turn the pickup switch and the tone and volume knobs, pluck the strings and hear how the sound changes.',needs:0,kind:'elec',tier:'Beginner',rounds:0});
