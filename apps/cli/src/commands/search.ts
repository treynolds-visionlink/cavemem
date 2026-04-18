import { join } from 'node:path';
import { Command } from 'commander';
import { loadSettings, resolveDataDir } from '@caveman-mem/config';
import { MemoryStore } from '@caveman-mem/core';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Query memory from the terminal')
    .option('--limit <n>', 'max results', '10')
    .action(async (query: string, opts: { limit: string }) => {
      const settings = loadSettings();
      const dbPath = join(resolveDataDir(settings.dataDir), 'data.db');
      const store = new MemoryStore({ dbPath, settings });
      try {
        const hits = await store.search(query, Number(opts.limit));
        for (const h of hits) {
          process.stdout.write(
            `${h.id}\t${h.score.toFixed(3)}\t${h.session_id}\t${h.snippet.replace(/\s+/g, ' ')}\n`,
          );
        }
      } finally {
        store.close();
      }
    });
}
