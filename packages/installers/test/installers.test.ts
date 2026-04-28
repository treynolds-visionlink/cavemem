import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { claudeCode } from '../src/claude-code.js';
import { cursor } from '../src/cursor.js';
import { deepMerge, injectMarkdownBlock, removeMarkdownBlock } from '../src/fs-utils.js';
import { getInstaller, installers } from '../src/registry.js';
import type { InstallContext } from '../src/types.js';

let home: string;
let originalHome: string | undefined;
let ctx: InstallContext;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'cavemem-ins-'));
  originalHome = process.env.HOME;
  process.env.HOME = home;
  ctx = {
    ideConfigDir: home,
    cliPath: '/fake/bin/cavemem.js',
    nodeBin: '/fake/bin/node',
    dataDir: join(home, '.cavemem'),
  };
});

afterEach(() => {
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  rmSync(home, { recursive: true, force: true });
});

describe('registry', () => {
  it('exposes all expected installers', () => {
    expect(Object.keys(installers).sort()).toEqual(
      ['claude-code', 'codex', 'cursor', 'gemini-cli', 'opencode'].sort(),
    );
  });
  it('getInstaller throws on unknown id', () => {
    expect(() => getInstaller('nope')).toThrow(/Unknown IDE/);
  });
});

describe('deepMerge', () => {
  it('recursively merges nested objects', () => {
    const a: Record<string, unknown> = { a: { b: 1, c: 2 }, d: 3 };
    const b: Record<string, unknown> = { a: { c: 20, e: 5 }, f: 6 };
    expect(deepMerge(a, b)).toEqual({
      a: { b: 1, c: 20, e: 5 },
      d: 3,
      f: 6,
    });
  });
  it('replaces arrays instead of concatenating', () => {
    const base: Record<string, unknown> = { xs: [1, 2] };
    const add: Record<string, unknown> = { xs: [3] };
    expect(deepMerge(base, add)).toEqual({ xs: [3] });
  });
});

describe('claude-code installer', () => {
  it('writes hooks + mcpServer for a fresh install and is idempotent', async () => {
    await claudeCode.install(ctx);
    const settingsPath = join(home, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);
    const first = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
      hooks: Record<string, Array<{ hooks: Array<{ type: string; command: string }> }>>;
      mcpServers: Record<string, { command: string; args?: string[] }>;
    };
    expect(Object.keys(first.hooks).sort()).toEqual(
      ['PostToolUse', 'SessionEnd', 'SessionStart', 'Stop', 'UserPromptSubmit'].sort(),
    );
    expect(first.hooks.SessionStart?.[0]?.hooks?.[0]?.command).toBe(
      `${ctx.nodeBin} ${ctx.cliPath} hook run session-start --ide claude-code`,
    );
    expect(first.mcpServers.cavemem).toEqual({
      command: ctx.nodeBin,
      args: [ctx.cliPath, 'mcp'],
    });

    await claudeCode.install(ctx); // run twice
    const second = JSON.parse(readFileSync(settingsPath, 'utf8')) as typeof first;
    expect(Object.keys(second.hooks).sort()).toEqual(Object.keys(first.hooks).sort());
    // No duplicate cavemem entries.
    expect(Object.keys(second.mcpServers)).toEqual(['cavemem']);
  });

  it('preserves unrelated user settings on install + uninstall', async () => {
    const settingsPath = join(home, '.claude', 'settings.json');
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(
      settingsPath,
      JSON.stringify({
        theme: 'dark',
        mcpServers: { other: { command: '/other/bin' } },
        hooks: { CustomEvent: [{ hooks: [{ type: 'command', command: 'noop' }] }] },
      }),
    );

    await claudeCode.install(ctx);
    const installed = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
      theme: string;
      hooks: Record<string, unknown>;
      mcpServers: Record<string, unknown>;
    };
    expect(installed.theme).toBe('dark');
    expect(installed.mcpServers.other).toEqual({ command: '/other/bin' });
    expect(installed.hooks.CustomEvent).toBeDefined();

    await claudeCode.uninstall(ctx);
    const after = JSON.parse(readFileSync(settingsPath, 'utf8')) as typeof installed;
    expect(after.theme).toBe('dark');
    expect(after.mcpServers.other).toEqual({ command: '/other/bin' });
    expect(after.mcpServers.cavemem).toBeUndefined();
    expect(after.hooks.SessionStart).toBeUndefined();
    expect(after.hooks.CustomEvent).toBeDefined();
  });

  it('quotes paths with spaces in hook command strings (Windows)', async () => {
    const winCtx: InstallContext = {
      ideConfigDir: home,
      cliPath: 'C:\\Users\\Some User\\AppData\\Roaming\\npm\\node_modules\\cavemem\\dist\\index.js',
      nodeBin: 'C:\\Program Files\\nodejs\\node.exe',
      dataDir: join(home, '.cavemem'),
    };
    await claudeCode.install(winCtx);
    const settingsPath = join(home, '.claude', 'settings.json');
    const parsed = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    const cmd = parsed.hooks.SessionStart?.[0]?.hooks?.[0]?.command ?? '';
    expect(cmd).toBe(
      `"${winCtx.nodeBin}" "${winCtx.cliPath}" hook run session-start --ide claude-code`,
    );
    // MCP entry is a structured shape, so no quoting needed there — Claude
    // spawns command + args directly.
    expect(parsed.mcpServers.cavemem).toEqual({
      command: winCtx.nodeBin,
      args: [winCtx.cliPath, 'mcp'],
    });
  });

  it('detect returns true only when ~/.claude exists', async () => {
    expect(await claudeCode.detect(ctx)).toBe(false);
    mkdirSync(join(home, '.claude'));
    expect(await claudeCode.detect(ctx)).toBe(true);
  });
});

