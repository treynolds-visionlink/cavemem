export type HookName =
  | 'session-start'
  | 'user-prompt-submit'
  | 'post-tool-use'
  | 'stop'
  | 'session-end';

export interface HookInput {
  session_id: string;
  ide: string;
  cwd?: string;
  prompt?: string;
  tool?: string;
  tool_input?: unknown;
  tool_output?: unknown;
  turn_summary?: string;
  metadata?: Record<string, unknown>;
}

export interface HookResult {
  ok: boolean;
  ms: number;
  context?: string;
  error?: string;
}
