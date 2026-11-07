/* Metronome with time signatures */
/* ======== metronome ======== */
function meterSpec(num,den){
  var lv,beatUnit='quarter note',count;
  if(den===8&&(num===6||num===9||num===12)){
    var nb=num/3; lv=[]; for(var i=0;i<nb;i++) lv.push(i===0?2:(num===12&&i===2?1:0)); beatUnit='dotted quarter'; count=nb+' big beats, each with three eighth notes';
    return {levels:lv,sub:3,unit:beatUnit,count:count};
  }
  if(den===8){ var g=num===7?[2,2,3]:(num===5?[3,2]:[num]); lv=[]; g.forEach(function(n,gi){for(var j=0;j<n;j++) lv.push(j===0?(gi===0?2:1):0)}); return {levels:lv,sub:1,unit:'eighth note',count:num+' eighth notes grouped '+g.join('+')}; }
  var base=[]; for(var b=0;b<num;b++) base.push(b===0?2:0);
  if(num===4) base[2]=1; if(num===6) base[3]=1; if(num===5) base[3]=1; if(num===7) base[4]=1;
  return {levels:base,sub:1,unit:'quarter note',count:num+' quarter notes'+(num===5?' as 3+2':'')};
}
var MT={bpm:92,num:4,den:4,subdiv:1,vol:.7,on:false,next:0,idx:0,timer:null,q:[],raf:0,taps:[]};
if(save.metro){['bpm','num','den','subdiv'].forEach(function(k){if(typeof save.metro[k]==='number') MT[k]=save.metro[k]})}
if(window.__FRETROAD_TEST) {window.__FRETROAD_TEST.MT=MT; window.__FRETROAD_TEST.ticks=[];}
function clickAt(t,level){
  var o=ac.createOscillator(),g=ac.createGain();
  o.type='triangle'; o.frequency.value=level===2?1650:(level===1?1180:(level===-1?700:930));
  var v=(level===2?.9:(level===1?.7:(level===-1?.25:.5)))*MT.vol;
  g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+.003); g.gain.exponentialRampToValueAtTime(.0001,t+.07);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.09);
}
function metroSubdiv(spec){return spec.sub>1?(MT.subdiv>1?3:1):MT.subdiv}
function metroSchedule(){
  var spec=meterSpec(MT.num,MT.den),spb=60/MT.bpm,n=spec.levels.length;
  while(MT.next<ac.currentTime+.14){
    var lvl=spec.levels[MT.idx%n], sd=spec.sub>1?(MT.subdiv>1?3:1):MT.subdiv;
    clickAt(MT.next,lvl);
    if(window.__FRETROAD_TEST) window.__FRETROAD_TEST.ticks.push({t:MT.next,beat:MT.idx%n,level:lvl,bpm:MT.bpm});
    MT.q.push({t:MT.next,i:MT.idx%n});
    for(var k=1;k<sd;k++) clickAt(MT.next+spb*k/sd,-1);
    MT.next+=spb; MT.idx++;
  }
}
function metroDots(){
  var spec=meterSpec(MT.num,MT.den),h='';
  spec.levels.forEach(function(l,i){h+='<i class="l'+l+'" data-i="'+i+'"></i>'});
  $('#mDots').innerHTML=h; $('#mHint').textContent='Pulse: '+spec.unit+'. '+(spec.sub>1?'Three subdivisions per beat.':'')+' Loud click on beat one.';
}
function metroShow(){
  var now=ac?ac.currentTime:0;
  while(MT.q.length&&MT.q[0].t<=now){
    var e=MT.q.shift(); var ds=$('#mDots').children;
    for(var i=0;i<ds.length;i++) ds[i].classList.toggle('on',i===e.i);
    if(window.faMetroBeat) faMetroBeat(e.i);
    $('#metroBtn').classList.add('beat'); setTimeout(function(){$('#metroBtn').classList.remove('beat')},70);
  }
  MT.raf=requestAnimationFrame(metroShow);
}
function metroStart(at){
  initAudio(); if(!ac) return; if(ac.state==='suspended') ac.resume();
  if(MT.on) return; MT.on=true; MT.idx=0; MT.next=at||ac.currentTime+.06; MT.q=[];
  metroSchedule(); MT.timer=setInterval(metroSchedule,25); MT.raf=requestAnimationFrame(metroShow);
  $('#mGo').textContent='Stop'; $('#mGo').classList.add('primary'); metroLabel();
}
function metroStop(){
  MT.on=false; clearInterval(MT.timer); cancelAnimationFrame(MT.raf); MT.q=[];
  var ds=$('#mDots').children; for(var i=0;i<ds.length;i++) ds[i].classList.remove('on');
  $('#mGo').textContent='Start'; $('#mGo').classList.remove('primary'); metroLabel();
}
function metroLabel(){$('#metroBtn').textContent=MT.on?('Metronome · '+MT.bpm):'Metronome'; if(window.faMetroSync) faMetroSync();}
function metroSet(k,v){
  if(k==='bpm') MT.bpm=Math.max(30,Math.min(240,Math.round(v)));
  else MT[k]=v;
  if(!save.metro) save.metro={}; save.metro.bpm=MT.bpm; save.metro.num=MT.num; save.metro.den=MT.den; save.metro.subdiv=MT.subdiv; persist();
  $('#mBpm').value=MT.bpm; $('#mBpmN').value=MT.bpm; metroDots(); metroLabel();
  if(MT.on){MT.idx=0; MT.q=[]; MT.next=ac.currentTime+.06;}
  if(window.faTempo) faTempo();
}
function metroBar(sig,bpm,bars){
  initAudio(); if(!ac) return; if(ac.state==='suspended') ac.resume();
  var spec=meterSpec(sig[0],sig[1]),spb=60/bpm,t=ac.currentTime+.1,n=spec.levels.length;
  for(var b=0;b<bars;b++)for(var i=0;i<n;i++){
    clickAt(t,spec.levels[i]); if(spec.sub>1){clickAt(t+spb/3,-1); clickAt(t+2*spb/3,-1);} t+=spb;
  }
}
(function metroUI(){
  var sel=$('#mSig');
  SIGS.slice().sort(function(a,b){return a[1]-b[1]||a[0]-b[0]}).forEach(function(s){var o=document.createElement('option'); o.value=s[0]+'/'+s[1]; o.textContent=s[0]+'/'+s[1]; sel.appendChild(o)});
  sel.value=MT.num+'/'+MT.den; $('#mBpm').value=MT.bpm; $('#mBpmN').value=MT.bpm; $('#mSub').value=MT.subdiv;
  metroDots();
  $('#metroBtn').addEventListener('click',function(){var p=$('#metro'); p.hidden=!p.hidden; this.setAttribute('aria-expanded',!p.hidden)});
  $('#mClose').addEventListener('click',function(){$('#metro').hidden=true; $('#metroBtn').setAttribute('aria-expanded','false')});
  $('#mGo').addEventListener('click',function(){MT.on?metroStop():metroStart()});
  $('#mBpm').addEventListener('input',function(){metroSet('bpm',+this.value)});
  $('#mBpmN').addEventListener('change',function(){metroSet('bpm',+this.value||MT.bpm)});
  $('#mMinus').addEventListener('click',function(){metroSet('bpm',MT.bpm-1)});
  $('#mPlus').addEventListener('click',function(){metroSet('bpm',MT.bpm+1)});
  sel.addEventListener('change',function(){var p=this.value.split('/'); MT.num=+p[0]; MT.den=+p[1]; metroSet('num',+p[0]); MT.den=+p[1]; metroSet('den',+p[1])});
  $('#mSub').addEventListener('change',function(){metroSet('subdiv',+this.value)});
  $('#mVol').addEventListener('input',function(){MT.vol=+this.value});
  $('#mTap').addEventListener('click',function(){
    var now=performance.now(); if(MT.taps.length&&now-MT.taps[MT.taps.length-1]>2000) MT.taps=[];
    MT.taps.push(now); if(MT.taps.length>6) MT.taps.shift();
    if(MT.taps.length>1){var s=0; for(var i=1;i<MT.taps.length;i++) s+=MT.taps[i]-MT.taps[i-1]; metroSet('bpm',60000/(s/(MT.taps.length-1)));}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('#metro').hidden){$('#mClose').click(); $('#metroBtn').focus();}});
})();

