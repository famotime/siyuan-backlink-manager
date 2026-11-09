# Project Structure

## Overview

`siyuan-backlink-manager` is a SiYuan plugin focused on filtered backlink browsing across three hosts:
- document bottom panel
- plugin tab
- dock panel

After the refactors on 2026-03-14 and 2026-11-09, the codebase is organized around four layers:
- plugin bootstrap and host integration
- backlink panel UI and UI helpers
- backlink data assembly and filtering helpers
- setting, config, and shared utilities

## Top-Level Map

```text
src/
  index.ts                         Plugin bootstrap
  index.scss                       Global styles
  components/
    dock/                          Dock UI
    panel/                         Backlink panel UI and panel-specific helpers
    setting/                       Settings dialog UI
  config/                          Runtime singleton config and caches
  i18n/                            Source i18n dictionaries
  models/                          Data models and constants
  service/
    backlink/                      Query, filtering, pagination, render-data assembly
    plugin/                        Document/Tab/Dock host integration
    setting/                       Settings persistence and criteria storage
  types/                           Ambient type declarations
  utils/                           Shared helpers
tests/                             Node-based regression tests
docs/                              Product and maintenance docs
```

## Module Responsibilities

### Bootstrap

- `src/index.ts`
  Registers plugin lifecycle hooks and initializes `SettingService`, `DocumentService`, `DockService`, `TabService`, and `TopBarService`.

### Backlink Panel UI

- `src/components/panel/backlink-filter-panel-page.svelte`
  Thin panel shell that now wires state, lifecycle, and child components in under 500 lines.
- `src/components/panel/backlink-filter-panel-controls.svelte`
  Filter-panel child component for current-document blocks, related blocks, backlink-document filters, and saved criteria.
- `src/components/panel/backlink-results-panel.svelte`
  Backlink-result child component for header controls, pagination, and the Protyle host list container.
- `src/components/panel/backlink-document-interaction.js`
  Click-action routing and Protyle render option selection.
- `src/components/panel/backlink-document-navigation.js`
  Grouping backlinks by document and cyclic in-document navigation.
- `src/components/panel/backlink-document-row.js`
  Backlink document-row HTML (target section, context control row, navigation state refresh, and DOM event wiring helpers). Breadcrumb construction was extracted to `backlink-breadcrumb.js`.
- `src/components/panel/backlink-breadcrumb.js`
  Breadcrumb subdomain: builds heading-level breadcrumb items from backlink `blockPaths`, collapses long trails, and renders breadcrumb HTML. One-way dependency from `backlink-document-row.js`.
- `src/components/panel/backlink-document-open-target.js`
  Open-area decision helpers: window/tab layout resolution, pre-click open-area resolution, and main-area tab activation.
- `src/components/panel/backlink-opened-document.js`
  Opened-document subdomain: locates already-opened editors via the layout model tree with DOM fallback, activates their tabs, and navigates to blocks without reopening tabs.
- `src/components/panel/backlink-panel-query-params.js`
  Filter-query reset, include/exclude toggling, and saved-criteria restore helpers extracted from the Svelte component.
- `src/components/panel/backlink-panel-controller.js`
  Controller helper that centralizes data loading, Protyle rendering orchestration, document visibility actions, and saved-criteria handlers.
- `src/components/panel/backlink-document-view-state.js`
  Fold/full-view/active-index state helpers for document-level rendering.
- `src/components/panel/backlink-panel-header.js`
  Pagination header view-model and summary text helpers.
- `src/components/panel/backlink-panel-formatting.js`
  Highlight keyword sanitization and aria-label formatting helpers.
- `src/components/panel/backlink-protyle-dom.js`
  DOM-level breadcrumb navigation, list folding/expansion by depth or id set, and Protyle state capture. Source-window visibility trimming was extracted to `backlink-protyle-visibility.js`.
- `src/components/panel/backlink-protyle-visibility.js`
  Source-window visibility subdomain: hides blocks outside the active context window, unfolds ancestors of visible blocks, and trims include/exclude list-item children.
- `src/components/panel/backlink-protyle-rendering.js`
  Protyle render orchestration helpers for state sync, grouped document rendering, and post-create DOM application.
- `src/components/panel/backlink-filter-panel-page.css`
  Shared panel CSS extracted from the Svelte shell so child components can reuse the same presentation.

### Backlink Data Layer

- `src/service/backlink/backlink-data.ts`
  Main orchestration entry for backlink panel data and render data, now reduced below 500 lines and focused on public orchestration only. The fetch-stage dependency wiring is shared by the first-render and turn-page paths via `createBacklinkFetchStageDeps`.
- `src/service/backlink/backlink-def-blocks.js`
  Definition-block sorting and filter-state helpers used by the panel filter UI.
