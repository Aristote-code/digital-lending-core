import type {
  Application, AssetClass, AuthorityLevel, Collateral, CreditGrade, Customer,
  DemoState, Loan, PolicyParameters, StaffRole,
} from "../types";

/**
 * The credit policy expressed as code.
 *
 * The source policy marks its own thresholds as illustrative and requires them
 * to be calibrated against the institution's capital base and licence category,
 * so every limit here reads from PolicyParameters rather than being written into
 * a screen. Changing a parameter changes the whole console.
 */

export const DEFAULT_POLICY: PolicyParameters = {
  institution: "Prototype NDFI Ltd",
  licenceCategory: "Category II",
  // Mid-transition to the August 2026 minimum, which BNR raised to RWF 200M.
  coreCapital: 120_000_000,
  minimumCapital: 200_000_000,
  authorityTiers: [
    { level: "Credit Officer", maxPctOfCapital: 2 },
    { level: "Credit Manager", maxPctOfCapital: 10 },
    { level: "Board Credit Committee", maxPctOfCapital: 25 },
    { level: "Full Board", maxPctOfCapital: null },
  ],
  ltvCaps: [
    { type: "Real estate", max: 70 },
    { type: "Motor vehicle", max: 60 },
    { type: "Machinery", max: 50 },
    { type: "Unsecured", max: 0 },
  ],
  dscrFloor: 1.2,
  provisionRates: [
    { class: "Normal", rate: 0.01, from: 0, to: 29 },
    { class: "Watch", rate: 0.03, from: 30, to: 89 },
    { class: "Substandard", rate: 0.2, from: 90, to: 179 },
    { class: "Doubtful", rate: 0.5, from: 180, to: 364 },
    { class: "Loss", rate: 1, from: 365, to: null },
  ],
  maxRestructures: 2,
  restructureSeasoningMonths: 3,
  singleBorrowerLimitPct: 25,
  relatedPartyLimitPct: 5,
  sectorLimitPct: 30,
};

/* ------------------------------------------------------------------ *
 * Asset classification and provisioning — BNR Regulation 12/2017
 * ------------------------------------------------------------------ */

export function classify(daysPastDue: number, policy: PolicyParameters): AssetClass {
  const band = policy.provisionRates.find((row) => daysPastDue >= row.from && (row.to === null || daysPastDue <= row.to));
  return band?.class ?? "Normal";
}

export function provisionRate(assetClass: AssetClass, policy: PolicyParameters) {
  return policy.provisionRates.find((row) => row.class === assetClass)?.rate ?? 0;
}

/** Substandard, Doubtful and Loss constitute non-performing exposures. */
export function isNpl(assetClass: AssetClass) {
  return assetClass === "Substandard" || assetClass === "Doubtful" || assetClass === "Loss";
}

export function classOf(loan: Loan, policy: PolicyParameters): AssetClass {
  return classify(loan.daysPastDue, policy);
}

export function provisionFor(loan: Loan, policy: PolicyParameters) {
  return Math.round(loan.outstanding * provisionRate(classOf(loan, policy), policy));
}

export function classTone(assetClass: AssetClass) {
  if (assetClass === "Normal") return "success";
  if (assetClass === "Watch") return "warning";
  return "danger";
}

/* ------------------------------------------------------------------ *
 * Delegated approval authority — Credit Policy s15/s16
 * ------------------------------------------------------------------ */

export function tierLimit(level: AuthorityLevel, policy: PolicyParameters) {
  const tier = policy.authorityTiers.find((row) => row.level === level);
  if (!tier || tier.maxPctOfCapital === null) return Infinity;
  return Math.round((policy.coreCapital * tier.maxPctOfCapital) / 100);
}

/** The lowest authority that may approve this exposure. */
export function authorityFor(amount: number, policy: PolicyParameters): AuthorityLevel {
  for (const tier of policy.authorityTiers) {
    if (amount <= tierLimit(tier.level, policy)) return tier.level;
  }
  return "Full Board";
}

const ROLE_AUTHORITY: Partial<Record<StaffRole, AuthorityLevel>> = {
  "Credit Officer": "Credit Officer",
  "Credit Manager": "Credit Manager",
  CEO: "Board Credit Committee",
};

const RANK: AuthorityLevel[] = ["Credit Officer", "Credit Manager", "Board Credit Committee", "Full Board"];

export function authorityOf(role: StaffRole): AuthorityLevel | null {
  return ROLE_AUTHORITY[role] ?? null;
}

export function holdsAuthority(role: StaffRole, required: AuthorityLevel) {
  const held = authorityOf(role);
  if (!held) return false;
  return RANK.indexOf(held) >= RANK.indexOf(required);
}

/* ------------------------------------------------------------------ *
 * Approval gate — the composition of every control the policy requires
 * ------------------------------------------------------------------ */

export interface Gate {
  allowed: boolean;
  reason?: string;
  requiredAuthority: AuthorityLevel;
}

