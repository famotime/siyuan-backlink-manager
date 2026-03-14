# 重构计划

## 1. 项目快照

- 生成日期：2026-03-14
- 范围：`siyuan-backlink-manager` 仓库，优先聚焦 `src/components/panel/`、`src/service/backlink/`、`src/service/plugin/`
- 目标：在不改变现有插件行为的前提下，降低反链面板核心代码的耦合度，补足测试切入点，并为后续持续演进建立更清晰的模块边界
- 文档刷新目标：`docs/project-structure.md`、`README.md`
- 当前仓库状态：存在用户未提交改动，后续重构必须限定在获批条目范围内，避免误碰无关文件

## 2. 架构与模块分析

| 模块 | 关键文件 | 当前职责 | 主要痛点 | 测试覆盖情况 |
| --- | --- | --- | --- | --- |
| 入口与生命周期 | `src/index.ts` | 初始化环境、设置、底部面板、Dock、Tab、TopBar 事件 | 启动编排直接依赖多个 service，缺少模块边界说明 | 无直接测试 |
| 反链面板 UI | `src/components/panel/backlink-filter-panel-page.svelte` | 筛选条件、分页、分组渲染、交互事件、Protyle 生命周期、局部状态缓存 | 当前约 2211 行；状态、视图、事件、渲染策略仍然强耦合，要压到 500 行以下必须拆 controller、Protyle DOM helper 与子组件 | 只有少量交互 helper 的单测，组件本体缺少自动化保护 |
| 面板交互 helper | `src/components/panel/backlink-document-interaction.js`、`src/components/panel/backlink-document-navigation.js` | 文档标题点击动作、文档内反链切换、分页进度文本 | 方向正确，但仍只是从大组件中抽出少量逻辑，边界不完整 | 有针对性单测，覆盖较好 |
| 反链数据装配 | `src/service/backlink/backlink-data.ts` | 查询、过滤、排序、分页、缓存命中、渲染数据组装 | 当前约 1019 行；虽已拆出 builder/collector，但仍混合 render-data orchestration、缓存取数、查询准备逻辑，要压到 500 行以下还需继续拆 query/cache helper | 目前已补 builder/collector 单测，但 render-data/cache/query 准备逻辑仍缺少更细颗粒保护 |
| 插件宿主接入 | `src/service/plugin/DocumentService.ts`、`src/service/plugin/TabService.ts`、`src/service/plugin/DockServices.ts` | 在文档底部、Tab、Dock 中挂载 Svelte 面板并处理销毁 | 生命周期逻辑分散且有重复，命名不一致，缺少统一挂载抽象 | 无自动化测试 |
| 设置与持久化 | `src/service/setting/SettingService.ts` | 默认配置、持久化读取、更新保存 | getter 带隐式初始化、副作用混杂、命名拼写不一致 | 无自动化测试 |
| 测试基线 | `tests/*.test.js` | 当前只覆盖 dev build 配置、文档交互 helper、文档分组/分页 helper | 未覆盖 service 层和 Svelte 大组件的核心不变量 | 2026-03-14 基线：`node --test tests/*.test.js` 16/16 通过 |

## 3. 按优先级排序的重构待办

