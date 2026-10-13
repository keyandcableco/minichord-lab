#!/usr/bin/env bash
# Fetch the two kalimbas of the Versilian Community Sample Library (VCSL, CC0): Kenya's (an mbira, the
# loudest layer) and Tanzania's, one round robin each, into samples/kalimba/{kenya,tanzania}/raw under
# their own names; tools/name-by-pitch.py then names each by its note (VCSL names both an octave low:
# python3 tools/name-by-pitch.py samples/kalimba/kenya:12 samples/kalimba/tanzania:12).
# Run from the repository root:  bash tools/fetch-vcsl-kalimba.sh
set -euo pipefail
BASE="https://raw.githubusercontent.com/sgossner/VCSL/master"
TREE=$(gh api "repos/sgossner/VCSL/git/trees/master?recursive=1" --jq '.tree[] | select(.type=="blob") | .path')
get(){   # folder-in-repo pattern dest
  local out="samples/kalimba/$3/raw"
  mkdir -p "$out"
  grep -F "$1/" <<<"$TREE" | grep -E "$2" | while read -r p; do
    local f="$out/$(basename "$p")"
    [ -s "$f" ] && continue
    curl -sSfL "$BASE/$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$p")" -o "$f"
  done
  echo "$3: $(ls "$out" | wc -l) files"
}
get "Idiophones/Plucked Idiophones/Kalimba, Kenya" "_vl3_rr2\.wav$" kenya
get "Idiophones/Plucked Idiophones/Kalimba, Tanzania" "_rr2\.wav$" tanzania
du -sh samples/kalimba
