/* Map, dialogue, lesson/puzzle and sandbox views */
/* ---------- views ---------- */
var views={map:$('#v-map'),level:$('#v-level'),quiz:$('#v-quiz'),sand:$('#v-sand'),play:$('#v-play'),songs:$('#v-songs'),jam:$('#v-jam'),warm:$('#v-warm'),path:$('#v-path')};
function showView(n){clearLater(); if(n!=='play') leavePlay(); if(n!=='path'&&typeof pathStop==='function') pathStop(); document.body.classList.toggle('on-drill',n==='path'); if(n!=='warm'&&typeof warmStop==='function') warmStop(); if(n!=='jam'&&typeof leaveJam==='function') leaveJam(); Object.keys(views).forEach(function(k){views[k].hidden=(k!==n)}); window.scrollTo({top:0,behavior:'instant'});}
function updateStat(){
  var n=save.passed.length, ch=CHAPTERS[(typeof viewCh==='number'&&viewCh>=0)?viewCh:currentChapterIx()], m=ch.levels.length;
  var k=ch.levels.filter(isPassed).length, t2=Math.max(2,Math.ceil(m*.6));
  $('#stat').innerHTML='<span class="amp" role="img" aria-label="'+S().meter+' level '+(k>=m?3:(k>=t2?2:(k>0?1:0)))+' of 3"><i class="'+(k>0?'on':'')+'"></i><i class="'+(k>=t2?'on':'')+'"></i><i class="'+(k>=m?'on':'')+'"></i></span><span>'+n+' of '+LEVELS.length+' stops cleared</span>';
  if(window.dawnApply) dawnApply();
}

