import { defineConfig } from 'tsup';

/**
 * Bundle the CLI + @cavemem/* workspace packages into a single file so the
 * published `cavemem` npm package is self-contained for our own code.
 * Third-party deps (commander, kleur, better-sqlite3, hono, MCP SDK) stay
 * external and are resolved from node_modules — tsup's ESM output cannot
 * safely inline CJS libraries that use `require`.
 */
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: false,
  minify: false,
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [/^@cavemem\//],
});
