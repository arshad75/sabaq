"""Detect tappable word boxes on the Noorani Qaida page images.

Usage: python3 scripts/qaida-layout.py path/to/qaida.pdf [--preview DIR]
Writes src/lib/qaida/layout.json (fractions of page width/height). Stdlib only.

The pages are ruled into rows. Inside each row, ink is grouped into boxes: by the
printed vertical dividers where they exist, otherwise by the white space between words.
No text is read or stored; only rectangles.
"""

import json
import os
import struct
import sys
import zlib
from collections import deque

sys.path.insert(0, os.path.dirname(__file__))
from importlib import import_module

extract = import_module("extract-qaida")

SCALE = 2  # work at half resolution; plenty for layout and 4x faster
DARK = 150
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "qaida", "layout.json")


def to_mask(raw: bytes, w: int, h: int, n: int):
    sw, sh = w // SCALE, h // SCALE
    mask = bytearray(sw * sh)
    for y in range(sh):
        row = (y * SCALE) * w * n
        for x in range(sw):
            i = row + (x * SCALE) * n
            if min(raw[i : i + n]) < DARK:
                mask[y * sw + x] = 1
    return mask, sw, sh


def runs(flags):
    """[(start, end_inclusive)] of consecutive truthy indexes."""
    out, start = [], None
    for i, f in enumerate(flags):
        if f and start is None:
            start = i
        elif not f and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(flags) - 1))
    return out


def frame(mask, w, h):
    cols = [sum(mask[y * w + x] for y in range(h)) for x in range(w)]
    rows = [sum(mask[y * w : y * w + w]) for y in range(h)]
    vlines = [r for r in runs([c > 0.6 * h for c in cols])]
    hlines = [r for r in runs([c > 0.6 * w for c in rows])]
    # The border is a doubled line at the page edge: take the outermost line, then its inner partner.
    def inner(lines, outermost_first, near=14):
        ordered = sorted(lines, key=lambda r: r[0], reverse=not outermost_first)
        edge = ordered[0]
        partner = next((r for r in ordered[1:] if abs(r[0] - edge[0]) <= near), None)
        return partner or edge

    left = inner(vlines, True)[1] + 1
    right = inner(vlines, False)[0] - 1
    top = inner(hlines, True)[1] + 1
    bottom = inner(hlines, False)[0] - 1
    return left, right, top, bottom


def bands(mask, w, left, right, top, bottom):
    width = right - left + 1
    rule = [sum(mask[y * w + left : y * w + right + 1]) > 0.8 * width for y in range(top, bottom + 1)]
    seps = [(top + s, top + e) for s, e in runs(rule)]
    edges = [top - 1] + [y for s, e in seps for y in (s, e)] + [bottom + 1]
    out = []
    for i in range(0, len(edges), 2):
        y0, y1 = edges[i] + 1, edges[i + 1] - 1
        if y1 - y0 >= 18:
            out.append((y0, y1))
    return out


def components(mask, w, x0, x1, y0, y1):
    seen = bytearray(w * (y1 + 1))
    comps = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            p = y * w + x
            if not mask[p] or seen[p]:
                continue
            q = deque([(x, y)])
            seen[p] = 1
            bx0 = bx1 = x
            by0 = by1 = y
            area = 0
            while q:
                cx, cy = q.popleft()
                area += 1
                bx0, bx1, by0, by1 = min(bx0, cx), max(bx1, cx), min(by0, cy), max(by1, cy)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if x0 <= nx <= x1 and y0 <= ny <= y1:
                            np_ = ny * w + nx
                            if mask[np_] and not seen[np_]:
                                seen[np_] = 1
                                q.append((nx, ny))
            comps.append([bx0, bx1, by0, by1, area])
    return comps


def boxes_in_band(mask, w, left, right, y0, y1):
    pad = 2
    y0, y1 = y0 + pad, y1 - pad
    bh = y1 - y0 + 1
    comps = components(mask, w, left + pad, right - pad, y0, y1)

    # Printed vertical dividers: thin and most of the row's height.
    dividers = sorted((c[0] + c[1]) / 2 for c in comps if c[1] - c[0] <= 4 and c[3] - c[2] >= 0.45 * bh)
    ink = [c for c in comps if not (c[1] - c[0] <= 4 and c[3] - c[2] >= 0.45 * bh) and c[4] >= 4]
    if not ink:
        return []

    # Stack pieces that sit above/below each other (dots, vowel marks, letters inside circles).
    ink.sort(key=lambda c: c[0])
    groups = []
    for c in ink:
        g = groups[-1] if groups else None
        if g and c[0] <= g[1] - min(c[1] - c[0], g[1] - g[0]) * 0.3:
            g[0], g[1] = min(g[0], c[0]), max(g[1], c[1])
            g[2], g[3] = min(g[2], c[2]), max(g[3], c[3])
            g[4] += c[4]
            g[5] = g[5] or c[3] - c[2] >= 0.75 * bh
        else:
            groups.append(c[:5] + [c[3] - c[2] >= 0.75 * bh])

    # Join neighbours closer than a word gap, unless a divider or a framed item (circle) sits between.
    gap = max(6, 0.14 * bh)
    merged = []
    for g in groups:
        prev = merged[-1] if merged else None
        divider_between = prev and any(prev[1] < d < g[0] for d in dividers)
        if prev and not divider_between and not prev[5] and not g[5] and g[0] - prev[1] <= gap:
            prev[0], prev[1] = min(prev[0], g[0]), max(prev[1], g[1])
            prev[2], prev[3] = min(prev[2], g[2]), max(prev[3], g[3])
            prev[4] += g[4]
            prev[6].append(g)
        else:
            merged.append(list(g) + [[g]])

    # Tightly set lines (Quran verses) fuse into one long box; split those at their widest gaps.
    max_w = 0.3 * (right - left)
    out = []
    for m in merged:
        out.extend(split_wide(m[6], max_w) if m[1] - m[0] > max_w and len(m[6]) > 1 else [m])

    # Drop specks that never joined a word (stray marks, scan noise).
    return [m for m in out if m[4] >= 0.02 * bh * bh and m[1] - m[0] >= 4]


