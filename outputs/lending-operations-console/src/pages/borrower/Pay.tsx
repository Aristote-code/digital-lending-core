import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BorrowerShell } from "../../layout/BorrowerShell";
import { Select } from "../../components/Select";
import { formatRwf } from "../../lib/format";
import { useDemo } from "../../store";

export function BorrowerPay() {
  const { id } = useParams();
  const { state, dispatch } = useDemo();
  const navigate = useNavigate();
  const loan = state.loans.find((item) => item.id === id);
  const overdue = state.collections.find((item) => item.loanId === id && item.status !== "Closed");
  const [method, setMethod] = useState("MTN MoMo");
  const [choice, setChoice] = useState<"next" | "overdue" | "custom">(overdue ? "overdue" : "next");
  const [custom, setCustom] = useState("");

  if (!loan) return <Navigate to="/my" replace />;

  const amount = choice === "overdue" ? (overdue?.amountOverdue ?? 0) : choice === "next" ? loan.nextPayment : Number(custom) || 0;

  const pay = () => {
    dispatch({ type: "MAKE_PAYMENT", loanId: loan.id, amount });
    toast.success(formatRwf(amount) + " received · thank you");
    navigate("/my");
  };

  return (
    <BorrowerShell>
      <section className="b-card">
        <h2>Make a payment</h2>
        <p className="b-muted">{loan.id} · balance {formatRwf(loan.outstanding)}</p>

        <div className="b-choices">
          {overdue && (
            <button className={choice === "overdue" ? "active" : ""} onClick={() => setChoice("overdue")}>
              <span>Clear what is overdue</span>
              <strong>{formatRwf(overdue.amountOverdue)}</strong>
            </button>
          )}
          <button className={choice === "next" ? "active" : ""} onClick={() => setChoice("next")}>
            <span>Next payment</span>
            <strong>{formatRwf(loan.nextPayment)}</strong>
          </button>
          <button className={choice === "custom" ? "active" : ""} onClick={() => setChoice("custom")}>
            <span>Another amount</span>
            <strong>You choose</strong>
          </button>
        </div>

        {choice === "custom" && (
          <label className="stacked">
            Amount (RWF)
            <input value={custom} inputMode="numeric" onChange={(event) => setCustom(event.target.value.replace(/\D/g, ""))} />
          </label>
        )}

        <label className="stacked">
          Pay with
          <Select value={method} onChange={setMethod} options={["MTN MoMo", "Airtel Money", "Bank transfer"]} label="Payment method" />
        </label>

        <div className="b-figure">
          <span>You are paying</span>
          <strong>{formatRwf(amount)}</strong>
        </div>

        <button className="btn primary full-btn" disabled={amount <= 0} onClick={pay}>
          Pay {formatRwf(amount)}
        </button>
        <button className="btn full-btn" onClick={() => navigate("/my")}>
          Cancel
        </button>
        <p className="b-muted">You may repay early at any time with no penalty.</p>
      </section>
    </BorrowerShell>
  );
}
