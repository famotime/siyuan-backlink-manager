# Repository Guidelines

## Project Overview

思源笔记 (SiYuan Note) 反向链接过滤与管理插件。按来源文档组织反向链接，支持多条件过滤与搜索、核心/扩展上下文窗口渲染、预算控制及面包屑导航。支持三大渲染宿主：文档底部 (Document Bottom)、侧边栏 (Dock Panel)、独立页签 (Independent Tab)。

## Tech Stack

- **Framework & Build**: Vite 5, Svelte 4, TypeScript / ES Module, SCSS (Modern API)
- **Host Platform**: SiYuan Kernel API / Protyle Editor
- **Testing**: Node.js 内置测试框架 (`node:test` + `node:assert/strict`)

## Essential Commands

```bash
npm install                     # 安装依赖
npm run dev                     # 开发模式 (Vite watch 实时编译至 dev/)
npm run build                   # 生产打包 (输出 dist/ 并生成 package.zip)
npm run make-link               # 创建 dev/ 到思源插件目录的软链接
npm run make-install            # 编译并安装到思源工作区
node --test tests/*.test.js     # 运行全部回归测试
node --test tests/<name>.test.js # 运行指定测试文件
```

## Project Structure & Architecture

```
src/
├── index.ts                # 插件生命周期入口，注册服务与事件监听
├── config/                 # 环境感知 (EnvConfig) 与缓存管理 (CacheManager)
├── models/ / types/        # 数据模型 (backlink-model, setting-model) 与 TS 类型
├── service/
│   ├── backlink/           # 核心反链数据管线 (SQL加载、数据收集、上下文窗口、过滤、渲染数据组装)
│   ├── plugin/             # 宿主集成服务 (DocumentService, DockServices, TabService, TopBarService)
│   └── setting/            # 设置管理 (SettingService) 与过滤条件持久化
├── components/
│   ├── panel/              # 反链面板 Svelte 组件与交互控制器 (controller, protyle DOM, navigation)
│   ├── dock/               # Dock 栏容器组件
│   └── setting/            # 设置页面与表单项组件
└── utils/                  # API 封装 (api.ts)、DOM 工具、统一日志 (logger.ts)、通用工具
tests/                      # 针对数据管线、上下文预算、控制器与渲染逻辑的完整单测
```

## Core Architecture & Data Pipeline

1. **生命周期**: `index.ts` 依次初始化 `EnvConfig` -> `SettingService` -> `DockService` -> `TabService` -> `TopBarService`，并通过 `DocumentService` 管理文档底部挂载与焦点同步。
2. **反链数据管线 (`src/service/backlink/`)**:
   - `backlink-query-loaders.js` / `backlink-sql.ts`: SQL 查询反链块、子块、兄弟块与层级信息。
   - `backlink-panel-base-data-builder.js` / `backlink-panel-data-collectors.js`: 收集构建基础节点。
   - `backlink-source-window*.js` / `backlink-context*.js`: 上下文窗口调度，按文档真实顺序保持连续文本，区分 Core (核心引用) 与 Extended (扩展上下文) 区域，并应用 Context Budget 预算约束。
   - `backlink-filtering.js` / `backlink-render-data.js`: 执行关键词多词过滤与排序，生成轻量化渲染数据。
3. **UI 与交互 (`src/components/panel/`)**:
   - Svelte 负责结构呈现；控制器 (`backlink-panel-controller*.js`) 处理展开/折叠、面包屑定位与多实例事件转发。
   - Protyle 编辑器交互由 `backlink-protyle-dom.js` 与 `backlink-protyle-rendering.js` 接管。

## Coding & Testing Standards

- **编码风格**: 新增代码优先使用 TypeScript / ESM，缩进保持 4 空格；业务逻辑抽离为小粒度纯函数或独立 helper。
- **注释规范**: 新增与修改的代码注释默认使用【简体中文】，明确说明业务意图与边界条件。
- **测试规范**: 凡涉及数据转换、上下文截取、过滤规则、控制器转发或设置解析等逻辑变更，必须在 `tests/` 中编写或更新 `node:test` 测试用例。
- **日志规范**: 统一使用 `src/utils/logger.ts` 输出调试信息，严禁直接滥用 `console.log`，受插件设置中的日志开关管控。
- **元数据同步**: 变更可见文案或功能时，同步维护 `public/i18n/` 和 `plugin.json`。
