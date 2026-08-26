import type { ScheduleRow } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Demo calendar is anchored to 27 August 2026; month 0 is September 2026. */
export function monthLabel(offset: number, day = 30) {
  const index = 8 + offset;
  const month = index % 12;
  const year = 2026 + Math.floor(index / 12);
  const leap = month === 1 && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lastDay = DAYS_IN_MONTH[month] + (leap ? 1 : 0);
  return String(Math.min(day, lastDay)).padStart(2, "0") + " " + MONTHS[month] + " " + year;
}

/**
 * Flat-rate amortization: interest is spread evenly rather than front-loaded, which matches
 * how these salary products are quoted locally. The final row absorbs rounding drift so the
 * schedule always sums back to principal + interest exactly.
 */
export function buildSchedule(principal: number, interest: number, term: number, paidCount = 0): ScheduleRow[] {
  const principalPart = Math.round(principal / term);
  const interestPart = Math.round(interest / term);

  return Array.from({ length: term }, (_, index) => {
    const last = index === term - 1;
    const rowPrincipal = last ? principal - principalPart * (term - 1) : principalPart;
    const rowInterest = last ? interest - interestPart * (term - 1) : interestPart;
    const total = rowPrincipal + rowInterest;
    const paid = index < paidCount;
    return {
      id: "INS-" + String(index + 1).padStart(2, "0"),
      due: monthLabel(index),
      principal: rowPrincipal,
      interest: rowInterest,
      total,
      paid: paid ? total : 0,
      status: paid ? "Paid" : index === paidCount ? "Due" : "Upcoming",
    };
  });
}

export function installmentOf(principal: number, interest: number, term: number) {
  return Math.round((principal + interest) / term);
}
