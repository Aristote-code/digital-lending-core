# Design QA — Lending Operations Console

Run date: 27 August 2026
Build: Vite 6 / React 19 / TypeScript, hand-rolled CSS design system
Verified in-browser at 1440×1024 and 1280×800 (console) and 390×844 (HR verification flow), light and dark.

## Method

The four demo stories were run end to end from a fresh seed in a real browser, not from a type
check. Each consequential action was verified to change visible state *and* write an audit record.
Static analysis (`tsc --noEmit`), the unit suite (`vitest`), and a production build were run after
every fix.

## Result

**final result: passed**

21/21 tests pass, type check clean, production build clean, zero console errors on a fresh tab
after exercising the demo paths.

---

## Demo story verification

| Story | Path exercised | Outcome |
|---|---|---|
| **John — application → disbursement** | My Work → Applications → APP-00412 → Documents → Employment → external HR link → HR confirms → back to operations → Credit → Decision → approve → switch to Finance → disburse → loan detail → schedule | **Pass.** Risk score moved 70 → 74 and band stayed Medium on HR confirmation; HR-confirmed salary populated at RWF 1,200,000 against a 0.4% bank variance; progress advanced 4/9 → 5/9; approval unlocked only after verification; disbursement generated a 12-row schedule, a ledger entry (TX-…), an audit record, and flipped the application to Disbursed |
| **Jane — high-risk rejection** | APP-00413 → Credit → Decision | **Pass.** Score 49 / High, employment Failed, all three red flags render on the risk assessment and the decision rail, no offer, reasoned rejection recorded with before/after state |
| **Alice — collections** | Collections → COL-00038 → record contact → promise to pay → restructure → escalate | **Pass.** Contact updates last-contact and next action; promise sets status, date and amount and shows the reopen notice; restructure shows original vs proposed side by side and preserves the original terms; escalation opens a real compliance case |
| **Executive dashboard** | /executive before and after the above | **Pass.** Every tile derives from live state. Capital deployed increases by exactly RWF 2,500,000 after John's disbursement (asserted in tests); loan-performance, risk-mix donut, PAR and alert counts all recompute |

Persistence and reset were both verified: state survives a reload mid-demo, and **Reset demo data**
restores the seed and returns the clock to zero.

---

## Defects found and fixed

**P0**

1. **App shell scrolled away.** `.shell` used `min-height:100vh` with the document as scroll
   container, so on tall pages (Credit tab, Loans) the topbar and sidebar scrolled off, leaving a
   blank band at the top. Fixed by making `.main` the scroll container above 540px with sticky
   breadcrumbs; mobile layout untouched.
2. **Duplicate React keys.** New collection events were keyed `CE-<clock>`, colliding with seeded
   `CE-1`. Produced console errors and risked dropped rows. Seeded IDs renamespaced to `CE-SEED-*`;
   a regression test now asserts event and audit IDs stay unique.

**P1**

3. **Theme ignored outside the shell.** The `data-theme` attribute was only set inside the app
   shell's effect, so login and the external HR flow always rendered light. Moved to a boot-time
   assignment in `main.tsx`.
4. **Impossible calendar dates.** Schedules emitted "30 Feb 2027". `monthLabel` now clamps to the
   real month length and handles leap years; covered by tests.
5. **Decision dialog mislabelled.** Title and confirm button read "Approved" (the outcome enum)
   rather than "Approve loan". Mapped to human action labels.

**P2**

6. `text-align:right` leaked from the factor row into the risk-factor evidence popover.
7. Three grids assumed a fixed child count — executive metrics (5 vs 6 tiles), the collection hero
   (4 vs 5 cells), and the decision comparison (4 vs 6 cells) — producing ragged partial rows.
8. **Implausible portfolio health.** The seed cycled loan statuses evenly, putting a third of the
   book in arrears and showing PAR 30 of 19%. Reweighted to a realistic distribution; PAR 30 now
   reads 7.6%.
9. Alice's loan conflated `nextPayment` with the overdue amount, so the restructure sheet compared
   arrears against an instalment. Now uses the true instalment.
10. Seeded collection timeline was oldest-first while new events prepend newest-first.

---

## State and audit integrity

- The demo clock is anchored to 27 Aug 2026 11:32 and advances per action, so audit entries read as
  a sequence. Previously every entry shared one hardcoded timestamp.
- Disbursement previously marked *every* application belonging to the customer as disbursed; it now
  targets only the application linked to that loan.
- The repayment schedule is real persisted state generated on disbursement, not synthesised at
  render time from an arbitrary interest curve. Rows sum back to principal + interest exactly.
- Every consequential action records actor, timestamp, entity, before/after and reason.

## Accessibility

- Dialogs and sheets trap Tab, close on Escape, restore focus to the opener, and are labelled via
  `aria-labelledby`.
- `⌘K` opens the command menu from anywhere; Escape closes it; Enter activates the first result.
- Sortable headers are real buttons with `Sort by …` labels; icon-only buttons carry `aria-label`.
- Tabs expose `role="tablist"` / `aria-selected`; popovers expose `aria-expanded`.
- Existing `prefers-reduced-motion` block still suppresses the skeleton shimmer and transitions.

## Responsive

- 1440×1024 and 1280×800: the evidence split view, three-column document review, and all queues hold
  without horizontal scroll. Wide tables scroll inside their own container.
- 390×844: the HR verification flow is single-column and comfortable, and respects the theme.

---

## Deliberate deviations from the original brief

These are decisions the user made, recorded so they are not mistaken for oversights:

1. **No Tailwind, shadcn/Radix, or TanStack Table.** The brief named them; the user chose to keep
   the existing hand-rolled CSS system. Composition rules (page header/section, sheets for context,
   dialogs for short forms, alert dialogs for financial actions) are still followed.
2. **Tokens are hex, not OKLCH.** Cosmetically identical; a mechanical conversion remains available.
3. **The three-concept 1440×1024 checkpoint was not re-run.** The originally selected
   "evidence-focused split view" survives in the implementation and was refined in place.

## Known limitations

- **Loading skeletons appear only on the document preview**, the one genuinely asynchronous
  interaction. All other data is local and synchronous, so adding artificial latency elsewhere would
  slow the demo without representing anything real.
- **Portfolio growth chart uses fixed monthly values** (Mar–Aug 2026); every other executive figure
  is derived from live state.
- **Some non-core controls are intentionally visual-only** and acknowledge themselves with a toast:
  New application, Send reminder, Assign to me, and the various Export/Download actions. All
  controls on the four demo paths function.
- The loan Documents tab lists a static contract pack; document lifecycle is modelled on the
  application side.
