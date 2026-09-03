import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { BorrowerShell } from "../../layout/BorrowerShell";
import { Checkbox } from "../../components/Select";
import { formatRwf } from "../../lib/format";
import { installmentOf } from "../../lib/schedule";
import { useDemo } from "../../store";

/**
 * The key facts statement. Credit Policy §20 and §44 require interest, fees and
 * penalties to be disclosed in writing and communicated before acceptance, with
 * no undisclosed charges — so acceptance is gated on an explicit acknowledgement.
 */
export function BorrowerOffer() {
  const { id } = useParams();
  const { state, dispatch } = useDemo();
  const navigate = useNavigate();
  const [read, setRead] = useState(false);

  const application = state.applications.find((item) => item.id === id);
  if (!application) return <Navigate to="/my" replace />;

  const amount = application.recommended || application.requested;
  const interest = Math.round(amount * 0.12);
  const fees = Math.round(amount * 0.02);
  const instalment = installmentOf(amount, interest, application.term);
  const total = amount + interest + fees;

  const accept = () => {
    dispatch({ type: "ACCEPT_OFFER", applicationId: application.id });
    toast.success("Offer accepted · we will release the money shortly");
    navigate("/my");
  };

  if (application.disclosureAcceptedAt) {
    return (
      <BorrowerShell>
        <section className="b-card b-empty">
          <CheckCircle2 size={26} />
          <h2>Offer accepted</h2>
          <p>You accepted this offer on {application.disclosureAcceptedAt}. The money will reach your mobile money account shortly.</p>
        </section>
      </BorrowerShell>
    );
  }

  return (
    <BorrowerShell>
      <section className="b-card">
        <h2>Your offer</h2>
        <p className="b-muted">Read this before you accept. These are all the costs — there are no other charges.</p>

        <div className="b-figure">
          <span>You will receive</span>
          <strong>{formatRwf(amount)}</strong>
        </div>

        <div className="b-facts">
          <div><span>Monthly repayment</span><strong>{formatRwf(instalment)}</strong></div>
          <div><span>Number of payments</span><strong>{application.term}</strong></div>
          <div><span>Interest</span><strong>{formatRwf(interest)}</strong></div>
          <div><span>Arrangement fee</span><strong>{formatRwf(fees)}</strong></div>
          <div><span>Late payment penalty</span><strong>2% per month on the overdue amount</strong></div>
          <div className="b-total"><span>Total you will repay</span><strong>{formatRwf(total)}</strong></div>
        </div>

        <p className="b-muted">
          You may repay early at any time with no penalty. If you miss a payment we will contact you before any further action, and a missed payment
          is reported to the credit bureau.
        </p>

        <div className="b-accept">
          <Checkbox checked={read} onChange={setRead}>
            I have read these terms and I understand what I will repay.
          </Checkbox>
        </div>

        <button className="btn primary full-btn" disabled={!read} onClick={accept}>
          Accept offer
        </button>
        <button className="btn full-btn" onClick={() => navigate("/my")}>
          Not now
        </button>
      </section>
    </BorrowerShell>
  );
}
