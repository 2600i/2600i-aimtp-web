# Deployment

How `aimtp.net` is served. The site is one of three things on that origin, and
it is the least constrained of them — read the schema section before changing
any proxy configuration.

## What lives where

| Host / path | Served by | Owned by |
|---|---|---|
| `aimtp.net/` | this app, on loopback `127.0.0.1:3002` | this repo |
| `aimtp.net/schemas/`, `/spec/`, `/runtime/schemas/` | static files | protocol repo |
| `aimtp.2600i.com` | 301 to `aimtp.net` | this repo |
| `relay.aimtp.net` | the relay | protocol repo |

## DNS

`A` records for `aimtp.net` and `relay.aimtp.net` pointing at the host. Keep
`aimtp.2600i.com` resolving — it redirects rather than retires, because it is
in the wild.

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
rsync -a --delete dist-schemas/ <host>:/srv/aimtp-schemas/
```

`npm run schemas:check` verifies that each `$id` matches the URL it will be
served at, and that every absolute `$ref` points at something being published.
Run it after any schema change in the protocol repo.

## nginx

```nginx
server {
    listen 443 ssl http2;
    server_name aimtp.net;

    # Matched before `location /` because a regex location outranks a prefix
    # one. This ordering is load-bearing: it is what keeps the app from ever
    # answering a schema identifier.
    location ~ ^/(schemas|spec|runtime/schemas)/ {
        root /srv/aimtp-schemas;

        # `types {}` clears the inherited mime map so default_type applies.
        # Without it, .json matches mime.types and is served as
        # application/json — acceptable to most validators, but not what these
        # documents are.
        types { }
        default_type application/schema+json;

        # Validators fetch cross-origin. Without this, browser-based ones fail
        # on the $refs while curl succeeds, which is a confusing bug to receive.
        add_header Access-Control-Allow-Origin "*" always;

        # Deliberately moderate. The -v0.4 files are immutable by name and could
        # be cached hard, but the unversioned ones (/schemas/envelope.schema.json)
        # cannot: a long immutable TTL on those would mean a correction takes a
        # cache generation to reach anyone.
        add_header Cache-Control "public, max-age=3600" always;

        # No try_files and no fallback: an unknown path under these prefixes is
        # a 404 from nginx, never a pass to the app.
    }

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    }
}

server {
    listen 443 ssl http2;
    server_name aimtp.2600i.com;
    return 301 https://aimtp.net$request_uri;
}
```

Verify the ordering actually holds before pointing anyone at it:

```sh
curl -sI https://aimtp.net/schemas/envelope.schema.json | head -1   # 200
curl -s  https://aimtp.net/spec/trust-bundle-v0.4.schema.json | head -3
curl -sI https://aimtp.2600i.com/gateway | head -2                  # 301
```

## Build-time host

`NEXT_PUBLIC_SITE_URL` is inlined into the bundle by `next build`, so the
canonical host changes with a **rebuild**, not a restart:

```sh
NEXT_PUBLIC_SITE_URL=https://aimtp.net docker compose up --build -d
```

Getting this wrong is quiet rather than loud: the site works, and only
`metadataBase`, the canonical tag and the OG image URL are wrong.

## Two things to get right

**HSTS ordering.** If the apex sends `includeSubDomains`, browsers that have
seen it will refuse plaintext to `relay.aimtp.net` as well. Give the relay a
working certificate *before* enabling it, or the subdomain is unreachable for
the max-age of a header already in caches.

**Do not put a `Domain` attribute on the demo session cookie.** `aimtp_demo_session`
is set host-only today, which is correct. `Domain=.aimtp.net` would send it to
`relay.aimtp.net` on every request — a session identifier crossing into a
different trust boundary for no benefit.

## The demo sidecar

`/demo/agent-trust-gateway` is backed by a service in the protocol repo, reached
server-side over the internal `aimtp-demo` Docker network. It has no
authentication of its own, and its safety rests entirely on not being reachable
from outside that network.

It must therefore never be given a published port or a proxy `location`. Adding
one would expose an unauthenticated service, and nothing in the code would
report it — the demo would simply keep working.

Unset `AIMTP_DEMO_ORIGIN` is a supported state: the page renders a labelled
unavailable panel and points at the recorded run at `/demo`.
