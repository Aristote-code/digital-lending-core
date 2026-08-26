import { toast } from "sonner";
import { SectionHead, Timeline } from "../../components/ui";
import { useDemo } from "../../store";
import type { Application } from "../../types";

export function Activity({ application }: { application: Application }) {
  const { state } = useDemo();
  const documentIds = new Set(application.documents.map((document) => document.id));
  const events = state.audit.filter((event) => event.entityId === application.id || documentIds.has(event.entityId));

  return (
    <section className="surface timeline">
      <SectionHead
        title="Application activity"
        description="Immutable prototype audit history"
        actions={
          <button className="btn small" onClick={() => toast.success("Audit trail exported")}>
            Export audit
          </button>
        }
      />
      {events.map((event) => (
        <Timeline
          key={event.id}
          title={event.action}
          text={[event.actor, event.before && event.after ? event.before + " → " + event.after : event.after, event.reason].filter(Boolean).join(" · ")}
          time={event.at}
        />
      ))}
    </section>
  );
}
