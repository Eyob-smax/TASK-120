/**
 * Shared test helper: bootstraps a real authenticated admin session.
 *
 * Replaces vi.mock('auth.service') in tests that should exercise
 * the actual auth/session/DEK boundary instead of faking it.
 *
 * Usage:
 *   beforeEach(async () => { await initDatabase(); await setupRealAuth(); });
 *   afterEach(async () => { teardownRealAuth(); await resetDb(); });
 */
import {
  createInitialAdmin,
  login,
  logout,
  bootstrap,
} from '../../src/lib/security/auth.service';

export async function setupRealAuth(): Promise<void> {
  const { isFirstRun } = await bootstrap();
  if (isFirstRun) {
    await createInitialAdmin('test-admin', 'TestPass123', { displayName: 'Test Admin' });
  }
  await login('test-admin', 'TestPass123');
}

export function teardownRealAuth(): void {
  try {
    logout();
  } catch {
    // Ignore if no session to logout
  }
}
