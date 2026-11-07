/* Strum Lab and Fingerstyle Lab animation. Shows what the picking hand does, slot by slot, in time with the metronome box:
   - the chord shape stays lit on the fretboard and the struck strings wobble;
   - a "hand" panel (thick strings on top, the way you see them looking down at your guitar) shows each down-strum, up-strum,
     muted chuck or skipped slot, or which finger (p thumb, i index, m middle, a ring) plucks which string;
   - a grid of one bar shows the whole pattern with the slot to play lit up.
   It shares the metronome box, count-in and tempo hooks with fret-anim.js (FA_ENG). Loaded after fret-anim.js.
   Strum patterns: D down, U up, - skip (the hand keeps moving), X muted chuck, add ! for an accent:  "D - D U - U D! U"
   Fingerstyle patterns: r = the chord's root bass string, a = its alternate bass string, 1 to 6 = a string (1 is the thin high E),
   - = rest, + plays two together:  "r 3 a 2 r+1 3 a 2". Each bar of a drill has one chord, and the pattern repeats in every bar. */
var PK={spec:null,kind:'strum',chords:[],slots:[],spb:8,per:2,i:-1,drawnBar:-1,playing:false,tNext:0,count:0,timer:0,board:null,loop:true,click:true,ownClick:false,built:false,mounted:false};
if(window.__FRETROAD_TEST){ window.__FRETROAD_TEST.PK=PK; }
/* open chords: frets from the low E to the high E (-1 = not played); root = bass string number; alt = [string, fret] for the alternate bass */
var PK_CHORDS={
  C: {f:[-1,3,2,0,1,0],root:5,alt:[4,2]}, G: {f:[3,2,0,0,0,3],root:6,alt:[4,0]},
  Am:{f:[-1,0,2,2,1,0],root:5,alt:[4,2]}, Em:{f:[0,2,2,0,0,0],root:6,alt:[5,2]},
  D: {f:[-1,-1,0,2,3,2],root:4,alt:[5,0]}, A: {f:[-1,0,2,2,2,0],root:5,alt:[6,0]},
  E: {f:[0,2,2,1,0,0],root:6,alt:[5,2]},   Dm:{f:[-1,-1,0,2,3,1],root:4,alt:[5,0]}
};
var PK_FINGER={1:'a',2:'m',3:'i',4:'p',5:'p',6:'p'}, PK_FNAME={p:'thumb',i:'index finger',m:'middle finger',a:'ring finger'};
var PK_SNAME={1:'high E',2:'B',3:'G',4:'D',5:'A',6:'low E'};
var PK_SYM={D:'↓',U:'↑',X:'✕','-':'·'};
function pkParse(kind,pat){
  return String(pat).trim().split(/\s+/).map(function(t){
    if(kind==='strum'){ var m=/^([DUX-])(!?)$/.exec(t); if(!m) throw new Error('strum pattern: bad slot "'+t+'"'); return {t:m[1],acc:m[2]==='!'}; }
    if(t==='-') return {parts:[]};
    return {parts:t.split('+').map(function(p){ if(!/^[ra1-6]$/.test(p)) throw new Error('fingerstyle pattern: bad slot "'+t+'"'); return p; })};
  });
}
function pkChord(name){ var c=PK_CHORDS[name]; if(!c) throw new Error('unknown chord '+name); return c; }
/* sounding strings of a chord, low to high: [{row, fret}] (row 0 is the thin high E, as on the board) */
function pkSounding(c){ var o=[]; for(var j=0;j<6;j++) if(c.f[j]>=0) o.push({row:5-j,fret:c.f[j]}); return o; }
/* one fingerstyle part -> {row, fret, fin} or null when that string is not part of the chord */
function pkPart(c,p){
  var n,fret; if(p==='r'){ n=c.root; fret=c.f[6-n]; } else if(p==='a'){ n=c.alt[0]; fret=c.alt[1]; } else { n=+p; fret=c.f[6-n]; }
  if(fret<0) return null; return {row:n-1,fret:fret,fin:(p==='r'||p==='a')?'p':PK_FINGER[n]};
}
function pkLabels(per,spb){ var o=[]; for(var k=0;k<spb;k++){ var r=k%per; o.push(r===0?String(Math.floor(k/per)+1):(per===2?'&':(per===4?['','e','&','a'][r]:(per===3?['','trip','let'][r]:'')))); } return o; }
function pkClock(){ return window.ac?ac.currentTime:performance.now()/1000; }
function pkGap(){ return 60/MT.bpm/PK.per; }
var PK_Y0=30, PK_DY=24, PK_X0=44, PK_X1=404, PK_XP=250;
function pkY(row){ return PK_Y0+(5-row)*PK_DY; }
var PK_BLOCK='<div class="seq" id="pkBars" aria-label="The chords, one per bar"></div>'+
 '<div class="board-wrap" id="boardK"></div>'+
 '<div class="pk-row"><svg id="pkHand" viewBox="0 0 440 180" role="img" aria-label="The picking hand: strings as you see them looking down at your guitar"></svg><div class="pk-gridwrap"><div class="pk-grid" id="pkGrid" role="img" aria-label="The pattern for one bar"></div><p class="jsub" id="pkCount"></p></div></div>'+
 '<div class="dr-cap" id="pkCap" aria-live="polite"><div class="dr-now" id="pkNow"></div><p class="jsub" id="pkSub"></p><div class="dr-prog" aria-hidden="true"><i id="pkProg"></i></div><p class="jsub" id="pkTip"></p></div>'+
 '<div class="acts dr-acts"><button class="btn primary" id="pkPlay">Play</button><button class="btn quiet" id="pkRestart">Restart</button><label class="dr-opt"><input type="checkbox" id="pkLoop" checked> Loop</label></div>'+
 '<p class="jsub dr-legend" id="pkLegend"></p>';
