import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "../layout/Shell";
import { Badge, Field, PageHead } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { Drawer, DrawerSection } from "../components/overlays";
import { can, denialReason } from "../lib/roles";
import { useDemo } from "../store";
import type { PolicyException } from "../types";

const tone = (status: PolicyException["status"]) => (status === "Approved" ? "success" : status === "Declined" ? "danger" : "warning");

/**
 * s36: every deviation from the credit policy is identified, justified, approved
 * and recorded. Repeated exceptions are the signal that the policy itself needs
 * revisiting, which is why the register is a destination and not a footnote.
 */
export function Exceptions() {
  const { state, dispatch } = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = state.exceptions.find((item) => item.id === openId) ?? null;
  const permitted = can(state.activeRole, "approveException");

  const columns: Column<PolicyException>[] = [
    { key: "id", header: "Exception", render: (row) => <span className="mono">{row.id}</span> },
    { key: "entity", header: "Facility", sortValue: (row) => row.entityLabel, render: (row) => row.entityLabel },
    { key: "type", header: "Type", sortValue: (row) => row.type, render: (row) => row.type },
    { key: "detail", header: "Breach", render: (row) => row.detail },
    { key: "raised", header: "Raised by", render: (row) => row.raisedBy },
    { key: "at", header: "Raised", render: (row) => row.at },
    { key: "status", header: "Status", sortValue: (row) => row.status, render: (row) => <Badge tone={tone(row.status)}>{row.status}</Badge> },
  ];

  const open = state.exceptions.filter((item) => item.status === "Open").length;

  const resolve = (status: "Approved" | "Declined") => {
    if (!selected) return;
    dispatch({ type: "RESOLVE_EXCEPTION", exceptionId: selected.id, status, note: selected.justification });
    setOpenId(null);
    if (status === "Approved") toast.success("Exception approved and registered");
    else toast.error("Exception declined");
  };

  return (
    <Shell>
      <div className="page full">
        <PageHead
          title="Exception register"
          description="Deviations from the credit policy, with the justification and the officer who approved them."
        />
        <div className="metrics">
          <div className="metric static">
            <div>
              <strong>{open}</strong>
              <span>Awaiting approval</span>
            </div>
          </div>
          <div className="metric static">
            <div>
              <strong>{state.exceptions.filter((item) => item.status === "Approved").length}</strong>
              <span>Approved</span>
            </div>
          </div>
          <div className="metric static">
            <div>
              <strong>{state.exceptions.length}</strong>
              <span>Registered in total</span>
            </div>
          </div>
        </div>
        <section className="surface table-surface">
          <DataTable
            rows={state.exceptions}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) => setOpenId(row.id)}
            empty={{ title: "No exceptions registered", text: "Every facility approved so far sat within policy." }}
          />
        </section>
      </div>

      {selected && (
        <Drawer
          open
          onClose={() => setOpenId(null)}
          title={selected.type}
          description={selected.entityLabel + " · raised " + selected.at}
          badge={<Badge tone={tone(selected.status)}>{selected.status}</Badge>}
          size="md"
          footer={
            selected.status === "Open" ? (
              <>
                <button className="btn danger" disabled={!permitted} onClick={() => resolve("Declined")}>
                  Decline
                </button>
                <button className="btn primary" disabled={!permitted} onClick={() => resolve("Approved")}>
                  Approve exception
                </button>
              </>
            ) : (
              <span className="drawer-empty">Resolved by {selected.approvedBy}</span>
            )
          }
        >
          {!permitted && selected.status === "Open" && (
            <DrawerSection flush>
              <div className="gate">
                <span>
                  <strong>You cannot resolve this exception</strong>
                  {denialReason(state.activeRole, "approveException")}
                </span>
              </div>
            </DrawerSection>
          )}
          <DrawerSection title="Breach">
            <p className="drawer-empty">{selected.detail}</p>
          </DrawerSection>
          <DrawerSection title="Justification">
            <p className="drawer-empty">{selected.justification}</p>
          </DrawerSection>
          <DrawerSection title="Record">
            <div className="field-grid">
              <Field label="Raised by" value={selected.raisedBy} />
              <Field label="Raised" value={selected.at} />
              <Field label="Facility" value={selected.entityId} />
              <Field label="Approved by" value={selected.approvedBy ?? "Pending"} />
            </div>
          </DrawerSection>
        </Drawer>
      )}
    </Shell>
  );
}
