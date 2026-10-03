import { test, expect } from "@playwright/test";
import { emptyResume } from "../../src/types/resume";

const key = "hospitality-resume-v1";

test("account edits recover before debounce and failed cloud saves can be retried (mock API)", async ({
  page,
  context,
}) => {
  const user = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    aud: "authenticated",
    role: "authenticated",
    email: "saving-test@example.com",
  };
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", exp: expires })).toString(
      "base64url",
    ),
    "synthetic-signature",
  ].join(".");
  await context.addInitScript(
    ({ user, expires, token }) => {
      localStorage.setItem(
        "sb-saving-tests-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "synthetic-refresh",
          expires_at: expires,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
    },
    { user, expires, token },
  );
  let saved = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    template_id: "vintage",
    data: { ...emptyResume, personal: { ...emptyResume.personal, fullName: "Cloud original" } },
  };
  let fail = true;
  let writes = 0;
  await context.route("https://saving-tests.supabase.co/**", async (route) => {
    const request = route.request();
    if (request.url().includes("/auth/v1/user")) {
      await route.fulfill({ json: user });
    } else if (request.url().includes("/rest/v1/resumes") && request.method() === "GET") {
      await route.fulfill({ json: [saved] });
    } else if (request.url().includes("/rest/v1/resumes") && request.method() === "POST") {
      writes++;
      if (fail) await route.fulfill({ status: 503, json: { message: "Synthetic save failure" } });
      else {
        saved = request.postDataJSON();
        await route.fulfill({ status: 201, body: "" });
      }
    } else await route.abort();
  });
  await page.goto("/builder");
  await expect(page.getByTestId("input-fullname")).toHaveValue("Cloud original");
  await page.getByTestId("input-fullname").fill("Recovered account edit");
  await page.reload();
  await expect(page.getByTestId("input-fullname")).toHaveValue("Recovered account edit");
  await expect(page.getByRole("alert")).toContainText("Cloud save failed");
  await expect(page.getByRole("status")).not.toContainText("Saved to cloud");
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved to cloud");
  expect(writes).toBeGreaterThanOrEqual(2);
  expect(saved.data.personal.fullName).toBe("Recovered account edit");
});

test("anonymous edit survives an immediate browser reload", async ({ page }) => {
  await page.goto("/builder");
  await page.getByTestId("input-fullname").fill("Synthetic Recovery Test");
  await page.reload();
  await expect(page.getByTestId("input-fullname")).toHaveValue("Synthetic Recovery Test");
  await expect(page.getByRole("status")).toContainText("Saved on this device");
});

test("two tabs pause conflicting saves and keep both copies", async ({ page, context }) => {
  await page.goto("/builder");
  await page.getByTestId("input-fullname").fill("First tab draft");
  const other = await context.newPage();
  await other.goto("/builder");
  await expect(other.getByTestId("input-fullname")).toHaveValue("First tab draft");
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await other.getByTestId("input-fullname").fill("Second tab draft");
  await expect(page.getByRole("alert")).toContainText("Another tab changed");
  await expect(page.getByTestId("input-fullname")).toHaveValue("First tab draft");
  await page.getByRole("button", { name: "Keep a backup and load other copy" }).click();
  await expect(page.getByTestId("input-fullname")).toHaveValue("Second tab draft");
  const backup = await page.evaluate((storageKey) => {
    const keys = Object.keys(localStorage).filter((item) =>
      item.startsWith(`${storageKey}:recovery:`),
    );
    return keys.map((item) => JSON.parse(localStorage.getItem(item)!).personal.fullName);
  }, key);
  expect(backup).toContain("First tab draft");
});

test("malformed draft remains intact until a confirmed backup and reset", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => localStorage.setItem(storageKey, "{unreadable"), key);
  await page.goto("/builder");
  await expect(page.getByRole("alert")).toContainText("could not be read");
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
    "{unreadable",
  );
  await page.getByRole("button", { name: "Start fresh…" }).click();
  await page.getByRole("button", { name: "Back up original and start fresh" }).click();
  await expect(page.getByTestId("input-fullname")).toHaveValue("");
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  const originals = await page.evaluate(
    (storageKey) =>
      Object.keys(localStorage)
        .filter((item) => item.startsWith(`${storageKey}:recovery:`))
        .map((item) => localStorage.getItem(item)),
    key,
  );
  expect(originals).toContain("{unreadable");
});
