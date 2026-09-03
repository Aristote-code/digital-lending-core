import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MessageSquare, Phone } from "lucide-react";
import { BorrowerShell } from "../../layout/BorrowerShell";
import { Select } from "../../components/Select";
import { useDemo } from "../../store";

const SUBJECTS = [
  "A charge I do not understand",
  "My repayment schedule",
  "A payment I made is missing",
  "How my application was decided",
  "Someone contacted me unfairly",
  "Something else",
];

/**
 * Credit Policy §44: borrowers must have access to a complaints mechanism.
 * What is raised here lands directly in the compliance team's register.
 */
export function BorrowerSupport() {
  const { state, dispatch } = useDemo();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [detail, setDetail] = useState("");

  const mine = state.complaints.filter((item) => item.customerId === state.borrowerId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    dispatch({ type: "RAISE_COMPLAINT", subject, detail, channel: "Email" });
    setDetail("");
    toast.success("We have your message and will respond within two working days");
  };

  return (
    <BorrowerShell>
      <section className="b-card">
        <h2>Get help</h2>
        <div className="b-contact">
          <a href="tel:+250788000000">
            <Phone size={17} />
            <span>
              <strong>Call us</strong>
              <small>+250 788 000 000 · 8am to 6pm</small>
            </span>
          </a>
          <a href="sms:+250788000000">
            <MessageSquare size={17} />
            <span>
              <strong>Send an SMS</strong>
              <small>We reply the same day</small>
            </span>
          </a>
        </div>
      </section>

      <section className="b-card">
        <h2>Raise a complaint</h2>
        <p className="b-muted">If something has gone wrong, tell us. Every complaint is logged and answered.</p>
        <form className="b-form" onSubmit={submit}>
          <label className="stacked">
            What is it about?
            <Select value={subject} onChange={setSubject} options={SUBJECTS} label="Complaint subject" />
          </label>
          <label className="stacked">
            Tell us what happened
            <textarea required value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Include dates and amounts if you can." />
          </label>
          <button className="btn primary full-btn">Send</button>
        </form>
      </section>

      {mine.length > 0 && (
        <section className="b-card">
          <h2>Your previous messages</h2>
          <div className="b-docs">
            {mine.map((complaint) => (
              <div className="b-doc" key={complaint.id}>
                <span className="b-doc-icon">{complaint.status === "Resolved" ? <CheckCircle2 size={17} /> : <MessageSquare size={17} />}</span>
                <div>
                  <strong>{complaint.subject}</strong>
                  <small>{complaint.receivedAt} · {complaint.status === "Resolved" ? "Answered" : "We are looking into this"}</small>
                  {complaint.resolution && <p className="b-doc-reason">{complaint.resolution}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </BorrowerShell>
  );
}
