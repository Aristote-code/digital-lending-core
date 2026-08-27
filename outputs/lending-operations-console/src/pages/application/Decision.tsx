import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KV, Notice, SectionHead } from "../../components/ui";
import { DropdownMenu, MenuItem, MenuLabel, Tooltip } from "../../components/overlays";
import { DecisionDialog, type Outcome } from "../../components/actions";
import { dti, formatRwf } from "../../lib/format";
import type { Application, Customer } from "../../types";

export function Decision({ application, customer }: { application: Application; customer: Customer }) {
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const decided = application.decision !== "Pending";
  const blocked = application.employmentStatus !== "Verified";
  const highRisk = application.risk === "High";

  const approveButton = (
    <button className="btn primary" disabled={decided || highRisk || blocked} onClick={() => setOutcome("Approved")}>
      Approve loan
    </button>
  );

  return (
    <>
      <div className="decision-grid">
        <section className="surface decision-hero">
          <span>Credit recommendation</span>
          <h2>{highRisk ? "Do not approve" : "Approve " + formatRwf(application.recommended)}</h2>
          <p>
            {highRisk
              ? application.redFlags.length + " material risk indicators require a documented decline."
              : "The proposed amount remains within the prototype affordability policy."}
          </p>
          <div className="comparison">
            <KV label="Requested" value={formatRwf(application.requested)} />
            <KV label="Recommended" value={application.recommended ? formatRwf(application.recommended) : "RWF 0"} />
            <KV label="Term" value={application.term + " months"} />
            <KV label="Risk score" value={application.riskScore + " · " + application.risk} />
            <KV label="DTI" value={dti(customer.monthlyObligations, customer.monthlyIncome) + "%"} />
            <KV label="Required approver" value={application.approver} />
          </div>
        </section>

        <section className="surface padded">
          <SectionHead title="Decision actions" description="A reason is mandatory and stored in the audit trail." />
          {/* The two outcomes that end the case sit in the open; the qualified ones live
              behind the overflow so the page states the decision rather than a menu of four. */}
          <div className="decision-actions">
            {blocked && !highRisk ? <Tooltip text="Employer verification must be completed first">{approveButton}</Tooltip> : approveButton}
            <button className="btn danger" disabled={decided} onClick={() => setOutcome("Rejected")}>
              Reject application
            </button>
            <DropdownMenu label="Other decision outcomes">
              {(close) => (
                <>
                  <MenuLabel>Qualified outcomes</MenuLabel>
                  <MenuItem disabled={decided || highRisk || blocked} onSelect={() => { close(); setOutcome("Approved with conditions"); }}>
                    Approve with conditions
                  </MenuItem>
                  <MenuItem disabled={decided} onSelect={() => { close(); setOutcome("Manual review"); }}>
                    Send for manual review
                  </MenuItem>
                </>
              )}
            </DropdownMenu>
          </div>
          {decided && <Notice good={application.decision !== "Rejected"} title={"Decision: " + application.decision} text={application.decisionReason} />}
        </section>
      </div>

      <DecisionDialog
        outcome={outcome}
        onClose={() => setOutcome(null)}
        application={application}
        onDone={(result) => result.startsWith("Approved") && navigate("/approvals")}
      />
    </>
  );
}