/**
 * s4.6/s46 separation of duties, s16 delegated authority, s18/s35 conflict of
 * interest. Returns the first blocking reason so the interface can explain
 * itself rather than presenting an unexplained disabled control.
 */
export function approvalGate(application: Application, customer: Customer, role: StaffRole, officer: string, policy: PolicyParameters): Gate {
  const relatedParty = customer.relatedParty !== "None";
  const requiredAuthority: AuthorityLevel = relatedParty ? "Full Board" : authorityFor(application.requested, policy);

  if (!authorityOf(role)) {
    return { allowed: false, requiredAuthority, reason: role + " holds no credit approval authority. Approval is separated from origination, disbursement and recovery." };
  }
  if (application.assigned === officer) {
    return { allowed: false, requiredAuthority, reason: "You originated this application. No officer may approve a file they originated." };
  }
  if (relatedParty) {
    return { allowed: false, requiredAuthority, reason: customer.name + " is a related party (" + customer.relatedParty.toLowerCase() + "). Related-party facilities require Full Board approval and are monitored separately." };
  }
  if (!holdsAuthority(role, requiredAuthority)) {
    return { allowed: false, requiredAuthority, reason: "This exposure requires " + requiredAuthority + " approval. Your limit is " + shortRwf(tierLimit(authorityOf(role)!, policy)) + "." };
  }
  return { allowed: true, requiredAuthority };
}

function shortRwf(value: number) {
  if (!isFinite(value)) return "unlimited";
  if (value >= 1_000_000) return "RWF " + (value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0) + "M";
  return "RWF " + Math.round(value / 1000) + "K";
}

/* ------------------------------------------------------------------ *
 * Assessment — s11 cash flow, s14 loan-to-value, s32 internal rating
 * ------------------------------------------------------------------ */

/** DSCR = cash available for debt service / total debt service. */
export function dscrOf(monthlyIncome: number, monthlyObligations: number, proposedInstalment: number) {
  const service = monthlyObligations + proposedInstalment;
  if (service <= 0) return Infinity;
  return Number((monthlyIncome / service).toFixed(2));
}

export function ltvOf(amount: number, collateral: Collateral[]) {
  const security = collateral.reduce((sum, item) => sum + item.forcedSaleValue, 0);
  if (security <= 0) return null;
  return Math.round((amount / security) * 100);
}

export function ltvCapFor(collateral: Collateral[], policy: PolicyParameters) {
  if (!collateral.length) return null;
  // The most conservative cap across the pledged security governs.
  return Math.min(...collateral.map((item) => policy.ltvCaps.find((cap) => cap.type === item.type)?.max ?? 0));
}

export function gradeFor(score: number): CreditGrade {
  if (score >= 85) return "A";
  if (score >= 72) return "B";
  if (score >= 60) return "C";
  if (score >= 48) return "D";
  if (score >= 35) return "E";
  return "F";
}

export const GRADE_LABEL: Record<CreditGrade, string> = {
  A: "Very low · strong repayment capacity",
  B: "Low · good repayment capacity",
  C: "Moderate · acceptable risk",
  D: "High · weak financial position",
  E: "Very high · serious repayment concerns",
  F: "Default · non-performing",
};

export function gradeTone(grade: CreditGrade) {
  if (grade === "A" || grade === "B") return "success";
  if (grade === "C") return "warning";
  return "danger";
}

/** Every policy breach on a file, for the exception register. */
export function breaches(application: Application, policy: PolicyParameters) {
  const found: string[] = [];
  if (application.dscr < policy.dscrFloor) found.push("DSCR " + application.dscr.toFixed(2) + "x is below the " + policy.dscrFloor.toFixed(2) + "x floor");
  const cap = ltvCapFor(application.collateral, policy);
  const ltv = ltvOf(application.requested, application.collateral);
  if (cap !== null && ltv !== null && ltv > cap) found.push("LTV " + ltv + "% exceeds the " + cap + "% cap for the pledged security");
  if (!application.collateral.length && application.product !== "Salary Loan") found.push("No security pledged against a secured product");
  if (application.collateral.some((item) => !item.registered)) found.push("Security is not yet registered or perfected");
  return found;
}

/* ------------------------------------------------------------------ *
 * Restructuring controls — s27
 * ------------------------------------------------------------------ */

export function restructureGate(loan: Loan, policy: PolicyParameters): Gate {
  const requiredAuthority = authorityFor(loan.outstanding, policy);
  if (loan.restructureCount >= policy.maxRestructures) {
    return { allowed: false, requiredAuthority, reason: "This facility has been restructured " + loan.restructureCount + " times. Policy permits no more than " + policy.maxRestructures + " over the life of a loan." };
  }
  return { allowed: true, requiredAuthority };
}

