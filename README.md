# Digital Lending Core — Lending Operations Console

A desktop prototype of the internal operations console for a Rwanda-based, BNR-regulated
non-deposit-taking lender, plus the external employer-verification flow that HR teams use to confirm
an applicant's employment.

> **This is a prototype.** All data is simulated locally in the browser. There are no real KYC,
> credit-bureau, bank, mobile-money, authentication, or regulatory integrations. The credit scoring
> and compliance logic is illustrative product design, not production regulatory advice. Financial
> institutions named in the seed data appear only as fictional counterparties in fabricated demo
> records.

## What it covers

The console follows one loan through its whole lifecycle from the institution's side:

```
Application → KYC → Documents → Employment verification → Credit bureau
→ Risk assessment → Credit decision → Approval → Disbursement
→ Active loan → Repayments → Collections → Closed
```

Seven staff roles — Loan Officer, Credit Officer, Credit Manager, Finance, Collections, Compliance
and CEO — each see their own navigation, queue counts and home content.

### The four demo stories

| Story | What it demonstrates |
|---|---|
| **John Doe** (`APP-00412`) | The happy path. Verify documents, send the employer-verification link, submit it from the external HR page, watch the risk score move 70 → 74 and unblock approval, approve RWF 2.5M with a recorded reason, disburse from Finance, and land on a generated repayment schedule. |
| **Jane Uwase** (`APP-00413`) | The decline. Score 49 / High risk, 73% debt-to-income, arrears on two facilities, failed employer verification, and a reasoned rejection. |
| **Alice Mukamana** (`COL-00038`) | Collections. Record contact, take a promise to pay, restructure the loan without overwriting its history, or escalate into a compliance case. |
| **Executive dashboard** | Every figure derives from live state, so the three stories above visibly move the portfolio numbers. |

Every consequential action writes actor, timestamp, entity, before/after state and reason to a mock
audit trail.

## Running it

```bash
cd outputs/lending-operations-console
npm install
npm run dev
```

| Command | |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests for the reducer and the four demo stories |

State persists to `localStorage`. **Reset demo data** in the sidebar restores the original seed.

## Stack

Vite · React 19 · TypeScript · React Router · Sonner · lucide-react, with a hand-written CSS design
system (semantic tokens, light/dark, three breakpoints, reduced-motion). The visual language follows
[Supabase's design system](https://supabase.com/design-system) — light-first, hairline borders,
compact typography, restrained semantic colour, minimal radius, no decorative gradients — but is
implemented directly rather than by importing Supabase's component packages.

## Repository layout

```
outputs/lending-operations-console/   the app
  src/lib/                            formatting, tone mapping, role access, amortization
  src/components/                     primitives, overlays, data table
  src/layout/                         app shell, sidebar, command menu
  src/pages/                          one file per view; application/ and loan/ hold their tabs
  design-qa.md                        design QA report
work/supabase-references/             captured Supabase design-system screenshots
```

`AGENTS.md` inside the app records the durable design decisions and the canonical demo data, so they
survive between sessions.
