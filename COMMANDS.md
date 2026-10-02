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

A test framework has not been added yet. When it is configured, add a `test`
script to `package.json`. The expected command will then be:

```bash
npm test
```

## List available commands

To see all scripts currently defined in `package.json`, run:

```bash
npm run
```

## Monorepo (Turborepo)

The repository is split into packages (`contracts`, `fixtures`, `stub-server`,
and later `apps/*` and `packages/*`). Turborepo runs tasks across them in
dependency order and caches the results.

Validate the contracts, then every fixture against them:

```bash
npm run validate
```

Build or test every package that has a `build` or `test` script:

```bash
npm run build
npm test
```

Run only what your branch changed (compared with `main`), plus everything
that depends on it:

```bash
npx turbo run validate build test --affected
```

Preview what would run without running it:

```bash
npx turbo run validate build test --affected --dry
```

See how the packages depend on each other (opens in a browser):

```bash
npx turbo run validate --graph=graph.html
```

### Adding a new app or package

1. Create a folder in `apps/` (deployable) or `packages/` (shared code).
2. Give it a `package.json` with `"name": "@case-a/<name>"`, `"private": true`,
   and the scripts it supports (`build`, `test`, `validate`, `dev`). Use the
   same script names as the other packages, since Turborepo finds tasks by name.
3. List the internal packages it uses under `dependencies`, for example
   `"@case-a/contracts": "*"`.
4. Run `npm install` from the repository root.
