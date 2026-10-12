#!/usr/bin/env bash
# Fetch the vibraphone, fingered bass, sitar and electric piano: the General MIDI instruments from
# the FluidR3_GM and Musyng Kite soundfonts, as pre-rendered one note per file by
# gleitz/midi-js-soundfonts, every second semitone across each one's range, renamed by MIDI note
# number like the choir's (samples/<instrument>/<fluid|musyng>/<note>.mp3). The minichord's
# firmware builds sampled voices from them (generator/samples.py).
# Run from the repository root:  bash tools/fetch-instrument-samples.sh
set -euo pipefail
BASE="https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages"
NAMES=(C Db D Eb E F Gb G Ab A Bb B)
fetch(){   # gm-name folder low high
  local inst="$1" dir="$2" lo="$3" hi="$4"
  for font in FluidR3_GM MusyngKite; do
    local sub; [ "$font" = FluidR3_GM ] && sub=fluid || sub=musyng
    mkdir -p "samples/$dir/$sub"
    for ((m=lo; m<=hi; m+=2)); do
      local name="${NAMES[$((m%12))]}$((m/12-1))"
      local out="samples/$dir/$sub/$m.mp3"
      [ -s "$out" ] && continue
      curl -sSfL "$BASE/$font/$inst-mp3/$name.mp3" -o "$out"
    done
    echo "$dir/$sub: $(ls "samples/$dir/$sub" | wc -l) notes"
  done
}
fetch vibraphone           vibraphone 48 96
fetch electric_bass_finger bass       28 72
fetch sitar                sitar      40 88
fetch electric_piano_1     epiano     36 90
du -sh samples/vibraphone samples/bass samples/sitar samples/epiano
