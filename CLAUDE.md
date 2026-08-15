# CLAUDE.md

SiYuan Note Plugin: Filterable Backlink Panel (思源笔记反向链接管理插件)

## Quick Start & Essential Commands

```bash
npm install                     # 安装依赖
npm run dev                     # 开发监听构建 (输出至 dev/)
npm run build                   # 生产打包 (输出 dist/ 并生成 package.zip)
npm run make-link               # 建立 dev/ 到思源插件目录的软链接
npm run make-install            # 编译并复制到思源插件工作区
node --test tests/*.test.js     # 运行全部测试 (Node.js 内置 test runner)
node --test tests/<name>.test.js # 运行指定单测文件
```

`.env` 配置文件需设置 `VITE_SIYUAN_WORKSPACE_PATH`（指向本地思源工作区路径）。

## Architecture Overview

### 1. Service Layer & Lifecycle (`src/index.ts`)
- **Plugin Lifecycle**: `index.ts` 统一管理生命周期与事件监听（如 `switch-protyle`, `loaded-protyle-static`）。
- **Core Host Services** (`src/service/plugin/`):
  - `DocumentService.ts`: 文档底部反链区域管理、Protyle 挂载与焦点位置同步。
  - `DockServices.ts`: 侧边栏 Dock 面板容器。
  - `TabService.ts`: 独立 Tab 页签承载。
  - `TopBarService.ts`: 顶栏图标入口。
- **Settings** (`src/service/setting/`):
  - `SettingService.ts`: 插件全局配置读写、变更发布订阅。
  - `BacklinkPanelFilterCriteriaService.ts`: 过滤与排序偏好持久化。

### 2. Backlink Data Pipeline (`src/service/backlink/`)
- **SQL & Data Loading** (`backlink-sql.ts`, `backlink-query-loaders.js`): 从思源 SQLite 检索反链引用块、层级结构与兄弟/子孙块数据。
- **Base Builder & Collectors** (`backlink-panel-base-data-builder.js`, `backlink-panel-data-collectors.js`): 规范化文档节点与反链块结构。
- **Source Window & Context** (`backlink-source-window*.js`, `backlink-context*.js`, `backlink-context-budget.js`):
  - 核心管线：按源文档真实顺序（Block Index / Kramdown 顺序）组织上下文块。
  - 分区渲染：区分 Core（核心命中块）与 Extended（扩展上下文），保证连续文本不截断。
  - 预算约束：基于 `Context Budget` 控制最大上下文块数量。
- **Filtering & Render Data** (`backlink-filtering.js`, `backlink-render-data.js`, `backlink-data.ts`):
  - 关键字多词匹配、逻辑过滤、排序与最终 UI 渲染数据生成。

### 3. UI Layer & Controllers (`src/components/`)
- **Svelte Views**:
  - `panel/backlink-filter-panel-page.svelte`: 主面板骨架与生命周期。
  - `panel/backlink-results-panel.svelte`: 结果列表、面包屑导航与块容器。
  - `dock/backlink-filter-panel-dock.svelte`: 侧边栏宿主视图。
  - `setting/setting-page.svelte`: 设置弹窗。
- **Controllers & DOM** (`src/components/panel/`):
  - `backlink-panel-controller*.js`: 面板事件委派、折叠/展开、刷新与跨实例导航。
  - `backlink-protyle-dom.js` / `backlink-protyle-rendering.js`: 思源 Protyle 编辑器实例的生命周期、DOM 剪裁与渲染后处理。

## Key Development Rules & Guidelines

1. **模块化与轻量化**: 保持单一职责，避免巨型单文件，复杂交互按 Controller / Helper 细分并提供测试。
2. **测试优先**: 业务逻辑与数据管线全面使用 `node:test` + `assert/strict` 进行单测验证（单测位于 `tests/*.test.js`）。
3. **语言与注释**: 交流与新增/修改的代码注释使用【简体中文】。
4. **日志规范**: 使用 `src/utils/logger.ts`，受插件设置中调试日志开关统一控制，禁止随意使用 `console.log`。
5. **多语言与配置**: UI 文本及设置项变动需同步更新 `public/i18n/` 及 `plugin.json`。
