import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Badge, KV } from "../components/ui";
import { formatRwf } from "../lib/format";
import { useDemo } from "../store";

const REQUESTED = ["Employment status", "Position and start date", "Employment type", "Current monthly salary"];

type Step = "intro" | "form" | "done" | "declined";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="hr">
      <header>
        <div className="brand">
          <span className="mark">
            <i /><i /><i /><i />
          </span>
          <strong>Lending Operations Console</strong>
        </div>
        <Badge>Secure verification</Badge>
      </header>
      <main>{children}</main>
      <footer>Protected by encrypted transport · Prototype environment</footer>
    </div>
  );
}

export function HrVerification() {
  const { token } = useParams();
  const { state, dispatch } = useDemo();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");

  const application = state.applications.find((item) => item.employment.reference === token);
  const customer = application ? state.customers.find((item) => item.id === application.customerId) : undefined;

  if (!application || !customer) {
    return (
      <Frame>
        <section className="hr-card centered">
          <div className="hr-icon danger">
            <Clock3 size={23} />
          </div>
          <h1>This link has expired</h1>
          <p>Verification links stay valid for seven days. Ask the lending team to send a new request.</p>
          <button className="btn" onClick={() => navigate("/home")}>
            Return to operations demo
          </button>
        </section>
      </Frame>
    );
  }

  const { employment } = application;
  const firstName = customer.name.split(" ")[0];

  if (application.employmentStatus === "Verified" && step === "intro") {
    return (
      <Frame>
        <section className="hr-card centered">
          <div className="hr-icon">
            <CheckCircle2 size={23} />
          </div>
          <span className="eyebrow">REFERENCE {employment.reference}</span>
          <h1>Already completed</h1>
          <p>This verification was submitted on {application.employment.hrContact ? "behalf of " + customer.employer : "an earlier date"}. No further action is needed.</p>
          <button className="btn" onClick={() => navigate("/applications/" + application.id + "?tab=Employment")}>
            Return to operations demo
          </button>
        </section>
      </Frame>
    );
  }

  return (
    <Frame>
      {step === "intro" && (
        <section className="hr-card">
          <div className="hr-icon">
            <Building2 size={23} />
          </div>
          <span className="eyebrow">EMPLOYMENT VERIFICATION</span>
          <h1>Employment verification request</h1>
          <p>
            {customer.name} has authorized us to confirm employment information with {customer.employer}.
          </p>
          <div className="request">
            <KV label="Applicant" value={customer.name} />
            <KV label="Employer" value={customer.employer} />
            <KV label="Requested by" value="Lending Operations Console" />
            <KV label="Reference" value={employment.reference} />
          </div>
          <h3>Information requested</h3>
          {REQUESTED.map((item) => (
            <p className="checkline" key={item}>
              <Check size={14} />
              {item}
            </p>
          ))}
          <button className="btn primary full-btn" onClick={() => setStep("form")}>
            Start verification <ArrowRight size={15} />
          </button>
          <button className="btn full-btn" onClick={() => setStep("declined")}>
            I cannot confirm this
          </button>
          <small>This secure link expires on 30 August 2026.</small>
        </section>
      )}

      {step === "form" && (
        <section className="hr-card">
          <button className="back" onClick={() => setStep("intro")}>
            <ArrowLeft size={14} />
            Back
          </button>
          <span className="eyebrow">REFERENCE {employment.reference}</span>
          <h1>Confirm employment details</h1>
          <p>Please review and correct the information below.</p>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              dispatch({ type: "EMPLOYMENT_STATUS", applicationId: application.id, status: "Verified", actor: "External HR" });
              setStep("done");
            }}
          >
            <label>
              Is {firstName} currently employed?
              <select defaultValue="Yes">
                <option>Yes</option>
                <option>No</option>
              </select>
            </label>
            <label>
              Position
              <input defaultValue={employment.position} />
            </label>
            <div className="form-row">
              <label>
                Start date
                <input type="date" defaultValue="2024-01-12" />
              </label>
              <label>
                Employment type
                <select defaultValue={employment.employmentType}>
                  <option>Permanent</option>
                  <option>Contract</option>
                  <option>Probation</option>
                </select>
              </label>
            </div>
            <label>
              Gross monthly salary
              <input defaultValue={formatRwf(employment.declared)} />
            </label>
            <label className="check-label">
              <input type="checkbox" required defaultChecked />I confirm this information is accurate.
            </label>
            <button className="btn primary full-btn">Submit verification</button>
          </form>
        </section>
      )}

      {step === "done" && (
        <section className="hr-card success centered">
          <CheckCircle2 size={48} />
          <span className="eyebrow">REFERENCE {employment.reference}</span>
          <h1>Verification submitted</h1>
          <p>The lending team has received the employment confirmation. You can close this page.</p>
          <button className="btn" onClick={() => navigate("/applications/" + application.id + "?tab=Employment")}>
            Return to operations demo
          </button>
        </section>
      )}

      {step === "declined" && (
        <section className="hr-card centered">
          <div className="hr-icon danger">
            <XCircle size={23} />
          </div>
          <span className="eyebrow">REFERENCE {employment.reference}</span>
          <h1>Verification declined</h1>
          <p>Thank you. We have recorded that {customer.employer} cannot confirm these details, and the lending team will follow up directly.</p>
          <p className="hr-note">
            <AlertTriangle size={14} />
            The application will proceed to manual review.
          </p>
          <button
            className="btn"
            onClick={() => {
              dispatch({ type: "EMPLOYMENT_STATUS", applicationId: application.id, status: "Failed", actor: "External HR" });
              navigate("/applications/" + application.id + "?tab=Employment");
            }}
          >
            Return to operations demo
          </button>
        </section>
      )}
    </Frame>
  );
}
