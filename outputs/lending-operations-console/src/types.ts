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
  entityType: "application" | "loan" | "document" | "employment" | "collection" | "compliance";
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
}
