#!/usr/bin/env bash
# Fetch the marimba of the Versilian Community Sample Library (VCSL, CC0; VSCO 2 has the same recordings),
# struck on the bar's outrigger, medium and loud, into samples/marimba/{med,loud}/raw under their own names;
#   python3 tools/name-by-pitch.py samples/marimba/med:12 samples/marimba/loud:12
# (VCSL names it an octave low: its "C4" sounds 523 Hz)
# then names each by its note. Run from the repository root:  bash tools/fetch-vcsl-marimba.sh
set -euo pipefail
BASE="https://raw.githubusercontent.com/sgossner/VCSL/master"
TREE=$(gh api "repos/sgossner/VCSL/git/trees/master?recursive=1" --jq '.tree[] | select(.type=="blob") | .path')
for layer in med loud; do
  out="samples/marimba/$layer/raw"; mkdir -p "$out"
  grep -F "Idiophones/Struck Idiophones/Marimba/" <<<"$TREE" | grep -E "_${layer}_01\.wav$" | while read -r p; do
    f="$out/$(basename "$p")"; [ -s "$f" ] && continue
    curl -sSfL "$BASE/$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$p")" -o "$f"
  done
  echo "$layer: $(ls "$out" | wc -l) files"
done
du -sh samples/marimba
