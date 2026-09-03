import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock3, Upload } from "lucide-react";
import { BorrowerShell } from "../../layout/BorrowerShell";
import { useDemo } from "../../store";
import type { ApplicationDocument } from "../../types";

/**
 * The borrower sees exactly why a document was rejected — the same reason the
 * officer recorded. Telling someone to "try again" without saying what was
 * wrong is the most common way this flow wastes everyone's time.
 */
export function BorrowerDocuments() {
  const { state, dispatch } = useDemo();
  const customer = state.customers.find((item) => item.id === state.borrowerId);
  const application = state.applications.find((item) => item.customerId === state.borrowerId && !["Rejected", "Disbursed"].includes(item.stage))
    ?? state.applications.find((item) => item.customerId === state.borrowerId);

  if (!customer || !application) {
    return (
      <BorrowerShell>
        <section className="b-card b-empty">
          <h2>No documents needed</h2>
          <p>When you apply we will list exactly what to send.</p>
        </section>
      </BorrowerShell>
    );
  }

  const upload = (document: ApplicationDocument) => {
    dispatch({ type: "UPLOAD_DOCUMENT", applicationId: application.id, documentId: document.id, name: document.name });
    toast.success(document.name + " uploaded");
  };

  const outstanding = application.documents.filter((item) => item.status === "Missing" || item.status === "Rejected").length;

  return (
    <BorrowerShell>
      <section className="b-card">
        <h2>Your documents</h2>
        <p className="b-muted">
          {outstanding === 0
            ? "Everything we asked for has been sent. We will let you know if anything else is needed."
            : outstanding + (outstanding === 1 ? " document still needs your attention." : " documents still need your attention.")}
        </p>

        <div className="b-docs">
          {application.documents.map((document) => {
            const needsAction = document.status === "Missing" || document.status === "Rejected";
            return (
              <div key={document.id} className={"b-doc " + (document.status === "Rejected" ? "rejected" : "")}>
                <span className="b-doc-icon">
                  {document.status === "Verified" ? <CheckCircle2 size={17} /> : needsAction ? <AlertTriangle size={17} /> : <Clock3 size={17} />}
                </span>
                <div>
                  <strong>{document.name}</strong>
                  <small>
                    {document.status === "Verified" ? "Accepted" : document.status === "Rejected" ? "Not accepted" : document.status === "Missing" ? "Not sent yet" : "Waiting for us to check"}
                    {document.uploadedAt ? " · sent " + document.uploadedAt : ""}
                  </small>
                  {document.status === "Rejected" && document.rejectionReason && (
                    <p className="b-doc-reason">
                      <strong>Why:</strong> {document.rejectionReason}. {document.detail}
                    </p>
                  )}
                </div>
                {needsAction && (
                  <button className="btn small" onClick={() => upload(document)}>
                    <Upload size={13} />
                    {document.status === "Rejected" ? "Replace" : "Upload"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {application.requestedInfo && application.requestedInfo.length > 0 && (
          <div className="b-requested">
            <strong>We also asked for</strong>
            <ul>
              {application.requestedInfo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button
              className="btn full-btn"
              onClick={() => {
                application.requestedInfo?.forEach((item) => dispatch({ type: "UPLOAD_DOCUMENT", applicationId: application.id, name: item }));
                toast.success("Sent");
              }}
            >
              <Upload size={14} />
              Send these
            </button>
          </div>
        )}
      </section>
    </BorrowerShell>
  );
}
