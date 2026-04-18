import type { MemoryStore } from '@caveman-mem/core';
import type { HookInput } from '../types.js';

export async function userPromptSubmit(store: MemoryStore, input: HookInput): Promise<string> {
  if (input.prompt) {
    store.addObservation({
      session_id: input.session_id,
      kind: 'user_prompt',
      content: input.prompt,
    });
  }
  // Return empty — retrieval augmentation is driven through MCP, not this hook,
  // so agents that do not use MCP still get a fast path.
  return '';
}
