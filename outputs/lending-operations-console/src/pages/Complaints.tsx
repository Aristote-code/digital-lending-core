import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "../layout/Shell";
import { Badge, Field, PageHead } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { Drawer, DrawerSection } from "../components/overlays";
import { can, denialReason } from "../lib/roles";
import { useDemo } from "../store";
import type { Complaint } from "../types";

const tone = (status: Complaint["status"]) => (status === "Resolved" ? "success" : status === "Received" ? "warning" : "neutral");

/** s44: borrowers must have access to a complaints mechanism, and it must be tracked. */
export function Complaints() {
  const { state, dispatch } = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const selected = state.complaints.find((item) => item.id === openId) ?? null;
  const permitted = can(state.activeRole, "handleComplaint");

  const columns: Column<Complaint>[] = [
    { key: "id", header: "Complaint", render: (row) => <span className="mono">{row.id}</span> },
    { key: "customer", header: "Customer", sortValue: (row) => row.customerName, render: (row) => row.customerName },
    { key: "subject", header: "Subject", render: (row) => row.subject },
    { key: "channel", header: "Channel", render: (row) => row.channel },
    { key: "received", header: "Received", render: (row) => row.receivedAt },
    { key: "owner", header: "Owner", render: (row) => row.owner },
    { key: "status", header: "Status", sortValue: (row) => row.status, render: (row) => <Badge tone={tone(row.status)}>{row.status}</Badge> },
  ];

  const advance = (status: "Acknowledged" | "Investigating" | "Resolved") => {
    if (!selected) return;
    dispatch({ type: "RESOLVE_COMPLAINT", complaintId: selected.id, status, resolution: status === "Resolved" ? resolution || "Resolved with the borrower." : undefined });
    setResolution("");
    if (status === "Resolved") {
      setOpenId(null);
      toast.success("Complaint resolved");
    } else {
      toast.success("Complaint " + status.toLowerCase());
    }
  };

  return (
    <Shell>
      <div className="page full">
        <PageHead title="Complaints" description="Customer complaints, their handling and turnaround." />
        <div className="metrics">
          {(["Received", "Acknowledged", "Investigating", "Resolved"] as const).map((status) => (
            <div className="metric static" key={status}>
              <div>
                <strong>{state.complaints.filter((item) => item.status === status).length}</strong>
                <span>{status}</span>
              </div>
            </div>
          ))}
        </div>
        <section className="surface table-surface">
          <DataTable
            rows={state.complaints}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) => setOpenId(row.id)}
            empty={{ title: "No complaints", text: "Nothing has been raised by a borrower." }}
          />
        </section>
      </div>

      {selected && (
        <Drawer
          open
          onClose={() => setOpenId(null)}
          title={selected.subject}
          description={selected.customerName + " · " + selected.id + " · received " + selected.receivedAt}
          badge={<Badge tone={tone(selected.status)}>{selected.status}</Badge>}
          size="md"
          footer={
            selected.status === "Resolved" ? (
              <span className="drawer-empty">Resolved {selected.resolvedAt}</span>
            ) : (
              <>
                {selected.status === "Received" && (
                  <button className="btn" disabled={!permitted} onClick={() => advance("Acknowledged")}>
                    Acknowledge
                  </button>
                )}
                {selected.status !== "Investigating" && (
                  <button className="btn" disabled={!permitted} onClick={() => advance("Investigating")}>
                    Investigate
                  </button>
                )}
                <button className="btn primary" disabled={!permitted} onClick={() => advance("Resolved")}>
                  Resolve
                </button>
              </>
            )
          }
        >
          {!permitted && (
            <DrawerSection flush>
              <div className="gate">
                <span>
                  <strong>You cannot handle complaints</strong>
                  {denialReason(state.activeRole, "handleComplaint")}
                </span>
              </div>
            </DrawerSection>
          )}
          <DrawerSection title="What the borrower said">
            <p className="drawer-empty">{selected.detail}</p>
          </DrawerSection>
          <DrawerSection title="Record">
            <div className="field-grid">
              <Field label="Customer" value={selected.customerName} />
              <Field label="Channel" value={selected.channel} />
              <Field label="Received" value={selected.receivedAt} />
              <Field label="Owner" value={selected.owner} />
            </div>
          </DrawerSection>
          {selected.status !== "Resolved" && permitted && (
            <DrawerSection title="Resolution">
              <label className="stacked">
                Outcome recorded for the borrower
                <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="What was done, and what the borrower was told." />
              </label>
            </DrawerSection>
          )}
          {selected.resolution && (
            <DrawerSection title="Resolution">
              <p className="drawer-empty">{selected.resolution}</p>
            </DrawerSection>
          )}
        </Drawer>
      )}
    </Shell>
  );
}
