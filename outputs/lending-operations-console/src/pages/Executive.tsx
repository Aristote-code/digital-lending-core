import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw } from "lucide-react";
import { Shell } from "../layout/Shell";
import { Badge, Notice, PageHead, SectionHead } from "../components/ui";
import { formatRwf } from "../lib/format";
import { classOf, classTone, concentrations, kris, provisionFor } from "../lib/policy";
import { useDemo } from "../store";
import type { DemoState } from "../types";

function metrics(state: DemoState) {
  const disbursed = state.loans.filter((loan) => loan.disbursementStatus === "Completed");
  const active = state.loans.filter((loan) => loan.status === "Active");
  const outstanding = state.loans.reduce((sum, loan) => sum + loan.outstanding, 0);
  const overdue = state.loans.filter((loan) => ["Late", "Defaulted"].includes(loan.status)).reduce((sum, loan) => sum + loan.outstanding, 0);

  return {
    portfolio: state.loans.reduce((sum, loan) => sum + loan.principal, 0),
    outstanding,
    deployed: disbursed.reduce((sum, loan) => sum + loan.principal, 0),
    interest: state.loans.reduce((sum, loan) => sum + loan.interest, 0),
    par30: outstanding ? ((overdue / outstanding) * 100).toFixed(1) + "%" : "0.0%",
    activeCount: active.length,
    borrowers: state.customers.filter((customer) => customer.status === "Active").length,
    collected: state.loans.reduce((sum, loan) => sum + loan.paidToDate, 0),
  };
}

function performance(state: DemoState) {
  const buckets = [
    { label: "Active", test: (status: string) => status === "Active", tone: "low" },
    { label: "Approved", test: (status: string) => status === "Approved", tone: "low" },
    { label: "Restructured", test: (status: string) => status === "Restructured", tone: "medium" },
    { label: "Late", test: (status: string) => status === "Late", tone: "high" },
    { label: "Defaulted", test: (status: string) => status === "Defaulted", tone: "high" },
    { label: "Paid", test: (status: string) => status === "Paid", tone: "low" },
  ];
  const total = state.loans.length || 1;
  return buckets.map((bucket) => {
    const count = state.loans.filter((loan) => bucket.test(loan.status)).length;
    return { ...bucket, count, share: Math.round((count / total) * 100) };
  });
}

function riskMix(state: DemoState) {
  const total = state.loans.length || 1;
  return (["Low", "Medium", "High"] as const).map((band) => ({
    band,
    share: Math.round((state.loans.filter((loan) => loan.risk === band).length / total) * 100),
  }));
}

