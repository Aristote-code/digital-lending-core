import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, MoreHorizontal, X } from "lucide-react";

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

/* ------------------------------------------------------------------ *
 * Drawer — the primary surface for VIEWING a record.
 *
 * Opening a record from a queue should not cost a page navigation. A row
 * click opens the record here, in place, with the queue still behind it;
 * the drawer's footer carries the escape hatch to the full workspace for
 * the rare case where someone needs the deep view.
 *
 * Sizes are generous on purpose — a drawer you have to scroll is worse
 * than a wider one you do not.
 * ------------------------------------------------------------------ */

export type DrawerSize = "sm" | "md" | "lg" | "xl";

export function Drawer({ open, onClose, title, description, badge, footer, size = "lg", children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  badge?: ReactNode;
  footer?: ReactNode;
  size?: DrawerSize;
  children: ReactNode;
}) {
  const ref = useDialogBehavior(open, onClose);
  const titleId = useId();
  if (!open) return null;

  // Portalled to the body: an overlay rendered inside another overlay's stacking
  // context paints underneath it, which is how a dialog raised from a drawer ends
  // up behind the drawer that opened it.
  return createPortal(
    <div className="backdrop drawer-drop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={ref as React.RefObject<HTMLElement>} className={"drawer drawer-" + size} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="drawer-head">
          <div className="drawer-heading">
            <div className="drawer-title">
              <h2 id={titleId}>{title}</h2>
              {badge}
            </div>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </div>,
    document.body
  );
}

/** A titled block inside a drawer. Sections carry the structure so drawer bodies stay scannable. */
export function DrawerSection({ title, actions, children, flush }: { title?: string; actions?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className={"drawer-section " + (flush ? "flush" : "")}>
      {(title || actions) && (
        <div className="drawer-section-head">
          {title && <h3>{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Dialog — the surface for DECIDING. Short, focused, few fields.
 * ------------------------------------------------------------------ */

export function Dialog({ title, description, open, onClose, children, size = "md" }: {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useDialogBehavior(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return createPortal(
    <div className="backdrop dialog-drop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={ref as React.RefObject<HTMLElement>} className={"modal modal-" + size} role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
    </div>,
    document.body
  );
}

/**
 * Confirmation for consequential, hard-to-reverse actions. Deliberately heavier
 * than a plain Dialog so releasing money never reads as routine.
 */
export function ConfirmDialog({ open, onClose, title, description, warning, confirmLabel, onConfirm, busy, destructive }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  warning: string;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className={"critical " + (destructive ? "critical-danger" : "")}>
        <AlertTriangle size={18} />
        <p>{warning}</p>
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className={destructive ? "btn danger-solid" : "btn primary"} onClick={onConfirm} disabled={busy}>
          {busy ? "Processing…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ *
 * Menus and popovers
 * ------------------------------------------------------------------ */

/** Collapses secondary actions behind one trigger, so a toolbar never grows a row of equal-weight buttons. */
export function DropdownMenu({ children, label = "More actions", trigger, align = "right", size = "md" }: {
  children: ReactNode | ((close: () => void) => ReactNode);
  label?: string;
  trigger?: ReactNode;
  align?: "left" | "right";
  size?: "sm" | "md";
}) {
  return (
    <Popover align={align} label={label} size={size} menu trigger={trigger ?? <MoreHorizontal size={15} />}>
      {children}
    </Popover>
  );
}

export function MenuItem({ children, onSelect, destructive, disabled, icon }: {
  children: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button type="button" className={"menu-item " + (destructive ? "destructive" : "")} onClick={onSelect} disabled={disabled} role="menuitem">
      {icon && <span className="menu-icon">{icon}</span>}
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="menu-label">{children}</div>;
}

export function MenuSeparator() {
  return <div className="menu-separator" role="separator" />;
}

/** Anchored surface used for menus, filters, and risk-factor evidence. */
export function Popover({ trigger, children, align = "left", label, size = "md", menu }: {
  trigger: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "left" | "right";
  label?: string;
  size?: "sm" | "md" | "lg";
  menu?: boolean;
}) {
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

  const close = () => setOpen(false);

  return (
    // Stops the click reaching a clickable table row underneath, which would open the
    // record drawer at the same time as the menu.
    <div className="popover-wrap" ref={ref} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={"popover-trigger " + (menu ? "menu-trigger" : "")}
        aria-expanded={open}
        aria-haspopup={menu ? "menu" : "dialog"}
        aria-label={label}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      {open && (
        <div className={"popover popover-" + align + " popover-size-" + size} role={menu ? "menu" : undefined} onClick={menu ? close : undefined}>
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
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
