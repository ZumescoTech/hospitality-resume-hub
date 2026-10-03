# AGENTS.md — Get Hired

## Mission

This repository is being prepared for a controlled **Get Hired Release 0.1**.

Optimize for:

1. correctness,
2. security,
3. small reviewable changes,
4. release evidence,
5. continuity,
6. low token and tool usage.

Do not optimize for feature volume.

---

# 1. Working model

Use this project workflow by default:

**Local repository → Git → GitHub → Cloudflare**

Supabase provides backend services such as database, authentication, storage, and policies.

Work locally whenever possible.

Use remote tools only when the task requires information or actions that cannot be reliably obtained from the local repository.

Do not deploy, migrate production data, modify production infrastructure, force-push, rotate secrets, or perform destructive remote actions unless explicitly authorized.

---

# 2. Tool and MCP policy

This project intentionally uses a small toolset.

Preferred tools:

- local filesystem
- terminal
- Git
- GitHub
- Supabase
- Cloudflare
- Vexp when repository discovery is actually needed

Do not use unrelated tools or MCPs unless the user explicitly requests them.

Normally avoid:

- Canva
- document-generation tools
- PDF tools
- spreadsheet tools
- presentation tools
- browser/computer-use automation
- Chrome automation
- visualization tools
- unrelated MCP servers

Do not install or enable another integration when an existing project tool already provides the required capability.

### Tool order

Before calling an external service, ask:

1. Can this be answered from already-loaded context?
2. Can it be answered from the local repository?
3. Can native search or Git answer it?
4. Does it genuinely require GitHub, Supabase, or Cloudflare?

Use the first sufficient option.

Avoid tool calls merely to confirm information already established in the repository or current session.

---

# 3. Token-efficiency rules

Token efficiency is a project requirement.

Do not:

- scan the entire repository when the task already identifies files or symbols,
- reopen files that were already inspected and remain unchanged,
- repeatedly read project documentation,
- retrieve large remote datasets when a filtered query is sufficient,
- print large logs when the relevant error lines are enough,
- run the full test suite repeatedly during implementation,
- repeat project background in responses,
- call multiple MCPs for information available from one source,
- re-audit an area unless the assigned task requires fresh evidence.

Prefer:

- targeted file reads,
- exact-symbol searches,
- narrow SQL queries,
- focused Git diffs,
- focused tests,
- concise command output,
- local inspection before remote inspection,
- summaries rather than copied logs.

Spend context on implementation reasoning, edge cases, validation, and release evidence.

---

# 4. Vexp repository navigation

<!-- vexp v3.2.5 -->

Use Vexp only when repository discovery is needed.

If the task already identifies the relevant files, paths, functions, classes, or symbols:

**SKIP Vexp.**

Otherwise call:

`run_pipeline({ "task": "..." })`

once at the start of the task.

Use identifiers whenever possible, for example:

`run_pipeline({ "task": "fix JWT expiry in AuthService.validateToken" })`

Use the returned pivot files and line ranges rather than opening files one by one.

Call `run_pipeline` again only when the task moves into a genuinely different subsystem.

Use:

- `get_skeleton` when structural understanding is needed without editing,
- `verify_done` before completing meaningful multi-file implementation work.

Run the tests recommended by `verify_done`.

For literal text/string searches, use native repository search instead of Vexp.

If Vexp reports `degraded` or returns no useful pivots, continue with native tools.

Vexp indexes repository source only. Do not expect it to contain logs, `dist/`, `node_modules/`, or files outside the repository.

<!-- /vexp -->

---

# 5. Sources of truth

Use this hierarchy when information conflicts:

1. `GET_HIRED_PRODUCT_SPEC.md`
2. `docs/project/PROJECT_STATUS.md`
3. `docs/project/KNOWN_ISSUES.md`
4. `docs/project/ROADMAP.md`
5. `docs/project/DECISIONS.md`
6. latest relevant session journal
7. implementation

Do not create competing product specifications, roadmaps, issue systems, or architecture authorities.

The file `GET_HIRED_PRODUCT_SPEC.md` is the product specification even if its internal title says `PRODUCT_SPEC.md`.

---

# 6. Context loading

Do **not** automatically read every project document at the beginning of every task.

Load only the minimum context required.

### For a clearly scoped task

If the user supplies:

