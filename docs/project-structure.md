# Project Structure

## Overview

`siyuan-backlink-manager` is a SiYuan plugin focused on filtered backlink browsing across three hosts:
- document bottom panel
- plugin tab
- dock panel

After the refactor on 2026-03-14, the codebase is organized around four layers:
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
  The main backlink panel component. It still owns UI orchestration, but pure logic has been extracted into helper modules.
- `src/components/panel/backlink-document-interaction.js`
  Click-action routing and Protyle render option selection.
- `src/components/panel/backlink-document-navigation.js`
  Grouping backlinks by document and cyclic in-document navigation.
- `src/components/panel/backlink-panel-query-params.js`
  Filter-query reset, include/exclude toggling, and saved-criteria restore helpers extracted from the Svelte component.
- `src/components/panel/backlink-document-view-state.js`
  Fold/full-view/active-index state helpers for document-level rendering.
- `src/components/panel/backlink-panel-header.js`
  Pagination header view-model and summary text helpers.
- `src/components/panel/backlink-panel-formatting.js`
  Highlight keyword sanitization and aria-label formatting helpers.

### Backlink Data Layer

- `src/service/backlink/backlink-data.ts`
  Main orchestration entry for backlink panel data and render data, now focused on query flow, pagination, cache fetch, and base-data assembly.
- `src/service/backlink/backlink-def-blocks.js`
  Definition-block sorting and filter-state helpers used by the panel filter UI.
- `src/service/backlink/backlink-document-pagination.js`
  Document-based pagination helper.
- `src/service/backlink/backlink-filtering.js`
  Query cleanup, definition-block filtering, and backlink-document filtering helpers.
- `src/service/backlink/backlink-markdown.js`
  Markdown ref parsing, anchor extraction, and search-syntax helpers shared by backlink data assembly and models.
- `src/service/backlink/backlink-sql.ts`
  SQL builders used by the backlink queries.

### Plugin Hosts

- `src/service/plugin/DocumentService.ts`
  Mounts and destroys the document-bottom panel.
- `src/service/plugin/TabService.ts`
  Opens the backlink panel in a plugin tab.
- `src/service/plugin/DockServices.ts`
  Creates the dock host.
- `src/service/plugin/backlink-panel-host.js`
  Shared host helper for panel props, scroll cleanup, and panel teardown.
- `src/service/plugin/TopBarService.ts`
  Top-bar entry for opening the backlink panel tab.

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
- panel header formatting/state helpers
- document view state helpers
- backlink filtering helpers
- backlink markdown parsing helpers
- panel host lifecycle helpers
- panel query-parameter helpers
- setting config resolution helpers

Run the suite with:

```bash
node --test tests/*.test.js
```

## Notes

- `README.md` and this document were added during the refactor workflow on 2026-03-14.
- The build currently succeeds, with only the upstream Dart Sass legacy API deprecation warning remaining.
