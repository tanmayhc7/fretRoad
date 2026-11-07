# Daily finger exercises

The Daily page asks once how comfortable you are (Beginner, Intermediate, Advanced) and then gives one five-minute finger exercise a day from that level's ten. Ten days cover all ten, and the next ten days use the same ten in a new order. You can change level from the Daily card; your streak and calendar stay.

- **Beginner:** one finger per fret, spider walks, moving the hand up and down the neck, light pressure, small stretches. No hammer-ons or pull-offs yet.
- **Intermediate:** hammer-ons, pull-offs, 1-2, 1-3 and 1-4 trills, three-finger legato, scrambled finger orders, string skipping, pentatonic boxes played with legato.
- **Advanced:** four-finger legato trills, three-notes-per-string runs, little-finger trills, spider ladders with a rising metronome, hammer-ons from nowhere, wide stretches, a pedal-tone lick, scales in thirds, slide-and-legato position shifts, speed-burst ladders.

The exercises are common teaching material, rewritten in our own words with our own tab. They were chosen after reading:

- Guitar World, [finger independence and dexterity](https://www.guitarworld.com/lessons/guitar-finger-exercises-independence-dexterity) (chromatic spiders, reordered fingers, pedal-tone licks, scale in thirds)
- MusicRadar, [legato workouts](https://www.musicradar.com/how-to/guitar-skills-strengthen-your-fretting-fingers-with-these-slick-legato-workouts) (three-finger hammer-ons and pull-offs, string-skipping, stretches)
- Applied Guitar Theory, [spider exercises](https://appliedguitartheory.com/lessons/spider-exercises/) (four-fret spiders, string skipping, 1-3-2-4 order, metronome advice)

Each exercise also carries an `anim` string that drives the animated neck on the Daily screen (notation in `docs/FRET_PATHS.md`). The data lives in `js/finger-ex.js`; add or swap an exercise there (keep ten per level, each with `text`, `tab`, an `anim`, a three-step `plan` and a starting `bpm`, or `0` for no click).
