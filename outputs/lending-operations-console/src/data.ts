import { buildSchedule, installmentOf, monthLabel } from "./lib/schedule";
import type { Application, ApplicationDocument, Customer, DemoState, KycDetail, Loan, LoanStatus, RiskBand } from "./types";

/** Bump when the shape of DemoState changes so stale localStorage is discarded. */
export const APP_VERSION = 5;

export const DEMO_TODAY = "27 Aug 2026";

function kyc(overrides: Partial<KycDetail> = {}): KycDetail {
  return {
    dob: "12 Jan 1992",
    nationality: "Rwandan",
    address: "Kacyiru, Gasabo, Kigali",
    idStatus: "Verified",
    selfieMatch: "Matched",
    liveness: "Passed",
    addressStatus: "Verified",
    duplicateIdentity: "None found",
    suspiciousAccount: "None found",
    ...overrides,
  };
}

const names = ["Eric Nshimiyimana", "Diane Uwera", "Patrick Habimana", "Aline Uwase", "Kevin Mugisha", "Claudine Ingabire", "Emmanuel Niyonzima", "Sandrine Mukamana", "David Mutesi", "Grace Umutesi", "Yves Ishimwe", "Chantal Nyirabazungu", "Fabrice Rukundo", "Odette Kayitesi", "Samuel Hakizimana", "Irene Uwimana", "Christian Bizimana"];
const riskCycle: RiskBand[] = ["Low", "Medium", "Low", "High", "Medium"];

const extraCustomers: Customer[] = names.map((name, index) => ({
  id: "CUS-" + String(324 + index).padStart(5, "0"),
  name,
  initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2),
  type: (["Salaried", "Self-employed", "Business owner"] as const)[index % 3],
  phone: "+250 78" + String(2000000 + index * 731).slice(-7),
  email: name.toLowerCase().replaceAll(" ", ".") + "@example.rw",
  nationalId: "1199" + String(310000000000 + index * 9731),
  employer: ["Irembo Ltd", "Kigali Logistics", "Akagera Foods", "Virunga Tech", "Rwanda Retail Co."][index % 5],
  monthlyIncome: 650000 + index * 115000,
  monthlyObligations: 70000 + (index % 5) * 55000,
  kyc: index === 8 ? "Pending" : "Verified",
  risk: riskCycle[index % riskCycle.length],
  status: index === 8 ? "In review" : "Active",
  assigned: ["Marie", "Christine", "Jean-Paul"][index % 3],
  kycDetail: kyc(index === 8 ? { idStatus: "Pending", selfieMatch: "Pending", liveness: "Pending" } : {}),
}));

const customers: Customer[] = [
  { id: "CUS-00321", name: "John Doe", initials: "JD", type: "Salaried", phone: "+250 788 240 412", email: "john.doe@example.rw", nationalId: "1198765432100978", employer: "IST Solutions", monthlyIncome: 1200000, monthlyObligations: 250000, kyc: "Verified", risk: "Medium", status: "In review", assigned: "Marie", kycDetail: kyc() },
  { id: "CUS-00322", name: "Jane Uwase", initials: "JU", type: "Salaried", phone: "+250 788 240 413", email: "jane.uwase@example.rw", nationalId: "1198765432101082", employer: "Great Lakes Trading", monthlyIncome: 1500000, monthlyObligations: 1100000, kyc: "Verified", risk: "High", status: "In review", assigned: "Marie", kycDetail: kyc({ dob: "04 Mar 1989", address: "Nyarugenge, Kigali", duplicateIdentity: "None found", suspiciousAccount: "Flagged for review" }) },
  { id: "CUS-00323", name: "Alice Mukamana", initials: "AM", type: "Business owner", phone: "+250 788 240 414", email: "alice.mukamana@example.rw", nationalId: "1198765432101194", employer: "Mukamana Home Supplies", monthlyIncome: 980000, monthlyObligations: 420000, kyc: "Verified", risk: "High", status: "Active", assigned: "Claudine", kycDetail: kyc({ dob: "22 Jul 1985", address: "Kimironko, Gasabo, Kigali" }) },
  ...extraCustomers,
];

