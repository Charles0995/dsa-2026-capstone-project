import crypto from 'node:crypto';

export function newId() {
  return crypto.randomUUID();
}

export function newReference() {
  // Uses cryptographically secure random bytes; excludes ambiguous characters (0, O, I, 1) for read-aloud safety
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `TICK-${result}`;
}