| ID | 优先级 | 模块/场景 | 涉及文件 | 重构目标 | 风险等级 | 重构前测试清单 | 文档影响 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RF-001 | P0 | 反链面板组件拆分 | `src/components/panel/backlink-filter-panel-page.svelte`，必要时新增 `src/components/panel/*` helper/module | 将文档头交互、分页栏、面板状态保存、Protyle 渲染编排从单一 Svelte 文件中拆出，保留现有点击、分页、筛选、展开/折叠行为不变 | 高 | - [x] `node --test tests/*.test.js` 基线通过；- [x] 新增“面板分页栏状态/显示文案/按钮禁用”单测；- [x] 新增“全文模式/折叠模式/文档内切换”回归用例 | `docs/project-structure.md` 需补充分层；`README.md` 需更新反链面板实现结构与测试命令 | done |
| RF-002 | P0 | 反链数据装配与分页拆分 | `src/service/backlink/backlink-data.ts`，必要时新增 `src/service/backlink/*` | 将过滤、排序、文档级分页、缓存拉取、渲染数据装配拆成可测试模块，缩小 `backlink-data.ts` 体积并明确输入输出边界 | 高 | - [x] `node --test tests/*.test.js` 基线通过；- [x] 新增“过滤结果只保留合法反链块”测试；- [x] 新增“排序+文档分页+翻页结果稳定”测试；- [x] 新增“queryParams 清理不破坏行为”测试 | `docs/project-structure.md` 已补充 service 子模块；`README.md` 已更新数据流说明 | done |
| RF-003 | P1 | Dock/Tab/文档底部挂载生命周期统一 | `src/service/plugin/DocumentService.ts`、`src/service/plugin/TabService.ts`、`src/service/plugin/DockServices.ts`、必要时新增 `src/service/plugin/*` | 抽出统一的面板挂载/销毁编排，减少重复的 Svelte 挂载和滚动监听逻辑，统一命名和清理入口 | 中 | - [x] `node --test tests/*.test.js` 基线通过；- [x] 新增“宿主配置转换/挂载参数”单测；- [x] 新增“销毁时清理 editor/panel”单测 | `docs/project-structure.md` 已补充插件宿主层；`README.md` 已更新打开方式与宿主入口说明 | done |
| RF-004 | P2 | 设置服务与类型边界清理 | `src/service/setting/SettingService.ts`、`src/models/backlink-model.ts`、相关 type/import 文件 | 修正 getter 隐式初始化、副作用和拼写问题，改进类型边界，清理当前构建中的类型导入/未使用导入警告 | 中 | - [x] `node --test tests/*.test.js` 基线通过；- [x] 新增“默认配置+持久化 merge”测试；- [x] 新增“更新配置去重保存”测试 | `docs/project-structure.md` 已补充 setting/type 层；`README.md` 已更新配置行为说明 | done |
| RF-005 | P2 | 仓库文档基线补齐 | `docs/project-structure.md`、`README.md` | 在获批重构项完成后，补齐仓库结构文档和顶层说明文档；当前仓库两者均不存在，需新建 | 低 | - [x] 文档刷新前核对最终模块结构；- [x] 核对测试命令、构建命令、主要能力与限制 | 两份文档均已创建并与当前实现一致 | done |
| RF-006 | P1 | 继续缩减反链面板组件与数据服务 | `src/components/panel/backlink-filter-panel-page.svelte`、`src/service/backlink/backlink-data.ts`，必要时新增 `src/components/panel/*`、`src/service/backlink/*` helper | 将筛选条件状态变更、已保存条件应用、定义块排序/筛选等纯逻辑继续从大文件中抽离，降低局部状态写入重复与排序分支复杂度，保持筛选、保存条件、排序、分页和渲染结果行为不变 | 中 | - [x] `node --test tests/backlink-panel-query-params.test.js tests/backlink-def-blocks.test.js tests/backlink-markdown.test.js`；- [x] `node --test tests/*.test.js`；- [x] `npm run build` | `docs/project-structure.md` 已补充新增 helper；`README.md` 已更新 panel/data helper 说明 | done |
| RF-007 | P1 | 继续拆分反链基线数据装配 | `src/service/backlink/backlink-data.ts`，必要时新增 `src/service/backlink/*` helper | 将 `buildBacklinkPanelData` 中的当前文档锚文本回填、关联定义块物化、来源文档物化、文档块回挂等纯装配逻辑拆到独立 builder helper，降低单函数体积并补足核心输出单测 | 中 | - [x] `node --test tests/backlink-panel-base-data-builder.test.js`；- [x] `node --test tests/*.test.js`；- [x] `npm run build` | `docs/project-structure.md` 已补充新增 builder helper；`README.md` 已同步数据层结构说明 | done |
| RF-008 | P1 | 继续拆分反链数据 collector | `src/service/backlink/backlink-data.ts`，必要时新增 `src/service/backlink/*` helper | 将 `buildBacklinkPanelData` 中的反链块初始聚合、标题子块聚合、列表子树聚合、父块聚合拆成 collector helper，进一步压缩单函数并补足输入遍历逻辑单测 | 中 | - [x] `node --test tests/backlink-panel-data-collectors.test.js`；- [x] `node --test tests/*.test.js`；- [x] `npm run build` | `docs/project-structure.md` 已补充新增 collector helper；`README.md` 已同步数据层结构说明 | done |
| RF-009 | P0 | 将 `backlink-data.ts` 压到 500 行以下 | `src/service/backlink/backlink-data.ts`，新增 `src/service/backlink/*` helper | 继续把 render-data orchestration、缓存取数与查询准备逻辑拆离，目标将 `backlink-data.ts` 从约 1019 行压到 500 行以下，同时保持 `getBacklinkPanelData` / `getBacklinkPanelRenderData` / 翻页行为不变 | 高 | - [x] 新增“缓存反链文档取数与排序”单测；- [x] 新增“query helper 输出 SQL/输入清洗”单测；- [x] `node --test tests/*.test.js`；- [x] `npm run build` | `docs/project-structure.md` 已补充 query/cache helper；`README.md` 已同步数据层拆分说明 | done |
| RF-010 | P0 | 拆出反链面板 Protyle 渲染与 DOM 编排 | `src/components/panel/backlink-filter-panel-page.svelte`，新增 `src/components/panel/*` helper | 将 Protyle 渲染、文档行创建、列表折叠/展开、反链内容裁剪等 DOM/渲染逻辑抽到 helper，使主组件只保留状态编排与事件接线 | 高 | - [ ] 新增“文档行创建/导航状态/DOM 折叠”单测；- [ ] 新增“列表项隐藏与全文模式”单测；- [ ] `node --test tests/*.test.js`；- [ ] `npm run build` | `docs/project-structure.md` 需补充 Protyle helper；`README.md` 需同步 panel 结构说明 | pending |
| RF-011 | P0 | 将 `backlink-filter-panel-page.svelte` 压到 500 行以下 | `src/components/panel/backlink-filter-panel-page.svelte`，新增 `src/components/panel/*.svelte` / helper | 在 `RF-010` 基础上继续把筛选区、文档列表区、已保存条件区拆成子组件或 controller helper，目标将主 Svelte 文件从约 2211 行压到 500 行以下，并保持交互行为不变 | 高 | - [ ] 新增“筛选区状态变更/保存条件恢复”集成级单测；- [ ] `node --test tests/*.test.js`；- [ ] `npm run build` | `docs/project-structure.md` 与 `README.md` 均需反映子组件结构 | pending |

