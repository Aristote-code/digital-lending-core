import type { ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, Inbox } from "lucide-react";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={"badge badge-" + tone}>{children}</span>;
}

export function Avatar({ initials }: { initials: string }) {
  return <span className="avatar">{initials}</span>;
}

export function KV({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong className={good ? "good" : bad ? "bad" : ""}>{value}</strong>
    </div>
  );
}

/** Read-only label/value pair used inside drawers, where density matters more than on a page. */
export function Field({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="field">
      <span>{label}</span>
      <strong className={good ? "good" : bad ? "bad" : ""}>{value}</strong>
    </div>
  );
}

export function Summary({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={tone ? "text-" + tone : ""}>{value}</strong>
    </div>
  );
}

export function Tabs({ items, active, onClick }: { items: readonly string[]; active: string; onClick?: (value: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button key={item} role="tab" aria-selected={active === item} className={active === item ? "active" : ""} onClick={() => onClick?.(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}

export function PageHead({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function SectionHead({ title, description, actions, padded }: { title: string; description?: string; actions?: ReactNode; padded?: boolean }) {
  return (
    <div className={"section-head " + (padded ? "padded" : "")}>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Notice({ good, title, text }: { good?: boolean; title: string; text?: string }) {
  return (
    <div className={"notice " + (good ? "notice-good" : "notice-danger")}>
      {good ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      <span>
        <strong>{title}</strong>
        {text}
      </span>
    </div>
  );
}

export function Timeline({ title, text, time }: { title: string; text: string; time: string }) {
  return (
    <div className="timeline-row">
      <span>
        <Check size={13} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <time>{time}</time>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <Inbox size={30} />
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-block" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="skeleton-cell" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="skeleton-row">
          {Array.from({ length: columns }, (_, column) => (
            <span key={column} className="skeleton-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}
