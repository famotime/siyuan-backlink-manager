# Project Refactor Plan

## 1. Snapshot

- Generated on: 2026-03-18
- Scope: project-level module analysis and staged refactor recommendations
- Goal: reduce coupling in backlink data flow, panel orchestration, and context planning without changing user-visible behavior
- Workflow gate: this document is analysis only; no implementation should start before explicit approval

## 2. Module Map

| Area | Key Files | Current Responsibility | Notes |
| --- | --- | --- | --- |
| Entry / lifecycle | `src/index.ts` | Plugin bootstrap, service startup, event hookup | Thin entrypoint, acceptable as composition root |
| Data pipeline | `src/service/backlink/backlink-data.ts` | Query orchestration, filtering, context visibility, budgeting, source windows, pagination, render-data assembly | Large cross-module coordinator with broad dependency surface |
| Query / collector layer | `src/service/backlink/backlink-query-loaders.js`, `src/service/backlink/backlink-panel-data-collectors.js`, `src/service/backlink/backlink-panel-base-data-builder.js`, `src/service/backlink/backlink-panel-data-assembly.js` | SQL-backed loading and block-node enrichment | Functional split exists, but boundaries are still leaky and callback-heavy |
| Context / planner | `src/service/backlink/backlink-source-window.js`, `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-render-data.js` | Source window planning, explanation/meta bundle, DOM/render fallback data | Core logic is tested, but files are too large and mix multiple concerns |
| UI orchestration | `src/components/panel/backlink-panel-controller.js` | Panel state machine, event handling, document navigation, rendering, refreshes, persistence hooks | Single high-risk orchestration file with many responsibilities |
| Render / DOM helpers | `src/components/panel/backlink-protyle-dom.js`, `src/components/panel/backlink-protyle-rendering.js`, `src/components/panel/backlink-document-*.js` | Protyle DOM mutations, per-document rendering, row/header interactions | Reasonable helper split, but controller still owns too much sequencing |
| Plugin hosts | `src/service/plugin/DocumentService.ts`, `src/service/plugin/backlink-panel-host.js`, `src/service/plugin/TabService.ts`, `src/service/plugin/DockServices.ts` | Document-bottom panel host, dock/tab mounting, focus forwarding | Lifecycle handling is functional but spread across host and controller layers |
| Settings | `src/service/setting/SettingService.ts`, `src/service/setting/setting-config-resolver.js`, `src/service/setting/BacklinkPanelFilterCriteriaService.ts` | Persistent config, criteria persistence, default derivation | Good test coverage, but some API/naming debt remains |
| Types / models | `src/models/backlink-model.ts`, `src/types/index.d.ts` | Main project data contracts | Runtime and type-layer duplication is accumulating |
| Tests | `tests/*.test.js` | Regression suite across data, UI, styles, and plugin hosts | Broad coverage exists; integration-heavy modules still rely on large synthetic fixtures |

## 3. Highest-Value Refactor Candidates

| ID | Priority | Candidate | Files | Current Responsibility / Boundary | Refactor Value | Regression Risk | Test Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF-001 | P0 | Split panel controller orchestration | `src/components/panel/backlink-panel-controller.js`, related `backlink-document-*` helpers | One file owns state access, DOM event handling, navigation, refresh scheduling, rendering, persistence updates, and host coordination | Reduces complexity in the most change-prone UI control path; improves maintainability and local reasoning | High | Need focused tests for extracted action handlers, render coordinator, and refresh scheduler behavior |
| RF-002 | P0 | Decompose source-window planner | `src/service/backlink/backlink-source-window.js` | One file owns document ordering, heading section math, list shell rules, source-window getters, attachment, and DB load orchestration | This is the core correctness engine; isolating strategies will lower future bug rate and make rules easier to evolve | High | Need tests per planner submodule boundary, especially ordering fallback, heading sections, and list shell visibility invariants |
| RF-003 | P0 | Extract data assembly pipeline stages | `src/service/backlink/backlink-data.ts`, `src/service/backlink/backlink-panel-data-collectors.js`, `src/service/backlink/backlink-query-loaders.js`, `src/service/backlink/backlink-panel-data-assembly.js` | Query loading, node enrichment, visibility/budget application, pagination, and final render data are still stitched together in one broad function | Makes data flow explicit, narrows dependency injection surfaces, and improves observability for failures | High | Missing stage-level tests for pipeline contracts and error/empty-state boundaries between stages |
| RF-004 | P1 | Separate explanation/meta building from match/search logic | `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-render-data.js`, `src/components/panel/backlink-document-row.js` | Bundle construction, matching, summary generation, and meta-path formatting live together | Clarifies domain boundaries and makes location/meta extensions safer | Medium | Need tests around meta field generation, summary formatting, and matching resets as independent helpers |
| RF-005 | P1 | Consolidate host lifecycle and refresh ownership | `src/service/plugin/DocumentService.ts`, `src/service/plugin/backlink-panel-host.js`, `src/components/panel/backlink-panel-controller.js`, `src/service/plugin/document-protyle-guard.js` | EventBus lifecycle, host mount/update/destroy, focus propagation, and local refresh ownership are split across layers | Reduces lifecycle drift and duplicate state transitions across document-bottom/dock/tab hosts | Medium | Need tests for mount-update-destroy ownership and same-root focus refresh flows across hosts |
| RF-006 | P2 | Clean up settings/type/naming debt | `src/service/setting/SettingService.ts`, `src/models/backlink-model.ts`, `src/types/index.d.ts` | Typoed APIs (`updateSettingCofnig*`), duplicated type contracts, mixed TS/JS boundaries | Improves consistency and lowers incidental friction for later refactors | Low | Need type-shape parity checks and settings API regression tests after renames/adapters |

