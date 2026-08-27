import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Shell } from "../layout/Shell";
import { Badge, Field, KV, Notice, PageHead, SectionHead, Timeline } from "../components/ui";
import { Dialog, Drawer, DrawerSection, DropdownMenu, MenuItem, MenuSeparator } from "../components/overlays";
import { formatRwf } from "../lib/format";
import { statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { CollectionCase as CaseType, Loan } from "../types";

const OUTCOMES = ["Reached customer", "No answer", "Wrong number", "Promised to call back"];

export function CollectionCase() {
  const { id } = useParams();
  const { state, dispatch } = useDemo();
  const [contactOpen, setContactOpen] = useState(false);
  const [promiseOpen, setPromiseOpen] = useState(false);
  const [restructureOpen, setRestructureOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  const item = state.collections.find((entry) => entry.id === id);
  if (!item) return <Navigate to="/collections" replace />;
  const customer = state.customers.find((entry) => entry.id === item.customerId);
  const loan = state.loans.find((entry) => entry.id === item.loanId);
  if (!customer || !loan) return <Navigate to="/collections" replace />;

  return (
    <Shell>
      <div className="page">
        <PageHead
          eyebrow={item.id + " · " + item.loanId}
          title={customer.name}
          description={item.daysOverdue + " days overdue · " + customer.phone}
          actions={<Badge tone={statusTone(item.status)}>{item.status}</Badge>}
        />

        <div className="collection-hero">
          <div>
            <span>Amount overdue</span>
            <strong>{formatRwf(item.amountOverdue)}</strong>
          </div>
          <KV label="Last contact" value={item.lastContact} />
          <KV label="Owner" value={item.owner} />
          <KV label="Next action" value={item.nextAction} />
          <KV label="Promise" value={item.promiseDate ? item.promiseDate + " · " + formatRwf(item.promiseAmount ?? 0) : "None"} good={Boolean(item.promiseDate)} />
        </div>

        {item.status === "Promise to pay" && (
          <Notice good title={"Promise recorded for " + item.promiseDate} text="The case reopens automatically if the promise is broken." />
        )}

        {/* One primary action, one common secondary, everything else behind the overflow —
            a row of five equal-weight buttons tells you nothing about what to do next. */}
        <div className="actionbar">
          <button className="btn primary" onClick={() => setContactOpen(true)}>
            Record contact
          </button>
          <button className="btn" onClick={() => setPromiseOpen(true)}>
            Promise to pay
          </button>
          <DropdownMenu label="More case actions">
            {(close) => (
              <>
                <MenuItem onSelect={() => { close(); toast.success("SMS reminder sent to " + customer.phone); }}>Send reminder</MenuItem>
                <MenuItem onSelect={() => { close(); setRestructureOpen(true); }} disabled={item.status === "Restructured"}>
                  Restructure loan
                </MenuItem>
                <MenuSeparator />
                <MenuItem destructive onSelect={() => { close(); setEscalateOpen(true); }} disabled={item.status === "Escalated"}>
                  Escalate to compliance
                </MenuItem>
              </>
            )}
          </DropdownMenu>
        </div>

        <section className="surface timeline">
          <SectionHead title="Collection timeline" description="Contact and payment events" />
          {item.events.map((event) => (
            <Timeline key={event.id} title={event.type} text={event.note + " · " + event.actor} time={event.at} />
          ))}
        </section>
      </div>

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} item={item} phone={customer.phone} name={customer.name} />
      <PromiseDialog open={promiseOpen} onClose={() => setPromiseOpen(false)} item={item} />
      <RestructureDialog open={restructureOpen} onClose={() => setRestructureOpen(false)} item={item} loan={loan} />

      <Dialog open={escalateOpen} onClose={() => setEscalateOpen(false)} title="Escalate to compliance" description={item.id + " · " + customer.name}>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
            dispatch({ type: "ESCALATE", caseId: item.id, reason });
            setEscalateOpen(false);
            toast.error("Escalated to compliance");
          }}
        >
          <label>
            Reason *
            <textarea name="reason" required defaultValue="Repeated broken promises and no contactable phone number." />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setEscalateOpen(false)}>
              Cancel
            </button>
            <button className="btn danger">Escalate case</button>
          </div>
        </form>
      </Dialog>
    </Shell>
  );
}

function ContactDialog({ open, onClose, item, phone, name }: { open: boolean; onClose: () => void; item: CaseType; phone: string; name: string }) {
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
          <select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
            {OUTCOMES.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
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

function PromiseDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item: CaseType }) {
  const { dispatch } = useDemo();
  const [date, setDate] = useState("2026-08-31");
  const [amount, setAmount] = useState(String(item.amountOverdue));
  const [note, setNote] = useState("Customer will pay the full overdue installment via MoMo.");

  const formatted = () => {
    const [year, month, day] = date.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return day + " " + months[Number(month) - 1] + " " + year;
  };

  return (
    <Dialog open={open} onClose={onClose} title="Promise to pay" description={formatRwf(item.amountOverdue) + " overdue"}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "PROMISE_TO_PAY", caseId: item.id, date: formatted(), amount: Number(amount), note });
          onClose();
          toast.success("Promise to pay recorded");
        }}
      >
        <label>
          Promise date
          <input type="date" value={date} min="2026-08-27" onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label>
          Amount
          <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} required />
        </label>
        <label>
          Notes
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary">Record promise</button></div>
      </form>
    </Dialog>
  );
}

function RestructureDialog({ open, onClose, item, loan }: { open: boolean; onClose: () => void; item: CaseType; loan: Loan }) {
  const { dispatch } = useDemo();
  const [term, setTerm] = useState(String(loan.term + 6));
  const [reason, setReason] = useState("Borrower income reduced; extending the term restores affordability.");
  const newInstallment = Math.round(loan.outstanding / Math.max(Number(term) || 1, 1));

  return (
    <Dialog open={open} onClose={onClose} title="Restructure loan" description={loan.id + " · " + formatRwf(loan.outstanding) + " outstanding"}>
      <div className="restructure">
        <div>
          <h3>Original</h3>
          <KV label="Term" value={loan.term + " months"} />
          <KV label="Instalment" value={formatRwf(loan.nextPayment)} />
          <KV label="Outstanding" value={formatRwf(loan.outstanding)} />
        </div>
        <div>
          <h3>Proposed</h3>
          <KV label="Term" value={term + " months"} />
          <KV label="Instalment" value={formatRwf(newInstallment)} good={newInstallment < loan.nextPayment} />
          <KV label="Outstanding" value={formatRwf(loan.outstanding)} />
        </div>
      </div>
      <Notice title="Requires manager approval" text="The original schedule and history are preserved; a new schedule is issued alongside it." />
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "RESTRUCTURE", caseId: item.id, term: Number(term), reason });
          onClose();
          toast.success("Loan restructured over " + term + " months");
        }}
      >
        <label>
          New term (months)
          <input value={term} onChange={(event) => setTerm(event.target.value.replace(/\D/g, ""))} required />
        </label>
        <label>
          Reason *
          <textarea required value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary">Submit for approval</button></div>
      </form>
    </Dialog>
  );
}
