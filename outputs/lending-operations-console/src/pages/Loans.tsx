import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, PageHead, Tabs } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { formatRwf } from "../lib/format";
import { riskTone, statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { Loan, LoanStatus } from "../types";

const TABS = ["All", "Approved", "Active", "Overdue", "Restructured", "Closed"] as const;

function inTab(status: LoanStatus, tab: string) {
  if (tab === "All") return true;
  if (tab === "Overdue") return status === "Late" || status === "Defaulted";
  if (tab === "Closed") return status === "Paid" || status === "Closed";
  return status === tab;
}

export function Loans() {
  const { state } = useDemo();
  const [tab, setTab] = useState<string>("All");
  const [query, setQuery] = useState("");

  const named = (id: string) => state.customers.find((customer) => customer.id === id)?.name ?? id;
  const rows = state.loans.filter((loan) => inTab(loan.status, tab) && (loan.id + named(loan.customerId)).toLowerCase().includes(query.toLowerCase()));

  const columns: Column<Loan>[] = [
    { key: "id", header: "Loan", sortValue: (row) => row.id, render: (row) => <Link to={"/loans/" + row.id}>{row.id}</Link> },
    { key: "borrower", header: "Borrower", sortValue: (row) => named(row.customerId), render: (row) => named(row.customerId) },
    { key: "principal", header: "Principal", align: "right", sortValue: (row) => row.principal, render: (row) => formatRwf(row.principal) },
    { key: "outstanding", header: "Outstanding", align: "right", sortValue: (row) => row.outstanding, render: (row) => formatRwf(row.outstanding) },
    { key: "next", header: "Next payment", render: (row) => formatRwf(row.nextPayment) + " · " + row.nextDue },
    { key: "risk", header: "Risk", sortValue: (row) => row.risk, render: (row) => <Badge tone={riskTone(row.risk)}>{row.risk}</Badge> },
    { key: "status", header: "Status", sortValue: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "officer", header: "Officer", sortValue: (row) => row.officer, render: (row) => row.officer },
    { key: "go", header: "", render: (row) => <Link className="icon-btn" to={"/loans/" + row.id} aria-label={"Open " + row.id}><ChevronRight size={15} /></Link> },
  ];

  return (
    <Shell>
      <div className="page full">
        <PageHead title="Loans" description="Track approved, active, overdue, restructured, and closed loans." />
        <div className="toolbar">
          <div className="searchbox">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search loan ID or borrower…" aria-label="Search loans" />
          </div>
          <span>{rows.length} results</span>
        </div>
        <Tabs items={TABS} active={tab} onClick={setTab} />
        <section className="surface table-surface">
          <DataTable rows={rows} columns={columns} rowKey={(row) => row.id} pageSize={12} empty={{ title: "No loans in this view", text: "Try a different tab or clear the search." }} />
        </section>
      </div>
    </Shell>
  );
}
