// The Practice Room's modules. The page's own code is plain scripts (practice/games.js, the arcade's
// files, practice/room.js), run in order after this and sharing one scope, so the arcade can live
// in files of its own; this brings in the Lab's core modules, hands them to those scripts, then runs
// them: PAGE_SCRIPTS, chosen (and already fetching) in practice/index.html's head.
import {Minichord, spell} from "../core/minichord.js";
import {chordName, chordId, isChord, hzOf, spellTones} from "../core/theory.js";
import {TEMPERAMENT_TABLE, tune} from "../core/temperaments.js";
import {Piano} from "../core/sound.js";
import {SCORES_API as SCORES_HOST} from "../core/scores.js";

Object.assign(window, {Minichord, spell, chordName, chordId, isChord, hzOf, spellTones, TEMPERAMENT_TABLE, tune, Piano, SCORES_HOST});
for(const src of PAGE_SCRIPTS){ const s=document.createElement("script"); s.src=src; s.async=false; document.body.appendChild(s); }   // in order, each after the one before
