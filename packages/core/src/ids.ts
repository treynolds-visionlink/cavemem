import { randomBytes } from 'node:crypto';

export function createSessionId(): string {
  return `sess_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}
