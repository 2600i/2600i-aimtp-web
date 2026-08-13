# Runbook

Rebuilding `aimtp.net` from nothing, and the routine operations on it.

[`deployment.md`](deployment.md) explains *why* each piece is shaped the way it
is. This file is the order to do things in. Read that one when something here
looks arbitrary — several steps are load-bearing in ways the command does not
show.

The host also serves `2600i.com` and `school.2600i.com`. **Nothing in this file
touches them**, with one exception, marked.

## What exists

| Path / name | What |
|---|---|
| `/opt/2600i-aimtp-web` | this repo — the site, on `127.0.0.1:3002` |
| `/opt/2600i-aimtp` | the protocol repo — the demo sidecar only |
| `/srv/aimtp-schemas` | 13 JSON Schemas, served by Caddy |
| `aimtp-demo` | Docker network shared by the site and the sidecar |
| `/etc/caddy/Caddyfile` | the only proxy config — **nginx is installed but disabled** |

Containers: `2600i-aimtp-web-aimtp-web-1` (site) and `aimtp-gateway-demo`
(sidecar). Both `restart: unless-stopped`, so a reboot restores them.

## Rebuild from nothing

Order matters. Steps 1–5 are invisible to the public; nothing is reachable until
step 6.

### 1. Deploy key for this repo

The box uses **one key per repository**, each with its own SSH host alias.
`github.com` is already bound to a different repo's key, so a plain clone of
this one authenticates as the wrong repository and fails.

```sh
ssh-keygen -t ed25519 -N "" -C "deploy@$(hostname):2600i-aimtp-web" \
  -f ~/.ssh/id_ed25519_2600i_aimtp_web

cat >> ~/.ssh/config <<'EOF'

Host github-2600i-aimtp-web
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_ed25519_2600i_aimtp_web
    IdentitiesOnly yes
EOF

cat ~/.ssh/id_ed25519_2600i_aimtp_web.pub
```

Add that public key to **repo → Settings → Deploy keys**, *without* write
access. Confirm it bound to the right repository before continuing — the
failure is silent until the clone:

```sh
ssh -T git@github-2600i-aimtp-web    # must greet 2600i/2600i-aimtp-web
```

The protocol repo is public and needs no key.

### 2. Clone

```sh
cd /opt
git clone git@github-2600i-aimtp-web:2600i/2600i-aimtp-web.git
git clone https://github.com/2600i/AIMTP.git 2600i-aimtp
```

### 3. Stage the schemas

From a **workstation** with both repos checked out — the generator needs the
protocol repo and validates before copying:

```sh
cd <path>/2600i-aimtp-web
npm run schemas
rsync -a --delete --chown=root:root dist-schemas/ hetzner:/srv/aimtp-schemas/
```

`--chown` is not decoration: plain `-a` preserves the local uid, which from a
macOS checkout is `501` and exists on no Linux host. The tree stays
world-readable and Caddy still serves it, which is why the mistake survives
unnoticed.

Expect **13** files. `npm run schemas:check` fails if a schema's `$id` does not
match the URL it would be served at, or if a cross-`$ref` points at something
not being published.

### 4. The shared network

```sh
docker network create aimtp-demo
```

Without it the site container will not start at all — `docker-compose.yml`
declares the network external.

### 5. Build both services

```sh
cd /opt/2600i-aimtp && docker compose -f docker-compose.demo.yml up --build -d

cd /opt/2600i-aimtp-web
echo "AIMTP_DEMO_ORIGIN=http://aimtp-gateway-demo:8090" > .env
docker compose up --build -d
```

**`.env` is the only state on this box that is not in git.** It holds no secret.
If it is missing the site still builds and serves — the demo simply renders its
"unavailable" panel forever, and nothing reports it. That is the single most
likely way a rebuild silently comes back degraded.

Check before continuing:

```sh
curl -sI http://127.0.0.1:3002/ | head -1                      # 200
docker ps --format '{{.Names}} {{.Status}}'                     # both healthy
ss -tln | grep 8090 || echo "sidecar not published — correct"
```

### 6. Caddy

This is the only step that can affect the other sites. Back up first.

```sh
cp /etc/caddy/Caddyfile /root/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)
```

