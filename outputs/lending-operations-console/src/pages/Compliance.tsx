import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, Field, Notice, PageHead, SectionHead } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { Drawer, DrawerSection } from "../components/overlays";
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
          <DataTable
            rows={state.complianceCases}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) => setOpenId(row.id)}
            empty={{ title: "No compliance cases", text: "Nothing requires review right now." }}
          />
        </section>
      </div>

      {selected && (
        <Drawer
          open
          onClose={() => setOpenId(null)}
          title={selected.customerName}
          description={selected.id + " · " + selected.type}
          badge={<Badge tone={statusTone(selected.status)}>{selected.status}</Badge>}
          size="md"
          footer={
            <>
              <button className="btn danger" disabled={selected.status === "Escalated"} onClick={() => resolve("Escalated")}>
                Escalate
              </button>
              <button className="btn primary" disabled={selected.status === "Cleared"} onClick={() => resolve("Cleared")}>
                Clear case
              </button>
            </>
          }
        >
          <DrawerSection title="Exception">
            <Notice title={selected.severity + "-severity exception"} text={selected.note} />
          </DrawerSection>
          <DrawerSection title="Case detail">
            <div className="field-grid">
              <Field label="Case" value={selected.id} />
              <Field label="Opened" value={selected.openedAt} />
              <Field label="Owner" value={selected.owner} />
              <Field label="Severity" value={selected.severity} bad={selected.severity === "High"} />
              <Field label="Status" value={selected.status} />
              <Field label="Customer" value={selected.customerName} />
            </div>
          </DrawerSection>
        </Drawer>
      )}
    </Shell>
  );
}