const johnDocuments: ApplicationDocument[] = [
  { id: "DOC-01", name: "National ID", status: "Verified", uploadedAt: "23 Aug 2026, 09:19", detail: "National ID · front and back" },
  { id: "DOC-02", name: "Employment contract", status: "Verified", uploadedAt: "23 Aug 2026, 09:22", detail: "Permanent employment contract" },
  { id: "DOC-03", name: "Payslip — June", status: "Verified", uploadedAt: "23 Aug 2026, 09:25", detail: "Gross salary RWF 1,200,000" },
  { id: "DOC-04", name: "Payslip — July", status: "Verified", uploadedAt: "23 Aug 2026, 09:26", detail: "Gross salary RWF 1,200,000" },
  { id: "DOC-05", name: "Payslip — August", status: "Uploaded", uploadedAt: "26 Aug 2026, 15:08", detail: "Awaiting officer review" },
  { id: "DOC-06", name: "Bank statement", status: "Verified", uploadedAt: "23 Aug 2026, 09:31", detail: "Six months · Bank of Kigali" },
];

const janeDocuments: ApplicationDocument[] = [
  { id: "JD-01", name: "National ID", status: "Verified", uploadedAt: "25 Aug 2026, 14:41", detail: "National ID · front and back" },
  { id: "JD-02", name: "Employment contract", status: "Rejected", uploadedAt: "25 Aug 2026, 14:44", detail: "Employer name does not match declared employer", rejectionReason: "Mismatch" },
  { id: "JD-03", name: "Payslip — July", status: "Verified", uploadedAt: "25 Aug 2026, 14:46", detail: "Gross salary RWF 1,500,000" },
  { id: "JD-04", name: "Payslip — August", status: "Rejected", uploadedAt: "26 Aug 2026, 08:12", detail: "Figures appear altered", rejectionReason: "Suspected alteration" },
  { id: "JD-05", name: "Bank statement", status: "Verified", uploadedAt: "25 Aug 2026, 14:52", detail: "Six months · Cogebanque" },
];

const johnFactors = [
  { key: "income", label: "Income stability", score: 17, max: 20, evidence: "24 consecutive salary deposits averaging RWF 1,195,000", reason: "Deposits are regular and materially match declared income." },
  { key: "tenure", label: "Employment duration", score: 8, max: 10, evidence: "Employed at IST Solutions since 12 Jan 2024", reason: "Over two years of continuous permanent employment." },
  { key: "dti", label: "Debt-to-income", score: 14, max: 20, evidence: "Obligations RWF 250,000 against income RWF 1,200,000", reason: "21% debt-to-income leaves adequate but not generous headroom." },
  { key: "history", label: "Credit history", score: 15, max: 20, evidence: "Two open facilities, RWF 3.1M outstanding, no defaults", reason: "Clean record, though existing exposure is moderate." },
  { key: "repayment", label: "Repayment history", score: 8, max: 10, evidence: "No missed instalments in the last 24 months", reason: "Consistently on time across both facilities." },
  { key: "bank", label: "Bank consistency", score: 8, max: 10, evidence: "Payslip RWF 1,200,000 vs bank deposit RWF 1,195,000", reason: "0.4% variance is within tolerance." },
  { key: "kyc", label: "KYC quality", score: 4, max: 5, evidence: "ID verified, selfie matched, liveness passed", reason: "All identity checks cleared on first attempt." },
  { key: "employer", label: "Employer verification", score: 0, max: 5, evidence: "Awaiting confirmation from IST Solutions HR", reason: "Request sent; no response recorded yet." },
];

const janeFactors = [
  { key: "income", label: "Income stability", score: 12, max: 20, evidence: "Deposits vary between RWF 900,000 and RWF 1,500,000", reason: "Income is irregular month to month." },
  { key: "tenure", label: "Employment duration", score: 5, max: 10, evidence: "Employed at Great Lakes Trading since Feb 2025", reason: "Under two years in current role." },
  { key: "dti", label: "Debt-to-income", score: 3, max: 20, evidence: "Obligations RWF 1,100,000 against income RWF 1,500,000", reason: "73% debt-to-income leaves almost no repayment capacity." },
  { key: "history", label: "Credit history", score: 7, max: 20, evidence: "Four open facilities totalling RWF 8.4M", reason: "Heavily leveraged across multiple lenders." },
  { key: "repayment", label: "Repayment history", score: 6, max: 10, evidence: "Two facilities in arrears at 30 and 60 days", reason: "Recent delinquency on existing debt." },
  { key: "bank", label: "Bank consistency", score: 7, max: 10, evidence: "Payslip RWF 1,500,000 vs average deposit RWF 1,180,000", reason: "21% variance between declared and observed income." },
  { key: "kyc", label: "KYC quality", score: 5, max: 5, evidence: "ID verified, selfie matched, liveness passed", reason: "Identity checks cleared." },
  { key: "employer", label: "Employer verification", score: 0, max: 5, evidence: "Great Lakes Trading could not confirm the declared salary", reason: "Employer verification failed." },
];

