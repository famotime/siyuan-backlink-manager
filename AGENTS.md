# Repository Guidelines

## Project Structure & Module Organization

Core plugin code lives in `src/`. Use `src/index.ts` for plugin bootstrap, `src/components/` for Svelte UI, `src/service/backlink/` for backlink queries, filtering, and pagination, `src/service/plugin/` for document/tab/dock hosts, and `src/service/setting/` for persisted settings. Shared models, config, and helpers live in `src/models/`, `src/config/`, `src/utils/`, and `src/types/`. Regression tests are in `tests/`. Product and maintenance docs live in `docs/` and `developer_docs/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: watch build with Vite; outputs to `dev/` or the directory resolved from `VITE_DEV_DIST_DIR` / `VITE_SIYUAN_WORKSPACE_PATH`.
- `npm run build`: create a production build in `dist/` and generate `package.zip`.
- `npm run make-link`: symlink the local `dev/` build into a SiYuan plugin directory for live development.
- `npm run make-install`: build and copy `dist/` into the target SiYuan plugin directory.
- `node --test tests/*.test.js`: run the full regression suite.

## Coding Style & Naming Conventions

Use TypeScript or Svelte for new feature code unless an existing module is already plain `.js`. Match the surrounding file’s formatting; much of `src/` uses 4-space indentation, and large reformat-only diffs should be avoided. Keep imports grouped, prefer small extracted helpers, and use descriptive names such as `TopBarService.ts`, `backlink-document-pagination.js`, and `string-util.ts`. Name Svelte components in kebab-case and service classes with a `Service` suffix.

## Testing Guidelines

Tests use Node’s built-in `node:test` plus `assert/strict`. Add targeted regression tests for any logic moved into helpers, especially under `src/service/backlink/`, `src/service/setting/`, and panel host utilities. Name tests after the behavior under test, using `*.test.js` in `tests/`, for example `backlink-document-pagination.test.js`.

## Commit & Pull Request Guidelines

Recent history mixes concise imperative subjects with occasional conventional prefixes, for example `feat: add document-level backlink navigation` and `Fix backlink document header interactions`. Prefer short, imperative commit messages and use `feat:` / `fix:` when it adds clarity. PRs should summarize the user-visible change, list validation steps run, link related issues, and include screenshots or GIFs for dock, tab, or document-bottom UI changes.

## Configuration & Release Notes

Keep `plugin.json`, `README.md`, and `public/i18n/` in sync when changing plugin metadata or visible text. When build or packaging behavior changes, update `docs/project-structure.md` or the relevant `developer_docs/` note as part of the same PR.
