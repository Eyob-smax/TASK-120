import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { initDatabase, closeDb, resetDb } from "../../src/lib/db/connection";
import {
  bootstrap,
  createInitialAdmin,
  createUser,
  login,
  logout,
  lock,
  unlock,
  getCurrentSession,
  getCurrentDEK,
} from "../../src/lib/security/auth.service";
import { UserRole } from "../../src/lib/types/enums";

describe("Auth Service", () => {
  beforeEach(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    logout();
    await resetDb();
  });

  const testProfile = { displayName: "Test Admin" };

  it("bootstrap returns isFirstRun true when no users exist", async () => {
    const { isFirstRun } = await bootstrap();
    expect(isFirstRun).toBe(true);
  });

  it("createInitialAdmin creates an administrator", async () => {
    const user = await createInitialAdmin("admin", "AdminPass1", testProfile);
    expect(user.username).toBe("admin");
    expect(user.role).toBe(UserRole.Administrator);
    expect(user.id).toBeTruthy();
    expect(user.passwordHash).toBeTruthy();
    expect(user.salt).toBeTruthy();
    expect(user.wrappedDEK).toBeTruthy();
  });

  it("bootstrap returns isFirstRun false after admin created", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    const { isFirstRun } = await bootstrap();
    expect(isFirstRun).toBe(false);
  });

  it("createInitialAdmin throws when users already exist", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    await expect(
      createInitialAdmin("admin2", "AdminPass2", testProfile),
    ).rejects.toThrow("first run");
  });

  it("login succeeds with correct credentials", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    const session = await login("admin", "AdminPass1");
    expect(session.userId).toBeTruthy();
    expect(session.role).toBe(UserRole.Administrator);
    expect(session.isLocked).toBe(false);
  });

  it("login fails with wrong password", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    await expect(login("admin", "WrongPass2")).rejects.toThrow("Invalid");
  });

  it("login fails with non-existent username", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    await expect(login("nobody", "AdminPass1")).rejects.toThrow("Invalid");
  });

  it("logout clears session and DEK", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    await login("admin", "AdminPass1");
    expect(getCurrentSession()).not.toBeNull();
    expect(getCurrentDEK()).not.toBeNull();

    logout();
    expect(getCurrentSession()).toBeNull();
    expect(getCurrentDEK()).toBeNull();
  });

  it("lock sets isLocked and clears DEK", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    await login("admin", "AdminPass1");

    lock();
    expect(getCurrentSession()?.isLocked).toBe(true);
    expect(getCurrentDEK()).toBeNull();
  });

  it("unlock restores session and DEK", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    await login("admin", "AdminPass1");
    lock();

    const session = await unlock("AdminPass1");
    expect(session.isLocked).toBe(false);
    expect(getCurrentDEK()).not.toBeNull();
  });

  it("unlock fails with wrong password", async () => {
    await createInitialAdmin("admin", "AdminPass1", testProfile);
    await login("admin", "AdminPass1");
    lock();

    await expect(unlock("WrongPass2")).rejects.toThrow("Invalid");
  });

  it(
    "createUser works when logged in as Administrator",
    { timeout: 90_000 },
    async () => {
      await createInitialAdmin("admin", "AdminPass1", testProfile);
      await login("admin", "AdminPass1");

      const user = await createUser(
        "worker1",
        "Worker1Pass",
        UserRole.PickerPacker,
        { displayName: "Worker One" },
      );
      expect(user.username).toBe("worker1");
      expect(user.role).toBe(UserRole.PickerPacker);
    },
  );

  it(
    "createUser throws when not Administrator",
    { timeout: 90_000 },
    async () => {
      await createInitialAdmin("admin", "AdminPass1", testProfile);
      await login("admin", "AdminPass1");
      await createUser("worker1", "Worker1Pass", UserRole.PickerPacker, {
        displayName: "W1",
      });
      logout();

      await login("worker1", "Worker1Pass");
      await expect(
        createUser("worker2", "Worker2Pass", UserRole.PickerPacker, {
          displayName: "W2",
        }),
      ).rejects.toThrow("administrators");
    },
  );
});
