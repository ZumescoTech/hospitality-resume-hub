# Release roadmap

2026-09-22. Source: GET_HIRED_PRODUCT_SPEC.md §32. IN PROGRESS means implementation exists, not that this session is implementing it. No feature is DONE until its release gates pass.

| Order | Feature | Status | Exit evidence |
|---|---|---|---|
| Prerequisite | Security and baseline recovery | BLOCKED | Critical dependency remediation, RLS proof, public endpoint controls, trustworthy checks |
| 1 | F-001 Target Cruise Role | IN PROGRESS | Versioned supported registry, honest custom flow, role-difference QA |
| 2 | F-002 CV Upload & Parsing | IN PROGRESS | Validated/versioned parse contract, recovery, ≥95% on 30+ fixtures |
| 3 | F-003 Cruise CV Analysis Engine | IN PROGRESS | Evidence/score schema, safe cache boundary, versions, no-fabrication/injection matrix |
| 4 | F-004 Prioritised Fixes | IN PROGRESS | 1–3 evidence-linked truthful actions, engagement, usability |
| 5 | F-005 Report Experience | IN PROGRESS | Clear score/context, state recovery, mobile/accessibility, analytics |
| 6 | F-006 Account / Save Report | BLOCKED | Restore account route, verify ownership, save/retrieve original report across signup |
| 7 | F-007 Feedback Capture | NOT STARTED | Analysis-linked Yes/Partly/No + optional comment + safe persistence |
| 8 | Release 0.1 regression / approval / observation | BLOCKED | All release gates; controlled pilot; owner approval before rollout |

## Next five coherent tasks

1. ISSUE-017 credential containment is CLOSED on recorded owner confirmation and repository remediation. Next, patch and verify the vulnerable serialization dependency boundary. Establish a safe baseline without changing product scope.
2. Prove data ownership and restrict privileged/public endpoints, then document privacy/retention and verify replay masking. Obtain approved synthetic test accounts rather than probing real users.
3. Restore account/dashboard and durable report continuity using the current persistence work; define analysis ID and versioned report contract. Avoid rebuilding the CV editor.
4. Harden F-001→F-005 in order: role registry/custom support, parser contract/fixtures, truthful evidence-based analysis/fixes and accessible report. Instrument canonical events with each transition.
5. Finish F-006 report signup/save and F-007 feedback against that contract; run the launch fixture/E2E/usability matrix, approve, release to controlled traffic, observe.

Each item is a bounded workstream to split into reviewable sessions, not authorization for a giant implementation. Cleanup is separate and follows safety/stability. Keep existing builder/export capabilities; do not expand them under Release 0.1. Release 0.2 candidates (guided improvement/builder/Noir/export/JD matching) already have partial implementations; do not mark that future release complete. Later cover letters/interviews/jobs/tracking remain outside scope until observed need.
