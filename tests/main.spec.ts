/**
 * End-to-end tests for the Court PWA main flow.
 *
 * Each run creates a real court in Supabase with a timestamp-based slug
 * (prefix "pw-test-"). You can clean those up any time from the Supabase
 * dashboard by deleting rows where slug LIKE 'pw-test-%'.
 *
 * Prerequisites: the dev server must be running on http://localhost:3000
 * (playwright.config.ts will start it automatically if it isn't).
 */

import { test, expect } from "@playwright/test";

// ─── Shared test data ─────────────────────────────────────────────────────────

const TS = Date.now();
const COURT_NAME = `PW Test ${TS}`;
// mirrors the toSlug() logic in useCreateCourt.ts
const COURT_SLUG = `pw-test-${TS}`;
const USERNAME = "PW-Tester";
const TEST_USER_ID = "pw-test-uid-fixed";

/** Cookies that skip the UsernameModal. */
const AUTH_COOKIES = [
  { name: "court_username", value: USERNAME, domain: "localhost", path: "/" },
  { name: "court_user_id", value: TEST_USER_ID, domain: "localhost", path: "/" },
];

/** iPhone 15 user-agent — makes detectPlatform() return "ios". */
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Grant notification permission so requestPermission() never shows a system dialog. */
async function setupPage(page: import("@playwright/test").Page, slug: string) {
  await page.context().grantPermissions(["notifications"]);
  // addInitScript runs before React — the most reliable way to pre-seed cookies on localhost
  await page.addInitScript(({ username, userId }) => {
    document.cookie = `court_username=${encodeURIComponent(username)}; path=/; SameSite=Lax`;
    document.cookie = `court_user_id=${encodeURIComponent(userId)}; path=/; SameSite=Lax`;
  }, { username: USERNAME, userId: TEST_USER_ID });
  await page.goto(`/${slug}`);
  // Confirm the scheduler (app bar / banner) is visible — i.e. UsernameModal did NOT appear
  await expect(page.getByRole("banner")).toBeVisible({ timeout: 15_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Court App – main flow", () => {
  test.describe.configure({ mode: "serial" });

  // ── 1. Create court ──────────────────────────────────────────────────────
  test("1 – create test court", async ({ page }) => {
    await page.goto("/");

    await page.getByPlaceholder("z. B. Stadtpark Platz 1").fill(COURT_NAME);
    await page.getByRole("button", { name: "Platz erstellen" }).click();

    await expect(page).toHaveURL(`/${COURT_SLUG}`, { timeout: 15_000 });
  });

  // ── 2. Set username ──────────────────────────────────────────────────────
  test("2 – set username via modal", async ({ page }) => {
    // No cookies → username modal must appear
    await page.goto(`/${COURT_SLUG}`);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.getByPlaceholder("Dein Name").fill(USERNAME);
    await page.getByRole("button", { name: "Weiter" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
  });

  // ── 3. Create slot ───────────────────────────────────────────────────────
  test("3 – create a slot", async ({ page }) => {
    await setupPage(page, COURT_SLUG);

    const addBtn = page.getByRole("button", { name: "Neuen Slot hinzufügen" });
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    const addDialog = page.getByRole("dialog");
    await expect(addDialog).toBeVisible({ timeout: 10_000 });

    await page.getByLabel("Start").fill("10:00");
    await page.getByLabel("Ende").fill("11:00");
    await page.getByRole("button", { name: "Speichern" }).click();

    // after save in test "3 – create a slot"
    await expect(addDialog).not.toBeVisible();

    // Wait for the slot card/list item to appear in scheduler area, not global page text
    const slotEntry = page
      .locator('[data-testid="slot-item"]')
      .filter({ hasText: USERNAME })
      .first();

    await expect(slotEntry).toBeVisible({ timeout: 15_000 });
  });

  // ── 4. Edit slot ─────────────────────────────────────────────────────────
  test("4 – edit the slot", async ({ page }) => {
    await setupPage(page, COURT_SLUG);

    // Open action modal by clicking the slot
    const slot = page
      .locator('[data-testid="slot-item"]')
      .filter({ hasText: USERNAME })
      .first();

    await expect(slot).toBeVisible({ timeout: 15_000 });
    await slot.click();

    const actionDialog = page.getByRole("dialog");
    await expect(actionDialog).toBeVisible();
    await page.getByRole("button", { name: "Bearbeiten" }).click();

    // AddSlotModal should now be open
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();

    // Extend the slot to 12:00
    await page.getByLabel("Ende").fill("12:00");
    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(editDialog).not.toBeVisible();
    // Slot still visible after edit
    await expect(page.getByText(USERNAME).first()).toBeVisible();
  });
});
