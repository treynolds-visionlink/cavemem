# Contributing

Thanks for your interest. A few norms keep the project healthy.

## Ground rules

- **Respect the invariants in `CLAUDE.md`.** The compression-at-rest contract, the `Storage`-only I/O rule, and the progressive-disclosure MCP shape are load-bearing.
- **Tests required.** New features land with unit tests. MCP contract changes land with inspector tests.
- **Small PRs.** Prefer a sequence of focused changes over one large one.
- **Conventional Commits.** `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.

## Running checks

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Adding an IDE integration

1. Implement `Installer` in `packages/installers/src/<ide>.ts`.
2. Register it in `packages/installers/src/registry.ts`.
3. Add a line to the installer table in `README.md`.
4. Add a test in `packages/installers/test/`.

## Adding an MCP tool

1. Register it in `apps/mcp-server/src/server.ts`.
2. Document the contract in `docs/mcp.md`.
3. Add an integration test using `@modelcontextprotocol/inspector`.

## Adding a compression rule

1. Edit `packages/compress/src/lexicon.json`.
2. Add a round-trip fixture in `packages/compress/test/fixtures/`.
3. Run the benchmark in `evals/` and update numbers in `README.md` if the aggregate shifted.

## Release

Releases are cut by GitHub Actions on merge to `main` when a changeset file exists. Do not publish from a local machine.
