import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, Landmark, WalletCards, XCircle } from "lucide-react";
import { Badge, SectionHead } from "../../components/ui";
import { dti, formatRwf } from "../../lib/format";
import { riskTone, statusTone } from "../../lib/tone";
import type { Application, Customer } from "../../types";

export function Overview({ application, customer, onTab }: { application: Application; customer: Customer; onTab: (tab: string) => void }) {
  const { employment, bureau } = application;
  const salaryConsistent = Math.abs(employment.declared - employment.bankDeposit) / employment.declared < 0.05;

  const rows = [
    { icon: ClipboardCheck, title: "Identity verification", sub: "National ID", status: customer.kyc, label: "ID number", value: customer.nationalId, tab: "KYC" },
    { icon: Building2, title: "Employment verification", sub: employment.hrContact + " · " + customer.employer, status: application.employmentStatus, label: "Employer", value: customer.employer, tab: "Employment" },
    { icon: WalletCards, title: "Salary comparison", sub: "Payslips vs bank deposits", status: salaryConsistent ? "Consistent" : "Attention", label: "Monthly income", value: formatRwf(customer.monthlyIncome), tab: "Employment" },
    { icon: Building2, title: "Credit bureau report", sub: "TransUnion Rwanda", status: bureau.status, label: "Open loans", value: String(bureau.openLoans), tab: "Credit" },
    { icon: Landmark, title: "Bank statement analysis", sub: "Last 6 months", status: "Analyzed", label: "Cash flow", value: salaryConsistent ? "Positive" : "Irregular", tab: "Credit" },
  ];

  return (
    <div className="split">
      <section className="surface evidence">
        <SectionHead
          title="Assessment evidence"
          description="Verified signals used in this credit assessment"
          actions={
            <span className="updated">
              <Clock3 size={14} />
              Updated {bureau.receivedAt}
            </span>
          }
        />
        {rows.map((row) => (
          <button className="evidence-row" key={row.title} onClick={() => onTab(row.tab)}>
            <span className="evidence-icon">
              <row.icon size={19} />
            </span>
            <span className="evidence-name">
              <strong>{row.title}</strong>
              <small>{row.sub}</small>
            </span>
            <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            <span className="evidence-meta">
              <small>{row.label}</small>
              <strong>{row.value}</strong>
            </span>
            <span className="view">
              View details <ChevronRight size={14} />
            </span>
          </button>
        ))}
      </section>
      <DecisionRail application={application} customer={customer} onTab={onTab} />
    </div>
  );
}

function DecisionRail({ application, customer, onTab }: { application: Application; customer: Customer; onTab: (tab: string) => void }) {
  const navigate = useNavigate();
  const blocked = application.employmentStatus !== "Verified";

  return (
    <aside className="surface rail">
      <h2>Decision summary</h2>
      <div className="score">
        <div>
          <span>Risk score</span>
          <strong>
            {application.riskScore}
            <small>/100</small>
          </strong>
        </div>
        <Badge tone={riskTone(application.risk)}>{application.risk} Risk</Badge>
      </div>

      {application.redFlags.length > 0 && (
        <div className="signals red">
          <h3>Red flags</h3>
          {application.redFlags.map((flag) => (
            <p key={flag}>
              <XCircle size={15} />
              {flag}
            </p>
          ))}
        </div>
      )}

      {application.positives.length > 0 && (
        <div className="signals">
          <h3>Positive signals</h3>
          {application.positives.map((item) => (
            <p key={item}>
              <CheckCircle2 size={15} />
              {item}
            </p>
          ))}
        </div>
      )}

      {application.concerns.length > 0 && (
        <div className="signals amber">
          <h3>Concerns</h3>
          {application.concerns.map((item) => (
            <p key={item}>
              <AlertTriangle size={15} />
              {item}
            </p>
          ))}
        </div>
      )}

      <div className="recommend">
        <span>Recommended amount</span>
        <strong>{application.recommended ? formatRwf(application.recommended) : "No offer"}</strong>
        <small>
          {application.term} months · DTI {dti(customer.monthlyObligations, customer.monthlyIncome)}%
        </small>
      </div>

      {blocked && application.risk !== "High" && (
        <p className="rail-hint">
          <AlertTriangle size={14} />
          Employer verification must be completed before a decision.
        </p>
      )}

      <button className="btn primary full-btn" onClick={() => onTab(application.risk === "High" ? "Credit" : "Decision")}>
        {application.risk === "High" ? "Review red flags" : "Open credit decision"}
        <ArrowRight size={15} />
      </button>
      <button className="btn full-btn" onClick={() => { onTab("Documents"); toast("Request information from the Documents tab"); }}>
        Request more information
      </button>
      <button className="btn full-btn" onClick={() => navigate("/customers/" + customer.id)}>
        View customer profile
      </button>
    </aside>
  );
}
