#!/bin/bash
# longrun-wake.sh <record> [--dry-run]: what launchd and cron run, from the record's pinned .bin/.
# It loads the binaries `longrun init` found (launchd's own PATH is /usr/bin:/bin:/usr/sbin:/sbin), notes the wake in
# wake.log, then hands over to `longrun launch`. A failure before launch is written to wake.log, where status reads it.
set -u
record=${1:?usage: longrun-wake.sh <record> [--dry-run]}
shift
. "$record/.bin/env.sh"
log="$record/wake.log"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) wake start" >> "$log"
if [[ ! -x ${BUN_BIN:-} ]]; then
  echo "bun not found at ${BUN_BIN:-<BUN_BIN is unset>}" >> "$log"
  exit 1
fi
exec "$BUN_BIN" "$record/.bin/longrun.ts" launch "$record" "$@"
