# Samples

`piano/` holds the General MIDI "Acoustic Grand Piano" from the FluidR3_GM soundfont, as pre-rendered one note per file by [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts). Every second semitone from C2 to E6 is included, named by MIDI note number, unmodified. `core/sound.js` shifts each by up to a semitone to cover the notes between.

License: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/), as stated by the midi-js-soundfonts project.

## quartet

`quartet/` holds the General MIDI violin, viola, cello, pizzicato strings (`pizz`) and tremolo strings (`trem`) from the Musyng Kite soundfont, as pre-rendered one note per file by the same project. Every second semitone across each part's range is included, named by MIDI note number, unmodified; `tools/fetch-quartet-samples.sh` fetches them. The quartet view builds its sustain loops at load time.

License: [Creative Commons Attribution Share-Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/), as stated by the midi-js-soundfonts project. The share-alike terms apply to these samples and anything made from them, not to the lab's code.

## choir

`choir/` holds the General MIDI "Choir Aahs" (`aah`) and "Voice Oohs" (`ooh`) instruments from three free soundfonts, as pre-rendered one note per file by the same project. Every second semitone from C2 to E6 is included, named by MIDI note number, unmodified. The choir view builds its sustain loops at load time.

| Folder | Soundfont | License |
|---|---|---|
| `choir/fluid/` | FluidR3_GM | [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/us/) |
| `choir/musyng/` | Musyng Kite | [Creative Commons Attribution Share-Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `choir/fatboy/` | FatBoy | [Creative Commons Attribution Share-Alike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |

The licenses are as stated by the midi-js-soundfonts project. The share-alike terms apply to these samples and anything made from them, not to the lab's code.

## speech

`speech/` holds the Vocoder page's loops: the first eight Harvard sentences (IEEE list 1) read by a woman (talker 08) and a man (talker 05) of the [ARU speech corpus](https://doi.org/10.17638/datacat.liverpool.ac.uk/681), recorded in an anechoic room and kept up to 9 kHz. Each sentence, its silence trimmed, is laid at the start of a bar of 4/4 at 80 BPM, gently compressed, at 22.05 kHz as FLAC; `tools/make-speech-loops.sh` builds them, reading just those sixteen sentences out of the corpus.

License: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). Hopkins, C., Graetzer, S., Seiffert, G. (2019). ARU adult British English speaker corpus of IEEE sentences (ARU speech corpus) version 1.0. Acoustics Research Unit, School of Architecture, University of Liverpool. DOI: 10.17638/datacat.liverpool.ac.uk/681. The loops are cut, compressed and resampled from the originals.