优先级说明：
- `P0`：价值和风险都最高，优先执行
- `P1`：价值或风险中等，放在 `P0` 之后
- `P2`：低风险清理项，最后执行

状态说明：
- `pending`
- `in_progress`
- `done`
- `blocked`

## 4. 执行日志

| ID | 开始日期 | 结束日期 | 验证命令 | 结果 | 已刷新文档 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| BASELINE | 2026-03-14 | 2026-03-14 | `node --test tests/*.test.js` | pass | 无 | 当前基线 16/16 通过，尚未开始任何重构 |
| RF-001 | 2026-03-14 | 2026-03-14 | `node --test tests/backlink-panel-header.test.js tests/backlink-panel-formatting.test.js tests/backlink-document-view-state.test.js tests/backlink-document-interaction.test.js`；`node --test tests/*.test.js`；`npm run build` | pass | 暂未刷新 | 新增 `backlink-panel-header.js`、`backlink-panel-formatting.js`、`backlink-document-view-state.js`，并将分页栏摘要、关键词清洗、aria 文案、文档视图状态从大组件抽离；构建仍保留既有类型导入警告 |
| RF-002 | 2026-03-14 | 2026-03-14 | `node --test tests/backlink-filtering.test.js tests/backlink-document-pagination.test.js`；`node --test tests/*.test.js`；`npm run build` | pass | 暂未刷新 | 新增 `backlink-filtering.js` 并将 query 清理、关联定义块过滤、反链文档过滤从 `backlink-data.ts` 中拆出 |
| RF-003 | 2026-03-14 | 2026-03-14 | `node --test tests/backlink-panel-host.test.js`；`node --test tests/*.test.js`；`npm run build` | pass | 暂未刷新 | 新增 `backlink-panel-host.js`，统一宿主挂载参数、scroll gutter cleanup 与 panel 销毁 |
| RF-004 | 2026-03-14 | 2026-03-14 | `node --test tests/setting-config-resolver.test.js`；`node --test tests/*.test.js`；`npm run build` | pass | 暂未刷新 | 新增 `setting-config-resolver.js`，移除 `SettingService` getter 的隐式 `init()` 副作用，并将 Svelte 类型导入改为 `import type`；构建中的类型导入/未使用导入警告已清除 |
| RF-005 | 2026-03-14 | 2026-03-14 | 文档核对；`node --test tests/*.test.js`；`npm run build` | pass | `docs/project-structure.md`、`README.md` | 新建仓库结构文档和顶层 README，内容已对齐当前重构后的模块边界与开发命令 |
| RF-006 | 2026-03-14 | 2026-03-14 | `node --test tests/backlink-panel-query-params.test.js tests/backlink-def-blocks.test.js tests/backlink-markdown.test.js`；`node --test tests/*.test.js`；`npm run build` | pass | `docs/project-structure.md`、`README.md` | 新增 `backlink-panel-query-params.js`、`backlink-def-blocks.js`、`backlink-markdown.js`，将面板筛选条件重置/恢复、定义块排序筛选、markdown 引用解析从大文件中拆出；`backlink-filter-panel-page.svelte` 约从 83.9 KB 缩减到 80.1 KB，`backlink-data.ts` 约从 62.5 KB 缩减到 50.0 KB |
| RF-007 | 2026-03-14 | 2026-03-14 | `node --test tests/backlink-panel-base-data-builder.test.js`；`node --test tests/*.test.js`；`npm run build` | pass | `docs/project-structure.md`、`README.md` | 新增 `backlink-panel-base-data-builder.js` 与对应单测，将当前文档锚文本回填、关联块物化、来源文档物化、文档块回挂从 `buildBacklinkPanelData` 抽离；`backlink-data.ts` 约从 50.0 KB 缩减到 46.0 KB |
| RF-008 | 2026-03-14 | 2026-03-14 | `node --test tests/backlink-panel-data-collectors.test.js`；`node --test tests/*.test.js`；`npm run build` | pass | `docs/project-structure.md`、`README.md` | 新增 `backlink-panel-data-collectors.js` 与对应单测，将 `buildBacklinkPanelData` 内部四段 collector 遍历逻辑抽离；`backlink-data.ts` 约从 46.0 KB 缩减到 40.6 KB |
| RF-009/010/011-PLAN | 2026-03-14 | 2026-03-14 | 行数核对；计划刷新 | done | `docs/refactor-plan.md` | 用户要求将单文件缩减到 500 行以下；初始 `backlink-data.ts` 为 1019 行，`backlink-filter-panel-page.svelte` 为 2211 行，因此拆分为三条获批后执行的 P0 任务 |
| RF-009 | 2026-03-14 | 2026-03-14 | `node --test tests/backlink-render-data.test.js tests/backlink-query-loaders.test.js`；`node --test tests/*.test.js`；`npm run build` | pass | `docs/project-structure.md`、`README.md` | 新增 `backlink-render-data.js`、`backlink-query-loaders.js`、`backlink-panel-data-assembly.js` 与对应单测，将缓存取数、查询准备、render-data 校验/排序与装配接线从 `backlink-data.ts` 抽离；`backlink-data.ts` 已从 1019 行缩减到 459 行 |

## 5. 决策与确认

- 用户批准的条目：`RF-001`、`RF-002`、`RF-003`、`RF-004`、`RF-005`、`RF-006`、`RF-007`、`RF-008`、`RF-009`、`RF-010`、`RF-011`
- 延后的条目：
- 阻塞条目及原因：
- 备注：按技能要求，未获批前不进入任何重构实现

## 6. 文档刷新

- `docs/project-structure.md`：已更新；待 `RF-010`、`RF-011` 完成后继续同步 panel 子组件结构
- `README.md`：已更新；待 `RF-010`、`RF-011` 完成后继续同步面板层结构说明
- 最终同步检查：待 `RF-010`、`RF-011` 完成后重新执行

## 7. 下一步

1. 继续执行 `RF-010`、`RF-011`，分两步把 `backlink-filter-panel-page.svelte` 压到 500 行以下。
2. 每完成一项都重新跑 `node --test tests/*.test.js` 与 `npm run build`，并同步文档。
3. 两项完成后再做最终结构复核与提交。
