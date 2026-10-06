// Run with: node scripts/test-resume-isolation.mjs
// Fixed local endpoint; no .env loading, hosted URL option, or credential output.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const endpoint = "http://127.0.0.1:55431";
const users = [];
let checks = 0;
let anonKey;
let adminKey;
function check(value, label) {
  if (!value) throw new Error(label);
  checks++;
}

async function request(token, method, path, body, prefer = "return=representation") {
  const response = await fetch(`${endpoint}${path}`, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function ok(result, label) {
  check(result.status >= 200 && result.status < 300, `${label}: HTTP ${result.status}`);
  return result.body;
}
function denied(result, label) {
  check(
    [401, 403].includes(result.status) && result.body?.code === "42501",
    `${label}: expected authorization denial, got HTTP ${result.status}`,
  );
}
const pathFor = (id) => `/rest/v1/resumes?id=eq.${id}`;
const upsert = (user, row) =>
  request(
    user.token,
    "POST",
    "/rest/v1/resumes?on_conflict=id",
    row,
    "resolution=merge-duplicates,return=representation",
  );
async function read(user, id) {
  return ok(await request(user.token, "GET", `${pathFor(id)}&select=*`), "owner read");
}

// Synthetic document: blank drafts remain legal, optional fields round-trip intact.
const blank = {
  personal: { fullName: "", title: "", email: "", phone: "", location: "", links: [] },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  hospitality: {
    serviceStyles: [],
    posSystems: [],
    wineKnowledge: "None",
    spiritsKnowledge: "None",
    languages: [],
    allergens: false,
    foodSafety: "",
  },
  templateId: "classic",
};
const category = { score: 0, weight: 1, feedback: "Synthetic fixture" };
const complete = {
  ...blank,
  personal: {
    ...blank.personal,
    fullName: "Synthetic Test",
    photo: "data:image/png;base64,c3ludGhldGlj",
    photoPosition: "top-right",
    links: [{ label: "Test", url: "https://example.invalid" }],
  },
  experience: [
    {
      id: "local-entry",
      role: "Test role",
      venue: "Test venue",
      location: "",
      startDate: "2020",
      endDate: "",
      current: true,
      description: "Draft",
      bullets: ["Test bullet"],
    },
  ],
  education: [
    {
      id: "education",
      school: "Test school",
      degree: "Test degree",
      field: "",
      startDate: "",
      endDate: "",
      description: "",
      bullets: ["Test study"],
    },
  ],
  skills: ["Test skill"],
  certifications: [{ id: "certificate", name: "Test", issuer: "", year: "", expiry: "" }],
  hospitality: { ...blank.hospitality, languages: [{ name: "English", level: "Fluent" }] },
  references: "Synthetic reference",
  targetJobDescription: "Synthetic job",
  targetRoleSlug: "test-role",
  formatting: {
    fontFamily: "Calibri",
    bodyFontSize: 11,
    headingFontSize: 14,
    lineSpacing: 1.15,
    marginInches: 0.75,
  },
  templateColours: {
    classic: { primary: "#000000", accent: "#222222", text: "#333333", background: "#ffffff" },
  },
  checkerAudit: {
    overallScore: 0,
    tier: "Major Gaps",
    confidence: { level: "Low", reasons: ["Test"] },
    categories: Object.fromEntries(
      [
        "keywordAlignment",
        "experienceDepth",
        "quantifiedAchievements",
        "qualifications",
        "cruiseReadiness",
        "atsParseability",
        "summaryQuality",
      ].map((k) => [k, category]),
    ),
    topFixes: ["Test"],
    missingKeywords: [],
    matchedKeywords: [],
    deterministicFeedback: [],
    fixes: [
      {
        id: "fix",
        title: "Test",
        explanation: "Test",
        priority: "low",
        targetSection: "skills",
        kind: "generic",
        certName: "Test",
        keyword: "Test",
        completedManually: true,
      },
    ],
  },
};

async function unchanged(user, before, label) {
  check(isDeepStrictEqual(await read(user, before.id), [before]), `${label}: original row changed`);
}

async function run() {
  // Captured only in memory. Never inherit arbitrary Supabase URLs/keys from app env.
  let status;
  try {
    const output =
      process.platform === "win32"
        ? execFileSync("cmd.exe", ["/d", "/s", "/c", "supabase.cmd status -o json"], {
            stdio: ["ignore", "pipe", "pipe"],
          })
        : execFileSync("supabase", ["status", "-o", "json"], { stdio: ["ignore", "pipe", "pipe"] });
    status = JSON.parse(output.toString());
  } catch {
    throw new Error("Local Supabase status unavailable; start the dedicated local stack first");
  }
  check(status.API_URL === endpoint, "Refusing a non-matching local API endpoint");
  anonKey = status.ANON_KEY;
  adminKey = status.SERVICE_ROLE_KEY;
  check(typeof anonKey === "string" && typeof adminKey === "string", "Local test keys unavailable");
  const settings = ok(await request(null, "GET", "/auth/v1/settings"), "local Auth settings");
  check(
    settings.external?.anonymous_users === false,
    "Anonymous Auth must be disabled for this signed-out test contract",
  );

  // Admin credential is used only for synthetic Auth fixture lifecycle, never resume operations.
  for (const label of ["A", "B"]) {
    const email = `issue002-${randomUUID()}@example.invalid`;
    const password = `${randomUUID()}Aa1!`;
    const created = ok(
      await request(adminKey, "POST", "/auth/v1/admin/users", {
        email,
        password,
        email_confirm: true,
      }),
      "create synthetic user",
    );
    const user = { label, id: created.id, resumeIds: [] };
    users.push(user);
    check(typeof user.id === "string", "Auth user creation returned no ID");
    const session = ok(
      await request(anonKey, "POST", "/auth/v1/token?grant_type=password", { email, password }),
      "synthetic sign-in",
    );
    check(typeof session.access_token === "string", "sign-in returned no session");
    user.token = session.access_token;
    user.row = {
      id: randomUUID(),
      user_id: user.id,
      title: "My CV",
      data: blank,
      template_id: "classic",
    };
    user.resumeIds.push(user.row.id);
    const inserted = ok(await upsert(user, user.row), "owner initial upsert");
    check(
      inserted.length === 1 && isDeepStrictEqual(inserted[0].data, blank),
      "blank draft round-trip",
    );
    const originalTime = inserted[0].updated_at;
    user.row.data = complete;
    const updated = ok(
      await request(user.token, "PATCH", pathFor(user.row.id), {
        data: complete,
        updated_at: "2000-01-01T00:00:00Z",
      }),
      "owner update",
    );
    check(
      updated.length === 1 && isDeepStrictEqual(updated[0].data, complete),
      "optional fields round-trip",
    );
    check(
      Date.parse(updated[0].updated_at) > Date.parse(originalTime),
      "update timestamp advances",
    );
    const saved = ok(await upsert(user, { ...user.row, title: "Saved" }), "owner same-ID upsert");
    check(saved.length === 1 && saved[0].title === "Saved", "same-ID upsert succeeds");
    check(
      Date.parse(saved[0].updated_at) > Date.parse(updated[0].updated_at),
      "upsert timestamp advances",
    );
    const extra = { ...user.row, id: randomUUID(), data: {}, updated_at: "2000-01-01T00:00:00Z" };
    user.resumeIds.push(extra.id);
    const extraRows = ok(
      await request(user.token, "POST", "/rest/v1/resumes", extra),
      "owner insert",
    );
    check(
      extraRows.length === 1 && isDeepStrictEqual(extraRows[0].data, {}),
      "partial object draft round-trip",
    );
    check(
      Date.parse(extraRows[0].updated_at) > Date.parse("2000-01-01"),
      "insert timestamp server-managed",
    );
    const list = ok(
      await request(user.token, "GET", "/rest/v1/resumes?select=*&order=updated_at.desc"),
      "owner latest list",
    );
    check(
      list.length === 2 && list[0].id === extra.id && list.every((r) => r.user_id === user.id),
      "owner latest ordering",
    );
    const deleted = ok(await request(user.token, "DELETE", pathFor(extra.id)), "owner delete");
    check(
      deleted.length === 1 && (await read(user, extra.id)).length === 0,
      "owner delete removed row",
    );
    user.before = (await read(user, user.row.id))[0];
    check(
      user.before?.user_id === user.id && isDeepStrictEqual(user.before.data, complete),
      "owner known-ID read preserves ownership and document",
    );
    console.log(
      `PASS owner ${label}: create/list/read/update/upsert/delete, drafts, fields, timestamps/order`,
    );
  }

  for (const [actor, victim] of [
    [users[0], users[1]],
    [users[1], users[0]],
  ]) {
    const direction = `${actor.label}->${victim.label}`;
    const list = ok(
      await request(actor.token, "GET", "/rest/v1/resumes?select=*"),
      "unfiltered list",
    );
    check(list.length === 1 && list[0].user_id === actor.id, `${direction}: list isolated`);
    check(
      ok(await request(actor.token, "GET", pathFor(victim.row.id)), "foreign read").length === 0,
      `${direction}: foreign read hidden`,
    );
    for (const method of ["PATCH", "DELETE"]) {
      const result = await request(
        actor.token,
        method,
        pathFor(victim.row.id),
        method === "PATCH" ? { title: "Attack" } : undefined,
      );
      check(
        result.status === 200 && Array.isArray(result.body) && result.body.length === 0,
        `${direction}: ${method} must affect zero rows`,
      );
      await unchanged(victim, victim.before, `${direction} ${method}`);
    }
    denied(
      await request(actor.token, "POST", "/rest/v1/resumes", { ...victim.row, id: randomUUID() }),
      `${direction}: forged-owner insert`,
    );
    await unchanged(victim, victim.before, "forged-owner insert");
    denied(
      await request(actor.token, "PATCH", pathFor(actor.row.id), { user_id: victim.id }),
      `${direction}: reassign owner`,
    );
    await unchanged(actor, actor.before, "owner reassignment");
    for (const owner of [actor.id, victim.id]) {
      denied(
        await upsert(actor, { ...victim.row, user_id: owner, title: "Attack" }),
        `${direction}: conflict upsert`,
      );
      await unchanged(victim, victim.before, "conflict upsert");
    }
    denied(await upsert(actor, { ...actor.row, user_id: victim.id }), "upsert owner reassignment");
    await unchanged(actor, actor.before, "upsert owner reassignment");
    console.log(`PASS ${direction}: read/list/write/reassignment/upsert isolation`);
  }

  for (const user of users) {
    for (const [method, path, body, prefer] of [
      ["GET", "/rest/v1/resumes?select=*"],
      ["GET", pathFor(user.row.id)],
      ["POST", "/rest/v1/resumes", { ...user.row, id: randomUUID() }],
      ["PATCH", pathFor(user.row.id), { title: "Attack" }],
      ["DELETE", pathFor(user.row.id)],
      [
        "POST",
        "/rest/v1/resumes?on_conflict=id",
        user.row,
        "resolution=merge-duplicates,return=representation",
      ],
    ]) {
      denied(await request(anonKey, method, path, body, prefer), `anon ${method}`);
      await unchanged(user, user.before, `anon ${method}`);
      denied(await request(null, method, path, body, prefer), `signed-out ${method}`);
      await unchanged(user, user.before, `signed-out ${method}`);
    }
  }
  console.log(
    "PASS signed-out: list/known-ID/create/update/delete/upsert, with and without anon bearer",
  );

  const user = users[0];
  for (const data of [[], "invalid", 42, null]) {
    const result = await request(user.token, "POST", "/rest/v1/resumes", {
      ...user.row,
      id: randomUUID(),
      data,
    });
    check(
      result.status === 400 && ["23514", "23502"].includes(result.body?.code),
      "invalid JSON rejected",
    );
  }
  for (const owner of [null, randomUUID()]) {
    denied(
      await request(user.token, "POST", "/rest/v1/resumes", {
        ...user.row,
        id: randomUUID(),
        user_id: owner,
      }),
      "invalid owner denied",
    );
  }
  const duplicate = await request(user.token, "POST", "/rest/v1/resumes", user.row);
  check(
    duplicate.status === 409 && duplicate.body?.code === "23505",
    "duplicate primary key rejected",
  );
  for (const owner of users) {
    await unchanged(owner, owner.before, "final row integrity");
    const rows = ok(
      await request(owner.token, "GET", "/rest/v1/resumes?select=id"),
      "final row count",
    );
    check(rows.length === 1, "denied inserts created no extra rows");
  }
  console.log(`PASS local Data API isolation: ${checks} assertions`);
}

try {
  await run();
} catch (error) {
  // Do not print response bodies, credentials, child-process output, or document contents.
  console.error(`FAIL: ${error instanceof Error ? error.message : "unexpected failure"}`);
  process.exitCode = 1;
} finally {
  for (const user of users) {
    if (!user.id) continue;
    try {
      // Remove only this run's known fixtures using owner sessions, never admin resume CRUD.
      for (const id of user.resumeIds) {
        ok(await request(user.token, "DELETE", pathFor(id)), "owner fixture cleanup");
        check((await read(user, id)).length === 0, "fixture cleanup verified");
      }
      const result = await request(adminKey, "DELETE", `/auth/v1/admin/users/${user.id}`);
      if (result.status < 200 || result.status >= 300) throw new Error("cleanup failed");
    } catch {
      console.error(`FAIL: synthetic user ${user.label} cleanup; local reset required`);
      process.exitCode = 1;
    }
  }
}