def split_wide(parts, max_w):
    """Split a left-to-right run of ink groups at its largest gaps until every piece fits."""
    pieces = [parts]
    while True:
        wide = [p for p in pieces if p[-1][1] - p[0][0] > max_w and len(p) > 1]
        if not wide:
            break
        p = wide[0]
        gaps = [(p[i + 1][0] - p[i][1], i) for i in range(len(p) - 1)]
        _, cut = max(gaps)
        i = pieces.index(p)
        pieces[i : i + 1] = [p[: cut + 1], p[cut + 1 :]]
    boxes = []
    for p in pieces:
        boxes.append([min(g[0] for g in p), max(g[1] for g in p), min(g[2] for g in p), max(g[3] for g in p), sum(g[4] for g in p)])
    return boxes


def layout_page(raw, w, h, n):
    mask, sw, sh = to_mask(raw, w, h, n)
    left, right, top, bottom = frame(mask, sw, sh)
    rows = []
    for y0, y1 in bands(mask, sw, left, right, top, bottom):
        boxes = boxes_in_band(mask, sw, left, right, y0, y1)
        if not boxes:
            continue
        # Reading order is right to left. Ornament slivers are far thinner than any letter (even alif).
        boxes = [b for b in boxes if (b[1] - b[0]) / sw >= 0.012]
        boxes.sort(key=lambda b: -b[0])
        pad = 3
        rows.append(
            {
                "y0": round(y0 / sh, 4),
                "y1": round(y1 / sh, 4),
                "boxes": [
                    [round(max(left, b[0] - pad) / sw, 4), round(min(right, b[1] + pad) / sw, 4)] for b in boxes
                ],
            }
        )
    return rows, (mask, sw, sh)


def write_preview(path, mask, sw, sh, rows):
    rgb = bytearray(sw * sh * 3)
    for i, v in enumerate(mask):
        c = 40 if v else 255
        rgb[i * 3 : i * 3 + 3] = bytes((c, c, c))

    def put(x, y, col):
        if 0 <= x < sw and 0 <= y < sh:
            rgb[(y * sw + x) * 3 : (y * sw + x) * 3 + 3] = col

    for r, row in enumerate(rows):
        y0, y1 = int(row["y0"] * sh), int(row["y1"] * sh)
        for k, (fx0, fx1) in enumerate(row["boxes"]):
            x0, x1 = int(fx0 * sw), int(fx1 * sw)
            col = (220, 30, 30) if k % 2 == 0 else (30, 90, 220)
            for x in range(x0, x1 + 1):
                for t in (0, 1):
                    put(x, y0 + t, col)
                    put(x, y1 - t, col)
            for y in range(y0, y1 + 1):
                for t in (0, 1):
                    put(x0 + t, y, col)
                    put(x1 - t, y, col)
    rows_png = b"".join(b"\x00" + bytes(rgb[y * sw * 3 : (y + 1) * sw * 3]) for y in range(sh))

    def chunk(tag, payload):
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload))

    with open(path, "wb") as f:
        f.write(
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", sw, sh, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows_png, 6))
            + chunk(b"IEND", b"")
        )


def main(pdf, preview_dir=None):
    data = open(pdf, "rb").read()
    objs = extract.read_objects(data)
    import re

    images = []
    for num, body in sorted(objs.items()):
        head = re.sub(rb"\s+", b" ", body.split(b"stream", 1)[0])
        if b"/Subtype /Image" not in head:
            continue
        w = int(re.search(rb"/Width (\d+)", head).group(1))
        h = int(re.search(rb"/Height (\d+)", head).group(1))
        length = int(re.search(rb"/Length (\d+)", head).group(1))
        cs = int(re.search(rb"/ColorSpace (\d+) 0 R", head).group(1))
        stream = body.split(b"stream", 1)[1].lstrip(b"\r\n")[:length]
        images.append((w, h, extract.components(objs, cs), stream))

    pages = {}
    for idx, (w, h, n, stream) in enumerate(images, 1):
        if idx < extract.FIRST_LESSON_IMAGE:
            continue
        page = idx - extract.FIRST_LESSON_IMAGE + 1
        rows, (mask, sw, sh) = layout_page(zlib.decompress(stream), w, h, n)
        pages[str(page)] = rows
        if preview_dir:
            os.makedirs(preview_dir, exist_ok=True)
            write_preview(os.path.join(preview_dir, f"{page:02d}.png"), mask, sw, sh, rows)
        print(f"page {page}: {len(rows)} rows, {sum(len(r['boxes']) for r in rows)} boxes", flush=True)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"source": "scripts/qaida-layout.py", "pages": pages}, f, separators=(",", ":"))
    print(f"wrote {os.path.normpath(OUT)}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    preview = args[args.index("--preview") + 1] if "--preview" in args else None
    main(args[0], preview)
