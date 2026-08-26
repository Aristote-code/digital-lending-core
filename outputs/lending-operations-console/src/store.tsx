import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { APP_VERSION, createSeedState } from "./data";
import { buildSchedule, installmentOf, monthLabel } from "./lib/schedule";
import type { AuditEvent, DemoState, DocumentStatus, EmploymentVerificationStatus, RiskBand, StaffRole } from "./types";

const STORAGE_KEY = "lending-console-demo-v2";

export type Action =
  | { type: "SET_ROLE"; role: StaffRole }
  | { type: "DOCUMENT_STATUS"; applicationId: string; documentId: string; status: DocumentStatus; reason?: string }
  | { type: "REQUEST_DOCUMENTS"; applicationId: string; items: string[]; message: string }
  | { type: "EMPLOYMENT_STATUS"; applicationId: string; status: EmploymentVerificationStatus; actor?: string }
  | { type: "DECIDE"; applicationId: string; decision: "Approved" | "Approved with conditions" | "Rejected" | "Manual review"; reason: string }
  | { type: "DISBURSE"; loanId: string }
  | { type: "RECORD_CONTACT"; caseId: string; outcome: string; note: string }
  | { type: "PROMISE_TO_PAY"; caseId: string; date: string; amount: number; note: string }
  | { type: "RESTRUCTURE"; caseId: string; term: number; reason: string }
  | { type: "ESCALATE"; caseId: string; reason: string }
  | { type: "RESOLVE_COMPLIANCE"; caseId: string; status: "Cleared" | "Escalated"; note: string }
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
  const log = (event: Omit<AuditEvent, "id" | "at">): AuditEvent[] => [{ ...event, id: "AUD-" + (state.audit.length + 1), at }, ...state.audit];
  const next = { ...state, clock };

  switch (action.type) {
    case "DOCUMENT_STATUS": {
      const application = state.applications.find((item) => item.id === action.applicationId);
      const document = application?.documents.find((item) => item.id === action.documentId);
      return {
        ...next,
        applications: state.applications.map((item) => item.id === action.applicationId
          ? { ...item, documents: item.documents.map((doc) => doc.id === action.documentId ? { ...doc, status: action.status, rejectionReason: action.reason } : doc) }
          : item),
        audit: log({
          entityType: "document", entityId: action.documentId,
          action: action.status === "Verified" ? "Document verified" : "Document " + action.status.toLowerCase(),
          actor: "Marie", before: document?.status, after: action.status, reason: action.reason,
        }),
      };
    }

    case "REQUEST_DOCUMENTS":
      return {
        ...next,
        applications: state.applications.map((item) => item.id === action.applicationId ? { ...item, requestedInfo: action.items } : item),
        audit: log({ entityType: "application", entityId: action.applicationId, action: "Information requested", actor: "Marie", after: action.items.join(", "), reason: action.message }),
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
          actor: action.actor ?? "Marie", before: application.employmentStatus, after: action.status,
          reason: verified ? "Confirmed by employer HR" : undefined,
        }),
      };
    }

    case "DECIDE": {
      const application = state.applications.find((item) => item.id === action.applicationId);
      const approved = action.decision === "Approved" || action.decision === "Approved with conditions";
      return {
        ...next,
        applications: state.applications.map((item) => item.id === action.applicationId ? {
          ...item, decision: action.decision, decisionReason: action.reason,
          stage: approved ? "Approved" : action.decision === "Rejected" ? "Rejected" : "Approval",
        } : item),
        loans: state.loans.map((loan) => loan.applicationId === action.applicationId && approved
          ? { ...loan, disbursementStatus: "Ready" }
          : loan),
        audit: log({
          entityType: "application", entityId: action.applicationId, action: "Application " + action.decision.toLowerCase(),
          actor: "Marie", before: application?.decision, after: action.decision, reason: action.reason,
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
          events: [{ id: "CE-" + clock, type: action.outcome, note: action.note, at, actor: "Claudine" }, ...item.events],
        } : item),
        audit: log({ entityType: "collection", entityId: action.caseId, action: "Contact recorded", actor: "Claudine", after: action.outcome, reason: action.note }),
      };

    case "PROMISE_TO_PAY":
      return {
        ...next,
        collections: state.collections.map((item) => item.id === action.caseId ? {
          ...item, status: "Promise to pay", promiseDate: action.date, promiseAmount: action.amount,
          lastContact: "27 Aug 2026", nextAction: "Monitor promise due " + action.date,
          events: [{ id: "CE-" + clock, type: "Promise to pay", note: action.note, at, actor: "Claudine" }, ...item.events],
        } : item),
        audit: log({ entityType: "collection", entityId: action.caseId, action: "Promise to pay recorded", actor: "Claudine", after: action.date, reason: String(action.amount) }),
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
          events: [{ id: "CE-" + clock, type: "Restructured", note: "Rescheduled over " + action.term + " months · " + action.reason, at, actor: "Claudine" }, ...entry.events],
        } : entry),
        audit: log({ entityType: "loan", entityId: loan.id, action: "Loan restructured", actor: "Claudine", before: loan.term + " months", after: action.term + " months", reason: action.reason }),
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
          events: [{ id: "CE-" + clock, type: "Escalated", note: action.reason, at, actor: "Claudine" }, ...entry.events],
        } : entry),
        complianceCases: [{ id, customerId: customer.id, customerName: customer.name, type: "Collections escalation", severity: "High", status: "Open", owner: "Claudine", openedAt: at, note: action.reason }, ...state.complianceCases],
        audit: log({ entityType: "compliance", entityId: id, action: "Compliance case opened", actor: "Claudine", after: "Open", reason: action.reason }),
      };
    }

    case "RESOLVE_COMPLIANCE":
      return {
        ...next,
        complianceCases: state.complianceCases.map((item) => item.id === action.caseId ? { ...item, status: action.status } : item),
        audit: log({ entityType: "compliance", entityId: action.caseId, action: "Compliance case " + action.status.toLowerCase(), actor: "Claudine", after: action.status, reason: action.note }),
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
