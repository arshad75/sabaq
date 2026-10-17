#!/usr/bin/env bash
# Imports recorded letter names from sounds/<n>_<name>.mp3 into public/audio/letters/<id>.mp3:
# trims silence, evens loudness, mono. Record the source and licence in docs/DATA_LICENSES.md first.
set -euo pipefail
root="$(dirname "$0")/.."
src="$root/sounds"
out="$root/public/audio/letters"
mkdir -p "$out"

while read -r file id; do
  [[ -z "$file" ]] && continue
  ffmpeg -loglevel error -y -i "$src/$file.mp3" \
    -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.08" \
    -ac 1 -ar 44100 -b:a 64k "$out/$id.mp3"
  echo "$id"
done <<'MAP'
1_alif alif
2_baa ba
3_taa ta
4_thaa tha
5_jeem jim
6_haa ha
7_khaa kha
8_daal dal
9_zaal dhal
10_raa ra
11_zaa zay
12_seen sin
13_sheen shin
14_saad sad
15_daad dad
16_taah tta
17_zhaa zza
18_ain ayn
19_ghain ghayn
20_faa fa
21_qaaf qaf
22_kaaf kaf
23_laam lam
24_meem mim
25_noon nun
26_haah hha
27_waw waw
28_hamzah hamza
30_yaa ya
MAP
