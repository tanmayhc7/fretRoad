/* Fret Paths: animated fretboard drills. A bright dot walks the neck one note at a time, with the sound and a click,
   so you can SEE which fret comes next instead of reading it. Watch and play along, no mic needed.
   The view is #v-path (route #practice-<id>); the animation itself is in fret-anim.js, shared with the Daily exercises.
   Loaded after drills-noguitar.js. */
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

$('#dBack').addEventListener('click',function(){ location.hash='map'; });
function showPath(M){
  showView('path'); updateStat();
  var b=pathBuild(M.stages), phrases=b.groups.map(function(g){ return {si:g.si,steps:g.frets.map(function(f,k){ return {s:g.s,f:f,fin:g.fingers[k],t:''}; })}; });
  $('#dWhere').textContent='Practice · '+M.tier; $('#dTitle').textContent=M.name; $('#dSub').textContent=M.desc;
  faMount($('#dSlot'),$('#dMetroSlot'),{id:M.id,phrases:phrases,stages:M.stages.map(function(k){return PATH_STAGES[k]}),per:1,loop:true,
    onRound:function(){ (save.pathRuns||(save.pathRuns={}))[M.id]=(save.pathRuns[M.id]||0)+1; persist(); }});
}
