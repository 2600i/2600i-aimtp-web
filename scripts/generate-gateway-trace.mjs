/**
 * Produces data/gateway-trace.json — every verdict, reason and audit row the
 * site displays — by running the real Agent Trust Gateway.
 *
 * The point is that the homepage cannot claim behaviour the software does not
 * have. Nothing here is written by hand: the scenarios are driven through the
 * actual `AgentTrustGateway` class from the AIMTP repo, with real Ed25519 keys
 * and real signature verification, and whatever it answers is what ships.
 *
 *   npm run trace          regenerate the fixture
 *   npm run trace:check    fail if the committed fixture no longer matches
 *
 * The fixture is committed so that neither the build nor CI needs the protocol
 * repo present. `trace:check` is how it is kept from drifting: run it whenever
 * the Gateway changes. It exits 0 with a notice (not a failure) when the
 * protocol repo is absent, so a checkout without a sibling clone still builds.
 */
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "data/gateway-trace.json");
const AIMTP_REPO = process.env.AIMTP_REPO || path.resolve(root, "../2600i-AIMTP");
const CHECK = process.argv.includes("--check");

/* Volatile values are replaced so the fixture is diff-stable and comparable. */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;

function normalise(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, v) =>
      typeof v === "string" ? v.replace(UUID, "<id>").replace(ISO, "<timestamp>") : v,
    ),
  );
}

function loadGateway() {
  const dist = path.join(AIMTP_REPO, "dist/runtime/trust-gateway.js");
  if (!existsSync(dist)) {
    return { missing: `${dist} not found — run \`npm run build\` in ${AIMTP_REPO}` };
  }
  const require = createRequire(path.join(AIMTP_REPO, "package.json"));
  return {
    gateway: require(dist),
    signature: require(path.join(AIMTP_REPO, "runtime/signature.js")),
    config: JSON.parse(readFileSync(path.join(AIMTP_REPO, "config/trust-gateway.demo.json"), "utf8")),
    version: JSON.parse(readFileSync(path.join(AIMTP_REPO, "package.json"), "utf8")).version,
  };
}

/**
 * The conformance report, read from the suite rather than transcribed.
 *
 * These numbers were previously typed into the /protocol page by hand, and they
 * went stale the moment the mailbox schemas moved out of `schemas/` — the site
 * claimed 58 checks while the suite ran 54. A page whose whole argument is
 * "conformance is a test, not a claim" cannot afford to be wrong about its own
 * test, so the figures now come from `--json` on every regeneration.
 */
