export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export type LogCategory =
  | 'auth'
  | 'inventory'
  | 'files'
  | 'notifications'
  | 'identity'
  | 'security'
  | 'app';

const REDACTED_FIELDS = new Set([
  'password',
  'passwordhash',
  'salt',
  'hash',
  'dek',
  'iv',
  'encrypteddata',
  'wrappeddek',
  'dekiv',
  'ciphertext',
  'key',
  'secret',
]);

export function sanitize(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = sanitize(value);
    }
  }
  return result;
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export function createLogger(category: LogCategory): Logger {
  const format = (level: LogLevel, message: string) =>
    `[${category}] [${level}] ${message}`;

  const sanitizeArgs = (args: unknown[]) => args.map(a => sanitize(a));

  return {
    debug(message: string, ...args: unknown[]) {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.debug(format(LogLevel.Debug, message), ...sanitizeArgs(args));
      }
    },
    info(message: string, ...args: unknown[]) {
      console.info(format(LogLevel.Info, message), ...sanitizeArgs(args));
    },
    warn(message: string, ...args: unknown[]) {
      console.warn(format(LogLevel.Warn, message), ...sanitizeArgs(args));
    },
    error(message: string, ...args: unknown[]) {
      console.error(format(LogLevel.Error, message), ...sanitizeArgs(args));
    },
  };
}
