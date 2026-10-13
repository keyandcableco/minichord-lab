"""A minichord over the ALSA sequencer, for a Node test: SysEx frames in and out as hex lines.
stdin: one frame a line, hex bytes with spaces, sent to the minichord's first port. stdout: every
SysEx frame the minichord sends, the same way. The sequencer is shared, so this works beside a
browser that holds the minichord's ports (a raw MIDI device can't be opened then)."""
import sys, threading, time
import rtmidi

out, inp = rtmidi.MidiOut(), rtmidi.MidiIn()
inp.ignore_types(sysex=False, timing=True, active_sense=True)
def port(m):
    for i, name in enumerate(m.get_ports()):
        if "minichord MIDI 1" in name:
            return i
    return None
o, i = port(out), port(inp)
if o is None or i is None:
    print("no minichord", file=sys.stderr); sys.exit(2)
out.open_port(o, "bridge out"); inp.open_port(i, "bridge in")
lock = threading.Lock()
def on_midi(ev, _):
    msg, _dt = ev
    if msg and msg[0] == 0xF0:
        with lock:
            sys.stdout.write(" ".join("%02x" % b for b in msg) + "\n"); sys.stdout.flush()
inp.set_callback(on_midi)
with lock:
    sys.stdout.write("ready\n"); sys.stdout.flush()
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    out.send_message([int(h, 16) for h in line.split()])
time.sleep(0.05)
