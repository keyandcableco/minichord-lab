#!/bin/sh
# Builds samples/speech/: the Vocoder page's loops of speech, the first eight Harvard sentences (IEEE
# list 1) read by a woman and by a man from the ARU speech corpus (University of Liverpool, CC BY 3.0):
# recorded in an anechoic room and kept up to 9 kHz, so the s, t and sh the vocoder's hiss band
# listens for are there. Each sentence, its silence trimmed, is laid at the start of a bar of 4/4 at
# 80 BPM (3 s), so every loop is whole bars and a chord changed on the bar lands with the next
# sentence.
#
# The corpus is one 4 GB zip; only the sixteen sentences needed are read out of it, by range requests
# (about 10 MB). Needs python3, sox, and flac support in sox.
#   tools/make-speech-loops.sh [folder to keep the downloaded sentences in]
set -e
cd "$(dirname "$0")/.."
src=${1:-$(mktemp -d)}
out=samples/speech
# ARU talker IDs, 08 a woman of 32 and 05 a man of 35, and how far each one's peaks are limited, in
# dB: the man talked more quietly through the chords, so his loops' few sharpest peaks are shaved by
# 8 dB, which lets the rest of him come up 3 dB (the vocoder hears only each band's loudness, so a
# limited peak changes nothing it does with it)
voices="woman:08:0 man:05:8"
mkdir -p "$out" "$src"
python3 - "$src" <<'EOF'
import io, os, sys, zipfile, urllib.request
URL = "https://datacat.liverpool.ac.uk/681/1/ARU_Speech_Corpus_v1_0.zip"
class Remote(io.RawIOBase):
    """the zip on the server, read a range at a time"""
    def __init__(s, url):
        s.url, s.pos = url, 0
        s.size = int(urllib.request.urlopen(urllib.request.Request(url, method="HEAD")).headers["Content-Length"])
    def seekable(s): return True
    def readable(s): return True
    def tell(s): return s.pos
    def seek(s, o, w=0): s.pos = o if w == 0 else s.pos + o if w == 1 else s.size + o; return s.pos
    def readinto(s, b):
        n = min(len(b), s.size - s.pos)
        if n <= 0: return 0
        d = urllib.request.urlopen(urllib.request.Request(s.url, headers={"Range": f"bytes={s.pos}-{s.pos + n - 1}"})).read()
        b[:len(d)] = d; s.pos += len(d); return len(d)
dest = sys.argv[1]
want = [f"ID{t}_ARU_Fs=65536Hz_Standard speech - List 1 - Sentence {n} - Version 1_0.wav" for t in ("05", "08") for n in range(1, 9)]
want = [w for w in want if not os.path.exists(os.path.join(dest, w))]
if want:
    z = zipfile.ZipFile(io.BufferedReader(Remote(URL), buffer_size=1 << 20))
    for w in want: open(os.path.join(dest, w), "wb").write(z.read(w))
EOF
tmp=$(mktemp -d)
# loop name, then how many of the list's sentences it holds
make() {
  voice=$1; id=$2; name=$3; count=$4; parts=""
  for n in $(seq 1 "$count"); do
    f="$src/ID${id}_ARU_Fs=65536Hz_Standard speech - List 1 - Sentence $n - Version 1_0.wav"
    # the silence either side trimmed, a breath of lead-in, faded, and padded out to the bar
    sox "$f" -b 16 "$tmp/cut.wav" silence 1 0.02 0.5% reverse silence 1 0.02 0.5% reverse rate -v 22050
    sox "$tmp/cut.wav" "$tmp/$voice-$name-$n.wav" fade t 0.01 0 0.06 pad 0.04 3
    sox "$tmp/$voice-$name-$n.wav" "$tmp/$voice-$name-$n-bar.wav" trim 0 3.0
    parts="$parts $tmp/$voice-$name-$n-bar.wav"
  done
  sox $parts "$tmp/$voice-$name.wav"
}
for v in $voices; do
  voice=${v%%:*}; id=$(echo "$v" | cut -d: -f2)
  make "$voice" "$id" one-line 1; make "$voice" "$id" two-lines 2
  make "$voice" "$id" four-lines 4; make "$voice" "$id" eight-lines 8
done
# compressed, gently, then up to a peak of -1 dB: speech read evenly is mostly far below its peaks, and
# the vocoder's chord is only as loud as the voice is in each band, so this keeps the talking chord
# within a few dB of the dry one (the consonants come up a little too)
rm -f "$out"/*.flac
for f in "$tmp"/*-line.wav "$tmp"/*-lines.wav; do
  name=$(basename "$f" .wav); limit=""
  for v in $voices; do case "$v" in "${name%%-*}":0) ;; "${name%%-*}":*) l=${v##*:}; limit="gain -n 0 compand 0.0002,0.03 -$l,-$l,0,-$l 0 -90 0.005";; esac; done
  sox "$f" "$out/$name.flac" highpass 70 gain -6 compand 0.001,0.1 6:-60,-45,-10 -4 -90 0.01 $limit gain -n -1
done
rm -r "$tmp"
for f in "$out"/*.flac; do echo "$f $(soxi -D "$f")s $(du -h "$f" | cut -f1)"; done
