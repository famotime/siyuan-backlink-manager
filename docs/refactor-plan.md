# 上下文状态渐进显示规则对齐计划

## 1. Project Snapshot

- Generated on: 2026-03-17
- Scope: 反链面板上下文状态规划、渲染、交互状态
- Goal: 对齐 `docs/上下文状态渐进显示规则.md`，输出当前实现状态下的剩余开发计划与执行指引
- Rule baseline:
  - 正文必须按原文块显示和渲染，不能用拼接预览替代原文正文
  - 四层正文范围是 `核心 / 近邻 / 扩展 / 全文`
  - 定位信息与正文范围分开计算
  - 编辑/拖拽后应按最新数据重算范围；“焦点保持”仅要求用于反链页签内容切换上下文状态的场景

## 1.1 Final-Effect Priorities

后续工作只按最终用户效果排序，不再围绕局部实现细节单独优化。优先级如下：

1. 四层正文范围正确
   - `核心 / 近邻 / 扩展 / 全文` 的实际可见结果必须符合正式规则
   - 列表、标题、普通块、无标题兜底都以规则文档为准
2. 编辑/拖拽后结果正确
   - 保持当前档位不变
   - 以最新数据重新计算范围
   - 不额外承诺原焦点在拖拽后仍留在当前文档或当前面板
3. 正文顺序与原文一致
   - 单条反链正文块顺序只接受文档真实顺序
   - 说明层、预览层、预算层都不能改变正文顺序
4. 正文与辅助信息分层清晰
   - 正文始终按原文渲染
   - 命中来源、标题路径、列表路径、文档名属于解释层，不冒充正文

只有上述四类效果全部达标后，才继续处理更细的性能、事件精度或兼容清理。

## 1.2 Deferred Optimizations

在最终效果未达标前，以下事项统一降级为后置优化，不单独抢占优先级：

- 是否把 `focusout/drop` 替换为更精确的宿主事件
- 局部刷新是否还能进一步减少无效重算
- legacy getter / root 字段的进一步清理方式
- 非关键的实现去重、命名收口和内部结构美化

## 2. Architecture and Module Analysis

| Module | Key Files | Current Responsibility | Main Pain Points | Test Coverage Status |
| --- | --- | --- | --- | --- |
| 规则基线 | `docs/上下文状态渐进显示规则.md` | 定义四层范围、线性顺序、结构壳、交互补充规则 | 规则文档已稳定，但执行计划与实现进度曾出现漂移，需要持续同步 | 有规则文档，无自动校验 |
| 正文范围规划 | `src/service/backlink/backlink-source-window.js` | 产出 `core / nearby / extended` 窗口、`contextPlan`、可见块与折叠块 | `contextPlan` 已进入主路径，但 legacy root 字段仍存在兼容映射，统一 planner 还未彻底收口 | `tests/backlink-source-window.test.js` 覆盖较多 |
| 正文渲染与过滤 | `src/components/panel/backlink-document-interaction.js`, `src/components/panel/backlink-protyle-rendering.js`, `src/components/panel/backlink-protyle-dom.js` | 按原文窗口渲染正文，并根据 `contextPlan` 过滤/折叠块 | 正文主路径已切回原文，但编辑/拖拽后的局部重算闭环仍缺后半段 | DOM 过滤与渲染兼容已有较多测试 |
| 上下文片段模型 | `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-context-rules.js` | 负责 explanation fragments、命中来源、预算和说明层数据 | `metaInfo` 与正文已拆层，但 `contextBundle` 仍承担部分历史兼容职责 | `tests/backlink-context-fragments.test.js` 覆盖片段和命中 |
| 预览拼装路径 | `src/service/backlink/backlink-preview-assembly.js` | 仅服务异常降级展示与兼容测试路径 | 正文主链已去 preview，但 legacy/兼容层仍需继续收口，防止顺序模型被反向污染 | 有隔离测试和兼容测试 |
| 文档级状态 | `src/components/panel/backlink-document-view-state.js`, `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-panel-header.js` | 保存层级、文档导航、按钮禁用态和同 root 焦点刷新行为 | 有界渐进切换已完成，剩余问题集中在编辑/拖拽后是否同层级局部重算并保持焦点 | 单元测试较全，缺编辑/拖拽交互回归 |
| 数据装配 | `src/service/backlink/backlink-data.ts`, `src/service/plugin/DocumentService.ts`, `src/service/plugin/backlink-panel-host.js` | 组装反链数据、透传焦点块、驱动宿主刷新 | 同 root 焦点刷新已打通，但“局部脏文档刷新”与“结构变化后 planner 重算”尚未建立 | 有宿主与焦点同步测试 |

