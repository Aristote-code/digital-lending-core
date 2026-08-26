import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge, KV, Notice, SectionHead } from "../../components/ui";
import { Popover } from "../../components/overlays";
import { formatRwf } from "../../lib/format";
import { riskTone, statusTone } from "../../lib/tone";
import type { Application } from "../../types";

export function Credit({ application }: { application: Application }) {
  const { bureau, factors } = application;

  return (
    <div className="credit-stack">
      <div className="credit-grid">
        <section className="surface score-card">
          <span>Composite risk score</span>
          <strong>{application.riskScore}</strong>
          <Badge tone={riskTone(application.risk)}>{application.risk} Risk</Badge>
          <p>Prototype score generated from verified evidence. Not a regulated scoring model.</p>
        </section>

        <section className="surface padded factors">
          <SectionHead title="Factor contribution" description="Select a factor to inspect the evidence behind it" actions={<Badge>Prototype model</Badge>} />
          {factors.map((factor) => (
            <div className="factor-row" key={factor.key}>
              <Popover
                label={"Evidence for " + factor.label}
                trigger={
                  <>
                    <span className="factor-label">{factor.label}</span>
                    <span className="bar">
                      <i style={{ width: (factor.score / factor.max) * 100 + "%" }} data-empty={factor.score === 0 ? "true" : undefined} />
                    </span>
                    <strong>
                      {factor.score} / {factor.max}
                    </strong>
                  </>
                }
              >
                <div className="popover-head">{factor.label}</div>
                <div className="popover-body">
                  <KV label="Weight" value={factor.max + " points"} />
                  <KV label="Score" value={factor.score + " / " + factor.max} />
                  <p className="popover-evidence">
                    <strong>Evidence</strong>
                    {factor.evidence}
                  </p>
                  <p className="popover-evidence">
                    <strong>Reason</strong>
                    {factor.reason}
                  </p>
                </div>
              </Popover>
            </div>
          ))}
        </section>
      </div>

      <div className="content-grid">
        <section className="surface padded">
          <SectionHead title="Positive signals" description="Evidence supporting approval" />
          {application.positives.length ? (
            application.positives.map((item) => (
              <p className="signal-line good" key={item}>
                <CheckCircle2 size={15} />
                {item}
              </p>
            ))
          ) : (
            <p className="muted">No positive signals recorded.</p>
          )}
        </section>

        <section className="surface padded">
          <SectionHead title={application.redFlags.length ? "Red flags" : "Concerns"} description={application.redFlags.length ? "Material risks requiring a documented decision" : "Items to weigh before deciding"} />
          {application.redFlags.map((item) => (
            <p className="signal-line bad" key={item}>
              <XCircle size={15} />
              {item}
            </p>
          ))}
          {application.concerns.map((item) => (
            <p className="signal-line warn" key={item}>
              <AlertTriangle size={15} />
              {item}
            </p>
          ))}
          {!application.redFlags.length && !application.concerns.length && <p className="muted">No concerns recorded.</p>}
        </section>
      </div>

      <section className="surface">
        <SectionHead title="Credit bureau report" description={"TransUnion Rwanda · received " + bureau.receivedAt} padded actions={<Badge tone={statusTone(bureau.status)}>{bureau.status}</Badge>} />
        <div className="bureau-summary">
          <KV label="Open loans" value={String(bureau.openLoans)} />
          <KV label="Outstanding" value={formatRwf(bureau.outstanding, true)} />
          <KV label="Monthly obligations" value={formatRwf(bureau.monthlyObligations)} />
          <KV label="Delinquencies" value={String(bureau.delinquencies)} bad={bureau.delinquencies > 0} />
          <KV label="Defaults" value={String(bureau.defaults)} bad={bureau.defaults > 0} />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Institution</th>
                <th>Type</th>
                <th className="right">Outstanding</th>
                <th className="right">Monthly</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bureau.facilities.map((facility) => (
                <tr key={facility.institution + facility.type}>
                  <td>{facility.institution}</td>
                  <td>{facility.type}</td>
                  <td className="right">{formatRwf(facility.outstanding)}</td>
                  <td className="right">{formatRwf(facility.monthly)}</td>
                  <td>
                    <Badge tone={facility.status === "Active" ? "success" : "danger"}>{facility.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="repayment-history">
          <span>Repayment history</span>
          <div>
            {bureau.repaymentHistory.map((entry) => (
              <span key={entry.period} className={"history-pill history-" + entry.status.toLowerCase().replace(" ", "-")} title={entry.period + " · " + entry.status}>
                {entry.period.split(" ")[0]}
              </span>
            ))}
          </div>
        </div>

        <div className="bureau-notice">
          <Notice
            good={!bureau.delinquencies && !bureau.defaults}
            title={bureau.delinquencies || bureau.defaults ? "Adverse bureau signals detected" : "No defaults or recent delinquencies"}
            text={"Report received " + bureau.receivedAt}
          />
        </div>
      </section>
    </div>
  );
}