const applications: Application[] = [
  {
    id: "APP-00412", customerId: "CUS-00321", product: "Salary Loan", requested: 3000000, recommended: 2500000, term: 12,
    purpose: "Personal expenses", stage: "Credit Review", riskScore: 70, risk: "Medium", kyc: "Verified",
    employmentStatus: "Pending", submittedAt: "23 Aug 2026, 09:14", assigned: "Marie", approver: "Credit Manager",
    waiting: "2h 18m", decision: "Pending", documents: johnDocuments, factors: johnFactors,
    bureau: {
      status: "Received", receivedAt: "27 Aug 2026, 09:14", openLoans: 2, outstanding: 3100000, monthlyObligations: 250000, delinquencies: 0, defaults: 0,
      facilities: [
        { institution: "Bank of Kigali", type: "Personal loan", outstanding: 1850000, monthly: 145000, status: "Active" },
        { institution: "Equity Bank Rwanda", type: "Asset finance", outstanding: 1250000, monthly: 105000, status: "Active" },
      ],
      repaymentHistory: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((period) => ({ period: period + " 2026", status: "On time" })),
    },
    employment: {
      reference: "EV-00218", position: "Product Designer", startDate: "12 Jan 2024", employmentType: "Permanent",
      declared: 1200000, payslip: 1200000, bankDeposit: 1195000, hrConfirmed: null,
      hrEmail: "hr@istsolutions.rw", hrContact: "Aline Mukamana", phoneCheck: "Not required", bankComparison: "Completed",
    },
    positives: ["Stable employment since January 2024", "Consistent monthly salary deposits", "No delinquencies on existing facilities"],
    concerns: ["Existing obligations of RWF 250,000 per month", "Requested amount exceeds affordability ceiling"],
    redFlags: [],
  },
  {
    id: "APP-00413", customerId: "CUS-00322", product: "Salary Loan", requested: 5000000, recommended: 0, term: 18,
    purpose: "Business support", stage: "Credit Review", riskScore: 49, risk: "High", kyc: "Verified",
    employmentStatus: "Failed", submittedAt: "25 Aug 2026, 14:40", assigned: "Marie", approver: "Credit Manager",
    waiting: "1d 3h", decision: "Pending", documents: janeDocuments, factors: janeFactors,
    bureau: {
      status: "Attention", receivedAt: "27 Aug 2026, 09:20", openLoans: 4, outstanding: 8400000, monthlyObligations: 1100000, delinquencies: 2, defaults: 0,
      facilities: [
        { institution: "Bank of Kigali", type: "Personal loan", outstanding: 3200000, monthly: 380000, status: "Active" },
        { institution: "Cogebanque", type: "Salary advance", outstanding: 1900000, monthly: 260000, status: "Arrears 30d" },
        { institution: "I&M Bank Rwanda", type: "Asset finance", outstanding: 2100000, monthly: 290000, status: "Active" },
        { institution: "Umwalimu SACCO", type: "Consumer loan", outstanding: 1200000, monthly: 170000, status: "Arrears 60d" },
      ],
      repaymentHistory: [
        { period: "Mar 2026", status: "On time" }, { period: "Apr 2026", status: "On time" }, { period: "May 2026", status: "Late" },
        { period: "Jun 2026", status: "On time" }, { period: "Jul 2026", status: "Late" }, { period: "Aug 2026", status: "Missed" },
      ],
    },
    employment: {
      reference: "EV-00219", position: "Sales Manager", startDate: "03 Feb 2025", employmentType: "Contract",
      declared: 1500000, payslip: 1500000, bankDeposit: 1180000, hrConfirmed: 0,
      hrEmail: "people@glt.rw", hrContact: "Patrick U.", phoneCheck: "Attempted · no response", bankComparison: "Discrepancy",
    },
    positives: ["Identity and KYC checks cleared"],
    concerns: ["Contract employment under two years", "Declared salary exceeds observed deposits by 21%"],
    redFlags: ["Debt-to-income is 73%", "Credit arrears detected on two facilities", "Employer could not verify declared salary"],
  },
  ...extraCustomers.slice(0, 8).map((customer, index): Application => {
    const risk = riskCycle[index % riskCycle.length];
    const requested = 800000 + index * 350000;
    return {
      id: "APP-" + String(414 + index).padStart(5, "0"), customerId: customer.id,
      product: index % 3 === 0 ? "Business Loan" : "Salary Loan", requested, recommended: 700000 + index * 300000,
      term: 6 + (index % 4) * 6, purpose: "Working capital",
      stage: (["New", "Verification", "Approval", "Approved"] as const)[index % 4],
      riskScore: 82 - index * 4, risk, kyc: customer.kyc,
      employmentStatus: index % 3 === 0 ? "Pending" : "Verified",
      submittedAt: String(26 - (index % 3)) + " Aug 2026, " + String(9 + index).padStart(2, "0") + ":20",
      assigned: customer.assigned, approver: "Credit Manager",
      waiting: String(index + 1) + "h " + String(index * 7) + "m", decision: "Pending", documents: [],
      factors: johnFactors.map((factor) => ({ ...factor, score: Math.max(0, factor.score - (index % 4)) })),
      bureau: {
        status: "Received", receivedAt: "26 Aug 2026, 11:00", openLoans: 1 + (index % 3), outstanding: 900000 + index * 240000,
        monthlyObligations: customer.monthlyObligations, delinquencies: index === 3 ? 1 : 0, defaults: 0,
        facilities: [{ institution: "Bank of Kigali", type: "Personal loan", outstanding: 900000 + index * 240000, monthly: customer.monthlyObligations, status: index === 3 ? "Arrears 30d" : "Active" }],
        repaymentHistory: ["Jun 2026", "Jul 2026", "Aug 2026"].map((period) => ({ period, status: "On time" })),
      },
      employment: {
        reference: "EV-" + String(220 + index).padStart(5, "0"), position: "Officer", startDate: "01 Mar 2023", employmentType: "Permanent",
        declared: customer.monthlyIncome, payslip: customer.monthlyIncome, bankDeposit: customer.monthlyIncome - 5000,
        hrConfirmed: index % 3 === 0 ? null : customer.monthlyIncome,
        hrEmail: "hr@" + customer.employer.toLowerCase().replaceAll(" ", "").replace(/[^a-z]/g, "") + ".rw",
        hrContact: "HR Office", phoneCheck: "Not required", bankComparison: "Completed",
      },
      positives: ["Salary deposits observed"], concerns: ["Limited credit history"],
      redFlags: index === 3 ? ["Previous late payment"] : [],
    };
  }),
];