## 3. Remaining Rule-to-Code Gaps

### G-001 统一 planner 已进入主链路，但 `sourceWindow/contextBundle` 双轨还未彻底结束

- 当前正文主路径已经能优先消费 `contextPlan.identity/bodyRange/orderedVisibleBlockIds/collapsedBlockIds`
- `sourceWindow` getter 也已承担 partial `contextPlan + legacy root 字段` 的兼容合并
- 但当前体系仍保留 `sourceWindow` 根字段和 `contextBundle` 的历史兼容语义，尚未收敛成“planner 唯一正文事实来源”

结论：

- 现在的主要工作不是再修规则偏差本身，而是完成“主语义唯一化”
- 后续应继续把正文消费侧从 legacy root 字段迁移到 `contextPlan`，并把 `contextBundle` 收敛为 explanation/search 辅助层

### G-002 编辑/拖拽后的同层级重算闭环仍未完成

- 当前约束已明确为：编辑/拖拽后保持当前档位不变，并按最新数据重算展示范围；不要求额外保持原焦点
- 当前已完成“同 root 焦点变化时复用 queryParams、文档 active index 和宿主 props”的基础闭环
- 但编辑完成、拖拽完成、结构变化后的事件驱动重算入口仍未建立
- 也还没有“只刷新当前文档组、保留折叠态与 heading more 状态”的稳定契约

结论：

- 这是当前最直接的用户可见遗留
- 重点是“同档位重算结果正确”，而不是对拖拽后的旧焦点做强保持

### G-003 正文线性顺序主链已收口大半，但“唯一顺序模型”还没有完全封口

- 当前已完成的部分：
  - `sourceWindow` 已稳定产出 `orderedVisibleBlockIds`
  - DOM 过滤层和文档导航主链已优先消费 `contextPlan.identity` 与线性可见块序列
  - preview assembly 已退出正式正文主路径
  - 部分索引/部分父级顺序已知时不再强排
- 仍未完全完成的部分：
  - `full` 层和少量兼容降级路径还没有被同一“正文顺序唯一模型”完全约束
  - “中间块只能以折叠占位形式缺省”的硬约束尚未以统一模型落地
  - legacy getter 和 explanation/compat 路径仍可能保留顺序兼容逻辑

结论：

- 当前问题已经从“到处顺序错乱”收敛为“少量兼容边界未封口”
- 下一阶段重点应是把“正文排序 / 结果排序 / 解释排序”正式固化成三条边界

### G-004 规则级回归测试已覆盖正文主规则，但交互类金样仍缺后半段

- 已覆盖的规则样例：
  - 普通段落
  - 文档开头段落
  - 列表项标题
  - 列表项子块
  - 标题块和多级标题边界
  - 引用型反链优先回原文
- 仍缺的交互样例：
  - 编辑后重算
  - 拖拽后局部重算
  - 反链页签内切换上下文状态后的焦点保持

结论：

- 当前测试缺口已经集中在“结构变更后的交互稳定性”
- 这部分需要跟 `RF-CTX-005` 一起推进，而不是单独补文档级金样

### 当前已经对齐的正式规则

- 已完成的规则对齐主要包括：元信息/正文拆层、列表 `core/nearby` 收口、正文主路径回归原文、有界渐进层级切换，以及同 root 焦点刷新下的状态保持。

这意味着后续工作应集中在两条终态主线：

1. `RF-CTX-005` 完成编辑/拖拽后的局部重算闭环
2. `RF-CTX-008` 继续封口正文线性顺序唯一模型

## 4. Proposed Target Architecture

### 4.1 建立单一的上下文规划结果

建议新增一个统一规划对象，作为正文渲染、命中解释、预算裁剪、UI 提示的唯一输入：

