import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Traps Tab within the overlay and closes it on Escape, restoring focus to the opener. */
function useDialogBehavior(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !ref.current) return;
      const targets = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!targets.length) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

export function Modal({ title, description, open, onClose, children, wide }: { title: string; description?: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useDialogBehavior(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={ref as React.RefObject<HTMLElement>} className={"modal " + (wide ? "wide" : "")} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Sheet({ title, description, open, onClose, children }: { title: string; description?: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useDialogBehavior(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="backdrop sheet-drop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={ref as React.RefObject<HTMLElement>} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </aside>
    </div>
  );
}

/**
 * Deliberately heavier than Modal — reserved for irreversible financial actions so the
 * confirmation reads as consequential rather than routine.
 */
export function AlertDialog({ open, onClose, title, description, warning, confirmLabel, onConfirm, busy }: { open: boolean; onClose: () => void; title: string; description?: string; warning: string; confirmLabel: string; onConfirm: () => void; busy?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="critical">
        <AlertTriangle size={19} />
        <p>{warning}</p>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn primary" onClick={onConfirm} disabled={busy}>
          {busy ? "Processing…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Lightweight anchored popover used for filters, row menus, and risk-factor evidence. */
export function Popover({ trigger, children, align = "left", label }: { trigger: ReactNode; children: ReactNode | ((close: () => void) => ReactNode); align?: "left" | "right"; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="popover-wrap" ref={ref}>
      <button className="popover-trigger" aria-expanded={open} aria-haspopup="dialog" aria-label={label} onClick={() => setOpen(!open)}>
        {trigger}
      </button>
      {open && <div className={"popover popover-" + align}>{typeof children === "function" ? children(() => setOpen(false)) : children}</div>}
    </div>
  );
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip" role="tooltip">
        {text}
      </span>
    </span>
  );
}
