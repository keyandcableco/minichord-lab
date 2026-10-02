# Fux: a species-counterpoint game

Design notes, not built yet. Kind code `fux`, slug `fux/`.

Fux's *Gradus ad Parnassum* (1725) teaches counterpoint as a ladder of five species, each adding one
idea. The game follows the ladder. You fly the counterpoint on the harp against a cantus firmus the
game plays, and Aloysius (the master in Fux's dialogue) judges every line.

**First release: species 1 and 2, in two modes: Parallel Patrol and Two Ships.** Species 3 to 5,
suspensions and tempo mode come later, and this document only sketches them (§9).

---

## 1. The harp as a modal instrument

What the firmware already gives us (see `~/minichord`, `firmware/src/main.cpp`):

- **12 strips.** Holding a strip sustains it. Release sends a note-off (velocity 20). Velocity is
  fixed.
- **Static harp mode 10 ("Custom · on the key").** The strips play a 12-bit scale mask (address 236)
  rooted on the key (address 35). Chord buttons don't change the harp in this mode. So the game can
  tune the harp to any church mode:

  | Mode | Final | Mask, from the final |
  |---|---|---|
  | Dorian | D | 0 2 3 5 7 9 10 |
  | Phrygian | E | 0 1 3 5 7 8 10 |
  | Lydian | F | 0 2 4 6 7 9 11 |
  | Mixolydian | G | 0 2 4 5 7 9 10 |
  | Aeolian | A | 0 2 3 5 7 8 10 |
  | Ionian | C | 0 2 4 5 7 9 11 |

- **Range.** With a 7-note mask, the 12 strips span a 12th: the final up to the 5th above the octave.
  MIDI is 48 + 12 + the key's pitch class + the strip's scale step, so D Dorian runs D4 to A5. Transpose (address 30, −12) moves the
  whole harp down an octave for counterpoint below the cantus.
- **The range window.** Strip 0 doesn't have to be the final. Set the key to whichever pitch the window
  should start on, and rotate the mask to match. D Dorian starting on A is key A with mask
  0 2 3 5 7 8 10. That lets a level fit the window to the cantus's range, including the plagal range
  below the final.
- **Write order.** Write 35 (key), then 236 (mask), then 36 (mode). The firmware doesn't recompute the
  strings on a key change alone. `hcTuneHarp()` in `arcade/games/harp-command.js` already does exactly
  this through `borrow()`, which restores everything when the player leaves. Fux copies that pattern.
- **Stock firmware has no mode 10.** Fall back the way Harp Command does: harp mode 1 (major) on the
  key whose white notes hold the mode, with the strips offset so the final is wherever it lands.
  Musica ficta (§2) is then always automatic.

Other settings Fux borrows for the whole game:

| Address | Value | Why |
|---|---|---|
| 3 (chord volume) | 0 | The chord buttons become silent controls (§3) |
| 122 (firmware "cantus") | 0 | Otherwise harp plucks re-voice the chord. Same word, unrelated feature |
| 98 (chromatic harp) | 0 | |
| 40 (harp note order) | in order | `harpInOrder()`, as in Harp Command |

**The device can't play the cantus.** The firmware ignores incoming MIDI notes, so the cantus sounds
from the browser (`Piano`/`sfx` in the kit) and only the player's voice comes from the minichord. The
two timbres keep the voices easy to tell apart by ear.

## 2. Musica ficta, explained

In Dorian, Mixolydian and Aeolian, the final cadence needs a raised 7th. In D Dorian the penultimate
bar wants C♯ rising to D: a major 6th opening to the octave above the cantus, or a minor 3rd closing to
the unison below it. The mode's own 7th is C♮, so the strip for that degree plays C♮.

Ionian and Lydian already have a semitone below the final. Phrygian cadences the other way round: the
cantus falls F→E, and the counterpoint's D♮ needs no raising.

**Mechanism: swap a bit, don't add one.** At the cadence the game rewrites the mask: it clears ♭7 and
sets ♮7 (in D Dorian, bit 10 off and bit 11 on). The scale still has 7 notes, so the strips don't shift.
The C strip simply plays C♯ for that bar, then goes back.

**Who triggers the swap?** This depends on difficulty:

- **Easy and Normal:** the game swaps it automatically on the penultimate bar. The strip label turns
  gold so you see it happen.
- **Hard:** you arm it yourself by playing the **dominant chord** (A major in D Dorian). The game
  detects it with `chordId`, whichever button made it. The raised note is that chord's third, so
  "play the V to sharpen the 7th" is a reasonable hook. (The idea is anachronistic: Fux thought in
  lines, not chords.) Forgetting it means plucking C♮ under the cadence, and Aloysius has words.

The alternative to the dominant chord, "any chord button during the penultimate bar arms it," is
simpler but teaches only that ficta exists, not where it comes from. Decide when building Hard.

## 3. Controls

The chord buttons are silent in static mode with chord volume at 0, but the kit's `chord` event
still reports what was pressed.

| Action | Two Ships, turn-based | Parallel Patrol |
|---|---|---|
| Pluck a strip | Move your ship to that pitch and hear it. Pluck again to change your mind | Shoot at bar *n* (strip *n*) |
| Any chord button (not the dominant) | Commit: the cantus advances | — |
| Dominant chord (Hard only) | Arm ficta for this bar | — |
| Keyboard fallback | `1`…`=` are the strings, a chord key commits | Same |

Strip *n* → bar *n* works because Fux's cantus firmi are 8 to 14 notes long. Longer ones scroll, and
the strips aim at the visible window.

## 4. Kit changes (done, before the game)

1. **`core/counterpoint.js`**, a new ES module.
   - **`findParallels(prev, next)`** moved in from `choir/index.html` unchanged: same signature (Maps
     of voice → MIDI), same `P5`/`P8`/`H5`/`H8` flags.
   - **Choir** imports it through a small `<script type="module">` that puts it on `window`. Its main
     script stays a classic script (it has 27 inline handlers). Checked in a browser: the function
     arrives and flags a parallel fifth, with no console errors.
   - Fux's stricter rule (no similar motion into *any* perfect consonance) is part of `check()`, so
     Choir's behaviour is unchanged.
   - **Not yet loaded by the Practice Room.** It's 17 KB, and boot.js's imports reach every game's
     page, which `tools/weigh.js` already finds over a phone's budget. When the game lands, boot.js
     should import it only when `PAGE_SCRIPTS` holds Fux's files (a dynamic `import()` before running
     them). The harness's `wrap` list (`tests/arcade/harness.js`) needs `counterpoint.js` added too.