- an issue ID,
- exact file,
- function,
- component,
- error,
- or clearly bounded objective,

read only:

1. the relevant specification or issue section if required,
2. the relevant code,
3. relevant tests,
4. additional project documentation only when a decision or status question requires it.

### For a new or ambiguous implementation task

Read:

1. relevant portion of `GET_HIRED_PRODUCT_SPEC.md`,
2. relevant portion of `PROJECT_STATUS.md`,
3. applicable issue from `KNOWN_ISSUES.md`,
4. relevant roadmap entry if task priority/order matters,
5. latest relevant session journal only if prior implementation context matters.

Do not read entire files when a relevant section can be located directly.

---

# 7. One task at a time

Work on one named issue or one tightly bounded task per implementation session.

Before editing, establish:

- task or issue,
- exact objective,
- applicable acceptance/exit criteria,
- relevant files,
- relevant tests,
- known baseline failures if material.

Do not fix adjacent problems simply because they are discovered.

If a new issue is important:

- record it in `KNOWN_ISSUES.md` when appropriate,
- or mention it in the session record,
- then return to the assigned task.

Never automatically begin the next roadmap task after completing the current one.

---

# 8. Git and worktree safety

Before meaningful implementation:

1. check current branch/worktree,
2. run `git status`,
3. identify existing uncommitted changes,
4. preserve unrelated work.

Use isolated branches/worktrees for substantial implementation unless the owner instructs otherwise.

Recommended naming:

- `agents/issue-001-seroval`
- `agents/issue-002-resume-rls`
- `agents/issue-005-dashboard`
- `agents/<short-task-name>`

Never:

- reset unrelated changes,
- overwrite unrelated work,
- clean another developer's files,
- stage unrelated changes,
- delete unrelated work,
- rewrite Git history,
- force-push,

unless explicitly instructed.

---

# 9. Implementation preflight

Before editing:

1. confirm `git status`,
2. locate the smallest relevant code surface,
3. understand the acceptance criteria,
4. establish a focused baseline when useful,
5. identify the smallest safe change.

Do not perform broad repository exploration when the task is already localized.

If dependencies, credentials, environment configuration, or local setup prevent a baseline command from running, report the setup limitation separately.

Do not classify environment/setup failures as product defects.

---

# 10. Implementation rules

Prefer the smallest compatible change that satisfies the task.

Do not:

- redesign working systems while fixing a release blocker,
- perform blanket dependency upgrades,
- introduce libraries when the existing stack is sufficient,
- refactor unrelated modules,
- alter product scope without authorization,
- enable experimental functionality unnecessarily,
- weaken validation,
- weaken ownership controls,
- weaken privacy safeguards,
- weaken truthfulness safeguards.

The public Release 0.1 CV checker remains deterministic unless the product specification explicitly changes that decision.

AI-assisted features must never invent candidate:

- experience,
- employers,
- credentials,
- metrics,
- skills,
- certifications,
- duties,
- outcomes.

When evidence is missing, recommendations must remain conditional or explicitly identify the information gap.

---

# 11. Supabase rules

Use Supabase tools only when database/backend information is genuinely required.

Prefer narrow queries over broad schema/data dumps.

Before changing database behavior:

1. inspect the relevant local migrations/schema first,
2. identify affected tables/functions/policies,
3. inspect remote state only if required,
4. distinguish local schema assumptions from verified remote state.

For authorization work:

- client-side filtering is not proof of authorization,
- ownership claims require schema/RLS evidence,
- cross-user access behavior should be tested with approved synthetic accounts.

Never execute destructive migrations or modify production data without explicit authorization.

Never expose secrets or service-role credentials.

---

# 12. GitHub rules

Prefer local Git for:

- history,
- diff inspection,
- branch state,
- commits,
- file comparison.

Use GitHub when the task requires:

- remote repository state,
- PRs,
- issues,
- reviews,
- remote branches,
- CI information,
- collaboration state.

Do not query GitHub merely to retrieve information already available locally.

Do not automatically create PRs, merge branches, push commits, close issues, or modify remote state unless the task authorizes it.

---

# 13. Cloudflare rules

Use Cloudflare only for deployment/infrastructure concerns.

### Core Cloudflare MCP

Use for project/resource configuration when required.

### Builds

Use when:

