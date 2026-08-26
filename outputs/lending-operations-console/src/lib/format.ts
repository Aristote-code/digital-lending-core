export function formatRwf(value: number, compact = false) {
  if (compact && value >= 1000000) return "RWF " + (value / 1000000).toFixed(value % 1000000 ? 1 : 0) + "M";
  if (compact && value >= 1000) return "RWF " + Math.round(value / 1000) + "K";
  return "RWF " + new Intl.NumberFormat("en-RW").format(value);
}

export function dti(monthlyObligations: number, monthlyIncome: number) {
  return Math.round((monthlyObligations / monthlyIncome) * 100);
}
