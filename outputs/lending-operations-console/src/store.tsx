import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { APP_VERSION, createSeedState } from "./data";
import { buildSchedule, installmentOf, monthLabel } from "./lib/schedule";
import { breaches, dscrOf, gradeFor } from "./lib/policy";
import { officers } from "./lib/roles";
import type { AuditEvent, DemoState, DocumentStatus, EmploymentVerificationStatus, PolicyParameters, RiskBand, StaffRole } from "./types";

const STORAGE_KEY = "lending-console-demo-v" + APP_VERSION;

export type Action =
  | { type: "SET_ROLE"; role: StaffRole }
  | { type: "DOCUMENT_STATUS"; applicationId: string; documentId: string; status: DocumentStatus; reason?: string; comment?: string }
  | { type: "REQUEST_DOCUMENTS"; applicationId: string; items: string[]; message: string }
  | { type: "EMPLOYMENT_STATUS"; applicationId: string; status: EmploymentVerificationStatus; actor?: string }
  | { type: "DECIDE"; applicationId: string; decision: "Approved" | "Approved with conditions" | "Rejected" | "Manual review"; reason: string }
  | { type: "DISBURSE"; loanId: string }
  | { type: "RECORD_CONTACT"; caseId: string; outcome: string; note: string }
  | { type: "PROMISE_TO_PAY"; caseId: string; date: string; amount: number; note: string }
  | { type: "RESTRUCTURE"; caseId: string; term: number; reason: string }
  | { type: "ESCALATE"; caseId: string; reason: string }
  | { type: "RESOLVE_COMPLIANCE"; caseId: string; status: "Cleared" | "Escalated"; note: string }
  | { type: "WRITE_OFF"; loanId: string; reason: string }
  | { type: "RESOLVE_COMPLAINT"; complaintId: string; status: "Acknowledged" | "Investigating" | "Resolved"; resolution?: string }
  | { type: "RESOLVE_EXCEPTION"; exceptionId: string; status: "Approved" | "Declined"; note: string }
  | { type: "SET_POLICY"; patch: Partial<PolicyParameters> }
  | { type: "SET_BORROWER"; customerId: string }
  | { type: "SUBMIT_APPLICATION"; product: string; amount: number; term: number; purpose: string }
  | { type: "UPLOAD_DOCUMENT"; applicationId: string; documentId?: string; name: string }
  | { type: "ACCEPT_OFFER"; applicationId: string }
  | { type: "MAKE_PAYMENT"; loanId: string; amount: number }
  | { type: "RAISE_COMPLAINT"; subject: string; detail: string; channel: "Phone" | "Email" | "Branch" | "SMS" }
  | { type: "RESET" };

/** The demo clock is anchored to 27 Aug 2026 11:32 and advances 3 minutes per action, so the
 *  audit trail reads as a real sequence instead of every entry sharing one timestamp. */
function stampFor(tick: number) {
  const total = 11 * 60 + 32 + tick * 3;
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return "27 Aug 2026, " + String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
}

function bandFor(score: number): RiskBand {
  return score >= 75 ? "Low" : score >= 50 ? "Medium" : "High";
}

