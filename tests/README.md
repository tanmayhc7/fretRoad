# Tests

They drive the real page in a headless Chromium with Playwright (`pip install playwright && playwright install chromium`, plus `numpy` for the audio fixtures).

```bash
cd tests
python3 mkwav.py            # one-off: generates fake guitar recordings in tests/out/
python3 ui_core.py          # chapter 1, quizzes, drills, metronome, mobile layout
python3 ui_mic.py           # mic: tuner, chords string by string, scale runner
python3 ui_arpeggio.py      # arpeggio runner fed a C arpeggio
python3 ui_chapters.py      # every stop of chapters 2 to 4: puzzle, quiz, story switch, unlocking
python3 ui_basics.py        # First Steps (stops 20 to 25): new-player landing, optional gating, every puzzle and quiz, lesson review links
python3 ui_songs.py         # import a chart, play along, backing band, chord listening on a synthetic strum
python3 ui_drills3.py       # sprint, finger gym, triad grips, pentatonic boxes, CAGED, melody ear, locks
python3 ui_rhythm.py        # strum in time, rhythm reading, odd meters (tap input), scale timing, melody on the neck
python3 ui_feedback.py      # footer form builds a pre-filled GitHub issue link
python3 ui_tester.py        # tester build: unlocked, separate save, checklist, mic lab
python3 ui_analysis.py      # tempo, time signature, chart matching on synthetic songs
python3 ui_pick.py          # Strum Lab and Fingerstyle Lab: two blocks x three levels, animated pattern, drill-only metronome box
python3 ui_paths.py         # fret-path drills: animated neck walk, exact route, drill-only metronome box
python3 ui_fingers.py       # daily finger exercises: level question, ten per level, rotation
python3 ui_tuning.py        # DADGAD chord shapes and the tuning picker
python3 ui_finder.py        # sandbox chord finder
python3 ui_profiles.py      # player profiles in Settings
python3 ui_cast.py          # Chromecast sender + receiver (fake Cast framework)
- `ui_tuning.py`: DADGAD chord shapes, the tuning picker on Songs and in the jam, standard tuning untouched.
python3 ui_ai.py            # bring-your-own-model plumbing and the riff helper
python3 ui_recording.py     # play along with an audio file: mark changes, follow, reload
python3 ui_ocr.py           # picture import: word boxes -> chords-over-lyrics text (synthetic)
python3 ui_strum.py         # strum check fed a C chord and a wrong chord
python3 ui_prefs.py         # daily practice and calendar, sandbox chord shapes, theme, left-handed
python3 ui_tour.py          # first-visit tour, skip and remember
python3 globals.py          # no two scripts define the same global
python3 backup.py           # progress export and import
python3 stress_quizzes.py   # thousands of generated questions per quiz type, plus answer checks
```

Set `FR_PAGE=/path/to/other.html` to test the bundled single-file build instead of `index.html`.
