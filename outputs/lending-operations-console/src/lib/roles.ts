import { AlertOctagon, FileText, HandCoins, Home, Landmark, LayoutDashboard, MessageSquareWarning, Scale, ShieldCheck, SlidersHorizontal, Users, WalletCards } from "lucide-react";
import type { DemoState, StaffRole } from "../types";

export const roles: StaffRole[] = ["Loan Officer", "Credit Officer", "Credit Manager", "Finance", "Collections", "Compliance", "CEO"];

export type NavId = "home" | "applications" | "customers" | "loans" | "approvals" | "collections" | "finance" | "compliance" | "executive" | "exceptions" | "complaints" | "policy";

export const nav = [
  { id: "home", path: "/home", label: "Home", icon: Home },
  { id: "applications", path: "/applications", label: "Applications", icon: FileText },
  { id: "customers", path: "/customers/CUS-00321", label: "Customers", icon: Users },
  { id: "loans", path: "/loans", label: "Loans", icon: WalletCards },
  { id: "approvals", path: "/approvals", label: "Approvals", icon: ShieldCheck },
  { id: "collections", path: "/collections", label: "Collections", icon: HandCoins },
  { id: "finance", path: "/finance/disbursements", label: "Finance", icon: Landmark },
  { id: "compliance", path: "/compliance", label: "Compliance", icon: Scale },
  { id: "executive", path: "/executive", label: "Executive", icon: LayoutDashboard },
  { id: "exceptions", path: "/exceptions", label: "Exceptions", icon: AlertOctagon },
  { id: "complaints", path: "/complaints", label: "Complaints", icon: MessageSquareWarning },
  { id: "policy", path: "/policy", label: "Credit policy", icon: SlidersHorizontal },
] as const satisfies ReadonlyArray<{ id: NavId; path: string; label: string; icon: unknown }>;

const access: Record<StaffRole, NavId[]> = {
  "Loan Officer": ["home", "applications", "customers", "loans"],
  "Credit Officer": ["home", "applications", "customers", "loans", "approvals", "exceptions"],
  "Credit Manager": ["home", "applications", "customers", "loans", "approvals", "exceptions", "executive", "policy"],
  Finance: ["home", "loans", "finance", "executive"],
  Collections: ["home", "customers", "loans", "collections"],
  Compliance: ["home", "customers", "applications", "compliance", "exceptions", "complaints"],
  CEO: ["home", "applications", "customers", "loans", "approvals", "collections", "finance", "compliance", "exceptions", "complaints", "executive", "policy"],
};

/* ------------------------------------------------------------------ *
 * Separation of duties — Credit Policy s4.6, s38, s46
 *
 *   Origination != Appraisal != Approval != Disbursement != Recovery
 *
 * Navigation alone is not a control: hiding a menu item does not stop the
 * action. Every consequential action is gated here and the interface shows
 * the control disabled with its reason, so the separation is legible rather
 * than merely absent.
 * ------------------------------------------------------------------ */

export type Action =
  | "originate" | "verifyDocument" | "verifyEmployment" | "requestInfo"
  | "approve" | "disburse" | "recordContact" | "restructure" | "writeOff"
  | "escalate" | "clearCompliance" | "handleComplaint" | "setPolicy" | "approveException";

const permissions: Record<StaffRole, Action[]> = {
  "Loan Officer": ["originate", "verifyDocument", "verifyEmployment", "requestInfo"],
  "Credit Officer": ["verifyDocument", "verifyEmployment", "requestInfo", "approve", "escalate"],
  "Credit Manager": ["approve", "escalate", "approveException", "writeOff"],
  Finance: ["disburse"],
  Collections: ["recordContact", "restructure", "escalate"],
  Compliance: ["clearCompliance", "escalate", "handleComplaint", "approveException"],
  // The CEO sits on the Board Credit Committee but does not originate or release funds.
  CEO: ["approve", "escalate", "approveException", "writeOff", "setPolicy", "clearCompliance"],
};

/** The officer acting in each role, so a file's originator can be recognised. */
export const officers: Record<StaffRole, string> = {
  "Loan Officer": "Marie",
  "Credit Officer": "Eric",
  "Credit Manager": "Claudine",
  Finance: "Jean-Paul",
  Collections: "Claude",
  Compliance: "Diane",
  CEO: "Patrick",
};

export function can(role: StaffRole, action: Action) {
  return permissions[role].includes(action);
}

const ACTION_LABEL: Record<Action, string> = {
  originate: "originate applications",
  verifyDocument: "verify documents",
  verifyEmployment: "confirm employment",
  requestInfo: "request information",
  approve: "approve credit",
  disburse: "release disbursements",
  recordContact: "record collections contact",
  restructure: "restructure facilities",
  writeOff: "write off facilities",
  escalate: "escalate cases",
  clearCompliance: "clear compliance cases",
  handleComplaint: "handle complaints",
  setPolicy: "change policy parameters",
  approveException: "approve policy exceptions",
};

/** The reason a role cannot act, phrased for the person reading it. */
export function denialReason(role: StaffRole, action: Action) {
  const holders = roles.filter((candidate) => can(candidate, action));
  return role + " cannot " + ACTION_LABEL[action] + ". This is separated from their duties and sits with " + holders.join(" or ") + ".";
}

export function navFor(role: StaffRole) {
  return nav.filter((item) => access[role].includes(item.id));
}

export function homeFor(role: StaffRole) {
  return role === "CEO" ? "/executive" : "/home";
}

/** Live queue counts shown as sidebar badges, derived from state rather than hardcoded. */
export function queueCount(id: NavId, state: DemoState) {
  if (id === "applications") return state.applications.filter((a) => !["Approved", "Rejected", "Disbursed"].includes(a.stage)).length;
  if (id === "approvals") return state.applications.filter((a) => a.stage === "Approval" || (a.stage === "Credit Review" && a.decision === "Pending")).length;
  if (id === "collections") return state.collections.filter((c) => c.status !== "Closed").length;
  if (id === "finance") return state.loans.filter((l) => l.disbursementStatus === "Ready").length;
  return 0;
}
