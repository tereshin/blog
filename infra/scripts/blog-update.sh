#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
ROOT=${BLOG_ROOT:-/opt/tereshin-blog}
SOURCE=$ROOT/source
usage() { echo 'Usage: blog-update [branch] [--check]  (default branch: main)'; }
branch=main
check=0
branch_set=0
for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0 ;;
    --check) check=1 ;;
    -*) usage >&2; exit 2 ;;
    *) if ((branch_set)); then usage >&2; exit 2; fi; branch=$arg; branch_set=1 ;;
  esac
done
[[ $EUID == 0 ]] || { echo 'Run as root: sudo blog-update' >&2; exit 1; }
git check-ref-format "refs/heads/$branch" >/dev/null
exec 9>"$ROOT/.update.lock"
flock -n 9 || { echo 'Another update is running.' >&2; exit 1; }
mkdir -p "$ROOT/logs" "$ROOT/backups"
run_id=$(date -u +%Y%m%dT%H%M%SZ)-$$
log=$ROOT/logs/update-$run_id.log
exec > >(tee -a "$log") 2>&1
echo "Log: $log"
[[ -z $(git -C "$SOURCE" status --porcelain) ]] || { echo 'Source has local changes; refusing to overwrite them.'; exit 1; }
git -C "$SOURCE" fetch --no-tags origin "refs/heads/$branch"
revision=$(git -C "$SOURCE" rev-parse 'FETCH_HEAD^{commit}')
tag=$revision
echo "Branch: $branch; commit: $revision"
cd "$ROOT"
docker compose config -q
# Validate wiring before building or migrating; .env entries alone are not passed into containers.
python3 - "$ROOT" <<'PY_PREFLIGHT'
import json, subprocess, sys
config = json.loads(subprocess.check_output(['docker', 'compose', 'config', '--format', 'json'], cwd=sys.argv[1]))
env = config['services']['identity'].get('environment', {})
errors = []
for key in ['AUTH_EMAIL_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM']:
    if key not in env or env[key] in [None, '']:
        errors.append(key + ' is missing from the identity container environment')
secret = str(env.get('AUTH_EMAIL_SECRET') or '')
if len(secret) < 32 or 'CHANGE_ME' in secret:
    errors.append('AUTH_EMAIL_SECRET must be a real, stable secret of at least 32 characters')
if str(env.get('SMTP_PORT')) == '465' and str(env.get('SMTP_SECURE')).lower() != 'true':
    errors.append('SMTP port 465 requires SMTP_SECURE=true')
if bool(env.get('SMTP_USER')) != bool(env.get('SMTP_PASSWORD')):
    errors.append('SMTP_USER and SMTP_PASSWORD must be set together')
if errors:
    raise SystemExit('Production email preflight failed:\n- ' + '\n- '.join(errors))
print('Production email configuration preflight passed.')
PY_PREFLIGHT
services=(identity content discussion messaging notification media gateway web)
for service in "${services[@]}"; do
  docker inspect "tereshin-$service-1" >/dev/null
done
if ((check)); then
  echo 'Check passed. No images built, migrations run, or containers changed.'
  exit 0
fi
git -C "$SOURCE" checkout --detach "$revision"
for service in identity content discussion messaging notification media gateway; do
  echo "Building $service"
  docker build --label "org.opencontainers.image.revision=$revision" \
    --build-arg "SERVICE=$service-service" -f "$SOURCE/infra/docker/service.Dockerfile" \
    -t "tereshin/$service:$tag" "$SOURCE"
done
docker build --label "org.opencontainers.image.revision=$revision" \
  -f "$SOURCE/infra/docker/web.Dockerfile" -t "tereshin/web:$tag" "$SOURCE"
backup=$ROOT/backups/$run_id
mkdir -p "$backup"
cp docker-compose.yml .env "$backup/"
# Record the exact running images, even if a tag has been moved elsewhere.
for service in "${services[@]}"; do
  image=$(docker inspect "tereshin-$service-1" --format '{{.Image}}')
  docker tag "$image" "tereshin/$service:rollback-$run_id"
done
echo "Backing up Postgres: $backup/postgres.sql"
docker exec tereshin-postgres-1 pg_dumpall -U blog > "$backup/postgres.sql"
[[ -s $backup/postgres.sql ]]
next=$ROOT/.compose-update-$run_id.yml
python3 - "$ROOT/docker-compose.yml" "$next" "$tag" <<'PY'
import re,sys
source,target,tag=sys.argv[1:]
text=open(source).read()
text,count=re.subn(r'(image:\s*tereshin/(?:identity|content|discussion|messaging|notification|media|gateway|web):)[^\s#]+',lambda m:m[1]+tag,text)
if count != 14:
    raise SystemExit(f'Expected 14 application/migration image entries, found {count}; refusing deployment')
with open(target,'w') as f: f.write(text)
PY
docker compose -f "$next" config -q
# Database migrations may be irreversible: on failure, keep the backup for manual recovery.
for service in identity content discussion messaging notification media; do
  docker compose -f "$next" run --rm --no-deps "$service-migrate"
done
rollback() {
  code=$?
  trap - ERR INT TERM
  echo "Deployment failed (exit $code). Restoring previous Compose configuration."
  docker compose ps -a || true
  docker compose logs --no-color --tail 40 identity || true
  cp "$backup/docker-compose.yml" "$ROOT/docker-compose.yml"
  docker compose up -d --no-deps --wait --wait-timeout 180 "${services[@]}" edge || true
  echo "Database was NOT restored automatically. Backup: $backup; log: $log"
  exit "$code"
}
trap rollback ERR
mv "$next" docker-compose.yml
docker compose up -d --no-deps --wait --wait-timeout 180 "${services[@]}" edge
for service in "${services[@]}"; do
  actual=$(docker inspect "tereshin-$service-1" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
  [[ $actual == "$revision" ]]
done
docker exec tereshin-gateway-1 node -e 'fetch("http://127.0.0.1:3000/v1/settings").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'
docker exec tereshin-gateway-1 node -e 'fetch("http://127.0.0.1:3000/v1/auth/config").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'
docker exec tereshin-edge wget -q -O /dev/null http://127.0.0.1/index.html
trap - ERR
printf '%s\n' "$revision" > "$ROOT/deployed-revision"
docker compose ps
echo "Update complete: $branch @ $revision"
echo "Backup: $backup; log: $log"
