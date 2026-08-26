import { Link } from "react-router-dom";
import { Gauge } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, PageHead, SectionHead } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { formatRwf } from "../lib/format";
import { statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { CollectionCase, DemoState } from "../types";

const BUCKETS = [
  { label: "Current", test: (days: number) => days === 0 },
  { label: "1–30", test: (days: number) => days >= 1 && days <= 30 },
  { label: "31–60", test: (days: number) => days >= 31 && days <= 60 },
  { label: "61–90", test: (days: number) => days >= 61 && days <= 90 },
  { label: "90+", test: (days: number) => days > 90 },
];

/** Portfolio at risk: outstanding on loans past due beyond the threshold, over total outstanding. */
function par(state: DemoState, days: number) {
  const total = state.loans.reduce((sum, loan) => sum + loan.outstanding, 0);
  if (!total) return "0.0%";
  const overdue = state.loans
    .filter((loan) => ["Late", "Defaulted"].includes(loan.status))
    .filter((loan) => (state.collections.find((item) => item.loanId === loan.id)?.daysOverdue ?? 30) >= days)
    .reduce((sum, loan) => sum + loan.outstanding, 0);
  return ((overdue / total) * 100).toFixed(1) + "%";
}

function ageing(state: DemoState) {
  const overdueLoans = state.loans.filter((loan) => ["Late", "Defaulted"].includes(loan.status));
  const daysFor = (loanId: string) => state.collections.find((item) => item.loanId === loanId)?.daysOverdue ?? 30;
  const totalOutstanding = state.loans.reduce((sum, loan) => sum + loan.outstanding, 0) || 1;
  const overdueOutstanding = overdueLoans.reduce((sum, loan) => sum + loan.outstanding, 0);

  return BUCKETS.map((bucket) => {
    const amount = bucket.label === "Current"
      ? totalOutstanding - overdueOutstanding
      : overdueLoans.filter((loan) => bucket.test(daysFor(loan.id))).reduce((sum, loan) => sum + loan.outstanding, 0);
    return { label: bucket.label, amount, share: Math.round((amount / totalOutstanding) * 100) };
  });
}

export function Collections() {
  const { state } = useDemo();
  const named = (id: string) => state.customers.find((customer) => customer.id === id)?.name ?? id;
  const buckets = ageing(state);

  const columns: Column<CollectionCase>[] = [
    { key: "borrower", header: "Borrower", sortValue: (row) => named(row.customerId), render: (row) => named(row.customerId) },
    { key: "loan", header: "Loan", render: (row) => <Link to={"/loans/" + row.loanId}>{row.loanId}</Link> },
    { key: "overdue", header: "Overdue", sortValue: (row) => row.daysOverdue, render: (row) => <Badge tone="danger">{row.daysOverdue} days</Badge> },
    { key: "amount", header: "Amount", align: "right", sortValue: (row) => row.amountOverdue, render: (row) => formatRwf(row.amountOverdue) },
    { key: "status", header: "Status", sortValue: (row) => row.status, render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "owner", header: "Owner", render: (row) => row.owner },
    { key: "next", header: "Next action", render: (row) => row.nextAction },
    { key: "go", header: "", render: (row) => <Link className="btn small" to={"/collections/" + row.id}>Open</Link> },
  ];

  return (
    <Shell>
      <div className="page">
        <PageHead title="Collections" description="Prioritize overdue exposure and next actions." />

        <div className="metrics">
          {[["PAR 1", 1], ["PAR 30", 30], ["PAR 60", 60], ["PAR 90", 90]].map(([label, days]) => (
            <div className="metric static" key={label as string}>
              <Gauge size={17} />
              <div>
                <strong>{par(state, days as number)}</strong>
                <span>{label as string}</span>
              </div>
            </div>
          ))}
          <div className="metric static">
            <Gauge size={17} />
            <div>
              <strong>{state.collections.filter((item) => item.status !== "Closed").length}</strong>
              <span>Open cases</span>
            </div>
          </div>
        </div>

        <section className="surface padded">
          <SectionHead title="Portfolio ageing" description="Outstanding balance by days past due" />
          {buckets.map((bucket) => (
            <div className="age" key={bucket.label}>
              <span>{bucket.label}</span>
              <div className="bar">
                <i style={{ width: Math.max(bucket.share, 1) + "%" }} />
              </div>
              <strong>{bucket.share}%</strong>
              <em>{formatRwf(bucket.amount, true)}</em>
            </div>
          ))}
        </section>

        <section className="surface table-surface">
          <SectionHead title="Overdue cases" description="Ageing and ownership as of 27 Aug 2026" padded />
          <DataTable rows={state.collections} columns={columns} rowKey={(row) => row.id} empty={{ title: "No overdue cases", text: "Every borrower is current." }} />
        </section>
      </div>
    </Shell>
  );
}
