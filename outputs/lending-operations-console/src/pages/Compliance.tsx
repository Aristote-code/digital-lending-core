import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, KV, Notice, PageHead, SectionHead } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { Sheet } from "../components/overlays";
import { riskTone, statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { ComplianceCase } from "../types";

export function Compliance() {
  const { state, dispatch } = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = state.complianceCases.find((item) => item.id === openId) ?? null;

  const metrics = [
    { label: "Open cases", value: state.complianceCases.filter((item) => !["Cleared", "Closed"].includes(item.status)).length },
    { label: "High severity", value: state.complianceCases.filter((item) => item.severity === "High").length },
    { label: "KYC pending", value: state.customers.filter((item) => item.kyc === "Pending").length },
    { label: "High-risk borrowers", value: state.customers.filter((item) => item.risk === "High").length },
    { label: "Failed verifications", value: state.applications.filter((item) => item.employmentStatus === "Failed").length },
  ];

  const columns: Column<ComplianceCase>[] = [
    { key: "id", header: "Case", sortValue: (row) => row.id, render: (row) => row.id },
    { key: "customer", header: "Customer", sortValue: (row) => row.customerName, render: (row) => row.customerName },
    { key: "type", header: "Type", sortValue: (row) => row.type, render: (row) => row.type },
    { key: "severity", header: "Severity", sortValue: (row) => row.severity, render: (row) => <Badge tone={riskTone(row.severity)}>{row.severity}</Badge> },
    { key: "status", header: "Status", sortValue: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "owner", header: "Owner", render: (row) => row.owner },
    { key: "opened", header: "Opened", render: (row) => row.openedAt },
    {
      key: "action",
      header: "",
      render: (row) => (
        <button className="btn small" onClick={() => setOpenId(row.id)}>
          Review
        </button>
      ),
    },
  ];

  const resolve = (status: "Cleared" | "Escalated") => {
    if (!selected) return;
    dispatch({ type: "RESOLVE_COMPLIANCE", caseId: selected.id, status, note: status === "Cleared" ? "Reviewed; no further action required." : "Escalated for senior compliance review." });
    setOpenId(null);
    if (status === "Cleared") toast.success("Case cleared");
    else toast.error("Case escalated");
  };

  return (
    <Shell>
      <div className="page">
        <PageHead title="Compliance" description="Monitor KYC, AML, document, and customer-protection exceptions." />
        <div className="metrics">
          {metrics.map((metric) => (
            <div className="metric static" key={metric.label}>
              <ShieldCheck size={17} />
              <div>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            </div>
          ))}
        </div>
        <section className="surface table-surface">
          <SectionHead title="Compliance cases" description="Open → Investigate → Clear or escalate → Close" padded />
          <DataTable rows={state.complianceCases} columns={columns} rowKey={(row) => row.id} empty={{ title: "No compliance cases", text: "Nothing requires review right now." }} />
        </section>
      </div>

      <Sheet open={Boolean(selected)} onClose={() => setOpenId(null)} title={"Compliance case " + (selected?.id ?? "")} description={selected ? selected.type + " · " + selected.customerName : ""}>
        {selected && (
          <>
            <Notice title={selected.severity + "-severity exception"} text={selected.note} />
            <div className="sheet-section">
              <KV label="Opened" value={selected.openedAt} />
              <KV label="Owner" value={selected.owner} />
              <KV label="Status" value={selected.status} />
              <KV label="Customer" value={selected.customerName} />
            </div>
            <button className="btn primary full-btn" disabled={selected.status === "Cleared"} onClick={() => resolve("Cleared")}>
              Clear case
            </button>
            <button className="btn danger full-btn" disabled={selected.status === "Escalated"} onClick={() => resolve("Escalated")}>
              Escalate
            </button>
          </>
        )}
      </Sheet>
    </Shell>
  );
}
