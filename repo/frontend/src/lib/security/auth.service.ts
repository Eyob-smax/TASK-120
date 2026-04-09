import {
  generateSalt,
  hashPassword,
  verifyPassword,
  deriveKey,
  generateDataKey,
  wrapKey,
  unwrapKey,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from './crypto';
import { Repository } from '$lib/db/repository';
import { STORE_NAMES } from '$lib/db/schema';
import type { User, UserProfile, Session } from '$lib/types/auth';
import { UserRole } from '$lib/types/enums';
import { AuthenticationError, AuthorizationError } from '$lib/services/errors';
import { createLogger } from '$lib/logging/logger';

let currentSession: Session | null = null;
let currentDEK: CryptoKey | null = null;

const userRepo = new Repository<User>(STORE_NAMES.USERS);
const logger = createLogger('auth');

export async function bootstrap(): Promise<{ isFirstRun: boolean }> {
  const count = await userRepo.count();
  return { isFirstRun: count === 0 };
}

async function createUserInternal(
  username: string,
  password: string,
  role: UserRole,
  profile: UserProfile,
): Promise<User> {
  const salt = generateSalt();
  const passwordHashBuf = await hashPassword(password, salt);
  const kek = await deriveKey(password, salt);
  const dek = await generateDataKey();
  const { wrapped, iv } = await wrapKey(dek, kek);

  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: arrayBufferToBase64(passwordHashBuf),
    salt: uint8ArrayToBase64(salt),
    role,
    wrappedDEK: arrayBufferToBase64(wrapped),
    dekIV: uint8ArrayToBase64(iv),
    profile,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await userRepo.add(user);
  logger.info('User created', { username, role });
  return user;
}

export async function createInitialAdmin(
  username: string,
  password: string,
  profile: UserProfile,
): Promise<User> {
  const { isFirstRun } = await bootstrap();
  if (!isFirstRun) {
    throw new AuthorizationError('Initial admin can only be created on first run');
  }
  return createUserInternal(username, password, UserRole.Administrator, profile);
}

export async function createUser(
  username: string,
  password: string,
  role: UserRole,
  profile: UserProfile,
): Promise<User> {
  if (!currentSession || currentSession.role !== UserRole.Administrator) {
    throw new AuthorizationError('Only administrators can create users');
  }
  return createUserInternal(username, password, role, profile);
}

export async function login(
  username: string,
  password: string,
): Promise<Session> {
  const user = await userRepo.getOneByIndex('username', username);
  if (!user) {
    throw new AuthenticationError('Invalid username or password');
  }

  const salt = base64ToUint8Array(user.salt);
  const expectedHash = base64ToArrayBuffer(user.passwordHash);
  const valid = await verifyPassword(password, salt, expectedHash);
  if (!valid) {
    throw new AuthenticationError('Invalid username or password');
  }

  const kek = await deriveKey(password, salt);
  const wrappedDEK = base64ToArrayBuffer(user.wrappedDEK);
  const dekIV = base64ToUint8Array(user.dekIV);
  currentDEK = await unwrapKey(wrappedDEK, dekIV, kek);

  const now = new Date().toISOString();
  currentSession = {
    userId: user.id,
    role: user.role,
    loginAt: now,
    lastActivityAt: now,
    isLocked: false,
  };

  logger.info('Login successful', { username, role: user.role });
  return currentSession;
}

export function logout(): void {
  logger.info('Logout', { userId: currentSession?.userId });
  currentSession = null;
  currentDEK = null;
}

export function lock(): void {
  if (currentSession) {
    currentSession = { ...currentSession, isLocked: true };
    currentDEK = null;
    logger.info('Screen locked', { userId: currentSession.userId });
  }
}

export async function unlock(password: string): Promise<Session> {
  if (!currentSession || !currentSession.isLocked) {
    throw new AuthenticationError('No locked session to unlock');
  }

  const user = await userRepo.getById(currentSession.userId);
  if (!user) {
    throw new AuthenticationError('User not found');
  }

  const salt = base64ToUint8Array(user.salt);
  const expectedHash = base64ToArrayBuffer(user.passwordHash);
  const valid = await verifyPassword(password, salt, expectedHash);
  if (!valid) {
    throw new AuthenticationError('Invalid password');
  }

  const kek = await deriveKey(password, salt);
  const wrappedDEK = base64ToArrayBuffer(user.wrappedDEK);
  const dekIV = base64ToUint8Array(user.dekIV);
  currentDEK = await unwrapKey(wrappedDEK, dekIV, kek);

  currentSession = {
    ...currentSession,
    isLocked: false,
    lastActivityAt: new Date().toISOString(),
  };

  logger.info('Screen unlocked', { userId: currentSession.userId });
  return currentSession;
}

export function getCurrentSession(): Session | null {
  return currentSession;
}

export function getCurrentDEK(): CryptoKey | null {
  return currentDEK;
}
