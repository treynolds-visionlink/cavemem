import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const SENTINEL_START = '<!-- cavemem:start -->';
const SENTINEL_END = '<!-- cavemem:end -->';

/**
 * Inject a block bounded by sentinel comments into a markdown file.
 * If a sentinel block already exists, it is replaced in-place.
 * File is created (with the block only) if it does not exist.
 */
export function injectMarkdownBlock(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const block = `${SENTINEL_START}\n${body.trim()}\n${SENTINEL_END}`;
  if (!existsSync(path)) {
    writeFileSync(path, `${block}\n`, 'utf8');
    return;
  }
  const src = readFileSync(path, 'utf8');
  const startIdx = src.indexOf(SENTINEL_START);
  const endIdx = src.indexOf(SENTINEL_END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const next = src.slice(0, startIdx) + block + src.slice(endIdx + SENTINEL_END.length);
    writeFileSync(path, next, 'utf8');
  } else {
    // Append with a preceding blank line if file is non-empty
    const separator = src.length > 0 && !src.endsWith('\n\n') ? '\n' : '';
    writeFileSync(path, `${src}${separator}${block}\n`, 'utf8');
  }
}

/**
 * Remove the sentinel block written by injectMarkdownBlock.
 * No-op if path does not exist or block is not present.
 */
export function removeMarkdownBlock(path: string): void {
  if (!existsSync(path)) return;
  const src = readFileSync(path, 'utf8');
  const startIdx = src.indexOf(SENTINEL_START);
  const endIdx = src.indexOf(SENTINEL_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return;
  // Also swallow a single trailing newline after the end sentinel
  const afterEnd = endIdx + SENTINEL_END.length;
  const tail = src[afterEnd] === '\n' ? afterEnd + 1 : afterEnd;
  // Trim a leading blank line that was added as separator
  const before = src.slice(0, startIdx);
  const trimmedBefore = before.endsWith('\n\n') ? before.slice(0, -1) : before;
  const result = trimmedBefore + src.slice(tail);
  writeFileSync(path, result, 'utf8');
}

export function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/**
 * Quote a path for embedding into a shell command string (e.g., Claude
 * Code hook `command` fields). Wraps in double quotes unless the path is
 * already a bare token with no whitespace or shell metacharacters. On
 * Windows, double quotes also protect backslashes from being consumed.
 */
export function shellQuote(p: string): string {
  if (/^[\w@%+=:,./\\-]+$/.test(p)) return p;
  return `"${p.replace(/"/g, '\\"')}"`;
}

export function deepMerge<T>(base: T, add: Partial<T>): T {
  const out = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(add as Record<string, unknown>)) {
    const existing = out[k];
    if (
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      v &&
      typeof v === 'object' &&
      !Array.isArray(v)
    ) {
      out[k] = deepMerge(existing as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
