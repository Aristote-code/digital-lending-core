import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Building2, ClipboardCheck, Landmark, WalletCards } from "lucide-react";
import { Drawer, DrawerSection, DropdownMenu, MenuItem, MenuSeparator, Tooltip } from "./overlays";
import { Badge, Field, Notice, Timeline } from "./ui";
import { ContactDialog, DecisionDialog, EscalateDialog, PromiseDialog, RestructureDialog, type Outcome } from "./actions";
import { dti, formatRwf } from "../lib/format";
import { riskTone, statusTone } from "../lib/tone";
import { useDemo } from "../store";

/**
 * Peek drawers. Every queue opens its records here rather than navigating away,
 * so scanning a list and inspecting a record cost one click and no lost context.
 * Each drawer keeps a route to the full workspace for the deep work.
 */

export function ApplicationDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state } = useDemo();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const application = state.applications.find((item) => item.id === id);
  const customer = state.customers.find((item) => item.id === application?.customerId);
  if (!application || !customer) return null;

  const { employment, bureau } = application;
  const salaryConsistent = Math.abs(employment.declared - employment.bankDeposit) / employment.declared < 0.05;
  const evidence = [
    { icon: ClipboardCheck, label: "Identity", status: customer.kyc },
    { icon: Building2, label: "Employment", status: application.employmentStatus },
    { icon: WalletCards, label: "Salary comparison", status: salaryConsistent ? "Consistent" : "Attention" },
    { icon: Landmark, label: "Credit bureau", status: bureau.status },
  ];

  const decided = application.decision !== "Pending";
  const blocked = application.employmentStatus !== "Verified";
  const highRisk = application.risk === "High";
  // A decision can be taken here unless something upstream is genuinely missing;
  // when it is, the drawer says why and sends you to the tab that resolves it.
  const canDecide = !decided && !blocked;

  const approveButton = (
    <button className="btn primary" disabled={!canDecide || highRisk} onClick={() => setOutcome("Approved")}>
      Approve {formatRwf(application.recommended, true)}
    </button>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={customer.name}
      description={application.id + " · " + application.product + " · submitted " + application.submittedAt}
      badge={<Badge tone={statusTone(application.stage)}>{application.stage}</Badge>}
      footer={
        <>
          <button className="btn" onClick={() => navigate("/applications/" + application.id)}>
            Open full workspace
          </button>
          {decided ? (
            <button className="btn primary" onClick={() => navigate("/applications/" + application.id + "?tab=Activity")}>
              View decision
              <ArrowRight size={14} />
            </button>
          ) : highRisk ? (
            <>
              <DropdownMenu label="Other outcomes">
                {(close) => (
                  <>
                    <MenuItem onSelect={() => { close(); navigate("/applications/" + application.id + "?tab=Credit"); }}>Review red flags</MenuItem>
                    <MenuItem onSelect={() => { close(); setOutcome("Manual review"); }}>Send for manual review</MenuItem>
                  </>
                )}
              </DropdownMenu>
              <button className="btn danger-solid" onClick={() => setOutcome("Rejected")}>
                Reject application
              </button>
            </>
          ) : (
            <>
              <DropdownMenu label="Other outcomes">
                {(close) => (
                  <>
                    <MenuItem disabled={!canDecide} onSelect={() => { close(); setOutcome("Approved with conditions"); }}>Approve with conditions</MenuItem>
                    <MenuItem onSelect={() => { close(); setOutcome("Manual review"); }}>Send for manual review</MenuItem>
                    <MenuSeparator />
                    <MenuItem destructive onSelect={() => { close(); setOutcome("Rejected"); }}>Reject application</MenuItem>
                  </>
                )}
              </DropdownMenu>
              {blocked ? <Tooltip text="Employer verification must be completed first">{approveButton}</Tooltip> : approveButton}
            </>
          )}
        </>
      }
    >
      <DrawerSection title="Request">
        <div className="field-grid">
          <Field label="Requested" value={formatRwf(application.requested)} />
          <Field label="Recommended" value={application.recommended ? formatRwf(application.recommended) : "No offer"} />
          <Field label="Term" value={application.term + " months"} />
          <Field label="Purpose" value={application.purpose} />
          <Field label="Assigned" value={application.assigned} />
          <Field label="Required approver" value={application.approver} />
        </div>
      </DrawerSection>

      <DrawerSection title="Risk">
        <div className="drawer-score">
          <div>
            <span>Composite score</span>
            <strong>
              {application.riskScore}
              <small>/100</small>
            </strong>
          </div>
          <Badge tone={riskTone(application.risk)}>{application.risk} Risk</Badge>
        </div>
        <div className="field-grid">
          <Field label="Debt-to-income" value={dti(customer.monthlyObligations, customer.monthlyIncome) + "%"} bad={dti(customer.monthlyObligations, customer.monthlyIncome) > 50} />
          <Field label="Monthly income" value={formatRwf(customer.monthlyIncome)} />
        </div>
        {application.redFlags.length > 0 && (
          <ul className="drawer-flags">
            {application.redFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        )}
      </DrawerSection>

      <DrawerSection title="Verification evidence">
        <div className="evidence-compact">
          {evidence.map((row) => (
            <div key={row.label}>
              <row.icon size={15} />
              <span>{row.label}</span>
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            </div>
          ))}
        </div>
        {blocked && !decided && (
          <button className="btn full-btn" onClick={() => navigate("/applications/" + application.id + "?tab=Employment")}>
            Resolve employer verification
            <ArrowRight size={14} />
          </button>
        )}
      </DrawerSection>

      {decided && (
        <DrawerSection title="Decision">
          <Notice
            good={application.decision !== "Rejected"}
            title={application.decision}
            text={application.decisionReason}
          />
        </DrawerSection>
      )}

      <DecisionDialog outcome={outcome} onClose={() => setOutcome(null)} application={application} />
    </Drawer>
  );
}

