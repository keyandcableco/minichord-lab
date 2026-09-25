/* ============================================================================
 * temperaments.js: the minichord's temperaments (address 237), so a view can
 * tune any chord in any of them, with or without the instrument.
 *
 * The table is generated from firmware/generator/temperaments.py on the
 * test-allFeatures branch of keyandcableco/minichord: whole-cent offsets from
 * equal temperament for C..B, with A held fixed, exactly what the device plays.
 * Keep it in step with that file; new temperaments go at the end there too.
 * ========================================================================== */
import {spell} from "./minichord.js";

export const TEMPERAMENT_TABLE = [
  {"label": "Equal", "division": 12, "cents": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "note": "Twelve identical steps, the default. Every key sounds the same and no interval but the octave is quite in tune: a major third is 13.7 cents wide, the faint beating in a piano chord."},
  {"label": "Meantone", "division": 12, "cents": [10, -14, 3, 21, -3, 14, -10, 7, -17, 0, 17, -7], "note": "Quarter-comma meantone, what most Renaissance and early Baroque keyboard music was written for. Major thirds are pure and fifths pay for it at 5.4 cents narrow. The wolf sits between G# and Eb: Eb, Bb, F, C, G, D, A and E major are sweet, B, F#, Db and Ab major unusable."},
  {"label": "Just", "division": 12, "cents": [16, 27, 20, 31, 2, 14, 6, 18, 29, 0, 12, 4], "note": "Five-limit just intonation for C major. Thirds and fifths dead in tune in the home key, noticeably out in others."},
  {"label": "Pythagorean", "division": 12, "cents": [-6, 8, -2, -12, 2, -8, 6, -4, 10, 0, -10, 4], "note": "Pure 3:2 fifths from Eb round to G#. Bright, wide thirds at 21.5 cents sharp. Right for medieval music, wrong for most of what came after."},
  {"label": "Werckmeister III", "division": 12, "cents": [12, 2, 4, 6, 2, 10, 0, 8, 4, 0, 8, 4], "note": "Andreas Werckmeister, 1691. Four fifths (C–G, G–D, D–A and B–F#) narrowed by a quarter of the Pythagorean comma, the rest pure. Every key is playable: C and F major have the calmest thirds, 3.9 cents wide, and Db, F# and Ab major the widest, 21.5."},
  {"label": "Kirnberger III", "division": 12, "cents": [10, 0, 3, 4, -3, 8, 0, 7, 2, 0, 6, -1], "note": "Johann Philipp Kirnberger, 1779. The fifths from C to E are narrowed by a quarter of the syntonic comma, so C–E is a pure 5:4; F#–C# gives up a schisma and the rest are pure. The home keys are very sweet and the far ones pointedly bright."},
  {"label": "Vallotti", "division": 12, "cents": [6, 0, 2, 4, -2, 8, -2, 4, 2, 0, 6, -4], "note": "Francesco Antonio Vallotti, 18th century. The six fifths from F to B are narrowed by a sixth of the Pythagorean comma and the other six are pure. Smooth and even-handed, and a common choice today for Baroque music: thirds from 5.9 cents wide in F, C and G major to 21.5 in Db, F# and B."},
  {"label": "Young", "division": 12, "cents": [6, -4, 2, 0, -2, 4, -6, 4, -2, 0, 2, -4], "note": "Thomas Young, 1800. Vallotti's shape moved up a fifth: the six fifths from C to F# are narrowed by a sixth of the Pythagorean comma, the rest pure. C, D and G major have the calmest thirds, 5.9 cents wide."},
  {"label": "Kellner", "division": 12, "cents": [8, -2, 3, 2, -3, 6, -4, 5, 0, 0, 4, -1], "note": "Herbert Anton Kellner's 1977 proposal for the tuning of Bach's Well-Tempered Clavier. Five fifths (C–G, G–D, D–A, A–E and B–F#) narrowed by a fifth of the Pythagorean comma. Thirds from 2.7 cents wide in C major to 21.5 in Db, F# and Ab."},
  {"label": "1/6 Meantone", "division": 12, "cents": [5, -7, 2, 10, -2, 7, -5, 3, -8, 0, 8, -3], "note": "Meantone with fifths narrowed by a sixth of the syntonic comma. Major thirds are 7.2 cents wide instead of pure, and the wolf between G# and Eb shrinks to 16 cents, so more keys are usable. Often associated with Gottfried Silbermann's organs."},
  {"label": "19-EDO", "division": 19, "cents": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "note": "Nineteen steps to the octave. The buttons mean exactly what they did, but C# and Db are now different notes a step apart, with C# the lower. Minor thirds land within a cent of pure; fifths pay 7 cents for it."},
  {"label": "31-EDO", "division": 31, "cents": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "note": "Thirty-one steps. Major thirds essentially exact, and the augmented sixth lands within a cent of the 7:4 harmonic seventh — the interval twelve-note tuning has no room for. Sharps and flats are two steps apart here."}
];

const NATURAL = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const EDO_NATURALS = {19:{C:0,D:3,E:6,F:8,G:11,A:14,B:17}, 31:{C:0,D:5,E:10,F:13,G:18,A:23,B:28}};
const EDO_SHARP = {19:1, 31:2};
const ACC = {"♯":1,"♭":-1,"𝄪":2,"𝄫":-2};

/** the pitch, in semitones, that a MIDI note sounds at in a temperament
 *  (for 19 and 31 steps the note's spelling in the key decides which step it takes) */
export function tune(note, index, keyFifths=0){
  const t = TEMPERAMENT_TABLE[index] || TEMPERAMENT_TABLE[0];
  const n = Math.round(note);
  if(t.division===12) return n + t.cents[((n%12)+12)%12]/100;
  const name = spell(((n%12)+12)%12, keyFifths);
  const letter = name[0];
  const acc = [...name.slice(1)].reduce((s,ch)=>s+(ACC[ch]||0),0);
  const octave = Math.floor((n - acc - NATURAL[letter]) / 12);
  const steps = EDO_NATURALS[t.division][letter] + acc*EDO_SHARP[t.division];
  const anchorA = 9 - EDO_NATURALS[t.division].A*12/t.division;   // A keeps its pitch, as in the twelve-note ones
  return octave*12 + steps*12/t.division + anchorA;
}

/** the temperament in use: the minichord's, once its settings are known, otherwise the page's own choice */
export function activeTemperament(mc, pageChoice=0){
  return mc.temperament!=null && mc.sysex ? mc.temperament : pageChoice;
}
/** the chord's notes as they sound: exact MPE pitches when the minichord bends them, otherwise tuned from the table */
export function soundingPitches(mc, voices, pageChoice=0){
  const bent = mc.mpe && voices.some(v=>Math.abs(v.pitch-Math.round(v.pitch))>0.004);
  const t = activeTemperament(mc, pageChoice);
  return bent ? voices.map(v=>v.pitch) : voices.map(v=>tune(v.note, t, mc.keyFifths));
}
