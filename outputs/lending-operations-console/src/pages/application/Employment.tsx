import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Copy } from "lucide-react";
import { Badge, KV, Notice, SectionHead } from "../../components/ui";
import { DropdownMenu, MenuItem, MenuSeparator } from "../../components/overlays";
import { formatRwf } from "../../lib/format";
import { statusTone } from "../../lib/tone";
import { useDemo } from "../../store";
import type { Application, Customer } from "../../types";

export function Employment({ application, customer }: { application: Application; customer: Customer }) {
  const { dispatch } = useDemo();
  const navigate = useNavigate();
  const { employment } = application;
  const confirmed = application.employmentStatus === "Verified";
  const variance = employment.declared ? Math.abs(employment.declared - employment.bankDeposit) / employment.declared : 0;
  const variancePercent = (variance * 100).toFixed(1);

  const setStatus = (status: "Verified" | "Manual review" | "Failed", message: string) => {
    dispatch({ type: "EMPLOYMENT_STATUS", applicationId: application.id, status });
    if (status === "Failed") toast.error(message);
    else toast.success(message);
  };

  return (
    <div className="content-grid">
      <section className="surface padded">
        <SectionHead title="Employer" description={customer.employer} actions={<Badge tone={statusTone(application.employmentStatus)}>{application.employmentStatus}</Badge>} />
        <div className="kv-grid">
          <KV label="Position" value={employment.position} />
          <KV label="Start date" value={employment.startDate} />
          <KV label="Employment type" value={employment.employmentType} />
          <KV label="HR contact" value={employment.hrContact} />
          <KV label="HR email" value={employment.hrEmail} />
          <KV label="Reference" value={employment.reference} />
        </div>
      </section>

      <section className="surface padded">
        <SectionHead title="Verification methods" description="How this employment was checked" />
        <div className="method">
          <p>
            <span>HR email</span>
            <strong>{confirmed ? "Verification received" : application.employmentStatus === "Failed" ? "Employer could not confirm" : "Awaiting response"}</strong>
          </p>
          <p>
            <span>Phone</span>
            <strong>{employment.phoneCheck}</strong>
          </p>
          <p>
            <span>Bank comparison</span>
            <strong>{employment.bankComparison}</strong>
          </p>
        </div>
        <button
          className="btn full-btn"
          onClick={() => {
            navigator.clipboard?.writeText(location.origin + "/verify-employment/" + employment.reference).catch(() => undefined);
            toast.success("Verification link copied");
          }}
        >
          <Copy size={15} />
          Copy HR verification link
        </button>
        <button className="btn primary full-btn" onClick={() => navigate("/verify-employment/" + employment.reference)}>
          Open external HR flow <ArrowRight size={15} />
        </button>
      </section>

      <section className="surface padded span-2">
        <SectionHead title="Salary comparison" description="Declared income against every independent source" />
        <div className="comparison">
          <KV label="Customer declared" value={formatRwf(employment.declared)} />
          <KV label="Payslip" value={formatRwf(employment.payslip)} />
          <KV label="Bank deposit" value={formatRwf(employment.bankDeposit)} />
          <KV label="HR confirmed" value={employment.hrConfirmed ? formatRwf(employment.hrConfirmed) : "—"} good={Boolean(employment.hrConfirmed)} />
        </div>
        <Notice
          good={variance < 0.05}
          title={variance < 0.05 ? "Minor variance · " + variancePercent + "%" : "Material variance · " + variancePercent + "%"}
          text={variance < 0.05 ? "Income sources are materially consistent." : "Declared income is not supported by observed deposits."}
        />
        <div className="decision-actions">
          <button className="btn primary" disabled={confirmed} onClick={() => setStatus("Verified", "Employment verified")}>
            Mark verified
          </button>
          <DropdownMenu label="Other verification outcomes">
            {(close) => (
              <>
                <MenuItem disabled={application.employmentStatus === "Manual review"} onSelect={() => { close(); setStatus("Manual review", "Sent for manual review"); }}>
                  Require manual review
                </MenuItem>
                <MenuSeparator />
                <MenuItem destructive disabled={application.employmentStatus === "Failed"} onSelect={() => { close(); setStatus("Failed", "Employment verification failed"); }}>
                  Fail verification
                </MenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </section>
    </div>
  );
}
