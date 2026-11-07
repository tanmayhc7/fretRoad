# Strum Lab and Fingerstyle Lab

Two blocks at the top of Practice (Drills). Each has Beginner, Intermediate and Advanced levels with three drills each.
They are watch-and-play-along drills: no mic. Names are the `PICK_FAMILIES` constants in `js/drills-pick.js`.

## What the screen shows
- The chord of the current bar lit on the fretboard (root in brass), the struck strings wobbling.
- A hand panel, thick strings on top as the player sees their guitar: a pick sweeping down or up, or the finger letter (p i m a) landing on a string.
- A grid of one bar: every slot of the pattern, the current slot lit, count labels (1 & 2 &, or e & a for sixteenths).
- The dedicated metronome box at the top right. The header metronome is hidden only on drill screens.

## Files
- `js/pick-anim.js`: the engine (`PK`), chord shapes (`PK_CHORDS`), pattern parser (`pkParse`). Shares the metronome box and count-in with `fret-anim.js` through `FA_ENG`.
- `js/drills-pick.js`: the 18 drills (`PRACTICE` entries with `kind:'pick'`, `family`, `mode`) and `showPick`.
- Route `#practice-<id>` (ids are letters only), view `#v-path` (shared with Fret Paths).

## Pattern notation
Strum: `D` down, `U` up, `-` skip (hand keeps moving), `X` muted chuck, `!` after a stroke = accent. Example: `D - D U - U D U`.
Fingerstyle: `r` root bass, `a` alternate bass, `1`-`6` a string (1 = high E), `-` rest, `+` plays two together. Example: `r 3 a 2 r+1 3 a 2`.
`per` is slots per beat (1 quarters, 2 eighths, 3 triplets, 4 sixteenths); one chord per bar, the pattern repeats every bar.

## Adding a drill
Push an entry in `PICK_DRILLS` (id letters only, `family`, `tier`, `mode`, `per`, `pattern`, `chords`). Chords must exist in `PK_CHORDS`.

Tests: `tests/ui_pick.py`.