2. **Harp note-off.** `core/minichord.js` dispatches a `harpoff` event `{note, ch}` on a note-off, or a
   note-on with velocity 0. It comes from the harp port and from the harp's channel in single port
   mode, and never reaches the chord. Tested in `tests/arcade/harp-off.test.js`.
3. **Still to do, with the game:** `room.js` hands games only the pitch class. Fux's branch of the
   harp dispatch needs the event's full MIDI note, to get the octave and the strip (from the note and
   the current mask).

## 5. The rule engine

`core/counterpoint.js` is pure: no DOM, no device. It runs in Node tests directly.

```
check({cantus, cp, mode, species, above}) → [{bar, beat, rule, severity, text}]
interval(mode, a, b) → {semis, number, simple, quality, name: "m6", class: "perfect"|"imperfect"|"dissonant"}
motion(a0, a1, b0, b1) → "contrary"|"oblique"|"similar"|"parallel"|"none"
solve({cantus, mode, species, above, pitches, seed, budget}) → cp | null
degree(mode, midi) → {pos, alt}        modeWindow(mode, low, count)
harpWindow(mode, cantus, above, shift) → the 12 strings      RULES, MODES, CANTUS, midiOf, forbidden
```

Pitches are MIDI numbers. A counterpoint is one entry per bar: a number (species 1), or
`[down, up]` with `null` for an opening half rest and a single note in the last bar (species 2).
Intervals are counted by degree within the mode, so an augmented 4th and a diminished 5th are named
apart, and C♯ in D Dorian is the 7th raised. A counterpoint shorter than its cantus is checked as far
as it goes. Nothing about the ending is judged, and neither is a leap or dissonance still waiting
for its next note. Rule ids are in `RULES` (`parallel5`, `direct`, `unrecovered`, …).

### Severities

| Severity | In Two Ships | In Patrol |
|---|---|---|
| **Fatal** | Crash: lose a life, replay the bar | A target worth full points |
| **Fault** | Off balance: combo resets, Aloysius scowls | A target worth half |
| **Style** | Aloysius grumbles at the review; score penalty | Only in "Aloysius's eye" levels |
| **Praise** | Combo grows | — |

### Species 1: note against note

| Rule | Severity |
|---|---|
| Every interval consonant: P1, m3, M3, P5, m6, M6, P8 and compounds. The 4th is a dissonance here | Fatal |
| Parallel 5ths or 8ves (including unisons, and octave-equivalent ones) | Fatal |
| Begin on a perfect consonance. Counterpoint below begins on the unison or octave only, since a 5th below would suggest another mode | Fatal |
| End on the unison or octave, reached by step in contrary motion: M6→8ve (counterpoint above) or m3→unison (below), with ficta where the mode needs it | Fatal: no docking |
| Similar motion into a perfect consonance (direct 5th or 8ve), Fux's strict two-voice rule | Fault |
| Unison anywhere but the first and last bar | Fault |
| Melodic leap of an augmented or diminished interval, or larger than a 6th. Only the octave and the ascending minor 6th are allowed | Fault |
| A leap not recovered by step in the opposite direction | Fault |
| Voice crossing or overlap | Fault |
| More than three parallel 3rds or 6ths in a row | Style |
| Repeated note | Style |
| Outlining a tritone across a run in one direction | Style |
| Climax (highest note) not unique | Style |
| Voices more than a 10th apart | Style |
| Contrary motion | Praise |

