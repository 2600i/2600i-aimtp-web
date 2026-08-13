# Deployment

How `aimtp.net` is served. The site is one of three things on that origin, and
it is the least constrained of them — read the schema section before changing
any proxy configuration.

## What lives where

| Host / path | Served by | Owned by |
|---|---|---|
| `aimtp.net/` | this app, on loopback `127.0.0.1:3002` | this repo |
| `aimtp.net/schemas/`, `/spec/`, `/runtime/schemas/` | static files | protocol repo |
| `aimtp.net/.well-known/security.txt` | this app, a route handler | this repo |
| `relay.aimtp.net` | the relay, on loopback `127.0.0.1:8787` | protocol repo |

`aimtp.2600i.com` appears in older notes as the canonical host. It was never
deployed and has no DNS record; `aimtp.net` is the only host this site has had.
Nothing redirects to it, because there is nothing to redirect.

## DNS and the edge

Both names are already `A` records in the `aimtp.net` Cloudflare zone, proxied
(orange cloud). Standing this site up needs no DNS change.

Cloudflare terminates TLS at the edge and connects to the origin over TLS again,
so the zone must be on **Full (strict)** and Caddy must hold a certificate for
the hostname. Until a site block exists for a name, Caddy will not answer TLS
for it and the edge returns **525** — which is what `aimtp.net` served before
this was configured, and is the expected symptom if a block is ever removed.

The origin only accepts connections from Cloudflare's ranges: `cloudflare_only`
in the Caddyfile aborts anything else, backed by the Hetzner Cloud Firewall
(`/root/cf-to-hetzner-firewall.sh`). **Any new site block must import it.**
Omitting it does not fail visibly — the site works — it just means that name can
be reached directly on the origin IP, with the WAF, rate limiting and bot rules
bypassed.

Certificate issuance works through the orange cloud because the snippet exempts
`/.well-known/acme-challenge/*` from the guard.

## DNS records that are not about routing

These are applied in the Cloudflare dashboard, not by this repository. They are
recorded here because nothing else in the system will notice they are missing —
each one fails silently and in someone else's inbox or trust store.

### Refusing mail nobody sends

`aimtp.net` sends no email and has no `MX`. Without records saying so, anyone
can send mail as `@aimtp.net` and nothing marks it as forged. That matters more
than usual here: this domain hosts the canonical site and a published security
policy inviting vulnerability reports, which makes it a useful name to
impersonate — to a researcher, or to someone who trusts one.

`2600i.com` already publishes both (`v=spf1 ... ~all`, `p=quarantine`).
`aimtp.net` publishes neither.

| Name | Type | Value |
|---|---|---|
| `aimtp.net` | TXT | `v=spf1 -all` |
| `_dmarc.aimtp.net` | TXT | `v=DMARC1; p=reject; rua=mailto:steve@2600i.com` |
| `aimtp.net` | MX | `0 .` |

`-all` and `p=reject` are hard refusals rather than the `~all`/`quarantine` pair
on `2600i.com`. That is correct precisely *because* this domain sends nothing:
there is no legitimate mail to soft-fail, so anything claiming to be from here
is forged and can be rejected outright. The null `MX` (RFC 7505) says the same
thing to senders, before they compose a bounce.

If `aimtp.net` ever starts sending mail, all three have to change first.

### CAA — who may issue certificates

Neither zone publishes `CAA`, so any CA may issue for these names. Two issuers
are actually in use: Cloudflare at the edge, Let's Encrypt at the origin via
Caddy.

| Name | Type | Value |
|---|---|---|
| `aimtp.net` | CAA | `0 issue "letsencrypt.org"` |
| `aimtp.net` | CAA | `0 issue "pki.goog"` |
| `aimtp.net` | CAA | `0 issue "digicert.com"` |
| `aimtp.net` | CAA | `0 issuewild ";"` |
| `aimtp.net` | CAA | `0 iodef "mailto:steve@2600i.com"` |

Cloudflare rotates which CA backs its edge certificates, so the set has to cover
its issuers rather than only Let's Encrypt — a CAA record that omits the live
edge CA breaks renewal, and it breaks it quietly, weeks after the change. Verify
against Cloudflare's current list before applying, and drop `issuewild` if a
wildcard is ever needed.

### DNSSEC

Neither zone is signed. Cloudflare enables it per zone and it is a one-time
action; the only cost is that the registrar has to carry the `DS` record, so it
is not purely a dashboard toggle.

## The reserved paths

Three prefixes on `aimtp.net` are not the site's to serve.

Every JSON Schema in the protocol repo declares an `$id` that is an absolute URL
on this origin, and `spec/trust-bundle-v0.4.schema.json` `$ref`s three siblings
the same way. A validator resolving a trust bundle **fetches those URLs over the
network**. They are identifiers, not documentation links.

So:

- Answering one with HTML fails validation.
- Answering one with a redirect fails validation.
- A 404 during a site deploy fails validation.

