/**
 * E2E: File management — upload, delete/restore, recycle bin, version drawer
 *
 * Exercises real file operations through the browser UI, not just visibility checks.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

const DASHBOARD_NAV_TIMEOUT_MS = 90_000;

async function expectToast(page: Page, text: string | RegExp) {
  await expect(
    page.getByRole("status").filter({ hasText: text }).last(),
  ).toBeVisible();
}

async function setupAdmin(page: Page, username: string) {
  await page.goto("/");
  await page.fill('input[placeholder="Your name"]', "File Tester");
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Password"]', "SecurePass123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/#\/dashboard/, {
    timeout: DASHBOARD_NAV_TIMEOUT_MS,
  });
}

async function navigateToFiles(page: Page) {
  await page.click('nav.nav-rail a:has-text("Files")');
  await expect(page).toHaveURL(/#\/files/);
  await expect(page.locator('h2:has-text("File Management")')).toBeVisible();
}

/** Create a real temporary file on disk for Playwright's setInputFiles */
function createTempFile(name: string, content: string): string {
  const filePath = path.join(os.tmpdir(), name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function uploadFile(page: Page, fileName: string, content: string) {
  const filePath = createTempFile(fileName, content);

  await page.click('button:has-text("Upload")');
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();

  // Set file on the file input inside the modal
  const fileInput = modal.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);

  // File info should display the name
  await expect(modal.locator("strong")).toContainText(fileName);

  // Click the modal's Upload/Confirm button
  await modal.locator('button:has-text("Upload")').click();

  // Wait for success toast
  await expectToast(page, "uploaded");

  // Clean up temp file
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

test.describe("File version lifecycle — real workflows", () => {
  test("upload file via modal, verify file appears in data table", async ({
    page,
  }) => {
    await setupAdmin(page, "file-real-upload-1");
    await navigateToFiles(page);

    await uploadFile(
      page,
      "test-doc.txt",
      "Hello, this is test content for E2E",
    );

    // Verify the file appears in the table
    const table = page.locator("table.data-table");
    await expect(table.locator('td:has-text("test-doc.txt")')).toBeVisible();
    await expect(table.locator('td:has-text("text/plain")')).toBeVisible();
  });

  test("delete file moves to recycle bin, restore returns it", async ({
    page,
  }) => {
    await setupAdmin(page, "file-del-restore-1");
    await navigateToFiles(page);

    // Upload a file first
    await uploadFile(page, "deletable.txt", "Content to delete and restore");

    const table = page.locator("table.data-table");
    await expect(table.locator('td:has-text("deletable.txt")')).toBeVisible();

    // Delete via row action for the matching file row.
    const fileRow = table
      .locator("tbody tr")
      .filter({ has: page.locator('td:has-text("deletable.txt")') })
      .first();
    await expect(fileRow).toBeVisible();
    await fileRow.locator('button:has-text("Delete")').click();
    await expectToast(page, "recycle bin");

    // File should no longer be in main table
    await expect(
      table.locator('td:has-text("deletable.txt")'),
    ).not.toBeVisible();

    // Switch to recycle bin view
    await page.click('button:has-text("Recycle Bin")');
    await expect(page.locator('h4:has-text("Recycle Bin")')).toBeVisible();

    // Entry should be listed by original name.
    const recycleEntry = page
      .locator("li")
      .filter({ has: page.locator('strong:has-text("deletable.txt")') })
      .first();
    await expect(recycleEntry).toBeVisible();

    // Restore the file
    await recycleEntry.locator('button:has-text("Restore")').click();
    await expectToast(page, "restored");

    // Switch back to file list
    await page.click('button:has-text("Show Files")');
    await expect(table.locator('td:has-text("deletable.txt")')).toBeVisible();
  });

  test("recycle bin shows purge expired button and handles empty state", async ({
    page,
  }) => {
    await setupAdmin(page, "file-purge-1");
    await navigateToFiles(page);

    // Open recycle bin
    await page.click('button:has-text("Recycle Bin")');
    await expect(page.locator('h4:has-text("Recycle Bin")')).toBeVisible();
    await expect(
      page.locator('button:has-text("Purge Expired")'),
    ).toBeVisible();

    // Click purge — should succeed even with 0 expired entries
    await page.click('button:has-text("Purge Expired")');
    await expectToast(page, "Purged");
  });

  test("version drawer shows version history after upload", async ({
    page,
  }) => {
    await setupAdmin(page, "file-version-drawer-1");
    await navigateToFiles(page);

    await uploadFile(page, "versioned-file.txt", "Version 1 content");

    // Click the Versions row action
    await page.click('button:has-text("Versions")');

    // Version drawer should open
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole("heading", { name: "Version History" }),
    ).toBeVisible();
  });
});
