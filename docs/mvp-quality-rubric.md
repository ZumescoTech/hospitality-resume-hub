# GetHired — MVP Quality Rubric
*Owner: release-readiness gate for the agentic test-and-fix loop. Commit to `docs/mvp-quality-rubric.md`.*

The loop scores the app against this rubric on every full pass. Release is decided by three things together: the **composite score**, the **category floors**, and the **hard gates**. All three must pass. A high composite never overrides a failed hard gate.

---

## 1. Scoring scale

Every sub-dimension is scored **1 to 5** against anchored descriptors:

| Score | Meaning |
|---|---|
| 5 | Ship-quality. No changes needed. |
| 4 | Good. Minor polish only. |
| 3 | Acceptable. Works, but a real user would notice a gap. |
| 2 | Weak. A real problem that undermines the experience or output. |
| 1 | Broken or fails outright. |

A category's raw score is the mean of its sub-dimensions (1 to 5). The category's contribution to the composite is `(mean / 5) × category_weight`. The composite is the sum of all category contributions, out of 100.

**Measurement method** is tagged per sub-dimension and must be honoured honestly:
- **AUTO** — deterministic Playwright / Vitest assertion.
- **JUDGE** — LLM-as-judge against the stated criterion, comparing generated output to source.
- **MANUAL** — cannot be faithfully emulated; requires a human on a real device or real print. Never scored as passed from emulation alone.

---

## 2. Category weights

Weighted toward: does it work, is it easy to use (especially on mobile and slow networks), and does the output actually help the user get interviews.

| Category | Weight | Rationale |
|---|---|---|
| Functional | 22 | Broken = unusable regardless of everything else. |
| UX | 18 | Stated top priority: easy to use, navigate, understand; mobile-first. |
| Resume Design | 16 | The output is the product. Squashing/overflow is a named concern. |
| ATS | 16 | Core value prop: rank high, get interviews. |
| AI | 14 | Guidance quality and, above all, no hallucinations. |
| Performance | 14 | Slow-network and mobile behaviour explicitly matter. |
| **Total** | **100** | |

---

## 3. Categories and sub-dimensions

### Functional — weight 22
| Sub-dimension | What a 5 looks like | Method | MVP-critical |
|---|---|---|---|
| Upload reliability | pdf/docx/txt + OCR fallback upload without crash on all target browsers; paste fallback works | AUTO + MANUAL (iOS) | Yes |
| Parsing accuracy | Extracted `ResumeData` matches source: no dropped roles, dates, or contact fields | JUDGE | Yes |
| Editing | Every field editable; add/remove/reorder sections; no state loss mid-edit | AUTO + MANUAL | Yes |
| Generation | Build produces preview + PDF, spinner always resolves, no silent failure | AUTO | Yes |
| Download | Valid, openable PDF with correct content and sane filename | AUTO | Yes |
| Caching | Refresh preserves the current resume (`hospitality-resume-v1`) and checker draft (`checker-draft-v1`); no work lost | AUTO | Yes (hard gate) |

### UX — weight 18
| Sub-dimension | What a 5 looks like | Method | MVP-critical |
|---|---|---|---|
| Navigation | Obvious path checker↔builder; steps clear; browser back/forward works via URL state | AUTO + MANUAL | Yes |
| Clarity | Labels, empty states, CTAs unambiguous; user always knows the next action | JUDGE + MANUAL | Yes |
| Mobile usability | Tap targets ≥44px, no horizontal scroll, forms usable one-handed on iPhone/Android/tablet | AUTO (emulation) + MANUAL (real device) | Yes |
| Accessibility | WCAG AA contrast, labelled inputs, keyboard nav, sane focus order | AUTO (axe) + MANUAL | Partial (contrast/labels critical; full AA Post-MVP) |
| Visual hierarchy | Scannable; primary actions visually dominant | JUDGE | Yes |

### Resume Design — weight 16
| Sub-dimension | What a 5 looks like | Method | MVP-critical |
|---|---|---|---|
| Typography | Consistent, readable sizes/weights per template | JUDGE | Yes |
| White space | Balanced; not cramped, not sparse | JUDGE | Yes |
| Overflow | No clipped, cut-off, or overlapping text anywhere in the PDF | AUTO + JUDGE | Yes (hard gate) |
| Alignment | Consistent margins; dates/columns aligned | JUDGE | Yes |
| Professional appearance | Recruiter-credible; not "free template" cheap | JUDGE | Yes |
| Multi-page handling | Long CVs paginate cleanly; no orphaned headings; sections not split mid-line | AUTO + JUDGE | Yes |
| Print quality | Prints correctly on A4 and Letter with safe margins | MANUAL | Post-MVP (verify before public launch) |

