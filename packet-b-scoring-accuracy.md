# Packet B-1 — Scoring Accuracy Against Fixtures

**App:** GetHired — Cruise CV Checker
**Stack:** React + TanStack Router, Cloudflare Workers, Supabase, LLM scoring via Groq `llama-3.3-70b-versatile` (production has `GROQ_API_KEY`).
**Prod:** https://hospitality-resume-hub.madzunguruset.workers.dev/tools/cruise-cv-checker
**Preview:** https://hospitality-resume-hub-preview.madzunguruset.workers.dev/tools/cruise-cv-checker
**Owner:** Tino Madzunguruse (Zumesco Tech)
**Executor:** Claude Code
**Depends on:** B-0 (extraction) and R-1 (Sommelier role) — both closed on preview.
**Method:** loop-engineering + TDD. One bug = one branch = one commit = one loop. INVESTIGATE → RED → FIX → GREEN → REGRESSION SWEEP. No fix without a failing test first. **Not complete until deployed to preview and confirmed live at the URL.**

---

## 0. Read this first

B-0 fixed the plumbing — the scorer no longer silently returns fake 0s. B-1 tunes the *judgment*. The scorer must now track expert reality: a real 2-year F&B CV should score in the 60s or 70s, not identically to an unrelated office CV. The UAT-blocker scenario ("Miguel: real relevant F&B CV → 0/100 Major Gaps") is what B-1 has to make impossible.

Two disciplines make this loop different from A and B-0:

1. **Every claim about "better scoring" must be provable against the fixture suite.** Do not tune against vibes. Do not tune against a single CV. The suite is the spec.
2. **Never overfit to fixtures.** If you tweak the prompt until every fixture lands mid-band exactly, you have not fixed scoring — you have taught it to pass a specific test. Prefer changes that improve *the rubric and role context* over changes that pattern-match individual CVs. If Claude Code finds itself adding CV-specific hints to the prompt, stop and reconsider.

---

## 1. The fixture set — the full 5-CV Sommelier suite

Store under `tests/fixtures/cv-scoring/`. Each fixture is one markdown file with YAML front-matter (labels) and the CV body. The fixture loader (built for B-0) already reads these; two of the five are seeded, three are added in this packet — one existing (cv3) already in place, plus cv6 and cv7 net-new.

### 1.1 The full ranking B-1 must produce

The single most important assertion in this whole packet:

| id | role | expected band | rank | fixture status |
|----|------|---------------|------|----------------|
| **cv5** — SOMMELIER (strongest, Pigalle + Cunard) | sommelier-wine-waiter | 83–90 | 1 | seeded in B-0 |
| **cv4** — SOMMELIER-WINEWAITER (Cunard, land+sea) | sommelier-wine-waiter | 73–80 | 2 | seeded in B-0 |
| **cv3** — WINESTEWARD (weakest of the three sommeliers) | sommelier-wine-waiter | 65–70 | 3 | seeded in B-0 |
| **cv6** — Thabo Nyathi (weak-but-on-topic, entry-level waiter) | sommelier-wine-waiter | 30–45 | 4 | **NEW — §1.3** |
| **cv7** — Sarah Molefe (office admin, negative control) | sommelier-wine-waiter | 5–20 | 5 | **NEW — §1.2** |