## 4. Detailed Findings

### RF-001. Split panel controller orchestration

Current findings:

- [`src/components/panel/backlink-panel-controller.js`](/home/quincyzou/projects/siyuan-backlink-manager/src/components/panel/backlink-panel-controller.js) is about 1175 lines and mixes at least five concerns:
  - editor lifecycle management
  - DOM event capture and click routing
  - local refresh scheduling
  - data loading / pagination / filter refresh
  - document-group rendering and navigation
- The file already imports many helper modules, which indicates the controller is a composition root, but it still contains too much business logic inline.
- Small controller changes are currently expensive because behavior is distributed across nested closures over shared mutable `state`.

Expected target:

- Keep one top-level controller factory, but extract internal responsibilities into stateless helpers or dedicated mini-coordinators:
  - `document-group-refresh`
  - `document-navigation-actions`
  - `panel-data-refresh`
  - `document-open-actions`
  - `editor-lifecycle`

Behavior invariants:

- No change to navigation, context stepping, local refresh timing, or document active-index retention.
- Existing eventBus and host integration must keep working for dock/tab/document-bottom mounts.

### RF-002. Decompose source-window planner

Current findings:

- [`src/service/backlink/backlink-source-window.js`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/backlink/backlink-source-window.js) is about 1411 lines.
- It currently mixes:
  - document ordering recovery
  - tree reconstruction
  - heading section discovery
  - list shell visibility rules
  - source-window construction
  - getter/adaptor functions
  - document block loading SQL orchestration
- The module is well tested, but its internal cohesion is low. It is difficult to reason about one rule without loading the entire file.

Expected target:

- Split into planner-focused modules with narrow responsibilities, for example:
  - `backlink-source-window-ordering`
  - `backlink-source-window-structure`
  - `backlink-source-window-planner`
  - `backlink-source-window-adapter`
  - `backlink-source-window-loader`

Behavior invariants:

- `bodyRange.windowBlockIds` remains the single source of truth for continuous body range.
- Ordering and heading/list rules remain exactly aligned with current tests.

### RF-003. Extract data assembly pipeline stages

Current findings:

- [`src/service/backlink/backlink-data.ts`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/backlink/backlink-data.ts) is the main data orchestrator and still handles filtering, budget, pagination, cache fetches, source window attachment, and render-data packaging in large monolithic flows.
- It builds very wide dependency bags and performs many transformations in-place, which makes stage-level reasoning and error isolation difficult.
- The collector layer already exists, but contracts between loaders, collectors, bundle hydration, planner attachment, and render packaging are implicit.

Expected target:

- Express data flow as explicit stages with typed inputs/outputs:
  - raw block loading
  - backlink node hydration
  - context/meta hydration
  - planner attachment
  - filter/sort/pagination
  - render-data packaging

Behavior invariants:

- No change to query semantics, cache usage, or sorting/pagination output.
- `getBacklinkPanelRenderData` and `getBacklinkPanelData` keep their public signatures until the final adapter stage.

### RF-004. Separate explanation/meta building from match/search logic

Current findings:

- [`src/service/backlink/backlink-context.js`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/backlink/backlink-context.js) handles fragment creation, meta info creation, visibility application, matching, summary construction, and match reset.
- This is manageable but already broad enough that new explanation features will likely increase coupling.

Expected target:

- Extract pure helpers around:
  - meta info derivation
  - fragment construction
  - bundle visibility filtering
  - bundle matching/reset
  - row/header presentation helpers

Behavior invariants:

- Match summaries, primary source selection, and meta-path display stay unchanged.

### RF-005. Consolidate host lifecycle and refresh ownership

Current findings:

- [`src/service/plugin/DocumentService.ts`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/plugin/DocumentService.ts) and [`src/service/plugin/backlink-panel-host.js`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/plugin/backlink-panel-host.js) both participate in panel mount/update flows.
- Refresh ownership spans host services and controller logic, which creates more places to audit when same-root focus behavior changes.

Expected target:

- Centralize host lifecycle contracts:
  - host decides mount/update/destroy
  - controller decides panel-local state transitions
  - focus propagation path is explicit and one-directional

Behavior invariants:

- Same-root focus refresh and document-bottom reuse behavior must remain intact.

### RF-006. Clean up settings/type/naming debt

Current findings:

