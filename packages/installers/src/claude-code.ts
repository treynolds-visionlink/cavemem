import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { deepMerge, injectMarkdownBlock, readJson, removeMarkdownBlock, shellQuote, writeJson } from './fs-utils.js';
import type { InstallContext, Installer } from './types.js';

interface ClaudeSettings {
  hooks?: Record<
    string,
    Array<{ matcher?: string; hooks: Array<{ type: string; command: string }> }>
  >;
  mcpServers?: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>;
}

const HOOK_NAMES: Array<[string, string]> = [
  ['SessionStart', 'session-start'],
  ['UserPromptSubmit', 'user-prompt-submit'],
  ['PostToolUse', 'post-tool-use'],
  ['Stop', 'stop'],
  ['SessionEnd', 'session-end'],
];

const CLAUDE_MD_RULE =
  'At the start of each new task or when entering unfamiliar context, call cavemem:search with keywords derived from the task. Use results to orient yourself before exploring the codebase directly.';

function settingsFile(): string {
  return join(homedir(), '.claude', 'settings.json');
}

function claudeMdFile(): string {
  return join(homedir(), '.claude', 'CLAUDE.md');
}

export const claudeCode: Installer = {
  id: 'claude-code',
  label: 'Claude Code',
  async detect(_ctx: InstallContext): Promise<boolean> {
    return existsSync(join(homedir(), '.claude'));
  },
  async install(ctx: InstallContext): Promise<string[]> {
    const path = settingsFile();
    const current = readJson<ClaudeSettings>(path, {});
    const hooks: ClaudeSettings['hooks'] = { ...(current.hooks ?? {}) };
    // Hook commands are shell strings, so nodeBin + cliPath must be quoted —
    // Windows npm installs land under paths like C:\Users\...\AppData that
    // may contain spaces. Both cmd.exe and sh treat "..." as one argv token.
    const nodeBin = shellQuote(ctx.nodeBin);
    const cliPath = shellQuote(ctx.cliPath);
    for (const [claudeName, hookId] of HOOK_NAMES) {
      hooks[claudeName] = [
        {
          hooks: [
            {
              type: 'command',
              command: `${nodeBin} ${cliPath} hook run ${hookId} --ide claude-code`,
            },
          ],
        },
      ];
    }
    const mcpServers = {
      ...(current.mcpServers ?? {}),
      cavemem: {
        // Spawn node explicitly — if command is the .js file, Claude Code's
        // MCP launcher can't exec it on Windows (EFTYPE).
        command: ctx.nodeBin,
        args: [ctx.cliPath, 'mcp'],
      },
    };
    const next = deepMerge<ClaudeSettings>(current, { hooks, mcpServers });
    writeJson(path, next);
    const mdPath = claudeMdFile();
    injectMarkdownBlock(mdPath, CLAUDE_MD_RULE);
    return [`wrote ${path}`, `updated ${mdPath}`];
  },
  async uninstall(_ctx: InstallContext): Promise<string[]> {
    const path = settingsFile();
    const current = readJson<ClaudeSettings>(path, {});
    if (current.hooks) {
      for (const [claudeName] of HOOK_NAMES) delete current.hooks[claudeName];
    }
    if (current.mcpServers) delete current.mcpServers.cavemem;
    writeJson(path, current);
    const mdPath = claudeMdFile();
    removeMarkdownBlock(mdPath);
    return [`updated ${path}`, `updated ${mdPath}`];
  },
};
