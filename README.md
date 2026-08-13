# 2600i-aimtp-web

The marketing and documentation site for **AIMTP by 2600i** — the open protocol
and the Agent Trust Gateway built on it.

Canonical host: **aimtp.net**. Three path prefixes on that origin belong to the
protocol's schemas rather than to the site — see [aimtp.net](#aimtpnet).

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
| Live demo verdicts | the real Gateway, at request time → the demo sidecar |
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

### The live demo

`/demo/agent-trust-gateway` is interactive: each button drives a real
`AgentTrustGateway` and shows what it answered. `/demo` stays what it was — a
recorded run, rendered from the committed fixture.

The Gateway cannot run in this container. `aimtp` is a private, unpublished
package and this repository is its own Docker build context, so there is no way
to `require()` it here. The live demo is therefore a **sidecar**: the protocol
repository's `docker-compose.demo.yml` runs the Gateway demo service, and
`app/api/gateway-demo/[...path]/route.ts` proxies to it server-side. Keys,
signing and Gateway state stay entirely on that side; the browser only ever
talks to this origin, which is why `connect-src 'self'` needs no exception.

```sh
docker network create aimtp-demo                                  # once
docker compose -f docker-compose.demo.yml up --build -d           # protocol repo
AIMTP_DEMO_ORIGIN=http://aimtp-gateway-demo:8090 docker compose up -d
```

`AIMTP_DEMO_ORIGIN` is read at run time and is deliberately not `NEXT_PUBLIC_*`,
so the sidecar is never addressable from a browser. **Unset is a supported
state**: the page renders a labelled "unavailable" panel and points at the
recorded run. It never substitutes a frontend animation for the real Gateway —
a page whose argument is that the verdicts are real cannot fake them when the
service is down.

Each visitor gets an isolated in-memory Gateway, keyed by an `httpOnly` session
cookie. That is load-bearing rather than tidy: the controller holds the pending
approval and the used envelope ids, so a shared instance would let one visitor's
approval claim another's held request.

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

Full proxy configuration, TLS and DNS are in [`docs/deployment.md`](docs/deployment.md).

## aimtp.net

The site is canonical at `aimtp.net`. But it does **not** own that whole origin.

(`aimtp.2600i.com` appears in older notes as the canonical host. It was never
deployed and has no DNS record, so nothing redirects from it — there is nothing
to redirect.)

`aimtp.net` is a protocol namespace before it is a marketing host. It is the
`$id` origin for the protocol repo's JSON Schemas, and three path prefixes are
therefore reserved:

| Reserved | Files |
|---|---|
| `/schemas/` | `envelope`, `message`, `bridge-proof-v1` |
| `/spec/` | `trust-bundle-v0.4` and the identity/revocation set it `$ref`s |
| `/runtime/schemas/` | the `mailbox-*` set |

These are identifiers, not documentation links. `spec/trust-bundle-v0.4` names
three siblings by absolute URL, so a validator resolving a trust bundle fetches
them over the network — and answering one of those URLs with HTML, or with a
redirect, fails validation in someone else's process.

Caddy serves them as static files from a `handle` block that is mutually
exclusive with the reverse proxy, so this application cannot answer them however
its routes later change, and schema resolution survives a site outage or a bad
deploy.

```sh
npm run schemas         # stage into dist-schemas/ (needs the protocol repo)
npm run schemas:check   # verify $ids and cross-$refs, write nothing
rsync -a --delete dist-schemas/ <host>:/srv/aimtp-schemas/
```

Nothing is committed here: the staged output is gitignored, so the protocol repo
stays the only definition of a schema. `schemas:check` fails if a schema's `$id`
does not match the URL it would be served at, or if an absolute `$ref` points at
something not being published — the two ways this silently stops resolving. It
exits 0 with a notice when the protocol repo is absent, so a checkout without a
sibling clone still builds.

See `docs/deployment.md` for the proxy configuration, including the reserved
locations and the CORS and content-type headers validators need.

`relay.aimtp.net` is separate and is not served by this repo. It is already
deployed, already the compiled-in default in the protocol repo's CLI
(`cli/aimtp-send.mjs`), and answers 401 without an API key.

## Known dead links (deliberate)

`/docs` links into `github.com/2600i/AIMTP`, and both demo pages tell you to
clone it. Neither works for the public yet, because **that repository is
private**. Every documentation link 404s for anyone without access.

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
