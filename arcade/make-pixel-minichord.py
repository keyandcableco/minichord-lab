#!/usr/bin/env python3
"""Make the arcade's pixel minichord from its grid, arcade/pixel-minichord.txt.

    python3 arcade/make-pixel-minichord.py           make them
    python3 arcade/make-pixel-minichord.py --check   say whether they're up to date, changing nothing

It writes, beside the grid:
    pixel-minichord.js   the drawing, for the lobby's INSERT MINICHORD sign and Ben in Chopper Rescue
    favicon.svg          the arcade's favicon: the drawing turned 45 degrees clockwise, outlined and
                         fitted to its square
    favicon-32.png       the favicon as a picture, for browsers that don't take an SVG one (needs
                         Pillow: pip install pillow; without it, everything else is still made)
"""
import math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GRID = os.path.join(HERE, "pixel-minichord.txt")
COLOURS = {"#": "#FFD35A", "x": "#16132A", "o": "#FF4B3E"}   # gold body, dark, the red light
OUTLINE = "#16132A"


def read_grid():
    rows = [l.rstrip("\n") for l in open(GRID, encoding="utf-8") if not l.startswith("//") and l.strip()]
    w = max(len(r) for r in rows)
    bad = {c for r in rows for c in r if c not in COLOURS and c != "."}
    if bad:
        sys.exit(f"pixel-minichord.txt: characters it doesn't know: {' '.join(sorted(bad))} (use . # x o)")
    return [r.ljust(w, ".") for r in rows], w, len(rows)


def paths(rows):
    """One path per colour, each pixel a one-unit square: M x y h1 v1 h-1 z."""
    out = []
    for ch, fill in COLOURS.items():
        d = "".join(f"M{x} {y}h1v1h-1z" for y, r in enumerate(rows) for x, c in enumerate(r) if c == ch)
        if d:
            out.append(f'<path fill="{fill}" d="{d}"/>')
    return "".join(out)


def make_js(rows, w, h):
    p = paths(rows)
    return ("// Made by make-pixel-minichord.py from pixel-minichord.txt: edit the grid there, then run the\n"
            "// script, rather than editing this.\n"
            "// The arcade's pixel minichord: its three paths (gold body, dark, the red light), and as a whole drawing.\n"
            f"const PIXEL_MINICHORD_W={w}, PIXEL_MINICHORD_H={h};\n"
            f"const PIXEL_MINICHORD_PATHS=`{p}`;\n"
            f"const PIXEL_MINICHORD_SVG=`<svg viewBox=\"0 0 {w} {h}\" shape-rendering=\"crispEdges\" aria-hidden=\"true\">${{PIXEL_MINICHORD_PATHS}}</svg>`;\n")


def make_favicon(rows, w, h):
    """Turned 45 degrees clockwise about its middle, fitted to a 40 x 40 square by its pixels (not its
    box, whose corners are empty), with a pixel of margin and a dark outline round the body."""
    cx, cy = w / 2, h / 2
    c, s = math.cos(math.pi / 4), math.sin(math.pi / 4)
    pts = []
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != ".":
                for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                    X, Y = x + dx - cx, y + dy - cy
                    pts.append((X * c - Y * s, X * s + Y * c))
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    scale = 37 / max(max(xs) - min(xs), max(ys) - min(ys))
    mx, my = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    everything = "".join(f"M{x} {y}h1v1h-1z" for y, r in enumerate(rows) for x, ch in enumerate(r) if ch != ".")
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">\n'
            "  <!-- Made by make-pixel-minichord.py from pixel-minichord.txt. -->\n"
            f'  <g transform="translate({20 - mx * scale:.3f} {20 - my * scale:.3f}) scale({scale:.4f}) rotate(45) translate({-cx} {-cy})">\n'
            f'    <path d="{everything}" fill="none" stroke="{OUTLINE}" stroke-width="{1.6 / scale:.2f}" stroke-linejoin="round"/>\n'
            f"    {paths(rows)}\n"
            "  </g>\n"
            "</svg>\n")


def make_png(rows, w, h, path, size=32):
    """The favicon as a picture: drawn large, turned, outlined, fitted, then scaled down smooth."""
    try:
        from PIL import Image, ImageDraw, ImageFilter
    except ImportError:
        print("favicon-32.png not made: Pillow isn't installed (pip install pillow)")
        return False
    U = 24
    img = Image.new("RGBA", (w * U, h * U), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in COLOURS:
                d.rectangle((x * U, y * U, x * U + U - 1, y * U + U - 1), fill=COLOURS[ch])
    img = img.rotate(-45, resample=Image.BICUBIC, expand=True)             # clockwise
    alpha = img.split()[3]
    ring = alpha.filter(ImageFilter.MaxFilter(int(U * 1.6) | 1))           # the outline, round the body
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(Image.new("RGBA", img.size, OUTLINE), (0, 0), ring)
    out.alpha_composite(img)
    out = out.crop(out.getbbox())
    side = int(max(out.size) * 40 / 38)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(out, ((side - out.width) // 2, (side - out.height) // 2))
    sq.resize((size, size), Image.LANCZOS).save(path)
    return True


def main():
    check = "--check" in sys.argv
    rows, w, h = read_grid()
    made = {"pixel-minichord.js": make_js(rows, w, h), "favicon.svg": make_favicon(rows, w, h)}
    stale = []
    for name, text in made.items():
        path = os.path.join(HERE, name)
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
        if old != text:
            stale.append(name)
            if not check:
                open(path, "w", encoding="utf-8").write(text)
    if check:
        if stale:
            sys.exit(f"out of date with pixel-minichord.txt: {', '.join(stale)} (run make-pixel-minichord.py)")
        print("pixel minichord: up to date")
        return
    png = make_png(rows, w, h, os.path.join(HERE, "favicon-32.png"))
    print(f"pixel minichord: {w} x {h}, made pixel-minichord.js, favicon.svg" + (", favicon-32.png" if png else ""))


if __name__ == "__main__":
    main()
