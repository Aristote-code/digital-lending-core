import { describe, expect, it } from "vitest";
import { createSeedState } from "./data";
import { reducer, type Action } from "./store";
import { buildSchedule, monthLabel } from "./lib/schedule";
import { navFor, queueCount, roles } from "./lib/roles";
import type { DemoState } from "./types";

function run(state: DemoState, ...actions: Action[]) {
  return actions.reduce(reducer, state);
}

const seed = () => createSeedState();
const app = (state: DemoState, id: string) => state.applications.find((item) => item.id === id)!;
const loan = (state: DemoState, id: string) => state.loans.find((item) => item.id === id)!;

describe("audit trail", () => {
  it("advances the clock so events are distinguishable", () => {
    const after = run(seed(), { type: "SET_ROLE", role: "Finance" }, { type: "EMPLOYMENT_STATUS", applicationId: "APP-00412", status: "Verified" }, { type: "DECIDE", applicationId: "APP-00412", decision: "Approved", reason: "ok" });
    const stamps = after.audit.slice(0, 2).map((event) => event.at);
    expect(stamps[0]).not.toEqual(stamps[1]);
  });

  it("records actor, entity, before/after and reason for a decision", () => {
    const after = run(seed(), { type: "DECIDE", applicationId: "APP-00412", decision: "Rejected", reason: "Policy breach" });
    const event = after.audit[0];
    expect(event).toMatchObject({ entityType: "application", entityId: "APP-00412", actor: "Marie", before: "Pending", after: "Rejected", reason: "Policy breach" });
  });
});

describe("John — application through disbursement", () => {
  it("starts awaiting employer verification at score 70", () => {
    const state = seed();
    expect(app(state, "APP-00412")).toMatchObject({ employmentStatus: "Pending", riskScore: 70, risk: "Medium" });
    expect(app(state, "APP-00412").employment.hrConfirmed).toBeNull();
  });

  it("moves to 74 and confirms salary once HR verifies", () => {
    const after = run(seed(), { type: "EMPLOYMENT_STATUS", applicationId: "APP-00412", status: "Verified", actor: "External HR" });
    const application = app(after, "APP-00412");
    expect(application.riskScore).toBe(74);
    expect(application.risk).toBe("Medium");
    expect(application.employment.hrConfirmed).toBe(1_200_000);
    expect(application.factors.find((factor) => factor.key === "employer")?.score).toBe(4);
  });

  it("marks the linked loan ready once approved, and leaves other applications alone", () => {
    const after = run(seed(), { type: "EMPLOYMENT_STATUS", applicationId: "APP-00412", status: "Verified" }, { type: "DECIDE", applicationId: "APP-00412", decision: "Approved", reason: "Checks passed" });
    expect(app(after, "APP-00412").stage).toBe("Approved");
    expect(loan(after, "LN-00045").disbursementStatus).toBe("Ready");
    expect(app(after, "APP-00413").stage).toBe("Credit Review");
  });

  it("generates a schedule and a ledger entry on disbursement", () => {
    const after = run(seed(), { type: "DISBURSE", loanId: "LN-00045" });
    const disbursed = loan(after, "LN-00045");
    expect(disbursed.status).toBe("Active");
    expect(disbursed.schedule).toHaveLength(12);
    expect(disbursed.transactions[0]).toMatchObject({ type: "Disbursement", amount: 2_500_000, direction: "out" });
    expect(disbursed.outstanding).toBe(2_800_000);
    expect(app(after, "APP-00412").stage).toBe("Disbursed");
  });

  it("only disburses the application linked to that loan", () => {
    const state = seed();
    // Both applications belong to different customers; LN-00045 links to APP-00412 alone.
    const after = run(state, { type: "DISBURSE", loanId: "LN-00038" });
    expect(app(after, "APP-00412").stage).toBe("Credit Review");
  });
});

describe("Jane — high-risk rejection", () => {
  it("seeds a failing profile with three red flags", () => {
    const application = app(seed(), "APP-00413");
    expect(application).toMatchObject({ riskScore: 49, risk: "High", employmentStatus: "Failed", recommended: 0 });
    expect(application.redFlags).toHaveLength(3);
    expect(application.bureau.delinquencies).toBe(2);
  });

  it("records a reasoned rejection without creating a loan", () => {
    const after = run(seed(), { type: "DECIDE", applicationId: "APP-00413", decision: "Rejected", reason: "Debt-to-income exceeds policy" });
    expect(app(after, "APP-00413")).toMatchObject({ stage: "Rejected", decision: "Rejected", decisionReason: "Debt-to-income exceeds policy" });
    expect(after.loans.some((item) => item.applicationId === "APP-00413")).toBe(false);
  });
});

