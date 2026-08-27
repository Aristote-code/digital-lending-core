import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Shell } from "../layout/Shell";
import { Badge, KV, Notice, PageHead, SectionHead, Timeline } from "../components/ui";
import { DropdownMenu, MenuItem, MenuSeparator } from "../components/overlays";
import { ContactDialog, EscalateDialog, PromiseDialog, RestructureDialog } from "../components/actions";
import { formatRwf } from "../lib/format";
import { statusTone } from "../lib/tone";
import { useDemo } from "../store";

export function CollectionCase() {
  const { id } = useParams();
  const { state } = useDemo();
  const [contactOpen, setContactOpen] = useState(false);
  const [promiseOpen, setPromiseOpen] = useState(false);
  const [restructureOpen, setRestructureOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  const item = state.collections.find((entry) => entry.id === id);
  if (!item) return <Navigate to="/collections" replace />;
  const customer = state.customers.find((entry) => entry.id === item.customerId);
  const loan = state.loans.find((entry) => entry.id === item.loanId);
  if (!customer || !loan) return <Navigate to="/collections" replace />;

  return (
    <Shell>
      <div className="page">
        <PageHead
          eyebrow={item.id + " · " + item.loanId}
          title={customer.name}
          description={item.daysOverdue + " days overdue · " + customer.phone}
          actions={<Badge tone={statusTone(item.status)}>{item.status}</Badge>}
        />

        <div className="collection-hero">
          <div>
            <span>Amount overdue</span>
            <strong>{formatRwf(item.amountOverdue)}</strong>
          </div>
          <KV label="Last contact" value={item.lastContact} />
          <KV label="Owner" value={item.owner} />
          <KV label="Next action" value={item.nextAction} />
          <KV label="Promise" value={item.promiseDate ? item.promiseDate + " · " + formatRwf(item.promiseAmount ?? 0) : "None"} good={Boolean(item.promiseDate)} />
        </div>

        {item.status === "Promise to pay" && (
          <Notice good title={"Promise recorded for " + item.promiseDate} text="The case reopens automatically if the promise is broken." />
        )}

        {/* One primary action, one common secondary, everything else behind the overflow —
            a row of five equal-weight buttons tells you nothing about what to do next. */}
        <div className="actionbar">
          <button className="btn primary" onClick={() => setContactOpen(true)}>
            Record contact
          </button>
          <button className="btn" onClick={() => setPromiseOpen(true)}>
            Promise to pay
          </button>
          <DropdownMenu label="More case actions">
            {(close) => (
              <>
                <MenuItem onSelect={() => { close(); toast.success("SMS reminder sent to " + customer.phone); }}>Send reminder</MenuItem>
                <MenuItem onSelect={() => { close(); setRestructureOpen(true); }} disabled={item.status === "Restructured"}>
                  Restructure loan
                </MenuItem>
                <MenuSeparator />
                <MenuItem destructive onSelect={() => { close(); setEscalateOpen(true); }} disabled={item.status === "Escalated"}>
                  Escalate to compliance
                </MenuItem>
              </>
            )}
          </DropdownMenu>
        </div>

        <section className="surface timeline">
          <SectionHead title="Collection timeline" description="Contact and payment events" />
          {item.events.map((event) => (
            <Timeline key={event.id} title={event.type} text={event.note + " · " + event.actor} time={event.at} />
          ))}
        </section>
      </div>

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} item={item} phone={customer.phone} name={customer.name} />
      <PromiseDialog open={promiseOpen} onClose={() => setPromiseOpen(false)} item={item} />
      <RestructureDialog open={restructureOpen} onClose={() => setRestructureOpen(false)} item={item} loan={loan} />

      <EscalateDialog open={escalateOpen} onClose={() => setEscalateOpen(false)} item={item} name={customer.name} />
    </Shell>
  );
}
