# Samples

`piano/` holds the General MIDI "Acoustic Grand Piano" from the FluidR3_GM soundfont, as pre-rendered one note per file by [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts). Every second semitone from C2 to E6 is included, named by MIDI note number, unmodified. `core/sound.js` shifts each by up to a semitone to cover the notes between.

License: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/), as stated by the midi-js-soundfonts project.

## quartet

`quartet/` holds the General MIDI violin, viola, cello, pizzicato strings (`pizz`) and tremolo strings (`trem`) from the Musyng Kite soundfont, as pre-rendered one note per file by the same project. Every second semitone across each part's range is included, named by MIDI note number, unmodified; `tools/fetch-quartet-samples.sh` fetches them. The quartet view builds its sustain loops at load time.

License: [Creative Commons Attribution Share-Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/), as stated by the midi-js-soundfonts project. The share-alike terms apply to these samples and anything made from them, not to the lab's code.

`quartet/pizz-fluid/` is the same pizzicato strings from the FluidR3_GM soundfont, fetched by the same script and laid out the same way. Musyng Kite's pizzicato is two sections a semitone apart from MIDI 48 to 62, a layer mapped to the wrong key, so the minichord's firmware takes the middle of its pizzicato from these. License: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/), as stated by the midi-js-soundfonts project.

## choir

`choir/` holds the General MIDI "Choir Aahs" (`aah`) and "Voice Oohs" (`ooh`) instruments from three free soundfonts, as pre-rendered one note per file by the same project. Every second semitone from C2 to E6 is included, named by MIDI note number, unmodified. The choir view builds its sustain loops at load time.

| Folder | Soundfont | License |
|---|---|---|
| `choir/fluid/` | FluidR3_GM | [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/) |
| `choir/musyng/` | Musyng Kite | [Creative Commons Attribution Share-Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `choir/fatboy/` | FatBoy | [Creative Commons Attribution Share-Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |

The licenses are as stated by the midi-js-soundfonts project. The share-alike terms apply to these samples and anything made from them, not to the lab's code.

## speech

`speech/` holds the Vocoder page's loops: the first eight Harvard sentences (IEEE list 1) read by a woman (talker 08) and a man (talker 05) of the [ARU speech corpus](https://doi.org/10.17638/datacat.liverpool.ac.uk/681), recorded in an anechoic room and kept up to 9 kHz. Each sentence, its silence trimmed, is laid at the start of a bar of 4/4 at 80 BPM, gently compressed (the man's sharpest peaks limited too, so he talks as loudly through the chords), at 22.05 kHz as FLAC; `tools/make-speech-loops.sh` builds them, reading just those sixteen sentences out of the corpus.

License: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). Hopkins, C., Graetzer, S., Seiffert, G. (2019). ARU adult British English speaker corpus of IEEE sentences (ARU speech corpus) version 1.0. Acoustics Research Unit, School of Architecture, University of Liverpool. DOI: 10.17638/datacat.liverpool.ac.uk/681. The loops are cut, compressed and resampled from the originals.

## tabla

`tabla/` holds the 26 tabla strokes Sonic Pi bundles in its `etc/samples` (`tabla_na.flac`, `tabla_ghe4.flac`, …), recorded by Marius Miron (Freesound user [mmiron](https://freesound.org/people/mmiron/packs/8162/), once dio_333), unmodified; `tools/fetch-tabla-samples.sh` fetches them from a pinned Sonic Pi commit. The minichord's firmware plays a dozen of them in its drum machine (generator/drum_samples.py).

| Strokes | Hand, bol |
|---|---|
| `na`, `na_s`, `na_o` | dayan: Na (Ta), short and open |
| `tas1`-`tas3` | dayan: Tin, ringing |
| `tun1`-`tun3` | dayan: Tun, the open centre |
| `te1`, `te2`, `te_m`, `te_ne`, `re` | dayan: Te, Ti, Ne, Re |
| `ghe1`-`ghe8` | bayan: Ge (Ghe), some bent with the wrist |
| `ke1`-`ke3` | bayan: Ke (Ka), closed |
| `dhec` | a dry slap, named only so in the pack |

License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (public domain), as stated in Sonic Pi's `LICENSE.md` and `etc/samples/README.md`.
