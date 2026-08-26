#!/usr/bin/env bash
#
# Deploy 2600i-aimtp-web on the Hetzner host.
#
#   ssh hetzner
#   cd /opt/2600i-aimtp-web && bash scripts/deploy.sh
#
# Safe to re-run. Exits non-zero without touching the running container if the
# checkout is dirty or the pull isn't a fast-forward.
set -euo pipefail

SERVICE="aimtp-web"
HEALTH_URL="http://127.0.0.1:3002/api/health"
HEALTH_TIMEOUT=60

# Resolve the repo root from the script's own location so this works wherever
# the repo is cloned, rather than hardcoding /opt/2600i-aimtp-web.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> $SERVICE: deploying from $PWD"

# A dirty tree makes `git pull` refuse, and with `set -e` that would abort
# midway. Fail early with the fix instead. Running npm commands directly on the
# host is the usual cause -- they rewrite package-lock.json, which is tracked.
if ! git diff --quiet HEAD 2>/dev/null; then
  echo "ERROR: tracked files are modified on this host:" >&2
  git status --short >&2
  echo >&2
  echo "Deploy from a clean checkout. To discard local edits:" >&2
  echo "  git checkout -- ." >&2
  exit 1
fi

echo "==> Pulling"
# --ff-only: never invent a merge commit on a deploy host. If this fails,
# someone committed on the server and that needs a human.
git pull --ff-only

# The build is the memory-hungry step. On this 2GB host, alongside the sibling
# containers, a Next build has exhausted RAM and taken sshd down with it --
# the containers keep serving but the box stops accepting connections.
swap_total="$(free -m 2>/dev/null | awk '/^Swap:/ {print $2}' || echo unknown)"
if [ "${swap_total:-unknown}" = "0" ]; then
  echo "WARNING: no swap configured; this build may exhaust memory." >&2
  echo "  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile" >&2
  echo "  echo '/swapfile none swap sw 0 0' >> /etc/fstab" >&2
fi

# --pull refreshes the base image. Without it a rebuild reuses whatever
# node:22-alpine layer is already on disk, silently keeping its CVEs however
# old it is.
echo "==> Building (with fresh base image)"
docker compose build --pull

echo "==> Starting"
docker compose up -d

echo "==> Waiting for health at $HEALTH_URL"
for i in $(seq 1 "$HEALTH_TIMEOUT"); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "==> Healthy after ${i}s"
    docker image prune -f >/dev/null
    echo "==> Deployed: $(git log --oneline -1)"
    exit 0
  fi
  sleep 1
done

echo "ERROR: no healthy response after ${HEALTH_TIMEOUT}s" >&2
docker compose logs --tail=100 "$SERVICE" >&2
exit 1
