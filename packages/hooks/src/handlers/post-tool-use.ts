import type { MemoryStore } from '@caveman-mem/core';
import type { HookInput } from '../types.js';

export async function postToolUse(store: MemoryStore, input: HookInput): Promise<void> {
  const body = summarizeToolCall(input);
  if (!body) return;
  store.addObservation({
    session_id: input.session_id,
    kind: 'tool_use',
    content: body,
    ...(input.tool !== undefined ? { metadata: { tool: input.tool } } : {}),
  });
}

function summarizeToolCall(input: HookInput): string {
  const tool = input.tool ?? 'unknown';
  const inp = stringifyShort(input.tool_input);
  const out = stringifyShort(input.tool_output);
  return `${tool} input=${inp} output=${out}`.slice(0, 4000);
}

function stringifyShort(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.length > 500 ? `${v.slice(0, 500)}…` : v;
  try {
    const s = JSON.stringify(v);
    return s.length > 500 ? `${s.slice(0, 500)}…` : s;
  } catch {
    return String(v);
  }
}
