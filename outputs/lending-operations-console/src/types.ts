export type StaffRole = "Loan Officer" | "Credit Officer" | "Credit Manager" | "Finance" | "Collections" | "Compliance" | "CEO";
export type ApplicationStage = "New" | "Verification" | "Credit Review" | "Approval" | "Approved" | "Rejected" | "Disbursed";
export type RiskBand = "Low" | "Medium" | "High";
export type DocumentStatus = "Missing" | "Uploaded" | "Processing" | "Verified" | "Rejected" | "Expired";
export type EmploymentVerificationStatus = "Pending" | "Verified" | "Manual review" | "Failed";
export type CreditDecision = "Pending" | "Approved" | "Approved with conditions" | "Rejected" | "Manual review";
export type LoanStatus = "Application" | "Pending" | "Approved" | "Active" | "Paid" | "Late" | "Defaulted" | "Restructured" | "Closed";
export type DisbursementStatus = "Not ready" | "Ready" | "Processing" | "Completed";
export type CollectionCaseStatus = "Open" | "Promise to pay" | "Escalated" | "Restructured" | "Closed";
export type ComplianceCaseStatus = "Open" | "Investigate" | "Escalated" | "Cleared" | "Closed";

/* --- BNR Regulation 12/2017 asset classification --- */
export type AssetClass = "Normal" | "Watch" | "Substandard" | "Doubtful" | "Loss";
/* --- Credit Policy s32 internal rating --- */
export type CreditGrade = "A" | "B" | "C" | "D" | "E" | "F";
export type CollateralType = "Real estate" | "Motor vehicle" | "Machinery" | "Unsecured";
export type RelatedPartyType = "None" | "Director" | "Shareholder" | "Staff" | "Connected party";
/* --- Credit Policy s16 delegated approval authority --- */
export type AuthorityLevel = "Credit Officer" | "Credit Manager" | "Board Credit Committee" | "Full Board";

export interface Collateral {
  id: string;
  type: CollateralType;
  description: string;
  owner: string;
  marketValue: number;
  forcedSaleValue: number;
  valuedAt: string;
  insured: boolean;
  /** Security registered/perfected — a precondition of disbursement under s21. */
  registered: boolean;
  enforceable: boolean;
}

export interface Guarantor {
  id: string;
  name: string;
  relationship: string;
  nationalId: string;
  monthlyIncome: number;
  documented: boolean;
  acknowledged: boolean;
}

/** s36: every deviation from policy is justified, approved and registered. */
export interface PolicyException {
  id: string;
  entityId: string;
  entityLabel: string;
  type: string;
  detail: string;
  justification: string;
  raisedBy: string;
  approvedBy?: string;
  at: string;
  status: "Open" | "Approved" | "Declined";
}

/** s44: borrowers must have access to a complaints mechanism. */
export interface Complaint {
  id: string;
  customerId: string;
  customerName: string;
  channel: "Phone" | "Email" | "Branch" | "SMS";
  subject: string;
  detail: string;
  status: "Received" | "Acknowledged" | "Investigating" | "Resolved";
  receivedAt: string;
  resolvedAt?: string;
  resolution?: string;
  owner: string;
}

/**
 * Board-set policy parameters. The source policy marks its own thresholds as
 * illustrative and requires them to be calibrated to the institution's capital
 * base and licence category, so nothing here is hard-coded into the screens.
 */
export interface PolicyParameters {
  institution: string;
  licenceCategory: "Category I" | "Category II";
  coreCapital: number;
  minimumCapital: number;
  /** null means no ceiling — Infinity does not survive JSON serialisation. */
  authorityTiers: { level: AuthorityLevel; maxPctOfCapital: number | null }[];
  ltvCaps: { type: CollateralType; max: number }[];
  dscrFloor: number;
  provisionRates: { class: AssetClass; rate: number; from: number; to: number | null }[];
  maxRestructures: number;
  restructureSeasoningMonths: number;
  singleBorrowerLimitPct: number;
  relatedPartyLimitPct: number;
  sectorLimitPct: number;
}

export interface KycDetail {
  dob: string;
  nationality: string;
  address: string;
  idStatus: string;
  selfieMatch: string;
  liveness: string;
  addressStatus: string;
  duplicateIdentity: string;
  suspiciousAccount: string;
}

export interface Customer {
  id: string;
  name: string;
  initials: string;
  type: "Salaried" | "Self-employed" | "Business owner";
  phone: string;
  email: string;
  nationalId: string;
  employer: string;
  monthlyIncome: number;
  monthlyObligations: number;
  kyc: "Verified" | "Pending" | "Failed";
  risk: RiskBand;
  status: "Active" | "In review" | "Restricted";
  assigned: string;
  kycDetail: KycDetail;
  /** s18/s35: related parties cannot be approved by an interested officer. */
  relatedParty: RelatedPartyType;
  sector: string;
  district: string;
}

