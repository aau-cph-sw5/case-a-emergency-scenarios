# Rules for working in this repository

Read by developers and by coding agents. Mistral Vibe reads this file directly;
Claude Code reads it through `CLAUDE.md`.
This file holds the code rules. The workflow lives in [CONTRIBUTING.md](CONTRIBUTING.md),
the commands in [COMMANDS.md](COMMANDS.md). Don't copy them here.

## Hard rules

- Don't read, copy, quote or commit the Metro scenario seed data. It is confidential
  Metro material and is kept outside the repository, in the folder
  that `SEED_SCENARIOS_DIR` in `.env` points to.
- Don't put anything from Metro Service in `fixtures/`. Fixtures are invented.
- Don't hand-edit `shared/types/v1/`. It is generated.

## Code rules

1. **File types.** React UI is written as `.tsx` components. Code without UI
   (the API in `src/`, `shared/` helpers, scripts) is `.ts`. Don't add new `.js` files.
2. **Theming.** Colours, spacing and type that are used more than once go in
   [shared/Theme.tsx](shared/Theme.tsx). No hex values outside its `palette`.
   What the colours mean: [designGuidelines.md](docs/instructions/designGuidelines.md).
3. **Shared types.** A type that crosses the API is defined as a JSON schema in
   `contracts/v1/*.schema.json`. Run `npm run generate:types` to get the
   TypeScript type in `shared/types/v1/`, and import it from there. A type used
   only inside one app stays in that app.

## Changing a contract

Edit the schema or `contracts/v1/openapi.yaml`, bump `info.version`, add a
heading to [contracts/CHANGELOG.md](contracts/CHANGELOG.md), regenerate the types,
and run `npm run validate`. The other groups build against these files.

## Before you call it done

```bash
npm run check          # lint, format:check, typecheck
npm test               # unit, integration (needs Docker), jest
```

Changed application files need 80% combined line coverage
([ADR 0007](docs/adr/0007-test-coverage-policy.md)).

## For agents

- Follow the PR title and branch rules in CONTRIBUTING.md. Open PRs against `dev`.
- Don't commit, push or open PRs unless the developer asks you to.
- When a rule here and the code disagree, say so. Don't "fix" the code to match
  this file without asking.
