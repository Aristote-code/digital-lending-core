import { Badge, KV, Notice, SectionHead } from "../../components/ui";
import { statusTone } from "../../lib/tone";
import type { Application, Customer } from "../../types";

export function Kyc({ application, customer }: { application: Application; customer: Customer }) {
  const detail = customer.kycDetail;
  const clean = detail.duplicateIdentity === "None found" && detail.suspiciousAccount === "None found";

  return (
    <div className="content-grid">
      <section className="surface padded">
        <SectionHead title="Identity" description="Legal identity as declared and matched" />
        <div className="kv-grid">
          <KV label="Full legal name" value={customer.name} />
          <KV label="Date of birth" value={detail.dob} />
          <KV label="Nationality" value={detail.nationality} />
          <KV label="National ID" value={customer.nationalId} />
          <KV label="Residential address" value={detail.address} />
          <KV label="Customer type" value={customer.type} />
        </div>
      </section>

      <section className="surface padded">
        <SectionHead title="Verification" description="Automated identity checks" actions={<Badge tone={statusTone(application.kyc)}>{application.kyc}</Badge>} />
        <div className="check-grid">
          {[
            ["National ID", detail.idStatus],
            ["Selfie", detail.selfieMatch],
            ["Liveness", detail.liveness],
            ["Address", detail.addressStatus],
          ].map(([label, value]) => (
            <div className="check-row" key={label}>
              <span>{label}</span>
              <Badge tone={statusTone(value)}>{value}</Badge>
            </div>
          ))}
        </div>
      </section>

      <section className="surface padded span-2">
        <SectionHead title="Risk screening" description="Duplicate identity and suspicious account checks" />
        <div className="check-grid">
          <div className="check-row">
            <span>Duplicate identity</span>
            <Badge tone={detail.duplicateIdentity === "None found" ? "success" : "danger"}>{detail.duplicateIdentity}</Badge>
          </div>
          <div className="check-row">
            <span>Suspicious account match</span>
            <Badge tone={detail.suspiciousAccount === "None found" ? "success" : "danger"}>{detail.suspiciousAccount}</Badge>
          </div>
        </div>
        <Notice
          good={clean}
          title={clean ? "No identity risk detected" : "Identity screening requires review"}
          text={clean ? "Screening completed against the prototype watchlist." : "Escalate to Compliance before proceeding with a decision."}
        />
      </section>
    </div>
  );
}
