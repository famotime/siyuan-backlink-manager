# 上下文状态渐进显示规则实施清单

## 1. Project Snapshot

- Generated on: 2026-03-17
- Scope: 反链页签上下文状态规划、正文渲染、说明层模型、交互重算
- Goal: 让实现严格符合 `docs/上下文状态渐进显示规则.md`

## 2. Hard Constraints

后续实现必须同时满足以下硬约束，任何一条不满足都视为未完成：

1. 正文必须直接来自原文块或原文 DOM
2. 正文必须是连续原文区间，只允许裁上下边界，不允许删除中间块
3. 正文显示顺序必须严格等于原文顺序
4. 正文必须原样渲染，不允许用 preview/fragment 重组结果替代
5. `core / nearby / extended / full` 只负责决定区间边界，不负责在区间内部打洞
6. 命中来源、摘要、路径、预算提示属于解释层，不得驱动正文排序或正文裁剪
7. 编辑、拖拽、折叠变化后，保持当前档位不变，并按最新原文重算连续区间

## 3. Architecture and Module Analysis

| Module | Key Files | Current Responsibility | Main Gap | Target State |
| --- | --- | --- | --- | --- |
| 规则基线 | `docs/上下文状态渐进显示规则.md` | 正式规则定义 | 新硬约束刚补入，需要代码与测试同步 | 文档、实现、测试三者一致 |
| 区间规划 | `src/service/backlink/backlink-source-window.js` | 计算 `core/nearby/extended` 窗口和 `contextPlan` | 仍混用“连续窗口”和“稀疏可见块”语义；部分场景边界不符合规则 | 输出单一连续原文区间模型 |
| 正文过滤 | `src/components/panel/backlink-protyle-dom.js` | 基于 `sourceWindow/contextPlan` 隐藏非正文块 | 当前支持区间内 selective visible，可能打洞 | 只隐藏区间外块，区间内连续显示 |
| 正文渲染 | `src/components/panel/backlink-protyle-rendering.js` | 控制展开、折叠、初次渲染 | 扩展态默认全展开，与“连续区间 + 原样渲染”未完全解耦 | 渲染只消费连续区间，不再重排正文 |
| 说明层模型 | `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-context-rules.js` | 命中来源、摘要、预算、过滤辅助 | 旧 sourceType 模型仍带有正文语义残留 | 降级为 explanation/search 辅助层 |
| 预览兼容 | `src/service/backlink/backlink-preview-assembly.js` | 片段预览和兼容逻辑 | 容易与“原文正文主链路”冲突 | 从反链页签正文链路退出 |
| 数据装配 | `src/service/backlink/backlink-data.ts` | 把 planner、bundle、render data 串起来 | 仍同时挂载旧模型与新模型 | 保留 planner 主链，兼容信息边缘化 |
| 交互重算 | `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-document-view-state.js` | 切换层级、切换文档、刷新局部状态 | 编辑/拖拽后的局部重算闭环不完整 | 同档位重算并保持连续原文区间 |

## 4. Prioritized Implementation Backlog

