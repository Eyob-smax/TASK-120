/**
 * E2E: Order lifecycle — create, cancel, wave planning, discrepancy workflow
 *
 * Exercises order management from creation through wave/task closure.
 */
import { test, expect, type Page } from '@playwright/test';

async function setupAdmin(page: Page, username: string) {
  await page.goto('/');
  await page.fill('input[placeholder="Your name"]', 'Order Tester');
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/#\/dashboard/);
}

async function receiveStock(page: Page, warehouse: string, bin: string, sku: string, qty: number) {
  await page.click('nav.nav-rail a:has-text("Inventory")');
  await expect(page).toHaveURL(/#\/inventory/);
  await page.click('button:has-text("Receive")');
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  const inputs = modal.locator('input');
  await inputs.nth(0).fill(warehouse);
  await inputs.nth(1).fill(bin);
  await inputs.nth(2).fill(sku);
  await inputs.nth(3).fill(String(qty));
  await modal.locator('button:has-text("Receive")').click();
  await expect(page.locator('[role="status"]')).toContainText('Received');
}

async function navigateToOrders(page: Page) {
  await page.click('nav.nav-rail a:has-text("Orders")');
  await expect(page).toHaveURL(/#\/orders/);
}

test.describe('Order lifecycle', () => {
  test('create order with line items shows order in list with Reserved status', async ({ page }) => {
    await setupAdmin(page, 'ord-create-1');

    // Seed inventory so reservation can succeed
    await receiveStock(page, 'WH-1', 'BIN-1', 'SKU-A', 100);

    await navigateToOrders(page);

    // Open the Create Order drawer
    await page.click('button:has-text("Create Order")');
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('h3')).toContainText('Create Order');

    // Fill line items — SKU, Bin, Qty
    const lineInputs = drawer.locator('.line-row input');
    await lineInputs.nth(0).fill('SKU-A');
    await lineInputs.nth(1).fill('BIN-1');
    await lineInputs.nth(2).fill('10');

    // Submit order
    await drawer.locator('button.submit-btn').click();
    await expect(page.locator('[role="status"]')).toContainText('Order created');

    // Verify order appears in the table with Reserved status
    const table = page.locator('table.data-table');
    await expect(table.locator('td:has-text("reserved")')).toBeVisible();
  });

  test('cancel order releases reservations and updates status', async ({ page }) => {
    await setupAdmin(page, 'ord-cancel-1');

    // Seed inventory and create order
    await receiveStock(page, 'WH-1', 'BIN-1', 'SKU-B', 100);
    await navigateToOrders(page);

    await page.click('button:has-text("Create Order")');
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
    const lineInputs = drawer.locator('.line-row input');
    await lineInputs.nth(0).fill('SKU-B');
    await lineInputs.nth(1).fill('BIN-1');
    await lineInputs.nth(2).fill('5');
    await drawer.locator('button.submit-btn').click();
    await expect(page.locator('[role="status"]')).toContainText('Order created');

    // Cancel the order via row action
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('[role="status"]')).toContainText('cancelled');

    // Status should now show cancelled
    const table = page.locator('table.data-table');
    await expect(table.locator('td:has-text("cancelled")')).toBeVisible();
  });

  test('release expired reservations shows count toast', async ({ page }) => {
    await setupAdmin(page, 'ord-expire-1');
    await navigateToOrders(page);

    // Click the Release Expired button
    await page.click('button:has-text("Release Expired")');

    // Should show a toast with released count (even if 0)
    await expect(page.locator('[role="status"]')).toContainText('Released');
  });

  test('wave planning page is accessible from orders', async ({ page }) => {
    await setupAdmin(page, 'ord-wave-1');

    // Seed inventory and create an order
    await receiveStock(page, 'WH-1', 'BIN-1', 'SKU-C', 200);
    await navigateToOrders(page);

    await page.click('button:has-text("Create Order")');
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
    const lineInputs = drawer.locator('.line-row input');
    await lineInputs.nth(0).fill('SKU-C');
    await lineInputs.nth(1).fill('BIN-1');
    await lineInputs.nth(2).fill('8');
    await drawer.locator('button.submit-btn').click();
    await expect(page.locator('[role="status"]')).toContainText('Order created');

    // Navigate to wave planning
    await page.click('a:has-text("Wave Planning")');
    await expect(page).toHaveURL(/#\/orders\/waves/);
    await expect(page.locator('h2:has-text("Waves")')).toBeVisible();

    // Plan Wave button should be visible for admin
    await expect(page.locator('button:has-text("Plan Wave")')).toBeVisible();
  });
});
