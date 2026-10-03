# Project commands

This file is the central reference for commands used to install, run, check,
format, and test the project.

## First-time setup

Install the exact dependency versions recorded in `package-lock.json`:

```bash
npm ci
```

Use `npm ci` after cloning the repository or when you want a clean dependency
installation.

## Code-quality checks

Run all code-quality checks locally with one command:

```bash
npm run check
```

This runs ESLint and then checks formatting with Prettier. A summary at the end
shows whether each check passed. The command fails if either check finds a
problem.

GitHub Actions runs the same checks as two independent jobs so pull requests
show separate **ESLint** and **Prettier** statuses.

Run ESLint only:

```bash
npm run lint
```

Check formatting without modifying files:

```bash
npm run format:check
```

Apply Prettier formatting automatically:

```bash
npm run format
```

Apply ESLint's safe automatic fixes:

```bash
npm run lint -- --fix
```

## Development server

The development server has not been added yet. When the React and Node.js
applications are created, add a `dev` script to `package.json`. The expected
command will then be:

```bash
npm run dev
```

## Tests

Run all unit and integration tests:

```bash
npm test
```

Run only one level:

```bash
npm run test:unit
npm run test:integration
```

Tests live in `tests/unit/` and `tests/integration/`. GitHub Actions runs them as
two jobs, so pull requests show separate **Unit tests** and **Integration tests**
statuses. See `docs/automation.md`.

## List available commands

To see all scripts currently defined in `package.json`, run:

```bash
npm run
```