export function LoanDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state } = useDemo();
  const navigate = useNavigate();
  const loan = state.loans.find((item) => item.id === id);
  const customer = state.customers.find((item) => item.id === loan?.customerId);
  if (!loan || !customer) return null;

  const upcoming = loan.schedule.filter((row) => row.status !== "Paid").slice(0, 4);

  return (
    <Drawer
      open
      onClose={onClose}
      title={loan.id}
      description={customer.name + " · " + formatRwf(loan.principal) + " over " + loan.term + " months"}
      badge={<Badge tone={statusTone(loan.status)}>{loan.status}</Badge>}
      footer={
        <>
          <button className="btn" onClick={() => navigate("/customers/" + customer.id)}>
            View borrower
          </button>
          <button className="btn primary" onClick={() => navigate("/loans/" + loan.id)}>
            Open loan
            <ArrowRight size={14} />
          </button>
        </>
      }
    >
      <DrawerSection title="Position">
        <div className="field-grid">
          <Field label="Principal" value={formatRwf(loan.principal)} />
          <Field label="Outstanding" value={formatRwf(loan.outstanding)} />
          <Field label="Paid to date" value={formatRwf(loan.paidToDate)} good={loan.paidToDate > 0} />
          <Field label="Interest" value={formatRwf(loan.interest)} />
          <Field label="Next payment" value={formatRwf(loan.nextPayment)} />
          <Field label="Next due" value={loan.nextDue} />
        </div>
      </DrawerSection>

      <DrawerSection title="Disbursement">
        <div className="field-grid">
          <Field label="Status" value={loan.disbursementStatus} />
          <Field label="Destination" value={loan.destination} />
          <Field label="Disbursed" value={loan.disbursedAt ?? "Not yet disbursed"} />
          <Field label="Officer" value={loan.officer} />
        </div>
      </DrawerSection>

      {upcoming.length > 0 && (
        <DrawerSection title="Upcoming instalments">
          <div className="mini-table">
            {upcoming.map((row) => (
              <div key={row.id}>
                <span>{row.due}</span>
                <strong>{formatRwf(row.total)}</strong>
                <Badge tone={statusTone(row.status)}>{row.status}</Badge>
              </div>
            ))}
          </div>
        </DrawerSection>
      )}
    </Drawer>
  );
}

