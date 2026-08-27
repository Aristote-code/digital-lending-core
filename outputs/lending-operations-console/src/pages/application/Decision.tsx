import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KV, Notice, SectionHead } from "../../components/ui";
import { Dialog, DropdownMenu, MenuItem, MenuLabel, Tooltip } from "../../components/overlays";
import { dti, formatRwf } from "../../lib/format";
import { useDemo } from "../../store";
import type { Application, Customer } from "../../types";

type Outcome = "Approved" | "Approved with conditions" | "Rejected" | "Manual review";

export function Decision({ application, customer }: { application: Application; customer: Customer }) {
  const { dispatch } = useDemo();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const decided = application.decision !== "Pending";
  const blocked = application.employmentStatus !== "Verified";
  const highRisk = application.risk === "High";

  const submit = (reason: string) => {
    if (!outcome) return;
    dispatch({ type: "DECIDE", applicationId: application.id, decision: outcome, reason });
    setOutcome(null);
    if (outcome === "Rejected") {
      toast.error("Application rejected");
    } else if (outcome === "Manual review") {
      toast("Sent for manual review");
    } else {
      toast.success("Loan approved");
      navigate("/approvals");
    }
  };

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

      <DecisionDialog outcome={outcome} onClose={() => setOutcome(null)} application={application} onSubmit={submit} />
    </>
  );
}

const DEFAULT_REASONS: Record<Outcome, string> = {
  Approved: "Affordability and verification checks passed",
  "Approved with conditions": "Approved subject to salary assignment being confirmed",
  Rejected: "Risk exceeds policy tolerance",
  "Manual review": "Requires senior credit review before a decision",
};

const ACTION_LABELS: Record<Outcome, string> = {
  Approved: "Approve loan",
  "Approved with conditions": "Approve with conditions",
  Rejected: "Reject application",
  "Manual review": "Send for manual review",
};

function DecisionDialog({ outcome, onClose, application, onSubmit }: { outcome: Outcome | null; onClose: () => void; application: Application; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const open = outcome !== null;
  const value = reason || (outcome ? DEFAULT_REASONS[outcome] : "");
  const destructive = outcome === "Rejected";

  return (
    <Dialog
      open={open}
      onClose={() => {
        setReason("");
        onClose();
      }}
      title={outcome ? ACTION_LABELS[outcome] : ""}
      description={application.id + " · " + formatRwf(application.requested)}
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) return;
          onSubmit(value.trim());
          setReason("");
        }}
      >
        <div className="comparison">
          <KV label="Requested" value={formatRwf(application.requested)} />
          <KV label="Recommended" value={application.recommended ? formatRwf(application.recommended) : "No offer"} />
          <KV label="Term" value={application.term + " months"} />
          <KV label="Risk" value={application.risk + " · " + application.riskScore} />
        </div>
        <label>
          Decision reason *
          <textarea required value={value} onChange={(event) => setReason(event.target.value)} />
        </label>
        <label>
          Comment
          <textarea placeholder="Optional internal comment" />
        </label>
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setReason("");
              onClose();
            }}
          >
            Cancel
          </button>
          <button className={destructive ? "btn danger" : "btn primary"}>{outcome ? ACTION_LABELS[outcome] : ""}</button>
        </div>
      </form>
    </Dialog>
  );
}
