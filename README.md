# siyuan-backlink-manager

SiYuan plugin for browsing backlinks with filtering, document grouping, dock/tab hosts, and document-bottom rendering.

## Current Capabilities

- Filter backlinks by related definition blocks, source documents, sort rules, and keywords.
- Group backlinks by source document and switch between backlinks inside the same document.
- Render the panel in three hosts:
  - document bottom area
  - plugin tab
  - dock
- Expand a source document into full-document mode from the backlink panel.
- Page backlink results by unique source document count.
- Persist plugin settings and saved filter criteria.

## Development

Requirements:
- Node.js
- SiYuan plugin development environment

Install dependencies:

```bash
npm install
```

Useful commands:

```bash
npm run dev
npm run build
npm run make-link
npm run make-install
node --test tests/*.test.js
```

## Project Layout

- `src/index.ts`: plugin bootstrap
- `src/components/panel/`: backlink panel UI and extracted UI helpers
- `src/service/backlink/`: backlink query, filtering, pagination, render-data assembly
- `src/service/plugin/`: document/tab/dock host integration
- `src/service/setting/`: setting persistence and criteria services
- `tests/`: node-based regression tests
- `docs/project-structure.md`: detailed structure and responsibility map

## Status

Refactor baseline on 2026-03-14:
- `node --test tests/*.test.js` passes
- `npm run build` succeeds

Known build note:
- Dart Sass still emits the legacy JS API deprecation warning during build.