export function CollectionDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state } = useDemo();
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = useState(false);
  const [promiseOpen, setPromiseOpen] = useState(false);
  const [restructureOpen, setRestructureOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  const item = state.collections.find((entry) => entry.id === id);
  const customer = state.customers.find((entry) => entry.id === item?.customerId);
  const loan = state.loans.find((entry) => entry.id === item?.loanId);
  if (!item || !customer || !loan) return null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={customer.name}
      description={item.id + " · " + item.loanId + " · " + item.daysOverdue + " days overdue"}
      badge={<Badge tone={statusTone(item.status)}>{item.status}</Badge>}
      footer={
        <>
          <button className="btn" onClick={() => navigate("/collections/" + item.id)}>
            Open full case
          </button>
          <DropdownMenu label="More case actions">
            {(close) => (
              <>
                <MenuItem onSelect={() => { close(); setPromiseOpen(true); }}>Promise to pay</MenuItem>
                <MenuItem onSelect={() => { close(); toast.success("SMS reminder sent to " + customer.phone); }}>Send reminder</MenuItem>
                <MenuItem disabled={item.status === "Restructured"} onSelect={() => { close(); setRestructureOpen(true); }}>Restructure loan</MenuItem>
                <MenuItem onSelect={() => { close(); navigate("/loans/" + item.loanId); }}>View loan</MenuItem>
                <MenuSeparator />
                <MenuItem destructive disabled={item.status === "Escalated"} onSelect={() => { close(); setEscalateOpen(true); }}>
                  Escalate to compliance
                </MenuItem>
              </>
            )}
          </DropdownMenu>
          <button className="btn primary" onClick={() => setContactOpen(true)}>
            Record contact
          </button>
        </>
      }
    >
      <DrawerSection title="Exposure">
        <div className="drawer-figure">
          <span>Amount overdue</span>
          <strong>{formatRwf(item.amountOverdue)}</strong>
        </div>
        <div className="field-grid">
          <Field label="Days overdue" value={String(item.daysOverdue)} bad />
          <Field label="Owner" value={item.owner} />
          <Field label="Last contact" value={item.lastContact} />
          <Field label="Next action" value={item.nextAction} />
          <Field label="Promise" value={item.promiseDate ? item.promiseDate + " · " + formatRwf(item.promiseAmount ?? 0) : "None"} good={Boolean(item.promiseDate)} />
          <Field label="Phone" value={customer.phone} />
        </div>
      </DrawerSection>

      <DrawerSection title="Recent activity">
        <div className="drawer-timeline">
          {item.events.slice(0, 4).map((event) => (
            <Timeline key={event.id} title={event.type} text={event.note + " · " + event.actor} time={event.at} />
          ))}
        </div>
        {item.events.length > 4 && (
          <button className="btn full-btn" onClick={() => navigate("/collections/" + item.id)}>
            View all {item.events.length} events
            <ArrowRight size={14} />
          </button>
        )}
      </DrawerSection>

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} item={item} phone={customer.phone} name={customer.name} />
      <PromiseDialog open={promiseOpen} onClose={() => setPromiseOpen(false)} item={item} />
      <RestructureDialog open={restructureOpen} onClose={() => setRestructureOpen(false)} item={item} loan={loan} />
      <EscalateDialog open={escalateOpen} onClose={() => setEscalateOpen(false)} item={item} name={customer.name} />
    </Drawer>
  );
}

export function CustomerDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { state } = useDemo();
  const navigate = useNavigate();
  const customer = state.customers.find((item) => item.id === id);
  if (!customer) return null;

  const loans = state.loans.filter((item) => item.customerId === customer.id);
  const applications = state.applications.filter((item) => item.customerId === customer.id);

  return (
    <Drawer
      open
      onClose={onClose}
      title={customer.name}
      description={customer.id + " · " + customer.type + " · " + customer.employer}
      badge={<Badge tone={riskTone(customer.risk)}>{customer.risk} Risk</Badge>}
      size="md"
      footer={
        <button className="btn primary" onClick={() => navigate("/customers/" + customer.id)}>
          Open profile
          <ArrowRight size={14} />
        </button>
      }
    >
      <DrawerSection title="Contact">
        <div className="field-grid">
          <Field label="Phone" value={customer.phone} />
          <Field label="Email" value={customer.email} />
          <Field label="National ID" value={customer.nationalId} />
          <Field label="Officer" value={customer.assigned} />
        </div>
      </DrawerSection>

      <DrawerSection title="Affordability">
        <div className="field-grid">
          <Field label="Monthly income" value={formatRwf(customer.monthlyIncome)} />
          <Field label="Obligations" value={formatRwf(customer.monthlyObligations)} />
          <Field label="Disposable" value={formatRwf(customer.monthlyIncome - customer.monthlyObligations)} />
          <Field label="Debt-to-income" value={dti(customer.monthlyObligations, customer.monthlyIncome) + "%"} bad={dti(customer.monthlyObligations, customer.monthlyIncome) > 50} />
        </div>
      </DrawerSection>

      {(loans.length > 0 || applications.length > 0) && (
        <DrawerSection title="Facilities">
          <div className="mini-table">
            {applications.map((application) => (
              <button key={application.id} onClick={() => navigate("/applications/" + application.id)}>
                <span>{application.id}</span>
                <strong>{formatRwf(application.requested)}</strong>
                <Badge tone={statusTone(application.stage)}>{application.stage}</Badge>
              </button>
            ))}
            {loans.map((loan) => (
              <button key={loan.id} onClick={() => navigate("/loans/" + loan.id)}>
                <span>{loan.id}</span>
                <strong>{formatRwf(loan.outstanding)}</strong>
                <Badge tone={statusTone(loan.status)}>{loan.status}</Badge>
              </button>
            ))}
          </div>
        </DrawerSection>
      )}
    </Drawer>
  );
}
