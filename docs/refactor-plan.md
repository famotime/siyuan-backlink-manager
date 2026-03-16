# Refactor Plan

## 1. Project Snapshot

- Generated on: 2026-03-16
- Scope: backlink context rules, source window calculation, local preview rendering, panel interaction
- Goal: align the current implementation with the formal rules in `docs/上下文状态渐进显示规则.md` while preserving original rendering and editable source behavior

## 1.1 Refactor Strategy

This round must be executed as a top-down architectural refactor, not a sequence of local patches.

Hard constraints:

- Refactor from rule model to render contract to UI interaction, in that order
- Avoid case-by-case condition branching that only fixes one structure or one visibility level
- Prefer replacing ambiguous responsibilities with explicit modules and contracts
- Every downstream change must consume upstream contracts instead of reinterpreting rules locally

Architecture-first sequence:

1. Formalize the domain model for `锚点单元 / 结构壳 / 相邻单元 / 所属标题节`
2. Refactor source window and local preview into one shared context-range contract
3. Refactor rendering orchestration to consume that contract consistently
4. Refactor UI state and feedback to reflect the same contract
5. Remove obsolete fallback paths and duplicated rule interpretation

## 2. Architecture and Module Analysis

| Module | Key Files | Current Responsibility | Main Pain Points | Test Coverage Status |
| --- | --- | --- | --- | --- |
| Context rule model | `src/service/backlink/backlink-context-rules.js`, `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-context-budget.js` | Defines source types, visibility levels, match priority, visible fragments, budget trimming | Source rules are unified, but formal concepts such as `锚点单元`、`结构壳`、`所属标题节` are not first-class yet | Covered by `tests/backlink-context-fragments.test.js`, `tests/backlink-context-budget.test.js` |
| Source window calculation | `src/service/backlink/backlink-source-window.js` | Builds `core/nearby/extended` source windows from ordered document blocks | `core` for list items is too large, `nearby` can over-expand neighbor subtrees, `extended` still uses nearest-any-heading boundaries | Covered by `tests/backlink-source-window.test.js`, `tests/backlink-document-interaction.test.js` |
| Preview assembly | `src/service/backlink/backlink-preview-assembly.js` | Builds fallback preview content from fragments and preview sequence | Can assemble local preview, but cannot yet express “structure shell visible while deep descendants stay folded” | Covered by `tests/backlink-preview-assembly.test.js` |
| Document render orchestration | `src/components/panel/backlink-document-interaction.js`, `src/components/panel/backlink-protyle-rendering.js` | Chooses full-doc vs local render mode, applies source window filtering, restores fold state | Source window and preview assembly still split behavior by scenario; list shell rendering contract is weak | Covered by `tests/backlink-document-interaction.test.js`, `tests/backlink-protyle-rendering.test.js` |
| View state and header feedback | `src/components/panel/backlink-document-view-state.js`, `src/components/panel/backlink-panel-header.js`, `src/components/panel/backlink-results-panel.svelte` | Stores document visibility level and renders row/header affordances | Current level and newly exposed context are not explained strongly enough in UI | Covered by `tests/backlink-document-view-state.test.js`, `tests/backlink-panel-header.test.js` |
| Data assembly entry | `src/service/backlink/backlink-data.ts`, `src/service/backlink/backlink-render-data.js` | Orchestrates loading, attaches source windows, prepares render data and summaries | Needs to propagate any new rule metadata without breaking document-grouped browsing | Covered by `tests/backlink-render-data.test.js`, `tests/backlink-panel-render-data.test.js` |

## 2.1 Target Architecture

The target architecture should be organized as four layers with one-way dependencies:

1. Rule layer
   Files: `src/service/backlink/backlink-context-rules.js`, new helper module(s) if needed
   Responsibility: define canonical concepts and visibility semantics

2. Range planning layer
   Files: `src/service/backlink/backlink-source-window.js`, possibly extracted planner module
   Responsibility: compute `core / nearby / extended / full` range plans from ordered blocks and rule-layer concepts

3. Render contract layer
   Files: `src/service/backlink/backlink-preview-assembly.js`, `src/components/panel/backlink-document-interaction.js`, `src/components/panel/backlink-protyle-rendering.js`
   Responsibility: convert range plans into renderable source-window filtering, shell visibility, and fold behavior

4. Interaction layer
   Files: `src/components/panel/backlink-document-view-state.js`, `src/components/panel/backlink-panel-header.js`, `src/components/panel/backlink-results-panel.svelte`
   Responsibility: expose level switching, current state, and explanation without redefining rules

Dependency rule:

- Interaction layer may not define visibility semantics on its own
- Render contract layer may not invent range boundaries on its own
- Range planning layer may not depend on UI state details
- Rule layer must be the single source of truth for formal concepts

## 3. Prioritized Refactor Backlog

