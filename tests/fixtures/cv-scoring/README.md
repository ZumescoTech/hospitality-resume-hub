# CV Scoring Fixtures

Expert-labelled CV fixtures for regression-testing the cruise CV checker scoring engine.

## Purpose

Every scoring fix must pass this suite. If a change causes any fixture to land outside its
expected band, or breaks the ranking order, it is a regression — do not merge.

## Acceptance criteria (must hold after every scoring change)

1. All CVs score non-zero.
2. Ranking: cv5 > cv4 > cv3 > cv2 > cv1 (within sommelier-wine-waiter role).
3. Each CV lands within its `expectedBand` (±5 points tolerance for LLM variance).
4. A forced parse failure returns an explicit error — never a fabricated 0.
5. Score and band tier always agree (score < 50 → "Major Gaps", never "Needs Work").

## Fixture set — Sommelier / Wine Waiter role

| File | Candidate | Expected band | Rank | Key differentiator |
|------|-----------|---------------|------|--------------------|
| `sommelier-cv1-innocent-chilongo.json` | Innocent Chilongo | 62–68 | 5 (weakest) | No cruise exp, no docs, vague bullets |
| `sommelier-cv2-michelle-gaswa.json` | Michelle Gaswa | 68–74 | 4 | No cruise exp, no docs, one quantified bullet |
| `sommelier-cv3-tinotenda-winesteward.json` | Tinotenda Madzunguruse (Wine Steward ver.) | 70–76 | 3 | All 4 seafarer docs present, no cruise exp in body |
| `sommelier-cv4-tinotenda-sommelier-winewaiter.json` | Tinotenda Madzunguruse (Sommelier/WW ver.) | 77–83 | 2 | Cunard Queen Victoria experience, no docs listed |
| `sommelier-cv5-tinotenda-wine-waiter.json` | Tinotenda Madzunguruse (Wine Waiter ver.) | 82–88 | 1 (strongest) | Cunard + Pigalle 350-seat, richest bullets |

## Rubric weights (§2 of packet-b-scoring.md — single source of truth)

| Dimension | Weight |
|-----------|--------|
| Role & keyword match | 25% |
| Experience relevance & depth (incl. cruise/shipboard) | 25% |
| Quantified achievements | 15% |
| Certifications (WSET, Cape Wine Academy) | 10% |
| Cruise-readiness / documents (C1/D, ENG1, Seaman's Book) | 10% |
| Structure & ATS parseability | 10% |
| Summary quality | 5% |

## Still needed (Tino to provide)

- 1 genuinely weak but on-topic CV (~30–45 band) — proves low scores are earned, not defaulted
- 1 irrelevant negative control (e.g. office admin CV) — should score near zero legitimately

## Record shape

```json
{
  "id": "string — kebab-case unique ID",
  "role": "sommelier-wine-waiter",
  "expectedBand": [low, high],
  "expectedRankWithinRole": 1,
  "shouldFlag": ["things the checker must mention"],
  "shouldNotFlag": ["things the checker must NOT penalise"],
  "notes": "Expert reasoning behind the band assignment",
  "cvText": "full plain-text CV content"
}
```