Append the `aimtp.net` block from [`deployment.md`](deployment.md#caddy), then:

```sh
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

**Only reload if validate passes.** `reload` keeps the running config if the new
one fails to load; `restart` does not. If validate fails, restore the backup.

No DNS change is needed — `aimtp.net` and `relay.aimtp.net` already resolve
through Cloudflare. Caddy issues the certificate on first request, so a few
seconds of error immediately after reload is normal. A persistent **525** means
Caddy has no certificate for the name, which normally means no site block.

### 7. Verify

```sh
curl -sI https://aimtp.net/ | head -1
curl -sI https://aimtp.net/schemas/envelope.schema.json | grep -i content-type
curl -sI https://2600i.com/ | head -1
curl -sI https://school.2600i.com/ | head -1
curl -s -o /dev/null -w '%{http_code}\n' https://relay.aimtp.net/aimtp    # 401
```

The content-type is the one that matters: **`application/schema+json`**. If it
returns `text/html`, the app is answering schema identifiers, the site looks
perfectly fine, and validation breaks in other people's processes.

Then run the **Uptime** workflow from the Actions tab. It drives a real signed
request through the Gateway and asserts `ALLOW`, which no `curl` above proves.

## Routine operations

### Deploy a site change

```sh
cd /opt/2600i-aimtp-web && git pull && docker compose up --build -d
```

`NEXT_PUBLIC_SITE_URL` is inlined at **build** time, so the canonical host needs
a rebuild rather than a restart. `AIMTP_DEMO_ORIGIN` is read at run time.

### Deploy a sidecar change

```sh
cd /opt/2600i-aimtp && git pull && docker compose -f docker-compose.demo.yml up --build -d
```

### After any schema change in the protocol repo

Re-run step 3. The schemas are a **copy**; the protocol repo is their only
definition, and nothing on this box notices when it moves.

Also run `npm run trace` in this repo — the conformance figures and Gateway
verdicts on the site are generated, and `trace:check` fails in CI when the
committed fixture drifts.

## When something is wrong

| Symptom | Cause |
|---|---|
| `aimtp.net` returns **525** | Caddy has no cert — usually no site block for the name |
| Demo shows "unavailable", API **503** | sidecar down, or `.env` missing |
| Schema URL returns HTML | `handle` ordering broken — app is answering identifiers |
| Site container won't start | `aimtp-demo` network missing |
| Clone fails with "repository not found" | wrong deploy key — check the host alias |
| `relay.aimtp.net` returns **200** unauthenticated | serious; the relay must answer 401 |

### Locked out over SSH

This has happened once and was never explained. Everything inside the VM was
clean — no iptables rules, no fail2ban ban, no OOM, no socket trigger limit, no
conntrack exhaustion, and **the kernel logged nothing at all** during the
outage, meaning the packets never reached the machine. That points at the
Hetzner Cloud Firewall, which is applied at the hypervisor and is invisible from
inside.

Check, in order:

1. **Hetzner Cloud → Firewalls** → the firewall on this server → inbound port 22
2. **Hetzner Cloud → the server → Console** — VNC, bypasses the network entirely

The console needs a root password. If none is set, that fallback does not exist
when you need it. Set one and log in once to confirm — an untested recovery path
is not a recovery path.

## Things that fail silently

Collected because each was found the hard way, and none of them announces
itself:

- **Missing `.env`** — demo reverts to "unavailable" forever.
- **`rsync` without `--chown`** — tree owned by a nonexistent uid; still serves.
- **A Caddy block without `import cloudflare_only`** — that hostname becomes
  reachable directly on the origin IP, bypassing the WAF. The site works.
- **Publishing the sidecar's port, or giving it a Caddy block** — exposes an
  unauthenticated service. The demo keeps working. The relay beside it *does*
  authenticate; the sidecar does not.
- **A CAA record omitting Cloudflare's live edge issuer** — breaks certificate
  renewal weeks later, not at apply time.
- **A cross-domain DMARC `rua` without the `_report._dmarc` record in the
  receiving zone** — receivers refuse to send reports. Enforcement still works,
  so the symptom is an empty inbox that looks like nobody spoofing you.
- **Editing `/etc/nginx/sites-available/aimtp.conf`** — nginx is installed,
  disabled, and serves nothing. It is the file you would reach for first.
