# Development

## Prereqs

- Node ≥ 20
- pnpm ≥ 9

## Setup

```bash
pnpm install
pnpm build
```

Link the CLI for local use:

```bash
cd apps/cli && pnpm link --global
caveman-mem --help
```

## Run against a scratch data dir

```bash
export CAVEMAN_MEM_HOME=$PWD/.caveman-mem-dev
pnpm dev
```

## Gates

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All four must pass before merging.

## Adding a changeset

```bash
pnpm changeset
```

Commit the generated file with your PR.
