# Lending Operations Console — prototype instructions

Desktop lending-operations prototype for a Rwanda-based non-deposit-taking lender, plus one
responsive external employer-verification flow. All data is simulated locally. There are no real
KYC, bureau, bank, MoMo, authentication, or regulatory integrations, and none should be added.

## Durable design decisions

**Visual direction — the code is the source of truth.** The user selected "direction 2, the
evidence-focused split view" from a 27 August 2026 ideation set. Those generated images no longer
exist and the direction was never described in text, but it survived in the implementation: the
Application Workspace is a split view with assessment-evidence rows on the left and a decision rail
on the right. Refine that in place. Do not regenerate concepts or re-run the three-concept
selection checkpoint. Secondary reference: the captured Supabase screenshots in
`../../work/supabase-references/`.

**Styling stack.** Hand-rolled CSS in `src/styles.css` with semantic tokens and real light/dark
blocks. The original brief named Tailwind + Radix/shadcn + TanStack Table; the user decided against
migrating. Do not introduce those dependencies. Keep the Supabase visual language by hand: light
first with a persistent dark toggle, compact typography, hairline borders, restrained semantic
color, minimal radius, no decorative gradients.

**Icons.** Real icons from `lucide-react` only. Never fabricate visual assets with CSS drawings,
emoji, or inline SVG approximations.

**Source conflicts, resolved.** The compiled chat history contradicts itself in places; Conversation
4 is the final narrowed direction and wins:

- The loan officer persona is **Marie**, not Christine.
- John's application is **RWF 3,000,000 requested → RWF 2,500,000 approved**, not the earlier
  2M/2M figures.

**Canonical demo data — do not drift.** John Doe (APP-00412 → LN-00045, IST Solutions, Product
Designer, started 12 Jan 2024, salary RWF 1,200,000, bank deposit RWF 1,195,000 = 0.4% variance,
score 74/Medium, HR reference EV-00218). Jane Uwase (APP-00413, requested RWF 5,000,000, salary
RWF 1,500,000, obligations RWF 1,100,000, score 49/High, three red flags). Alice Mukamana
(COL-00038 on LN-00038, 14 days overdue, RWF 380,000). Dates are anchored to 27 August 2026.
Currency is RWF.

## Scope

Four stakeholder demo stories must fully function: John's application through disbursement and
repayment schedule; Jane's high-risk rejection; Alice's overdue collection and promise-to-pay; and
the executive dashboard reflecting all three. Non-core controls outside those paths may remain
visual-only. Borrower and investor applications are out of scope.

Application and loan detail use **tabs**, not additional routes. Consequential financial actions go
through Alert Dialogs; contextual detail through Sheets; short forms through Dialogs.

Every consequential action must record actor, timestamp, entity, before/after state, and reason in
the mock audit trail. Compliance and scoring content is prototype logic, and must be presented as
such — never as production regulatory advice.

## Working agreements

Run the dev server yourself and verify in the browser. Do not hand the user server-start
instructions when you can run it, and do not claim a UI change works on the basis of a typecheck.

When the user gives durable prototype-specific design feedback, preferences, or decisions, record
them in this file.
