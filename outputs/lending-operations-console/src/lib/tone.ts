import type { RiskBand } from "../types";

const success = ["Verified", "Approved", "Active", "Paid", "Completed", "Disbursed", "Closed", "Received", "Analyzed", "Consistent", "Matched", "Passed", "Cleared", "Signed"];
const danger = ["High", "Failed", "Rejected", "Defaulted", "Late", "Attention", "Escalated", "Broken", "Missed"];
const warning = ["Pending", "Uploaded", "Processing", "Approval", "Credit Review", "Promise to pay", "Manual review", "Investigate", "Due", "Restructured", "Expired"];

export function riskTone(risk: RiskBand) {
  return risk === "Low" ? "success" : risk === "Medium" ? "warning" : "danger";
}

export function statusTone(status: string) {
  if (success.includes(status)) return "success";
  if (danger.includes(status)) return "danger";
  if (warning.includes(status)) return "warning";
  return "neutral";
}
