# Fret Paths (animated drills) and the animated Daily exercises

Practice > Beginner / Intermediate lists five drills that show the pattern on the fretboard instead of describing it. A brass dot walks the neck one note at a time (with the plucked sound, a string wobble and the fret number on the dot), teal dots are notes already played, dashed dots are the rest of the current four-note group, and a pulsing ring marks where the next group starts. Under the board you see the string, the fret and which finger to use. No mic is needed: you watch and play along.

| Drill | Notes |
| --- | --- |
| Diagonal Climb | Low E 1-2-3-4, A 2-3-4-5, D 3-4-5-6, G 4-5-6-7, B 5-6-7-8, high E 6-7-8-9, then 9-8-7-6 on the high E |
| Spider, Frets 6-9 | 6-7-8-9 on every string, high E down to low E |
| Diagonal Descent | Low E 9-8-7-6, A 8-7-6-5, D 7-6-5-4, G 6-5-4-3, B 5-4-3-2, high E 4-3-2-1 |
| Spider, Frets 1-4 | 1-2-3-4 on every string, high E down to low E |
| The Full Route | All of the above in that order (100 notes), then it loops |

Controls: Play / Pause, Note < and Note > to step one note at a time, Restart, Loop, and Notes per click (1 or 2).

**Metronome.** While a drill is open the metronome button in the top bar is hidden and the drill screen has its own metronome box at the top right (tempo, tap tempo, time signature, beat dots, Start/Stop). It uses the same tempo as the normal metronome, so nothing changes on other screens. "Click along with Play" (on by default) starts the click together with Play after one bar of count-in, so the first note lands on beat one; Pause stops it again. Changing the tempo while playing keeps the notes on the clicks.

**Adding a drill.** Add stages to `PATH_STAGES` / `pathStageGroups` in `js/drills-paths.js` (each stage is a list of four-note groups on one string) and add an entry to the `PRACTICE.push` list with `kind:'path'` and a `stages` array. Ids must be lowercase letters only (the router matches `#practice-<id>`). `tests/ui_paths.py` checks the full route note by note.

## Daily practice uses the same animation

Every Daily exercise (all 30, ten per level) now shows its notes walking across the neck inside the card, with the same dots, sound, finger names and metronome box at the top right (the header metronome is hidden on this screen too). "Start the timer" starts the five-minute timer, the animation and the click together; pause stops all three. Hammer-ons, pull-offs and slides are marked h, p and / and sound softer, because they are not picked. The metronome box is set to the exercise's suggested tempo when the exercise opens.

**Changing level.** The Daily screen always shows a "Your level" row (Beginner, Intermediate, Advanced) at the top left; click one to switch, and your streak and calendar stay. The first time you open Daily in a visit (and right after you choose your very first level) a short note explains this, with a "Got it" button.

## Where the code is

- `js/fret-anim.js`: the shared engine (board block, metronome box, scheduler). `faMount(slot, metroSlot, spec)` shows a sequence in a screen; `faUnmount()` hides it again.
- `js/drills-paths.js`: the five Practice drills (data and screen).
- `js/finger-ex.js`: each exercise has an `anim` string, optional `per` (notes per click), `cue` (one-line hint) and `nofinger`.

Notation for `anim`: notes are `<string><fret>[:<finger>][h|p|/]` with strings `e B G D A E` (e is the thin high E, E the thick low E), `h` hammer-on, `p` pull-off, `/` slide to this note, `:x` hides the finger, and `|` starts a new group. Fingers default to "fret minus the lowest fret in the group, plus one". Example: `e5 e7h e5p | B5 B7h B5p`. Frets go up to 12, the length of the board.
