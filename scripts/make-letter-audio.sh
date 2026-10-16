#!/usr/bin/env bash
# Generates fallback letter-name clips with eSpeak NG (open source; its output audio is not
# covered by its GPL). Played only on devices without an Arabic voice. Needs espeak-ng + ffmpeg.
set -euo pipefail
out="$(dirname "$0")/../public/audio/letters/espeak"
mkdir -p "$out"

while read -r id name; do
  [[ -z "$id" ]] && continue
  espeak-ng -v ar -s 120 -w /tmp/sabaq-letter.wav "$name"
  ffmpeg -loglevel error -y -i /tmp/sabaq-letter.wav -ac 1 -ar 22050 -b:a 32k "$out/$id.mp3"
  echo "$id"
done <<'LIST'
alif ألف
ba باء
ta تاء
tha ثاء
jim جيم
ha حاء
kha خاء
dal دال
dhal ذال
ra راء
zay زاي
sin سين
shin شين
sad صاد
dad ضاد
tta طاء
zza ظاء
ayn عين
ghayn غين
fa فاء
qaf قاف
kaf كاف
lam لام
mim ميم
nun نون
waw واو
hha هاء
hamza همزة
ya ياء
LIST
rm -f /tmp/sabaq-letter.wav
