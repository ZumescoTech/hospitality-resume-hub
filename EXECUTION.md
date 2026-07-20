# GetHired — Execution Map (Claude Code, terminal)

Companion to `gethired-build-scope.yaml` (task specs + verify blocks) and
`CLAUDE.md` (rules). This file answers: **who does each task, in what
order, what runs in parallel, and what you type to kick off each wave.**

## Operating model

- **Main session = orchestrator.** It plans, writes shared contracts,
  integrates, and makes gate decisions. It delegates verbose or
  mechanical work; it does not paste test logs into its own context.
- **Subagents = workers** defined in `.claude/agents/` (checked into the
  repo): `test-runner` (haiku), `fixture-writer` (haiku),
  `adapter-builder` (sonnet, one instance per adapter), `gate-runner`
  (sonnet). Subagents can't spawn subagents — orchestration stays in main.
- **Token economy, in priority order:**
  1. Verbose output → subagent windows (test runs, experiments, sweeps).
  2. Mechanical work → haiku agents.
  3. Contract-first, then fan out — parallel edits only on non-overlapping
     files, shared interfaces frozen before any fan-out.
  4. `/clear` between waves (CLAUDE.md + scope YAML persist the rules, so
     clearing is cheap). `/compact` mid-wave only if forced.
  5. Ask for terse structured reports — subagent summaries land back in
     main context, so a fan-out of ten chatty reports defeats the purpose.
- **Parallelism is explicit.** Claude Code is conservative by default:
  say "run N subagents in parallel, one per X" — never just "parallelize".

## Session hygiene (every wave)

```
Start:  claude  →  "Read CLAUDE.md and gethired-build-scope.yaml.
        Plan wave <X> (tasks listed below) before writing code."
During: delegate every test/build run to the test-runner subagent.
End:    commit per task → wave report (tasks done, verify status,
        flags, parking-lot adds) → /clear
```

---

## Wave map

### Wave 0 — Unblock  ·  main session only  ·  human-gated
Tasks: T0.1, T0.2 (sequential — T0.2 needs T0.1)
No agents: tasks are small, secrets are involved, and human actions
(key check/rotation, `wrangler secret put`, post-deploy smoke) gate both.

Kickoff:
```
Read CLAUDE.md and gethired-build-scope.yaml. Execute iteration_0 only.
I have completed the human_prerequisite (key check). Prepare — do not
run — any wrangler secret commands and hand them to me. Stop after T0.2
verification and report.
```

### Wave 1 — Safety net  ·  main + 1 haiku agent
Tasks: T1.1, T1.2 (sequential)
- `fixture-writer` (haiku): the 5 synthetic CVs — content generation off
  the main context.
- Main: test runner wiring + golden-file tests (T1.2 touches the scoring
  contract; that stays with the orchestrator).
- `test-runner` verifies from here on, every wave.

Kickoff:
```
Execute iteration_1. Use the fixture-writer subagent to create the five
fixture CVs per its brief while you wire vitest into the build. Then
write the golden-file tests yourself (T1.2). Verify via the test-runner
subagent. Report per task.
```

### Wave 2 — Provider layer  ·  the fan-out wave  ·  main + 3 parallel agents
Tasks: T2.1 → [T2.2 ∥ T2.3 ∥ T4.1] → T2.4

Order matters:
1. **Main writes T2.1 first** (interface + schemas + boundary validator).
   This is the frozen contract — fan-out before the contract exists
   produces merge hell.
2. **Fan out three subagents in parallel** (non-overlapping files):
   - `adapter-builder` #1 → Groq adapter (T2.2)
   - `adapter-builder` #2 → Gemini adapter (T2.3)
   - general subagent (sonnet) → keyword-map expansion (T4.1) — it's in
     iteration 4 but depends only on T1.2, owns only the keyword-map
     module + its tests + the SCORING_VERSION bump, so it rides this
     wave's parallel window. Golden regeneration reviewed by main.
3. **Main integrates**: reviews all three reports, runs `test-runner`,
   then builds the failover router + degraded-UI state (T2.4) itself —
   it touches everything the fan-out produced.

Kickoff (after T2.1 is committed):
```
T2.1 is committed and frozen. Now run three subagents in parallel:
1) adapter-builder for the Groq adapter (T2.2) — owns
   src/lib/ai/adapters/groq.ts + its test file only.
2) adapter-builder for the Gemini adapter (T2.3) — owns
   src/lib/ai/adapters/gemini.ts + its test file only; prepare the
   GEMINI_API_KEY wrangler command for me.
3) a sonnet subagent for T4.1 keyword-map expansion — owns the keyword
   map module, its tests, and the SCORING_VERSION bump only.
No agent edits provider.ts, the router, lockfiles, or wrangler config.
When all three report, verify with test-runner, show me the golden-file
diff from T4.1 for review, then implement T2.4 yourself.
```

### Wave 3 — Stop paying twice  ·  main + 2 agents (1 parallel slot)
Tasks: T3.1 → T3.2, with T5.3 riding the parallel window
- Main: KV cache (T3.1) — touches wrangler config + request path; not
  delegated.
- `gate-runner`: T3.2 merged-call experiment (both arms on fixtures,
  numbers back). Main flips the flag or files parking-lot findings.
- Parallel slot: general subagent (sonnet) → T5.3 score-breakdown UI
  (depends only on T1.2, owns only the results-page component + test).

### Wave 4 — Shrink & de-AI  ·  main + gate-runner
Tasks: T4.2 → T4.3 (T4.1 already landed in wave 2)
- Main: deterministic feedback + confidence + degraded-mode rendering
  (T4.2), then structured-signal prompts (T4.3) — both reshape core
  behavior; orchestrator work.
- `gate-runner`: token before/after measurement for T4.3 (provider usage
  fields, 10-CV sample) + fabrication spot-check inputs.

### Wave 5 — Fast follows  ·  fully parallel, all optional
Tasks: T5.1 ∥ T5.2 (T5.3 done in wave 3)
- `gate-runner` #1: Workers AI JSON-reliability trial (T5.1) — adapter
  built by an `adapter-builder` first, dark-launched.
- `gate-runner` #2: hybrid-extraction side-by-side (T5.2) after main
  implements the regex layer.
Skippable without touching the release gate.

### Release gate  ·  main session, no delegation
Run the drills from the scope YAML personally in main: forced-429
failover, double-upload cache hit, both-providers-down degraded page,
template spot-checks, landing copy count. Gate decisions and production
checks don't get delegated.

---

## Fan-out rules (pin these)

- Max 3 implementation agents at once — beyond that, integration review
  in main costs more than the parallelism saves.
- Every fan-out message states, per agent: **files owned**, **files
  forbidden** (shared schemas, router, lockfiles, wrangler/root config),
  **done condition**, **test command**.
- Merge order after a fan-out: adapters → keyword map (golden regen
  reviewed) → router. One `test-runner` pass after each merge, not one
  giant pass at the end.
- If two agents need the same file, the plan is wrong — re-split or
  serialize.

## Anti-patterns (things that feel productive and waste tokens)

- Running `npm test` in the main session "just to check" — that's the
  test-runner's entire job.
- Fanning out before the interface is frozen.
- Letting subagents return prose essays — demand the report formats in
  their agent files.
- Parallelizing dependent tasks (T2.4 before adapters, T4.3 before T4.2).
- Using Opus-level reasoning on fixture writing or test-log reading.
- Skipping `/clear` between waves and paying compaction tax mid-wave 3.
