# Project Refactor Plan

## 1. Snapshot

- Generated on: 2026-03-18
- Scope: current-state refactor analysis after multiple completed module splits
- Goal: continue reducing complexity in the remaining largest modules while preserving behavior and existing regression guarantees
- Workflow gate: this document is planning only; no new refactor should start without explicit approval

## 2. Current Module Map

| Area | Key Files | Current Responsibility | Status |
| --- | --- | --- | --- |
| Entry / lifecycle | `src/index.ts` | Plugin bootstrap and service startup | Stable |
| Planner / context | `src/service/backlink/backlink-source-window.js`, `src/service/backlink/backlink-source-window-*.js`, `src/service/backlink/backlink-context*.js` | Source window planning and explanation/meta logic | Improved, but planner facade and structure module are still sizable |
| Data pipeline | `src/service/backlink/backlink-data.ts`, `src/service/backlink/backlink-data-pipeline.js` | Render-data orchestration, cache-backed backlink fetch, source window attach, packaging | Partially decomposed |
| Query / collector layer | `src/service/backlink/backlink-query-loaders.js`, `src/service/backlink/backlink-panel-data-collectors.js`, `src/service/backlink/backlink-panel-data-collector-helpers.js` | SQL-backed loading and node enrichment | Improved, but loader/collector orchestration still large |
| Render data | `src/service/backlink/backlink-render-data.js`, `src/service/backlink/backlink-render-data-dom.js` | Backlink API normalization, search validity checks, sort comparators, summary helpers | Improved, but main file still broad |
| UI orchestration | `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-panel-controller-runtime.js`, `src/components/panel/backlink-panel-controller-rendering.js`, `src/components/panel/backlink-panel-controller-data.js` | Panel control flow, refresh scheduling, rerender coordination, render-data refresh | Improved, but controller still the largest file |
| Plugin hosts | `src/service/plugin/DocumentService.ts`, `src/service/plugin/document-backlink-host-lifecycle.js`, `src/service/plugin/backlink-panel-host.js` | Host mount/update/destroy and focus propagation | Improved |
| Settings / types | `src/service/setting/SettingService.ts`, `src/models/backlink-model.ts`, `src/types/index.d.ts` | Persistence, defaults, contracts | Naming cleanup done; type duplication still exists |
| Tests | `tests/*.test.js` | 317 regression cases covering rules, UI, pipeline, host lifecycle, styles | Strong safety net |

## 3. Largest Remaining Files

| File | Lines | Why It Still Matters |
| --- | --- | --- |
| `src/components/panel/backlink-panel-controller.js` | ~1012 | Still owns many UI actions and state mutation paths |
| `src/service/backlink/backlink-source-window.js` | ~625 | Public planner facade still bundles several rule paths |
| `src/service/backlink/backlink-data.ts` | ~563 | Still coordinates cache, fetch, source-window attach, and base-data loading |
| `src/service/backlink/backlink-query-loaders.js` | ~500 | Multiple query families and sibling-order enrichment in one file |
| `src/service/backlink/backlink-panel-data-collectors.js` | ~498 | Enrichment flows are better, but sibling/parent/list collectors still share one file |
| `src/service/backlink/backlink-render-data.js` | ~459 | API normalization, keyword validation, and cache-backed backlink fetch remain combined |
| `src/components/panel/backlink-protyle-dom.js` | ~452 | DOM filtering and list fold/unfold behavior still live together |
| `src/service/backlink/backlink-source-window-structure.js` | ~429 | Structure rules are isolated, but still broad enough to be a future split candidate |

## 4. Next Refactor Candidates

| ID | Priority | Candidate | Files | Refactor Value | Regression Risk | Test Gaps |
| --- | --- | --- | --- | --- | --- | --- |
| RF-012 | P0 | Split backlink data fetch/attach coordinator | `src/service/backlink/backlink-data.ts`, `src/service/backlink/backlink-data-pipeline.js`, related tests | Highest leverage remaining backend coordinator; makes cache/fetch/planner stages explicit | High | Need stage-level tests for backlink fetch normalization, source-window attach, and page-turn payload assembly |
| RF-013 | P0 | Split panel controller action handlers | `src/components/panel/backlink-panel-controller.js`, related controller helpers/tests | Largest remaining orchestration file; isolate filter actions, criteria actions, and navigation actions | High | Need tests for action helper imports and unchanged query/state mutation semantics |
| RF-014 | P1 | Decompose query loader families | `src/service/backlink/backlink-query-loaders.js`, related tests | Separates headline/list/parent/sibling query logic and lowers dependency bag width | Medium | Need focused tests per loader family and sibling-order enrichment helper |
| RF-015 | P1 | Decompose collector families | `src/service/backlink/backlink-panel-data-collectors.js`, related tests | Split backlink/headline/list/parent/sibling collectors into narrower modules | Medium | Need import-boundary and helper-contract tests per collector |
| RF-016 | P2 | Shrink planner facade again | `src/service/backlink/backlink-source-window.js`, `src/service/backlink/backlink-source-window-structure.js` | Continue reducing public facade size now that ordering/loader pieces are already extracted | Low | Need export-shape tests and public API compatibility checks |

## 5. Detailed Findings

### RF-012. Split backlink data fetch/attach coordinator

Current findings:

- [`src/service/backlink/backlink-data.ts`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/backlink/backlink-data.ts) already delegates valid-node preparation and render payload assembly, but still owns:
  - batch backlink fetch wiring
  - source-window block loading and attachment
  - filtered def/document arrays
  - base-data loading orchestration
- The file still builds large inline dependency objects for fetch and planner attachment.

