"""Rebuild public/qaida/*.webp from the Qamar Apps Noorani Qaida (Indian edition) PDF.

Usage: python3 scripts/extract-qaida.py path/to/qaida.pdf
Needs: Python 3 (stdlib only) and `cwebp` on PATH.

Reads the original embedded page images, so any stamp a print-to-PDF step added
on top of the pages is not carried over. PDF image 1 is the cover, 2 is blank,
3 is the licence page, and 4..42 are Qaida pages 1..39.
"""

import os
import re
import struct
import subprocess
import sys
import tempfile
import zlib

FIRST_LESSON_IMAGE = 4
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "qaida")


def read_objects(data: bytes) -> dict[int, bytes]:
    starts = list(re.finditer(rb"(?m)^(\d+) 0 obj", data))
    objs = {}
    for i, m in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(data)
        objs[int(m.group(1))] = data[m.end():end]
    return objs


def components(objs: dict[int, bytes], cs_ref: int) -> int:
    body = objs[cs_ref]
    icc = re.search(rb"/ICCBased\s+(\d+)\s+0\s+R", body)
    if icc:
        return int(re.search(rb"/N\s+(\d+)", objs[int(icc.group(1))]).group(1))
    return 1 if b"DeviceGray" in body else 3


def write_png(path: str, w: int, h: int, n: int, raw: bytes) -> None:
    rows = b"".join(b"\x00" + raw[y * w * n:(y + 1) * w * n] for y in range(h))

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload))

    header = struct.pack(">IIBBBBB", w, h, 8, {1: 0, 3: 2}[n], 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(rows, 6)) + chunk(b"IEND", b""))


def main(pdf: str) -> None:
    data = open(pdf, "rb").read()
    objs = read_objects(data)
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
        images.append((w, h, components(objs, cs), stream))

    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for idx, (w, h, n, stream) in enumerate(images, 1):
            if idx < FIRST_LESSON_IMAGE:
                continue
            raw = zlib.decompress(stream)
            assert len(raw) == w * h * n, f"unexpected image size for PDF image {idx}"
            png = os.path.join(tmp, f"{idx}.png")
            write_png(png, w, h, n, raw)
            page = idx - FIRST_LESSON_IMAGE + 1
            out = os.path.join(OUT, f"{page:02d}.webp")
            subprocess.run(["cwebp", "-quiet", "-q", "70", "-resize", "900", "0", png, "-o", out], check=True)
    print(f"wrote {len(images) - FIRST_LESSON_IMAGE + 1} pages to {os.path.normpath(OUT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