describe('injectMarkdownBlock / removeMarkdownBlock', () => {
  let tmpDir: string;
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'cavemem-md-')); });
  afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates file with sentinel block when it does not exist', () => {
    const p = join(tmpDir, 'CLAUDE.md');
    injectMarkdownBlock(p, 'rule text');
    const content = readFileSync(p, 'utf8');
    expect(content).toContain('<!-- cavemem:start -->');
    expect(content).toContain('rule text');
    expect(content).toContain('<!-- cavemem:end -->');
  });

  it('appends to existing file without duplicating', () => {
    const p = join(tmpDir, 'CLAUDE.md');
    writeFileSync(p, '# Existing\n\nsome content\n');
    injectMarkdownBlock(p, 'rule text');
    const content = readFileSync(p, 'utf8');
    expect(content).toContain('# Existing');
    expect(content).toContain('rule text');
    expect((content.match(/cavemem:start/g) ?? []).length).toBe(1);
  });

  it('replaces block in-place on second inject', () => {
    const p = join(tmpDir, 'CLAUDE.md');
    injectMarkdownBlock(p, 'old rule');
    injectMarkdownBlock(p, 'new rule');
    const content = readFileSync(p, 'utf8');
    expect(content).not.toContain('old rule');
    expect(content).toContain('new rule');
    expect((content.match(/cavemem:start/g) ?? []).length).toBe(1);
  });

  it('removeMarkdownBlock strips block and leaves surrounding content', () => {
    const p = join(tmpDir, 'CLAUDE.md');
    writeFileSync(p, '# Top\n\nsome content\n');
    injectMarkdownBlock(p, 'rule text');
    removeMarkdownBlock(p);
    const content = readFileSync(p, 'utf8');
    expect(content).toContain('# Top');
    expect(content).not.toContain('cavemem:start');
    expect(content).not.toContain('rule text');
  });

  it('removeMarkdownBlock is a no-op on missing file', () => {
    expect(() => removeMarkdownBlock(join(tmpDir, 'missing.md'))).not.toThrow();
  });
});

describe('claude-code installer CLAUDE.md', () => {
  it('injects rule on install and removes it on uninstall', async () => {
    await claudeCode.install(ctx);
    const mdPath = join(home, '.claude', 'CLAUDE.md');
    expect(existsSync(mdPath)).toBe(true);
    const installed = readFileSync(mdPath, 'utf8');
    expect(installed).toContain('<!-- cavemem:start -->');
    expect(installed).toContain('cavemem:search');
    expect(installed).toContain('<!-- cavemem:end -->');

    await claudeCode.uninstall(ctx);
    const after = readFileSync(mdPath, 'utf8');
    expect(after).not.toContain('cavemem:start');
    expect(after).not.toContain('cavemem:search');
  });

  it('install is idempotent — no duplicate sentinel blocks', async () => {
    await claudeCode.install(ctx);
    await claudeCode.install(ctx);
    const mdPath = join(home, '.claude', 'CLAUDE.md');
    const content = readFileSync(mdPath, 'utf8');
    expect((content.match(/cavemem:start/g) ?? []).length).toBe(1);
  });

  it('preserves existing CLAUDE.md content on install + uninstall', async () => {
    const mdPath = join(home, '.claude', 'CLAUDE.md');
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(mdPath, '# My rules\n\nDo not break prod.\n');

    await claudeCode.install(ctx);
    expect(readFileSync(mdPath, 'utf8')).toContain('Do not break prod.');

    await claudeCode.uninstall(ctx);
    expect(readFileSync(mdPath, 'utf8')).toContain('Do not break prod.');
  });
});

describe('cursor installer', () => {
  it('writes a cursor MCP config and removes it cleanly', async () => {
    await cursor.install(ctx);
    const p = join(home, '.cursor', 'mcp.json');
    expect(existsSync(p)).toBe(true);
    const cfg = JSON.parse(readFileSync(p, 'utf8')) as {
      mcpServers: Record<string, { command: string; args?: string[] }>;
    };
    expect(cfg.mcpServers.cavemem).toEqual({
      command: ctx.nodeBin,
      args: [ctx.cliPath, 'mcp'],
    });

    await cursor.uninstall(ctx);
    const after = JSON.parse(readFileSync(p, 'utf8')) as typeof cfg;
    expect(after.mcpServers.cavemem).toBeUndefined();
  });
});
