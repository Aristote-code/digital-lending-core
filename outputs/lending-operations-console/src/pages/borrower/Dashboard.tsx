import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileText, Plus } from "lucide-react";
import { BorrowerShell } from "../../layout/BorrowerShell";
import { formatRwf } from "../../lib/format";
import { useDemo } from "../../store";
import type { Application, Loan } from "../../types";

/** What the borrower is told about where their application stands. */
const STAGE_COPY: Record<string, { label: string; detail: string }> = {
  New: { label: "Received", detail: "We have your application and will start the checks shortly." },
  Verification: { label: "Checking your details", detail: "We are confirming your identity, income and employment." },
  "Credit Review": { label: "Under review", detail: "A credit officer is assessing your application." },
  Approval: { label: "Awaiting decision", detail: "Your application is with the approver." },
  Approved: { label: "Approved", detail: "Review your offer and accept it to receive the money." },
  Rejected: { label: "Not approved", detail: "We were unable to approve this application." },
  Disbursed: { label: "Money sent", detail: "Your loan is active." },
};

const ORDER = ["New", "Verification", "Credit Review", "Approval", "Approved", "Disbursed"];

export function BorrowerDashboard() {
  const { state } = useDemo();
  const customer = state.customers.find((item) => item.id === state.borrowerId);
  if (!customer) return null;

  const applications = state.applications.filter((item) => item.customerId === customer.id);
  const open = applications.find((item) => !["Rejected", "Disbursed"].includes(item.stage));
  const loans = state.loans.filter((item) => item.customerId === customer.id && item.status !== "Closed");
  const active = loans.find((item) => item.disbursementStatus === "Completed" && item.status !== "Paid");
  const overdue = state.collections.find((item) => item.customerId === customer.id && item.status !== "Closed");

  const todo = open
    ? [
      ...open.documents.filter((document) => document.status === "Missing" || document.status === "Rejected")
        .map((document) => ({ key: document.id, label: document.status === "Rejected" ? "Replace " + document.name.toLowerCase() : "Upload " + document.name.toLowerCase(), to: "/my/documents" })),
      ...(open.stage === "Approved" && !open.disclosureAcceptedAt ? [{ key: "offer", label: "Review and accept your offer", to: "/my/offer/" + open.id }] : []),
    ]
    : [];

  return (
    <BorrowerShell>
      {overdue && (
        <section className="b-alert">
          <AlertTriangle size={18} />
          <div>
            <strong>A payment is overdue</strong>
            <p>{formatRwf(overdue.amountOverdue)} was due {overdue.daysOverdue} days ago. Paying now stops further charges.</p>
            <Link className="btn primary" to={"/my/pay/" + overdue.loanId}>
              Pay {formatRwf(overdue.amountOverdue)}
            </Link>
          </div>
        </section>
      )}

      {todo.length > 0 && (
        <section className="b-card">
          <h2>What we need from you</h2>
          <div className="b-todo">
            {todo.map((item) => (
              <Link key={item.key} to={item.to}>
                <span>{item.label}</span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {active && <LoanCard loan={active} />}

      {open && <ApplicationCard application={open} />}

      {!open && !active && (
        <section className="b-card b-empty">
          <FileText size={26} />
          <h2>No active loan</h2>
          <p>Apply in a few minutes. You will see exactly what we need and where your application stands.</p>
          <Link className="btn primary" to="/my/apply">
            <Plus size={15} />
            Apply for a loan
          </Link>
        </section>
      )}

      {(open || active) && (
        <Link className="btn full-btn" to="/my/apply">
          <Plus size={15} />
          Apply for another loan
        </Link>
      )}
    </BorrowerShell>
  );
}

function LoanCard({ loan }: { loan: Loan }) {
  const paidShare = Math.round((loan.paidToDate / Math.max(loan.principal + loan.interest, 1)) * 100);
  return (
    <section className="b-card">
      <div className="b-card-head">
        <h2>Your loan</h2>
        <Link to={"/my/loan"}>Details</Link>
      </div>
      <div className="b-figure">
        <span>Balance remaining</span>
        <strong>{formatRwf(loan.outstanding)}</strong>
      </div>
      <div className="b-progress" role="img" aria-label={paidShare + "% repaid"}>
        <i style={{ width: paidShare + "%" }} />
      </div>
      <p className="b-progress-label">{formatRwf(loan.paidToDate)} repaid of {formatRwf(loan.principal + loan.interest)}</p>
      <div className="b-split">
        <div>
          <span>Next payment</span>
          <strong>{formatRwf(loan.nextPayment)}</strong>
        </div>
        <div>
          <span>Due</span>
          <strong>{loan.nextDue}</strong>
        </div>
      </div>
      <Link className="btn primary full-btn" to={"/my/pay/" + loan.id}>
        Make a payment
      </Link>
    </section>
  );
}

function ApplicationCard({ application }: { application: Application }) {
  const copy = STAGE_COPY[application.stage] ?? STAGE_COPY.New;
  const reached = ORDER.indexOf(application.stage);
  const rejected = application.stage === "Rejected";

  return (
    <section className="b-card">
      <div className="b-card-head">
        <h2>Your application</h2>
        <span className="b-ref">{application.id}</span>
      </div>
      <div className="b-figure">
        <span>{formatRwf(application.requested)} over {application.term} months</span>
        <strong>{copy.label}</strong>
      </div>
      <p className="b-muted">{copy.detail}</p>

      {rejected ? (
        <div className="b-declined">
          <p>{application.decisionReason}</p>
          <p className="b-muted">You can apply again once your circumstances change. Contact us if you would like to understand this decision.</p>
        </div>
      ) : (
        <ol className="b-steps">
          {ORDER.slice(0, 5).map((stage, index) => {
            const done = index < reached;
            const current = index === reached;
            return (
              <li key={stage} className={done ? "done" : current ? "current" : ""}>
                <span className="b-step-dot">{done ? <CheckCircle2 size={13} /> : current ? <Clock3 size={13} /> : null}</span>
                {STAGE_COPY[stage].label}
              </li>
            );
          })}
        </ol>
      )}

      {application.stage === "Approved" && !application.disclosureAcceptedAt && (
        <Link className="btn primary full-btn" to={"/my/offer/" + application.id}>
          Review your offer
          <ArrowRight size={15} />
        </Link>
      )}
    </section>
  );
}