/** Weighted so the book reads like a healthy portfolio: a realistic PAR rather than a third in arrears. */
const statuses = [
  ...Array<LoanStatus>(18).fill("Active"),
  ...Array<LoanStatus>(5).fill("Paid"),
  ...Array<LoanStatus>(2).fill("Approved"),
  "Late" as LoanStatus,
  "Defaulted" as LoanStatus,
  "Restructured" as LoanStatus,
];

const extraLoans: Loan[] = Array.from({ length: 28 }, (_, index) => {
  const customer = customers[(index + 2) % customers.length];
  const principal = 600000 + (index % 8) * 475000;
  const interest = Math.round(principal * 0.12);
  const term = 12;
  const paidCount = index % 6;
  const schedule = buildSchedule(principal, interest, term, paidCount);
  const paidToDate = schedule.reduce((sum, row) => sum + row.paid, 0);
  return {
    id: "LN-" + String(46 + index).padStart(5, "0"), customerId: customer.id, principal,
    outstanding: principal + interest - paidToDate, interest, fees: Math.round(principal * 0.02), term,
    nextPayment: installmentOf(principal, interest, term),
    nextDue: schedule.find((row) => row.status !== "Paid")?.due ?? monthLabel(term),
    paidToDate, risk: customer.risk, status: statuses[index % statuses.length], officer: customer.assigned,
    disbursementStatus: "Completed", destination: "MTN MoMo · ******" + String(5000 + index).slice(-4),
    disbursedAt: "12 Jul 2026", schedule,
    transactions: [{ id: "TX-" + String(70000000 + index * 137), type: "Disbursement", amount: principal, at: "12 Jul 2026, 10:04", reference: "MoMo", direction: "out" }],
  };
});

const aliceSchedule = buildSchedule(3200000, 384000, 12, 4);
const aliceOverdue = 380000;

