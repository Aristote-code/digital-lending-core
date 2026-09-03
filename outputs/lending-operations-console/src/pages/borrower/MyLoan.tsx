import { Link } from "react-router-dom";
import { BorrowerShell } from "../../layout/BorrowerShell";
import { formatRwf } from "../../lib/format";
import { useDemo } from "../../store";

/** The repayment schedule and history, in the borrower's own terms. */
export function BorrowerLoan() {
  const { state } = useDemo();
  const loans = state.loans.filter((item) => item.customerId === state.borrowerId && item.disbursementStatus === "Completed");
  const loan = loans.find((item) => item.status !== "Paid" && item.status !== "Closed") ?? loans[0];

  if (!loan) {
    return (
      <BorrowerShell>
        <section className="b-card b-empty">
          <h2>No loan yet</h2>
          <p>Once a loan is paid out, your balance and payment dates appear here.</p>
          <Link className="btn primary" to="/my/apply">Apply for a loan</Link>
        </section>
      </BorrowerShell>
    );
  }

  const paidRows = loan.schedule.filter((row) => row.status === "Paid").length;

  return (
    <BorrowerShell>
      <section className="b-card">
        <div className="b-card-head">
          <h2>Your loan</h2>
          <span className="b-ref">{loan.id}</span>
        </div>
        <div className="b-figure">
          <span>Balance remaining</span>
          <strong>{formatRwf(loan.outstanding)}</strong>
        </div>
        <div className="b-split">
          <div><span>Borrowed</span><strong>{formatRwf(loan.principal)}</strong></div>
          <div><span>Repaid so far</span><strong>{formatRwf(loan.paidToDate)}</strong></div>
        </div>
        <div className="b-split">
          <div><span>Next payment</span><strong>{formatRwf(loan.nextPayment)}</strong></div>
          <div><span>Due</span><strong>{loan.nextDue}</strong></div>
        </div>
        <Link className="btn primary full-btn" to={"/my/pay/" + loan.id}>Make a payment</Link>
      </section>

      <section className="b-card">
        <h2>Payment schedule</h2>
        <p className="b-muted">{paidRows} of {loan.schedule.length} payments made.</p>
        <div className="b-schedule">
          {loan.schedule.map((row) => (
            <div key={row.id} className={row.status === "Paid" ? "paid" : row.status === "Late" ? "late" : ""}>
              <span>{row.due}</span>
              <strong>{formatRwf(row.total)}</strong>
              <small>{row.status === "Paid" ? "Paid" : row.status === "Late" ? "Overdue" : row.status === "Due" ? "Due now" : "Upcoming"}</small>
            </div>
          ))}
        </div>
      </section>

      {loan.transactions.length > 0 && (
        <section className="b-card">
          <h2>Your payments</h2>
          <div className="b-schedule">
            {loan.transactions.map((transaction) => (
              <div key={transaction.id}>
                <span>{transaction.at}</span>
                <strong>{transaction.direction === "in" ? "+" : ""}{formatRwf(transaction.amount)}</strong>
                <small>{transaction.type}</small>
              </div>
            ))}
          </div>
        </section>
      )}
    </BorrowerShell>
  );
}
