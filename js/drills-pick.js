/* Strum Lab and Fingerstyle Lab: two animated Practice blocks, each with Beginner, Intermediate and Advanced drills.
   Watch the picking hand, hear the pattern, play along with the metronome box. No mic needed.
   The animation engine is pick-anim.js; the screen is #v-path (route #practice-<id>, ids are letters only).
   Block names are the two constants below. Loaded after drills-paths.js, so PRACTICE.push runs before drawMods. */
var PICK_FAMILIES=[
 {id:'strum',  name:'Strum Lab',       blurb:'Strumming with a pick: down and up strokes, skipped slots, accents and chucks. Watch the hand, then play along.'},
 {id:'finger', name:'Fingerstyle Lab', blurb:'Picking with your fingers: thumb on the bass, fingers on the thin strings. Watch which finger plays which string.'}
];
var STRUM_TIP='Down on the numbers, up on the &. Keep the hand moving even when a slot is skipped.';
var FINGER_TIP='Thumb (p) on the bass strings, index (i) on G, middle (m) on B, ring (a) on the high E.';
var STRUM_KEY='D down, U up, · skip (hand still moves), ✕ muted chuck, bold slot = accent.';
var FINGER_KEY='p thumb, i index, m middle, a ring. "p+a" means pinch: play both together.';
var PICK_DRILLS=[
 /* Strum Lab */
 {id:'strumdown',   family:'strum',name:'Down Strums',      tier:'Beginner',    desc:'Four steady down strums per bar on G, C, G, D.',                       mode:'strum', per:1,pattern:'D D D D',                chords:['G','C','G','D']},
 {id:'strumeighths',family:'strum',name:'Steady Eighths',   tier:'Beginner',    desc:'Down-up all the way: the engine behind every strum.',                   mode:'strum', per:2,pattern:'D U D U D U D U',        chords:['Em','C','G','D']},
 {id:'strumfolk',   family:'strum',name:'Folk Strum',       tier:'Beginner',    desc:'The classic D, D-U, U-D-U with two skipped slots.',                     mode:'strum', per:2,pattern:'D - D U - U D U',        chords:['G','C','G','D']},
 {id:'strumpop',    family:'strum',name:'Pop Strum',        tier:'Intermediate',desc:'A lighter pattern that leans on the off-beats.',                        mode:'strum', per:2,pattern:'D - - U - U D U',        chords:['Am','C','G','D']},
 {id:'strumaccent', family:'strum',name:'Backbeat Accents', tier:'Intermediate',desc:'Same steady strum, with a louder hit on beats 2 and 4.',                mode:'strum', per:2,pattern:'D U D! U D U D! U',      chords:['Em','C','G','D']},
 {id:'strumchuck',  family:'strum',name:'Muted Chucks',     tier:'Intermediate',desc:'Swap the backbeat for a percussive muted chuck.',                       mode:'strum', per:2,pattern:'D U X U D U X U',        chords:['Am','Dm','G','C']},
 {id:'strumshuffle',family:'strum',name:'Shuffle Strum',    tier:'Advanced',    desc:'Three slots per beat: the swung, bluesy feel.',                         mode:'strum', per:3,pattern:'D - U D - U D - U D - U',chords:['E','E','A','E']},
 {id:'strumsixteen',family:'strum',name:'Sixteenths',       tier:'Advanced',    desc:'Four strokes per beat. Keep the wrist loose and go slow first.',        mode:'strum', per:4,pattern:'D U D U D U D U D U D U D U D U',chords:['E','A','E','A']},
 {id:'strumfunk',   family:'strum',name:'Funk Sixteenths',  tier:'Advanced',    desc:'Chucks and accents inside a sixteenth-note groove.',                    mode:'strum', per:4,pattern:'D! U X U X U D U X U D! U X U D U',chords:['Am','D']},
 /* Fingerstyle Lab */
 {id:'fingerwalk',  family:'finger',name:'Thumb Walk',      tier:'Beginner',    desc:'Thumb alone: the root bass, then the alternate bass.',                  mode:'finger',per:1,pattern:'r a r a',                chords:['C','G','Am','Em']},
 {id:'fingerpinch', family:'finger',name:'Pinch and Pluck', tier:'Beginner',    desc:'Thumb and ring finger pinch together, then the index plucks.',          mode:'finger',per:2,pattern:'r+1 - 3 - a+1 - 3 -',    chords:['C','G','Am','Em']},
 {id:'fingerarp',   family:'finger',name:'Simple Arpeggio', tier:'Beginner',    desc:'Up through the strings and back down, one note at a time.',             mode:'finger',per:2,pattern:'r 3 2 1 2 3 2 3',        chords:['C','G','Am','Em']},
 {id:'fingertravis',family:'finger',name:'Travis Picking',  tier:'Intermediate',desc:'The thumb alternates bass strings while fingers fill in the melody.',    mode:'finger',per:2,pattern:'r 3 a 2 r+1 3 a 2',      chords:['C','G','Am','Em']},
 {id:'fingerroll',  family:'finger',name:'Pinch Arpeggio',  tier:'Intermediate',desc:'A pinch on the beat, then a rolling pattern in between.',                mode:'finger',per:2,pattern:'r+1 3 2 3 a+1 3 2 3',    chords:['Am','C','G','Em']},
 {id:'fingersync',  family:'finger',name:'Syncopated Bass', tier:'Intermediate',desc:'Travis picking with a gap, so the bass lands between beats.',            mode:'finger',per:2,pattern:'r 3 a - r+1 - a 2',      chords:['G','Em','C','D']},
 {id:'fingerrolling',family:'finger',name:'Rolling Sixteenths',tier:'Advanced', desc:'A fast rolling pattern across all four fingers.',                        mode:'finger',per:4,pattern:'r 3 2 1 3 2 1 2 a 3 2 1 3 2 1 2',chords:['Am','C']},
 {id:'fingerthumb', family:'finger',name:'Thumb Independence',tier:'Advanced',  desc:'The thumb keeps a steady bass while the fingers play off the beat.',    mode:'finger',per:2,pattern:'r - a+1 - r 2 a+1 3',    chords:['C','G','Am','Em']},
 {id:'fingersong',  family:'finger',name:'Pinch Syncopation',tier:'Advanced',  desc:'Pinches and runs over four chords, like a full fingerstyle song.',       mode:'finger',per:2,pattern:'r+1 - 3 2 a+1 - 3 2',    chords:['C','G','Am','D']}
];
PICK_DRILLS.forEach(function(m){ m.kind='pick'; m.needs=0; m.rounds=0; PRACTICE.push(m); });
if(window.__FRETROAD_TEST) window.__FRETROAD_TEST.PICK_DRILLS=PICK_DRILLS;

function showPick(M){
  showView('path'); updateStat();
  var fam=PICK_FAMILIES.filter(function(f){return f.id===M.family})[0];
  $('#dWhere').textContent=fam.name+' · '+M.tier; $('#dTitle').textContent=M.name; $('#dSub').textContent=M.desc;
  pkMount($('#dSlot'),$('#dMetroSlot'),{id:M.id,kind:M.mode,chords:M.chords,pattern:M.pattern,per:M.per,
    tip:M.family==='strum'?STRUM_TIP:FINGER_TIP,legend:M.family==='strum'?STRUM_KEY:FINGER_KEY,
    onRound:function(){ (save.pathRuns||(save.pathRuns={}))[M.id]=(save.pathRuns[M.id]||0)+1; persist(); }});
}