- investigating deployment/build failures,
- confirming deployment state,
- validating a release.

### Observability

Use when:

- debugging production behavior,
- investigating runtime failures,
- checking post-release evidence.

Do not query observability during ordinary local coding.

### Documentation

Prefer existing knowledge or targeted documentation lookup.

Do not load the Cloudflare Docs MCP by default solely for convenience.

### Bindings

Use only when working with relevant Cloudflare bindings or resources such as:

- Workers bindings,
- KV,
- R2,
- D1,
- Queues,
- other bound Cloudflare resources.

---

# 14. Testing strategy

Use progressive testing.

### During implementation

Run the smallest focused tests covering the changed behavior.

### When implementation appears correct

Run the relevant feature/regression group.

### Before completing a release-critical issue

Run as applicable:

- documented acceptance tests,
- type checks,
- build checks,
- lint checks,
- targeted E2E tests when a user journey changed.

Do not repeatedly run the full suite after every edit.

A passing build alone is not release evidence.

If an unrelated test failure predates the task:

1. verify that when practical,
2. record it,
3. keep it separate from failures introduced by the current change,
4. do not fix it unless it blocks the assigned issue.

---

# 15. Security and privacy

Never print, echo, reconstruct, paste, journal, commit, or expose secrets.

Never test historical credentials to discover whether they still work.

Use synthetic CVs and synthetic accounts for development/security testing unless real-user testing has been explicitly authorized.

Do not put real applicant PII into:

- prompts,
- test fixtures,
- logs,
- analytics,
- screenshots,
- session journals,
- committed generated files.

Never commit `.env` values, service-role keys, OAuth secrets, tokens, passwords, or production credentials.

---

# 16. Documentation discipline

Documentation must support continuity without becoming a token or maintenance burden.

Do not create a new planning/audit document for every task.

Update documentation only when the task materially changes what it records.

Normally relevant:

- `docs/project/PROJECT_STATUS.md`
- `docs/project/KNOWN_ISSUES.md`
- `docs/sessions/YYYY-MM-DD-NN-topic.md`
- `docs/sessions/SESSION_INDEX.md`

Update only when materially affected:

- `docs/project/ROADMAP.md`
- `docs/project/DECISIONS.md`
- `docs/project/ARCHITECTURE.md`
- `docs/project/TECH_STACK.md`
- audit documents

Do not rewrite historical audit evidence after implementation changes.

Mark obsolete evidence as historical or superseded when appropriate.

### Session journals

Create or update a session journal for:

- meaningful implementation,
- release-gate work,
- architectural decisions,
- significant debugging,
- security/authorization work.

Do not create a journal for trivial inspection, explanation, formatting, or tiny changes unless continuity genuinely requires one.

---

# 17. Reviewer-agent usage

Do not spawn additional agents by default.

A second read-only reviewer may be useful for:

- P0 security changes,
- authorization,
- authentication,
- persistence,
- deployment,
- release-gate changes.

Reviewer responsibilities:

- inspect the diff,
- compare against acceptance criteria,
- identify regressions,
- identify missing tests,
- identify unsafe assumptions,
- identify scope drift.

A reviewer should not edit files unless explicitly reassigned.

Do not run multiple implementation agents concurrently on overlapping code without explicit coordination.

---

# 18. Completion criteria

Before declaring implementation complete:

1. verify intended behavior,
2. run required focused/regression tests,
3. inspect the final diff,
4. confirm no unrelated changes were introduced,
5. run `verify_done` for meaningful multi-file tasks when useful,
6. run applicable tests it identifies,
7. update continuity documentation when materially required,
8. distinguish pre-existing failures from newly introduced failures.

Do not mark an issue `DONE` or `CLOSED` simply because code exists.

Its documented exit criteria must pass.

---

# 19. Final response format

Keep final implementation reports concise.

Report:

- task/issue,
- what changed,
- tests run and results,
- files changed,
- exit criteria status,
- pre-existing failures if relevant,
- remaining blocker or owner action,
- recommended next roadmap task when useful.

Do not repeat the entire project background.

Do not dump long logs.

Never automatically continue into the next issue.

---

# 20. Default operating principle

When uncertain, choose the path that is:

**local, narrow, reversible, testable, secure, and inexpensive in tokens.**

Use remote MCPs because they are necessary, not because they are available.