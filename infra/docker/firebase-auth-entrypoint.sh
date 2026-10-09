#!/bin/sh
# Только эмулятор Auth. Порт — последняя часть FIREBASE_AUTH_EMULATOR_HOST (host:port).
set -eu

raw="${FIREBASE_AUTH_EMULATOR_HOST:-0.0.0.0:9099}"
port="${raw##*:}"
case "$port" in
  ''|*[!0-9]*) port=9099 ;;
esac
project="${FIREBASE_PROJECT_ID:-demo-blog}"

cat > /tmp/firebase.json <<EOF
{
  "emulators": {
    "auth": { "host": "0.0.0.0", "port": ${port} },
    "ui": { "enabled": false }
  }
}
EOF

exec firebase emulators:start --only auth --project "$project" --config /tmp/firebase.json
