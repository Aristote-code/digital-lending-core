import { FileText, HandCoins, Home, Landmark, LayoutDashboard, Scale, ShieldCheck, Users, WalletCards } from "lucide-react";
import type { DemoState, StaffRole } from "../types";

export const roles: StaffRole[] = ["Loan Officer", "Credit Officer", "Credit Manager", "Finance", "Collections", "Compliance", "CEO"];

export type NavId = "home" | "applications" | "customers" | "loans" | "approvals" | "collections" | "finance" | "compliance" | "executive";

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
] as const satisfies ReadonlyArray<{ id: NavId; path: string; label: string; icon: unknown }>;

const access: Record<StaffRole, NavId[]> = {
  "Loan Officer": ["home", "applications", "customers", "loans"],
  "Credit Officer": ["home", "applications", "customers", "loans", "approvals"],
  "Credit Manager": ["home", "applications", "customers", "loans", "approvals", "executive"],
  Finance: ["home", "loans", "finance", "executive"],
  Collections: ["home", "customers", "loans", "collections"],
  Compliance: ["home", "customers", "applications", "compliance"],
  CEO: ["home", "applications", "customers", "loans", "approvals", "collections", "finance", "compliance", "executive"],
};

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
