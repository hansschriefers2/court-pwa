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

  test("2b – iPhone install guidance appears before the first slot", async ({ page }) => {
    await page.addInitScript((userAgent) => {
      Object.defineProperty(navigator, "userAgent", { value: userAgent });
    }, IPHONE_UA);
    await setupPage(page, COURT_SLUG);

    await expect(page.getByText("Browser-Version: Benachrichtigungen nicht verfügbar")).toBeVisible();
    await page.getByRole("button", { name: "Neuen Slot hinzufügen" }).click();

    const installDialog = page.getByRole("dialog", { name: "Court installieren" });
    await expect(installDialog).toBeVisible();
    await installDialog.getByRole("button", { name: "Ohne Benachrichtigungen fortfahren" }).click();

    await expect(page.getByRole("dialog", { name: "Neuer Slot" })).toBeVisible();
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

  // ── 5. Pinnwand: post and delete a message ───────────────────────────────
  test("5 – post a message on the Pinnwand and remove it", async ({ page }) => {
    await setupPage(page, COURT_SLUG);

    // Pinnwand is inside the ⋮ menu
    await page.getByRole("button", { name: "Menü" }).click();
    await page.getByRole("link", { name: "Pinnwand" }).click();
    await expect(page).toHaveURL(`/${COURT_SLUG}/pinnwand`, { timeout: 10_000 });

    const MESSAGE = "Testnachricht vom Playwright";

    // Type message and submit
    await page.getByPlaceholder("Nachricht hinterlassen…").fill(MESSAGE);
    await page.getByRole("button", { name: "Anheften" }).click();

    // Message card must appear
    await expect(page.getByText(MESSAGE)).toBeVisible({ timeout: 10_000 });

    // Delete it
    await page.getByRole("button", { name: "Nachricht entfernen" }).first().click();

    // Card must be gone
    await expect(page.getByText(MESSAGE)).not.toBeVisible({ timeout: 10_000 });
  });

  // ── 6. Create training + join ────────────────────────────────────────────
  test("6 – create a recurring training and join it", async ({ page }) => {
    await setupPage(page, COURT_SLUG);

    // Open ⋮ menu → "Trainings verwalten"
    await page.getByRole("button", { name: "Menü" }).click();
    await page.getByRole("button", { name: "Trainings verwalten" }).click();

    const manageDialog = page.getByRole("dialog", { name: "Trainings verwalten" });
    await expect(manageDialog).toBeVisible();

    // Open inline create form
    await manageDialog.getByRole("button", { name: "Neues Training" }).click();

    // Select today's weekday so the training is visible in the current day view
    const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const todayLabel = WEEKDAYS[new Date().getDay()];
    await manageDialog.getByRole("button", { name: todayLabel }).click();

    // Time inputs in the inline form have no labels — select by type
    const timeInputs = manageDialog.locator('input[type="time"]');
    await timeInputs.nth(0).fill("14:00");
    await timeInputs.nth(1).fill("16:00");
    await manageDialog.getByRole("button", { name: "Speichern" }).click();

    // Close the manage modal to reveal the timeline
    await manageDialog.getByRole("button", { name: "Schließen" }).click();
    await expect(manageDialog).not.toBeVisible();

    // Training bar must appear in the timeline
    const trainingBar = page.locator('[data-testid="training-item"]').first();
    await expect(trainingBar).toBeVisible({ timeout: 15_000 });

    // Click it — response modal should appear
    await trainingBar.click();
    const responseDialog = page.getByRole("dialog");
    await expect(responseDialog).toBeVisible();

    // Join the training
    await responseDialog.getByRole("button", { name: "Ich bin dabei" }).click();
    await expect(responseDialog).not.toBeVisible();

    // A slot for the current user should now appear in the timeline
    const slotEntry = page
      .locator('[data-testid="slot-item"]')
      .filter({ hasText: USERNAME })
      .first();
    await expect(slotEntry).toBeVisible({ timeout: 15_000 });
  });
});
