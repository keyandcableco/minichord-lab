#!/usr/bin/env bash
# Fetch the tabla's strokes: the 26 one-shots Sonic Pi bundles (etc/samples/tabla_*.flac), recorded
# by Marius Miron (Freesound user mmiron, once dio_333, pack 8162) and dedicated to the public domain
# (CC0). Pinned to a Sonic Pi commit so the files can't change under the firmware that's built from
# them. Run from the repository root:  bash tools/fetch-tabla-samples.sh
set -euo pipefail
BASE="https://raw.githubusercontent.com/sonic-pi-net/sonic-pi/c05215b7cc45db19bbc11e5090f12d176e10d6b7/etc/samples"
mkdir -p samples/tabla
for s in dhec ghe1 ghe2 ghe3 ghe4 ghe5 ghe6 ghe7 ghe8 ke1 ke2 ke3 na na_o na_s re tas1 tas2 tas3 te1 te2 te_m te_ne \
         tun1 tun2 tun3; do
  out="samples/tabla/tabla_$s.flac"
  [ -s "$out" ] && continue
  curl -sSfL "$BASE/tabla_$s.flac" -o "$out"
done
echo "tabla: $(ls samples/tabla | wc -l) strokes"
