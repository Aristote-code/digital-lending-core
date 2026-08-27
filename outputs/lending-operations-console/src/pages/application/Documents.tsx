import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, MoreHorizontal } from "lucide-react";
import { Badge, KV, SectionHead, SkeletonBlock } from "../../components/ui";
import { Dialog, DropdownMenu, MenuItem } from "../../components/overlays";
import { Select } from "../../components/Select";
import { Checkbox } from "../../components/Select";
import { statusTone } from "../../lib/tone";
import { useDemo } from "../../store";
import type { Application, ApplicationDocument } from "../../types";

const REJECT_REASONS = ["Unreadable", "Incorrect document", "Expired", "Mismatch", "Suspected alteration", "Other"];
const REQUESTABLE = ["Recent payslip", "Six-month bank statement", "Employment contract", "Proof of address", "National ID (clearer copy)"];

export function Documents({ application }: { application: Application }) {
  const { dispatch } = useDemo();
  const [selectedId, setSelectedId] = useState(application.documents[0]?.id);
  const [rejecting, setRejecting] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const selected: ApplicationDocument | undefined = application.documents.find((item) => item.id === selectedId) ?? application.documents[0];
  const verifiedCount = application.documents.filter((item) => item.status === "Verified").length;

  // Documents live in object storage in the real system, so the preview genuinely loads.
  const [loadingPreview, setLoadingPreview] = useState(false);
  useEffect(() => {
    setLoadingPreview(true);
    const timer = setTimeout(() => setLoadingPreview(false), 320);
    return () => clearTimeout(timer);
  }, [selectedId]);

  if (!application.documents.length) {
    return (
      <section className="surface padded">
        <SectionHead title="Documents" description="No documents have been uploaded for this application yet." />
        <button className="btn primary" onClick={() => setRequesting(true)}>
          Request documents
        </button>
        <RequestDialog open={requesting} onClose={() => setRequesting(false)} applicationId={application.id} />
      </section>
    );
  }

  return (
    <>
      <div className="docs">
        <section className="surface doc-list">
          <SectionHead
            title="Documents"
            description={verifiedCount + " of " + application.documents.length + " verified"}
            actions={
              <button className="btn small" onClick={() => setRequesting(true)}>
                Request
              </button>
            }
          />
          {application.documents.map((document) => (
            <button key={document.id} className={"doc-row " + (selected?.id === document.id ? "selected" : "")} onClick={() => setSelectedId(document.id)}>
              <FileText size={17} />
              <span>
                <strong>{document.name}</strong>
                <small>{document.uploadedAt}</small>
              </span>
              <Badge tone={statusTone(document.status)}>{document.status}</Badge>
            </button>
          ))}
        </section>

        <section className="surface preview">
          <div className="preview-bar">
            <span>{selected?.name}</span>
            <DropdownMenu label="Document actions" trigger={<MoreHorizontal size={15} />}>
              {(close) => (
                <>
                  <MenuItem onSelect={() => { close(); toast("Opening full-size preview"); }}>Open full size</MenuItem>
                  <MenuItem onSelect={() => { close(); toast.success("Download started"); }}>Download</MenuItem>
                  <MenuItem onSelect={() => { close(); setRequesting(true); }}>Request replacement</MenuItem>
                </>
              )}
            </DropdownMenu>
          </div>
          {loadingPreview ? (
            <div className="preview-loading">
              <SkeletonBlock lines={5} />
            </div>
          ) : (
            <div>
              <FileText size={44} />
              <strong>{selected?.name}</strong>
              <span>Secure document preview</span>
              <small>Prototype document · customer data masked</small>
            </div>
          )}
        </section>

        <section className="surface details">
          <h2>Details</h2>
          <KV label="Status" value={selected?.status ?? "—"} />
          <KV label="Uploaded" value={selected?.uploadedAt ?? "—"} />
          <KV label="Review note" value={selected?.detail ?? "—"} />
          {selected?.rejectionReason && <KV label="Rejection reason" value={selected.rejectionReason} bad />}
          <button
            className="btn primary full-btn"
            disabled={selected?.status === "Verified"}
            onClick={() => {
              if (!selected) return;
              dispatch({ type: "DOCUMENT_STATUS", applicationId: application.id, documentId: selected.id, status: "Verified" });
              toast.success(selected.name + " verified");
            }}
          >
            {selected?.status === "Verified" ? "Already verified" : "Verify document"}
          </button>
          <button className="btn danger full-btn" onClick={() => setRejecting(true)} disabled={selected?.status === "Rejected"}>
            Reject
          </button>
        </section>
      </div>

      <RejectDialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        document={selected}
        onSubmit={(reason) => {
          if (!selected) return;
          dispatch({ type: "DOCUMENT_STATUS", applicationId: application.id, documentId: selected.id, status: "Rejected", reason });
          setRejecting(false);
          toast.error(selected.name + " rejected");
        }}
      />

      <RequestDialog open={requesting} onClose={() => setRequesting(false)} applicationId={application.id} />
    </>
  );
}

function RejectDialog({ open, onClose, document, onSubmit }: { open: boolean; onClose: () => void; document?: ApplicationDocument; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  return (
    <Dialog open={open} onClose={onClose} title="Reject document" description={document?.name}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(reason);
        }}
      >
        <label>
          Reason
          <Select value={reason} onChange={setReason} options={REJECT_REASONS} label="Rejection reason" />
        </label>
        <label>
          Comment
          <textarea defaultValue="Please upload a clearer copy showing all four corners." />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn danger">Reject document</button>
        </div>
      </form>
    </Dialog>
  );
}

function RequestDialog({ open, onClose, applicationId }: { open: boolean; onClose: () => void; applicationId: string }) {
  const { dispatch } = useDemo();
  const [items, setItems] = useState<string[]>([]);
  const [message, setMessage] = useState("We need one more document to complete your assessment.");

  const toggle = (item: string) => setItems((previous) => (previous.includes(item) ? previous.filter((entry) => entry !== item) : [...previous, item]));

  return (
    <Dialog open={open} onClose={onClose} title="Request information" description="Ask the borrower for additional evidence.">
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "REQUEST_DOCUMENTS", applicationId, items, message });
          onClose();
          setItems([]);
          toast.success("Request sent to borrower");
        }}
      >
        <div className="checkbox-list">
          {REQUESTABLE.map((item) => (
            <Checkbox key={item} checked={items.includes(item)} onChange={() => toggle(item)}>
              {item}
            </Checkbox>
          ))}
        </div>
        <label>
          Message
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!items.length}>Send request</button></div>
      </form>
    </Dialog>
  );
}
