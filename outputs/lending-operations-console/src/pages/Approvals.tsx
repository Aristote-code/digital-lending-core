import { Link } from "react-router-dom";
import { Shell } from "../layout/Shell";
import { Badge, PageHead } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { PersonCell } from "../components/columns";
import { formatRwf } from "../lib/format";
import { riskTone, statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { Application } from "../types";

export function Approvals() {
  const { state } = useDemo();
  const rows = state.applications.filter((item) => ["Approval", "Approved", "Credit Review"].includes(item.stage));

  const columns: Column<Application>[] = [
    { key: "applicant", header: "Applicant", sortValue: (row) => row.customerId, render: (row) => <PersonCell state={state} customerId={row.customerId} subtitle={row.id} to={"/applications/" + row.id} /> },
    { key: "requested", header: "Requested", align: "right", sortValue: (row) => row.requested, render: (row) => formatRwf(row.requested) },
    { key: "recommended", header: "Recommended", align: "right", sortValue: (row) => row.recommended, render: (row) => (row.recommended ? formatRwf(row.recommended) : "No offer") },
    { key: "risk", header: "Risk", sortValue: (row) => row.riskScore, render: (row) => <Badge tone={riskTone(row.risk)}>{row.risk}</Badge> },
    { key: "officer", header: "Loan officer", sortValue: (row) => row.assigned, render: (row) => row.assigned },
    { key: "approver", header: "Required approver", render: (row) => row.approver },
    { key: "waiting", header: "Waiting", render: (row) => row.waiting },
    { key: "decision", header: "Decision", sortValue: (row) => row.decision, render: (row) => <Badge tone={statusTone(row.decision)}>{row.decision}</Badge> },
    { key: "go", header: "", render: (row) => <Link className="btn small" to={"/applications/" + row.id + "?tab=Decision"}>Review</Link> },
  ];

  return (
    <Shell>
      <div className="page full">
        <PageHead title="Approval queue" description="Applications awaiting or recently receiving a final decision." />
        <section className="surface table-surface">
          <DataTable rows={rows} columns={columns} rowKey={(row) => row.id} empty={{ title: "Approval queue is clear", text: "No applications are waiting for a decision." }} />
        </section>
      </div>
    </Shell>
  );
}
