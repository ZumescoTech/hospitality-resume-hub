# Release roadmap

2026-09-22. Source: GET_HIRED_PRODUCT_SPEC.md §32. IN PROGRESS means implementation exists, not that this session is implementing it. No feature is DONE until its release gates pass.

| Order | Feature | Status | Exit evidence |
|---|---|---|---|
| Prerequisite | Security and baseline recovery | BLOCKED | ISSUE-001 CLOSED; RLS proof, public endpoint controls and trustworthy checks remain |
| 1 | F-001 Target Cruise Role | IN PROGRESS | Versioned supported registry, honest custom flow, role-difference QA |
| 2 | F-002 CV Upload & Parsing | IN PROGRESS | Validated/versioned parse contract, recovery, ≥95% on 30+ fixtures |
| 3 | F-003 Cruise CV Analysis Engine | IN PROGRESS | Evidence/score schema, safe cache boundary, versions, no-fabrication/injection matrix |
| 4 | F-004 Prioritised Fixes | IN PROGRESS | 1–3 evidence-linked truthful actions, engagement, usability |
| 5 | F-005 Report Experience | IN PROGRESS | Clear score/context, state recovery, mobile/accessibility, analytics |
| 6 | F-006 Account / Save Report | BLOCKED | Restore account route, verify ownership, save/retrieve original report across signup |
| 7 | F-007 Feedback Capture | NOT STARTED | Analysis-linked Yes/Partly/No + optional comment + safe persistence |
| 8 | Release 0.1 regression / approval / observation | BLOCKED | All release gates; controlled pilot; owner approval before rollout |

## Next release workstreams (updated 2026-10-04)

ISSUE-017 and ISSUE-001 are CLOSED. ISSUE-001 closure does not resolve the remaining 17 npm audit findings or establish release readiness.

1. Next: ISSUE-002 - prove resume ownership and database isolation with reproducible schema/RLS evidence and approved synthetic anonymous/A/B access tests.
2. Address ISSUE-003 public privileged endpoint controls, then ISSUE-004 privacy/retention and replay masking.
3. Restore account/dashboard and durable report continuity using the current persistence work; define analysis ID and versioned report contract. Avoid rebuilding the CV editor.
4. Harden F-001→F-005 in order: role registry/custom support, parser contract/fixtures, truthful evidence-based analysis/fixes and accessible report. Instrument canonical events with each transition.
5. Finish F-006 report signup/save and F-007 feedback against that contract; run the launch fixture/E2E/usability matrix, approve, release to controlled traffic, observe.

Each item is a bounded workstream to split into reviewable sessions, not authorization for a giant implementation. Cleanup is separate and follows safety/stability. Keep existing builder/export capabilities; do not expand them under Release 0.1. Release 0.2 candidates (guided improvement/builder/Noir/export/JD matching) already have partial implementations; do not mark that future release complete. Later cover letters/interviews/jobs/tracking remain outside scope until observed need.
