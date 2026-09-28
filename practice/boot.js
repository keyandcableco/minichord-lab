// The Practice Room's modules. The page's own code is plain scripts (practice/games.js, the arcade's
// files, practice/room.js), loaded in order after this and sharing one scope, so the arcade can live
// in files of its own; this brings in the Lab's core modules and hands them to those scripts.
import {Minichord, spell} from "../core/minichord.js";
import {chordName, chordId, isChord, hzOf, spellTones} from "../core/theory.js";
import {TEMPERAMENT_TABLE, tune} from "../core/temperaments.js";
import {Piano} from "../core/sound.js";
import {SCORES_API as SCORES_HOST} from "../core/scores.js";

Object.assign(window, {Minichord, spell, chordName, chordId, isChord, hzOf, spellTones, TEMPERAMENT_TABLE, tune, Piano, SCORES_HOST});
