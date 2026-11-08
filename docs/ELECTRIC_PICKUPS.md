# Electric guitar: pickups and tone

An interactive Practice lesson (Beginner, open from the start, no guitar needed). Route `#practice-electricpickups`, view `#v-elec`, code in `js/elec-tone.js`.

## What the player can do
- Move the **pickup selector** (drag the lever, click a notch, use the position buttons, or the arrow keys) on a **Strat-style** guitar (three single coils, 5-way switch) or a **Les Paul-style** guitar (two humbuckers, 3-way switch).
- Turn the **tone** and **volume** knobs (drag, or arrow keys).
- Pluck any open string (buttons or the strings on the picture), strum an Em chord or play a power chord, and switch **Overdrive** on.
- **Hear every position**: the same note through each switch position in turn.
- **Blind test**: a hidden position plays, and the player picks which one it was; the score is kept for the session.
- A five-step "Try this" checklist; finishing it sets `save.elecDone`.
- The screen shows which pickups are on, a Dark to Bright meter and the strength of the first 24 harmonics, so the change can be seen as well as heard.

## The sound model
A small physical model, not samples:
- A pickup at distance `x` (a fraction of the string length from the bridge) hears harmonic `n` with weight `sin(n*pi*x)`. Near the bridge this favours the high harmonics (bright, thin); near the neck the low ones (round, full). Two pickups on add their weights, which cancels some harmonics (the "quack").
- Coil width `w` smooths the highest harmonics (a humbucker is wide), and the coil has a resonant peak `fr`, `q`.
- Every position is normalised to the same total energy, so the lesson is about tone, not loudness.
- The tone knob is a real low-pass filter (400 Hz to 12 kHz). The volume knob comes before the overdrive, as on a real guitar, so turning it down also cleans the sound up.
- The sound is an additive voice built from a `PeriodicWave`, with a pluck envelope and a falling low-pass.

Pickup positions and data are in `EL_G` (add a guitar type or a pickup there). Tests: `tests/ui_elec.py`.
