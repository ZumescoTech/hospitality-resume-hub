# Document classification fixtures

Synthetic documents for the CV validation gate (`src/lib/cvDocumentClassifier.ts`).
Every person, business, account and number here is invented — never add real
documents. `cv/` holds documents that must be accepted as CVs (alongside every
file in `../cvs/` and `../cv-scoring/`); `non-cv/` holds documents that must
never receive a CV score.
