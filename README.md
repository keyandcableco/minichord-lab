# Minichord Lab

Small web views that use the [minichord](https://github.com/BenjaminPoilve/minichord) as an interface for music theory.

**Open it:** https://keyandcableco.github.io/minichord-lab/

## Views

- **[Pitch-class clock](clock/)**: every chord as a shape on a clock face, with its chord name, set class, interval vector and symmetry, and whether it's a turn (transposition) or a flip (inversion) of the chord before. Follows the minichord's key for spelling and its 19- and 31-note temperaments.
- **[Tonnetz](tonnetz/)**: each triad lights a triangle on the tone lattice, and the trail follows the fewest P, L and R flips from chord to chord, beside how far the voices actually moved against the smoothest possible voice leading. Seventh chords and other non-triads light their notes and every triangle they fill. Follows 19- and 31-note temperaments with their own fifths and thirds.
- **[Roughness](roughness/)**: Sethares's sensory roughness for each chord as tuned, the same chord in all twelve of the minichord's temperaments (choosing one switches the minichord), every major or minor triad in the current temperament against equal, a bar per chord, and the two-tone dissonance curve with the chord's intervals marked.
- **[Beats](beats/)**: a Lissajous figure of any two voices, still for a pure ratio and rolling when tempered, with each pair's nearest pure ratio, cents off it and beat rate from its closest overtones, the pair in every temperament, and a button to hear it. Uses the minichord's master tuning.
- **[Ear trainer](ear/)**: plays a chord or a three- or four-chord progression in the minichord's key, then checks what you play back on the chord buttons (or answer with an on-screen picker), with the bass note too if asked. Hints say whether the root, the kind of chord or the bass was off.
- **[Choir](https://keyandcableco.github.io/minichord-choir/)** (its own repo): each chord voice sung by its own singer.

## Layout

- `core/minichord.js`: the shared connection to the minichord. It reads the chord port over Web MIDI with MPE zones and per-voice bends, so every voice has an exact pitch, and reads the parameter dump over sysex for the key, temperament and MPE settings. Pages listen for `voices`, `chord`, `device` and `status` events.
- `core/theory.js`: pitch-class sets in any equal division: prime forms, Forte numbers, interval vectors, symmetry, transposition and inversion, and chord names spelled for the key, the smoothest voice leading between two chords, Sethares's roughness, and pure ratios and beat rates.
- `core/temperaments.js`: the minichord's temperaments as whole-cent offsets, generated from `firmware/generator/temperaments.py` on the firmware's `test-allFeatures` branch, so a view can tune any chord in any of them, and helpers that pick the minichord's exact MPE pitches when it sends them.
- `core/sound.js`: a small sampled piano for views that play something themselves, with a synthesized fallback.
- `core/lab.css`: the shared look, a chalkboard in dark mode and a whiteboard in light.
- One folder per view.
- `samples/`: sound files, with their sources and licenses in `samples/README.md`.

## Requirements

- Chrome, Edge or Opera on a computer or Android. Safari and iOS browsers have no Web MIDI.
- Allow MIDI access, including system-exclusive messages, so the views can read the key and temperament.
- For MPE, key reporting and the temperaments, the unofficial `test-allFeatures` build from [keyandcableco/minichord](https://github.com/keyandcableco/minichord). Every view has test chords that work without a minichord.

## Running it locally

The views are ES modules, which browsers won't load from a plain file. Serve the folder:

```
python3 -m http.server 8000
```

then visit http://localhost:8000/.
