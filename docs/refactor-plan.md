# 重构计划

## 1. 项目快照

- 生成日期：2026-11-09
- 范围：siyuan-backlink-manager 全仓（src/ 约 16000 行，58 个测试文件，380 个用例）
- 目标：消除核心数据管线的重复装配、拆分 4 个超过 500 行的多职责面板/服务文件、清理死代码与拼写缺陷；全程保持行为不变，以 `node --test` 为验收门槛
- 文档刷新目标：`docs/project-structure.md`、`README.md`
- 基线验证：`node --test tests/*.test.js` → **380 pass / 0 fail**（2026-11-09）

## 2. 架构与模块分析

| 模块 | 关键文件 | 当前职责 | 主要痛点 | 测试覆盖情况 |
| --- | --- | --- | --- | --- |
| 插件入口与生命周期 | `src/index.ts`、`src/service/plugin/*` | 服务注册、文档底部/Dock/页签挂载、焦点同步 | `DocumentService.ts`（383 行）混合挂载、销毁、标题图标菜单、padding 轮询四种职责；内部标识符拼写错误（`hadnleClickEditorTitleIcon`、`destory*`、`docuemntContentElement`） | `document-service-*`、`document-protyle-guard`、`dock-*` 共 5 个测试文件（含源码文本断言） |
| 面板控制器 | `src/components/panel/backlink-panel-controller*.js`（主文件 751 行 + 12 个子模块） | 面板状态、事件转发、展开/折叠、导航、多实例协调 | 已充分拆分，主文件剩余主体为闭包状态组装，进一步拆分边际价值低 → 不列入本轮 | 13 个 controller 测试文件，覆盖良好 |
| 核心数据管线 | `src/service/backlink/backlink-data.ts`（501 行） | 组装渲染数据、翻页、基础数据加载 | `getBacklinkPanelRenderData` 与 `getTurnPageBacklinkPanelRenderData` 中 `buildBacklinkFetchStageResult` 的 deps 装配 **约 60 行完全重复 ×2**，双处修改易漏 | `backlink-data-pipeline`、`backlink-data-fetch-stage`（后者对本文件做源码文本断言） |
| Protyle DOM 操作 | `src/components/panel/backlink-protyle-dom.js`（514 行） | 面包屑跳转、列表折叠/展开、源窗口可见性裁剪 | `hideOtherListItemElement` + `hideBlocksOutsideBacklinkSourceWindow` + 5 个 collect/unfold 私有辅助（约 300 行）构成内聚的"可见性裁剪"子域，与折叠/展开操作混杂 | `backlink-protyle-dom`（16 用例）、`backlink-protyle-rendering`、`backlink-panel-controller-composition` 直接 import 旧路径 |
| 文档行渲染 | `src/components/panel/backlink-document-row.js`（650 行） | Target 区域 HTML、面包屑构建、列表项元素、上下文控制行 | 四类职责混在一个文件；`updateBacklinkTargetSection` 单函数 187 行 | `backlink-document-row`、`backlink-breadcrumb-navigation`、`backlink-target-block` |
| 打开目标解析 | `src/components/panel/backlink-document-open-target.js`（602 行） | wnd/tab 布局解析、打开区域决策、调试快照、已打开文档查找/激活/导航 | "已打开文档查找与激活"子域（`findOpenedDocumentInfo` 等 4 个导出，约 230 行）可独立 | `backlink-document-open-target`（19 用例） |
| 数据模型 | `src/models/backlink-model.ts`（436 行） | 接口定义 + `ListItemTreeNode` 类（约 200 行）+ `BacklinkPanelFilterCriteria` 类 | 带行为的类与纯接口混杂；有测试对本文件做源码文本断言，需同步 | `backlink-target-block` 等 |
| API 封装 | `src/utils/api.ts`（564 行） | 思源内核 API 包装 | 大部分为官方 API 模板惯用结构 → 不列入本轮；`any` 共 54 处，多在类型边界，随迭代渐进收紧 | — |
| 死代码 | `BacklinkService.ts`（0 字节空文件）、`DocumentService.ts`/`TabService.ts`/`api.ts` 内注释掉的 `console.log` | — | 空文件与注释死代码 | — |