| ID | Priority | Module/Scenario | Files in Scope | Objective | Risk | Pre-Implementation Checklist | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF-CTX-001 | P0 | 连续原文区间模型收口 | `src/service/backlink/backlink-source-window.js`, `tests/backlink-source-window.test.js` | 把 `sourceWindow/contextPlan` 收敛为“连续原文区间”模型；`windowBlockIds` 成为正文唯一范围事实来源 | High | - [x] 新增“区间内不打洞”测试; - [x] 新增“顺序必须等于原文顺序”测试; - [x] 审核所有返回字段的语义 | done |
| RF-CTX-002 | P0 | `nearby` 场景边界重算 | `src/service/backlink/backlink-source-window.js`, `tests/backlink-source-window.test.js` | 分别修正普通块、标题块、列表场景的 `nearby` 连续边界；实现“同父级优先”和标题专用规则 | High | - [x] 普通块同父级优先; - [x] 标题前段落/后正文入口; - [x] 列表邻居只由边界控制，不靠中间隐藏 | done |
| RF-CTX-003 | P0 | `extended` 场景边界重算 | `src/service/backlink/backlink-source-window.js`, `tests/backlink-source-window.test.js` | 修正所属标题节、首个标题前前言区、无标题兜底的连续边界 | High | - [x] 首个标题前普通块; - [x] 首个标题前列表块; - [x] 多级标题下同级/更高级边界; - [x] 无标题列表兜底 | done |
| RF-CTX-004 | P0 | 正文 DOM 过滤不打洞 | `src/components/panel/backlink-protyle-dom.js`, `tests/backlink-protyle-dom.test.js` | 移除区间内 selective visible 逻辑，只保留“隐藏边界外块”能力 | High | - [x] 区间内所有原文块保持连续可见; - [x] 祖先容器仍正确保留; - [x] 不再基于 `visibleBlockIds` 删除中间块 | done |
| RF-CTX-005 | P0 | 正文渲染链路原样化 | `src/components/panel/backlink-protyle-rendering.js`, `tests/backlink-protyle-rendering.test.js` | 让正文渲染只消费连续区间，不再依赖 preview/fragment 语义进行正文裁剪 | Medium | - [x] nearby/extended 不再以内部稀疏可见为前提; - [x] 扩展态展开行为不破坏连续性; - [x] showFullDocument 仍保留全文模式 | done |
| RF-CTX-006 | P1 | explanation/search 与正文分层 | `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-context-rules.js`, `src/components/panel/backlink-document-row.js`, `tests/backlink-context-fragments.test.js` | 让旧 `contextBundle` 仅负责命中来源、摘要、预算、过滤辅助，不再暗示正文结构 | Medium | - [x] 命中来源文案不再冒充正文范围; - [x] summary 顺序与正文顺序隔离; - [x] 旧 sourceType 仅服务 explanation | done |
| RF-CTX-007 | P1 | 预览链路降级退出正文主路径 | `src/service/backlink/backlink-preview-assembly.js`, 相关调用方和测试 | 明确 preview 只用于异常降级或兼容，不参与反链页签正式正文显示 | Medium | - [x] 梳理正文主链是否仍引用 preview; - [x] 异常降级场景显式标记; - [x] 相关隔离测试更新 | done |
| RF-CTX-008 | P1 | 编辑/拖拽后的同档位重算 | `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-document-view-state.js`, `src/service/backlink/backlink-data.ts`, 交互测试 | 建立“保持当前档位 + 按最新原文重算连续区间”的局部刷新闭环 | Medium | - [x] 编辑后重算; - [x] 拖拽后重算; - [x] 文档组局部刷新保留必要状态 | done |
| RF-CTX-009 | P2 | 数据装配去双轨 | `src/service/backlink/backlink-data.ts`, 相关模型与测试 | 减少 `sourceWindow` legacy root 字段和正文链路中的历史兼容分支 | Low | - [x] 正文只读 planner 主链; - [x] legacy 字段仅保底兼容; - [x] 数据结构注释更新 | done |
| RF-CTX-010 | P2 | 文档与测试资产同步 | `docs/上下文状态渐进显示规则.md`, `docs/refactor-plan.md`, `tests/*` | 在规则、计划、测试之间建立一致的验收口径 | Low | - [ ] 文档示例更新; - [ ] 测试命名与规则术语对齐; - [ ] 删除固化旧行为的断言 | pending |

Priority definition:

- `P0`: 直接影响规则正确性，必须先完成
- `P1`: 影响主链收口和交互稳定性，在 P0 后完成
- `P2`: 清理与一致性工作，最后完成

## 5. Detailed Execution Checklist

### Phase 1. 先锁死测试基线

1. 在 `tests/backlink-source-window.test.js` 增加以下规则测试
- 普通块 `nearby` 只取同父级前后块，且结果保持连续原文顺序
- 标题块 `nearby` 取“前一个段落 + 当前标题 + 后一个正文块”
- 列表子块 `nearby` 通过边界得到连续原文，不再依赖中间隐藏
- 普通块位于首个标题前时，`extended` 为前言连续区间
- 列表子块位于首个标题前时，`extended` 仍为前言连续区间，而不是仅顶层列表子树
- 无标题列表 `extended` 使用顶层结构容器连续区间

2. 在 `tests/backlink-protyle-dom.test.js` 增加以下 DOM 约束测试
- 一旦 `windowBlockIds` 确定，区间内部块不允许被隐藏
- `visibleBlockIds` 或 `collapsedBlockIds` 不得再造成中间块消失
- 区间边界内的祖先容器仍保持可见，且顺序不变

3. 在 `tests/backlink-protyle-rendering.test.js` 增加以下渲染测试
- `nearby` 和 `extended` 仅按连续区间裁边界
- 扩展态不依赖 preview 主链
- 全文态仍保持原样渲染，不受 planner 特殊裁剪影响

### Phase 2. 重写 planner 为连续区间模型

1. 在 `backlink-source-window.js` 明确两个概念
- `bodyRange.windowBlockIds`: 正文唯一连续区间
- `orderedVisibleBlockIds`: 如保留，只能等于连续区间本身或用于非正文辅助，不得用于正文打洞

2. 重写 `buildNearbyBacklinkSourceWindow`
- 普通块：先找同父级前后相邻块，再求最小连续边界
- 标题块：单独走标题规则，不再复用普通块线性前后索引
- 列表块：仍以列表壳为锚点，但产出的是连续原文边界，不是稀疏可见项集合

