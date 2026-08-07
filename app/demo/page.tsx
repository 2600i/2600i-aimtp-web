import type { Metadata } from "next";
import trace from "@/data/gateway-trace.json";
import { PageShell } from "../_components/page-shell";
import { AuditTable } from "../_components/proof";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "A recorded run of the AIMTP Agent Trust Gateway: allowed, held, approved, rejected, denied and replayed requests, with the audit trail each one produced.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return (
    <PageShell
      eyebrow="Recorded run"
      title="Nine requests, nine decisions"
      intro="Everything below is output, not illustration. It is produced by running the Gateway against the checked-in demo policy and recording what it answered."
      scene="scene-verdict"
    >
      <section>
        <h2>The policy</h2>
        <p>
          One trusted procurement agent may create purchases up to 50. Above that, a person decides.
          A second agent is configured but not trusted. Everything else is unknown.
        </p>
        <div className="code">
          <div className="code-bar">
            <span>config/trust-gateway.demo.json</span>
            <span className="mono">excerpt</span>
          </div>
          <pre className="mono">
            <code>{`{
  "id": "demo-purchase-within-limit",
  "agent_id": "procurement-agent-1",
  "action": "purchase.create",
  "decision": "ALLOW",
  "constraints": { "amount": { "lte": 50 } }
},
{
  "id": "demo-purchase-over-limit",
  "agent_id": "procurement-agent-1",
  "action": "purchase.create",
  "decision": "REQUIRE_APPROVAL",
  "constraints": { "amount": { "gt": 50 } }
}`}</code>
          </pre>
        </div>
      </section>

      <section>
        <h2>What happened</h2>
        <p>
          Each row is one call into the Gateway and the answer it returned. The decision and reason
          columns are verbatim.
        </p>
        <div className="audit" style={{ marginTop: 30 }}>
          <table>
            <caption>
              Recorded run · gateway {trace.implementation} · wire {trace.wire}
            </caption>
            <thead>
              <tr>
                <th scope="col">Scenario</th>
                <th scope="col">Decision</th>
                <th scope="col">Status</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {trace.scenarios.map((item) => (
                <tr key={item.key}>
                  <td>
                    {item.label}
                    <div style={{ color: "var(--color-slate)", fontSize: 11 }}>{item.note}</div>
                  </td>
                  <td className="mono">{item.response.decision}</td>
                  <td className="mono">
                    <span className="audit-outcome" data-outcome={item.response.status}>
                      {item.response.status}
                    </span>
                  </td>
                  <td className="mono">{item.response.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>The trail it produced</h2>
        <AuditTable limit={12} />
      </section>

      <section>
        <h2>Run it yourself</h2>
        <p>
          The demo needs no services, no account and no keys of your own — it generates an ephemeral
          Ed25519 keypair in memory and never writes one to disk.
        </p>
        <div className="code">
          <div className="code-bar">
            <span>Local</span>
            <span className="mono">~30 seconds</span>
          </div>
          <pre className="mono">
            <code>{`git clone https://github.com/2600i/AIMTP
cd AIMTP
npm ci
npm run demo:trust-gateway`}</code>
          </pre>
        </div>
        <div className="note">
          This page is regenerated from that same code path. If the Gateway&rsquo;s behaviour
          changes, the build fails its freshness check rather than letting this page drift into
          describing something the software no longer does.
        </div>
      </section>
    </PageShell>
  );
}
