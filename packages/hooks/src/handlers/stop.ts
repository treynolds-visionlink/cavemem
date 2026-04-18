import type { MemoryStore } from '@cavemem/core';
import type { HookInput } from '../types.js';

export async function stop(store: MemoryStore, input: HookInput): Promise<void> {
  if (!input.turn_summary) return;
  store.addSummary({
    session_id: input.session_id,
    scope: 'turn',
    content: input.turn_summary,
  });
}