- `src/service/backlink/backlink-document-pagination.js`
  Document-based pagination helper.
- `src/service/backlink/backlink-filtering.js`
  Query cleanup, definition-block filtering, and backlink-document filtering helpers.
- `src/service/backlink/backlink-markdown.js`
  Markdown ref parsing, anchor extraction, and search-syntax helpers shared by backlink data assembly and models.
- `src/service/backlink/backlink-panel-data-assembly.js`
  Assembly helper that composes base-data collectors and builders into the final backlink panel data object.
- `src/service/backlink/backlink-panel-base-data-builder.js`
  Base-data builder helpers for current-document anchor enrichment, related-block materialization, source-document materialization, and backlink-node document attachment.
- `src/service/backlink/backlink-panel-data-collectors.js`
  Collector helpers for backlink blocks, headline child blocks, list-item trees, and parent blocks inside the base-data assembly flow.
- `src/service/backlink/backlink-query-loaders.js`
  Query-preparation and SQL-loading helpers for backlink blocks, child blocks, parent blocks, and related block metadata.
- `src/service/backlink/backlink-render-data.js`
  Cache-backed backlink document loading, backlink-node validation, and render-data sorting helpers.
- `src/service/backlink/backlink-sql.ts`
  SQL builders used by the backlink queries.

### Plugin Hosts

- `src/service/plugin/DocumentService.ts`
  Mounts and destroys the document-bottom panel, and delegates editor-title-icon menu handling to `document-title-icon-menus.js`.
- `src/service/plugin/document-title-icon-menus.js`
  Editor-title-icon menu subdomain: registers the "Backlink Manager" submenu (reset / always-show / always-hide per-document bottom panel) with host-injected refresh and destroy actions.
- `src/service/plugin/TabService.ts`
  Opens the backlink panel in a plugin tab.
- `src/service/plugin/DockServices.ts`
  Creates the dock host.
- `src/service/plugin/backlink-panel-host.js`
  Shared host helper for panel props, scroll cleanup, and panel teardown.
- `src/service/plugin/TopBarService.ts`
  Top-bar entry for opening the backlink panel tab.

### Models

- `src/models/backlink-model.ts`
  Type definitions for backlink panel data and query params. Behavior-bearing classes were extracted to dedicated files and re-exported here so legacy import paths keep working.
- `src/models/list-item-tree-node.ts`
  `ListItemTreeNode`: rebuilds list-item hierarchy from `parentIdPath`, resolves ref-block ids per node, and supports keyword matching plus include/exclude id propagation.
- `src/models/backlink-panel-filter-criteria.ts`
  `BacklinkPanelFilterCriteria`: persisted filter query params plus filter-view expand state.

### Settings

- `src/service/setting/SettingService.ts`
  Runtime setting access and persistence.
- `src/service/setting/setting-config-resolver.js`
  Default-setting resolution and persistence-change checks.
- `src/service/setting/BacklinkPanelFilterCriteriaService.ts`
  Saved criteria and document-level attribute persistence.

## Tests

Current automated tests are in `tests/` and cover:
- build directory resolution
- document click and render interaction helpers
- document grouping and navigation
- document-based pagination
- panel controller-adjacent query-param helpers
- panel header formatting/state helpers
- document view state helpers
- document row helpers and breadcrumb construction
- Protyle DOM helpers and source-window visibility trimming
- Protyle rendering helpers
- opened-document lookup, tab activation, and block navigation
- list-item tree node building, keyword matching, and include/exclude propagation
- backlink filtering helpers
- backlink markdown parsing helpers
- backlink panel base-data builder helpers
- backlink panel data collector helpers
- backlink panel data assembly helpers
- backlink data pipeline and fetch-stage dependency wiring guards
- backlink query-loader helpers
- backlink render-data helpers
- panel host lifecycle helpers
- panel query-parameter helpers
- editor-title-icon menu handlers
- document-bottom host lifecycle and focus-sync guards
- setting config resolution helpers

Run the suite with:

```bash
node --test tests/*.test.js
```

## Notes

- `README.md` and this document were added during the refactor workflow on 2026-03-14.
- The 2026-11-09 refactor extracted `backlink-protyle-visibility.js`, `backlink-breadcrumb.js`, `backlink-opened-document.js`, `list-item-tree-node.ts`, `backlink-panel-filter-criteria.ts`, and `document-title-icon-menus.js` from their larger host modules; deduplicated the fetch-stage dependency wiring in `backlink-data.ts`; fixed internal misspellings in `DocumentService.ts`; and removed dead code (empty `BacklinkService.ts`, commented `console.log` lines). See `docs/refactor-plan.md` for the full log.
- The build currently succeeds, with only the upstream Dart Sass legacy API deprecation warning remaining.
