import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * A native <select> renders the operating system's own menu, which no amount of
 * CSS can bring in line with the design system. This is a listbox built from the
 * same primitives as the dropdown menu so it matches everything else.
 */
export function Select({ value, onChange, options, label, id, disabled, placeholder = "Select…" }: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | readonly { value: string; label: string; hint?: string }[];
  label?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const controlId = id ?? generatedId;

  const items = options.map((option) => (typeof option === "string" ? { value: option, label: option, hint: undefined } : option));
  const selected = items.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, items.findIndex((item) => item.value === value)));
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(items.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(items.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (items[active]) commit(items[active].value);
    }
  };

  return (
    <div className="select-wrap" ref={ref}>
      <button
        type="button"
        id={controlId}
        className="select-trigger"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? "" : "select-placeholder"}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="popover popover-left select-list" role="listbox" aria-labelledby={controlId} ref={listRef} tabIndex={-1}>
          {items.map((item, index) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={item.value === value}
              data-active={index === active ? "true" : undefined}
              className={"select-option " + (index === active ? "active" : "")}
              onMouseEnter={() => setActive(index)}
              onClick={() => commit(item.value)}
            >
              <span className="select-check">{item.value === value && <Check size={13} />}</span>
              <span className="select-option-label">
                {item.label}
                {item.hint && <small>{item.hint}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Matches the design system's checkbox rather than the browser's. */
export function Checkbox({ checked, onChange, children, required }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; required?: boolean }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} required={required} onChange={(event) => onChange(event.target.checked)} />
      <span className="checkbox-box" aria-hidden="true">
        <Check size={11} />
      </span>
      <span className="checkbox-label">{children}</span>
    </label>
  );
}
