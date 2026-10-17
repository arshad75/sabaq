#!/usr/bin/env bash
# Generates letter-name clips with an Azure AI Speech neural voice, for review before use.
# Usage: AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=australiaeast ./scripts/make-letter-audio-azure.sh
# Optional: VOICE=ar-SA-ZariyahNeural (default ar-SA-HamedNeural), RATE=-15%
# Writes public/audio/letters/<id>.mp3; they only play once listed in RECORDED in src/lib/qaida/letters.ts.
set -euo pipefail
: "${AZURE_SPEECH_KEY:?Set AZURE_SPEECH_KEY (Azure portal > your Speech resource > Keys and Endpoint)}"
: "${AZURE_SPEECH_REGION:?Set AZURE_SPEECH_REGION, e.g. australiaeast}"
voice="${VOICE:-ar-SA-HamedNeural}"
rate="${RATE:--15%}"
out="$(dirname "$0")/../public/audio/letters"
mkdir -p "$out"

# Fully vowelled, Qaida-style names (e.g. "baa" without a final hamza); a teacher should approve them.
while read -r id name; do
  [[ -z "$id" ]] && continue
  ssml="<speak version='1.0' xml:lang='ar-SA'><voice name='$voice'><prosody rate='$rate'>$name</prosody></voice></speak>"
  code=$(curl -s -o "$out/$id.mp3" -w "%{http_code}" -X POST \
    "https://$AZURE_SPEECH_REGION.tts.speech.microsoft.com/cognitiveservices/v1" \
    -H "Ocp-Apim-Subscription-Key: $AZURE_SPEECH_KEY" \
    -H "Content-Type: application/ssml+xml" \
    -H "X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3" \
    -H "User-Agent: sabaq-letter-audio" \
    --data-binary "$ssml")
  if [[ "$code" != "200" ]]; then
    rm -f "$out/$id.mp3"
    echo "$id failed (HTTP $code). Check the key, region and voice name." >&2
    exit 1
  fi
  echo "$id"
done <<'LIST'
alif أَلِفْ
ba بَا
ta تَا
tha ثَا
jim جِيمْ
ha حَا
kha خَا
dal دَالْ
dhal ذَالْ
ra رَا
zay زَا
sin سِينْ
shin شِينْ
sad صَادْ
dad ضَادْ
tta طَا
zza ظَا
ayn عَيْنْ
ghayn غَيْنْ
fa فَا
qaf قَافْ
kaf كَافْ
lam لَامْ
mim مِيمْ
nun نُونْ
waw وَاوْ
hha هَا
hamza هَمْزَةْ
ya يَا
LIST

echo "Done. Listen with: for f in $out/*.mp3; do echo \$f; afplay \$f; done"