- [`src/service/setting/SettingService.ts`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/setting/SettingService.ts) still exposes typoed public method names.
- `src/models/backlink-model.ts` and `src/types/index.d.ts` duplicate related contract shapes.
- The repo mixes TS and JS intentionally, but some shared boundary modules now pay a maintenance cost because type ownership is unclear.

Expected target:

- Introduce adapters for backward compatibility, then normalize names and reduce duplicated type ownership.

Behavior invariants:

- No persistence schema change.
- Existing import sites continue working during the transition.

## 5. Pre-Refactor Test Checklist

### RF-001

- Navigation still cycles within a document group.
- Context stepping still preserves current active backlink and render state.
- Local refresh still re-renders only the target document group.
- Event handlers are detached on teardown.

### RF-002

- Ordering fallback remains stable when block indexes are incomplete.
- Heading `nearby` and `extended` boundaries remain correct.
- List `core/nearby` shell and collapse rules remain correct.
- Getter behavior still prefers `contextPlan` and falls back to legacy fields.

### RF-003

- Empty query results and cache hits still produce the same render data shape.
- Visibility/budget application order remains unchanged.
- Pagination and document grouping outputs stay stable.

### RF-004

- Match summaries and primary source remain unchanged.
- Meta fields remain separate from body rendering.
- Visibility application still affects only explanation fragments.

### RF-005

- Document-bottom panel reuse on same-root updates remains intact.
- Focus refresh still forwards the focused block id correctly.
- Host destroy still tears down panel instance and listeners.

### RF-006

- Settings persist/load behavior remains unchanged.
- Type-adapter changes do not alter runtime object shapes.

## 6. Execution Backlog

| ID | Priority | Scope | Files | Status |
| --- | --- | --- | --- | --- |
| RF-001 | P0 | Panel controller orchestration split | `src/components/panel/backlink-panel-controller.js`, related panel helpers | done |
| RF-002 | P0 | Source-window planner decomposition | `src/service/backlink/backlink-source-window.js`, related tests | done |
| RF-003 | P0 | Data pipeline stage extraction | `src/service/backlink/backlink-data.ts`, collectors/loaders/assembly files | done |
| RF-004 | P1 | Explanation/meta pipeline separation | `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-render-data.js`, row/header helpers | done |
| RF-005 | P1 | Host lifecycle ownership cleanup | plugin host services + controller integration | done |
| RF-006 | P2 | Settings/type/naming cleanup | settings services and shared type definitions | done |

## 7. Recommended Order

1. `RF-002` first, because source-window rules are the most correctness-sensitive domain boundary.
2. `RF-001` next, because controller orchestration is the highest operational complexity surface.
3. `RF-003` after that, to turn the data flow into explicit stages while the UI and planner seams are clearer.
4. `RF-004` and `RF-005` once the heavy P0 surfaces are reduced.
5. `RF-006` last as cleanup and consistency work.

## 8. Approval Gate

No refactor implementation has started.

Approve one or more item IDs to execute next:

- `RF-002`
- `RF-001`
- `RF-003`
- `RF-004`
- `RF-005`
- `RF-006`

Recommended first batch:

1. `RF-002`
2. `RF-001`

That pair gives the best leverage with the least ambiguity: it attacks the two largest, highest-risk modules first while preserving the existing test safety net.

## 9. Execution Log

| ID | Date | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| RF-002 | 2026-03-18 | done | `node --test tests/backlink-source-window.test.js` | 已拆出 `backlink-source-window-ordering.js`、`backlink-source-window-structure.js`、`backlink-source-window-loader.js`，主模块改为 planner facade + public API |
| RF-001 | 2026-03-18 | done | `node --test tests/backlink-panel-controller-local-refresh.test.js tests/backlink-panel-controller-focus-refresh.test.js tests/backlink-panel-controller-forwarding.test.js` | 已拆出 `backlink-panel-controller-runtime.js`，把 editor registry 和 document-group refresh tracking 从控制器主文件中下沉 |
| RF-003 | 2026-03-18 | done | `node --test tests/backlink-data-pipeline.test.js tests/backlink-panel-focus.test.js` | 已拆出 `backlink-data-pipeline.js`，把有效节点准备和 render payload 组装从 `backlink-data.ts` 主流程中抽离为显式 stage helper |
| RF-004 | 2026-03-18 | done | `node --test tests/backlink-context-helpers.test.js tests/backlink-context-fragments.test.js` | 已拆出 `backlink-context-meta.js` 和 `backlink-context-match.js`，把 meta 生成与 match/reset 细节从主 bundle 文件中分离 |
| RF-005 | 2026-03-18 | done | `node --test tests/document-service-host-lifecycle.test.js tests/document-service-focus-sync.test.js tests/backlink-panel-host.test.js` | 已拆出 `document-backlink-host-lifecycle.js`，把 DocumentService 的底部面板复用/挂载决策下沉到独立 host helper |
| RF-006 | 2026-03-18 | done | `node --test tests/setting-service-api.test.js tests/setting-config-resolver.test.js` | `SettingService` 新增正确拼写的 `updateSettingConfig*` API，并保留旧 typo 方法作为兼容别名 |