/** A restructured facility may only be upgraded after a seasoning period. */
export function canUpgrade(loan: Loan, policy: PolicyParameters) {
  if (!loan.lastRestructuredAt) return true;
  return (loan.monthsSinceRestructure ?? 0) >= policy.restructureSeasoningMonths;
}

/* ------------------------------------------------------------------ *
 * Portfolio indicators — s41
 * ------------------------------------------------------------------ */

export interface Kris {
  gross: number;
  outstanding: number;
  par30: number;
  nplRatio: number;
  npl: number;
  provisions: number;
  provisionCoverage: number;
  collectionRate: number;
  writeOffRatio: number;
  recoveryRate: number;
  restructured: number;
}

export function kris(state: DemoState): Kris {
  const policy = state.policy;
  const live = state.loans.filter((loan) => !loan.writtenOffAt);
  const outstanding = live.reduce((sum, loan) => sum + loan.outstanding, 0);
  const gross = state.loans.reduce((sum, loan) => sum + loan.principal, 0);

  const overdue30 = live.filter((loan) => loan.daysPastDue >= 30).reduce((sum, loan) => sum + loan.outstanding, 0);
  const npl = live.filter((loan) => isNpl(classOf(loan, policy))).reduce((sum, loan) => sum + loan.outstanding, 0);
  const provisions = live.reduce((sum, loan) => sum + provisionFor(loan, policy), 0);

  const due = live.reduce((sum, loan) => sum + loan.paidToDate + loan.outstanding * 0, 0);
  const collected = live.reduce((sum, loan) => sum + loan.paidToDate, 0);
  const writtenOff = state.loans.filter((loan) => loan.writtenOffAt).reduce((sum, loan) => sum + loan.principal, 0);
  const recovered = state.loans.reduce((sum, loan) => sum + loan.recovered, 0);

  const safe = (value: number) => (isFinite(value) ? value : 0);

  return {
    gross,
    outstanding,
    par30: safe((overdue30 / Math.max(outstanding, 1)) * 100),
    npl,
    nplRatio: safe((npl / Math.max(outstanding, 1)) * 100),
    provisions,
    provisionCoverage: safe((provisions / Math.max(npl, 1)) * 100),
    collectionRate: safe((collected / Math.max(due + overdue30, 1)) * 100),
    writeOffRatio: safe((writtenOff / Math.max(gross, 1)) * 100),
    recoveryRate: safe((recovered / Math.max(writtenOff, 1)) * 100),
    restructured: live.filter((loan) => loan.restructureCount > 0).length,
  };
}

/* ------------------------------------------------------------------ *
 * Concentration — s33
 * ------------------------------------------------------------------ */

export interface Concentration {
  label: string;
  exposure: number;
  pct: number;
  limitPct: number;
  breached: boolean;
}

export function concentrations(state: DemoState): { borrowers: Concentration[]; sectors: Concentration[]; relatedParty: Concentration } {
  const policy = state.policy;
  const live = state.loans.filter((loan) => !loan.writtenOffAt);
  const capital = policy.coreCapital;

  const byCustomer = new Map<string, number>();
  const bySector = new Map<string, number>();
  live.forEach((loan) => {
    byCustomer.set(loan.customerId, (byCustomer.get(loan.customerId) ?? 0) + loan.outstanding);
    bySector.set(loan.sector, (bySector.get(loan.sector) ?? 0) + loan.outstanding);
  });

  const total = live.reduce((sum, loan) => sum + loan.outstanding, 0);
  const named = (id: string) => state.customers.find((customer) => customer.id === id)?.name ?? id;

  const borrowers = [...byCustomer.entries()]
    .map(([id, exposure]) => ({
      label: named(id),
      exposure,
      pct: (exposure / Math.max(capital, 1)) * 100,
      limitPct: policy.singleBorrowerLimitPct,
      breached: (exposure / Math.max(capital, 1)) * 100 > policy.singleBorrowerLimitPct,
    }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 5);

  const sectors = [...bySector.entries()]
    .map(([label, exposure]) => ({
      label,
      exposure,
      pct: (exposure / Math.max(total, 1)) * 100,
      limitPct: policy.sectorLimitPct,
      breached: (exposure / Math.max(total, 1)) * 100 > policy.sectorLimitPct,
    }))
    .sort((a, b) => b.exposure - a.exposure);

  const relatedIds = new Set(state.customers.filter((customer) => customer.relatedParty !== "None").map((customer) => customer.id));
  const relatedExposure = live.filter((loan) => relatedIds.has(loan.customerId)).reduce((sum, loan) => sum + loan.outstanding, 0);

  return {
    borrowers,
    sectors,
    relatedParty: {
      label: "Related parties",
      exposure: relatedExposure,
      pct: (relatedExposure / Math.max(capital, 1)) * 100,
      limitPct: policy.relatedPartyLimitPct,
      breached: (relatedExposure / Math.max(capital, 1)) * 100 > policy.relatedPartyLimitPct,
    },
  };
}
