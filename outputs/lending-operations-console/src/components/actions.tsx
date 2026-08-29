import { useState } from "react";
import { toast } from "sonner";
import { Dialog } from "./overlays";
import { Field, KV, Notice } from "./ui";
import { Select } from "./Select";
import { DatePicker, formatDisplay } from "./DatePicker";
import { formatRwf } from "../lib/format";
import { restructureGate } from "../lib/policy";
import { can, denialReason } from "../lib/roles";
import { useDemo } from "../store";
import type { Application, CollectionCase, Loan } from "../types";

/**
 * Decisions live here rather than inside a page so the same dialog can be raised
 * from a peek drawer or from the full workspace. A dialog over a drawer is the
 * one stacking combination the design system sanctions by example.
 */

export type Outcome = "Approved" | "Approved with conditions" | "Rejected" | "Manual review";

export const ACTION_LABELS: Record<Outcome, string> = {
  Approved: "Approve loan",
  "Approved with conditions": "Approve with conditions",
  Rejected: "Reject application",
  "Manual review": "Send for manual review",
};

const DEFAULT_REASONS: Record<Outcome, string> = {
  Approved: "Affordability and verification checks passed",
  "Approved with conditions": "Approved subject to salary assignment being confirmed",
  Rejected: "Risk exceeds policy tolerance",
  "Manual review": "Requires senior credit review before a decision",
};

export function DecisionDialog({ outcome, onClose, application, onDone }: { outcome: Outcome | null; onClose: () => void; application: Application; onDone?: (outcome: Outcome) => void }) {
  const { dispatch } = useDemo();
  const [reason, setReason] = useState("");
  const open = outcome !== null;
  const value = reason || (outcome ? DEFAULT_REASONS[outcome] : "");
  const destructive = outcome === "Rejected";

  const close = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={outcome ? ACTION_LABELS[outcome] : ""} description={application.id + " · " + formatRwf(application.requested)}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!outcome || !value.trim()) return;
          dispatch({ type: "DECIDE", applicationId: application.id, decision: outcome, reason: value.trim() });
          setReason("");
          onClose();
          if (outcome === "Rejected") toast.error("Application rejected");
          else if (outcome === "Manual review") toast("Sent for manual review");
          else toast.success("Loan approved · sent to Finance for disbursement");
          onDone?.(outcome);
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
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button className={destructive ? "btn danger-solid" : "btn primary"}>{outcome ? ACTION_LABELS[outcome] : ""}</button>
        </div>
      </form>
    </Dialog>
  );
}

const OUTCOMES = ["Reached customer", "No answer", "Wrong number", "Promised to call back"];

export function ContactDialog({ open, onClose, item, phone, name }: { open: boolean; onClose: () => void; item: CollectionCase; phone: string; name: string }) {
  const { dispatch } = useDemo();
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [note, setNote] = useState("Spoke with borrower; requested two days to confirm payment.");

  return (
    <Dialog open={open} onClose={onClose} title="Record contact" description={name + " · " + phone}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "RECORD_CONTACT", caseId: item.id, outcome, note });
          onClose();
          toast.success("Contact recorded");
        }}
      >
        <label>
          Outcome
          <Select value={outcome} onChange={setOutcome} options={OUTCOMES} label="Contact outcome" />
        </label>
        <label>
          Notes *
          <textarea required value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save contact</button>
        </div>
      </form>
    </Dialog>
  );
}

export function PromiseDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item: CollectionCase }) {
  const { dispatch } = useDemo();
  const [date, setDate] = useState("2026-08-31");
  const [amount, setAmount] = useState(String(item.amountOverdue));
  const [note, setNote] = useState("Customer will pay the full overdue installment via MoMo.");

  return (
    <Dialog open={open} onClose={onClose} title="Promise to pay" description={formatRwf(item.amountOverdue) + " overdue"}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "PROMISE_TO_PAY", caseId: item.id, date: formatDisplay(date), amount: Number(amount), note });
          onClose();
          toast.success("Promise to pay recorded");
        }}
      >
        <label>
          Promise date
          <DatePicker value={date} onChange={setDate} min="2026-08-27" label="Promise date" />
        </label>
        <label>
          Amount
          <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} required />
        </label>
        <label>
          Notes
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Record promise</button>
        </div>
      </form>
    </Dialog>
  );
}

export function RestructureDialog({ open, onClose, item, loan }: { open: boolean; onClose: () => void; item: CollectionCase; loan: Loan }) {
  const { state, dispatch } = useDemo();
  const [term, setTerm] = useState(String(loan.term + 6));
  const [reason, setReason] = useState("Borrower income reduced; extending the term restores affordability.");
  const newInstallment = Math.round(loan.outstanding / Math.max(Number(term) || 1, 1));
  // s27: no more than twice over a facility's life, and never to conceal delinquency.
  const gate = restructureGate(loan, state.policy);
  const permitted = can(state.activeRole, "restructure");
  const blocked = !permitted ? denialReason(state.activeRole, "restructure") : gate.allowed ? undefined : gate.reason;

  return (
    <Dialog open={open} onClose={onClose} title="Restructure loan" description={loan.id + " · " + formatRwf(loan.outstanding) + " outstanding"} size="lg">
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "RESTRUCTURE", caseId: item.id, term: Number(term), reason });
          onClose();
          toast.success("Loan restructured over " + term + " months");
        }}
      >
        <div className="restructure">
          <div>
            <h3>Original</h3>
            <Field label="Term" value={loan.term + " months"} />
            <Field label="Instalment" value={formatRwf(loan.nextPayment)} />
          </div>
          <div>
            <h3>Proposed</h3>
            <Field label="Term" value={term + " months"} />
            <Field label="Instalment" value={formatRwf(newInstallment)} good={newInstallment < loan.nextPayment} />
          </div>
        </div>
        {blocked ? (
          <div className="gate">
            <span>
              <strong>This facility cannot be restructured</strong>
              {blocked}
            </span>
          </div>
        ) : (
          <Notice
            title={"Restructuring " + (loan.restructureCount + 1) + " of " + state.policy.maxRestructures + " · requires manager approval"}
            text={"The original terms are preserved on the loan record. The facility may only be upgraded after " + state.policy.restructureSeasoningMonths + " months of satisfactory performance, and restructuring must not be used to conceal delinquency."}
          />
        )}
        <label>
          New term (months)
          <input value={term} onChange={(event) => setTerm(event.target.value.replace(/\D/g, ""))} required />
        </label>
        <label>
          Reason *
          <textarea required value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={Boolean(blocked)}>Submit for approval</button>
        </div>
      </form>
    </Dialog>
  );
}

export function EscalateDialog({ open, onClose, item, name }: { open: boolean; onClose: () => void; item: CollectionCase; name: string }) {
  const { dispatch } = useDemo();
  const [reason, setReason] = useState("Repeated broken promises and no contactable phone number.");

  return (
    <Dialog open={open} onClose={onClose} title="Escalate to compliance" description={item.id + " · " + name} size="sm">
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "ESCALATE", caseId: item.id, reason });
          onClose();
          toast.error("Escalated to compliance");
        }}
      >
        <label>
          Reason *
          <textarea required value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn danger-solid">Escalate case</button>
        </div>
      </form>
    </Dialog>
  );
}
