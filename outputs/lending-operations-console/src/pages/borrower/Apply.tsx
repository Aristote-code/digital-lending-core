import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { BorrowerShell } from "../../layout/BorrowerShell";
import { Select } from "../../components/Select";
import { formatRwf } from "../../lib/format";
import { dscrOf } from "../../lib/policy";
import { useDemo } from "../../store";

const PRODUCTS = ["Salary Loan", "Business Loan", "Working Capital Loan"];
const PURPOSES = ["Personal expenses", "School fees", "Medical", "Home improvement", "Working capital", "Business expansion"];
const TERMS = ["6", "12", "18", "24"];

/**
 * Applying, from the borrower's side. Affordability is shown live rather than
 * discovered after submission — the policy puts repayment capacity above
 * collateral, so the borrower should see it before they commit.
 */
export function BorrowerApply() {
  const { state, dispatch } = useDemo();
  const navigate = useNavigate();
  const customer = state.customers.find((item) => item.id === state.borrowerId);
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [amount, setAmount] = useState("1500000");
  const [term, setTerm] = useState("12");
  const [purpose, setPurpose] = useState(PURPOSES[0]);

  if (!customer) return null;

  const value = Number(amount) || 0;
  const months = Number(term) || 12;
  const instalment = Math.round((value * 1.12) / months);
  const dscr = dscrOf(customer.monthlyIncome, customer.monthlyObligations, instalment);
  const affordable = dscr >= state.policy.dscrFloor;
  const headroom = customer.monthlyIncome - customer.monthlyObligations - instalment;

  const submit = () => {
    dispatch({ type: "SUBMIT_APPLICATION", product, amount: value, term: months, purpose });
    toast.success("Application submitted");
    navigate("/my");
  };

  return (
    <BorrowerShell>
      <section className="b-card">
        {step > 1 && (
          <button className="back" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={14} />
            Back
          </button>
        )}
        <h2>{step === 1 ? "How much do you need?" : step === 2 ? "Check what you can afford" : "Confirm your application"}</h2>

        {step === 1 && (
          <>
            <label className="stacked">
              What is the loan for?
              <Select value={product} onChange={setProduct} options={PRODUCTS} label="Loan product" />
            </label>
            <label className="stacked">
              Amount (RWF)
              <input value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="stacked">
              Repay over
              <Select value={term} onChange={setTerm} options={TERMS.map((item) => ({ value: item, label: item + " months" }))} label="Repayment period" />
            </label>
            <label className="stacked">
              Purpose
              <Select value={purpose} onChange={setPurpose} options={PURPOSES} label="Purpose" />
            </label>
            <button className="btn primary full-btn" disabled={value < 100000} onClick={() => setStep(2)}>
              Continue
              <ArrowRight size={15} />
            </button>
            {value > 0 && value < 100000 && <p className="b-muted">The smallest loan we offer is {formatRwf(100000)}.</p>}
          </>
        )}

        {step === 2 && (
          <>
            <div className="b-figure">
              <span>Your monthly repayment would be</span>
              <strong>{formatRwf(instalment)}</strong>
            </div>
            <div className="b-afford">
              <div>
                <span>Your monthly income</span>
                <strong>{formatRwf(customer.monthlyIncome)}</strong>
              </div>
              <div>
                <span>What you already repay</span>
                <strong>{formatRwf(customer.monthlyObligations)}</strong>
              </div>
              <div>
                <span>Left after this loan</span>
                <strong className={headroom > 0 ? "good" : "bad"}>{formatRwf(headroom)}</strong>
              </div>
            </div>
            {affordable ? (
              <p className="b-ok">
                <CheckCircle2 size={16} />
                This looks affordable on the income we have on file. A credit officer will still review it.
              </p>
            ) : (
              <p className="b-warn">
                This repayment is high against your income. You can still apply, but a smaller amount or a longer term is more likely to be approved.
              </p>
            )}
            <button className="btn primary full-btn" onClick={() => setStep(3)}>
              Continue
              <ArrowRight size={15} />
            </button>
            <button className="btn full-btn" onClick={() => setStep(1)}>
              Change the amount
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="b-review">
              <div><span>Product</span><strong>{product}</strong></div>
              <div><span>Amount</span><strong>{formatRwf(value)}</strong></div>
              <div><span>Repay over</span><strong>{months} months</strong></div>
              <div><span>Monthly repayment</span><strong>{formatRwf(instalment)}</strong></div>
              <div><span>Purpose</span><strong>{purpose}</strong></div>
            </div>
            <p className="b-muted">
              After you submit we will ask for your ID, a recent payslip and a bank statement, and we will contact your employer to confirm your
              employment. Nothing is charged unless you accept an offer.
            </p>
            <button className="btn primary full-btn" onClick={submit}>
              Submit application
            </button>
          </>
        )}
      </section>
    </BorrowerShell>
  );
}
