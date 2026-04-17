/**
 * E2E: Inventory workflows — receive, ship, transfer, cycle count, safety alerts
 *
 * Exercises the full inventory movement lifecycle through the browser UI.
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
  await page.fill('input[placeholder="Your name"]', "Inv Tester");
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Password"]', "SecurePass123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/#\/dashboard/, {
    timeout: DASHBOARD_NAV_TIMEOUT_MS,
  });
}

async function navigateToInventory(page: Page) {
  await page.click('nav.nav-rail a:has-text("Inventory")');
  await expect(page).toHaveURL(/#\/inventory/);
  await expect(page.locator('h2:has-text("Inventory")')).toBeVisible();
}

async function receiveStock(
  page: Page,
  warehouse: string,
  bin: string,
  sku: string,
  qty: number,
) {
  await page.click('button:has-text("Receive")');
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Fill modal form — labels match "Warehouse ID", "Bin ID", "SKU ID", "Quantity"
  const modal = page.locator('[role="dialog"]');
  const inputs = modal.locator("input");
  // Order: warehouseId, binId, skuId, quantity (per ReceiveModal.svelte)
  await inputs.nth(0).fill(warehouse);
  await inputs.nth(1).fill(bin);
  await inputs.nth(2).fill(sku);
  await inputs.nth(3).fill(String(qty));

  await modal.locator('button:has-text("Receive")').click();

  // Toast should confirm receipt
  await expectToast(page, `Received ${qty} units`);
}

test.describe("Inventory workflows", () => {
  test("receive stock creates inventory record and shows in table", async ({
    page,
  }) => {
    await setupAdmin(page, "inv-receive-1");
    await navigateToInventory(page);

    await receiveStock(page, "WH-MAIN", "BIN-A1", "SKU-001", 50);

    // Verify the row appears in the inventory data table
    const table = page.locator("table.data-table");
    await expect(table.locator('td:has-text("SKU-001")')).toBeVisible();
    await expect(table.locator('td:has-text("BIN-A1")')).toBeVisible();
    await expect(table.locator('td:has-text("50")')).toBeVisible();
  });

  test("ship stock deducts quantity from inventory", async ({ page }) => {
    await setupAdmin(page, "inv-ship-1");
    await navigateToInventory(page);

    // First receive stock
    await receiveStock(page, "WH-MAIN", "BIN-B1", "SKU-002", 100);

    // Now ship some
    await page.click('button:has-text("Ship")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const modal = page.locator('[role="dialog"]');
    const inputs = modal.locator("input");
    await inputs.nth(0).fill("WH-MAIN");
    await inputs.nth(1).fill("BIN-B1");
    await inputs.nth(2).fill("SKU-002");
    await inputs.nth(3).fill("30");

    await modal.locator('button:has-text("Ship")').click();

    // Verify quantity updated to 70
    await expectToast(page, "Shipped");
    const table = page.locator("table.data-table");
    await expect(table.locator('td:has-text("70")')).toBeVisible();
  });

  test("transfer stock moves quantity between bins", async ({ page }) => {
    await setupAdmin(page, "inv-transfer-1");
    await navigateToInventory(page);

    // Receive initial stock
    await receiveStock(page, "WH-MAIN", "BIN-C1", "SKU-003", 40);

    // Transfer to another bin
    await page.click('button:has-text("Transfer")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const modal = page.locator('[role="dialog"]');
    const inputs = modal.locator("input");
    // TransferModal fields: fromWarehouseId, fromBinId, toWarehouseId, toBinId, skuId, quantity
    await inputs.nth(0).fill("WH-MAIN");
    await inputs.nth(1).fill("BIN-C1");
    await inputs.nth(2).fill("WH-MAIN");
    await inputs.nth(3).fill("BIN-C2");
    await inputs.nth(4).fill("SKU-003");
    await inputs.nth(5).fill("15");

    await modal.locator('button:has-text("Transfer")').click();
    await expectToast(page, "Transferred");

    // Both bins should now appear in the table
    const table = page.locator("table.data-table");
    await expect(table.locator('td:has-text("BIN-C1")')).toBeVisible();
    await expect(table.locator('td:has-text("BIN-C2")')).toBeVisible();
  });

  test("cycle count adjusts stock and records ledger entry", async ({
    page,
  }) => {
    await setupAdmin(page, "inv-count-1");
    await navigateToInventory(page);

    // Receive stock first
    await receiveStock(page, "WH-MAIN", "BIN-D1", "SKU-004", 20);

    // Perform cycle count with different actual quantity
    await page.click('button:has-text("Cycle Count")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const modal = page.locator('[role="dialog"]');
    const inputs = modal.locator("input");
    await inputs.nth(0).fill("WH-MAIN");
    await inputs.nth(1).fill("BIN-D1");
    await inputs.nth(2).fill("SKU-004");
    await inputs.nth(3).fill("25");

    await modal.locator('button:has-text("Count")').click();
    await expectToast(page, "Cycle count");

    // Navigate to ledger and verify adjustment entry
    await page.click('a:has-text("View Ledger")');
    await expect(page).toHaveURL(/#\/inventory\/ledger/);
    await expect(
      page.locator('td:has-text("cycle_count_adjust")'),
    ).toBeVisible();
  });

  test("receive low stock triggers safety stock alert banner", async ({
    page,
  }) => {
    await setupAdmin(page, "inv-alert-1");
    await navigateToInventory(page);

    // Receive a very small quantity (below default safety stock threshold of 20)
    await receiveStock(page, "WH-ALERT", "BIN-E1", "SKU-LOW", 5);

    // Alert banner should appear with low stock warning
    const alertBanner = page.locator('[role="alert"]');
    await expect(alertBanner).toBeVisible();
    await expect(alertBanner).toContainText("Low Stock");
    await expect(alertBanner).toContainText("SKU-LOW");
  });
});