export function Executive() {
  const { state } = useDemo();
  const value = metrics(state);
  const indicators = kris(state);
  const limits = concentrations(state);
  const classes = (["Normal", "Watch", "Substandard", "Doubtful", "Loss"] as const).map((assetClass) => {
    const loans = state.loans.filter((loan) => !loan.writtenOffAt && classOf(loan, state.policy) === assetClass);
    return {
      assetClass,
      count: loans.length,
      exposure: loans.reduce((sum, loan) => sum + loan.outstanding, 0),
      provision: loans.reduce((sum, loan) => sum + provisionFor(loan, state.policy), 0),
    };
  });
  const mix = riskMix(state);
  const johnActive = state.loans.find((loan) => loan.id === "LN-00045")?.status === "Active";
  const decisionsToday = state.audit.filter((event) => event.action.startsWith("Application ")).length;

  return (
    <Shell>
      <div className="page">
        <PageHead
          eyebrow="EXECUTIVE OVERVIEW"
          title="Portfolio performance"
          description="Operational metrics as of 27 August 2026"
          actions={
            <button className="btn" onClick={() => toast.success("Metrics refreshed")}>
              <RefreshCcw size={14} />
              Refresh
            </button>
          }
        />

        <div className="exec-metrics">
          <div>
            <span>Total portfolio</span>
            <strong>{formatRwf(value.portfolio, true)}</strong>
            <small className="good">↑ 8.2% this month</small>
          </div>
          <div>
            <span>Outstanding principal</span>
            <strong>{formatRwf(value.outstanding, true)}</strong>
            <small>{value.activeCount} active loans</small>
          </div>
          <div>
            <span>Capital deployed</span>
            <strong>{formatRwf(value.deployed, true)}</strong>
            <small>{state.loans.filter((loan) => loan.disbursementStatus === "Completed").length} disbursed</small>
          </div>
          <div>
            <span>PAR 30</span>
            <strong>{indicators.par30.toFixed(1)}%</strong>
            <small className="warn">Overdue beyond 30 days</small>
          </div>
          <div>
            <span>Interest income</span>
            <strong>{formatRwf(value.interest, true)}</strong>
            <small className="good">↑ 5.4%</small>
          </div>
          <div>
            <span>Active borrowers</span>
            <strong>{value.borrowers}</strong>
            <small>{state.customers.length} total</small>
          </div>
          <div>
            <span>NPL ratio</span>
            <strong>{indicators.nplRatio.toFixed(1)}%</strong>
            <small>{formatRwf(indicators.npl, true)} substandard or worse</small>
          </div>
          <div>
            <span>Provisions held</span>
            <strong>{formatRwf(indicators.provisions, true)}</strong>
            <small>{indicators.provisionCoverage.toFixed(0)}% NPL coverage</small>
          </div>
          <div>
            <span>Write-off ratio</span>
            <strong>{indicators.writeOffRatio.toFixed(1)}%</strong>
            <small>{indicators.recoveryRate.toFixed(0)}% recovered after write-off</small>
          </div>
        </div>

        {johnActive && <Notice good title="Portfolio updated" text="John Doe’s RWF 2.5M loan is now active and included in these figures." />}

        <div className="content-grid" style={{ marginTop: 16 }}>
          <section className="surface padded">
            <SectionHead title="Asset classification" description="BNR Regulation 12/2017 · exposure and minimum provision by class" />
            <div className="policy-rows">
              {classes.map((row) => (
                <div key={row.assetClass}>
                  <span>
                    <Badge tone={classTone(row.assetClass)}>{row.assetClass}</Badge>
                  </span>
                  <em>{row.count} {row.count === 1 ? "facility" : "facilities"} · {formatRwf(row.exposure, true)}</em>
                  <strong>{formatRwf(row.provision, true)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="surface padded">
            <SectionHead title="Concentration" description="Credit Policy §33 · exposure against Board limits" />
            <div className="policy-rows">
              <div>
                <span>{limits.relatedParty.label}</span>
                <em>limit {limits.relatedParty.limitPct}% of capital</em>
                <strong className={limits.relatedParty.breached ? "bad" : ""}>{limits.relatedParty.pct.toFixed(1)}%</strong>
              </div>
              {limits.borrowers.slice(0, 3).map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <em>limit {row.limitPct}% of capital</em>
                  <strong className={row.breached ? "bad" : ""}>{row.pct.toFixed(1)}%</strong>
                </div>
              ))}
              {limits.sectors.slice(0, 3).map((row) => (
                <div key={row.label}>
                  <span>{row.label} sector</span>
                  <em>limit {row.limitPct}% of portfolio</em>
                  <strong className={row.breached ? "bad" : ""}>{row.pct.toFixed(1)}%</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="dash">
          <section className="surface chart">
            <SectionHead title="Portfolio growth" description="Outstanding principal · Mar–Aug 2026" actions={<Badge>Monthly</Badge>} />
            <div className="bars">
              {[42, 49, 55, 58, 67, 76].map((height, index) => (
                <div key={index}>
                  <i style={{ height: height + "%" }} />
                  <span>{["Mar", "Apr", "May", "Jun", "Jul", "Aug"][index]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="surface chart">
            <SectionHead title="Loan performance" description="Book composition by status" />
            {performance(state).map((bucket) => (
              <div className="age" key={bucket.label}>
                <span>{bucket.label}</span>
                <div className="bar">
                  <i className={bucket.tone} style={{ width: Math.max(bucket.share, 1) + "%" }} />
                </div>
                <strong>{bucket.count}</strong>
              </div>
            ))}
          </section>

          <section className="surface chart">
            <SectionHead title="Risk mix" description="Current outstanding portfolio" />
            <div className="riskmix">
              <div className="donut" style={{ "--low-stop": mix[0].share + "%", "--mid-stop": mix[0].share + mix[1].share + "%" } as React.CSSProperties}>
                <strong>{state.loans.length}</strong>
                <span>loans</span>
              </div>
              <div>
                {mix.map((entry) => (
                  <p key={entry.band}>
                    <i className={entry.band.toLowerCase()} />
                    {entry.band} <strong>{entry.share}%</strong>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="surface chart">
            <SectionHead title="Operational alerts" description="Items requiring leadership attention" />
            <div className="alert-list">
              <p>
                <AlertTriangle size={16} />
                <span>
                  <strong>{state.applications.filter((item) => item.risk === "High" && item.decision === "Pending").length} high-risk applications</strong>
                  <small>Awaiting documented decisions</small>
                </span>
              </p>
              <p>
                <Clock3 size={16} />
                <span>
                  <strong>{state.collections.filter((item) => item.status !== "Closed").length} collection cases open</strong>
                  <small>{formatRwf(state.collections.reduce((sum, item) => sum + item.amountOverdue, 0))} overdue</small>
                </span>
              </p>
              <p>
                <CheckCircle2 size={16} />
                <span>
                  <strong>{decisionsToday} credit decisions recorded</strong>
                  <small>Captured in the audit trail today</small>
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