### Species 2: two against one

Everything from species 1 still applies, with these changes:

| Rule | Severity |
|---|---|
| Downbeats consonant | Fatal |
| An upbeat dissonance only as a passing tone: by step in, by step out, same direction | Fatal |
| Parallel 5ths or 8ves between successive downbeats, not saved by the upbeat between them | Fault |
| The first bar may open with a half rest | — |
| The penultimate bar may be a whole note. Otherwise its upbeat leads into the cadence (5th → 6th → 8ve above). The whole note is needed where the mode has no 5th to give there: Aeolian above, where B–F is diminished and an octave on the downbeat would make octaves on successive downbeats | — |
| Repeated note (downbeat to upbeat) | Fault |

### Data

Use Fux's own two-voice cantus firmi, one per mode, transcribed from the 1725 *Gradus*. They're public
domain. `CANTUS` in `core/counterpoint.js` holds all six, **written from memory and still to be
verified against a facsimile**. Each cantus is stored
as letters plus octave, with its mode, and with a reference solution if Fux gives one (a free test
case for the checker).

Don't quote Alfred Mann's English translation (1943), which is still under copyright. Write Aloysius's
lines from scratch in his manner.

### The solver

A backtracking search over the harp's strings, with a seeded random order that leans towards steps.
The ending is fixed before it starts (the final, and the 6th or 3rd before it, ficta included). It
remembers dead ends by the last three notes. It tries for no Style findings first, then allows up to
three.

- **Species 1** solves in milliseconds.
- **Species 2** takes up to about 6 seconds in the worst case (Aeolian above). The game should solve
  during the title screen or between rounds, or keep a cache by cantus, species, voice and seed.
- **`harpWindow(…, shift)`:** a cantus that leaves too little room can try the window moved a degree
  or two further away. All 24 cases (6 modes × 2 species × above/below) solve with shift 0.

It has three jobs:

- **Demo mode:** the cabinet's attract loop plays a solved Two Ships round.
- **Patrol:** take a clean solution and inject a chosen number of errors of chosen kinds. Rerun the
  checker on the result so the targets are exactly what the checker says, nothing hand-planted.
- **The Hint power-up:** one legal next note, consistent with some complete solution, shown as a
  ghost ship.

## 6. Mode A: Parallel Patrol (recognition)

A finished two-voice line scrolls along the staff. Some bars are wrong; shoot them before they
reach the left edge.

- **Aim:** pluck strip *n* to fire at bar *n*. A hit flashes the rule's name ("PARALLEL 5THS") with
  the offending interval drawn as a red beam.
- **Shells:** a miss on a clean bar costs a shell. An error that scrolls away unshot costs a heart, and
  Aloysius names it.
- **Levels in each species:**
  1. Only Fatal errors, two per line
  2. More errors and faster scrolling
  3. Faults mixed in
  4. "Aloysius's eye": Style errors too, and a clean line is possible, so holding fire is a skill
- **Patrol comes first in each species.** You learn to see the rule before you have to obey it.

## 7. Mode B: Two Ships (composition)

The field is a two-staff system that scrolls left. The cantus ship rides its staff on its notes, and
your ship rides yours, so height means written pitch, and you read the line you're flying. Reuse Sight
Line's staff drawing and Bravura glyphs (`drawStaff` in `practice/games.js`).

- **Species 1, turn-based:** the cantus note sounds, you pluck to place your ship, and the beam between
  the ships takes the interval's colour. Commit with a chord button. Species 2 is two plucks per bar,
  downbeat then upbeat, then commit.
- **Beam colours:** perfect consonance gold, imperfect green, dissonance red.
- **Difficulty:**
  - *Easy:* the beam shows its colour while you preview, and a parallel 5th or 8ve shows a "lock-on"
    warning before you commit.
  - *Normal:* colours only. Parallels reveal themselves on commit, as a crash.
  - *Hard:* no colours, ficta by hand (§2).
- **Docking:** the last two bars are the cadence. Land it and the ships dock. A wrong cadence is a
  failed dock, and the round is replayed.
- **Scoring:**
  - The base score is Aloysius's approval for the line.
  - Contrary motion builds a combo multiplier, up to ×4, which resets on a Fault.
  - Finishing without the Hint or Ficta power-ups adds a bonus.
- **Rounds and levels:** a round is one cantus. A level is a mode and a voice position: above, then
  below. Clear it on Aloysius's approval.
