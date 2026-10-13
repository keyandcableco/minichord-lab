#!/usr/bin/env bash
# Fetch the solo violin (arco with vibrato, forte) and the solo double bass (sustained without vibrato,
# the louder layer) from the Versilian Studios Chamber Orchestra 2 Community Edition (VSCO-2-CE, CC0),
# into samples/solo/vsco-{violin,bass}/ under their own names. tools/name-by-pitch.py then names each
# by the MIDI note it sounds (VSCO's own octave numbers differ between instruments).
# Run from the repository root:  bash tools/fetch-vsco-strings.sh
set -euo pipefail
BASE="https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master"
get(){   # folder-in-repo pattern dest
  local dir="$1" pat="$2" out="samples/solo/$3/raw"
  mkdir -p "$out"
  gh api "repos/sgossner/VSCO-2-CE/git/trees/master?recursive=1" --jq '.tree[] | select(.type=="blob") | .path' \
    | grep -F "$dir/" | grep -E "$pat" | while read -r p; do
      local f="$out/$(basename "$p")"
      [ -s "$f" ] && continue
      curl -sSfL "$BASE/$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$p")" -o "$f"
    done
  echo "$3: $(ls "$out" | wc -l) files"
}
get "Strings/Solo Violin/Arco Vib" "_f\.wav$" vsco-violin
get "Strings/Solo Contrabass/SusNV" "_v3_rr1\.wav$" vsco-bass
du -sh samples/solo/vsco-*