## 3. 按优先级排序的重构待办

| ID | 优先级 | 模块/场景 | 涉及文件 | 重构目标 | 风险等级 | 重构前测试清单 | 文档影响 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RF-001 | P0 | 数据管线 deps 装配去重 | `src/service/backlink/backlink-data.ts`、`tests/backlink-data-fetch-stage.test.js` | 抽取共享工厂 `createBacklinkFetchStageDeps(rootId, nodes)`，`getBacklinkPanelRenderData` 与 `getTurnPageBacklinkPanelRenderData` 复用同一装配，删除约 60 行重复 | 中 | - [x] 新增去重守护测试（deps 装配各关键接线仅出现一次、两条路径均复用工厂）；- [x] `backlink-data-fetch-stage` / `backlink-data-pipeline` 全部通过 | `docs/project-structure.md`：backlink-data.ts 职责描述更新 | done |
| RF-002 | P0 | 源窗口可见性裁剪独立模块 | `src/components/panel/backlink-protyle-dom.js` → 新增 `backlink-protyle-visibility.js`，更新 `backlink-panel-controller.js` 引用 | 将 `hideOtherListItemElement`、`hideBlocksOutsideBacklinkSourceWindow` 及 4 个 collect/unfold 辅助迁出（`getProtyleWysiwygElement` 由 protyle-dom 导出共享）；为避免循环依赖，未采用 re-export，直接更新唯一源引用方 controller | 中低 | - [x] 新增 `tests/backlink-protyle-visibility.test.js`（14 个行为用例迁移 + 1 个 getter 语义守护）；- [x] `backlink-preview-isolation` 守护断言同步指向新模块；- [x] 定向 39/39、全量 382/382 通过 | `docs/project-structure.md`：panel 组件文件清单更新 | done |
| RF-003 | P1 | 文档行渲染按职责拆分 | `src/components/panel/backlink-document-row.js` → 新增 `backlink-breadcrumb.js` | 迁出面包屑子域（`buildBacklinkBreadcrumbItems` 及 8 个辅助、`collapseBacklinkBreadcrumbItems`、`buildBacklinkBreadcrumbFullPath`、`buildBacklinkBreadcrumbItemsHtml`），原文件保留 Target 区域、上下文控制行与列表项构建；直接更新引用方（row 模块 + tooltip-icon 测试） | 中低 | - [x] 新增 `tests/backlink-breadcrumb.test.js`（3 个行为用例迁移 + 1 个单向依赖守护用例）；- [x] `backlink-document-row` / `backlink-tooltip-icon` 通过；- [x] 全量 383/383 通过、`pnpm run build` 通过 | `docs/project-structure.md`：panel 组件文件清单更新 | done |
| RF-004 | P1 | 已打开文档查找与激活独立模块 | `src/components/panel/backlink-document-open-target.js` → 新增 `backlink-opened-document.js`，更新 controller 引用 | 迁出 `findOpenedDocumentInfo`、`findOpenedDocumentEditorElement`、`activateOpenedDocumentTab`、`navigateToOpenedDocumentBlock`（约 270 行），原文件保留打开区域决策与 wnd 解析 | 中低 | - [x] 新增 `tests/backlink-opened-document.test.js` 12 个行为用例（原子域零覆盖，按测试先行补齐：model 树检索、DOM 回退、switchTab/tabHead 激活、文档根滚动、protyle.scroll 高亮、虚拟块 openTab 复用）；- [x] `backlink-target-block.test.js` 导入同步；- [x] 全量 395/395、`pnpm run build` 通过 | `docs/project-structure.md`：panel 组件文件清单更新 | done |
| RF-005 | P1 | 模型文件逻辑类外迁 | `src/models/backlink-model.ts` → 新增 `src/models/list-item-tree-node.ts`、`src/models/backlink-panel-filter-criteria.ts` | `ListItemTreeNode`（约 200 行）与 `BacklinkPanelFilterCriteria` 迁出，`backlink-model.ts` 保留类型定义并 re-export 类（436→232 行），外部 import 路径不变 | 中低 | - [x] 新增 `tests/backlink-list-item-tree-node.test.js` 8 个用例（原子类零覆盖：buildTree/existsKeywords/getFilterMarkdown/getFilterDefBlockIds/resetInclude/resetExclude/re-export 守护）；- [x] `backlink-preview-isolation` 对 model 的负向断言不受影响；- [x] 全量 403/403、`pnpm run build` 通过 | `docs/project-structure.md`：models 目录说明更新 | done |
| RF-006 | P2 | DocumentService 图标菜单拆分 + 拼写修正 | `src/service/plugin/DocumentService.ts` → 新增 `document-title-icon-menus.js`；`document-backlink-host-lifecycle.js`、`index.ts` 联动改名 | 标题图标菜单按既有注入模式迁出为工厂（含设置读取与面板刷新/销毁的依赖注入）；拼写修正：`hadnle*`→`handle*`、`destory*`→`destroy*`（含公共方法 `destroy()` 与 index.ts 调用方）、`docuemntContentElement`→`documentContentElement`（含 lifecycle 模块参数）；清理 2 个失效导入 | 中低 | - [x] 新增 `tests/document-title-icon-menus.test.js` 5 个用例（菜单结构、rootID 缺失、恢复默认双分支、始终显示/隐藏、拼写守护）；- [x] 两个守护测试正则随拼写修正同步；- [x] 全量 408/408、`pnpm run build` 通过 | `docs/project-structure.md`：plugin 服务文件清单更新 | done |
| RF-007 | P2 | 死代码清理 | 删除 `src/service/backlink/BacklinkService.ts`（0 字节）；清理 `DocumentService.ts`、`TabService.ts`、`api.ts` 中注释掉的 `console.log` 死代码（共 9 行） | 删除空文件与注释死代码，不改变任何行为 | 低 | - [x] 删除前 grep 确认 `BacklinkService` 全仓零引用；- [x] 全量 408/408、`pnpm run build` 通过 | `README.md`/`docs/project-structure.md`：如文件清单提及则同步 | done |

