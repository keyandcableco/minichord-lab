# Tests

Headless tests for Minichord Lab's arcade games. Each loads a game's page into
[jsdom](https://github.com/jsdom/jsdom) with a stand-in minichord (it remembers the settings a game
writes and answers requests for its settings), then plays it: chords, harp notes, knob turns and
key presses, checking what should happen.

    cd tests
    npm install        # once: jsdom
    npm test           # every test, about five minutes, each check printed as it happens
    npm test -- fleet  # only the tests whose names contain "fleet"

| Test | What it checks |
|---|---|
| `pages` | every game opens on its own page in the arcade's dress, its title loop running |
| `demos` | every game's demo starts, shows its captions, and skips back to the title |
| `invaders` | falling chords are shot by playing them; setting the key a key bar asks for scores |
| `harp-command` | falling notes are shot by their strings; a wrong string freezes; settings given back |
| `chord-snake` | the snake eats notes and cashes chords in; the harp steers |
| `chord-asteroids` | rocks crack by their chords and notes are shot on the harp |
| `chord-stack` | pieces slide by keys, harp and knob; a chord clears its row; the stack rises |
| `chord-breakout` | the knob steers (only the chosen one, without wobble or the mouse); the ball bounces true; chords break bricks |
| `fifths-defender` | the knob's centred, endless dial; the aimed key's chord fires, another doesn't |
| `chopper-rescue` | the knobs switched on; tuning in by harp, keys or knob; Ben; the radio decodes right; decoys; the survivors' signal in order; no repeated calls |
| `chord-sweeper` | each key's chain of tension, spelled; every square's chord fits its distance from the nearest mine; the harp steers; a key's chord defuses its mine |
| `between-the-frets` | the speaker silenced; only recognisable quarter-tones asked for; answering by ear, finding it with the modifier; riffs |
| `between-the-frets-firmware` | on firmware 18: 24-EDO and MPE, any letter, the quarter-tone read from the minichord's own bend |
| `key-fleet` | fleets never touch; hits cripple; keys are called by tonic, cadence and the key change combo |
| `high-scores` | GAME OVER before the initials; input ignored at first; the board kept; beginner mode stays off it |
| `lobby` | the arcade lobby's cabinets, best scores and ticker |
| `bonus` | every two levels a bonus round starts; each of the five mini-games can be won; the game carries on after |
| `fullscreen` | full screen builds the cabinet round the game, in CRT, its SOUND, RESET and connection status working; leaving puts it back |
| `timers` | a game's timers belong to its run, so none from an old game reaches the next |
| `practice-room` | the Practice Room around the arcade: every one of its games opens and deals a round |

The harness (`arcade/harness.js`) loads `practice/index.html`, where the games play, running its
scripts one by one in the page's order as a browser does, and uses the page's test hooks (`window.__sb`).
