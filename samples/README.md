# Samples

`piano/` holds the General MIDI "Acoustic Grand Piano" from the FluidR3_GM soundfont, as pre-rendered one note per file by [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts). Every second semitone from C2 to E6 is included, named by MIDI note number, unmodified. `core/sound.js` shifts each by up to a semitone to cover the notes between.

License: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/), as stated by the midi-js-soundfonts project.

## choir

`choir/` holds the General MIDI "Choir Aahs" (`aah`) and "Voice Oohs" (`ooh`) instruments from three free soundfonts, as pre-rendered one note per file by the same project. Every second semitone from C2 to E6 is included, named by MIDI note number, unmodified. The choir view builds its sustain loops at load time.

| Folder | Soundfont | License |
|---|---|---|
| `choir/fluid/` | FluidR3_GM | [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/) |
| `choir/musyng/` | Musyng Kite | [Creative Commons Attribution Share-Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `choir/fatboy/` | FatBoy | [Creative Commons Attribution Share-Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |

The licenses are as stated by the midi-js-soundfonts project. The share-alike terms apply to these samples and anything made from them, not to the lab's code.
