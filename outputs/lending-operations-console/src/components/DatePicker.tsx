import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function parse(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

function iso(year: number, month: number, day: number) {
  return year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

export function formatDisplay(value: string) {
  const { year, month, day } = parse(value);
  return String(day).padStart(2, "0") + " " + SHORT[month] + " " + year;
}

/**
 * A calendar rendered in the app rather than by the browser, so the picker
 * matches the rest of the system instead of falling back to the OS control.
 */
export function DatePicker({ value, onChange, min, label }: { value: string; onChange: (value: string) => void; min?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const [view, setView] = useState({ year: selected.year, month: selected.month });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setView({ year: selected.year, month: selected.month });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  // Monday-first offset for the leading blanks.
  const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const minimum = min ? parse(min) : null;

  const isBeforeMin = (day: number) => {
    if (!minimum) return false;
    if (view.year !== minimum.year) return view.year < minimum.year;
    if (view.month !== minimum.month) return view.month < minimum.month;
    return day < minimum.day;
  };

  const step = (delta: number) => {
    setView((current) => {
      const month = current.month + delta;
      if (month < 0) return { year: current.year - 1, month: 11 };
      if (month > 11) return { year: current.year + 1, month: 0 };
      return { ...current, month };
    });
  };

  return (
    <div className="select-wrap" ref={ref}>
      <button type="button" className="select-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
        <span>{formatDisplay(value)}</span>
        <CalendarDays size={14} />
      </button>
      {open && (
        <div className="popover popover-left calendar" role="dialog" aria-label="Choose a date">
          <div className="calendar-head">
            <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Previous month">
              <ChevronLeft size={15} />
            </button>
            <strong>
              {MONTHS[view.month]} {view.year}
            </strong>
            <button type="button" className="icon-btn" onClick={() => step(1)} aria-label="Next month">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="calendar-grid">
            {WEEKDAYS.map((day, index) => (
              <span className="calendar-weekday" key={index}>
                {day}
              </span>
            ))}
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={"blank" + index} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const isSelected = selected.year === view.year && selected.month === view.month && selected.day === day;
              const disabled = isBeforeMin(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={"calendar-day " + (isSelected ? "selected" : "")}
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso(view.year, view.month, day));
                    setOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
