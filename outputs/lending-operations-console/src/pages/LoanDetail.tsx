import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Banknote, CalendarDays, CircleDollarSign, FileText } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, EmptyState, KV, Notice, PageHead, SectionHead, Tabs, Timeline } from "../components/ui";
import { formatRwf } from "../lib/format";
import { statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { CollectionCase, Loan, ScheduleRow, Transaction } from "../types";

const TABS = ["Overview", "Schedule", "Payments", "Documents", "Collections", "Ledger", "Audit"] as const;

export function LoanDetail() {
  const { id } = useParams();
  const { state } = useDemo();
  const [params, setParams] = useSearchParams();

  const loan = state.loans.find((item) => item.id === id);
  if (!loan) return <Navigate to="/loans" replace />;
  const customer = state.customers.find((item) => item.id === loan.customerId);
  if (!customer) return <Navigate to="/loans" replace />;

  const requested = params.get("tab") ?? "Overview";
  const tab = (TABS as readonly string[]).includes(requested) ? requested : "Overview";
  const collectionCase = state.collections.find((item) => item.loanId === loan.id);
  const audit = state.audit.filter((event) => event.entityId === loan.id);

  return (
    <Shell>
      <div className="page">
        <PageHead
          eyebrow={loan.id}
          title={customer.name}
          description={formatRwf(loan.principal) + " · " + loan.term + " months · " + loan.officer}
          actions={<Badge tone={statusTone(loan.status)}>{loan.status}</Badge>}
        />

        <div className="metrics">
          <div className="metric static">
            <CircleDollarSign size={17} />
            <div>
              <strong>{formatRwf(loan.outstanding, true)}</strong>
              <span>Outstanding</span>
            </div>
          </div>
          <div className="metric static">
            <Banknote size={17} />
            <div>
              <strong>{formatRwf(loan.paidToDate, true)}</strong>
              <span>Paid to date</span>
            </div>
          </div>
          <div className="metric static">
            <CalendarDays size={17} />
            <div>
              <strong>{formatRwf(loan.nextPayment, true)}</strong>
              <span>Next · {loan.nextDue}</span>
            </div>
          </div>
        </div>

        <Tabs items={TABS} active={tab} onClick={(value) => setParams({ tab: value }, { replace: true })} />

        {tab === "Overview" && <LoanOverview loan={loan} />}
        {tab === "Schedule" && <Schedule loan={loan} />}
        {tab === "Payments" && <Payments loan={loan} />}
        {tab === "Documents" && <LoanDocuments />}
        {tab === "Collections" && <LoanCollections item={collectionCase} />}
        {tab === "Ledger" && <Ledger loan={loan} />}
        {tab === "Audit" && (
          <section className="surface timeline">
            <SectionHead title="Loan audit trail" description="Every recorded action on this loan" />
            {audit.length ? (
              audit.map((event) => <Timeline key={event.id} title={event.action} text={[event.actor, event.after, event.reason].filter(Boolean).join(" · ")} time={event.at} />)
            ) : (
              <EmptyState title="No audit events yet" text="Actions on this loan will appear here." />
            )}
          </section>
        )}
      </div>
    </Shell>
  );
}

function LoanOverview({ loan }: { loan: Loan }) {
  const total = loan.principal + loan.interest;
  return (
    <div className="content-grid">
      <section className="surface padded">
        <SectionHead title="Loan summary" description="Contracted terms" />
        <div className="kv-grid">
          <KV label="Principal" value={formatRwf(loan.principal)} />
          <KV label="Interest" value={formatRwf(loan.interest)} />
          <KV label="Fees" value={formatRwf(loan.fees)} />
          <KV label="Total repayable" value={formatRwf(total)} />
          <KV label="Term" value={loan.term + " months"} />
          <KV label="Instalment" value={formatRwf(loan.nextPayment)} />
        </div>
      </section>
      <section className="surface padded">
        <SectionHead title="Position" description="Current balance and status" />
        <div className="kv-grid">
          <KV label="Disbursed" value={loan.disbursedAt ?? "Not yet disbursed"} />
          <KV label="Destination" value={loan.destination} />
          <KV label="Outstanding" value={formatRwf(loan.outstanding)} />
          <KV label="Paid to date" value={formatRwf(loan.paidToDate)} good={loan.paidToDate > 0} />
          <KV label="Next due" value={loan.nextDue} />
          <KV label="Officer" value={loan.officer} />
        </div>
      </section>
      {loan.restructuredFrom && (
        <section className="surface padded span-2">
          <SectionHead title="Restructure history" description="The original terms are preserved" />
          <div className="comparison">
            <KV label="Original term" value={loan.restructuredFrom.term + " months"} />
            <KV label="Original instalment" value={formatRwf(loan.restructuredFrom.installment)} />
            <KV label="New term" value={loan.term + " months"} />
            <KV label="New instalment" value={formatRwf(loan.nextPayment)} />
          </div>
          <Notice title="Restructured " text={"Recorded " + loan.restructuredFrom.at} />
        </section>
      )}
    </div>
  );
}

function scheduleRows(loan: Loan) {
  return loan.schedule;
}

function Schedule({ loan }: { loan: Loan }) {
  const rows: ScheduleRow[] = scheduleRows(loan);
  if (!rows.length) {
    return (
      <section className="surface padded">
        <EmptyState title="No repayment schedule yet" text="A schedule is generated automatically when Finance disburses this loan." action={<Link className="btn primary" to="/finance/disbursements">Go to disbursement queue</Link>} />
      </section>
    );
  }

  return (
    <section className="surface table-surface">
      <SectionHead
        title="Repayment schedule"
        description={loan.term + "-month amortization schedule"}
        padded
        actions={
          <button className="btn small" onClick={() => toast.success("Schedule exported")}>
            Download
          </button>
        }
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Due</th>
              <th className="right">Principal</th>
              <th className="right">Interest</th>
              <th className="right">Total</th>
              <th className="right">Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.due}</td>
                <td className="right">{formatRwf(row.principal)}</td>
                <td className="right">{formatRwf(row.interest)}</td>
                <td className="right">
                  <strong>{formatRwf(row.total)}</strong>
                </td>
                <td className="right">{row.paid ? formatRwf(row.paid) : "—"}</td>
                <td>
                  <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Payments({ loan }: { loan: Loan }) {
  const paid = loan.schedule.filter((row) => row.status === "Paid");
  if (!paid.length) {
    return (
      <section className="surface padded">
        <EmptyState title="No payments received" text="Repayments will be listed here once the borrower starts paying." />
      </section>
    );
  }
  return (
    <section className="surface table-surface">
      <SectionHead title="Payments received" description={paid.length + " instalments settled"} padded />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Instalment</th>
              <th>Due</th>
              <th className="right">Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paid.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.due}</td>
                <td className="right">{formatRwf(row.paid)}</td>
                <td>{loan.destination.split(" · ")[0]}</td>
                <td>
                  <Badge tone="success">Paid</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LoanDocuments() {
  const documents = [
    { name: "Loan agreement", status: "Signed", detail: "Signed electronically by the borrower" },
    { name: "Repayment schedule", status: "Issued", detail: "Delivered with the agreement" },
    { name: "Disbursement instruction", status: "Issued", detail: "Finance release authorization" },
  ];
  return (
    <section className="surface padded">
      <SectionHead title="Loan documents" description="Contract pack issued for this facility" />
      {documents.map((document) => (
        <div className="doc-static" key={document.name}>
          <FileText size={17} />
          <span>
            <strong>{document.name}</strong>
            <small>{document.detail}</small>
          </span>
          <Badge tone="success">{document.status}</Badge>
        </div>
      ))}
    </section>
  );
}

function LoanCollections({ item }: { item?: CollectionCase }) {
  if (!item) {
    return (
      <section className="surface padded">
        <EmptyState title="No collection case" text="This loan is not in arrears." />
      </section>
    );
  }
  return (
    <section className="surface padded">
      <SectionHead title="Collection case" description={item.id} actions={<Badge tone={statusTone(item.status)}>{item.status}</Badge>} />
      <div className="kv-grid">
        <KV label="Days overdue" value={String(item.daysOverdue)} bad />
        <KV label="Amount overdue" value={formatRwf(item.amountOverdue)} bad />
        <KV label="Owner" value={item.owner} />
        <KV label="Next action" value={item.nextAction} />
      </div>
      <Link className="btn primary" to={"/collections/" + item.id}>
        Open collection case
      </Link>
    </section>
  );
}

function Ledger({ loan }: { loan: Loan }) {
  const entries: Transaction[] = loan.transactions;
  if (!entries.length) {
    return (
      <section className="surface padded">
        <EmptyState title="Ledger is empty" text="Money movement appears here once the loan is disbursed." />
      </section>
    );
  }
  return (
    <section className="surface table-surface">
      <SectionHead title="Ledger" description="Every franc in and out of this facility" padded />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Date</th>
              <th>Destination</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.id}</td>
                <td>{entry.type}</td>
                <td>{entry.at}</td>
                <td>{entry.reference}</td>
                <td className="right">
                  <strong className={entry.direction === "out" ? "" : "good"}>
                    {entry.direction === "out" ? "−" : "+"}
                    {formatRwf(entry.amount)}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