优先级说明：
- `P0`：价值和风险都最高，优先执行（核心数据管线 + 高频 DOM 路径）
- `P1`：价值或风险中等，放在 `P0` 之后
- `P2`：低风险清理项，最后执行

状态说明：
- `pending`
- `in_progress`
- `done`
- `blocked`

明确不列入本轮的项（避免与计划无关的改动）：
- `backlink-panel-controller.js`（751 行）：已拆分为 12+ 子模块，剩余主体为闭包状态组装，进一步拆分边际价值低
- `utils/api.ts` 结构性重写：官方 API 模板惯用结构，收益低于风险
- JS → TS 全量迁移：遵循 AGENTS.md"新增代码优先 TS"渐进推进，不做一次性迁移
- 54 处 `any` 类型收紧：分布在类型边界，随功能迭代处理

## 4. 执行日志

| ID | 开始日期 | 结束日期 | 验证命令 | 结果 | 已刷新文档 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| RF-001 | 2026-11-09 | 2026-11-09 | `node --test tests/backlink-data-fetch-stage.test.js tests/backlink-data-pipeline.test.js`（6/6 pass）；全量 `node --test tests/*.test.js`（381/381 pass）；`pnpm run build` 通过；`tsc --noEmit` 错误总数 77→77（既有问题，无新增） | pass | 文档刷新延后至全部条目完成 | 文件 501→457 行；tsc 既有 3 处 backlink-data.ts 报错源自无类型 .js 模块签名，与本次改动无关 |
| RF-002 | 2026-11-09 | 2026-11-09 | 定向 39/39 pass；全量 382/382 pass（新增 1 个 getter 守护用例）；`pnpm run build` 通过 | pass | 文档刷新延后至全部条目完成 | protyle-dom 514→224 行；计划中的 re-export 兼容改为直接更新引用方（避免 protyle-dom ↔ visibility 循环依赖）；死函数 `collectVisibleBlockIdsWithDescendants`（全仓零引用）随迁移移除 |
| RF-003 | 2026-11-09 | 2026-11-09 | 定向 18/18 pass；全量 383/383 pass（新增 1 个依赖守护用例）；`pnpm run build` 通过 | pass | 文档刷新延后至全部条目完成 | document-row 650→456 行、新增 breadcrumb 205 行；修正迁移脚本一处常量边界错误（BACKLINK_DOCUMENT_TITLE_TOOLTIP 归属 row 模块，已在迁移后核验并归位）；计划中的 re-export 兼容改为直接更新引用方 |
| RF-004 | 2026-11-09 | 2026-11-09 | 新增用例 12/12 pass；全量 395/395 pass；`pnpm run build` 通过 | pass | 文档刷新延后至全部条目完成 | open-target 602→328 行、新增 opened-document 274 行；发现 `backlink-target-block.test.js` 亦引用被迁函数（初期引用扫描只查了 src/），已同步导入；测试中打桩 MouseEvent 与 setTimeout 以覆盖浏览器 API 分支 |
| RF-005 | 2026-11-09 | 2026-11-09 | 新增用例 8/8 pass；全量 403/403 pass；`pnpm run build` 通过 | pass | 文档刷新延后至全部条目完成 | 新模块需被 node:test 直跑，导入改为带扩展名相对路径（无 @/ 别名）；顺带给 `string-util.ts` 的无扩展名导入补 `.ts`；两处测试断言语义按真实行为修正（空 include 数组=不过滤而非全排除） |
| RF-006 | 2026-11-09 | 2026-11-09 | 新增用例 5/5 pass；全量 408/408 pass；`pnpm run build` 通过 | pass | 文档刷新延后至全部条目完成 | DocumentService 383→340 行、新增 title-icon-menus 61 行；图标改为字面量注入避免模块导入 TS 单例（值与 CUSTOM_ICON_MAP 一致并有测试锚定）；rootId 缺失时仍注册空 submenu 入口为历史行为，测试按真实行为锚定 |
| RF-007 | 2026-11-09 | 2026-11-09 | grep 零引用确认；全量 408/408 pass；`pnpm run build` 通过 | pass | `docs/project-structure.md`（已刷新）；`README.md`（确认无需改动） | 仅删除空文件与注释 console.log 行，无行为变更 |

## 5. 决策与确认

- 用户批准的条目：RF-001 ~ RF-007 全部（2026-11-09）
- 延后的条目：无
- 阻塞条目及原因：无

## 6. 文档刷新

- `docs/project-structure.md`：已刷新（2026-11-09）——补充 6 个新模块的职责描述（visibility/breadcrumb/opened-document/list-item-tree-node/filter-criteria/title-icon-menus）、更新 backlink-data.ts 与 DocumentService.ts 职责、新增 Models 小节、同步测试覆盖主题与重构说明
- `README.md`：无需改动——README 为面向用户的产品叙事（无开发命令/模块结构章节），本轮重构为行为不变变更，用户可见能力无变化
- 最终同步检查：全量测试 408/408 通过、`pnpm run build` 通过（含产物校验）

## 7. 下一步

1. （已完成）按 RF-001 → RF-007 顺序逐项执行，每项先补测试再重构，完成后同步本计划状态
2. 后续可选：`backlink-panel-controller.js`（751 行）如继续演进可再抽离；`utils/api.ts` 的 `any` 类型随功能迭代渐进收紧
3. 建议将本次重构条目摘要补录到 `CHANGELOG.md` 的开发备注中（如发版需要）
