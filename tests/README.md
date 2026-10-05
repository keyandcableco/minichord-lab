# Tests

Headless tests for Minichord Lab's arcade games. Each loads a game's page into
[jsdom](https://github.com/jsdom/jsdom) with a stand-in minichord (it remembers the settings a game
writes and answers requests for its settings), then plays it: chords, harp notes, knob turns and
key presses, checking what should happen.

    cd tests
    npm install        # once: jsdom
    npm test           # every test, several at once: about seven minutes (seventeen one at a time)
    npm test -- -j1    # one at a time, each check printed as it happens
    npm test -- fleet  # only the tests whose names contain "fleet"

Side by side, a test's checks print together when it finishes, and one that fails is run again on
its own before it counts: the checks keep real time, and a busy machine can make a sound one miss.

| Test | What it checks |
|---|---|
| `pages` | every game opens on its own page in the arcade's dress, its title loop running |
| `demos` | every game's demo starts, shows its captions, and skips back to the title |
| `invaders` | falling chords are shot by playing them; setting the key a key bar asks for scores |
| `harp-command` | falling notes are shot by their strings; a wrong string freezes; settings given back |
| `harp-command-power` | power-ups taken by their string; MULTISHOT shoots every note down while it runs; SLOW TIME; the SHIELD saves one life; DA CAPO gives a heart back, or one more; the bonus round's pause; the POWER-UPS page |
| `harp-command-demo` | the demo's D major labels hold while the minichord reports in, and through a resize; the multishot scene |
| `chord-snake` | the snake eats notes and cashes chords in; the harp steers |
| `chord-asteroids` | rocks crack by their chords and notes are shot on the harp |
| `chord-asteroids-power` | power-up rocks cracked by their chord give their power, not notes; PEDAL POINT holds a note and shoots every rock of it, a string with no rock moving the pedal, not jamming; FERMATA holds every rock still and sends none; RESOLUTION blows up the screen on the key's home chord; DA CAPO gives a heart back, or one more; the bonus round's pause; the POWER-UPS page |
| `chord-asteroids-demo` | the demo's POWER-UPS scene: a pedal point capsule cracked by its chord, then every E rock shot by the held note; nothing left running after |
| `chord-asteroids-salvage` | Chord Asteroids' own bonus round: wreckage hauled in by its string fills the called chord's slots, junk costs two seconds, a full chord calls the next; fair sets at every level; the field clean after |
| `chord-stack` | pieces move and rotate, the square too; a row holding a chord lights and clears its notes, the blocks above falling in; side by side scores double, a whole row five times; the harp and a knob steer; topping out ends it |
| `chord-breakout` | the knob steers (only the chosen one, without wobble or the mouse); the ball bounces true; chords break bricks |
| `chord-breakout-physics` | the paddle's hitbox is what's drawn: its very edge saves, swung into a ball it sends it up, below its middle only knocks it aside; never straight up; the paddle's swing bends the bounce; the ball quickens up to a quarter; two bricks' seam bounces as one face; a wall cleared on the last level makes the next ball faster |
| `chord-breakout-power` | capsule bricks drop their capsule, caught on the paddle: CRESCENDO grows the paddle from its middle and back; RITARDANDO slows the ball; DIVISI splits it in three, only the last costing a life; FERMATA catches and holds it till a pluck or a moment; DA CAPO gives a heart back, or one more; a missed capsule costs nothing; a lost life ends a power; the bonus round's pause; the POWER-UPS and POINTS pages |
| `chord-breakout-coda` | three bricks left open them, playable without a hit and not healed; the bonus drains and is paid on the clear; six left and nine seconds without a brick starts it too |
| `chord-breakout-catch` | Chord Breakout's own bonus round: notes fall and the paddle, steered by the knob, catches the called chord's; a wrong one costs two seconds; a full chord calls the next; fair chords at every level; the field clean after |
| `fifths-defender` | the knob's centred, endless dial; the aimed key's chord fires, another doesn't |
| `chopper-rescue` | the knobs switched on; tuning in by harp, keys or knob; Ben; the radio decodes right; decoys; the survivors' signal in order; no repeated calls |
| `chopper-rescue-power` | the later levels call in every key, dealt so no call comes round more than its share; a first inversion's instruction held on the radio, each note marked with its place in the chord; a right chord lands where the called one lies; supply crates flown out for by their chord: TAILWIND, RADAR, WINCH and DA CAPO; the POWER-UPS page |
| `chord-sweeper` | each key's chain of tension, spelled; every square's chord fits its distance from the nearest mine; the harp steers; a key's chord defuses its mine |
| `between-the-frets` | the speaker silenced; only recognisable quarter-tones asked for; answering by ear, finding it with the modifier; riffs |
| `between-the-frets-firmware` | on firmware 18: 24-EDO and MPE, any letter, the quarter-tone read from the minichord's own bend |
| `sight-line` | notes and chords read at the playhead; wrong strings and missed notes; key signatures and key changes; inversions and their bass; tunes named; the demo scrolls like play |
| `chord-hunt` | every level's chords spell plainly in every key it deals; a round asks for its key while it opens: set with the combo it scores, a wrong one is put back, and one not set is set at the first duck (a minor key, its relative major's); the modifier set for the borrowed chords; a duck is shot by its chord; a wrong chord waits a moment, then spends a shell and says its numeral; three wrong and it's away; the harp replays home and the duck, as help; too few ducks costs a life, enough moves on; a V7 played through its triad isn't a miss; flocks in order, named; the dog's tag gives its power-up; the POWER-UPS page; Clay Shooting; the key given back |
| `chord-hunt-touch` | on the screen's minichord, a chord button held while a round opens sets its key and scores, playing nothing at the game; with a duck up, a chord held is a shot, never a key change |
| `key-racer` | every circuit's chords spell plainly and its oil is never of the key; the circle spells in every key; qualifying's seven chords in order set the grid; the harp steers (low strings left) and, chosen instead, a knob; a gate of the key collected, one not played open shut, oil spins the car; a gate played open; a rival pulled over by its chord, one out of the key not; V then I the turbo; the line finishes and the next circuit comes; the clock costs a life; Endurance's checkpoint changes the key and extends the clock for its I; the signature at C, the modifier set for the key; the key given back |
| `chord-burger` | the kitchens hold together (ladders on girders, every ingredient whole on one, every girder reached); every level deals chords that spell, voiced as the minichord voices them; the minichord set up two octaves up without voice leading, the chord octave down one; the cook walks while a way's held on the harp or the keys, stands when it's let go, takes a ladder a held way asks for; an ingredient trodden across drops, knocks the one below down, lands on its plate in its column's order; a plate served by its chord and bass, a slash chord as good as the knob, the wrong bass refused and named; the knobs write the inversion (37) and spacing (38); in the open kitchens only the whole stack serves; SET FOR ME voices the waiting plate; the pepper harmonises a sour note whose note's in the chord for a shake, wastes one that isn't; riders squashed for a bonus; a sour note catches the cook, a life lost, the ingredients kept; every plate served clears the kitchen to the next level; the combo meal only left to right; FLIP; the settings given back |
| `chord-chomp` | the maze's key set on the minichord, the ghosts wearing its chords; the harp and the keys steer; dots eaten, waka with nothing held and the held chord's notes with one; a chord latched (played and let go) singing on till it's played again, and HOLD counting it only while held, for a quarter more; a power pellet turns blue only the ghost whose chord is held, caught for its points, while one not held still catches you; the cadences named; a key that turns up taken by the combo, the ghosts' chords moving with it, any other key put back, and without the combo its home chord takes it; the little minichord a key leaves in the tunnel, once a game, and its jam session: the chords in a progression's order, a wrong one costing time, all four catching their ghosts for the bonus; FERMATA, REST and DA CAPO; a caught ghost's eyes home and out again; a maze cleared is the next level; the whole maze in view on a wide field at a whole number of screen pixels a pixel, and on a phone bigger, scrolling to keep the player in view; the key given back |
| `chord-asteroids-aim` | chord rocks worth their chord; manual aim: the knobs made inert, the ship spun by a knob, off-line shots wide, notes double; both knobs endless at their stops |
| `chord-invaders-aim` | manual aim: the knobs inert, the ship steered by a knob, a chord above the ship hits and one elsewhere goes wide, the multiplier doubled |
| `chord-invaders-power` | the beam destroys that chord above the ship, on energy; omni beam destroys anything and sweeps in auto aim; power-ups taken by their chord; slow time; the shield; DA CAPO gives a heart back, or one more up to five, rarer than the rest |
| `minichord-contact` | a gentle press whose contact flickers is read as its one chord, quickly; firm presses, new chords and letting go as before |
| `harp-off` | a harp string let go is a `harpoff`, from the harp's port and its channel in single port mode; a chord note's release stays the chord's |
| `harp-held` | a zone is held from a string's touch to its release, the newest arrow held the way, a zone held while any of its strings is, all let go when the page loses the focus; on firmware 22 and up the harp sounds at the touch and lets go at the lift, with no palm mute, given back after |
| `voicing` | the firmware's chord inversion (37) and spacing (38), ported: voices stacked from the inversion's tone, drops counted from the top, a spread, a drop with no room not made; the screen's minichord voices by them |
| `counterpoint` | `core/counterpoint.js` on its own: Choir's parallels as they were; intervals by degree in the mode (d5, A4, ficta); the first, second and fourth species' rules, each caught at its bar (suspensions: 7–6 and 4–3 above, 2–3 below, resolved down by step; fifths on the upbeats; ties not counted as repeats); the solver's lines break no rule, in every mode, above and below |
| `pixel-minichord` | what's made from the pixel minichord's grid is up to date; Ben holds it |
| `chord-matrix-stack` | the alternate matrix sets the layout and deals sus chords that light and clear; the helper's buttons; the custom matrix follows the preset's slots |
| `chord-matrix-invaders` | the chords option is offered; the alternate matrix drops sus chords that shoot down |
| `chord-matrix-games` | level names follow the chosen matrix in all five games; Barry Harris and slash levels step aside; Asteroids plays the alternate chords |
| `chopper-helper` | beginner mode's minichord carries the harp, strip or keymaster plate, lighting each string of the signal in turn |
| `demo-lights` | demos light what they press on the on-screen minichord: Fifths Defender's knob, Chord Stack's chord, Chord Sweeper's d-pad, Between the Frets' modifier; Snake's demo glows its chord on any matrix |
| `title-cycle` | every game's title screen moves on by itself after its demo |
| `invaders-demo-acts` | Chord Invaders' demo shows the beam burning every minor chord and leaving the major, and the omni power-up |
| `push-pop` | with firmware push and pop, one message gives everything back, even what the Lab never touched; without it, every borrowed setting is written back |
| `keyboard-play` | with no minichord the computer keyboard is one: its rows are the chord buttons, the number row the harp, games play unaltered, their letter controls step aside |
| `8b8-link` | the 8b8 Link page: tuning sent as twelve cents (the temperament over plain MIDI, only the A with MPE); MPE voices on lanes of their own, a reused lane let go first; the knobs, the arpeggio, the harp on drums, a sound kept with a preset; clock to the minichord; push before borrowing and one pop to give back; over USB, notes to the 8b8's MIDI port or as text over serial; latched chord voices: pinned with legato, voice leading turned on, a lane each, a voice left out or moved an octave, two lines swapping voices, the voice map, the cantus set here, all given back; an 8b8 without pinning says so; the tracker: a note, a jump and a slide, a drum named from what was sent, its chip's noise and envelope, a note let go, Buzzy Bass drawn as its sawtooth, REGS read from the board and a board without it told so, the emulator's chips read every frame |
| `invaders-oddout` | Chord Invaders' own bonus round, played with the game: chords in its field, shot with its own firing, the field left clean |
| `arcade-preset` | a game takes glide off and stops retriggers, and vibrato and delay unless the player keeps their own sound; all given back after |
| `modifier` | a double tap flips the modifier and stays flipped; set for you or by hand (×1.25); in the bonus round it follows the chord above the ship |
| `harp-command-spell` | Harp Command's own bonus round: pluck the note that doesn't spell the chord, or play the chord to shoot the rest |
| `key-fleet` | fleets never touch; hits cripple; keys are called by tonic, cadence and the key change combo |
| `high-scores` | GAME OVER before the initials; input ignored at first; the board kept; beginner mode stays off it |
| `lobby` | the arcade lobby's cabinets, best scores and ticker |
| `bonus` | every two levels a bonus round starts; each of the five mini-games can be won; the game carries on after |
| `game-clock` | every game's clock keeps true time down to ten frames a second: all fifteen ticks take up to a tenth of a second, and Breakout's ball covers the same ground at ten frames a second as at sixty |
| `cabinet-plain` | the light mode judged by time, long frames counted, never a fast machine or a tab coming back; slow in full screen on AUTO, the plain cabinet first, remembered for that screen, then the field light; CABINET, PLAIN and AUTO in the settings; the player's CRT choice can't bring scanlines into a plain cabinet |
| `fullscreen` | full screen builds the cabinet round the game, in CRT, its SOUND, RESET and connection status working; leaving puts it back |
| `timers` | a game's timers belong to its run, so none from an old game reaches the next |
| `practice-room` | the Practice Room around the arcade: every one of its games opens and deals a round |

The harness (`arcade/harness.js`) loads `practice/index.html`, where the games play, running its
scripts one by one in the page's order as a browser does, and uses the page's test hooks (`window.__sb`).