3. 重写 `buildExtendedBacklinkSourceWindow`
- 标题文档内：严格按所属标题节
- 标题块本身：向上扩到“前一个段落所在标题节”，向下扩到当前标题节
- 首个标题前：统一进入前言区连续边界，不因是否在列表内改走无标题兜底
- 仅在整篇无标题时才允许走结构容器兜底

### Phase 3. 移除正文打洞能力

1. 修改 `hideBlocksOutsideBacklinkSourceWindow`
- 只依据连续区间隐藏边界外块
- 删除或降级“区间内显式可见块集合”逻辑
- 保留祖先容器展开和原生结构可见性处理

2. 校正展开逻辑
- 扩展态允许结构展开，但不能以折叠为名删除区间中间块
- 如需保留折叠，只能保留原文原生结构折叠，不改变正文块线性顺序

### Phase 4. 收敛 explanation 与 preview

1. `contextBundle` 改为 explanation/search 层
- 保留 match summary、source label、budget hint
- 移除其对正文 visibility 的暗示性语义

2. `backlink-preview-assembly.js` 改为降级专用
- 梳理调用点
- 确保反链页签正文不再依赖它
- 异常降级 UI 需要显式标注“降级结果”

### Phase 5. 打通交互重算闭环

1. 梳理触发点
- 编辑完成
- 拖拽完成
- 折叠/结构变化完成

2. 建立统一重算入口
- 输入当前文档、当前档位、当前焦点
- 输出新的连续区间 planner
- 局部刷新当前文档组

3. 回归验证
- 当前档位保持不变
- 焦点块仍可定位
- 正文仍连续、顺序仍正确、渲染仍来自原文

## 6. Execution Log

| ID | Start Date | End Date | Test Commands | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| RF-CTX-001 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-source-window.test.js`; `node --test tests/*.test.js` | pass | `contextPlan` 与 `sourceWindow` 的正文主语义已收敛到连续原文区间，`orderedVisibleBlockIds` 与连续窗口保持一致，不再表达正文打洞语义 |
| RF-CTX-002 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-source-window.test.js`; `node --test tests/*.test.js` | pass | `nearby` 已按普通块、标题块、列表场景分别计算连续边界，补上“同父级优先”和“标题 nearby 不回拉前一个标题”规则 |
| RF-CTX-003 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-source-window.test.js`; `node --test tests/*.test.js` | pass | `extended` 已修正为：有标题文档优先标题节或前言区，无标题文档才走结构容器兜底；首个标题前列表块不再错误降级为仅容器子树 |
| RF-CTX-004 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-protyle-dom.test.js`; `node --test tests/backlink-protyle-rendering.test.js`; `node --test tests/*.test.js` | pass | DOM 过滤已改为只隐藏连续区间外块， legacy `visibleBlockIds/collapsedBlockIds` 不再导致正文中间块消失 |
| RF-CTX-005 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-document-interaction.test.js`; `node --test tests/backlink-protyle-rendering.test.js`; `node --test tests/*.test.js` | pass | 正文渲染仍只消费原文 DOM 与 source window 连续区间；无 source window 时只退回原始 backlink DOM，不引入 preview 主链依赖 |
| RF-CTX-006 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-context-fragments.test.js tests/backlink-document-row.test.js tests/backlink-panel-header.test.js`; `node --test tests/*.test.js` | pass | 已新增 explanation-layer helper，UI 不再直接读取 `contextBundle` 内部规则字段拼装说明文案，命中来源与摘要统一经说明层接口输出 |
| RF-CTX-007 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-preview-isolation.test.js`; `node --test tests/backlink-document-interaction.test.js`; `node --test tests/*.test.js` | pass | 生产正文链路继续保持无 preview import；异常降级与隔离测试已同步到“正文只认原文区间”的现状 |
| RF-CTX-008 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-panel-controller-local-refresh.test.js tests/backlink-protyle-rendering.test.js`; `node --test tests/*.test.js` | pass | 当前档位下的 focusout/drop 局部重算链路保持有效，编辑/拖拽后仍按最新 base data + render data 重算连续区间 |
| RF-CTX-009 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-document-navigation.test.js tests/backlink-render-data.test.js`; `node --test tests/*.test.js` | pass | 生产消费者进一步改为通过统一 getter/helper 读取 source window 与排序语义，legacy `sourceWindow/sourceDocumentOrder` 仅保留兼容用途 |
| RF-CTX-010 |  |  |  |  |  |

## 7. Decision and Confirmation

- User approved items:
- Deferred items:
- Blocked items and reasons:

## 8. Next Actions

1. 先执行 `RF-CTX-001` 到 `RF-CTX-004`，把“连续原文区间”做成不可回退的测试基线
2. 再执行 `RF-CTX-005` 到 `RF-CTX-007`，清理正文主链中的 preview 和旧正文语义
3. 最后执行 `RF-CTX-008` 到 `RF-CTX-010`，补齐交互重算与双轨清理