Expected target:

- Extract helpers for:
  - backlink fetch/normalize bundle
  - source-window attachment stage
  - turn-page render-data packaging
  - base-data load orchestration

Behavior invariants:

- No change to cache use, fallback fetch trigger, or planner attachment semantics.

### RF-013. Split panel controller action handlers

Current findings:

- [`src/components/panel/backlink-panel-controller.js`](/home/quincyzou/projects/siyuan-backlink-manager/src/components/panel/backlink-panel-controller.js) has shrunk, but still mixes:
  - filter reset actions
  - include/exclude condition actions
  - saved criteria actions
  - input debounce handlers
  - document navigation and open actions
- The file remains the biggest source of UI change risk.

Expected target:

- Extract action-centric helpers:
  - query mutation actions
  - criteria actions
  - input debounce actions
  - document navigation/open actions

Behavior invariants:

- Query param updates, debounce timings, and event semantics remain identical.

### RF-014. Decompose query loader families

Current findings:

- [`src/service/backlink/backlink-query-loaders.js`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/backlink/backlink-query-loaders.js) still combines:
  - backlink block lookup
  - headline child lookup
  - list item child lookup
  - parent block lookup
  - sibling group loading and enrichment
- Sibling enrichment alone has enough detail to justify its own file.

Expected target:

- Split into family modules:
  - `backlink-query-loader-backlinks`
  - `backlink-query-loader-children`
  - `backlink-query-loader-parents`
  - `backlink-query-loader-siblings`

Behavior invariants:

- SQL selection and sibling ordering stay unchanged.

### RF-015. Decompose collector families

Current findings:

- [`src/service/backlink/backlink-panel-data-collectors.js`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/backlink/backlink-panel-data-collectors.js) now delegates small helpers but still hosts five distinct collector families.
- Parent/sibling enrichment paths are materially different and can be isolated.

Expected target:

- Split by collector family:
  - backlink node collector
  - headline child collector
  - list tree collector
  - parent collector
  - sibling collector

Behavior invariants:

- All context maps and block-node mutations remain byte-for-byte compatible with current tests.

### RF-016. Shrink planner facade again

Current findings:

- [`src/service/backlink/backlink-source-window.js`](/home/quincyzou/projects/siyuan-backlink-manager/src/service/backlink/backlink-source-window.js) is smaller than before, but still combines:
  - contextPlan/build adapters
  - public getter exports
  - core/nearby/extended planners
  - source-window attachment

Expected target:

- Move actual planner strategies into a dedicated `planner` module and leave the facade mainly as export surface + compatibility layer.

Behavior invariants:

- Export names and return shapes must remain unchanged.

## 6. Pre-Refactor Test Checklist

### RF-012

- `getBacklinkPanelRenderData` still returns the same payload shape for the same inputs.
- Page-turn payloads still omit unchanged arrays where expected.
- Source windows are still attached for the paged backlink subset only.

### RF-013

- Filter reset actions still mutate the same query fields.
- Saved criteria actions still persist/delete the same payloads.
- Debounced input actions still call the same refresh functions after the same delays.

### RF-014

- Sibling loader order and enrichment remain unchanged.
- Parent/list/headline child loaders still use the same SQL and post-processing paths.

### RF-015

- Each collector still updates the same context maps and node fields.
- Sibling collector still sets markdown/renderMarkdown/block id arrays exactly as before.

### RF-016

- Public getter and builder exports stay unchanged.
- Core/nearby/extended planner outputs remain identical under existing source-window tests.

## 7. Execution Backlog

| ID | Priority | Scope | Files | Status |
| --- | --- | --- | --- | --- |
| RF-012 | P0 | Backlink data fetch/attach coordinator split | `src/service/backlink/backlink-data.ts`, related pipeline helpers | done |
| RF-013 | P0 | Panel controller action handler split | `src/components/panel/backlink-panel-controller.js`, related helper modules | done |
| RF-014 | P1 | Query loader family decomposition | `src/service/backlink/backlink-query-loaders.js` | pending |
| RF-015 | P1 | Collector family decomposition | `src/service/backlink/backlink-panel-data-collectors.js` | pending |
| RF-016 | P2 | Planner facade shrink | `src/service/backlink/backlink-source-window.js` | pending |

## 8. Recommended Order

1. `RF-012`
2. `RF-013`
3. `RF-014`
4. `RF-015`
5. `RF-016`

The first two give the highest leverage on the remaining largest coordination files while staying inside the current regression safety net.

## 9. Approval Gate

No new refactor implementation has started in this planning cycle.

Approve one or more item IDs to execute next:

- `RF-012`
- `RF-013`
- `RF-014`
- `RF-015`
- `RF-016`

Recommended first batch:

1. `RF-012`
2. `RF-013`

## 10. Execution Log

| ID | Date | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| RF-012 | 2026-03-18 | done | `node --test tests/backlink-data-fetch-stage.test.js tests/backlink-data-pipeline.test.js tests/backlink-panel-focus.test.js` | 已拆出 `backlink-data-fetch-stage.js`，把 backlink fetch、source-window block loading 和 attach 逻辑从 `backlink-data.ts` 主流程中抽成显式 stage |
| RF-013 | 2026-03-18 | done | `node --test tests/backlink-panel-controller-actions.test.js tests/backlink-panel-controller-local-refresh.test.js tests/backlink-panel-controller-forwarding.test.js tests/backlink-panel-controller-focus-refresh.test.js` | 已拆出 `backlink-panel-controller-actions.js`，把 query mutation、criteria 操作和输入防抖逻辑从主控制器中分离 |