function reducer(state: DemoState, action: Action): DemoState {
  if (action.type === "RESET") return createSeedState();
  if (action.type === "SET_ROLE") return { ...state, activeRole: action.role };

  const clock = state.clock + 1;
  const at = stampFor(clock);
  const actingOfficer = officers[state.activeRole];
  const log = (event: Omit<AuditEvent, "id" | "at">): AuditEvent[] => [{ ...event, id: "AUD-" + (state.audit.length + 1), at }, ...state.audit];
  const next = { ...state, clock };

  switch (action.type) {
    case "DOCUMENT_STATUS": {
      const application = state.applications.find((item) => item.id === action.applicationId);
      const document = application?.documents.find((item) => item.id === action.documentId);
      return {
        ...next,
        applications: state.applications.map((item) => item.id === action.applicationId
          ? {
            ...item,
            documents: item.documents.map((doc) => doc.id === action.documentId
              ? {
                ...doc, status: action.status, rejectionReason: action.status === "Rejected" ? action.reason : undefined,
                // The detail line is what the borrower reads, so it must follow the decision.
                detail: action.status === "Rejected"
                  ? (action.comment?.trim() || "Please send a replacement.")
                  : action.status === "Verified" ? "Accepted" : doc.detail,
              }
              : doc),
          }
          : item),
        audit: log({
          entityType: "document", entityId: action.documentId,
          action: action.status === "Verified" ? "Document verified" : "Document " + action.status.toLowerCase(),
          actor: actingOfficer, before: document?.status, after: action.status, reason: action.reason,
        }),
      };
    }

    case "REQUEST_DOCUMENTS":
      return {
        ...next,
        applications: state.applications.map((item) => item.id === action.applicationId ? { ...item, requestedInfo: action.items } : item),
        audit: log({ entityType: "application", entityId: action.applicationId, action: "Information requested", actor: actingOfficer, after: action.items.join(", "), reason: action.message }),
      };

    case "EMPLOYMENT_STATUS": {
      const application = state.applications.find((item) => item.id === action.applicationId);
      if (!application) return state;
      const verified = action.status === "Verified";
      const previousEmployerScore = application.factors.find((factor) => factor.key === "employer")?.score ?? 0;
      const employerScore = verified ? 4 : 0;
      const riskScore = application.riskScore - previousEmployerScore + employerScore;

      return {
        ...next,
        applications: state.applications.map((item) => item.id === action.applicationId ? {
          ...item,
          employmentStatus: action.status,
          riskScore,
          risk: bandFor(riskScore),
          employment: { ...item.employment, hrConfirmed: verified ? item.employment.declared : 0 },
          factors: item.factors.map((factor) => factor.key === "employer" ? {
            ...factor,
            score: employerScore,
            evidence: verified
              ? "HR confirmed " + item.employment.position + " at " + item.employment.declared.toLocaleString("en-RW") + " per month"
              : factor.evidence,
            reason: verified ? "Employer confirmed employment and salary directly." : factor.reason,
          } : factor),
        } : item),
        employers: state.employers.map((employer) => employer.name === state.customers.find((customer) => customer.id === application.customerId)?.employer
          ? { ...employer, status: action.status }
          : employer),
        audit: log({
          entityType: "employment", entityId: action.applicationId, action: "Employment verification " + action.status.toLowerCase(),
          actor: action.actor ?? actingOfficer, before: application.employmentStatus, after: action.status,
          reason: verified ? "Confirmed by employer HR" : undefined,
        }),
      };
    }

    case "DECIDE": {
      const application = state.applications.find((item) => item.id === action.applicationId);
      const approved = action.decision === "Approved" || action.decision === "Approved with conditions";
      const customerName = state.customers.find((item) => item.id === application?.customerId)?.name ?? "";
      // s36: an approval that departs from policy is registered, not silently allowed.
      const raised = approved && application
        ? breaches(application, state.policy).map((detail, index) => ({
          id: "EXC-" + String(clock) + "-" + index,
          entityId: application.id,
          entityLabel: customerName + " · " + application.id,
          type: detail.startsWith("DSCR") ? "Debt service coverage" : detail.startsWith("LTV") ? "Loan-to-value" : "Security",
          detail,
          justification: action.reason,
          raisedBy: actingOfficer,
          at,
          status: "Open" as const,
        }))
        : [];
      return {
        ...next,
        exceptions: [...raised, ...state.exceptions],
        applications: state.applications.map((item) => item.id === action.applicationId ? {
          ...item, decision: action.decision, decisionReason: action.reason,
          approvedBy: approved ? actingOfficer : undefined,
          approvedAt: approved ? at : undefined,
          stage: approved ? "Approved" : action.decision === "Rejected" ? "Rejected" : "Approval",
        } : item),
        loans: state.loans.map((loan) => loan.applicationId === action.applicationId && approved
          ? { ...loan, disbursementStatus: "Ready" }
          : loan),
        audit: log({
          entityType: "application", entityId: action.applicationId, action: "Application " + action.decision.toLowerCase(),
          actor: actingOfficer, before: application?.decision, after: action.decision, reason: action.reason,
        }),
      };
    }

    case "DISBURSE": {
      const loan = state.loans.find((item) => item.id === action.loanId);
      if (!loan) return state;
      const schedule = buildSchedule(loan.principal, loan.interest, loan.term);
      const reference = "TX-" + String(82749201 + clock);
      return {
        ...next,
        loans: state.loans.map((item) => item.id === action.loanId ? {
          ...item, status: "Active", disbursementStatus: "Completed", disbursedAt: at, schedule,
          nextPayment: installmentOf(item.principal, item.interest, item.term), nextDue: monthLabel(0),
          outstanding: item.principal + item.interest,
          transactions: [{ id: reference, type: "Disbursement", amount: item.principal, at, reference: item.destination, direction: "out" }, ...item.transactions],
        } : item),
        applications: state.applications.map((item) => item.id === loan.applicationId ? { ...item, stage: "Disbursed" } : item),
        audit: log({
          entityType: "loan", entityId: action.loanId, action: "Loan disbursed", actor: "Finance",
          before: "Ready", after: "Completed · " + reference, reason: "All pre-disbursement checks passed",
        }),
      };
    }

    case "RECORD_CONTACT":
      return {
        ...next,
        collections: state.collections.map((item) => item.id === action.caseId ? {
          ...item, lastContact: "27 Aug 2026", nextAction: "Follow up in 2 days",
          events: [{ id: "CE-" + clock, type: action.outcome, note: action.note, at, actor: actingOfficer }, ...item.events],
        } : item),
        audit: log({ entityType: "collection", entityId: action.caseId, action: "Contact recorded", actor: actingOfficer, after: action.outcome, reason: action.note }),
      };

    case "PROMISE_TO_PAY":
      return {
        ...next,
        collections: state.collections.map((item) => item.id === action.caseId ? {
          ...item, status: "Promise to pay", promiseDate: action.date, promiseAmount: action.amount,
          lastContact: "27 Aug 2026", nextAction: "Monitor promise due " + action.date,
          events: [{ id: "CE-" + clock, type: "Promise to pay", note: action.note, at, actor: actingOfficer }, ...item.events],
        } : item),
        audit: log({ entityType: "collection", entityId: action.caseId, action: "Promise to pay recorded", actor: actingOfficer, after: action.date, reason: String(action.amount) }),
      };

    case "RESTRUCTURE": {
      const item = state.collections.find((entry) => entry.id === action.caseId);
      const loan = state.loans.find((entry) => entry.id === item?.loanId);
      if (!item || !loan) return state;
      const installment = installmentOf(loan.outstanding, 0, action.term);
      return {
        ...next,
        // The original schedule is replaced going forward but restructuredFrom preserves the
        // prior terms — loan history is never overwritten.
        loans: state.loans.map((entry) => entry.id === loan.id ? {
          ...entry, status: "Restructured", nextPayment: installment, nextDue: monthLabel(0), term: action.term,
          restructuredFrom: { term: entry.term, installment: entry.nextPayment, at },
          schedule: buildSchedule(entry.outstanding, 0, action.term),
        } : entry),
        collections: state.collections.map((entry) => entry.id === action.caseId ? {
          ...entry, status: "Restructured", nextAction: "Monitor restructured schedule",
          events: [{ id: "CE-" + clock, type: "Restructured", note: "Rescheduled over " + action.term + " months · " + action.reason, at, actor: actingOfficer }, ...entry.events],
        } : entry),
        audit: log({ entityType: "loan", entityId: loan.id, action: "Loan restructured", actor: actingOfficer, before: loan.term + " months", after: action.term + " months", reason: action.reason }),
      };
    }

    case "ESCALATE": {
      const item = state.collections.find((entry) => entry.id === action.caseId);
      const customer = state.customers.find((entry) => entry.id === item?.customerId);
      if (!item || !customer) return state;
      const id = "CMP-" + String(149 + state.complianceCases.length);
      return {
        ...next,
        collections: state.collections.map((entry) => entry.id === action.caseId ? {
          ...entry, status: "Escalated", nextAction: "Awaiting compliance review",
          events: [{ id: "CE-" + clock, type: "Escalated", note: action.reason, at, actor: actingOfficer }, ...entry.events],
        } : entry),
        complianceCases: [{ id, customerId: customer.id, customerName: customer.name, type: "Collections escalation", severity: "High", status: "Open", owner: actingOfficer, openedAt: at, note: action.reason }, ...state.complianceCases],
        audit: log({ entityType: "compliance", entityId: id, action: "Compliance case opened", actor: actingOfficer, after: "Open", reason: action.reason }),
      };
    }

    case "RESOLVE_COMPLIANCE":
      return {
        ...next,
        complianceCases: state.complianceCases.map((item) => item.id === action.caseId ? { ...item, status: action.status } : item),
        audit: log({ entityType: "compliance", entityId: action.caseId, action: "Compliance case " + action.status.toLowerCase(), actor: actingOfficer, after: action.status, reason: action.note }),
      };

    case "WRITE_OFF": {
      const loan = state.loans.find((item) => item.id === action.loanId);
      if (!loan) return state;
      return {
        ...next,
        loans: state.loans.map((item) => item.id === action.loanId
          ? { ...item, writtenOffAt: at, writeOffReason: action.reason, status: "Closed" as const, outstanding: 0 }
          : item),
        audit: log({
          entityType: "loan", entityId: action.loanId, action: "Facility written off", actor: actingOfficer,
          before: String(loan.outstanding), after: "0",
          reason: action.reason + " — write-off does not extinguish the debt; recovery may continue.",
        }),
      };
    }

    case "RESOLVE_COMPLAINT":
      return {
        ...next,
        complaints: state.complaints.map((item) => item.id === action.complaintId
          ? { ...item, status: action.status, resolution: action.resolution ?? item.resolution, resolvedAt: action.status === "Resolved" ? at : item.resolvedAt, owner: actingOfficer }
          : item),
        audit: log({ entityType: "complaint", entityId: action.complaintId, action: "Complaint " + action.status.toLowerCase(), actor: actingOfficer, after: action.status, reason: action.resolution }),
      };

    case "RESOLVE_EXCEPTION":
      return {
        ...next,
        exceptions: state.exceptions.map((item) => item.id === action.exceptionId
          ? { ...item, status: action.status, approvedBy: actingOfficer }
          : item),
        audit: log({ entityType: "exception", entityId: action.exceptionId, action: "Exception " + action.status.toLowerCase(), actor: actingOfficer, after: action.status, reason: action.note }),
      };

    case "SET_BORROWER":
      return { ...next, borrowerId: action.customerId };

    /* ---- Borrower portal. Both portals write to the same state, so an action
       on one side is immediately visible on the other. ---- */

    case "SUBMIT_APPLICATION": {
      const customer = state.customers.find((item) => item.id === state.borrowerId);
      if (!customer) return state;
      const id = "APP-" + String(500 + state.applications.length);
      const instalment = Math.round((action.amount * 1.12) / action.term);
      const dscr = dscrOf(customer.monthlyIncome, customer.monthlyObligations, instalment);
      const score = Math.max(35, Math.min(92, Math.round(72 + (dscr - 1.5) * 12)));
      const application: DemoState["applications"][number] = {
        id, customerId: customer.id, product: action.product, requested: action.amount,
        recommended: dscr >= state.policy.dscrFloor ? action.amount : Math.round(action.amount * 0.7),
        term: action.term, purpose: action.purpose, stage: "New", riskScore: score,
        risk: score >= 72 ? "Low" : score >= 55 ? "Medium" : "High",
        kyc: customer.kyc, employmentStatus: "Pending", submittedAt: at,
        assigned: "Marie", approver: "Credit Manager", waiting: "just now", decision: "Pending",
        documents: [
          { id: id + "-D1", name: "National ID", status: "Missing", detail: "Required before assessment" },
          { id: id + "-D2", name: "Recent payslip", status: "Missing", detail: "Most recent month" },
          { id: id + "-D3", name: "Bank statement", status: "Missing", detail: "Last six months" },
        ],
        factors: [], positives: [], concerns: [], redFlags: [],
        bureau: { status: "Pending", receivedAt: "—", openLoans: 0, outstanding: 0, monthlyObligations: customer.monthlyObligations, delinquencies: 0, defaults: 0, facilities: [], repaymentHistory: [] },
        employment: {
          reference: "EV-" + String(300 + state.applications.length), position: "—", startDate: "—", employmentType: "—",
          declared: customer.monthlyIncome, payslip: 0, bankDeposit: 0, hrConfirmed: null,
          hrEmail: "hr@" + customer.employer.toLowerCase().replaceAll(" ", "") + ".rw", hrContact: "HR Office",
          phoneCheck: "Not started", bankComparison: "Not started",
        },
        grade: gradeFor(score), dscr, collateral: [], guarantors: [],
      };
      return {
        ...next,
        applications: [application, ...state.applications],
        audit: log({ entityType: "application", entityId: id, action: "Application submitted", actor: customer.name, after: "New", reason: action.purpose }),
      };
    }

    case "UPLOAD_DOCUMENT": {
      const customer = state.customers.find((item) => item.id === state.borrowerId);
      return {
        ...next,
        applications: state.applications.map((application) => application.id === action.applicationId ? {
          ...application,
          documents: application.documents.some((document) => document.id === action.documentId)
            ? application.documents.map((document) => document.id === action.documentId
              ? { ...document, status: "Uploaded" as const, uploadedAt: at, rejectionReason: undefined, detail: "Awaiting officer review" }
              : document)
            : [...application.documents, { id: action.applicationId + "-U" + clock, name: action.name, status: "Uploaded" as const, uploadedAt: at, detail: "Awaiting officer review" }],
        } : application),
        audit: log({ entityType: "document", entityId: action.documentId ?? action.applicationId, action: "Document uploaded", actor: customer?.name ?? "Customer", after: "Uploaded", reason: action.name }),
      };
    }

    case "ACCEPT_OFFER": {
      const customer = state.customers.find((item) => item.id === state.borrowerId);
      return {
        ...next,
        applications: state.applications.map((application) => application.id === action.applicationId
          ? { ...application, disclosureAcceptedAt: at }
          : application),
        loans: state.loans.map((loan) => loan.applicationId === action.applicationId
          ? { ...loan, disbursementStatus: "Ready" as const }
          : loan),
        audit: log({
          entityType: "application", entityId: action.applicationId, action: "Offer accepted by borrower",
          actor: customer?.name ?? "Customer", after: "Accepted",
          reason: "Key facts statement issued and acknowledged before acceptance",
        }),
      };
    }

    case "MAKE_PAYMENT": {
      const loan = state.loans.find((item) => item.id === action.loanId);
      const customer = state.customers.find((item) => item.id === state.borrowerId);
      if (!loan) return state;
      let remaining = action.amount;
      const schedule = loan.schedule.map((row) => {
        if (row.status === "Paid" || remaining <= 0) return row;
        const owing = row.total - row.paid;
        const applied = Math.min(owing, remaining);
        remaining -= applied;
        const paid = row.paid + applied;
        return { ...row, paid, status: paid >= row.total ? ("Paid" as const) : row.status };
      });
      const stillLate = schedule.some((row) => row.status === "Late");
      const reference = "TX-" + String(90000000 + clock);
      return {
        ...next,
        loans: state.loans.map((item) => item.id === action.loanId ? {
          ...item,
          schedule,
          paidToDate: item.paidToDate + action.amount,
          outstanding: Math.max(0, item.outstanding - action.amount),
          daysPastDue: stillLate ? item.daysPastDue : 0,
          nextDue: schedule.find((row) => row.status !== "Paid")?.due ?? item.nextDue,
          status: item.outstanding - action.amount <= 0 ? ("Paid" as const) : stillLate ? item.status : ("Active" as const),
          transactions: [{ id: reference, type: "Repayment", amount: action.amount, at, reference: "MoMo", direction: "in" as const }, ...item.transactions],
        } : item),
        collections: state.collections.map((entry) => entry.loanId === action.loanId && !stillLate
          ? {
            ...entry, status: "Closed" as const, amountOverdue: 0, daysOverdue: 0, nextAction: "Case settled",
            events: [{ id: "CE-" + clock, type: "Payment received", note: "Borrower paid " + action.amount + " via MoMo", at, actor: customer?.name ?? "Customer" }, ...entry.events],
          }
          : entry),
        audit: log({ entityType: "loan", entityId: action.loanId, action: "Repayment received", actor: customer?.name ?? "Customer", after: String(action.amount), reason: "Paid via MoMo" }),
      };
    }

    case "RAISE_COMPLAINT": {
      const customer = state.customers.find((item) => item.id === state.borrowerId);
      if (!customer) return state;
      const id = "CPL-" + String(100 + state.complaints.length);
      return {
        ...next,
        complaints: [{
          id, customerId: customer.id, customerName: customer.name, channel: action.channel,
          subject: action.subject, detail: action.detail, status: "Received", receivedAt: at, owner: "Diane",
        }, ...state.complaints],
        audit: log({ entityType: "complaint", entityId: id, action: "Complaint received", actor: customer.name, after: "Received", reason: action.subject }),
      };
    }

    case "SET_POLICY":
      return {
        ...next,
        policy: { ...state.policy, ...action.patch },
        audit: log({
          entityType: "policy", entityId: "CREDIT-POLICY", action: "Policy parameter changed", actor: actingOfficer,
          after: Object.entries(action.patch).map(([key, value]) => key + " = " + String(value)).join(", "),
          reason: "Board-approved parameter change",
        }),
      };
  }
}

function loadInitial(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoState;
      if (parsed.version === APP_VERSION) return parsed;
    }
  } catch {
    /* fall through to a clean seed */
  }
  return createSeedState();
}

const StoreContext = createContext<{ state: DemoState; dispatch: React.Dispatch<Action> } | null>(null);

export function DemoStore({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDemo() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useDemo must be used within DemoStore");
  return context;
}

export { reducer, stampFor };