function pkBuild(){
  if(PK.built) return; PK.built=true; faBuildMetro();
  var blk=document.createElement('div'); blk.id='pkBlock'; blk.innerHTML=PK_BLOCK; $('#faPark').appendChild(blk);
  PK.board=createBoard($('#boardK'),function(s,f){ pluck(OPEN[s]+f); PK.board.vib(s); });
  var svg=$('#pkHand'), h='<rect x="2" y="2" width="436" height="176" rx="14" class="pk-bg"/>';
  var names=['e','B','G','D','A','E'], wid=[1.2,1.6,2.1,2.8,3.4,4];
  for(var r=5;r>=0;r--) h+='<text x="22" y="'+(pkY(r)+4)+'" class="pk-sl">'+names[r]+'</text><line class="pk-str" data-r="'+r+'" x1="'+PK_X0+'" x2="'+PK_X1+'" y1="'+pkY(r)+'" y2="'+pkY(r)+'" stroke-width="'+wid[r]+'"/>';
  h+='<g id="pkPick" class="pk-pick"><circle cx="'+PK_XP+'" cy="'+pkY(5)+'" r="10"/></g>';
  for(r=0;r<6;r++) h+='<g class="pk-fing" data-r="'+r+'"><circle cx="'+PK_XP+'" cy="'+pkY(r)+'" r="11"/><text x="'+PK_XP+'" y="'+(pkY(r)+5)+'"></text></g>';
  h+='<text id="pkArrow" x="402" y="88" class="pk-arrow"></text><text x="14" y="172" class="pk-note">Thick strings on top, as you look down at your guitar</text>';
  svg.innerHTML=h;
  $('#pkPlay').addEventListener('click',function(){ PK.playing?pkPause():pkPlay(); });
  $('#pkRestart').addEventListener('click',function(){ pkPause(); PK.i=-1; PK.drawnBar=-1; pkRender(-1); });
  $('#pkLoop').addEventListener('change',function(){ PK.loop=this.checked; });
}
/* spec = {id, kind:'strum'|'finger', chords:[one chord name per bar], pattern, per, tip, legend} */
function pkMount(slot,metroSlot,spec){
  pkBuild(); faPause(); pkPause();
  var p=$('#faPark'); var fb=$('#faBlock'); if(fb) p.appendChild(fb);
  slot.appendChild($('#pkBlock')); metroSlot.appendChild($('#drMetro')); document.body.classList.add('on-drill'); PK.mounted=true; FA.mounted=false; FA_ENG=PK;
  PK.spec=spec; PK.kind=spec.kind; PK.chords=spec.chords; PK.slots=pkParse(spec.kind,spec.pattern); PK.spb=PK.slots.length; PK.per=spec.per||2;
  PK.loop=true; PK.click=FA.click; PK.i=-1; PK.drawnBar=-1;
  $('#pkLoop').checked=true; $('#dmClick').checked=PK.click; $('#dmSig').value=MT.num+'/'+MT.den;
  var bars=$('#pkBars'); bars.innerHTML=''; PK.chords.forEach(function(c,i){ var e=document.createElement('span'); e.className='chip'; e.textContent=c; e.dataset.bar=i; bars.appendChild(e); });
  var g=$('#pkGrid'); g.innerHTML=''; g.style.setProperty('--cols',PK.per===3?6:Math.min(8,PK.spb));
  var lab=pkLabels(PK.per,PK.spb);
  PK.slots.forEach(function(sl,k){
    var c=document.createElement('div'); c.className='pk-cell'+(lab[k]&&/^\d$/.test(lab[k])?' beat':''); c.dataset.k=k;
    var sym=spec.kind==='strum'?PK_SYM[sl.t]:(sl.parts.length?sl.parts.map(function(p){ return (p==='r'||p==='a')?'p':PK_FINGER[+p]; }).join('+'):PK_SYM['-']);
    c.innerHTML='<i>'+lab[k]+'</i><b>'+sym+'</b>'; if(sl.acc) c.classList.add('acc'); if(spec.kind==='strum'&&sl.t==='X') c.classList.add('pk-mute'); if(spec.kind==='strum'&&sl.t==='-') c.classList.add('pk-skip'); g.appendChild(c);
  });
  $('#pkCount').textContent='Count: '+lab.join(' ');
  $('#pkTip').textContent=spec.tip||''; $('#pkLegend').textContent=spec.legend||'';
  faMetroSync(); pkRender(-1);
}
function pkPause(){
  PK.playing=false; clearInterval(PK.timer); PK.timer=0;
  if(PK.ownClick&&MT.on) metroStop(); PK.ownClick=false;
  if(PK.built){ $('#pkCap').setAttribute('aria-live','polite'); pkPlayLabel(); }
}
function pkPlayLabel(){ var b=$('#pkPlay'); b.textContent=PK.playing?'Pause':(PK.i>=0?'Resume':'Play'); b.setAttribute('aria-pressed',PK.playing?'true':'false'); }
function pkDrawChord(name){
  var c=pkChord(name), b=PK.board; b.clearOrbs(); b.clearLinks();
  pkSounding(c).forEach(function(x){ b.orb('c'+x.row,{s:x.row,f:x.fret,kind:(x.row===c.root-1&&PK.kind==='strum')||x.row===c.root-1?'root':'tone',label:String(x.fret)}); });
}
function pkRender(i){
  var bar=i<0?0:Math.floor(i/PK.spb)%PK.chords.length, k=i<0?-1:i%PK.spb, chord=PK.chords[bar];
  if(PK.drawnBar!==bar){ pkDrawChord(chord); PK.drawnBar=bar; }
  var chips=$('#pkBars').children; for(var s=0;s<chips.length;s++) chips[s].className='chip'+(s<bar?' ok':(s===bar?' on':''));
  var cells=$('#pkGrid').children; for(var j=0;j<cells.length;j++) cells[j].className=cells[j].className.replace(/\b(cur|done)\b/g,'').trim()+(j===k?' cur':(j<k?' done':''));
  var now=$('#pkNow'), sub=$('#pkSub');
  if(i<0){ now.textContent='Press Play'; sub.textContent=(PK.kind==='strum'?'Keep your strumming hand moving down on the numbers and up on the &, even when a slot is skipped.':'Thumb on the bass strings, the fingers on the thin strings. Anchor your hand and let each note ring.')+' First chord: '+chord+'.'; $('#pkArrow').textContent=''; }
  $('#pkProg').style.width=(Math.max(0,i+1)/(PK.spb*PK.chords.length)*100)+'%';
  pkPlayLabel();
}
function pkHitString(row,delay,cls){
  var el=document.querySelector('#pkHand .pk-str[data-r="'+row+'"]'); if(!el) return;
  setTimeout(function(){ el.classList.add('hit'); setTimeout(function(){ el.classList.remove('hit'); },230); PK.board.vib(row); },delay);
}
function pkSweep(fromRow,toRow){
  var g=$('#pkPick'); g.style.transition='none'; g.style.transform='translateY('+(pkY(fromRow)-pkY(5))+'px)'; void g.getBoundingClientRect();
  g.style.transition=''; g.style.transform='translateY('+(pkY(toRow)-pkY(5))+'px)'; g.classList.add('on'); clearTimeout(PK.sweepT); PK.sweepT=setTimeout(function(){ g.classList.remove('on'); },260);
}
function pkArrow(txt,cls){ var a=$('#pkArrow'); a.textContent=txt; a.setAttribute('class','pk-arrow '+(cls||'')); }
/* play and show one slot of the pattern (i counts slots from the start of the progression) */
function pkStep(i,at){
  pkRender(i); var bar=Math.floor(i/PK.spb)%PK.chords.length, k=i%PK.spb, chord=PK.chords[bar], c=pkChord(chord), sl=PK.slots[k], d=Math.max(0,at-pkClock());
  var now=$('#pkNow'), sub=$('#pkSub'), where='Bar '+(bar+1)+' of '+PK.chords.length+', slot '+(k+1)+' of '+PK.spb+'.';
  if(PK.kind==='strum'){
    var snd=pkSounding(c), hit, vel, row0, row1;
    if(sl.t==='D'){ hit=snd.slice(); vel=sl.acc?.98:.74; now.textContent=(sl.acc?'Accented down strum':'Down strum')+' on '+chord; sub.textContent='Sweep the pick from the thick strings to the thin ones. '+where; pkArrow(PK_SYM.D,sl.acc?'acc':''); }
    else if(sl.t==='U'){ hit=snd.slice(-4); vel=sl.acc?.8:.5; now.textContent=(sl.acc?'Accented up strum':'Up strum')+' on '+chord; sub.textContent='Catch only the thin strings on the way up. '+where; pkArrow(PK_SYM.U,sl.acc?'acc':''); }
    else if(sl.t==='X'){ hit=snd.slice(); vel=.12; now.textContent='Muted chuck'; sub.textContent='Ease the fretting hand so the strings go dull, then strum: a percussive chk. '+where; pkArrow(PK_SYM.X,'pk-mute'); }
    else { hit=[]; var dn=(k%2===0||PK.per===1); now.textContent='Skip: no strings'; sub.textContent='Keep the hand moving '+(PK.per===3?'':(dn?'down':'up'))+' in the air, and just miss the strings. '+where; pkArrow(PK.per===3?'':(dn?PK_SYM.D:PK_SYM.U),'ghost'); }
    if(hit.length){
      var order=sl.t==='U'?hit.slice().sort(function(a,b){return a.row-b.row}):hit;   /* up: thin to thick, down: thick to thin */
      order.forEach(function(x,j){ pluck(OPEN[x.row]+x.fret,d+j*.013,vel); pkHitString(x.row,j*13); if(sl.t==='X') return; });
      var rs=order.map(function(x){return x.row}); if(sl.t!=='X') pkSweep(sl.t==='U'?Math.min.apply(null,rs):5,sl.t==='U'?Math.max.apply(null,rs):Math.min.apply(null,rs));
      if(sl.t==='X') pkSweep(5,0);
    }
  } else {
    var parts=sl.parts.map(function(p){ return pkPart(c,p); }).filter(Boolean);
    document.querySelectorAll('#pkHand .pk-fing').forEach(function(g){ g.classList.remove('on'); });
    if(!parts.length){ now.textContent='Rest'; sub.textContent='Let the last notes ring. '+where; pkArrow('','ghost'); }
    else {
      now.textContent=parts.map(function(x){ return x.fin+' ('+PK_FNAME[x.fin]+')'; }).join(' + ')+' on '+parts.map(function(x){ return PK_SNAME[x.row+1]; }).join(' and ')+(parts.length>1?' strings together':' string');
      sub.textContent=(parts.length>1?'A pinch: play them at the same moment. ':'')+'Chord: '+chord+'. '+where; pkArrow('','');
      parts.forEach(function(x){
        pluck(OPEN[x.row]+x.fret,d,x.fin==='p'?.85:.72); pkHitString(x.row,0);
        var g=document.querySelector('#pkHand .pk-fing[data-r="'+x.row+'"]'); g.querySelector('text').textContent=x.fin; g.classList.add('on');
        PK.board.burst(x.row,x.fret,'#e6b95f');
      });
      clearTimeout(PK.fingT); PK.fingT=setTimeout(function(){ document.querySelectorAll('#pkHand .pk-fing').forEach(function(g){ g.classList.remove('on'); }); },300);
    }
  }
}
function pkPlay(){
  initAudio(); if(!PK.slots.length) return; FA_ENG=PK;
  PK.playing=true; $('#pkCap').setAttribute('aria-live','off');
  var start=pkClock()+.12; PK.count=MT.num; PK.tNext=start; PK.ownClick=false;
  if(PK.click&&window.ac){ if(MT.on) metroStop(); metroStart(start); PK.ownClick=true; }
  clearInterval(PK.timer); PK.timer=setInterval(pkTick,20); pkPlayLabel();
}
function pkTick(){
  var now=pkClock(), total=PK.spb*PK.chords.length;
  while(PK.playing&&PK.tNext<=now+.03){
    if(PK.count>0){ var nb=MT.num-PK.count+1; $('#pkNow').textContent='Get ready: '+nb; $('#pkSub').textContent='The pattern starts after '+MT.num+' clicks.'; PK.count--; PK.tNext+=60/MT.bpm; continue; }
    if(PK.i>=total-1){
      if(PK.spec&&PK.spec.onRound) PK.spec.onRound();
      if(PK.loop){ PK.i=-1; PK.drawnBar=-1; } else { pkPause(); $('#pkNow').textContent='Round complete'; $('#pkSub').textContent='Press Play again, or raise the tempo a few bpm if it was clean.'; return; }
    }
    PK.i++; pkStep(PK.i,PK.tNext); PK.tNext+=pkGap();
  }
}
/* move the block out of the way (called by faPark) */
function pkPark(){ if(!PK.built) return; pkPause(); var p=$('#faPark'); if(p) p.appendChild($('#pkBlock')); PK.mounted=false; }
