import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Shell } from "../../layout/Shell";
import { Badge, Summary, Tabs } from "../../components/ui";
import { Popover } from "../../components/overlays";
import { formatRwf } from "../../lib/format";
import { riskTone, statusTone } from "../../lib/tone";
import { useDemo } from "../../store";
import { Overview } from "./Overview";
import { Kyc } from "./Kyc";
import { Documents } from "./Documents";
import { Employment } from "./Employment";
import { Credit } from "./Credit";
import { Decision } from "./Decision";
import { Activity } from "./Activity";

const TABS = ["Overview", "KYC", "Documents", "Employment", "Credit", "Decision", "Activity"] as const;

/** Nine checkpoints an application passes through, used for the progress summary. */
function progressOf(stage: string, employmentVerified: boolean, decided: boolean) {
  if (stage === "Disbursed") return "Complete";
  if (stage === "Rejected") return "Closed";
  const done = 4 + (employmentVerified ? 1 : 0) + (decided ? 2 : 0);
  return done + " of 9";
}

export function ApplicationWorkspace() {
  const { id } = useParams();
  const { state } = useDemo();
  const [params, setParams] = useSearchParams();

  const application = state.applications.find((item) => item.id === id);
  if (!application) return <Navigate to="/applications" replace />;

  const customer = state.customers.find((item) => item.id === application.customerId);
  if (!customer) return <Navigate to="/applications" replace />;

  const requested = params.get("tab") ?? "Overview";
  const tab = (TABS as readonly string[]).includes(requested) ? requested : "Overview";
  const setTab = (value: string) => setParams({ tab: value }, { replace: true });

  return (
    <Shell>
      <div className="workspace">
        <div className="workspace-head">
          <div>
            <div>
              <h1>{customer.name}</h1>
              <Badge tone={statusTone(application.stage)}>{application.stage}</Badge>
            </div>
            <p>
              {application.id} · {application.product} · Submitted {application.submittedAt}
            </p>
          </div>
          <Popover
            align="right"
            label="Application actions"
            trigger={
              <>
                Actions <MoreHorizontal size={14} />
              </>
            }
          >
            {(close) => (
              <>
                <button className="popover-item" onClick={() => { close(); setTab("Decision"); }}>Go to decision</button>
                <button className="popover-item" onClick={() => { close(); toast.success("Assigned to Marie"); }}>Assign to me</button>
                <button className="popover-item" onClick={() => { close(); toast.success("Application exported"); }}>Export application</button>
                <button className="popover-item" onClick={() => { close(); toast("Escalated to Credit Manager"); }}>Escalate</button>
              </>
            )}
          </Popover>
        </div>

        <div className="summary">
          <Summary label="Requested" value={formatRwf(application.requested)} />
          <Summary label="Recommended" value={application.recommended ? formatRwf(application.recommended) : "—"} />
          <Summary label="Term" value={application.term + " months"} />
          <Summary label="Risk score" value={application.riskScore + " · " + application.risk + " Risk"} tone={riskTone(application.risk)} />
          <Summary label="Progress" value={progressOf(application.stage, application.employmentStatus === "Verified", application.decision !== "Pending")} />
        </div>

        <Tabs items={TABS} active={tab} onClick={setTab} />

        {tab === "Overview" && <Overview application={application} customer={customer} onTab={setTab} />}
        {tab === "KYC" && <Kyc application={application} customer={customer} />}
        {tab === "Documents" && <Documents application={application} />}
        {tab === "Employment" && <Employment application={application} customer={customer} />}
        {tab === "Credit" && <Credit application={application} />}
        {tab === "Decision" && <Decision application={application} customer={customer} />}
        {tab === "Activity" && <Activity application={application} />}
      </div>
    </Shell>
  );
}
