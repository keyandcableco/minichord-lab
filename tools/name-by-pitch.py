#!/usr/bin/env python3
"""Names each recording in samples/solo/vsco-*/raw by the MIDI note it sounds: <note>.wav one folder up,
mono, as the other instruments' files are named. The note is read from the file's name (A3, C#2...) with
the instrument's octave offset: VSCO numbers the violin's octaves the usual way (A3 is 220 Hz) and the
double bass's one lower (its E0 is the low string, 41 Hz, MIDI 28). The pitch over the held part (0.5-1.5 s)
checks it: the energy-weighted frequency around the named note's fundamental and its 2nd and 3rd harmonics,
printed in cents (a violin's vibrato wanders round it), and the strongest partial in octaves from the named
note, which shows a file named in the wrong octave (the 2nd harmonic alone would pass the cents check).
Needs ffmpeg and numpy:  python3 tools/name-by-pitch.py samples/solo/vsco-violin:0 samples/solo/vsco-bass:12"""
import math, os, re, subprocess, sys
import numpy as np

RATE = 44100


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(RATE), '-'],
                         check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


NAMES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def named_note(name, offset):
    label = re.search(r'_([A-G]#?)(-?\d)_', name)
    return 12 * (int(label.group(2)) + 1) + NAMES[label.group(1)] + offset


def cents_off(x, f):
    seg = x[int(0.5 * RATE):int(1.5 * RATE)]
    n = 1 << 19
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n)) ** 2
    fr = np.fft.rfftfreq(n, 1 / RATE)
    num = den = 0.0
    for h in (1, 2, 3):
        band = (fr > f * h * 2 ** (-50 / 1200)) & (fr < f * h * 2 ** (50 / 1200))
        num += np.sum(sp[band] * fr[band] / h); den += np.sum(sp[band])
    return 1200 * math.log2(num / den / f)


for arg in sys.argv[1:]:
    folder, offset = arg.rsplit(':', 1)
    raw = os.path.join(folder, 'raw')
    for name in sorted(os.listdir(raw)):
        note = named_note(name, int(offset))
        x = decode(os.path.join(raw, name))
        out = os.path.join(folder, '%d.wav' % note)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(raw, name), '-ac', '1', out], check=True)
        f = 440 * 2 ** ((note - 69) / 12)
        seg = x[int(0.05 * RATE):int(0.8 * RATE)]
        n = 1 << 19
        sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n)); fr = np.fft.rfftfreq(n, 1 / RATE)
        sp[(fr < 25) | (fr > 6000)] = 0
        top = math.log2(fr[np.argmax(sp)] / f)
        print('%-36s note %3d  %+6.1f cents  strongest partial %+5.2f octaves%s' % (
            name, note, cents_off(x, f), top, '' if abs(top) < 0.1 or top > 0.9 else '  <- below the note: wrong octave?'))
