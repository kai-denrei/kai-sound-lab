#!/usr/bin/env bash
# Creator pack importer.
#
# Creator pack audio is gitignored — licensed for use, not redistribution — so
# this script is the only surviving record of how the files in
# public/creators/ were made. Without it they are unreproducible.
#
# Converts a downloaded pack to the project's WAV convention
# (44.1 kHz / stereo / 16-bit PCM, matching public/curated/), renames files to
# kebab-case while preserving each one's original ordinal, and prints a
# manifest stub to paste into src/creators/manifest.ts.
#
# Deliberately does NOT peak-normalise. The curated sets are levelled for
# comparison; a creator pack is a showcase of someone's own mix, and
# re-levelling it sits badly beside "no license to claim as your own work."
#
# usage: import-creator-pack.sh <src-dir> <creator-id> <pack-id>
#
#   src-dir     directory of extracted .wav files from the creator's download
#   creator-id  kebab-case, e.g. daniel-soundsgood
#   pack-id     kebab-case, e.g. laser-weapons
#
# Output: public/creators/<creator-id>/<pack-id>/*.wav  (untracked)
#         manifest stub on stdout

set -euo pipefail

if [[ $# -ne 3 ]]; then
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 1
fi

SRC="$1"
CREATOR_ID="$2"
PACK_ID="$3"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/public/creators/$CREATOR_ID/$PACK_ID"

[[ -d "$SRC" ]] || { echo "no such source dir: $SRC" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not on PATH" >&2; exit 1; }

mkdir -p "$DEST"

# Group prefixes: the creator's own naming, mapped to the short labels the
# rack shows as divider rows. Anything unmatched keeps its own stem.
remap_stem() {
  case "$1" in
    continuous_beam) echo "beam" ;;
    heavy_blast)     echo "heavy-blast" ;;
    light_blast)     echo "light-blast" ;;
    reloading)       echo "reload" ;;
    weapon_handling) echo "handling" ;;
    *)               echo "${1//_/-}" ;;
  esac
}

count=0
for src in "$SRC"/*.wav "$SRC"/*.WAV; do
  [[ -e "$src" ]] || continue
  base="$(basename "$src")"
  name="${base%.*}"

  # Split trailing ordinal from stem: light_blast_1 -> light_blast + 1
  if [[ "$name" =~ ^(.*)_0*([0-9]+)$ ]]; then
    stem="${BASH_REMATCH[1]}"
    ord="${BASH_REMATCH[2]}"
  else
    stem="$name"
    ord=""
  fi

  group="$(remap_stem "$stem")"
  # Original ordinal is preserved, only re-padded — so any file here traces
  # back to its source in the creator's pack.
  if [[ -n "$ord" ]]; then
    out="$group-$(printf '%02d' "$ord").wav"
  else
    out="$group.wav"
  fi

  ffmpeg -hide_banner -loglevel error -y \
    -i "$src" -ar 44100 -ac 2 -c:a pcm_s16le "$DEST/$out"
  count=$((count + 1))
done

[[ $count -gt 0 ]] || { echo "no .wav files found in $SRC" >&2; exit 1; }

echo "converted $count file(s) -> $DEST" >&2
echo >&2

# Manifest stub — ids, paths, durations and group labels, ready to paste and
# then annotate with a written note per sound.
python3 - "$DEST" "$CREATOR_ID" "$PACK_ID" <<'PY'
import glob, os, struct, sys

dest, creator_id, pack_id = sys.argv[1], sys.argv[2], sys.argv[3]

def dur_ms(path):
    b = open(path, "rb").read(4096)
    assert b[:4] == b"RIFF", path
    off, byte_rate = 12, None
    while off + 8 <= len(b):
        cid = b[off:off + 4]
        size = struct.unpack("<I", b[off + 4:off + 8])[0]
        if cid == b"fmt ":
            byte_rate = struct.unpack("<I", b[off + 16:off + 20])[0]
        if cid == b"data":
            return round(size / byte_rate * 1000)
        off += 8 + size + (size % 2)
    raise SystemExit(f"no data chunk in {path}")

def title(slug):
    return " ".join(w.capitalize() for w in slug.split("-"))

for path in sorted(glob.glob(os.path.join(dest, "*.wav"))):
    slug = os.path.basename(path)[:-4]
    group = slug.rsplit("-", 1)[0] if slug[-2:].isdigit() else slug
    print(
        f'  snd("{slug}", "{title(slug)}", {dur_ms(path)}, "{group}",\n'
        f'    ""),'
    )
PY
