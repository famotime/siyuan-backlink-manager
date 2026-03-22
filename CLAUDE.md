# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SiYuan Note plugin that provides a filterable backlink panel. It organizes backlinks by source document and supports multiple filtering criteria (definition blocks, source documents, keywords, sorting). The plugin can display backlinks in three locations: document bottom, dock panel, or independent tab.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Production build (outputs to dist/ and creates package.zip)
npm run build

# Create symbolic link to SiYuan plugin directory for development
npm run make-link

# Build and install to SiYuan workspace
npm run make-install

# Run all tests
node --test tests/*.test.js

# Run specific test file
node --test tests/backlink-panel-query-params.test.js
```

## Development Setup

1. Configure `.env` file with your SiYuan workspace path:
   ```
   VITE_SIYUAN_WORKSPACE_PATH=D:/your-siyuan-workspace
   ```

2. Use `npm run make-link` to create a symbolic link from `dev/` to your SiYuan plugins directory for live development

3. The build system uses Vite with:
   - Svelte for UI components
   - TypeScript/JavaScript mixed codebase
   - SCSS for styling
   - Watch mode outputs to `dev/` with livereload
   - Production mode outputs to `dist/` with zip packaging

## Architecture

### Plugin Lifecycle (src/index.ts)

Entry point that initializes services in order:
1. `EnvConfig` - Environment and plugin instance
2. `SettingService` - User settings and saved filter criteria
3. `DocumentService` - Document-level backlink panel management
4. `DockService` - Dock panel integration
5. `TabService` - Independent tab management
6. `TopBarService` - Top bar button

### Core Data Flow

**Backlink data pipeline** (`src/service/backlink/`):

1. **Query preparation** (`backlink-query-loaders.js`) - Loads raw backlink blocks, parent blocks, sibling blocks, headline children, list item children from SQL
2. **Base data building** (`backlink-panel-base-data-builder.js`) - Materializes documents, definition blocks, anchor texts, creates `IBacklinkBlockNode` structures
3. **Data collection** (`backlink-panel-data-collectors.js`) - Collects backlink blocks, headline children, list item subtrees, parent blocks, sibling blocks
4. **Context assembly** (`backlink-context.js`, `backlink-context-budget.js`) - Applies context visibility rules and budget constraints
5. **Source window** (`backlink-source-window.js`) - Attaches ordered context blocks around each backlink
6. **Data assembly** (`backlink-panel-data-assembly.js`) - Assembles final `IBacklinkFilterPanelData`
7. **Filtering** (`backlink-filtering.js`) - Applies user filter criteria
8. **Pagination** (`backlink-document-pagination.js`) - Paginates by source document
9. **Render data** (`backlink-render-data.js`) - Validates and prepares `IBacklinkPanelRenderData` for UI

**Main orchestrator**: `src/service/backlink/backlink-data.ts` (now under 500 lines after refactoring)

### UI Components (src/components/)

**Panel structure** (Svelte):
- `backlink-filter-panel-page.svelte` - Main container (291 lines), state management and lifecycle
- `backlink-filter-panel-controls.svelte` - Filter controls UI
- `backlink-results-panel.svelte` - Results display area
- `backlink-filter-panel-page.css` - Shared panel styles

**Panel controllers** (JavaScript):
- `backlink-panel-controller.js` - Main interaction logic
- `backlink-panel-query-params.js` - Filter condition reset, include/exclude toggle, saved criteria restoration
- `backlink-document-row.js` - Document row creation and list collapse/expand
- `backlink-protyle-dom.js` - Backlink trimming and Protyle DOM manipulation
- `backlink-protyle-rendering.js` - Protyle post-creation processing

### Key Modules

**SQL queries** (`src/service/backlink/backlink-sql.ts`) - Generates SQL for fetching blocks, definition blocks, backlinks, siblings, list items

**Markdown processing** (`src/service/backlink/backlink-markdown.js`) - Parses markdown references, extracts anchor text, handles search syntax

**Definition blocks** (`src/service/backlink/backlink-def-blocks.js`) - Sorts and filters definition blocks

**Settings** (`src/service/setting/`) - Manages plugin settings and saved filter criteria

## Code Organization Principles

The codebase follows a strict separation of concerns after recent refactoring:

- **Service layer** handles data fetching, transformation, and business logic
- **Component layer** handles UI rendering and user interaction
- **Utility layer** provides reusable helpers
- Large files (>500 lines) have been systematically decomposed into focused modules
- Each module has corresponding test coverage in `tests/`

## Testing

Tests use Node.js built-in test runner. All test files follow the pattern `tests/*.test.js` and test corresponding modules in `src/`.

Key test areas:
- Data pipeline stages (query loaders, base data builder, collectors, assembly)
- Filtering and pagination logic
- Context budget and visibility rules
- UI controller forwarding and state management
- Protyle DOM manipulation and rendering

## Important Notes

- The plugin uses SiYuan's `Protyle` editor component for rendering backlink content
- Backlink context display supports configurable budget constraints to limit context block count
- The codebase mixes TypeScript (`.ts`) and JavaScript (`.js`) - new service logic uses `.js` for easier testing
- Definition blocks are special blocks that define terms/concepts and are used for filtering
- The plugin supports both desktop and mobile SiYuan environments

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills:
- `/plan-ceo-review` - CEO/founder-mode plan review
- `/plan-eng-review` - Engineering plan review
- `/plan-design-review` - Designer's eye plan review
- `/design-consultation` - Design system creation
- `/review` - Pre-landing PR code review
- `/ship` - Ship workflow (test, review, PR)
- `/browse` - Headless browser for web browsing and QA
- `/qa` - QA test and fix bugs
- `/qa-only` - QA report only (no fixes)
- `/qa-design-review` - Visual design audit
- `/setup-browser-cookies` - Import browser cookies for authenticated testing
- `/retro` - Weekly engineering retrospective
- `/document-release` - Post-ship documentation update
