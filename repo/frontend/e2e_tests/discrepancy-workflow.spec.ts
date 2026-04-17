/**
 * E2E: Discrepancy workflow — report → review → verify → resolve → packing gate
 *
 * Exercises the full wave/task/discrepancy lifecycle through the browser UI.
 * Setup chain: receive stock → create order → plan wave → start wave → assign task
 */
import { test, expect, type Page } from "@playwright/test";

const DASHBOARD_NAV_TIMEOUT_MS = 90_000;

async function expectToast(page: Page, text: string | RegExp) {
  await expect(
    page.getByRole("status").filter({ hasText: text }).last(),
  ).toBeVisible();
}

async function setupAdmin(page: Page, username: string) {
  await page.goto("/");
  await page.fill('input[placeholder="Your name"]', "Disc Tester");
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Password"]', "SecurePass123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/#\/dashboard/, {
    timeout: DASHBOARD_NAV_TIMEOUT_MS,
  });
}

async function receiveStock(
  page: Page,
  warehouse: string,
  bin: string,
  sku: string,
  qty: number,
) {
  await page.click('nav.nav-rail a:has-text("Inventory")');
  await expect(page).toHaveURL(/#\/inventory/);
  await page.click('button:has-text("Receive")');
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  const inputs = modal.locator("input");
  await inputs.nth(0).fill(warehouse);
  await inputs.nth(1).fill(bin);
  await inputs.nth(2).fill(sku);
  await inputs.nth(3).fill(String(qty));
  await modal.locator('button:has-text("Receive")').click();
  await expectToast(page, "Received");
}

async function createOrder(page: Page, sku: string, bin: string, qty: number) {
  await page.click('nav.nav-rail a:has-text("Orders")');
  await expect(page).toHaveURL(/#\/orders/);
  await page.click('button:has-text("Create Order")');
  const drawer = page.locator('[role="dialog"]');
  await expect(drawer).toBeVisible();
  const lineInputs = drawer.locator(".line-row input");
  await lineInputs.nth(0).fill(sku);
  await lineInputs.nth(1).fill(bin);
  await lineInputs.nth(2).fill(String(qty));
  await drawer.locator("button.submit-btn").click();
  await expectToast(page, "Order created");
}

async function navigateToWaves(page: Page) {
  await page.click('a:has-text("Wave Planning")');
  await expect(page).toHaveURL(/#\/orders\/waves/);
  await expect(page.locator('h2:has-text("Wave Planning")')).toBeVisible();
}

async function planAndStartWave(page: Page) {
  // Plan wave — click Plan Wave button, select order, submit
  await page.click('button:has-text("Plan Wave")');
  const planModal = page.locator('[role="dialog"]');
  await expect(planModal).toBeVisible();

  // Select the order checkbox (first available)
  const checkbox = planModal.locator('input[type="checkbox"]').first();
  await checkbox.check();

  // Confirm the wave. The modal uses a custom confirm label.
  await planModal.locator('button:has-text("Plan Wave")').click();
  await expectToast(page, "Wave planned");

  // Start the wave via row action
  await page.click('button:has-text("Start")');
  await expectToast(page, "Wave started");
}

async function assignTask(page: Page, pickerId: string) {
  // Click Assign on the wave row
  await page.click('button:has-text("Assign")');
  const assignModal = page.locator('[role="dialog"]:has-text("Assign Task")');
  await expect(assignModal).toBeVisible();

  await assignModal
    .locator('input[placeholder="Enter picker user ID"]')
    .fill(pickerId);
  await assignModal.locator('button:has-text("Confirm")').click();
  await expectToast(page, "assigned");
}

test.describe("Discrepancy workflow", () => {
  test("report discrepancy blocks packing gate, verify+resolve unblocks it", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await setupAdmin(page, "disc-full-flow-1");

    // Setup: receive stock, create order
    await receiveStock(page, "WH-1", "BIN-1", "SKU-DISC", 100);
    await createOrder(page, "SKU-DISC", "BIN-1", 10);
    await navigateToWaves(page);

    // Plan wave, start it, assign task
    await planAndStartWave(page);
    await assignTask(page, "picker-1");

    // Start the task
    const taskTable = page
      .locator("#tasks-main")
      .locator("..")
      .locator("table");
    await page.click('button:has-text("Start Task")');
    await expectToast(page, "Task started");

    // Open discrepancy drawer
    await page.click('button:has-text("Discrepancies")');
    const drawer = page.locator('[role="dialog"]:has-text("Discrepancies")');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator(".empty")).toContainText("No discrepancies");

    // Report a discrepancy
    await drawer
      .locator('input[placeholder="Description"]')
      .fill("Missing item in bin");
    await drawer.locator('button:has-text("Report")').click();
    await expectToast(page, "Discrepancy reported");

    // Verify the discrepancy card appears with "Opened" state
    const discCard = drawer.locator(".disc-card").first();
    await expect(discCard).toBeVisible();
    await expect(
      discCard.locator('.disc-state[data-state="opened"]'),
    ).toBeVisible();
    await expect(discCard.locator(".disc-desc")).toContainText("Missing item");

    // Close drawer and check packing gate — should be blocked
    await page.keyboard.press("Escape");
    await page.click('button:has-text("Check Packing")');
    await expectToast(page, "Cannot proceed");

    // Re-open drawer and advance the discrepancy through its lifecycle
    await page.click('button:has-text("Discrepancies")');
    const drawer2 = page.locator('[role="dialog"]:has-text("Discrepancies")');
    await expect(drawer2).toBeVisible();

    // Review the discrepancy (Opened → Under Review)
    await drawer2.locator('.disc-actions button:has-text("Review")').click();
    await expect(
      drawer2.locator('.disc-state[data-state="under_review"]'),
    ).toBeVisible();

    // Verify the discrepancy (Under Review → Verified)
    await drawer2
      .locator('input[placeholder="Verification notes"]')
      .fill("Confirmed missing");
    await drawer2.locator('.disc-actions button:has-text("Verify")').click();
    await expectToast(page, "verified");
    await expect(
      drawer2.locator('.disc-state[data-state="verified"]'),
    ).toBeVisible();

    // Resolve (Verified → Resolved)
    await drawer2.locator('.disc-actions button:has-text("Resolve")').click();
    await expectToast(page, "resolved");
    await expect(
      drawer2.locator('.disc-state[data-state="resolved"]'),
    ).toBeVisible();

    // Close drawer and check packing gate — should now pass
    await page.keyboard.press("Escape");
    await page.click('button:has-text("Check Packing")');
    await expectToast(page, "packing can proceed");
  });

  test("complete task after packing cleared", async ({ page }) => {
    test.setTimeout(60_000);
    await setupAdmin(page, "disc-complete-1");

    // Setup: full chain without discrepancy (no discrepancies → packing gate auto-passes)
    await receiveStock(page, "WH-1", "BIN-2", "SKU-CLEAN", 50);
    await createOrder(page, "SKU-CLEAN", "BIN-2", 5);
    await navigateToWaves(page);
    await planAndStartWave(page);
    await assignTask(page, "picker-2");

    // Start task
    await page.click('button:has-text("Start Task")');
    await expectToast(page, "Task started");

    // Check packing — should pass (no discrepancies)
    await page.click('button:has-text("Check Packing")');
    await expectToast(page, "packing can proceed");

    // Complete the task
    await page.click('button:has-text("Complete Task")');
    await expectToast(page, "Task completed");

    // Verify task status in table shows completed
    await expect(page.locator('td:has-text("completed")')).toBeVisible();
  });
});