| ID | Priority | Module/Scenario | Files in Scope | Refactor Objective | Risk Level | Pre-Refactor Test Checklist | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF-001 | P0 | 规则层重构 | `src/service/backlink/backlink-context-rules.js`, `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-render-data.js`, `tests/backlink-context-fragments.test.js`, `tests/backlink-render-data.test.js` | Introduce first-class rule concepts for anchor unit, shell, adjacent unit, section boundary, and no-heading fallback so downstream modules stop reinterpreting semantics | High | - [x] 新规则元数据可表达列表子块与列表项壳的区别; - [x] 可表达“同级或更高级标题”边界; - [x] 可表达无标题结构容器兜底; - [x] 现有命中摘要与预算提示不回归 | done |
| RF-002 | P0 | 范围规划层重构 | `src/service/backlink/backlink-source-window.js`, new planner helper module(s) if needed, `tests/backlink-source-window.test.js`, `tests/backlink-document-interaction.test.js` | Refactor source-window calculation into an explicit range planner driven by rule-layer concepts, replacing nearest-any-heading and whole-subtree defaults | High | - [x] `extended` 采用所属标题节边界; - [x] 列表 `core` 不再默认整棵子树; - [x] 列表 `nearby` 采用结构壳优先而非完整深层邻居; - [x] 无标题列表文档优先顶层容器 | done |
| RF-003 | P0 | 渲染契约层重构 | `src/service/backlink/backlink-preview-assembly.js`, `src/components/panel/backlink-document-interaction.js`, `src/components/panel/backlink-protyle-rendering.js`, `tests/backlink-preview-assembly.test.js`, `tests/backlink-document-interaction.test.js`, `tests/backlink-protyle-rendering.test.js` | Build a shared render contract that consumes range plans and controls shell visibility, focus visibility, source-window filtering, and descendant folding consistently | High | - [x] source window 与 preview 组装不再各自解释规则; - [x] 列表结构壳可见且焦点可编辑; - [x] `nearby` 与 `extended` 正文差异稳定可见; - [x] reference-only 与全文路径不回归 | done |
| RF-004 | P1 | 交互层重构 | `src/components/panel/backlink-document-view-state.js`, `src/components/panel/backlink-panel-header.js`, `src/components/panel/backlink-results-panel.svelte`, `tests/backlink-document-view-state.test.js`, `tests/backlink-panel-header.test.js` | Refactor UI state and feedback to reflect the new contract instead of encoding rule assumptions inside click handlers or labels | Medium | - [x] 当前层级文案与实际范围一致; - [x] 切换反馈能解释新增内容; - [x] 编辑/拖拽刷新后层级保持稳定; - [x] 文档折叠和全文模式不回归 | done |
| RF-005 | P1 | 入口编排与兼容清理 | `src/service/backlink/backlink-data.ts`, `src/service/backlink/backlink-render-data.js`, related tests | Remove duplicated fallback paths, thread new rule metadata through render data, and keep document-grouped browsing stable | Medium | - [x] `sourceWindows/contextBundle/renderData` 字段语义一致; - [x] 文档分组切换不回归; - [x] 来源标签与命中摘要继续准确 | done |
| RF-006 | P2 | 文档与全量回归收尾 | `docs/上下文状态渐进显示规则.md`, `docs/反链上下文基线与术语表.md`, `tests/*.test.js` | Finalize docs after architecture lands and close remaining regression gaps | Low | - [x] 所有已批准项的测试补齐; - [x] 相关规则文档与代码一致; - [x] 全量回归可执行 | done |

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
| RF-001 | 2026-03-16 | 2026-03-16 | `node --test tests/backlink-source-window.test.js tests/backlink-protyle-dom.test.js tests/backlink-document-interaction.test.js`; `node --test tests/backlink-preview-assembly.test.js tests/backlink-protyle-rendering.test.js` | pass | 先写失败测试，再落地“所属标题节 / 无标题容器兜底 / visibleBlockIds / renderMode”契约 |
| RF-002 | 2026-03-16 | 2026-03-16 | `node --test tests/backlink-source-window.test.js tests/backlink-protyle-dom.test.js tests/backlink-document-interaction.test.js` | pass | source window 改为范围规划器语义，列表 `core/nearby` 从整棵子树收紧到结构壳优先 |
| RF-003 | 2026-03-16 | 2026-03-16 | `node --test tests/backlink-preview-assembly.test.js tests/backlink-protyle-rendering.test.js`; `node --test tests/*.test.js` | pass | 统一渲染契约后，全量回归中的历史失败也已在后续收尾项中消除 |
| RF-004 | 2026-03-16 | 2026-03-16 | `node --test tests/backlink-panel-header.test.js tests/backlink-document-row.test.js tests/backlink-panel-controller-forwarding.test.js` | pass | 新增统一的 context control state helper，并把下一步层级/可见来源/预算提示接到文档行 |
| RF-005 | 2026-03-16 | 2026-03-16 | `node --test tests/backlink-panel-header.test.js tests/backlink-document-row.test.js tests/backlink-panel-controller-forwarding.test.js` | pass | controller 改为透传统一的 context control state；文档行不再自行推断层级说明 |
| RF-006 | 2026-03-16 | 2026-03-16 | `node --test tests/backlink-filter-panel-style-scope.test.js tests/dev-build-config.test.js`; `node --test tests/*.test.js` | pass | 修复扁平上下文状态样式断言与 Windows 风格 watch 路径识别，196 条测试全部通过 |

## 5. Decision and Confirmation

- User approved items: `RF-001`, `RF-002`, `RF-003`, `RF-004`, `RF-005`, `RF-006`
- Deferred items:
- Blocked items and reasons:
  none

## 6. Next Actions

1. If there is a follow-up iteration, continue from the same top-down rule -> range -> render -> interaction order.
2. Keep `renderMode` and `visibleBlockIds` as the shared contract for future list-shell and local-preview changes.
3. Preserve full-suite green status before merging further context behavior changes.
