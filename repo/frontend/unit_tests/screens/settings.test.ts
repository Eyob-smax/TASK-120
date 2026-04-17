import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { initDatabase, resetDb } from "../../src/lib/db/connection";
import { setupRealAuth, teardownRealAuth } from "../_helpers/real-auth";
import { createUser, login, logout } from "../../src/lib/security/auth.service";
import { canMutate, isReadOnly } from "../../src/lib/security/permissions";
import { UserRole } from "../../src/lib/types/enums";

describe("Settings Screen Workflows", () => {
  beforeEach(async () => {
    await initDatabase();
    await setupRealAuth();
  });

  afterEach(async () => {
    teardownRealAuth();
    await resetDb();
  });

  it("Admin can create users", async () => {
    const user = await createUser(
      "worker",
      "Worker1Pass",
      UserRole.PickerPacker,
      { displayName: "Worker" },
    );
    expect(user.username).toBe("worker");
    expect(user.role).toBe(UserRole.PickerPacker);
  });

  it("non-Admin cannot create users", async () => {
    await createUser("worker", "Worker1Pass", UserRole.PickerPacker, {
      displayName: "W",
    });
    logout();

    await login("worker", "Worker1Pass");
    await expect(
      createUser("another", "Another1Pass", UserRole.Auditor, {
        displayName: "A",
      }),
    ).rejects.toThrow("administrators");
  });
});

describe("Role-based Settings visibility", () => {
  it("only Admin can manage users", () => {
    expect(canMutate(UserRole.Administrator, "users.create")).toBe(true);
    expect(canMutate(UserRole.WarehouseManager, "users.create")).toBe(false);
    expect(canMutate(UserRole.PickerPacker, "users.create")).toBe(false);
    expect(canMutate(UserRole.Auditor, "users.create")).toBe(false);
  });

  it("only Admin can update settings", () => {
    expect(canMutate(UserRole.Administrator, "settings.update")).toBe(true);
    expect(canMutate(UserRole.WarehouseManager, "settings.update")).toBe(false);
  });

  it("Auditor is read-only", () => {
    expect(isReadOnly(UserRole.Auditor)).toBe(true);
    expect(isReadOnly(UserRole.Administrator)).toBe(false);
  });
});
