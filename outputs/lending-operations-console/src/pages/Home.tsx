import { Link } from "react-router-dom";
import { AlertTriangle, Building2, CalendarDays, ChevronRight, FileCheck2, FileText, Gauge, HandCoins, Landmark, Scale } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, PageHead, SectionHead } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { applicationColumns } from "../components/columns";
import { formatRwf } from "../lib/format";
import { statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { CollectionCase, DemoState, Loan, StaffRole } from "../types";

type Metric = { label: string; value: number; icon: typeof FileText; to: string };

function metricsFor(role: StaffRole, state: DemoState): Metric[] {
  const open = state.applications.filter((item) => !["Approved", "Rejected", "Disbursed"].includes(item.stage));
  const docs = state.applications.reduce((sum, item) => sum + item.documents.filter((doc) => doc.status === "Uploaded").length, 0);
  const employment = state.applications.filter((item) => item.employmentStatus === "Pending").length;
  const decisions = state.applications.filter((item) => item.stage === "Credit Review" && item.decision === "Pending").length;
  const escalated = state.applications.filter((item) => item.redFlags.length > 0).length;

  if (role === "Finance") {
    const ready = state.loans.filter((item) => item.disbursementStatus === "Ready");
    return [
      { label: "Awaiting disbursement", value: ready.length, icon: Landmark, to: "/finance/disbursements" },
      { label: "Disbursed today", value: state.loans.filter((item) => item.disbursedAt?.startsWith("27 Aug")).length, icon: FileCheck2, to: "/finance/disbursements" },
      { label: "Active loans", value: state.loans.filter((item) => item.status === "Active").length, icon: Gauge, to: "/loans" },
    ];
  }
  if (role === "Collections") {
    return [
      { label: "Open cases", value: state.collections.filter((item) => item.status === "Open").length, icon: HandCoins, to: "/collections" },
      { label: "Promises to monitor", value: state.collections.filter((item) => item.status === "Promise to pay").length, icon: CalendarDays, to: "/collections" },
      { label: "Overdue loans", value: state.loans.filter((item) => ["Late", "Defaulted"].includes(item.status)).length, icon: AlertTriangle, to: "/loans" },
    ];
  }
  if (role === "Compliance") {
    return [
      { label: "Open cases", value: state.complianceCases.filter((item) => item.status !== "Closed" && item.status !== "Cleared").length, icon: Scale, to: "/compliance" },
      { label: "High severity", value: state.complianceCases.filter((item) => item.severity === "High").length, icon: AlertTriangle, to: "/compliance" },
      { label: "KYC pending", value: state.customers.filter((item) => item.kyc === "Pending").length, icon: FileCheck2, to: "/compliance" },
    ];
  }
  if (role === "Credit Manager") {
    return [
      { label: "Awaiting decision", value: decisions, icon: Gauge, to: "/approvals" },
      { label: "In approval queue", value: state.applications.filter((item) => item.stage === "Approval").length, icon: FileText, to: "/approvals" },
      { label: "Escalated", value: escalated, icon: AlertTriangle, to: "/approvals" },
    ];
  }
  return [
    { label: "New applications", value: open.length, icon: FileText, to: "/applications" },
    { label: "Documents to review", value: docs, icon: FileCheck2, to: "/applications" },
    { label: "Employer verifications", value: employment, icon: Building2, to: "/applications" },
    { label: "Credit decisions", value: decisions, icon: Gauge, to: "/applications" },
    { label: "Escalated", value: escalated, icon: AlertTriangle, to: "/applications" },
  ];
}

function collectionColumns(state: DemoState): Column<CollectionCase>[] {
  const named = (id: string) => state.customers.find((customer) => customer.id === id)?.name ?? id;
  return [
    { key: "customer", header: "Borrower", sortValue: (row) => named(row.customerId), render: (row) => named(row.customerId) },
    { key: "loan", header: "Loan", render: (row) => row.loanId },
    { key: "overdue", header: "Overdue", sortValue: (row) => row.daysOverdue, render: (row) => <Badge tone="danger">{row.daysOverdue} days</Badge> },
    { key: "amount", header: "Amount", sortValue: (row) => row.amountOverdue, render: (row) => formatRwf(row.amountOverdue) },
    { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
    { key: "go", header: "", render: (row) => <Link className="btn small" to={"/collections/" + row.id}>Open</Link> },
  ];
}

function loanColumns(state: DemoState): Column<Loan>[] {
  const named = (id: string) => state.customers.find((customer) => customer.id === id)?.name ?? id;
  return [
    { key: "loan", header: "Loan", render: (row) => <Link to={"/loans/" + row.id}>{row.id}</Link> },
    { key: "customer", header: "Borrower", sortValue: (row) => named(row.customerId), render: (row) => named(row.customerId) },
    { key: "amount", header: "Amount", sortValue: (row) => row.principal, render: (row) => formatRwf(row.principal) },
    { key: "destination", header: "Destination", render: (row) => row.destination },
    { key: "status", header: "Status", render: (row) => <Badge tone={statusTone(row.disbursementStatus)}>{row.disbursementStatus}</Badge> },
    { key: "go", header: "", render: (row) => <Link className="btn small" to="/finance/disbursements">Review</Link> },
  ];
}

export function Home() {
  const { state } = useDemo();
  const role = state.activeRole;
  const metrics = metricsFor(role, state);
  const total = metrics.reduce((sum, metric) => sum + metric.value, 0);

  const queue =
    role === "Collections"
      ? { title: "Cases needing action", description: "Overdue exposure ordered by ageing", node: <DataTable rows={state.collections} columns={collectionColumns(state)} rowKey={(row) => row.id} empty={{ title: "No open cases", text: "Every collection case is settled." }} /> }
      : role === "Finance"
        ? { title: "Ready to disburse", description: "Approved loans awaiting release", node: <DataTable rows={state.loans.filter((item) => item.disbursementStatus === "Ready")} columns={loanColumns(state)} rowKey={(row) => row.id} empty={{ title: "Queue is clear", text: "No approved loans are waiting for disbursement." }} /> }
        : {
          title: "Due today",
          description: "Prioritized across your active queues",
          node: (
            <DataTable
              rows={state.applications.filter((item) => (role === "Credit Manager" ? item.decision === "Pending" && ["Credit Review", "Approval"].includes(item.stage) : !["Approved", "Rejected", "Disbursed"].includes(item.stage)))}
              columns={applicationColumns(state)}
              rowKey={(row) => row.id}
              pageSize={6}
              empty={{ title: "Nothing due today", text: "Your queues are clear." }}
            />
          ),
        };

  return (
    <Shell>
      <div className="page">
        <PageHead
          eyebrow="MY WORK"
          title="Good morning, Marie"
          description={total + " items need your attention"}
          actions={
            <button className="btn">
              <CalendarDays size={15} />
              27 Aug 2026
            </button>
          }
        />
        <div className="metrics">
          {metrics.map((metric) => (
            <Link to={metric.to} className="metric" key={metric.label}>
              <metric.icon size={17} />
              <div>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
              <ChevronRight size={15} />
            </Link>
          ))}
        </div>
        <section className="surface">
          <SectionHead title={queue.title} description={queue.description} />
          {queue.node}
        </section>
      </div>
    </Shell>
  );
}