**Required properties of a green run:**
- Every CV lands *in-band* (± tolerance defined in §3).
- The ranking cv5 > cv4 > cv3 > cv6 > cv7 holds strictly.
- No CV scores exactly 0 (that's a B-0 regression).
- cv7 scores meaningfully lower than cv6 (proves role-fit is being judged, not just polish).
- cv6 scores meaningfully higher than cv7 (proves on-topic real experience is rewarded, not just credentials).
- Feedback contents match each fixture's `shouldFlag` / `shouldNotFlag`.

### 1.2 New fixture — cv7 (negative control, office admin)

**Purpose:** Distinguishes a *legitimate* low score (earned by role-fit judgment) from a *defaulted* zero (parse failure). Without this fixture, "0" and "12" look the same and B-0's fix is unverifiable in the wild.

**Design principles for this negative control:**
- Plausible, well-written CV of a real professional in a completely unrelated field.
- No hospitality, F&B, wine, cruise, service, upselling, WSET, or seafarer signals — none.
- Should score low because *role-fit* is bad, not because the CV is badly written. This is the distinction the scorer must learn.

Create as `tests/fixtures/cv-scoring/sommelier-cv7-negative-control-office-admin.md`:

```markdown
---
id: sommelier-cv7-negative-control-office-admin
role: sommelier-wine-waiter
expectedBand: [5, 20]
expectedRankWithinRole: 5
shouldFlag:
  - "CV is for a different field (office administration)"
  - "no hospitality or F&B experience"
  - "no wine, beverage service, or sommelier credentials"
  - "no cruise-line or shipboard experience"
shouldNotFlag:
  - "add more quantified achievements"
  - "improve summary tailoring"
  - "improve formatting"
notes: >
  Negative control. Plausible, well-written CV of a real professional in a completely
  unrelated field. Purpose: proves low scores are earned by role-fit judgment, not
  defaulted by a parse failure. If this scores 0 exactly, investigate parser. If it
  scores above 30, the scorer is not weighting role fit.
---

Sarah Molefe — Office Administrator
Johannesburg, South Africa · sarah.molefe@email.com · +27 82 555 0142

PROFILE
Detail-oriented office administrator with 4 years of experience supporting mid-size
professional services firms. Skilled in diary management, procurement, invoice
processing, and internal communications. Known for calm handling of competing
priorities and reliable follow-through.

WORK EXPERIENCE

Office Administrator · Marston & Associates (Legal Services) — Feb 2022 – Present
- Manage the reception, diary, and meeting-room bookings for a 22-person firm.
- Process supplier invoices in Sage and reconcile monthly petty cash.
- Coordinate internal communications, staff newsletter, and quarterly team events.
- Point of contact for building management, IT support callouts, and courier bookings.

Administrative Assistant · BrightPath Accounting — Aug 2020 – Jan 2022
- Supported three partners with diary management, expense claims, and travel bookings.
- Handled client correspondence, filing, and preparation of engagement letters.
- Maintained the CRM (HubSpot) and produced weekly pipeline reports.

Receptionist (Temp) · Various — Jan 2020 – Jul 2020
- Front-desk cover across three law firms and a medical practice.

EDUCATION
Diploma in Office Administration · Damelin College, Johannesburg (2019)
Matric · Parktown Girls' High School (2018)

SKILLS
Microsoft Office (Word, Excel, Outlook), Sage, HubSpot CRM, diary management,
minute-taking, filing systems, telephone manner

LANGUAGES
English, isiZulu (native)
```

### 1.3 New fixture — cv6 (weak-but-on-topic, entry-level waiter)

**Purpose:** Tests the *bottom of the legitimate range* — a real applicant who genuinely deserves a low-but-not-terrible score. This is the fixture that most directly protects the Miguel/Tendai UAT personas from being handed a 0/100 "Major Gaps" verdict for a real, on-topic CV.

**Design principles:**
- Real F&B / hospitality work but no specialism, no cruise exposure, no credentials, minimal formatting.
- Authentically weak — unprofessional email, generic summary, unquantified bullets, thin skills list.
- Must score meaningfully higher than cv7 (on-topic real experience > polished off-topic CV) and meaningfully lower than cv3 (no specialism, no credentials, no cruise).

Create as `tests/fixtures/cv-scoring/sommelier-cv6-weak-on-topic-entry-level.md`:

```markdown
---
id: sommelier-cv6-weak-on-topic-entry-level
role: sommelier-wine-waiter
expectedBand: [30, 45]
expectedRankWithinRole: 4
shouldFlag:
  - "no wine specialism or WSET credential"
  - "no cruise or shipboard experience"
  - "no seafarer documents (C1/D, ENG1, seaman's book)"
  - "achievements not quantified"
  - "unprofessional email address"
  - "summary is generic — no specialty or years framing"
shouldNotFlag:
  - "no hospitality experience"
  - "irrelevant to the role"
  - "wrong industry"
notes: >
  Weak-but-on-topic entry-level applicant. Real F&B service experience but no
  specialism, no cruise exposure, no credentials, minimal formatting. Protects the
  Tendai / Miguel personas from the UAT "0/100 Major Gaps" bug. If this scores under
  25, scorer is too harsh on entry-level. If over 55, it's not rewarding depth or
  credentials enough.
---

Thabo Nyathi
Cape Town · thabonyathi22@gmail.com · 076 234 8891

About me
I am hardworking and passionate about the restaurant industry. I want to work on a
cruise ship because I love travel and meeting people. I learn quickly and I am reliable.

Work Experience

Waiter · Ocean Basket, Sea Point — March 2024 to present
- Serving customers at busy family restaurant.
- Taking orders and delivering food and drinks.
- Working weekends and public holidays.
- Cash-up at end of shift.

Kitchen Helper · Cafe Roux (Noordhoek) — June 2023 to Feb 2024
- Helped with prep in the kitchen.
- Cleaning and washing dishes.
- Started doing some waiter shifts on Sundays.

Education
Matric · Fezeka Senior Secondary School, Gugulethu (2022)

Skills
Customer service, team work, hard worker, POS

Languages
English, Xhosa
```

### 1.4 Existing fixtures — reminder

The three sommelier CVs (cv3, cv4, cv5) are already in `tests/fixtures/cv-scoring/` from B-0. Do not re-create them. Their labelled bands and `shouldFlag` / `shouldNotFlag` sets are the source of truth carried through this loop unchanged.

---

## 2. The rubric — single source of truth

The scorer must use this rubric. If the current prompt encodes different weights, align it to this table exactly. This is the same rubric introduced in Packet B §2 — restated here so B-1 has no ambiguity.

| Dimension | Weight | What it measures |
|-----------|--------|------------------|
| Role & keyword match | 25 | Sommelier, wine pairing, upselling, beverage revenue, inventory/stock, FOH, guest experience |
| Experience relevance & depth | 25 | Years, seniority, and **cruise/shipboard experience specifically** |
| Quantified achievements | 15 | Real numbers proving impact (25% club growth, 350-seat floor, revenue vs target) |
| Certifications | 10 | WSET, Cape Wine Academy |
| **Cruise-readiness / documents** | 10 | C1/D visa, Seafarer's Medical (ENG1), Seaman's Book — the cruise-specific signal a generic ATS misses |
| Structure & ATS parseability | 10 | Clean headings, standard sections, parseable skills (not walls of text), complete contact block |
| Summary quality | 5 | Leads with specialty + years, tailored to role |

**Headline score = weighted sum of the seven category scores using these weights.** This is also B-2's spec — if B-1 changes weightings, coordinate with B-2 so a single source of truth is preserved.

---

## 3. The loop

### Precondition checks (do these first, before writing anything)

- [ ] B-0 and R-1 are green on preview. Fixture suite for cv3/cv4/cv5 already runs and produces non-zero scores with the ranking cv5 > cv4 > cv3.
- [ ] The two new fixture files (cv6, cv7) in §1.2 and §1.3 are created verbatim and picked up by the fixture loader.
- [ ] Confirm the current scoring prompt's rubric weights. Report any divergence from §2 before proceeding — do not silently rewrite the rubric.

If any precondition fails, STOP and report — do not fix on the fly.

### INVESTIGATE

Read the current scoring path in full before touching it:

- The prompt(s) the model sees (system prompt, role context, rubric instructions, output schema).
- Where role-specific context is injected — does the sommelier profile from R-1 flow through to the prompt, or is it just a keyword list on the client side?
- How the response is parsed into categories + headline (touched in B-0 — confirm state).
- Whether few-shot examples are already in the prompt, and if so, what CVs they use.

Report the current state before proposing changes. In particular, state:
- Which of the seven rubric dimensions in §2 the current prompt actually asks the model to score.
- Whether the model receives the fixtures' style of role context (sommelier vs bartender) or a generic "cruise ship worker" context.
- What the current output schema looks like.

### RED — write failing tests first

Add these tests to the fixture suite. They should FAIL against the current build:

1. **Band assertion (per CV):** each of the five CVs scores within its `expectedBand` (with tolerance per §3.1 below).
2. **Ranking assertion:** the five CVs' scores, sorted descending, produce the order `[cv5, cv4, cv3, cv6, cv7]` strictly.
3. **Anti-collapse assertion:** `score(cv6) - score(cv7) >= 15` and `score(cv3) - score(cv6) >= 15`. Prevents a scorer that lands everything in a narrow band.
4. **Anti-zero regression:** none of the five scores exactly 0 (guards against B-0 regression).
5. **Flag assertions:** for each CV, the feedback text contains at least 2 of the fixture's `shouldFlag` items (fuzzy match, case-insensitive) and contains NONE of the fixture's `shouldNotFlag` items (exact-phrase match).
6. **Category / headline reconciliation:** the headline score equals the weighted sum of the seven category scores using §2 weights (this is also B-2's assertion — B-1 must not break it).

#### 3.1 Tolerance policy

LLM scoring is not deterministic. Bands are ranges, not points. The suite must be run **three times** per assertion, and:

- A CV "lands in band" if the **median of three runs** falls inside the band.
- Ranking must hold on **all three runs** (no fluky orderings).
- If any run scores a CV outside band by more than 10 points, the test fails — even if the median is in-band. That's a variance problem, not just a calibration problem.

If variance is high enough that this policy is impractical, note it in the loop report. High variance is itself a finding — it means the prompt is under-specified.

### FIX (direction — confirm against investigation)

The changes most likely to move accuracy without overfitting, in order of preference:

1. **Align the rubric.** Ensure the prompt asks the model to score against exactly the seven dimensions in §2, with those weights, and computes the headline as their weighted sum.
2. **Inject the correct role context.** The sommelier prompt must reference wine pairing, WSET, cellar work, upselling, guest education, seafarer documents — not mixology, not a generic "cruise ship staff" persona. R-1 added the role; B-1 must make sure the prompt actually uses it.
3. **Add role-appropriate few-shot examples in the prompt.** Two examples are usually enough: one strong (cv5-style, band 83–90) and one weak-but-real (cv6-style, band 30–45), with brief reasoning. **Do NOT use cv3, cv4, cv5, cv6 or cv7 verbatim** as few-shot examples — that's overfitting. Write short synthetic examples that illustrate the *pattern* of scoring, not the specific fixtures.
4. **Constrain output to structured JSON.** If not already done in B-0, force structured output so category and headline scores always parse together (B-0 property).
5. **Reduce variance.** Set temperature low (0.0–0.2) for scoring calls. Consistency matters more than creativity for a rubric-driven judgment.
6. **Guard against a two-mode collapse.** If in testing you see the scorer producing only "polished" or "reject" outputs, add explicit rubric language: "A CV can be genuinely on-topic and score in the 30s or 40s — real hospitality experience without specialism deserves this band, not a rejection."

Do NOT:
- Add CV-specific hints (e.g. "Thabo scores 38 because…") to the prompt. Overfitting.
- Tune category weights away from §2 without a corresponding update to §2 and B-2 in the same PR.
- Introduce role-specific hardcoded score adjustments in code — the model must be the source of judgment, guided by the prompt.

### GREEN — acceptance criteria

- [ ] All five CVs land in their expected bands (median of three runs; no single run more than 10 points out).
- [ ] Strict ranking cv5 > cv4 > cv3 > cv6 > cv7 holds on all three runs.
- [ ] `score(cv6) - score(cv7) >= 15` on all three runs.
- [ ] `score(cv3) - score(cv6) >= 15` on all three runs.
- [ ] No CV scores exactly 0 on any run.
- [ ] cv7 flags "different field / off-role", does NOT flag "add more quantified achievements" or "improve formatting".
- [ ] cv6 flags "no wine specialism", "no cruise experience", "no seafarer documents", does NOT flag "no hospitality experience" or "wrong industry".
- [ ] Headline == weighted sum of the seven categories per §2 for every CV, every run.
- [ ] Verified live on preview: the three original CVs (cv3/cv4/cv5) uploaded via the actual file picker under Sommelier / Wine Waiter return scores consistent with fixture output.

### REGRESSION SWEEP

- [ ] B-0 tests still pass (extraction never defaults to 0; forced parse failure surfaces honest error).
- [ ] R-1 tests still pass (Sommelier role present, feedback wine-relevant not bartender-relevant).
- [ ] No unrelated route or feature broken by prompt/scoring changes.

---

## 4. Report format when the loop closes

Paste this in the PR body:

```
### B-1 result

Fixture ranking (median of 3 runs):
cv5 = ___   [expected 83–90]   in-band? ___
cv4 = ___   [expected 73–80]   in-band? ___
cv3 = ___   [expected 65–70]   in-band? ___
cv6 = ___   [expected 30–45]   in-band? ___
cv7 = ___   [expected 5–20]    in-band? ___

Ranking strict on all 3 runs? ___
Gap(cv6 - cv7) on 3 runs: ___ / ___ / ___
Gap(cv3 - cv6) on 3 runs: ___ / ___ / ___

Flags-match on cv7 shouldFlag: ___ / must NOT flag: ___
Flags-match on cv6 shouldFlag: ___ / must NOT flag: ___

B-0 extraction tests still green? ___
R-1 role tests still green? ___
B-2 headline/breakdown reconciliation still holds? ___

Live preview verification (3 real PDFs):
cv5 (SOMMELIER.pdf)         → ___
cv4 (SOMMELIER-WINEWAITER)  → ___
cv3 (WINESTEWARD)           → ___
Ranking matches fixture output? ___

Root cause of the pre-B-1 mis-scoring, in one paragraph:
[explain what actually needed changing]

Overfitting check: did any prompt change hard-code CV-specific hints? ___

Regression risk: ___
```

---

## 5. Commit / PR convention

```
fix(B-1): scoring accuracy against 5-CV Sommelier fixture suite

INVESTIGATE: [what the current prompt actually scored on and why the pre-B-1
build could not distinguish cv6 from cv7 / could not land cv3 in its band]

TEST (red→green): added band, ranking, anti-collapse, flag, and headline
reconciliation assertions to tests/fixtures/cv-scoring/. Median-of-3 policy
applied per §3.1.

RISK: shared scoring prompt affects all roles — spot-checked one non-sommelier
fixture (or noted absence). B-0 and R-1 suites re-run, green.
```

One loop = one branch = one PR = one deploy-to-preview. Do NOT deploy to production.

---

## 6. Execution order

1. Precondition checks (§3).
2. Drop in the two new fixture files (§1.2, §1.3).
3. INVESTIGATE the current scoring path; report state.
4. Write the failing tests (§3 RED).
5. Iterate on the prompt / role context / few-shot until GREEN.
6. Regression sweep.
7. Deploy to preview.
8. Report in the format in §4.
9. STOP for PM sign-off. Do NOT auto-continue to B-2.

---

## 7. Decisions owed (already made — do not re-ask)

| Item | Decision |
|------|----------|
| Rubric weights | As §2. Cruise-documents = 10. |
| cv6 expected band | 30–45 |
| cv7 expected band | 5–20 |
| Anti-collapse gaps | ≥15 between cv3/cv6 and cv6/cv7 |
| Tolerance | Median of 3 runs; no single run more than 10 points out of band |
| Overfitting | Prohibited (no CV-specific prompt hints; no fixture verbatim in few-shot) |

---

## 8. Downstream note (not this packet)

Once B-1 is green and the scorer is trustworthy, the checker's results page becomes genuinely useful, question-shaped content — "what does a Sommelier cruise CV need," "why did my cruise CV score low," "the 3 things Cunard actually rewards." That is the AEO/answer-engine surface that pulls in first-time applicants searching those queries. A trustworthy score is the precondition for building that acquisition layer. Scoring integrity first; content leverage after B-3.

---

*End of Packet B-1.*
