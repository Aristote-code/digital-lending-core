import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "../layout/Shell";
import { Badge, Notice, PageHead, SectionHead } from "../components/ui";
import { formatRwf } from "../lib/format";
import { tierLimit } from "../lib/policy";
import { can, denialReason } from "../lib/roles";
import { useDemo } from "../store";

/**
 * The source policy marks its own thresholds as illustrative and requires them to
 * be calibrated to the institution's capital base and licence category. They live
 * here as Board-set parameters rather than being written into screens, so changing
 * one changes every limit the console enforces.
 */
export function Policy() {
  const { state, dispatch } = useDemo();
  const { policy } = state;
  const permitted = can(state.activeRole, "setPolicy");
  const [capital, setCapital] = useState(String(policy.coreCapital));
  const [dscr, setDscr] = useState(String(policy.dscrFloor));

  const belowMinimum = policy.coreCapital < policy.minimumCapital;

  const save = () => {
    dispatch({ type: "SET_POLICY", patch: { coreCapital: Number(capital) || policy.coreCapital, dscrFloor: Number(dscr) || policy.dscrFloor } });
    toast.success("Policy parameters updated · every limit recalculated");
  };

  return (
    <Shell>
      <div className="page">
        <PageHead
          eyebrow="BOARD-SET PARAMETERS"
          title="Credit policy"
          description="Every threshold the console enforces, in one place."
          actions={<Badge>{policy.licenceCategory}</Badge>}
        />

        {belowMinimum && (
          <Notice
            title="Core capital is below the current minimum"
            text={"Held " + formatRwf(policy.coreCapital) + " against a " + formatRwf(policy.minimumCapital) + " requirement for " + policy.licenceCategory + ". BNR raised the threshold in August 2026 with a three-year transition."}
          />
        )}

        <div className="content-grid" style={{ marginTop: 20 }}>
          <section className="surface padded">
            <SectionHead title="Capital and licence" description="The base every proportional limit is calculated from" />
            <label className="stacked">
              Core capital (RWF)
              <input value={capital} onChange={(event) => setCapital(event.target.value.replace(/\D/g, ""))} disabled={!permitted} />
            </label>
            <label className="stacked">
              Minimum DSCR
              <input value={dscr} onChange={(event) => setDscr(event.target.value.replace(/[^\d.]/g, ""))} disabled={!permitted} />
            </label>
            {permitted ? (
              <button className="btn primary full-btn" onClick={save}>
                Save parameters
              </button>
            ) : (
              <div className="gate" style={{ marginTop: 14 }}>
                <span>
                  <strong>Read only</strong>
                  {denialReason(state.activeRole, "setPolicy")}
                </span>
              </div>
            )}
          </section>

          <section className="surface padded">
            <SectionHead title="Delegated approval authority" description="Credit Policy §16 · as a share of core capital" />
            <div className="policy-rows">
              {policy.authorityTiers.map((tier) => (
                <div key={tier.level}>
                  <span>{tier.level}</span>
                  <em>{tier.maxPctOfCapital === null ? "no ceiling" : "up to " + tier.maxPctOfCapital + "%"}</em>
                  <strong>{tier.maxPctOfCapital === null ? "Above " + formatRwf(tierLimit("Board Credit Committee", policy), true) : formatRwf(tierLimit(tier.level, policy), true)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="surface padded">
            <SectionHead title="Asset classification" description="BNR Regulation 12/2017 · days past due and minimum provision" />
            <div className="policy-rows">
              {policy.provisionRates.map((row) => (
                <div key={row.class}>
                  <span>{row.class}</span>
                  <em>{row.from}{row.to === null ? "+ days" : "–" + row.to + " days"}</em>
                  <strong>{Math.round(row.rate * 100)}%</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="surface padded">
            <SectionHead title="Loan-to-value caps" description="Credit Policy §14 · by collateral type" />
            <div className="policy-rows">
              {policy.ltvCaps.filter((cap) => cap.type !== "Unsecured").map((cap) => (
                <div key={cap.type}>
                  <span>{cap.type}</span>
                  <em>maximum</em>
                  <strong>{cap.max}%</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="surface padded span-2">
            <SectionHead title="Limits and restructuring" description="Credit Policy §27 and §33" />
            <div className="policy-rows">
              <div><span>Single borrower</span><em>share of core capital</em><strong>{policy.singleBorrowerLimitPct}%</strong></div>
              <div><span>Related parties</span><em>share of core capital</em><strong>{policy.relatedPartyLimitPct}%</strong></div>
              <div><span>Single sector</span><em>share of the portfolio</em><strong>{policy.sectorLimitPct}%</strong></div>
              <div><span>Restructurings</span><em>over the life of a facility</em><strong>{policy.maxRestructures}</strong></div>
              <div><span>Seasoning before upgrade</span><em>satisfactory performance</em><strong>{policy.restructureSeasoningMonths} months</strong></div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
