import trace from "@/data/gateway-trace.json";

/**
 * Everything in this file renders `data/gateway-trace.json`, which is produced
 * by running the real Agent Trust Gateway (scripts/generate-gateway-trace.mjs).
 * The layouts are designed; the verdicts, reasons and audit rows are not
 * written by hand. That is the whole point — the page cannot show behaviour the
 * software does not have.
 */

type Scenario = (typeof trace.scenarios)[number];

function scenario(key: string): Scenario {
  const found = trace.scenarios.find((item) => item.key === key);
  if (!found) throw new Error(`gateway-trace.json has no scenario "${key}"`);
  return found;
}

/* --- the pipeline --------------------------------------------------------- */

/**
 * The order below is the order the Gateway actually evaluates in — schema,
 * signature, identity binding, freshness, single-use, trust, policy — and the
 * reason it matters is that everything except policy comes *first*. A request
 * that fails any earlier stage never reaches a policy decision at all.
 */
const STAGES = [
  { name: "Envelope schema", detail: "Valid aimtp/0.1 envelope, or nothing proceeds." },
  { name: "Signature", detail: "Ed25519 over the canonical payload. Not the caller's word." },
  { name: "Identity binding", detail: "The verified key maps to one agent. sender must match it." },
  { name: "Freshness", detail: "Timestamp inside the accepted window." },
  { name: "Single use", detail: "The envelope id is a nonce. Replays are refused." },
  { name: "Trust state", detail: "Known is not the same as trusted." },
  { name: "Policy", detail: "Action plus constraints, evaluated in configuration order." },
] as const;

export function Pipeline() {
  return (
    <div className="pipeline">
      {STAGES.map((stage) => (
        <div key={stage.name} className="pipeline-step" data-state="pass">
          <span className="pipeline-name">{stage.name}</span>
          <span className="pipeline-detail">{stage.detail}</span>
        </div>
      ))}
    </div>
  );
}

/* --- verdicts ------------------------------------------------------------- */

const VERDICTS = [
  {
    decision: "ALLOW" as const,
    key: "allow",
    copy: "The agent is authenticated, trusted, and the request falls inside policy. The protected action runs.",
  },
  {
    decision: "REQUIRE_APPROVAL" as const,
    key: "approval",
    copy: "Everything checks out except scale. The request is held as a pending record and a person decides.",
  },
  {
    decision: "DENY" as const,
    key: "untrusted",
    copy: "Any failure — signature, identity, freshness, trust, policy — stops the request before it reaches the protected system.",
  },
];

export function Verdicts() {
  return (
    <div className="verdicts">
      {VERDICTS.map((verdict) => {
        const observed = scenario(verdict.key).response;
        return (
          <article key={verdict.decision} className="verdict" data-verdict={verdict.decision}>
            <h3 className="verdict-name mono">{verdict.decision}</h3>
            <div className="verdict-rule" />
            <p className="verdict-copy">{verdict.copy}</p>
            <p className="verdict-meta mono">{observed.reason}</p>
          </article>
        );
      })}
    </div>
  );
}

/* --- audit ---------------------------------------------------------------- */

const AUDIT_COLUMNS = [
  { key: "request_id", label: "Request" },
  { key: "agent_id", label: "Agent" },
  { key: "authentication_result", label: "Auth" },
  { key: "trust_result", label: "Trust" },
  { key: "policy_decision", label: "Policy" },
  { key: "final_outcome", label: "Outcome" },
  { key: "reason", label: "Reason" },
] as const;

export function AuditTable({ limit = 12 }: { limit?: number }) {
  const events = trace.audit.slice(0, limit);

  return (
    <div className="audit">
      <table>
        <caption>
          Recorded output · {trace.audit.length} events · aimtp/{trace.wire.split("/")[1]} · gateway {trace.implementation}
        </caption>
        <thead>
          <tr>
            {AUDIT_COLUMNS.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.event_id}>
              {AUDIT_COLUMNS.map((column) => {
                const value = event[column.key as keyof typeof event];
                const text = value === null ? "—" : String(value);
                return (
                  <td key={column.key} className="mono">
                    {column.key === "final_outcome" ? (
                      <span className="audit-outcome" data-outcome={text}>
                        {text}
                      </span>
                    ) : (
                      text
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --- the envelope --------------------------------------------------------- */

/**
 * One code artifact on the homepage, deliberately. Depth belongs on /protocol
 * and /docs; the landing page only has to make it credible that there is a
 * real wire format underneath, and a signed envelope does that in twelve lines.
 */
export function EnvelopeSample() {
  const { envelope } = trace;

  return (
    <div className="code">
      <div className="code-bar">
        <span>Signed request envelope</span>
        <span className="mono">aimtp/0.1</span>
      </div>
      <pre className="mono">
        <code>{JSON.stringify(envelope, null, 2)}</code>
      </pre>
    </div>
  );
}

/* --- conformance ---------------------------------------------------------- */

/**
 * The conformance report, rendered from the suite's own `--json` output rather
 * than transcribed. These figures were hand-typed once and went stale the
 * moment the mailbox schemas moved out of `schemas/`: the page claimed 58
 * checks while the suite ran 54. A page arguing that conformance is a test
 * rather than a claim cannot be wrong about its own test.
 */
export function ConformanceReport() {
  const { conformance } = trace;
  const pad = Math.max(...conformance.suites.map((suite) => suite.name.length)) + 2;

  const lines = [
    "AIMTP conformance report",
    `  wire version: ${conformance.spec_version}`,
    `  schema origin: ${conformance.schema_origin}`,
    "",
    ...conformance.suites.map(
      (suite) =>
        `  [${suite.failed ? "FAIL" : "PASS"}] ${suite.name.padEnd(pad)}${String(suite.passed).padStart(2)} passed, ${suite.failed} failed`,
    ),
    "",
    `${conformance.ok ? "OK" : "FAILED"}: conformance (${conformance.total} checks)`,
  ].join("\n");

  return (
    <div className="code">
      <div className="code-bar">
        <span>Conformance report</span>
        <span className="mono">npm run conformance</span>
      </div>
      <pre className="mono">
        <code>{lines}</code>
      </pre>
    </div>
  );
}

/** The single headline number, so it cannot drift from the report above it. */
export function conformanceTotal(): number {
  return trace.conformance.total;
}

/* --- approval lifecycle --------------------------------------------------- */

export function ApprovalLifecycle() {
  const steps = [
    { key: "approval", label: "Request held", state: "hold" },
    { key: "approved", label: "Operator approves", state: "pass" },
    { key: "duplicate", label: "Replayed approval", state: "halt" },
    { key: "rejected", label: "Operator rejects", state: "halt" },
  ] as const;

  return (
    <div className="pipeline">
      {steps.map((step) => {
        const observed = scenario(step.key).response;
        return (
          <div key={step.key} className="pipeline-step" data-state={step.state}>
            <span className="pipeline-name">{step.label}</span>
            <span className="pipeline-detail mono">
              {observed.status} · {observed.reason}
            </span>
          </div>
        );
      })}
    </div>
  );
}