function runConformance() {
  const raw = execFileSync(
    process.execPath,
    [path.join(AIMTP_REPO, "tests/conformance/run.mjs"), "--json"],
    { cwd: AIMTP_REPO, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const report = JSON.parse(raw);
  return {
    ok: report.ok,
    spec_version: report.spec_version,
    schema_origin: report.canonical_schema_origin,
    total: report.totals.passed,
    failed: report.totals.failed,
    // Ordered so the rendered report reads the way the CLI prints it.
    suites: ["schema", "canonical", "signing", "integrity"]
      .filter((name) => report.suites[name])
      .map((name) => ({ name, ...report.suites[name] })),
  };
}

async function buildTrace(deps) {
  const { AgentTrustGateway, InMemoryTrustGatewayStore } = deps.gateway;
  const { canonicalizeEnvelopeForSigning } = deps.signature;

  const procurement = crypto.generateKeyPairSync("ed25519");
  const untrusted = crypto.generateKeyPairSync("ed25519");
  const stranger = crypto.generateKeyPairSync("ed25519");
  const spki = (pair) => pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");

  const gateway = new AgentTrustGateway({
    config: deps.config,
    store: new InMemoryTrustGatewayStore(),
    logger: { error() {}, warn() {} },
    trustedKeys: [
      `demo-procurement-key=${spki(procurement)}`,
      `untrusted-demo-key=${spki(untrusted)}`,
      `stranger-key=${spki(stranger)}`,
    ].join(","),
  });

  const sign = ({ id, amount, sender = "procurement-agent-1", kid = "demo-procurement-key", key = procurement }) => {
    const envelope = {
      spec: "aimtp/0.1",
      id,
      timestamp: new Date().toISOString(),
      sender,
      recipient: "protected-demo-service",
      intent: "task.request",
      message: { id: `${id}-message`, role: "user", content: "Create a simulated purchase" },
      task: { kind: "request", id: `${id}-task`, type: "purchase.create", input: { item: "test-item", amount } },
    };
    return {
      ...envelope,
      signature: {
        alg: "ed25519",
        kid,
        sig: crypto.sign(null, canonicalizeEnvelopeForSigning(envelope), key.privateKey).toString("base64"),
      },
    };
  };

  const scenarios = [];
  const record = (key, label, note, response) => scenarios.push({ key, label, note, response: normalise(response) });

  const allowEnvelope = sign({ id: "demo-allow", amount: 25 });
  record("allow", "Trusted agent, $25", "Within the configured limit.", await gateway.receive(allowEnvelope));

  const pending = await gateway.receive(sign({ id: "demo-approval", amount: 100 }));
  record("approval", "Trusted agent, $100", "Over the limit — held for a human.", pending);
  record("approved", "Operator approves", "The original request executes, once.", await gateway.approve(pending.approval_id, "operator-1"));
  record("duplicate", "The same approval, again", "The record was already claimed.", await gateway.approve(pending.approval_id, "operator-1"));

  const toReject = await gateway.receive(sign({ id: "demo-reject", amount: 250 }));
  record("rejected", "Operator rejects", "The protected action never runs.", gateway.reject(toReject.approval_id, "operator-1"));

  record(
    "untrusted",
    "Known agent, not trusted",
    "Authentication succeeds; trust does not.",
    await gateway.receive(sign({ id: "demo-untrusted", amount: 10, sender: "untrusted-demo-agent", kid: "untrusted-demo-key", key: untrusted })),
  );
  record(
    "unknown",
    "Valid signature, unknown identity",
    "The key verifies but maps to no configured agent.",
    await gateway.receive(sign({ id: "demo-stranger", amount: 10, kid: "stranger-key", key: stranger })),
  );

  const tampered = sign({ id: "demo-invalid", amount: 25 });
  tampered.task.input.amount = 26;
  record("tampered", "Payload altered after signing", "Rejected before policy is consulted.", await gateway.receive(tampered));

  const replayed = sign({ id: "demo-replay", amount: 25 });
  await gateway.receive(replayed);
  record("replay", "The same envelope, resent", "Envelope ids are single-use.", await gateway.receive(replayed));

  const conformance = runConformance();

  return {
    $comment: "GENERATED by scripts/generate-gateway-trace.mjs from the real Agent Trust Gateway and conformance suite. Do not edit by hand.",
    wire: conformance.spec_version,
    implementation: deps.version,
    conformance,
    scenarios,
    audit: normalise(gateway.store.listAudit(40)),
    /*
     * The signature is elided rather than truncated. Every run signs over a
     * fresh timestamp with a fresh ephemeral key, so real bytes would differ on
     * every regeneration — which would make the fixture un-diffable and the
     * freshness check meaningless. Showing a truncated real signature would
     * also imply the printed envelope is verifiable as printed, and it is not:
     * its timestamp is normalised here too.
     */
    envelope: normalise({
      ...allowEnvelope,
      signature: { ...allowEnvelope.signature, sig: "<base64 ed25519 signature>" },
    }),
  };
}

async function main() {
  const deps = loadGateway();
  if (deps.missing) {
    if (CHECK) {
      console.log(`trace:check skipped — ${deps.missing}`);
      return;
    }
    throw new Error(deps.missing);
  }

  const trace = await buildTrace(deps);
  const serialised = `${JSON.stringify(trace, null, 2)}\n`;

  if (CHECK) {
    if (!existsSync(OUT)) throw new Error("data/gateway-trace.json is missing — run `npm run trace`");
    if (readFileSync(OUT, "utf8") !== serialised) {
      throw new Error(
        "data/gateway-trace.json is stale — the Gateway's behaviour or the conformance results changed. Run `npm run trace`.",
      );
    }
    console.log(
      `trace:check ok — ${trace.scenarios.length} scenarios, ${trace.audit.length} audit events, ${trace.conformance.total} conformance checks`,
    );
    return;
  }

  writeFileSync(OUT, serialised);
  console.log(`wrote data/gateway-trace.json — ${trace.scenarios.length} scenarios, ${trace.audit.length} audit events`);
  for (const scenario of trace.scenarios) {
    console.log(`  ${scenario.key.padEnd(11)} ${scenario.response.decision.padEnd(17)} ${scenario.response.reason}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