describe("Alice — collections", () => {
  it("records contact and updates the next action", () => {
    const after = run(seed(), { type: "RECORD_CONTACT", caseId: "COL-00038", outcome: "Reached customer", note: "Will pay Friday" });
    const item = after.collections[0];
    expect(item.lastContact).toBe("27 Aug 2026");
    expect(item.events[0]).toMatchObject({ type: "Reached customer", note: "Will pay Friday" });
  });

  it("records a promise to pay", () => {
    const after = run(seed(), { type: "PROMISE_TO_PAY", caseId: "COL-00038", date: "31 Aug 2026", amount: 380_000, note: "MoMo" });
    expect(after.collections[0]).toMatchObject({ status: "Promise to pay", promiseDate: "31 Aug 2026", promiseAmount: 380_000 });
  });

  it("preserves the original terms when restructuring", () => {
    const before = loan(seed(), "LN-00038");
    const after = run(seed(), { type: "RESTRUCTURE", caseId: "COL-00038", term: 18, reason: "Income reduced" });
    const restructured = loan(after, "LN-00038");
    expect(restructured.status).toBe("Restructured");
    expect(restructured.term).toBe(18);
    expect(restructured.schedule).toHaveLength(18);
    expect(restructured.restructuredFrom).toMatchObject({ term: before.term, installment: before.nextPayment });
  });

  it("keeps event and audit ids unique so React keys never collide", () => {
    const after = run(
      seed(),
      { type: "RECORD_CONTACT", caseId: "COL-00038", outcome: "No answer", note: "a" },
      { type: "PROMISE_TO_PAY", caseId: "COL-00038", date: "31 Aug 2026", amount: 1, note: "b" },
      { type: "RECORD_CONTACT", caseId: "COL-00038", outcome: "Reached customer", note: "c" },
    );
    const eventIds = after.collections[0].events.map((event) => event.id);
    const auditIds = after.audit.map((event) => event.id);
    expect(new Set(eventIds).size).toBe(eventIds.length);
    expect(new Set(auditIds).size).toBe(auditIds.length);
  });

  it("opens a compliance case when escalated", () => {
    const after = run(seed(), { type: "ESCALATE", caseId: "COL-00038", reason: "Unreachable" });
    expect(after.collections[0].status).toBe("Escalated");
    expect(after.complianceCases[0]).toMatchObject({ customerName: "Alice Mukamana", status: "Open", severity: "High" });
  });
});

describe("executive metrics react to operations", () => {
  it("counts John's loan as deployed capital only after disbursement", () => {
    const deployed = (state: DemoState) => state.loans.filter((item) => item.disbursementStatus === "Completed").reduce((sum, item) => sum + item.principal, 0);
    const before = seed();
    const after = run(before, { type: "DISBURSE", loanId: "LN-00045" });
    expect(deployed(after) - deployed(before)).toBe(2_500_000);
  });
});

describe("reset", () => {
  it("restores the original dataset", () => {
    const after = run(seed(), { type: "DECIDE", applicationId: "APP-00412", decision: "Rejected", reason: "x" }, { type: "RESET" });
    expect(app(after, "APP-00412").decision).toBe("Pending");
    expect(after.clock).toBe(0);
  });
});

describe("role-aware navigation", () => {
  it("gives every role a home and never an empty sidebar", () => {
    for (const role of roles) {
      const items = navFor(role);
      expect(items.length).toBeGreaterThan(1);
      expect(items.map((item) => item.id)).toContain("home");
    }
  });

  it("scopes each role to its own surfaces", () => {
    const ids = (role: (typeof roles)[number]) => navFor(role).map((item) => item.id);
    expect(ids("Loan Officer")).not.toContain("finance");
    expect(ids("Loan Officer")).not.toContain("compliance");
    expect(ids("Loan Officer")).not.toContain("executive");
    expect(ids("Finance")).toContain("finance");
    expect(ids("Finance")).not.toContain("applications");
    expect(ids("Collections")).toContain("collections");
    expect(ids("Compliance")).toContain("compliance");
    expect(ids("Credit Manager")).toContain("approvals");
    expect(ids("CEO")).toHaveLength(9);
  });

  it("derives queue badges from live state", () => {
    const before = seed();
    expect(queueCount("finance", before)).toBe(1);
    const after = run(before, { type: "DISBURSE", loanId: "LN-00045" });
    expect(queueCount("finance", after)).toBe(0);
  });
});

describe("amortization", () => {
  it("sums back to principal plus interest exactly", () => {
    const schedule = buildSchedule(2_500_000, 300_000, 12);
    const principal = schedule.reduce((sum, row) => sum + row.principal, 0);
    const interest = schedule.reduce((sum, row) => sum + row.interest, 0);
    expect(principal).toBe(2_500_000);
    expect(interest).toBe(300_000);
  });

  it("never produces an impossible calendar date", () => {
    expect(monthLabel(5)).toBe("28 Feb 2027");
    expect(monthLabel(0)).toBe("30 Sep 2026");
    expect(monthLabel(4)).toBe("30 Jan 2027");
    expect(monthLabel(17, 31)).toBe("29 Feb 2028"); // 2028 is a leap year
    expect(buildSchedule(1_000_000, 0, 12).every((row) => !row.due.startsWith("31 Feb"))).toBe(true);
  });
});
