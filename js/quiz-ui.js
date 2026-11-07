/* Quiz and practice-drill screens */
/* ---- quiz UI ---- */
function mkBtn(host,text,cls,fn){var b=document.createElement('button'); b.className='btn '+(cls||''); b.textContent=text; b.addEventListener('click',fn); host.appendChild(b); return b;}
function build(k){var q=QB[k](Q.lv); q.key=k; return q;}
function prepQuizView(){
  showView('quiz'); updateStat();
  if(!boardQ){
    boardQ=createBoard($('#boardQ'),onCellQ);
    var tk=$('#qTalk'); tk.insertBefore($('#v-level .avatar').cloneNode(true),tk.firstChild);
  }
  $('#qMain').hidden=false; $('#qResult').hidden=true;
}
function showQuiz(id){
  var L=LEVELS.filter(function(l){return l.id===id})[0];
  prepQuizView();
  if(Q.active&&Q.resume&&Q.mode==='stop'&&Q.level&&Q.level.id===id){Q.resume=false; renderQ(); return;}
  Q.mode='stop'; Q.level=L; Q.mod=null; Q.lv=id; Q.resume=false; Q.active=true; Q.streak=0;
  Q.queue=shuffle(L.quiz).map(build); Q.i=0; Q.first=0; Q.total=Q.queue.length; Q.marks=[];
  $('#qWhere').textContent=chapterTag(CHAPTERS[chapterIxOf(id)])+' · Stop '+(CHAPTERS[chapterIxOf(id)].levels.indexOf(id)+1)+' · '+placeName(id); $('#qTitle').textContent=L.title+': quiz';
  typeInto($('#qBubble'),S().quizIntro);
  renderQ();
}
function practiceOpen(M){return !M.needs||isPassed(M.needs)}
function beginPractice(M){
  $('#qMain').hidden=false; $('#qResult').hidden=true;
  Q.mode='practice'; Q.mod=M; Q.level=null; Q.lv=M.lv; Q.resume=false; Q.active=true; Q.streak=0;
  var list=[]; for(var i=0;i<M.rounds;i++) list.push(pick(M.pool));
  Q.queue=list.map(build); Q.i=0; Q.first=0; Q.total=Q.queue.length; Q.marks=[]; Q.t0=Date.now();
  typeInto($('#qBubble'),"Ten questions, no pressure. Your best score is saved on this device.");
  renderQ();
}
function showPractice(id){
  var M=PRACTICE.filter(function(m){return m.id===id})[0];
  if(!M||!practiceOpen(M)){location.hash='map'; return;}
  if(M.type==='play'||M.kind==='tune') return showPlay(M);
  if(M.kind==='path') return showPath(M);
  if(M.kind==='pick') return showPick(M);
  prepQuizView();
  $('#qWhere').textContent='Practice · '+M.tier; $('#qTitle').textContent=M.name;
  Q.active=false;
  if(M.primer){Q.mode='practice'; Q.mod=M; renderPrimer(M,$('#qMain'),$('#qResult'),function(){beginPractice(M)});}
  else beginPractice(M);
}
function drawDots(){
  var h=''; Q.queue.forEach(function(_,i){h+='<i class="'+(Q.marks[i]==='ok'?'ok':(Q.marks[i]==='no'?'no':(i===Q.i?'on':'')))+'"></i>'});
  $('#qDots').innerHTML=h;
}
function renderQ(){
  $('#qMain').hidden=false; $('#qResult').hidden=true;
  var q=Q.queue[Q.i]; Q.answered=false;
  $('#qStep').textContent=(q.retry?'Second try · ':'')+'Question '+(Q.i+1)+' of '+Q.queue.length+((Q.mode==='practice'&&Q.streak>1)?' · streak '+Q.streak:'');
  drawDots();
  $('#qPrompt').textContent=q.prompt;
  var au=$('#qAudio'); au.innerHTML='';
  (q.audio||[]).forEach(function(a){mkBtn(au,a.label,'',function(){playAudio(a)})});
  var ch=$('#qChoices'); ch.innerHTML='';
  (q.choices||[]).forEach(function(c,i){
    var b=document.createElement('button'); b.className='choice'; b.textContent=c.label;
    b.addEventListener('click',function(){pickChoice(i)}); ch.appendChild(b);
  });
  boardQ.clearOrbs(); boardQ.clearLinks();
  (q.board||[]).forEach(function(o,i){boardQ.orb('q'+i,{s:o.s,f:o.f,kind:o.kind,label:o.label})});
  $('#boardQ').hidden=!((q.board&&q.board.length)||q.kind==='click'||q.kind==='clicks'); if(q.kind==='clicks'){q.k=0;q.bad=false;}
  var fb=$('#qFb'); fb.className='fb'; fb.textContent=q.kind==='click'?'Click the fretboard to answer.':(q.kind==='clicks'?'Click the notes on the fretboard, in order. Clicking plays the note, so you can search by ear.':'');
  $('#qActs').innerHTML='';
}
function playAudio(a){
  if(a.mode==='bar') return metroBar(a.sig,a.bpm||88,2);
  if(a.mode==='tog') strum(a.notes,.02);
  else if(a.mode==='chord') strum(a.notes,.07);
  else if(a.mode==='run') a.notes.forEach(function(m,i){pluck(m,i*.38,.8)});
  else a.notes.forEach(function(m,i){pluck(m,i*.8,.8)});
}
function pickChoice(i){
  if(Q.answered) return;
  var q=Q.queue[Q.i],ok=!!q.choices[i].ok,bs=$('#qChoices').children;
  for(var k=0;k<bs.length;k++){
    bs[k].disabled=true;
    if(q.choices[k].ok) bs[k].classList.add('right'); else if(k===i) bs[k].classList.add('wrong');
  }
  settle(ok);
}
function onCellQ(s,f){
  pluck(OPEN[s]+f); boardQ.vib(s);
  var q=Q.queue[Q.i]; if(q&&q.kind==='clicks'&&!Q.answered){
    var want=q.seq[q.k],okc=pcOf(s,f)===want, fbq=$('#qFb');
    if(okc){ boardQ.orb('c'+q.k,{s:s,f:f,kind:'found',label:NAMES[want]}); boardQ.burst(s,f,'#63d8c3'); q.k++; fbq.className='fb good'; fbq.textContent='Note '+q.k+' of '+q.seq.length+' found.'; if(q.k>=q.seq.length) settle(!q.bad); }
    else { q.bad=true; boardQ.orb('w'+s+'_'+f,{s:s,f:f,kind:'miss',label:NAMES[pcOf(s,f)]}); fbq.className='fb bad'; fbq.textContent='That was '+NAMES[pcOf(s,f)]+', not the note you heard. Listen again. (This question will count as missed.)'; }
    return;
  }
  if(!q||q.kind!=='click'||Q.answered) return;
  var ok=(s===q.click.s&&pcOf(s,f)===q.click.pc&&(q.click.f===undefined||f===q.click.f));
  boardQ.orb('ans',{s:s,f:f,kind:ok?'found':'miss',label:NAMES[pcOf(s,f)]});
  if(ok) boardQ.burst(s,f,'#63d8c3');
  settle(ok);
}
function settle(ok){
  var q=Q.queue[Q.i]; Q.answered=true; Q.marks[Q.i]=ok?'ok':'no';
  if(ok) Q.streak++; else Q.streak=0;
  if(!q.retry&&!q.missed){
    if(ok) Q.first++;
    else {q.missed=true; if(Q.mode==='stop'){var r=build(q.key); r.retry=true; Q.queue.push(r);}}
  }
  (q.board||[]).forEach(function(o,i){if(o.reveal) boardQ.orb('q'+i,{s:o.s,f:o.f,kind:o.reveal.kind,label:o.reveal.label})});
  if(!(ok&&q.kind==='click')) (q.after||[]).forEach(function(o,i){boardQ.orb('a'+i,{s:o.s,f:o.f,kind:o.kind,label:o.label})});
  if(ok) strum([69,76],.07);
  drawDots();
  var fb=$('#qFb'); fb.className='fb '+(ok?'good':'bad'); fb.textContent=(ok?'Correct. ':'Not quite. ')+q.explain;
  typeInto($('#qBubble'),ok?pick(storyPraise()):(q.retry?'Still tricky. Take another look at the lesson.':pick(storyMiss())));
  var acts=$('#qActs'); acts.innerHTML='';
  if(!ok&&q.lesson&&Q.mode==='stop'){
    mkBtn(acts,'Review this in the lesson','',function(){Q.resume=true; pendingLesson=q.lesson[1]; fromQuiz=true; location.hash='stop-'+q.lesson[0]});
  }
  var last=(Q.i>=Q.queue.length-1);
  mkBtn(acts,last?'See how you did':'Next question','primary',function(){ if(last) showResult(); else {Q.i++; renderQ();} });
}
function showResult(){
  Q.active=false; $('#qMain').hidden=true;
  var rv=$('#qResult'); rv.hidden=false;
  if(Q.mode==='practice'){
    var M=Q.mod; if(!save.best) save.best={};
    var prev=save.best[M.id],isBest=(prev===undefined||Q.first>prev);
    if(isBest){save.best[M.id]=Q.first; persist();}
    var tmsg=''; if(M.timed){ var sec=Math.round((Date.now()-Q.t0)/1000); tmsg='Time: '+sec+' seconds. '; if(!save.bestTime) save.bestTime={}; if(Q.first>=Math.ceil(Q.total*.8)){ var pt=save.bestTime[M.id]; if(pt===undefined||sec<pt){save.bestTime[M.id]=sec; persist(); tmsg+=(pt===undefined?'':'New fastest clean run. ');} else tmsg+='Fastest clean run: '+pt+' seconds. '; } else tmsg+='Get at least '+Math.ceil(Q.total*.8)+' right to set a fastest time. '; }
    rv.innerHTML='<h3>'+Q.first+' of '+Q.total+'</h3><p>'+tmsg+(isBest?'New best score.':'Best so far: '+prev+' of '+Q.total+'.')+'</p><div class="acts" id="qra"></div>';
    var ra=$('#qra');
    mkBtn(ra,'Go again','primary',function(){showPractice(M.id)});
    mkBtn(ra,'Back to the map','',function(){location.hash='map'});
    return;
  }
  var L=Q.level,passed=Q.first>=4,nxt=LEVELS.filter(function(l){return l.id===L.id+1})[0];
  if(passed){
    if(!isPassed(L.id)){save.passed.push(L.id); viewCh=-1; persist();}
    updateStat(); strum(L.chime,.09);
    rv.innerHTML='<h3>Stop cleared</h3><p>'+Q.first+' of '+Q.total+' right on the first try. '+clearText(L.id)+'</p><div class="acts" id="qra"></div>';
    var ra2=$('#qra');
    if(nxt) mkBtn(ra2,'Next stop','primary',function(){location.hash='stop-'+nxt.id});
    else mkBtn(ra2,'Open the sandbox','primary',function(){location.hash='sandbox'});
    mkBtn(ra2,'Back to the map','',function(){location.hash='map'});
  } else {
    rv.innerHTML='<h3>Almost there</h3><p>'+Q.first+' of '+Q.total+' right on the first try. You need four. Go back over the lesson, or try again with fresh questions.</p><div class="acts" id="qra"></div>';
    var ra3=$('#qra');
    mkBtn(ra3,'Try again','primary',function(){showQuiz(L.id)});
    mkBtn(ra3,'Review the lesson','',function(){pendingLesson=0; location.hash='stop-'+L.id});
    mkBtn(ra3,'Back to the map','',function(){location.hash='map'});
  }
}
function drawMods(){
  var host=$('#mods'); host.innerHTML='';
  ['Beginner','Intermediate','Advanced'].forEach(function(tier){
    var h=document.createElement('h3'); h.className='tier'; h.textContent=tier; host.appendChild(h);
    var grid=document.createElement('div'); grid.className='mods'; host.appendChild(grid);
    PRACTICE.map(function(m,i){return [m,i]}).filter(function(a){return a[0].tier===tier}).sort(function(a,b){return (a[0].needs-b[0].needs)||(a[1]-b[1])}).map(function(a){return a[0]}).forEach(function(M){
      var open=practiceOpen(M),best=save.best?save.best[M.id]:undefined,play=(M.type==='play'||M.kind==='tune');
      var b=document.createElement('button'); b.className='mod'+(open?'':' locked'); b.disabled=!open; b.dataset.id=M.id;
      var runs=save.pathRuns&&save.pathRuns[M.id]; var tag=(M.kind==='path'||M.kind==='pick')?((M.kind==='pick'?(M.family==='strum'?'Strumming · ':'Fingerpicking · '):'')+'Watch and play along · no mic'+(runs?' · played '+runs+(runs===1?' time':' times'):'')):!open?('Clear stop '+M.needs+' to unlock'):(M.kind==='tune'?'Uses the mic':(best!==undefined?'Best '+best+' of '+M.rounds:(play?'Uses the mic':M.rounds+' questions'))+(play||M.kind==='tune'?'':' · no guitar needed'));
      b.innerHTML='<strong>'+M.name+'</strong><span class="d">'+M.desc+'</span><span class="tag'+(play&&open?' mic':'')+'">'+tag+'</span>';
      b.addEventListener('click',function(){location.hash='practice-'+M.id});
      grid.appendChild(b);
    });
  });
}
function drawQuality(minor,play){
  var b=boardL; b.clearOrbs(); b.clearLinks();
  b.orb('qa',{s:3,f:2,label:nm(3,2),kind:'tone'}); b.orb('qb',{s:2,f:2,label:nm(2,2),kind:'tone'});
  var tf=minor?1:2; b.orb('qc',{s:1,f:tf,label:nm(1,tf),kind:'root'});
  $('#cname').textContent='A '+(minor?'minor':'major');
  if(play) strum([OPEN[3]+2,OPEN[2]+2,OPEN[1]+tf],.07);
}
$('#qBack').addEventListener('click',function(){location.hash='map'});

