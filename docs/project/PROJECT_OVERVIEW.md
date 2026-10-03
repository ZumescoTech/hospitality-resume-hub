# Get Hired project overview

Last reviewed: 2026-09-22. Product authority: [GET_HIRED_PRODUCT_SPEC.md](../../GET_HIRED_PRODUCT_SPEC.md). The filename differs from the title inside the specification; do not create a second product spec.

Get Hired helps cruise-hospitality applicants understand how their existing CV fits a target role and what to improve. Release 0.1 should deliver credible role-specific analysis, 1–3 truthful priority fixes, an understandable report, optional account/save, usefulness feedback, recovery, analytics and privacy controls.

The current implementation is a TanStack Start application with a **deterministic public CV checker**, an extensive existing CV builder, seven templates and PDF export. AI still powers direct builder extraction and writing assistance, and remains in a caller-selectable paid checker path. The builder/export suite predates the current narrower release scope; preserve it while stabilizing the core product. Its presence is not permission to expand Release 0.1.

Current journey: home → checker role dropdown → PDF/DOCX/TXT or paste → browser text extraction → server quality gate and local scoring → score and two fixes → optional WhatsApp capture/skip → category breakdown → optional builder import → edit/preview/PDF. Account routes exist, but dashboard is broken and there is no complete saved-analysis or usefulness-feedback journey.

Target users are cruise food/beverage, guest services and housekeeping applicants. The implemented 15-role registry is broader and differently grouped than the specification. Specialist coverage must be reviewed rather than inferred from dropdown presence.

Principles: Build → Test → Approve → Release → Observe. Preserve working code; fix trust and safety before polish; no invented candidate facts; role-specific evidence rather than generic ATS promises; first value before signup; mobile accessibility; minimal retention; no PII in analytics.

Start with [PROJECT_STATUS](PROJECT_STATUS.md), [ARCHITECTURE](ARCHITECTURE.md), [audit](../../audit.md), [KNOWN_ISSUES](KNOWN_ISSUES.md) and the [session index](../sessions/SESSION_INDEX.md). Current runtime evidence is local/synthetic, not a production certification.