- **Tempo mode** (later levels, possibly not in the first release): the cantus advances on a clock, and
  your last pluck is committed when it does. Species 2's half notes suit this well.

## 8. Aloysius

- **Portrait and speech panel** beside the field. He speaks between rounds (the review) and briefly
  during play when something Fatal happens.
- **The approval meter is the score shown as a face,** from a scowl up to a rare "Bene."
- **Verdicts are tied to bars:** each line highlights the bar it's about.
- **He remembers repeated faults.** Lines come in three levels of exasperation per rule, chosen by how
  often you've made that mistake this session.
- Chord Hunt's dog and its readout ("Am: ii") are the nearest precedent for a game character.
- **An LLM layer is possible later:** the checker decides *what's* wrong, and a model only phrases it.
  Canned lines always work without it.

## 9. Arcade integration

- **Files:**
  - `arcade/games/fux.js`: the game, with the usual header comment describing it.
  - `fux-power.js`: power-ups.
  - `fux-sounds.js`: its own sound table, as every game now has (`arcade/sounds.js`). A quiet
    one, since the cantus and the harp are the music.
  - `fux-demo.js`, if the demo grows big.
  - `fux/index.html`: the redirect stub with og/twitter meta.
  - `fux/card.png`.
- **Registration:** the kind code `fux` goes in about 25 places in `cabinet.js`, `kit.js`, `bonus.js`,
  `room.js`, `screen.js`, `arcade/index.html` and the root `index.html`. In `practice/index.html` it
  goes in `GAME_SLUGS`, and in `ALL_SCRIPTS` the game's files are tagged `"fux"`, so its own page
  loads only the shared files and its own. Chord Hunt's commit (`70e4e65`) is the template.
- **Controls:** the harp played as notes is shared in `arcade/controls.js` (`asHarp()`), but Fux tunes
  the harp itself, as Harp Command does. In keyboard play the letter keys are the chord buttons, so
  the game must not claim any letter for itself. On a touch screen the field already fits and takes a
  finger.
- **Power-ups:**
  - `DA_CAPO`, which every game has.
  - *Ficta*: auto-raises one cadence on Hard.
  - *Aloysius dozes*: one Fault forgiven.
  - *Hint*: the solver's ghost ship.
  - *Tactus*: slower scrolling in Patrol.
- **Own bonus round (`BONUS_OWN`): NAME THE INTERVAL.** 20 seconds. A pair sounds; pluck the strip that
  far above the lowest one.
- **Demo:** the solver flies a round of Two Ships, with Aloysius approving.
- **Tests:**
  - `tests/arcade/counterpoint.test.js` (written): the rule engine, the moved `findParallels`, and
    solver output that always passes `check()`.
  - `tests/arcade/fux.test.js`: through the harness. Check the harp settings written (35 → 236 → 36,
    plus 3 and 122), the mask swap at the cadence, a Patrol hit and miss, and a Two Ships commit and
    crash.
  - The shared tests (pages, demos, lobby, title-cycle, game-clock) need their entries bumped.
  - `tests/README.md` describes every test; extend it.
- **Optional tuning:** quarter-comma meantone (address 237) for pure thirds. Only if the browser's
  cantus voice follows the same temperament through `tune()`; otherwise the two voices beat against
  each other.

## 10. Build order

1. ~~Commit Tonic & Hounds~~ (landed as Chord Hunt).
2. ~~`core/counterpoint.js` with `findParallels` moved in, Choir importing it, parity tests.~~
3. ~~Harp `harpoff` in the kit, with tests.~~ The full note for Fux's harp dispatch comes with the game.
4. ~~Rule engine for species 1 and 2, the solver, tested in Node.~~ Still open: verify the cantus
   firmi against a facsimile.
5. Parallel Patrol, species 1 then 2.
6. Two Ships, species 1 then 2, with Aloysius.
7. Arcade integration: demo, bonus round, power-ups, registration, card.

## 11. Later

- **Species 3, four against one:** passing and neighbour tones, the cambiata. Turn-based gets tiring at
  four plucks a bar, so tempo mode is probably the default.
- **Species 4, syncopation:** hold a strip across the bar line (`harpoff`). The suspended dissonance
  glows, and releasing to the strip a step below before the timer runs out resolves it. Releasing early
  or stepping up breaks the suspension.
- **Species 5, florid:** the boss stage. Aloysius is more lenient here, since Fux leaves much of it to
  taste.
- **Three voices.** The engine's per-pair checks already generalize.

## Open questions

- **Ficta on Hard:** the dominant chord or any button (§2)?
- **Lydian:** Fux often flattens B against F to avoid the tritone. Does the game offer B♭ as a second
  ficta swap, or keep Lydian strict?
- **Tempo mode for species 1–2:** in the first release, or with species 3?
