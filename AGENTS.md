# incident-lab

Training stand: a small shop app with **intentional** defects. Failures from
`make traffic` are the expected starting state, not regressions. Workflow per
README: inspect local telemetry, fix, verify with fresh traffic, open a PR.

## Stack

- Node >=26 runs TypeScript directly (`node src/server.ts`) — no build step.
- SQLite is built-in `node:sqlite`; schema + seed are created at boot in
  `src/store.ts`. No DB server, no migrations.
- `tsconfig` sets `erasableSyntaxOnly`: no enums, namespaces, or parameter
  properties.
- Dev tools are pinned in `mise.toml`; install with `mise install`, then
  `mise run setup` (pnpm install + hk git hooks).

## Verification

- CI parity: `mise run check` = `hk check --all` (oxfmt, oxlint, stylelint,
  hadolint, rumdl, typos, jactionlint, typecheck, knip, lychee) + `pnpm test`.
- `make check` is only `pnpm lint` + `pnpm test` — narrower than CI.
- `pnpm lint` = `tsc --noEmit` && oxlint && `oxfmt --check`; fix with
  `pnpm format`. oxfmt ignores JSON/YAML/CSS/MD (see `oxfmt.config.ts`).
- Single test: `pnpm vitest run -t "<name>"`. Tests spawn the real server on
  an ephemeral port with a temp `DATA_DIR`; never reuse one `DATA_DIR` for two
  processes.
- Conventional commits enforced by commit-msg hook and CI; PR titles must also
  be conventional commits (`pr-title.yml`).

## Docker stand and logs

- `make up` (build+start, `APP_PORT` to change the 8080 port), `make traffic`,
  `make events`, `make down` (keeps data), `make reset` (wipes `var/`).
- `var/` is bind-mounted and gitignored: `events.jsonl` (SDK exceptions),
  `envelopes.jsonl`, `requests.jsonl` (all non-/health requests),
  `shop.sqlite`. Readable directly from the host.
- Sentry SDK uses a file transport (`src/telemetry.ts`) — no Sentry server,
  the DSN is a placeholder. Correlate events ↔ requests via `tags.request_id`
  ↔ `requestId`; filter by `release` and `tags.run_id`.
- `pnpm traffic` / `pnpm events` run the same scripts on the host
  (`TARGET_URL`, `FILTER_RUN_ID`, `FILTER_RELEASE`).

## Verification discipline

- Before a control run, commit: `RELEASE=$(git rev-parse HEAD) RUN_ID=x make up`
  must name the SHA of the code actually built.
- Absence of new errors proves nothing without a successful traffic run.
- Never add model keys or GitHub tokens to the app, Compose, or workflows —
  CI runs betterleaks secret scanning.

## Conventions

- Money is integer kopecks everywhere. Coupon WELCOME = −10%. Search is
  case-insensitive substring; catalog lists only active products; a saved cart
  must tolerate inactive ones.
- Docs and UI in Russian, code identifiers in English.
- Repo-local agents: `.opencode/agents/debug.md` (read-only diagnosis),
  `.opencode/agents/review.md` (diff-review subagent).
- Repo-local skills: `.opencode/skills/bug-report/` (bug report + GitHub
  issue from a selected error event in `var/events.jsonl`).
