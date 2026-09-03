import { BorrowerShell } from "../../layout/BorrowerShell";
import { formatRwf } from "../../lib/format";
import { useDemo } from "../../store";

export function BorrowerProfile() {
  const { state } = useDemo();
  const customer = state.customers.find((item) => item.id === state.borrowerId);
  if (!customer) return null;

  const verified = customer.kyc === "Verified";

  return (
    <BorrowerShell>
      <section className="b-card">
        <h2>Your details</h2>
        <p className="b-muted">
          {verified ? "Your identity is confirmed. " : "We are still confirming your identity. "}
          To change anything here, contact us — we verify changes to protect your account.
        </p>
        <div className="b-review">
          <div><span>Name</span><strong>{customer.name}</strong></div>
          <div><span>Phone</span><strong>{customer.phone}</strong></div>
          <div><span>Email</span><strong>{customer.email}</strong></div>
          <div><span>National ID</span><strong>{customer.nationalId.slice(0, 4)} •••• {customer.nationalId.slice(-4)}</strong></div>
          <div><span>Address</span><strong>{customer.kycDetail.address}</strong></div>
          <div><span>Employer</span><strong>{customer.employer}</strong></div>
        </div>
      </section>

      <section className="b-card">
        <h2>What we hold on your income</h2>
        <p className="b-muted">We use this to work out what you can afford. If it is wrong, tell us.</p>
        <div className="b-review">
          <div><span>Monthly income</span><strong>{formatRwf(customer.monthlyIncome)}</strong></div>
          <div><span>Existing repayments</span><strong>{formatRwf(customer.monthlyObligations)}</strong></div>
          <div><span>Left each month</span><strong>{formatRwf(customer.monthlyIncome - customer.monthlyObligations)}</strong></div>
        </div>
      </section>

      <section className="b-card">
        <h2>Your privacy</h2>
        <p className="b-muted">
          We check your credit record with the credit bureau when you apply, and we contact your employer only to confirm employment and salary.
          We share your repayment record with the bureau, as the law requires. We never sell your data.
        </p>
      </section>
    </BorrowerShell>
  );
}
