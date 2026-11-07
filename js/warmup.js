/* Daily practice: one finger exercise a day for the player's level (a 10-day cycle, reshuffled each cycle, so none repeats within ten days), a five-minute timer, and a calendar of practised and missed days. */
var W={ex:null,bump:0,timer:0,left:300,month:null,lvlTip:false};
function ymd(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function dayKey(){return ymd(new Date());}
function dayIndex(d){return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);}
function srand(seed){var s=seed>>>0||1; return function(){s=(s*1664525+1013904223)>>>0; return s/4294967296;};}
function sshuffle(a,r){a=a.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;} return a;}
var WARM_DO=[
 {id:'spider',name:'Spider walk',secs:45,text:function(r){return 'Slowly at 60 bpm, play frets 1-2-3-4 on the low E string, then the same on the A string, and so on up to the high E, one finger per fret. Keep your thumb behind the neck.'}},
 {id:'chrom',name:'Chromatic climb',secs:40,text:function(r){return 'On the B string, play every fret from 1 to 12 with alternate picking, then come back down. Even volume, no rushing. 70 bpm.'}},
 {id:'chg',name:'Chord change sprint',secs:50,chords:true,text:function(r){return 'Switch between the two chords every four beats. Strum once per beat and keep the rhythm going even if a change is messy.'}},
 {id:'pent',name:'Pentatonic box',secs:45,text:function(r){var k=NAMES[Math.floor(r()*12)]; return 'Play the '+k+' minor pentatonic box 1 up and down in eighth notes at 72 bpm. Say each note name out loud as you play it.'}},
 {id:'skip',name:'String skipping',secs:40,text:function(r){return 'Pick the low E, then the D, then the A, then the G, then the D, then the B. Skipping strings trains your picking hand to aim. 66 bpm.'}},
 {id:'alt',name:'Alternate picking',secs:40,text:function(r){return 'On the open G string, play eighth notes strictly down-up-down-up for the whole timer. Start at 60 bpm and add 4 bpm if it feels easy.'}},
 {id:'barre',name:'Barre hold',secs:40,text:function(r){return 'Hold an F barre chord (1st fret) for 10 seconds, rest for 5, repeat. Roll your index finger slightly onto its bony edge and keep your wrist low.'}},
 {id:'strum',name:'Strum pattern',secs:50,text:function(r){var c=['G','C','D','Em','Am'][Math.floor(r()*5)]; return 'Hold '+c+' and strum down, rest, down-up, rest, up-down-up. Count "1 and 2 and 3 and 4 and" and keep your hand moving like a pendulum. 80 bpm.'}},
 {id:'scale',name:'Major scale',secs:45,text:function(r){var k=NAMES[Math.floor(r()*12)]; return 'Play the '+k+' major scale for one octave, up and down, starting on the A string or the low E string. Name the notes as you go.'}},
 {id:'arp',name:'Arpeggio picking',secs:45,text:function(r){return 'Hold Am and pick the strings in the order 5, 3, 2, 1, 2, 3 at a steady 76 bpm. Let the notes ring into each other.'}}
];
function warmData(){
  var w=save.warm||(save.warm={}); if(!w.days){ w.days={}; if(w.last) w.days[w.last]='';  /* migrate the first version */ delete w.streak; delete w.total; }
  if(!w.start){ var ks=Object.keys(w.days).sort(); w.start=ks[0]||dayKey(); }
  return w;
}
/* the exercise for a date: cycle number picks the shuffle, position in the cycle picks the exercise */
function warmLevel(){ var l=warmData().level; return FINGER_EX[l]?l:null; }
function warmFind(id){ var f=null; Object.keys(FINGER_EX).forEach(function(k){ FINGER_EX[k].forEach(function(x){ if(x.id===id) f=x; }); }); return f||WARM_DO.filter(function(x){return x.id===id})[0]||null; }
function exerciseFor(d,bump){
  var pool=FINGER_EX[warmLevel()||'beginner'], n=dayIndex(d), cyc=Math.floor(n/10), pos=((n%10)+10)%10, order=sshuffle(pool.map(function(_,i){return i}),srand(cyc*2654435761+1));
  var i=order[(pos+(bump||0))%10], x=pool[i];
  var o={id:x.id,name:x.name,secs:300,text:x.text,tab:x.tab,plan:x.plan,bpm:x.bpm,anim:x.anim,per:x.per,cue:x.cue,nofinger:x.nofinger};
  if(x.chords){ var pairs=[['G','C'],['C','Am'],['D','G'],['Em','A'],['Am','Dm'],['E','A'],['G','Em'],['D','A']]; o.pair=pairs[Math.floor(r()*pairs.length)]; }
  return o;
}
function warmStreak(w){ var d=new Date(), n=0; if(!w.days[ymd(d)]&&w.days[ymd(d)]!=='') d.setDate(d.getDate()-1); while(w.days.hasOwnProperty(ymd(d))){n++; d.setDate(d.getDate()-1);} return n; }
function showWarm(){
  showView('warm'); W.bump=0; W.month=new Date(); W.month.setDate(1); W.lvlTip=false;
  /* once per visit to the app: point out where the level is changed */
  try{ if(!sessionStorage.getItem('fr-lvl-tip')){ sessionStorage.setItem('fr-lvl-tip','1'); W.lvlTip=true; } }catch(e){}
  if(!warmLevel()) warmAsk(); else warmRender();
}
/* the level switcher: always visible on the Daily screen */
function warmLevelRow(){
  var cur=warmLevel(), row=document.createElement('div'); row.className='lvlrow'+(W.lvlTip?' nudge':''); row.setAttribute('role','group'); row.setAttribute('aria-label','Your level');
  var l=document.createElement('span'); l.textContent='Your level'; row.appendChild(l);
  Object.keys(FINGER_LEVELS).forEach(function(k){
    var b=document.createElement('button'); b.type='button'; b.className='btn lvlseg'+(k===cur?' on':''); b.textContent=FINGER_LEVELS[k].name; b.title=FINGER_LEVELS[k].blurb; b.setAttribute('aria-pressed',k===cur?'true':'false');
    b.addEventListener('click',function(){ if(k===cur) return; warmData().level=k; persist(); W.bump=0; W.lvlTip=false; warmRender(); toast('Switched to '+FINGER_LEVELS[k].name+'. Your streak and calendar stay.'); });
    row.appendChild(b);
  });
  return row;
}
/* first time (or when changing): how comfortable are you? Decides which ten exercises you get */
function warmAsk(){
  warmStop(); faPark(); var host=$('#warmRoot'); host.innerHTML='';
  var head=document.createElement('div'); head.className='jam-head'; head.innerHTML='<button class="btn" id="wBack">Back to the map</button><div><h1>Daily practice</h1><p class="jsub">One finger exercise a day, five minutes. How comfortable are you on guitar?</p></div>';
  host.appendChild(head); head.querySelector('#wBack').addEventListener('click',function(){ location.hash='map'; });
  var g=document.createElement('div'); g.className='lvlpick'; host.appendChild(g);
  Object.keys(FINGER_LEVELS).forEach(function(k){
    var b=document.createElement('button'); b.className='btn lvlbtn'; b.type='button'; b.innerHTML='<b></b><span></span>'; b.firstChild.textContent=FINGER_LEVELS[k].name; b.lastChild.textContent=FINGER_LEVELS[k].blurb;
    b.addEventListener('click',function(){ var first=!warmLevel(); warmData().level=k; persist(); W.bump=0; if(first) W.lvlTip=true; warmRender(); }); g.appendChild(b);
  });
  var cur=warmLevel(); if(cur){ var n=document.createElement('p'); n.className='jsub'; n.textContent='You can change this any time. Your streak and calendar stay.'; host.appendChild(n); }
}
function warmStop(){ clearInterval(W.timer); W.timer=0; if(typeof BK!=='undefined'&&BK.on) bkStop(); if(typeof faPause==='function') faPause(); }
function warmRender(){
  warmStop(); faPark(); var host=$('#warmRoot'), w=warmData(), today=new Date(), tk=ymd(today), done=w.days.hasOwnProperty(tk); host.innerHTML='';
  var ex=W.ex=exerciseFor(today,W.bump), st=warmStreak(w), lvl=warmLevel(), lvName=FINGER_LEVELS[lvl].name;
  var top=document.createElement('div'); top.className='dr-top'; host.appendChild(top);
  var left=document.createElement('div'); top.appendChild(left); var mslot=document.createElement('div'); mslot.id='wMetroSlot'; top.appendChild(mslot);
  var head=document.createElement('div'); head.className='jam-head'; head.innerHTML='<button class="btn" id="wBack">Back to the map</button><div><h1>Daily practice</h1><p class="jsub">One exercise a day, five minutes. '+(st?st+(st===1?' day':' days')+' in a row.':'Start a streak today.')+'</p></div>';
  left.appendChild(head); head.querySelector('#wBack').addEventListener('click',function(){warmStop(); location.hash='map'});
  left.appendChild(warmLevelRow());
  if(W.lvlTip){
    var tip=document.createElement('div'); tip.className='lvltip'; tip.setAttribute('role','note');
    tip.innerHTML='<p><b>You are on the '+lvName+' level.</b> Each level has its own ten exercises: '+FINGER_LEVELS.beginner.name+' is easy and slow, '+FINGER_LEVELS.intermediate.name+' adds hammer-ons and pull-offs, and '+FINGER_LEVELS.advanced.name+' is four-finger legato and speed. If today feels too easy or too hard, switch with the <b>Your level</b> buttons above, any time. Your streak and calendar stay.</p><div class="row"></div>';
    mkBtn(tip.querySelector('.row'),'Got it','primary',function(){ W.lvlTip=false; tip.remove(); var r=host.querySelector('.lvlrow'); if(r) r.classList.remove('nudge'); });
    left.appendChild(tip);
  }
  var grid=document.createElement('div'); grid.className='warmgrid wide'; host.appendChild(grid);
  var card=document.createElement('div'); card.className='gcard wcard'; grid.appendChild(card);
  var doneEx=done?warmFind(w.days[tk]):null;
  card.innerHTML='<span class="lab">'+(done?'Done for today':"Today's exercise")+' · '+lvName+'</span><h2></h2><p class="wtext"></p><div class="wanim" id="wAnim"></div><div class="wchords"></div><div class="wtimer" id="wTimer"></div><div class="row"></div><pre class="wtab" hidden></pre><ol class="wplan" hidden></ol>';
  card.querySelector('h2').textContent=(doneEx&&doneEx.name!==ex.name&&!W.bump?doneEx.name:ex.name);
  card.querySelector('.wtext').textContent=ex.text;
  if(ex.tab){ var tb=card.querySelector('.wtab'); tb.hidden=false; tb.textContent=ex.tab.join('\n'); tb.setAttribute('aria-label','Tab: '+ex.tab.join(', ')); }
  if(ex.plan){ var pl=card.querySelector('.wplan'); pl.hidden=false; ex.plan.forEach(function(t){ var li=document.createElement('li'); li.textContent=t; pl.appendChild(li); }); }
  if(ex.pair){ var cc=card.querySelector('.wchords'); ex.pair.forEach(function(c){var d=document.createElement('div'); d.innerHTML='<b>'+c+'</b>'+chordDiagram(c,{w:92}); cc.appendChild(d)}); card.querySelector('.wtext').textContent+=' '+changeInfo(ex.pair[0],ex.pair[1]).tip; }
  var tm=card.querySelector('#wTimer'), row=card.querySelector('.row'); W.left=ex.secs;
  function fmt(s){return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2)} tm.textContent=fmt(W.left);
  var bpm=ex.bpm!==undefined?ex.bpm:(ex.pair?72:(/\b(\d\d) bpm/.test(ex.text)?+/\b(\d\d) bpm/.exec(ex.text)[1]:70));
  /* the animated neck and the metronome box (top right): this exercise's notes, walked one at a time */
  var phrases=[]; try{ phrases=ex.anim?faParse(ex.anim,{nofinger:ex.nofinger}):[]; }catch(e){ phrases=[]; }
  if(bpm&&phrases.length) metroSet('bpm',bpm);
  if(phrases.length) faMount(card.querySelector('#wAnim'),mslot,{id:ex.id,phrases:phrases,per:ex.per||1,loop:true,noPlay:true,tip:ex.cue||''});
  var go=mkBtn(row,'Start the timer','primary',function(){
    if(W.timer){ warmStop(); go.textContent='Resume'; return; }
    go.textContent='Pause'; initAudio();
    if(phrases.length) faPlay(); else if(bpm) bkStart({bpm:bpm,bpc:4,bpb:4,style:'click',seq:ex.pair||['C'],loop:true,countIn:0,vol:.6});
    W.timer=setInterval(function(){ W.left--; tm.textContent=fmt(Math.max(0,W.left)); if(W.left<=0){ warmStop(); tm.textContent='Time'; warmMark(ex); } },1000);
  });
  var mk2=mkBtn(row,done?'Practised today':'Mark as practised','',function(){ warmStop(); warmMark(ex); });
  if(done) mk2.disabled=true;
  if(!done) mkBtn(row,'Try a different one','quiet',function(){W.bump++; warmRender()});
  var metro=document.createElement('p'); metro.className='jsub'; metro.textContent=(phrases.length?(bpm?'The metronome box at the top right is set to '+bpm+' bpm for this one. ':'This one has no click. Go slowly. '):(bpm?'The click runs at '+bpm+' bpm. ':'This one has no click. Go slowly. '))+(bpm?'Start slower if it is not clean, and only speed up when it is. ':'')+'The timer starts the animation and the click together; pause it any time. Tap "Mark as practised" any time, even if you played without the timer.'; card.insertBefore(metro,card.querySelector('.wtab'));
  var tvb=mkBtn(card.querySelector('.row'),'Show on TV','quiet',function(){ if(window.castDaily) castDaily(); toast('Sent to the TV. The timer starts in three seconds.'); }); tvb.classList.add('cast-only'); tvb.hidden=!(window.castConnected&&castConnected());
  var rb=mkBtn(card.querySelector('.row'),'Daily reminder','quiet',function(){openPrefs()}); rb.setAttribute('aria-label','Set a daily reminder');
  grid.appendChild(warmCalendar(w));
}
function warmMark(ex){ var w=warmData(), tk=dayKey(); if(!w.days.hasOwnProperty(tk)){ w.days[tk]=ex.id; persist(); toast('Practice logged. See you tomorrow.'); } W.bump=0; warmRender(); }
function warmCalendar(w){
  var c=document.createElement('div'); c.className='gcard cal', m=W.month, y=m.getFullYear(), mo=m.getMonth(), first=new Date(y,mo,1), days=new Date(y,mo+1,0).getDate(), tk=dayKey();
  c.innerHTML='<div class="calhead"><button class="btn" aria-label="Previous month">&lsaquo;</button><b></b><button class="btn" aria-label="Next month">&rsaquo;</button></div><div class="calgrid" role="grid"></div><p class="legend"><i class="d ok"></i> practised <i class="d no"></i> missed <i class="d today"></i> today</p><p class="jsub calsum"></p>';
  c.querySelector('b').textContent=first.toLocaleString(undefined,{month:'long',year:'numeric'});
  var btns=c.querySelectorAll('.calhead .btn'); btns[0].addEventListener('click',function(){W.month=new Date(y,mo-1,1); warmRender()}); btns[1].addEventListener('click',function(){W.month=new Date(y,mo+1,1); warmRender()});
  var g=c.querySelector('.calgrid'), off=(first.getDay()+6)%7; 'MTWTFSS'.split('').forEach(function(l){var e=document.createElement('span'); e.className='dow'; e.textContent=l; g.appendChild(e)});
  for(var i=0;i<off;i++) g.appendChild(document.createElement('span'));
  var practised=0, missed=0;
  for(var d=1;d<=days;d++){
    var dt=new Date(y,mo,d), k=ymd(dt), e=document.createElement('span'); e.className='day'; e.textContent=d;
    var did=w.days.hasOwnProperty(k), past=k<tk, since=k>=w.start;
    if(did){e.classList.add('ok'); e.title='Practised'+(w.days[k]?': '+(warmFind(w.days[k])||{name:''}).name:''); practised++;}
    else if(past&&since){e.classList.add('no'); e.title='Missed'; missed++;}
    if(k===tk) e.classList.add('today'); g.appendChild(e);
  }
  c.querySelector('.calsum').textContent=practised+(practised===1?' day':' days')+' practised this month'+(missed?', '+missed+' missed.':'.');
  return c;
}
/* a gentle daily prompt: once per visit, on the map, if today's finger exercise is not done yet */
setTimeout(function(){
  try{ var w=warmData(); if(!warmLevel()||w.days.hasOwnProperty(dayKey())) return; if(window.__FRETROAD_TEST) return;
    if(sessionStorage.getItem('fr-fx-prompt')) return; var m=$('#v-map'); if(!m||m.hidden) return; sessionStorage.setItem('fr-fx-prompt','1');
    toast("Today's 5-minute finger exercise: "+exerciseFor(new Date(),0).name+". Open Daily when you are ready."); }catch(e){}
},4000);
