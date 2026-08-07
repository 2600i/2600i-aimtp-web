# 2600i-aimtp-web

The marketing and documentation site for **AIMTP by 2600i** — the open protocol
and the Agent Trust Gateway built on it.

Canonical host: **aimtp.2600i.com**

## Run it

```sh
npm ci
npm run dev
```

## Where things come from

| Thing | Source |
|---|---|
| Brand mark | `assets/brand/2600i-lockup-source.webp` → `npm run brand` |
| Gateway trace | the real Gateway → `npm run trace` |
| Everything else | hand-written |

### The brand mark

There is no AIMTP logo. `public/brand/mark.webp` is the shared 2600i artwork
with its sub-brand line cut off by `scripts/build-brand-assets.mjs`, and the word
"AIMTP" is set as live text in that slot (`app/_components/lockup.tsx`). To
re-derive after a source re-export:

```sh
npm run brand
```

### The Gateway trace

Every verdict, reason and audit row on the site is read from
`data/gateway-trace.json`, which is produced by driving the real
`AgentTrustGateway` from the protocol repo — not written by hand. The page
cannot show behaviour the software does not have.

```sh
npm run trace         # regenerate (needs the protocol repo alongside)
npm run trace:check   # fail if the committed fixture has drifted
```

The generator looks for the protocol repo at `../2600i-AIMTP`, overridable with
`AIMTP_REPO`. The fixture is committed, so neither the build nor CI needs that
repo present; `trace:check` exits 0 with a notice when it is absent.

## Design system

The `sx-*` layer in `app/globals.css` carries the geometry the sibling
[`2600i-homeschool`](https://github.com/2600i/2600i-homeschool) site measured
from spacex.com — gutters, section heights, the type scale, the outlined button.
Token *names* (`obsidian`, `signal`, `ion`, `accent`, …) are shared across every
2600i property; each one re-pigments them. This site runs the cold palette and
Geist, matching the parent 2600i site, because it is developer infrastructure.

Deliberately **not** extracted into a shared package. Three properties with the
same token vocabulary and different pigment is the system working; a shared
component library would force them into an abstraction none of them wants.

## Deployment

Standalone Next output in a three-stage Alpine image, non-root, health-checked —
identical to the sibling 2600i sites. Compose publishes on loopback; TLS and the
public hostname are the reverse proxy's job.

```sh
docker compose up --build -d
```

`NEXT_PUBLIC_SITE_URL` is inlined at **build** time, so changing the host needs a
rebuild rather than a restart.

## aimtp.net

`aimtp.net` is deliberately untouched by this repo and does **not** redirect
here.

That domain is a protocol namespace, not a vanity domain: it is the `$id` origin
for the JSON Schemas in the protocol repo (`https://aimtp.net/schemas/…`,
`https://aimtp.net/spec/…`, with cross-`$ref`s between them), and
`relay.aimtp.net` is referenced as a public relay. A blanket redirect to
`aimtp.2600i.com` would turn every schema identifier into a redirect.

Known gap: those `$id` URLs currently resolve to nothing. Serving the schemas at
their own identifiers — while redirecting only the marketing paths — is the
intended fix whenever that is picked up. It is not wired up here.

## Honesty constraints

This site describes a developer preview. It must not claim customers, usage
figures, security certifications, partnerships, production scale, or transaction
counts, because there are none. What it may claim — working software, the frozen
wire version, conformance results, architecture, and recorded demo output — is
either verifiable in the protocol repo or generated from it.
