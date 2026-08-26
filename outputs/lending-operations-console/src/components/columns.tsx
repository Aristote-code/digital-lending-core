import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Avatar, Badge } from "./ui";
import { formatRwf } from "../lib/format";
import { riskTone } from "../lib/tone";
import type { Column } from "./DataTable";
import type { Application, DemoState } from "../types";

export function PersonCell({ state, customerId, subtitle, to }: { state: DemoState; customerId: string; subtitle: string; to?: string }) {
  const customer = state.customers.find((item) => item.id === customerId);
  const body = (
    <>
      <Avatar initials={customer?.initials ?? "?"} />
      <span>
        <strong>{customer?.name ?? customerId}</strong>
        <small>{subtitle}</small>
      </span>
    </>
  );
  return to ? (
    <Link className="person" to={to}>
      {body}
    </Link>
  ) : (
    <span className="person">{body}</span>
  );
}

export function applicationColumns(state: DemoState, extra: Column<Application>[] = []): Column<Application>[] {
  const named = (id: string) => state.customers.find((customer) => customer.id === id)?.name ?? "";
  return [
    { key: "customer", header: "Customer", sortValue: (row) => named(row.customerId), render: (row) => <PersonCell state={state} customerId={row.customerId} subtitle={row.id} to={"/applications/" + row.id} /> },
    { key: "stage", header: "Task", sortValue: (row) => row.stage, render: (row) => row.stage },
    { key: "amount", header: "Amount", sortValue: (row) => row.requested, render: (row) => formatRwf(row.requested, true) },
    { key: "risk", header: "Risk", sortValue: (row) => row.riskScore, render: (row) => <Badge tone={riskTone(row.risk)}>{row.risk}</Badge> },
    { key: "waiting", header: "Waiting", render: (row) => row.waiting },
    { key: "assigned", header: "Assigned", sortValue: (row) => row.assigned, render: (row) => row.assigned },
    ...extra,
    { key: "go", header: "", render: (row) => <Link className="icon-btn" to={"/applications/" + row.id} aria-label={"Open " + row.id}><ChevronRight size={15} /></Link> },
  ];
}
