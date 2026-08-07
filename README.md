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
| Conformance figures | the real conformance suite → `npm run trace` |
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

The same fixture carries the conformance report, taken from
`tests/conformance/run.mjs --json` rather than transcribed. These figures used
to be typed into `/protocol` by hand and went stale the moment the mailbox
schemas moved out of `schemas/`: the page claimed 58 checks while the suite ran
54. A page arguing that conformance is a test rather than a claim cannot be
wrong about its own test.

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
2600i property; each one re-pigments them.

Type, chrome and section grammar match the homeschool site exactly — Archivo
with Geist Mono, `.sx-navlink` at 700, the 262×30 `.sx-pill`, the 75px footer
row, and a homepage of alternating 450px blocks. Colour is the one deliberate
divergence: this site keeps the parent 2600i site's cold near-black.

Wide content (the audit table, verdict cards, code samples) lives on `/gateway`,
`/demo` and `/protocol` rather than the homepage, because a 450px block cannot
hold a seven-column table and widening one section breaks the rhythm the rest
keep.

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

## Known dead links (deliberate)

`/docs` links into `github.com/2600i/AIMTP`, and `/demo` tells you to clone it.
Neither works for the public yet, because **that repository is private**. Every
documentation link 404s for anyone without access.

The links are written against the destination state on purpose, so the page does
not have to be rewritten when it opens. All twelve documents they point at are
on `main` there, including `docs/trust-gateway.md`.

Opening that repository is the only outstanding step. The two things that
previously blocked it have been handled: the externally authored strategic
briefing no longer ships with the specification, and the federation demos now
mint their Ed25519 keys on demand rather than carrying committed ones. Its
`docs/security.md` records what remains in that repository's history and why.

## Honesty constraints

This site describes a developer preview. It must not claim customers, usage
figures, security certifications, partnerships, production scale, or transaction
counts, because there are none. What it may claim — working software, the frozen
wire version, conformance results, architecture, and recorded demo output — is
either verifiable in the protocol repo or generated from it.