const loans: Loan[] = [
  {
    id: "LN-00045", applicationId: "APP-00412", customerId: "CUS-00321", principal: 2500000, outstanding: 2500000,
    interest: 300000, fees: 50000, term: 12, nextPayment: installmentOf(2500000, 300000, 12), nextDue: monthLabel(0),
    paidToDate: 0, risk: "Medium", status: "Approved", officer: "Marie", disbursementStatus: "Ready",
    destination: "MTN MoMo · ******432", schedule: [], transactions: [],
  },
  {
    id: "LN-00038", customerId: "CUS-00323", principal: 3200000, outstanding: 1760000, interest: 384000, fees: 64000,
    term: 12, nextPayment: installmentOf(3200000, 384000, 12), nextDue: "13 Aug 2026", paidToDate: 1440000, risk: "High", status: "Late",
    officer: "Claudine", disbursementStatus: "Completed", destination: "Bank of Kigali · ******908", disbursedAt: "10 Mar 2026",
    schedule: aliceSchedule.map((row, index) => (index === 4 ? { ...row, due: "13 Aug 2026", status: "Late", paid: 0 } : row)),
    transactions: [{ id: "TX-68410023", type: "Disbursement", amount: 3200000, at: "10 Mar 2026, 09:12", reference: "Bank of Kigali", direction: "out" }],
  },
  ...extraLoans,
];

export function createSeedState(): DemoState {
  return {
    version: APP_VERSION,
    activeRole: "Loan Officer",
    clock: 0,
    customers: structuredClone(customers),
    applications: structuredClone(applications),
    loans: structuredClone(loans),
    collections: [
      {
        id: "COL-00038", loanId: "LN-00038", customerId: "CUS-00323", daysOverdue: 14, amountOverdue: aliceOverdue,
        owner: "Claudine", status: "Open", lastContact: "24 Aug 2026", nextAction: "Call borrower",
        events: [
          { id: "CE-SEED-3", type: "Phone attempted", note: "No answer; voicemail left", at: "24 Aug 2026, 15:42", actor: "Claudine" },
          { id: "CE-SEED-2", type: "SMS reminder", note: "Automatic reminder delivered", at: "14 Aug 2026, 09:15", actor: "System" },
          { id: "CE-SEED-1", type: "Payment missed", note: "Installment became overdue", at: "13 Aug 2026, 08:00", actor: "System" },
        ],
      },
    ],
    complianceCases: [
      { id: "CMP-00148", customerId: "CUS-00322", customerName: "Jane Uwase", type: "Employment mismatch", severity: "High", status: "Investigate", owner: "Claudine", openedAt: "27 Aug 2026, 09:22", note: "Declared salary could not be verified by the employer." },
      { id: "CMP-00147", customerId: "CUS-00332", customerName: "David Mutesi", type: "Document anomaly", severity: "Medium", status: "Open", owner: "Claudine", openedAt: "26 Aug 2026, 16:40", note: "Payslip metadata inconsistent with issuing employer." },
      { id: "CMP-00144", customerId: "CUS-00327", customerName: "Aline Uwase", type: "AML screening", severity: "High", status: "Escalated", owner: "Claudine", openedAt: "24 Aug 2026, 11:05", note: "Counterparty matched a monitored watchlist entry." },
    ],
    employers: [
      { id: "EMP-01", name: "IST Solutions", contact: "Aline Mukamana", email: "hr@istsolutions.rw", status: "Pending" },
      { id: "EMP-02", name: "Great Lakes Trading", contact: "Patrick U.", email: "people@glt.rw", status: "Failed" },
      { id: "EMP-03", name: "Irembo Ltd", contact: "People Team", email: "people@irembo.rw", status: "Verified" },
      { id: "EMP-04", name: "Kigali Logistics", contact: "HR Office", email: "hr@kigali-logistics.rw", status: "Pending" },
      { id: "EMP-05", name: "Akagera Foods", contact: "Operations", email: "hr@akagerafoods.rw", status: "Manual review" },
    ],
    audit: [
      { id: "AUD-1", entityType: "application", entityId: "APP-00412", action: "Credit report received", actor: "System", at: "27 Aug 2026, 09:14", after: "Report received" },
      { id: "AUD-0", entityType: "application", entityId: "APP-00412", action: "Application received", actor: "Customer", at: "23 Aug 2026, 09:14", after: "Submitted" },
    ],
  };
}
