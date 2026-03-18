# Refactor Plan

## 1. Project Snapshot

- Generated on: 2026-03-18
- Scope: `src/components/panel/backlink-panel-controller.js`
- Goal: continue shrinking the controller into a composition root by extracting remaining action, navigation, and lifecycle orchestration paths without changing behavior

## 2. Architecture and Module Analysis

| Module | Key Files | Current Responsibility | Main Pain Points | Test Coverage Status |
| --- | --- | --- | --- | --- |
| Panel controller | `src/components/panel/backlink-panel-controller.js` | Top-level panel controller factory; event routing; document navigation/open actions; base-data initialization; controller-to-helper composition | Still ~937 lines; still mixes UI event routing, tab open decisions, cache reset flows, base-data loading, and state mutation; too many responsibilities remain in one closure over mutable `state` | Strong string-based controller regression coverage in `tests/backlink-panel-controller-*.test.js`, but little execution-level unit coverage of extracted action semantics |
| Existing runtime helpers | `src/components/panel/backlink-panel-controller-runtime.js`, `src/components/panel/backlink-panel-controller-rendering.js`, `src/components/panel/backlink-panel-controller-data.js`, `src/components/panel/backlink-panel-controller-actions.js` | Editor registry, refresh tracking, preview/document rerender, render-data refresh, query mutation and criteria actions | Good first split, but controller still manually coordinates event wiring, open actions, bulk expand/collapse, and init flow | Covered indirectly by controller regex tests |
| Related UI helpers | `src/components/panel/backlink-document-open-target.js`, `src/components/panel/backlink-document-interaction.js`, `src/components/panel/backlink-document-row.js`, `src/components/panel/backlink-document-view-state.js` | Open-target routing, click role inference, row rendering, document view-state transitions | Controller still performs too much glue logic instead of delegating fully to focused action helpers | Existing unit tests cover these helpers well |
| Data + host dependencies | `src/service/backlink/backlink-data.ts`, `src/service/plugin/backlink-panel-host.js`, `src/service/plugin/DocumentService.ts` | Base-data/render-data loading, host mount/update flows | Controller still directly coordinates several data and host boundary calls, making future changes expensive | Covered by focus/local-refresh/host tests |

## 3. Prioritized Refactor Backlog

| ID | Priority | Module/Scenario | Files in Scope | Refactor Objective | Risk Level | Pre-Refactor Test Checklist | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF-CTRL-001 | P0 | Extract document open action coordination | `src/components/panel/backlink-panel-controller.js`, new helper beside `backlink-document-open-target.js` | Move `clickBacklinkDocumentLiElement` / `mouseDownBacklinkDocumentLiElement` / `contextmenuBacklinkDocumentLiElement` glue and `openBlockTab` orchestration into a dedicated controller-open-actions helper | High | - [x] Ctrl+left title click still resolves focus-following area correctly; - [x] contextmenu still opens to right area; - [x] main-area activation still happens only when required | done |
| RF-CTRL-002 | P0 | Extract base-data/init orchestration | `src/components/panel/backlink-panel-controller.js`, new init/data-flow helper | Move `loadBacklinkPanelBaseData`, `initBaseData`, and current-state restoration logic into a dedicated init coordinator | High | - [x] Same-root focus refresh still reuses existing query params; - [x] root change still resets active indexes only when expected; - [x] default selected view block behavior remains intact | done |
| RF-CTRL-003 | P1 | Extract document list bulk actions | `src/components/panel/backlink-panel-controller.js`, new helper | Move expand/collapse all document and list-item actions into a bulk-action helper | Medium | - [x] expand/collapse all still touches the same DOM targets; - [x] no change to folded state persistence | done |
| RF-CTRL-004 | P1 | Extract navigation action handler | `src/components/panel/backlink-panel-controller.js`, new helper | Move `navigateBacklinkDocument` and context-step orchestration into a focused navigation helper | Medium | - [x] cyclic navigation still preserves active index semantics; - [x] context stepping still promotes `full` view correctly | done |
| RF-CTRL-005 | P2 | Tighten controller export surface and dependency bags | `src/components/panel/backlink-panel-controller.js`, helper modules | Reduce inline dependency object creation and collapse repeated adapter lambdas into named helpers | Low | - [x] returned controller API remains unchanged; - [x] helper injection semantics stay stable | done |

Priority definition:
- `P0`: highest value and risk, execute first
- `P1`: medium value or risk, execute after P0
- `P2`: low-risk cleanup, execute last

Status definition:
- `pending`
- `in_progress`
- `done`
- `blocked`

## 4. Execution Log

| ID | Start Date | End Date | Test Commands | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| RF-CTRL-001 | 2026-03-18 | 2026-03-18 | `node --test tests/backlink-panel-controller-open-actions.test.js tests/backlink-panel-controller-local-refresh.test.js tests/backlink-panel-controller-forwarding.test.js tests/backlink-panel-controller-focus-refresh.test.js tests/backlink-document-open-target.test.js tests/backlink-document-interaction.test.js` | pass | 已拆出 `backlink-panel-controller-open-actions.js` |
| RF-CTRL-002 | 2026-03-18 | 2026-03-18 | `node --test tests/backlink-panel-controller-local-refresh.test.js tests/backlink-panel-controller-focus-refresh.test.js tests/backlink-panel-controller-composition.test.js` | pass | 已拆出 `backlink-panel-controller-init.js` |
| RF-CTRL-003 | 2026-03-18 | 2026-03-18 | `node --test tests/backlink-panel-controller-local-refresh.test.js` | pass | 已拆出 `backlink-panel-controller-bulk.js` |
| RF-CTRL-004 | 2026-03-18 | 2026-03-18 | `node --test tests/backlink-panel-controller-local-refresh.test.js tests/backlink-panel-controller-forwarding.test.js` | pass | 已拆出 `backlink-panel-controller-navigation.js` |
| RF-CTRL-005 | 2026-03-18 | 2026-03-18 | `node --test tests/backlink-panel-controller-composition.test.js tests/backlink-panel-controller-local-refresh.test.js` | pass | 已拆出 `backlink-panel-controller-composition.js`，controller 进一步收敛为组合层 |

## 5. Decision and Confirmation

- User approved items: `RF-CTRL-001`, `RF-CTRL-002`, `RF-CTRL-003`, `RF-CTRL-004`, `RF-CTRL-005`
- Deferred items:
- Blocked items and reasons:

## 6. Next Actions

1. Controller-specific refactor batch is complete.
2. Remaining follow-up work, if needed, should move to a new plan focused on `backlink-data.ts` or `backlink-protyle-dom.js`.
3. Latest verification status: `node --test tests/*.test.js` pass, `npm run build` pass.
