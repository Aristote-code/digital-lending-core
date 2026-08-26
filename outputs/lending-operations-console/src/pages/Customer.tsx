import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, EmptyState, KV, PageHead, SectionHead, Tabs, Timeline } from "../components/ui";
import { dti, formatRwf } from "../lib/format";
import { riskTone, statusTone } from "../lib/tone";
import { useDemo } from "../store";
import type { Customer as CustomerType } from "../types";

const TABS = ["Overview", "KYC", "Employment", "Loans", "Applications", "Activity"] as const;

export function Customer() {
  const { id } = useParams();
  const { state } = useDemo();
  const [tab, setTab] = useState<string>("Overview");

  const customer = state.customers.find((item) => item.id === id);
  if (!customer) return <Navigate to="/applications" replace />;

  const loans = state.loans.filter((item) => item.customerId === customer.id);
  const applications = state.applications.filter((item) => item.customerId === customer.id);
  const activity = state.audit.filter((event) => applications.some((item) => item.id === event.entityId) || loans.some((item) => item.id === event.entityId));

  return (
    <Shell>
      <div className="page">
        <PageHead
          eyebrow={customer.id}
          title={customer.name}
          description={customer.type + " · " + customer.employer}
          actions={
            <>
              <button className="btn" onClick={() => toast.success("Contact logged")}>
                Contact
              </button>
              {applications[0] ? (
                <Link className="btn primary" to={"/applications/" + applications[0].id + "?tab=Documents"}>
                  Request document
                </Link>
              ) : (
                <button className="btn primary" onClick={() => toast("No open application to attach a request to")}>
                  Request document
                </button>
              )}
            </>
          }
        />
        <div className="status-line">
          <Badge tone={statusTone(customer.kyc)}>KYC {customer.kyc}</Badge>
          <Badge>{customer.type}</Badge>
          <Badge tone={riskTone(customer.risk)}>{customer.risk} Risk</Badge>
          <Badge tone={statusTone(customer.status)}>{customer.status}</Badge>
        </div>

        <Tabs items={TABS} active={tab} onClick={setTab} />

        {tab === "Overview" && <Profile customer={customer} />}

        {tab === "KYC" && (
          <section className="surface padded">
            <SectionHead title="Identity verification" description="Result of the customer's KYC submission" />
            <div className="kv-grid">
              <KV label="National ID" value={customer.nationalId} />
              <KV label="Date of birth" value={customer.kycDetail.dob} />
              <KV label="Nationality" value={customer.kycDetail.nationality} />
              <KV label="Address" value={customer.kycDetail.address} />
              <KV label="Selfie" value={customer.kycDetail.selfieMatch} />
              <KV label="Liveness" value={customer.kycDetail.liveness} />
            </div>
          </section>
        )}

        {tab === "Employment" && (
          <section className="surface padded">
            <SectionHead title="Employment" description={customer.employer} />
            <div className="kv-grid">
              <KV label="Employer" value={customer.employer} />
              <KV label="Customer type" value={customer.type} />
              <KV label="Monthly income" value={formatRwf(customer.monthlyIncome)} />
              <KV label="Monthly obligations" value={formatRwf(customer.monthlyObligations)} />
            </div>
          </section>
        )}

        {tab === "Loans" && (
          <section className="surface padded">
            <SectionHead title="Loans" description={loans.length + " facilities"} />
            {loans.length ? (
              loans.map((loan) => (
                <Link to={"/loans/" + loan.id} className="loan-row" key={loan.id}>
                  <span>
                    <strong>{loan.id}</strong>
                    <small>{formatRwf(loan.principal)} principal</small>
                  </span>
                  <Badge tone={statusTone(loan.status)}>{loan.status}</Badge>
                  <span>{formatRwf(loan.outstanding)} outstanding</span>
                  <ChevronRight size={15} />
                </Link>
              ))
            ) : (
              <EmptyState title="No loans yet" text="This customer has no facilities on the book." />
            )}
          </section>
        )}

        {tab === "Applications" && (
          <section className="surface padded">
            <SectionHead title="Applications" description={applications.length + " submitted"} />
            {applications.length ? (
              applications.map((application) => (
                <Link to={"/applications/" + application.id} className="loan-row" key={application.id}>
                  <span>
                    <strong>{application.id}</strong>
                    <small>{application.product}</small>
                  </span>
                  <Badge tone={statusTone(application.stage)}>{application.stage}</Badge>
                  <span>{formatRwf(application.requested)} requested</span>
                  <ChevronRight size={15} />
                </Link>
              ))
            ) : (
              <EmptyState title="No applications" text="This customer has not applied for credit." />
            )}
          </section>
        )}

        {tab === "Activity" && (
          <section className="surface timeline">
            <SectionHead title="Customer activity" description="Everything recorded against this customer" />
            {activity.length ? (
              activity.map((event) => <Timeline key={event.id} title={event.action} text={[event.actor, event.after, event.reason].filter(Boolean).join(" · ")} time={event.at} />)
            ) : (
              <EmptyState title="No activity yet" text="Actions on this customer's cases will appear here." />
            )}
          </section>
        )}
      </div>
    </Shell>
  );
}

function Profile({ customer }: { customer: CustomerType }) {
  return (
    <div className="content-grid">
      <section className="surface padded">
        <SectionHead title="Customer profile" description="Contact and identification" />
        <div className="kv-grid">
          <KV label="Phone" value={customer.phone} />
          <KV label="Email" value={customer.email} />
          <KV label="National ID" value={customer.nationalId} />
          <KV label="Assigned officer" value={customer.assigned} />
        </div>
      </section>
      <section className="surface padded">
        <SectionHead title="Financial profile" description="Affordability inputs" />
        <div className="kv-grid">
          <KV label="Monthly income" value={formatRwf(customer.monthlyIncome)} />
          <KV label="Monthly obligations" value={formatRwf(customer.monthlyObligations)} />
          <KV label="Disposable income" value={formatRwf(customer.monthlyIncome - customer.monthlyObligations)} />
          <KV label="Debt-to-income" value={dti(customer.monthlyObligations, customer.monthlyIncome) + "%"} bad={dti(customer.monthlyObligations, customer.monthlyIncome) > 50} />
        </div>
      </section>
    </div>
  );
}
