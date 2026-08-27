import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, Field, PageHead, Tabs } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { ConfirmDialog, Drawer, DrawerSection } from "../components/overlays";
import { formatRwf } from "../lib/format";
import { statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { Loan } from "../types";

const CHECKLIST = ["Loan approved", "Agreement signed", "Conditions satisfied", "Compliance cleared", "Payment details verified"];
const TABS = ["Ready", "Completed"] as const;

export function Disbursements() {
  const { state, dispatch } = useDemo();
  const [tab, setTab] = useState<string>("Ready");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = state.loans.find((item) => item.id === selectedId) ?? null;
  const rows = state.loans.filter((loan) => (tab === "Ready" ? loan.disbursementStatus === "Ready" : loan.disbursementStatus === "Completed"));
  const named = (id: string) => state.customers.find((customer) => customer.id === id)?.name ?? id;

  useEffect(() => {
    if (!busy || !selected) return;
    const timer = setTimeout(() => {
      dispatch({ type: "DISBURSE", loanId: selected.id });
      setBusy(false);
      setConfirming(false);
      setSelectedId(null);
      toast.success("Disbursement successful · " + formatRwf(selected.principal) + " released");
    }, 900);
    return () => clearTimeout(timer);
  }, [busy, selected, dispatch]);

  const columns: Column<Loan>[] = [
    { key: "loan", header: "Loan", sortValue: (row) => row.id, render: (row) => row.id },
    { key: "borrower", header: "Borrower", sortValue: (row) => named(row.customerId), render: (row) => named(row.customerId) },
    { key: "amount", header: "Amount", align: "right", sortValue: (row) => row.principal, render: (row) => formatRwf(row.principal) },
    { key: "agreement", header: "Agreement", render: () => <Badge tone="success">Signed</Badge> },
    { key: "compliance", header: "Compliance", render: () => <Badge tone="success">Cleared</Badge> },
    { key: "destination", header: "Destination", render: (row) => row.destination },
    { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.disbursementStatus)}>{row.disbursementStatus}</Badge> },
  ];

  return (
    <Shell>
      <div className="page full">
        <PageHead title="Disbursement queue" description="Finance checks and releases approved loans." />
        <Tabs items={TABS} active={tab} onClick={setTab} />
        <section className="surface table-surface">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            pageSize={12}
            onRowClick={(row) => setSelectedId(row.id)}
            empty={{ title: tab === "Ready" ? "Nothing to disburse" : "No disbursements yet", text: tab === "Ready" ? "Approved loans appear here once credit signs off." : "Completed disbursements will be listed here." }}
          />
        </section>
      </div>

      {selected && (
        <Drawer
          open={!confirming}
          onClose={() => setSelectedId(null)}
          title={named(selected.customerId)}
          description={selected.id + " · " + formatRwf(selected.principal) + " over " + selected.term + " months"}
          badge={<Badge tone={statusTone(selected.disbursementStatus)}>{selected.disbursementStatus}</Badge>}
          size="md"
          footer={
            <button className="btn primary" disabled={selected.disbursementStatus === "Completed"} onClick={() => setConfirming(true)}>
              {selected.disbursementStatus === "Completed" ? "Already disbursed" : "Approve disbursement"}
            </button>
          }
        >
          <DrawerSection title="Pre-disbursement checks">
            <div className="checklist">
              {CHECKLIST.map((item) => (
                <p key={item}>
                  <CheckCircle2 size={15} />
                  {item}
                </p>
              ))}
            </div>
          </DrawerSection>
          <DrawerSection title="Payment">
            <div className="field-grid">
              <Field label="Borrower" value={named(selected.customerId)} />
              <Field label="Destination" value={selected.destination} />
              <Field label="Amount" value={formatRwf(selected.principal)} />
              <Field label="Term" value={selected.term + " months"} />
              <Field label="Instalment" value={formatRwf(selected.nextPayment)} />
              <Field label="Officer" value={selected.officer} />
            </div>
          </DrawerSection>
        </Drawer>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title={selected ? "Disburse " + formatRwf(selected.principal) + "?" : "Confirm disbursement"}
        description={selected ? named(selected.customerId) + " · " + selected.destination : ""}
        warning="This simulated financial action activates the loan, generates the repayment schedule, and is recorded in the audit log."
        confirmLabel="Confirm disbursement"
        busy={busy}
        onConfirm={() => setBusy(true)}
      />
    </Shell>
  );
}
