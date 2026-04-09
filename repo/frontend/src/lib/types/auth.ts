import type { BaseEntity } from './common';
import type { UserRole } from './enums';

export interface UserProfile {
  displayName: string;
  email?: string;
}

export interface User extends BaseEntity {
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  wrappedDEK: string;
  dekIV: string;
  profile: UserProfile;
}

export interface Session {
  userId: string;
  role: UserRole;
  loginAt: string;
  lastActivityAt: string;
  isLocked: boolean;
}

export interface Permission {
  capability: RevealCapability;
  roles: UserRole[];
}

export type RevealCapability =
  | 'identity.reveal_basic'
  | 'identity.reveal_sensitive'
  | 'files.reveal_key_metadata'
  | 'users.reveal_contact';