```ts
interface IBacklinkContextPlan {
  rootId: string;
  backlinkBlockId: string;
  focusBlockId: string;
  anchorBlockId: string;
  visibilityLevel: "core" | "nearby" | "extended" | "full";

  bodyRange: {
    startBlockId: string;
    endBlockId: string;
    windowBlockIds: string[];
  };

  visibleBlockIds: string[];
  collapsedBlockIds: string[];
  structuralShellBlockIds: string[];

  metaInfo: {
    documentTitle?: string;
    headingPath?: string[];
    listPath?: string[];
    matchSourceLabels?: string[];
    matchSummaryList?: string[];
  };

  plannerReason: {
    scopeType:
      | "ordinary_block"
      | "heading_anchor"
      | "list_shell"
      | "heading_section"
      | "preface"
      | "top_level_container"
      | "full_document";
    usedHeadingBoundary: boolean;
    usedContainerFallback: boolean;
  };
}
```

目标：

- `sourceWindow` 退化为 `bodyRange` 的兼容视图，而不是独立规则系统
- `contextBundle` 不再直接决定正文范围，只保留搜索/筛选/解释所需片段
- 元信息从正文片段中剥离，避免 `document` 继续污染 `core`

### 4.2 重新定义“可见”和“已加载”的边界

建议把当前“完整窗口 + `visibleBlockIds` 事后隐藏”拆成两层：

- `bodyRange`: Protyle 需要加载的最小原文窗口
- `visibleBlockIds`: 当前层级默认展开并可见的块
- `collapsedBlockIds`: 仍属于原文窗口，但以折叠占位保留的后代块

这样可以保留编辑/拖拽对原文块的直接作用，同时避免把“深层隐藏块”误当成当前层级正文范围。

### 4.3 把预览路径降级为“原文不可得时的异常策略”，而不是常规正文渲染

建议目标状态：

- 正常情况下所有层级都优先走原文 source window 渲染
- 引用型反链若能定位到真实块，也必须回到真实块
- 仅在 API 数据确实无法恢复原文块时，才显示“异常降级卡片”，并明确标记为降级结果，不与正式正文规则混用

### 4.4 为编辑/拖拽建立重算契约

建议新增统一入口：

- 输入：`documentId`、当前 `visibilityLevel`、当前 `focusBlockId`
- 输出：新的 `IBacklinkContextPlan`

触发时机：

- 文档内拖拽完成后
- 当前反链焦点块发生变化后
- 标题折叠/列表折叠造成结构改变后

要求：

- 不改变当前层级
- 尽量保持焦点块继续可见
- 只刷新受影响的文档组，而不是整页重跑

### 4.5 建立“正文线性顺序不可变”架构约束

建议新增一条硬约束：

- 在单条反链内部，凡是用于正文显示的结构，必须最终落为一条按原文块出现顺序排列的 `orderedVisibleBlockIds`
- 任意来源标签、命中解释、预算优先级、匹配优先级，只能影响“是否显示/如何标注”，不能影响“正文块顺序”

建议明确分成三类排序：

1. `result ordering`
   - 用于反链列表、文档列表、分页结果排序
   - 允许按更新时间、创建时间、标题排序
2. `document linear ordering`
   - 用于单条反链正文块的线性顺序
   - 只能来源于文档真实顺序
   - 不允许被来源优先级、命中优先级、预算优先级覆盖
3. `explanation ordering`
   - 用于命中标签、摘要、来源 chip 的展示顺序
   - 可以按优先级排，但必须与正文顺序隔离

建议把当前所有会影响单条反链正文的“非文档顺序重排”拆成两类处理：

- 去除：
  - 预览正文里的来源优先级重排
  - 预算层对正文块的跨位置裁剪
  - 正文层的文本去重式合并
- 隔离：
  - 命中来源摘要排序
  - 反链列表条目排序
  - 结果列表的文档分组排序

### 4.6 用“线性块计划”替代“来源桶计划”

建议在 `IBacklinkContextPlan` 下增加线性块数组，而不是再由 `parent/sibling/expanded` 多桶拼装：

```ts
interface IBacklinkContextPlanBlock {
  blockId: string;
  documentOrder: number;
  visibilityRole:
    | "focus"
    | "anchor_shell"
    | "nearby_prev"
    | "nearby_next"
    | "section_body"
    | "collapsed_placeholder";
  sourceTags: string[];
  matched: boolean;
  collapsed: boolean;
}
```

关键点：

- planner 先生成按 `documentOrder` 排好的线性块数组
- 后续任何 UI 层都只能在这条线性数组上做过滤、折叠、标注
- 不允许再从 `parentMarkdown / previousSiblingMarkdown / expandedMarkdown` 反向拼正文