export interface ApplicationDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  uploadedAt?: string;
  detail: string;
  rejectionReason?: string;
}

/** A single weighted input to the prototype credit score, carrying the evidence behind it. */
export interface CreditFactor {
  key: string;
  label: string;
  score: number;
  max: number;
  evidence: string;
  reason: string;
}

export interface CreditFacility {
  institution: string;
  type: string;
  outstanding: number;
  monthly: number;
  status: string;
}

export interface BureauReport {
  status: string;
  receivedAt: string;
  openLoans: number;
  outstanding: number;
  monthlyObligations: number;
  delinquencies: number;
  defaults: number;
  facilities: CreditFacility[];
  repaymentHistory: { period: string; status: string }[];
}

export interface EmploymentDetail {
  reference: string;
  position: string;
  startDate: string;
  employmentType: string;
  declared: number;
  payslip: number;
  bankDeposit: number;
  hrConfirmed: number | null;
  hrEmail: string;
  hrContact: string;
  phoneCheck: string;
  bankComparison: string;
}

export interface Application {
  id: string;
  customerId: string;
  product: string;
  requested: number;
  recommended: number;
  term: number;
  purpose: string;
  stage: ApplicationStage;
  riskScore: number;
  risk: RiskBand;
  kyc: "Verified" | "Pending" | "Failed";
  employmentStatus: EmploymentVerificationStatus;
  submittedAt: string;
  assigned: string;
  approver: string;
  waiting: string;
  decision: CreditDecision;
  decisionReason?: string;
  documents: ApplicationDocument[];
  factors: CreditFactor[];
  bureau: BureauReport;
  employment: EmploymentDetail;
  positives: string[];
  concerns: string[];
  redFlags: string[];
  requestedInfo?: string[];
  grade: CreditGrade;
  /** s11: repayment capacity outranks collateral. */
  dscr: number;
  collateral: Collateral[];
  guarantors: Guarantor[];
  /** s20/s44: key facts issued and acknowledged before acceptance. */
  disclosureAcceptedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ScheduleRow {
  id: string;
  due: string;
  principal: number;
  interest: number;
  total: number;
  paid: number;
  status: "Paid" | "Due" | "Upcoming" | "Late";
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  at: string;
  reference: string;
  direction: "in" | "out";
}

export interface Loan {
  id: string;
  applicationId?: string;
  customerId: string;
  principal: number;
  outstanding: number;
  interest: number;
  fees: number;
  term: number;
  nextPayment: number;
  nextDue: string;
  paidToDate: number;
  risk: RiskBand;
  status: LoanStatus;
  officer: string;
  disbursementStatus: DisbursementStatus;
  destination: string;
  disbursedAt?: string;
  schedule: ScheduleRow[];
  transactions: Transaction[];
  restructuredFrom?: { term: number; installment: number; at: string };
  daysPastDue: number;
  sector: string;
  collateral: Collateral[];
  restructureCount: number;
  lastRestructuredAt?: string;
  /** Months of satisfactory performance since the last restructuring (s27 seasoning). */
  monthsSinceRestructure?: number;
  writtenOffAt?: string;
  writeOffReason?: string;
  recovered: number;
}

export interface CollectionEvent {
  id: string;
  type: string;
  note: string;
  at: string;
  actor: string;
}

export interface CollectionCase {
  id: string;
  loanId: string;
  customerId: string;
  daysOverdue: number;
  amountOverdue: number;
  owner: string;
  status: CollectionCaseStatus;
  promiseDate?: string;
  promiseAmount?: number;
  lastContact: string;
  nextAction: string;
  events: CollectionEvent[];
}

export interface ComplianceCase {
  id: string;
  customerId: string;
  customerName: string;
  type: string;
  severity: RiskBand;
  status: ComplianceCaseStatus;
  owner: string;
  openedAt: string;
  note: string;
}

export interface AuditEvent {
  id: string;
  entityType: "application" | "loan" | "document" | "employment" | "collection" | "compliance" | "exception" | "complaint" | "policy";
  entityId: string;
  action: string;
  actor: string;
  at: string;
  before?: string;
  after?: string;
  reason?: string;
}

export interface Employer {
  id: string;
  name: string;
  contact: string;
  email: string;
  status: EmploymentVerificationStatus;
}

export interface DemoState {
  version: number;
  activeRole: StaffRole;
  clock: number;
  customers: Customer[];
  applications: Application[];
  loans: Loan[];
  collections: CollectionCase[];
  complianceCases: ComplianceCase[];
  employers: Employer[];
  audit: AuditEvent[];
  policy: PolicyParameters;
  exceptions: PolicyException[];
  complaints: Complaint[];
  /** Who is signed in on the borrower side. The two portals share one state. */
  borrowerId: string;
}
