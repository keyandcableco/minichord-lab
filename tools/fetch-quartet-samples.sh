#!/usr/bin/env bash
# Fetch the string quartet's samples: the General MIDI violin, viola, cello, pizzicato strings and
# tremolo strings from the Musyng Kite soundfont, as pre-rendered one note per file by
# gleitz/midi-js-soundfonts, every second semitone across each part's range, renamed by MIDI
# note number like the choir's. Run from the repository root:  bash tools/fetch-quartet-samples.sh
set -euo pipefail
BASE="https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite"
NAMES=(C Db D Eb E F Gb G Ab A Bb B)
fetch(){   # instrument folder low high
  local inst="$1" dir="$2" lo="$3" hi="$4"
  mkdir -p "samples/quartet/$dir"
  for ((m=lo; m<=hi; m+=2)); do
    local name="${NAMES[$((m%12))]}$((m/12-1))"
    local out="samples/quartet/$dir/$m.mp3"
    [ -s "$out" ] && continue
    curl -sSfL "$BASE/$inst-mp3/$name.mp3" -o "$out"
  done
  echo "$dir: $(ls "samples/quartet/$dir" | wc -l) notes"
}
fetch violin            violin 54 100
fetch viola             viola  46 88
fetch cello             cello  34 80
fetch pizzicato_strings pizz   34 100
fetch tremolo_strings   trem   34 100
du -sh samples/quartet