这会自然解决两个问题：

- 块顺序由单一数据源决定
- “中间块丢失”只能发生在显式折叠或预算占位，不会无提示消失

## 5. Prioritized Refactor Backlog

| ID | Priority | Module/Scenario | Files in Scope | Refactor Objective | Risk Level | Pre-Refactor Test Checklist | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF-CTX-001 | P0 | 元信息与正文范围解耦 | `src/service/backlink/backlink-context-rules.js`, `src/service/backlink/backlink-context.js`, `src/models/backlink-model.ts`, `src/service/backlink/backlink-render-data.js` | 把 `document`、标题路径、列表路径、命中来源从四层正文范围中拆出，建立 `metaInfo`/解释层 | High | - [x] `core` 默认正文不再包含 `document`；- [x] 文档名仍可展示；- [x] 文档名命中不会伪装成正文层级命中；- [x] 预算不再计入元信息 | done |
| RF-CTX-002 | P0 | 统一上下文规划器 | `src/service/backlink/backlink-source-window.js`, `src/service/backlink/backlink-context.js`, `src/models/backlink-model.ts` | 用单一 planner 同时产出正文窗口、可见块、折叠块和解释信息，结束 `sourceWindow/contextBundle` 双轨 | High | - [x] 普通块 6 个正式样例回归；- [x] 列表/标题/无标题场景全部有金样测试；- [x] 旧 API 兼容层不破坏现有渲染入口；- [x] 正文消费侧完全不再直接读取 legacy root 字段；- [x] `contextBundle` 不再承载正文范围语义 | done |
| RF-CTX-003 | P0 | 列表 `core/nearby` 精准收口 | `src/service/backlink/backlink-source-window.js`, `src/components/panel/backlink-protyle-dom.js`, `src/components/panel/backlink-protyle-rendering.js` | 让列表 `core` 只表达结构壳 + 焦点块，让列表 `nearby` 只表达邻居壳层 + 可选首层直接子项 | High | - [x] 列表标题命中；- [x] 列表子块命中；- [x] 邻居有深层子树时不默认展开深层；- [x] 结构壳仍可见；- [x] 焦点高亮不丢失 | done |
| RF-CTX-004 | P0 | 去除常规正文中的拼接预览路径 | `src/service/backlink/backlink-preview-assembly.js`, `src/components/panel/backlink-document-interaction.js`, `tests/backlink-document-interaction.test.js` | 让正式正文层级始终优先原文渲染；预览拼装只保留为异常兜底并显式标识 | High | - [x] 引用型反链优先落回真实块；- [x] source window 缺失时有明确异常 UI；- [x] 不再把拼接 markdown 作为正式正文 | done |
| RF-CTX-005 | P1 | 编辑/拖拽后的同层级重算 | `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-protyle-rendering.js`, `src/service/backlink/backlink-data.ts`, `src/service/plugin/DocumentService.ts`, `src/service/plugin/backlink-panel-host.js` | 建立“保持当前档位 + 按最新数据重算范围”的重渲染入口 | Medium/High | - [x] 同 root 焦点变化时层级与 queryParams 不回退；- [x] 同 root 焦点变化时文档级 active index 不清空；- [x] 已建立当前文档组局部刷新入口；- [x] 面板内 `focusout/drop` 已接入局部刷新入口；- [x] 局部刷新已先重算最新 render data 再重绘目标文档组；- [x] 局部刷新已显式带入当前 `focusBlockId`；- [x] 局部刷新已重取最新 base data，再重算 render data；- [x] 编辑后层级不变；- [x] 拖拽后按最新数据局部重算；- [x] 折叠状态与 heading more 状态尽量保留 | done |
| RF-CTX-006 | P1 | 正式规则级回归测试补齐 | `tests/backlink-source-window.test.js`, `tests/backlink-document-interaction.test.js`, `tests/backlink-context-fragments.test.js`, `tests/backlink-panel-controller-local-refresh.test.js`, 新增规则场景测试 | 把正式规则中的 6 个验证样例和交互样例固化为回归测试 | Medium | - [x] 普通段落；- [x] 文档开头段落；- [x] 列表项标题；- [x] 列表项子块；- [x] 标题块；- [x] 多级标题边界；- [x] 引用型反链；- [x] 当前文档组局部刷新入口；- [x] 面板内 `focusout/drop` 局部刷新映射；- [x] 局部刷新前先重算最新 render data；- [x] 局部刷新显式带入当前 `focusBlockId`；- [x] 局部刷新已重取最新 base data；- [x] 编辑后重算；- [x] 拖拽后局部重算；- [x] 反链页签内切换上下文状态后的焦点保持 | done |
| RF-CTX-007 | P2 | 层级切换交互收口 | `src/components/panel/backlink-document-view-state.js`, `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-document-row.js`, `src/components/panel/backlink-panel-header.js` | 将上下文切换从循环模式改为有界渐进模式，并补充分层反馈文案 | Medium | - [x] `previous` 在 `core` 停留；- [x] `next` 在 `full` 停留；- [x] 层级按钮状态和文案一致；- [x] 不影响已有点击/导航行为 | done |
| RF-CTX-008 | P0 | 正文线性顺序统一与非文档顺序重排隔离 | `src/service/backlink/backlink-source-window.js`, `src/service/backlink/backlink-preview-assembly.js`, `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-context-budget.js`, `src/components/panel/backlink-document-navigation.js`, `src/models/backlink-model.ts` | 建立“单条反链正文只按文档顺序排列”的硬约束，去除或隔离来源优先级、预算优先级、去重逻辑对正文顺序的影响 | High | - [x] `core/nearby/extended` 主链可见块顺序已优先按原文一致；- [x] 结果列表排序与正文排序主链已基本隔离；- [x] `full` 层与异常降级路径也统一受同一顺序模型约束；- [x] 中间块只允许以折叠占位形式缺省；- [x] 异常降级 preview 路径已优先按 `fragment.order` 服从文档顺序 | done |
| RF-CTX-009 | P2 | 文档与设计文档同步 | `docs/反链上下文基线与术语表.md`, `docs/统一上下文片段模型设计.md`, `README.md` 如需要 | 在实现落地后同步更新基线、术语和数据模型文档，消除历史文档残差 | Low | - [x] 术语表与正式规则一致；- [x] 统一模型文档不再把 `document` 放进正文层级；- [x] README 不描述过期行为 | done |