### ATS — weight 16
| Sub-dimension | What a 5 looks like | Method | MVP-critical |
|---|---|---|---|
| Parsing | Generated PDF is real extractable text (not image), correct reading order | AUTO | Yes |
| Keywords | Role keywords present/surfaced; missing-keyword guidance accurate | JUDGE | Yes |
| Structure | Standard sections with headings an ATS can map | AUTO + JUDGE | Yes |
| Readability | No layout that breaks ATS parsing (flag two-column Harbour) | JUDGE | Yes |
| Section ordering | Logical: summary → experience → skills → education/certs | JUDGE | Yes |

### AI — weight 14
| Sub-dimension | What a 5 looks like | Method | MVP-critical |
|---|---|---|---|
| Grammar | Writing-check catches real errors; no false "fixes" to hospitality jargon | JUDGE | Yes |
| Professional tone | Tailored output reads professionally and on-role | JUDGE | Yes |
| Stronger bullet points | Tailored bullets more action/outcome-led than source, without inflation | JUDGE | Yes |
| Better summaries | Summary improved and role-aligned | JUDGE | Yes |
| No hallucinations | Never invents employers, dates, numbers, or certs; placeholders used for gaps | JUDGE | Yes (hard gate) |

### Performance — weight 14
| Sub-dimension | What a 5 looks like | Method | MVP-critical |
|---|---|---|---|
| Slow 3G | App shell interactive within budget on Playwright slow-3G profile | AUTO (throttle) | Yes |
| Fast 3G | Interactive comfortably within budget | AUTO (throttle) | Yes |
| Desktop | Good Lighthouse/Core Web Vitals | AUTO | Partial |
| Mobile | Good mobile vitals; PDF generation completes within budget under CPU throttle | AUTO (emulation) + MANUAL | Yes |
| Memory usage | No runaway memory on PDF generation, large CVs, or OCR path | AUTO | Yes |

---

## 4. Hard gates (release blockers)

Any single failure here means **Not Ready**, regardless of composite score.

1. **No data loss on refresh** — resume and checker draft survive a reload.
2. **Valid PDF download** — opens, contains the right content, text is machine-extractable.
3. **No AI hallucination** — no fabricated employers, dates, numbers, or certifications in any tailored output.
4. **No PDF overflow/clipping** — no text cut off, pushed off-page, or overlapping in any template at 1 and 2+ pages.
5. **Upload does not crash** on any target browser; the iOS Safari upload crash is resolved and **manually** confirmed on a real device before public launch.
6. **Secrets secured** — `.env` is gitignored with no live keys in git history; service-role key rotated if ever exposed; no service-role key reachable in the client bundle.

---

## 5. Category floors

Each category must reach **≥ 3.5 / 5** (70%). This stops one strong category from masking a weak one. A category below floor blocks release even if the composite clears 80.

---

## 6. Composite gate and readiness bands

| Band | Condition |
|---|---|
| **READY** | Composite ≥ 80/100 **and** all category floors met **and** all hard gates pass |
| **NEARLY** | Composite 70–79, all hard gates pass, every floor within 0.5, only minor fixes remain |
| **NOT READY** | Composite < 70 **or** any hard gate fails **or** any category floor missed |

The loop continues until the app is READY.

---

## 7. Per-CV comparison (feeds AI, ATS, and Design scores)

Each CV in `cv-tests/` is run through the full journey twice: a **baseline pass** (parse → build → download, no tailoring) and an **assisted pass** (Tailor + Writing-check invoked). The generated PDF text is then compared to the source, answering five questions, each scored 1–5:

1. **Information retained** — nothing lost. (Major loss also fails Parsing accuracy.)
2. **Wording improved** — assisted output is genuinely better phrased.
3. **No hallucination** — nothing invented. (Hard gate.)
4. **Stronger overall** — the generated CV is a stronger document than the source.
5. **Recruiter preference** — a hospitality recruiter would prefer the generated version.

The judge must quote specific before/after text as evidence and never approximate a MANUAL check as done.

---

## 8. Critical-for-MVP vs Post-MVP (living list)

**Critical-for-MVP:** all hard gates; every sub-dimension tagged "Yes" above; parsing fidelity across the `cv-tests` set; overflow-free output on all five templates; caching survives refresh; mobile usability on emulation with real-device spot-check.

**Post-MVP (recommend separately, do not gate on):** Service Worker / offline; full WCAG AA; `ANTHROPIC_API_KEY` → `GROQ_API_KEY` rename; per-template PDF layouts; orphan/widow tuning beyond "no clipping"; print-margin verification on physical paper.