/* map */
var NS='http://www.w3.org/2000/svg';
function mk(name,attrs,parent){var e=document.createElementNS(NS,name); for(var k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e;}
(function stars(){
  var g=$('#mstars'),seed=11; var r=function(){seed=(seed*9301+49297)%233280; return seed/233280;};
  for(var i=0;i<70;i++) mk('circle',{cx:r()*1200,cy:r()*250,r:r()*1.4+.3,fill:'#eeeaf8',opacity:(.3+r()*.6).toFixed(2)},g);
})();
/* place names are HTML laid over the map, not SVG text: Safari draws scaled SVG text soft and unevenly spaced */
function sizeMapLabels(){ var b=document.getElementById('mapbox'); if(b) b.style.setProperty('--ms',(b.clientWidth/1200).toFixed(4)); }
window.addEventListener('resize',sizeMapLabels);
if(window.ResizeObserver){ document.addEventListener('DOMContentLoaded',function(){ var b=document.getElementById('mapbox'); if(b) new ResizeObserver(sizeMapLabels).observe(b); }); }
/* the van drives along the road from where it last stood to the next open stop (it jumps, with no drive, on first load, on a chapter change or with reduced motion) */
var vanT=null,vanCh=-1,vanRaf=0,vanWait=0;
function vanPlace(road,L,t){ var p=road.getPointAtLength(L*t); var v=$('#van'); v.style.transition='none'; v.style.transform='translate('+p.x+'px,'+(p.y+4)+'px)'; }
function driveVan(road,L,to){
  cancelAnimationFrame(vanRaf); clearTimeout(vanWait);
  var from=(vanCh===viewCh&&vanT!==null)?vanT:to; vanCh=viewCh;
  if(RM||Math.abs(to-from)<.005){ vanT=to; vanPlace(road,L,to); return; }
  vanPlace(road,L,from);
  var ms=1400+Math.abs(to-from)*3200, t0=0;
  function step(now){
    if(!t0) t0=now; var k=Math.min(1,(now-t0)/ms), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    vanT=from+(to-from)*e; vanPlace(road,L,vanT);
    if(k<1) vanRaf=requestAnimationFrame(step); else { vanT=to; }
  }
  vanWait=setTimeout(function(){ vanRaf=requestAnimationFrame(step); },450);
}
function drawMap(){ sizeMapLabels();
  if(typeof viewCh!=='number'||viewCh<0||viewCh>=CHAPTERS.length) viewCh=currentChapterIx();
  var road=$('#road'),L=road.getTotalLength(),g=$('#stops'); g.innerHTML=''; $('#maplabels').innerHTML='';
  var ch=CHAPTERS[viewCh], cur=currentId(), furthest=0;
  drawChapterHead();
  var stops=ch.levels.map(function(id,i){return {id:id,name:placeName(id),t:stopT(ch,i)}});
  stops.forEach(function(st){
    var p=road.getPointAtLength(L*st.t), done=isPassed(st.id), open=(st.id===cur), locked=!unlocked(st.id)&&!done;
    if(done) furthest=Math.max(furthest,st.t);
    var cls='node'+(done?' done':'')+(open?' open':'')+(locked?' locked':'');
    var n=mk('g',{class:cls,transform:'translate('+p.x+','+p.y+')',role:'button',tabindex:0,'aria-label':st.name+(done?', cleared':locked?', locked':', open')},g);
    mk('circle',{class:'glow',cx:0,cy:-46,r:26,filter:'url(#soft)'},n);
    mk('line',{class:'pole',x1:0,y1:0,x2:0,y2:-40},n);
    mk('circle',{class:'ring',cx:0,cy:-46,r:10},n);
    mk('circle',{class:'lamp',cx:0,cy:-46,r:9},n);
    mk('circle',{cx:0,cy:-40,r:42,fill:'transparent'},n);
    var lb=document.createElement('span'); lb.className='mlabel'+(done?' done':'')+(locked?' locked':''); lb.textContent=st.name; lb.style.left=(p.x/12).toFixed(3)+'%'; lb.style.top=((p.y-76)/5.2).toFixed(3)+'%'; $('#maplabels').appendChild(lb);
    var go=function(){ if(locked){toast('Clear the previous stop first.');} else location.hash=dest(st.id); };
    n.addEventListener('click',go); n.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  });
  var trail=$('#trail'); trail.style.strokeDasharray=(L*furthest)+' '+(L*2);
  var next=stops.filter(function(s){return !isPassed(s.id)&&unlocked(s.id)})[0];
  var vt=next?Math.max(.02,next.t-.04):(stops.every(function(s){return isPassed(s.id)})?.93:.02);
  driveVan(road,L,vt);
  var ol=$('#stoplist'); ol.innerHTML='';
  ch.levels.forEach(function(id,i){
    var l=LEVELS.filter(function(x){return x.id===id})[0];
    var d=isPassed(l.id),u=unlocked(l.id),li=document.createElement('li');
    var b=document.createElement('button'); b.className='stop'+(d?' done':'')+(l.id===cur?' open':''); b.disabled=!u;
    b.innerHTML='<span class="n">'+(d?'✓':(i+1))+'</span><span><strong>'+placeName(l.id)+'</strong><span class="d">'+l.title+'. '+l.desc+'</span></span><span class="tag">'+(d?'Cleared':u?(isDone(l.id)?'Take the quiz':'Play'):'Locked')+'</span>';
    b.addEventListener('click',function(){location.hash=dest(l.id)});
    li.appendChild(b); ol.appendChild(li);
  });
  updateStat(); drawMods();
}

/* dialogue overlay */
var talkQ=[],talkDone=null;

var talkLast='';
function startTalk(lines,done,last){talkQ=lines.slice(); talkDone=done||null; talkLast=last||''; $('#talkOverlay').hidden=false; nextTalk();}
function nextTalk(){
  var tt=$('#talkText');
  if(finishType(tt)) return;
  if(!talkQ.length){$('#talkOverlay').hidden=true; if(talkDone) talkDone(); return;}
  var l=talkQ.shift();
  $('#talkWho').textContent=l.who||'Narrator'; $('#talkAv').style.visibility=l.who?'visible':'hidden';
  typeInto(tt,l.text,l.who?'':'narr');
  $('#talkNext').textContent=talkQ.length?'Continue':(talkLast||'Continue');
  $('#talkNext').focus();
}
$('#talkNext').addEventListener('click',nextTalk);
function showMap(){
  Q.resume=false; fromQuiz=false; pendingLesson=null;
  showView('map'); applyStory(); if(typeof viewCh!=="number"||viewCh<0) viewCh=currentChapterIx();
  drawMap(); updateStat();
  if(!save.story){showStoryPicker(true); return;}
  if(!save.intro){save.intro=true; persist(); startTalk(storyIntro(),null,S().startBtn); return;}
  showChapterIntroOnce();
}

/* level */
var boardL=null,boardS=null,cur=null,found={},total=0,levelDone=false,phase='puzzle',lstep=0,ltimers=[],pendingLesson=null,fromQuiz=false;
function later(fn,ms){ltimers.push(setTimeout(fn,ms))}
function clearLater(){ltimers.forEach(clearTimeout); ltimers=[]}
function setFb(msg,kind){var f=$('#fb'); f.textContent=msg||''; f.className='fb'+(kind?' '+kind:'');}
function targetsOf(l){var out=[]; for(var s=0;s<6;s++)for(var f=0;f<=FRETS;f++){ if(l.scope(s,f)&&l.goal.indexOf(pcOf(s,f))>-1) out.push([s,f]); } return out;}
function updateCount(){var n=Object.keys(found).length; $('#count').innerHTML=n+'<small> / '+total+'</small>';}
function chordName(pcs){for(var r=0;r<12;r++){ if(pcs.indexOf(r)>-1&&pcs.indexOf((r+4)%12)>-1&&pcs.indexOf((r+7)%12)>-1) return NAMES[r]+' major'; } return '';}
function showLevel(id){
  cur=LEVELS.filter(function(l){return l.id===id})[0]; found={}; levelDone=false;
  total=targetsOf(cur).length;
  showView('level'); updateStat();
  $('#lvWhere').textContent=chapterTag(CHAPTERS[chapterIxOf(cur.id)])+' · Stop '+(CHAPTERS[chapterIxOf(cur.id)].levels.indexOf(cur.id)+1)+' · '+placeName(cur.id); $('#lvTitle').textContent=cur.title;
  $('#goalLbl').textContent=cur.unit; $('#reveal').hidden=true; $('#reveal').innerHTML='';
  setFb('');
  if(!boardL) boardL=createBoard($('#boardL'),onCellLevel);
  if(pendingLesson!==null){var ps=pendingLesson; pendingLesson=null; showLesson(ps);}
  else if(isDone(id)) startPuzzle(); else showLesson(0);
}
function showLesson(step){
  clearLater(); phase='lesson'; lstep=step; levelDone=false;
  var L=cur.lesson,S=L[step];
  $('#goalbox').hidden=true; $('#lessonbox').hidden=false; $('#reveal').hidden=true; $('#reveal').innerHTML='';
  setFb('Click any fret to hear it and see its note name.');
  boardL.clearOrbs(); boardL.clearLinks();
  typeInto($('#bubble'),S.text);
  $('#lStep').textContent='Lesson '+(step+1)+' of '+L.length;
  $('#lTitle').textContent=S.title;
  var dots=''; for(var i=0;i<L.length;i++) dots+='<i class="'+(i===step?'on':'')+'"></i>'; $('#lDots').innerHTML=dots;
  var acts=$('#lActs'); acts.innerHTML='';
  (S.actions||[]).forEach(function(a){var b=document.createElement('button'); b.className='btn'; b.textContent=a.label; b.addEventListener('click',function(){clearLater(); a.fn(boardL)}); acts.appendChild(b);});
  $('#lBack').disabled=(step===0);
  $('#lNext').textContent=(step<L.length-1)?'Next':(fromQuiz?'Back to the quiz':'Start the puzzle');
  $('#lSkip').textContent=fromQuiz?'Back to the quiz':'Skip lesson';
  S.demo(boardL);
}
function startPuzzle(){
  clearLater(); phase='puzzle'; found={}; levelDone=false;
  $('#toQuiz').hidden=!isDone(cur.id);
  $('#lessonbox').hidden=true; $('#goalbox').hidden=false; $('#reveal').hidden=true; $('#reveal').innerHTML='';
  setFb(''); boardL.clearOrbs(); boardL.clearLinks();
  if(cur.roots){ for(var s=0;s<6;s++)for(var f=0;f<=FRETS;f++){ if(cur.roots.indexOf(pcOf(s,f))>-1) boardL.orb('r'+s+','+f,{s:s,f:f,label:NAMES[pcOf(s,f)],kind:'ghost'}); } }
  if(cur.ghosts){ cur.ghosts.forEach(function(g){ boardL.orb('g'+g[0]+','+g[1],{s:g[0],f:g[1],label:nm(g[0],g[1]),kind:'ghost'}); }); }
  updateCount(); typeInto($('#bubble'),cur.pre);
  $('#hint').disabled=false;
}
$('#lNext').addEventListener('click',function(){ if(lstep<cur.lesson.length-1) showLesson(lstep+1); else leaveLesson(); });
function leaveLesson(){ if(fromQuiz){fromQuiz=false; location.hash='quiz-'+Q.level.id;} else startPuzzle(); }
$('#lBack').addEventListener('click',function(){ if(lstep>0) showLesson(lstep-1); });
$('#lSkip').addEventListener('click',function(){leaveLesson()});
$('#review').addEventListener('click',function(){showLesson(0)});
$('#toQuiz').addEventListener('click',function(){location.hash='quiz-'+cur.id});
function onCellLevel(s,f){
  if(phase==='lesson'){pluck(OPEN[s]+f); boardL.vib(s); boardL.flash(s,f,NAMES[pcOf(s,f)],'found',900); return;}
  if(!cur||levelDone) {pluck(OPEN[s]+f); boardL.vib(s); return;}
  if(!cur.scope(s,f)){setFb(cur.out(s,f),'bad'); return;}
  pluck(OPEN[s]+f); boardL.vib(s);
  var key=s+','+f, p=pcOf(s,f);
  if(found[key]) return;
  if(cur.goal.indexOf(p)>-1){
    found[key]=1; boardL.drop('r'+key);
    boardL.orb(key,{s:s,f:f,label:NAMES[p],kind:'found'}); boardL.burst(s,f,'#63d8c3');
    updateCount(); var left=total-Object.keys(found).length;
    if(left===0) finishLevel(); else setFb(NAMES[p]+'. '+left+' to go.','good');
  } else {
    boardL.flash(s,f,NAMES[p],'miss'); setFb('That is '+NAMES[p]+'. '+cur.want,'bad');
  }
}
$('#hint').addEventListener('click',function(){
  if(!cur||levelDone) return;
  var left=targetsOf(cur).filter(function(t){return !found[t[0]+','+t[1]]}); if(!left.length) return;
  var t=left[Math.floor(Math.random()*left.length)]; var k='hint'+t[0]+','+t[1];
  boardL.orb(k,{s:t[0],f:t[1],label:'',kind:'hint'}); setTimeout(function(){boardL.drop(k)},2200);
  setFb('Look near the glowing spot.');
});
$('#restart').addEventListener('click',function(){startPuzzle()});
function finishLevel(){
  levelDone=true; setFb('');
  if(!isDone(cur.id)){save.done.push(cur.id); persist();} updateStat(); $('#toQuiz').hidden=false;
  strum(cur.chime,.09);
  Object.keys(found).forEach(function(k){var a=k.split(','); boardL.burst(+a[0],+a[1],'#e6b95f');});
  typeInto($('#bubble'),cur.post);
  var rv=$('#reveal'); rv.hidden=false;
  var nxt=LEVELS.filter(function(l){return l.id===cur.id+1})[0];
  var acts='<div class="acts" id="ra"></div>';
  if(cur.reveal){
    rv.innerHTML='<h3>'+cur.reveal.title+'</h3><p>'+cur.reveal.text+'</p>'+(cur.reveal.html?cur.reveal.html():'')+acts;
  } else if(cur.id===1){
    rv.innerHTML='<h3>Stop cleared</h3><p>The A on the open A string, the A on fret 12 of that string, and five more. Notice how few of them share a fret.</p>'+acts;
  } else if(cur.id===2){
    rv.innerHTML='<h3>The shape behind the power chord</h3><p>From each gold A, the E is one string up and two frets over. Press the button to hear two of them.</p>'+acts;
    [[[5,5],[4,7]],[[4,0],[3,2]],[[3,7],[2,9]]].forEach(function(p,i){setTimeout(function(){boardL.link(p[0],p[1],i===0?'+1 string, +2 frets':'')},350+i*450)});
  } else if(cur.id===3){
    rv.innerHTML='<h3>One shape, every major chord</h3><p>These three strings are tuned so that a straight line of frets always spells a major chord. Drag the slider.</p><div class="slider"><label for="slide">Fret <b id="fnum">2</b></label><input type="range" id="slide" min="0" max="12" value="2"><span class="chord" id="cname"></span></div>'+acts;
    setTimeout(function(){drawShape(2,false)},300);
    var sl=$('#slide'); sl.addEventListener('input',function(){drawShape(+sl.value,false)}); sl.addEventListener('change',function(){drawShape(+sl.value,true)});
  } else if(cur.id===4){
    rv.innerHTML='<h3>One finger moves</h3><p>Only the note on the B string changed. Fret 2 is C♯, which makes the chord major. Fret 1 is C, which makes it minor. Switch between them and listen.</p><div class="slider"><span class="chord" id="cname"></span></div>'+acts;
    setTimeout(function(){drawQuality(true,false)},300);
  } else if(cur.id===5){
    rv.innerHTML='<h3>Two strings up, two frets over</h3><p>Every octave on this part of the neck follows that rule. Crossing from the G string to the B string adds one fret, because those two strings are tuned four semitones apart instead of five.</p>'+acts;
    [[[5,5],[3,7],'+2 strings, +2 frets'],[[4,0],[2,2],''],[[2,2],[0,5],'G to B gap: +3 frets']].forEach(function(p,i){setTimeout(function(){boardL.link(p[0],p[1],p[2])},350+i*450)});
  }
  var ra=$('#ra');
  function btn(t,cls,fn){var b=document.createElement('button'); b.className='btn '+(cls||''); b.textContent=t; b.addEventListener('click',fn); ra.appendChild(b); return b;}
  if(cur.id===2) btn('Hear it','',function(){strum([45,52],.12);setTimeout(function(){strum([57,64],.12)},700)});
  if(cur.id===3) btn('Strum it','',function(){var f=+$('#slide').value; strum([OPEN[3]+f,OPEN[2]+f,OPEN[1]+f],.07)});
  if(cur.id===4){ btn('Hear major','',function(){drawQuality(false,true)}); btn('Hear minor','',function(){drawQuality(true,true)}); }
  if(cur.id===5) btn('Hear an octave','',function(){playTogether([[5,5],[3,7]])});
  if(cur.reveal&&cur.reveal.hear) btn('Hear it','',function(){cur.reveal.hear()});
  btn('Take the quiz','primary',function(){location.hash='quiz-'+cur.id});
  btn('Back to the map','',function(){location.hash='map'});
  setTimeout(function(){rv.scrollIntoView({behavior:RM?'auto':'smooth',block:'nearest'})},500);
}
function drawShape(f,play){
  var b=boardL; ['3','2','1'].forEach(function(k){}); b.clearOrbs(); b.clearLinks();
  var rows=[3,2,1],pcs=[];
  rows.forEach(function(s){var p=pcOf(s,f); pcs.push(p); b.orb('sh'+s,{s:s,f:f,label:NAMES[p],kind:'tone'});});
  b.link([3,f],[1,f],'',true);
  $('#fnum').textContent=f; $('#cname').textContent=chordName(pcs);
  if(play) strum([OPEN[3]+f,OPEN[2]+f,OPEN[1]+f],.07);
}

/* sandbox */
var SCALES={'Major':[0,2,4,5,7,9,11],'Natural minor':[0,2,3,5,7,8,10],'Minor pentatonic':[0,3,5,7,10],'Major pentatonic':[0,2,4,7,9],'Dorian':[0,2,3,5,7,9,10],'Mixolydian':[0,2,4,5,7,9,10],'Blues':[0,3,5,6,7,10]};
(function(){
  var k=$('#sKey'),s=$('#sScale');
  NAMES.forEach(function(n,i){var o=document.createElement('option'); o.value=i; o.textContent=n; if(i===9) o.selected=true; k.appendChild(o);});
  Object.keys(SCALES).forEach(function(n,i){var o=document.createElement('option'); o.value=n; o.textContent=n; if(i===2) o.selected=true; s.appendChild(o);});
})();
function drawScale(){
  var mode=$('#sMode').value, chordMode=mode==='chord', findMode=mode==='find';
  document.querySelectorAll('#v-sand .forScale').forEach(function(e){var h=chordMode||findMode; e.hidden=h; e.style.display=h?'none':''}); document.querySelectorAll('#v-sand .forChord').forEach(function(e){e.hidden=!chordMode; e.style.display=chordMode?'':'none'});
  document.querySelectorAll('#v-sand .forFind').forEach(function(e){e.hidden=!findMode; e.style.display=findMode?'':'none'});
  if(typeof finderLabels==='function') finderLabels(findMode);
  $('#sKeyLbl').hidden=findMode; $('#sFindOut').hidden=!findMode;
  if(findMode) return finderDraw();
  if(chordMode) return drawChordShape();
  var root=+$('#sKey').value, sc=SCALES[$('#sScale').value], ints=$('#sShow').value==='ints', tri=$('#sTri').checked;
  var third=sc.indexOf(3)>-1?3:(sc.indexOf(4)>-1?4:-1), tones=[0]; if(third>-1) tones.push(third); if(sc.indexOf(7)>-1) tones.push(7);
  boardS.clearOrbs();
  for(var s=0;s<6;s++)for(var f=0;f<=FRETS;f++){
    var iv=(pcOf(s,f)-root+12)%12; if(sc.indexOf(iv)<0) continue;
    var kind=iv===0?'root':(tri&&tones.indexOf(iv)>-1?'tone':'scale');
    boardS.orb('s'+s+','+f,{s:s,f:f,label:ints?INTS[iv]:NAMES[pcOf(s,f)],kind:kind});
  }
}
function showSandbox(){
  showView('sand'); updateStat();
  if(!boardS){
    boardS=createBoard($('#boardS'),function(s,f){
      if($('#sMode').value==='find'){ finderCell(s,f); return; }
      pluck(OPEN[s]+f); boardS.vib(s);
      if($('#sMode').value==='chord') return;
      var root=+$('#sKey').value, sc=SCALES[$('#sScale').value], iv=(pcOf(s,f)-root+12)%12;
      if(sc.indexOf(iv)<0) boardS.flash(s,f,NAMES[pcOf(s,f)],'miss',700);
    });
    ['sKey','sScale','sShow','sTri','sMode','sChordQ','sShape'].forEach(function(id){$('#'+id).addEventListener('change',function(){ if(id==='sKey'||id==='sChordQ'||id==='sMode') fillShapes(); drawScale(); })});
    var qs=$('#sChordQ'); [['','major'],['m','minor'],['7','7'],['m7','minor 7'],['maj7','major 7'],['sus4','sus4'],['sus2','sus2'],['add9','add9'],['6','6'],['5','power chord (5)']].forEach(function(x){var o=document.createElement('option'); o.value=x[0]; o.textContent=x[1]; qs.appendChild(o)});
    $('#sStrum').addEventListener('click',function(){ var sh=currentShape(); if(sh) strum(sh.frets.map(function(f,i){return f<0?null:LOW_OPEN[i]+f}).filter(function(x){return x!==null}),.05); });
    fillShapes(); syncLefty();
  }
  drawScale();
}


/* sandbox: chord shapes (strings low to high in chords.js, high to low on the board) */
function sandboxChordSym(){ return SHARP_NAMES[+$('#sKey').value]+$('#sChordQ').value; }
function fillShapes(){ var sel=$('#sShape'), prev=sel.value, opts=chordShapeOptions(sandboxChordSym()); sel.innerHTML=''; opts.forEach(function(o,i){var e=document.createElement('option'); e.value=i; e.textContent=o.name; sel.appendChild(e)}); if(prev&&sel.querySelector('option[value="'+prev+'"]')) sel.value=prev; }
function currentShape(){ var o=chordShapeOptions(sandboxChordSym()); return o[+$('#sShape').value]||o[0]||null; }
function drawChordShape(){
  boardS.clearOrbs(); var sh=currentShape(); if(!sh){ toast('No shape on file for that chord.'); return; }
  var c=parseChord(sandboxChordSym()), ints=$('#sShow').value==='ints';
  sh.frets.forEach(function(f,i){ if(f<0) return; var s=5-i, pc=pcOf(s,f), kind=pc===c.root?'root':'tone';
    boardS.orb('s'+s+','+f,{s:s,f:f,label:NAMES[pc],kind:kind}); });
}