Priority definition:

- `P0`: 规则级偏差明显，且直接影响正文范围正确性或原文渲染契约
- `P1`: 影响交互稳定性与可验证性，应在核心规则落地后立即跟进
- `P2`: 一致性与体验层收口，最后处理

Status definition:

- `pending`
- `in_progress`
- `done`
- `blocked`

## 6. Delivery Result

- `Phase A` 已完成：编辑/拖拽后的局部重算闭环已建立，并按最新 base data + render data 生效
- `Phase B` 已完成：正文线性顺序模型已覆盖主路径与异常降级路径
- `Phase C` 已完成：`contextPlan` 已成为正文消费主语义，legacy root 字段退为兼容视图
- `Phase D` 已完成：规则级与交互级回归测试已补齐到当前实现边界

当前无剩余阶段性开发项。

## 7. Risk Notes and Open Questions

### 收口说明

- 当前实现已对齐到正式规则要求的主路径效果。
- 后续若有新增工作，应以回归修复、性能优化或兼容性补丁为主，而不是继续调整规则边界。

## 8. Execution Log

| ID | Start Date | End Date | Test Commands | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| RF-CTX-001 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-context-fragments.test.js`; `node --test tests/backlink-context-budget.test.js`; `node --test tests/backlink-render-data.test.js`; `node --test tests/*.test.js` | pass | 已完成元信息与正文拆层，`document` 不再作为正文主语义的一部分 |
| RF-CTX-002 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-source-window.test.js`; `node --test tests/backlink-document-interaction.test.js`; `node --test tests/backlink-protyle-dom.test.js`; `node --test tests/backlink-preview-isolation.test.js`; `node --test tests/*.test.js` | pass | `contextPlan` 已进入正文主链，正文消费侧已通过 getter 统一读取 source window 语义；面板消费者不再直接读取 legacy root 字段；`contextBundle` 仅保留 explanation/meta/search 辅助语义 |
| RF-CTX-003 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-source-window.test.js`; `node --test tests/backlink-document-interaction.test.js tests/backlink-protyle-dom.test.js tests/backlink-protyle-rendering.test.js`; `node --test tests/backlink-document-row.test.js tests/backlink-document-view-state.test.js` | pass | 已完成列表 `core/nearby` 的最小连续原文范围收口 |
| RF-CTX-004 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-document-interaction.test.js`; `node --test tests/backlink-render-data.test.js`; `node --test tests/backlink-panel-header.test.js`; `node --test tests/backlink-document-row.test.js`; `node --test tests/backlink-context-fragments.test.js`; `node --test tests/backlink-preview-isolation.test.js` | pass | 已移除正文主路径对 preview 的依赖，并把 preview 降为显式异常兜底 |
| RF-CTX-005 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-panel-focus.test.js`; `node --test tests/backlink-panel-host.test.js tests/document-service-focus-sync.test.js`; `node --test tests/backlink-panel-controller-focus-refresh.test.js tests/backlink-panel-focus-refresh.test.js`; `node --test tests/backlink-panel-controller-local-refresh.test.js`; `node --test tests/backlink-protyle-rendering.test.js tests/backlink-document-interaction.test.js`; `node --test tests/backlink-render-data.test.js tests/backlink-panel-header.test.js tests/backlink-document-row.test.js tests/backlink-document-view-state.test.js`; `node --test tests/*.test.js` | pass | 当前文档组局部刷新已具备完整规则效果链路：保持当前档位、不回退筛选与 active index、显式带入当前 `focusBlockId`、重取最新 base data 与 render data、并只重绘目标文档组；重渲染时会保留折叠项与 `heading more` 状态 |
| RF-CTX-006 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-source-window.test.js`; `node --test tests/backlink-document-interaction.test.js`; `node --test tests/backlink-panel-controller-focus-refresh.test.js tests/backlink-panel-focus-refresh.test.js`; `node --test tests/backlink-panel-controller-local-refresh.test.js`; `node --test tests/backlink-protyle-rendering.test.js`; `node --test tests/backlink-preview-assembly.test.js`; `node --test tests/backlink-preview-isolation.test.js`; `node --test tests/*.test.js` | pass | 正式规则中的正文样例、局部刷新样例、异常降级顺序样例以及反链页签内切换上下文状态的焦点保持样例均已固化为回归测试 |
| RF-CTX-007 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-document-view-state.test.js tests/backlink-document-row.test.js` | pass | 已完成有界渐进层级切换与边界态回归 |
| RF-CTX-008 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-document-interaction.test.js`; `node --test tests/backlink-query-loaders.test.js`; `node --test tests/backlink-source-window.test.js`; `node --test tests/backlink-document-navigation.test.js tests/backlink-preview-assembly.test.js`; `node --test tests/backlink-protyle-dom.test.js`; `node --test tests/backlink-protyle-rendering.test.js`; `node --test tests/backlink-context-fragments.test.js`; `node --test tests/backlink-context-budget.test.js`; `node --test tests/backlink-render-data.test.js`; `node --test tests/backlink-preview-isolation.test.js`; `node --test tests/*.test.js` | pass | 正文主路径、结果列表、异常降级 preview 路径和 `full` 层都已统一服从文档顺序语义；当块被省略时，主链通过 `collapsedBlockIds`/显式可见块语义表达，而不会再被来源优先级或兼容路径静默重排 |
| RF-CTX-009 | 2026-03-17 | 2026-03-17 | 文档同步，无自动化 | pass | 已同步术语、设计文档和 README 到当前实现状态 |

## 9. Current Status Summary

- Completed: `RF-CTX-001`, `RF-CTX-002`, `RF-CTX-003`, `RF-CTX-004`, `RF-CTX-005`, `RF-CTX-006`, `RF-CTX-007`, `RF-CTX-008`, `RF-CTX-009`
- In progress: none
- Blocked: none

## 10. Final Outcome

- 四层正文范围、正文/辅助信息分层、列表与标题边界、异常降级提示、正文线性顺序、局部重算链路、以及反链页签内上下文切换的焦点保持，均已按当前规则文档和回归测试收口。
- 后续如继续迭代，应以新增规则需求、回归修复或性能/兼容性优化为边界，不再作为本轮对齐计划的遗留项。

### RW-004 `RF-CTX-006` 交互金样补齐

- 目标：把剩余规则差距全部转成可执行回归测试。
- 首要改动点：
  - 编辑后重算场景
  - 拖拽后局部重算场景
  - 反链页签内层级切换后焦点保持场景
- 完成标准：
  - 三类交互样例都先有失败测试，再实现，再转绿