That last one is why they are served as static files by the proxy rather than
from a route in this app: the application cannot answer them however its routes
later change, and schema resolution does not share a failure domain with the
marketing site.

Stage them from the protocol repo:

```sh
npm run schemas
rsync -a --delete --chown=root:root dist-schemas/ <host>:/srv/aimtp-schemas/
```

`npm run schemas:check` verifies that each `$id` matches the URL it will be
served at, and that every absolute `$ref` points at something being published.
Run it after any schema change in the protocol repo.

## Caddy

The host serves everything through Caddy (`/etc/caddy/Caddyfile`). nginx is
installed and has a stale `sites-available/aimtp.conf`, but it is disabled and
serves nothing — editing it is a no-op, and it is the file you would reach for
first.

Add one site block:

```caddy
aimtp.net {
    # Not optional. Without it this hostname is reachable directly on the
    # origin IP, bypassing the WAF and rate limiting that every other site
    # here sits behind. It fails open, so nothing looks wrong.
    import cloudflare_only

    # The protocol's schema namespace, served from disk. `handle` blocks are
    # mutually exclusive: a request matching @schemas is answered here and
    # never reaches the reverse proxy below, so the app cannot answer a schema
    # identifier however its routes later change. A missing file under these
    # prefixes is a 404 from Caddy rather than a fall-through.
    @schemas path /schemas/* /spec/* /runtime/schemas/*
    handle @schemas {
        root * /srv/aimtp-schemas
        # Caddy types .json as application/json from the extension. Acceptable
        # to most validators, but not what these documents are.
        header Content-Type application/schema+json
        # Validators fetch cross-origin. Without this, browser-based ones fail
        # on the $refs while curl succeeds — a confusing bug to receive.
        header Access-Control-Allow-Origin *
        # Deliberately moderate. The -v0.4 files are immutable by name and
        # could be cached hard, but the unversioned ones
        # (/schemas/envelope.schema.json) cannot: a long TTL there would mean a
        # correction takes a cache generation to reach anyone.
        header Cache-Control "public, max-age=3600"
        file_server
    }

    handle {
        reverse_proxy 127.0.0.1:3002
    }
}
```

Then:

```sh
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

### Verify rather than assume

The mutual exclusion above is the load-bearing claim, and it is cheap to check.
Confirm it before pointing anyone at the site:

```sh
# 200, and the type must be application/schema+json — not text/html
curl -sI https://aimtp.net/schemas/envelope.schema.json | grep -iE '^HTTP|content-type|access-control'

# The cross-$ref target the trust bundle actually fetches
curl -s https://aimtp.net/spec/identity-anchor-set-v0.4.schema.json | head -3

# A missing schema must 404 from Caddy, never render the app's 404 page
curl -s https://aimtp.net/schemas/nope.schema.json | head -5

# The site itself still comes from the app
curl -sI https://aimtp.net/ | grep -iE '^HTTP|content-type'
```

If the first command returns `text/html`, the ordering is wrong and the app is
answering schema identifiers. Nothing else will report that.

## Build-time host

`NEXT_PUBLIC_SITE_URL` is inlined into the bundle by `next build`, so the
canonical host changes with a **rebuild**, not a restart:

```sh
NEXT_PUBLIC_SITE_URL=https://aimtp.net docker compose up --build -d
```

Getting this wrong is quiet rather than loud: the site works, and only
`metadataBase`, the canonical tag and the OG image URL are wrong.

## Sharing an origin with the relay

`relay.aimtp.net` is a different service on the same zone, already served by its
own Caddy block. Two consequences.

**Do not put a `Domain` attribute on the demo session cookie.**
`aimtp_demo_session` is set host-only, which is correct. `Domain=.aimtp.net`
would send it to `relay.aimtp.net` on every request — a session identifier
crossing into a different trust boundary for no benefit.

**HSTS `includeSubDomains` is safe here, but check before extending it.** Both
names already have certificates, so enabling it costs nothing today. It becomes
a trap the moment a new `*.aimtp.net` name is introduced: browsers that have
seen the header will refuse plaintext to it before it has a certificate, for the
remaining max-age. Give any new subdomain a working block first.

## The demo sidecar

`/demo/agent-trust-gateway` is backed by a service in the protocol repo, reached
server-side over the internal `aimtp-demo` Docker network. It has no
authentication of its own, and its safety rests entirely on not being reachable
from outside that network.

It must therefore never be given a published port or a Caddy site block. Adding
one would expose an unauthenticated service, and nothing in the code would
report it — the demo would simply keep working. Note that the relay next to it
*does* authenticate (it answers 401 unauthenticated); the sidecar does not, so
the two are not interchangeable examples of "a service we expose".

Unset `AIMTP_DEMO_ORIGIN` is a supported state: the page renders a labelled
unavailable panel and points at the recorded run at `/demo`.
