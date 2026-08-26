import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, KV, PageHead, Tabs } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { AlertDialog, Sheet } from "../components/overlays";
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
    {
      key: "action",
      header: "",
      render: (row) => (
        <button className="btn small" onClick={() => setSelectedId(row.id)}>
          Review
        </button>
      ),
    },
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
            empty={{ title: tab === "Ready" ? "Nothing to disburse" : "No disbursements yet", text: tab === "Ready" ? "Approved loans appear here once credit signs off." : "Completed disbursements will be listed here." }}
          />
        </section>
      </div>

      <Sheet
        open={Boolean(selected) && !confirming}
        onClose={() => setSelectedId(null)}
        title="Disbursement"
        description={selected ? selected.id + " · " + formatRwf(selected.principal) : ""}
      >
        <div className="checklist">
          {CHECKLIST.map((item) => (
            <p key={item}>
              <CheckCircle2 size={16} />
              {item}
            </p>
          ))}
        </div>
        <div className="sheet-section">
          <KV label="Borrower" value={selected ? named(selected.customerId) : ""} />
          <KV label="Destination" value={selected?.destination ?? ""} />
          <KV label="Amount" value={selected ? formatRwf(selected.principal) : ""} />
          <KV label="Term" value={selected ? selected.term + " months" : ""} />
        </div>
        <button className="btn primary full-btn" disabled={selected?.disbursementStatus === "Completed"} onClick={() => setConfirming(true)}>
          {selected?.disbursementStatus === "Completed" ? "Already disbursed" : "Approve disbursement"}
        </button>
      </Sheet>

      <AlertDialog
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
