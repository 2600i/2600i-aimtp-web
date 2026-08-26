# CLAUDE.md — 2600i-aimtp-web

The public website for aimtp.net. Read [`README.md`](README.md) first — it
covers the design system, where each asset comes from, and the honesty
constraints, and those are the rules that matter most here. This file adds
the operational detail it doesn't.

## Generated artifacts are generated

`npm run trace` and `npm run schemas` produce committed files from the real
Gateway and the real schemas in `../2600i-aimtp`. Their `:check` variants fail
the build when what's committed no longer matches. Never hand-edit the output
and never hand-type a figure that appears on a page — verdict counts and
conformance numbers have gone stale that way before.

The coupling runs across repositories: change the Gateway or a schema in
`../2600i-aimtp` and you must re-run `npm run trace` here, or `trace:check`
fails.

## The live demo is a separate container in another repo

`/demo/agent-trust-gateway` proxies to `aimtp-gateway-demo`, which is built and
deployed from `../2600i-aimtp` via its `docker-compose.demo.yml`. This
repository has no copy of the Gateway and cannot get one.

The two containers meet on an external Docker network named `aimtp-demo`, and
the website reaches the demo through `AIMTP_DEMO_ORIGIN`
(`http://aimtp-gateway-demo:8090`). That variable is read at run time, so it can
change without a rebuild.

With it unset, or the container down, the page renders its "unavailable" state
and points at the recorded run. **It never fakes a live Gateway** — that is a
deliberate honesty constraint, not a fallback to improve.

## Deploying

`bash scripts/deploy.sh` on the host. The site is published on loopback
`127.0.0.1:3002`; TLS and the public hostname are Caddy's job, running as a
systemd service on the host rather than in a container. The sibling 2600i sites
are wired the same way, on 3000 and 3001.

`NEXT_PUBLIC_SITE_URL` is inlined into the bundle at build time, so changing it
needs a rebuild, not a restart.

Two things that have caused real incidents on this host:

- **2GB of RAM, four containers.** A Next build alongside them has exhausted
  memory and taken `sshd` down with it; the containers keep serving, so the
  sites look fine while the box is unreachable. Swap is what makes that
  survivable, and the script warns when there is none.
- **`docker compose up -d --build` does not refresh the base image.** It reuses
  whatever `node:22-alpine` layer is on disk, however old. The script passes
  `--pull` so OS-level CVEs in the runtime actually get picked up.

Never run `npm` commands in the checkout on the server. They rewrite
`package-lock.json`, which is tracked, and the next `git pull` then refuses.
