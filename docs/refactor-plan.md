# 上下文状态渐进显示规则对齐计划

## 1. Project Snapshot

- Generated on: 2026-03-17
- Scope: 反链面板上下文状态规划、渲染、交互状态
- Goal: 对齐 `docs/上下文状态渐进显示规则.md`，输出不改代码前提下的改进方案与开发计划
- Rule baseline:
  - 正文必须按原文块显示和渲染，不能用拼接预览替代原文正文
  - 四层正文范围是 `核心 / 近邻 / 扩展 / 全文`
  - 定位信息与正文范围分开计算
  - 编辑/拖拽后应在保持当前档位的前提下，以当前焦点重新计算范围

## 2. Architecture and Module Analysis

| Module | Key Files | Current Responsibility | Main Pain Points | Test Coverage Status |
| --- | --- | --- | --- | --- |
| 规则基线 | `docs/上下文状态渐进显示规则.md` | 定义四层范围、列表壳层、标题节边界、交互补充规则 | 当前代码只有部分模块对齐，正式规则与实现之间仍存在双轨 | 有规则文档，无自动校验 |
| 正文范围规划 | `src/service/backlink/backlink-source-window.js` | 为 `core / nearby / extended` 计算 source window、可见块、锚点与滚动范围 | 列表场景仍以“完整子树窗口 + 事后隐藏”表达，正文范围语义偏大 | `tests/backlink-source-window.test.js` 覆盖较多 |
| 正文渲染与过滤 | `src/components/panel/backlink-document-interaction.js`, `src/components/panel/backlink-protyle-rendering.js`, `src/components/panel/backlink-protyle-dom.js` | 决定走原文窗口渲染还是预览渲染，并在 Protyle DOM 上隐藏非窗口块 | 原文窗口与预览降级是两套体系；列表折叠能力依赖 DOM 过滤，缺少显式结构计划 | 交互与 DOM 过滤有测试，但缺少规则级回归 |
| 上下文片段模型 | `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-context-rules.js` | 构造上下文片段、命中来源、可见层级、预算与摘要 | `document` 被当作 `core` 正文；`expanded` 仍是宽泛兜底，未表达“所属标题节/结构壳” | `tests/backlink-context-fragments.test.js` 覆盖片段和命中 |
| 预览拼装路径 | `src/service/backlink/backlink-preview-assembly.js` | 将片段拼成预览 DOM，服务引用型反链或 source window 缺失时的降级显示 | 会去样式、压平列表、拼接片段，违反“按原文渲染正文”的正式规则 | 有交互侧测试，无正式规则回归 |
| 文档级状态 | `src/components/panel/backlink-document-view-state.js`, `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-panel-header.js` | 保存文档展开态、上下文层级、切换按钮与提示文案 | 层级切换逻辑允许环形跳转；编辑/拖拽后没有“按当前档位重算范围”的契约链路 | 有单元测试，缺交互场景测试 |
| 数据装配 | `src/service/backlink/backlink-data.ts`, `src/service/backlink/backlink-panel-data-assembly.js` | 组装反链节点、上下文 bundle、预算、source windows | `contextBundle` 与 `sourceWindow` 并行演化；后续改造需要兼容这两条链路 | 有面板数据装配测试 |

## 3. Rule-to-Code Findings

### F-001 正文范围与定位信息仍然混在同一层级模型中

- 正式规则要求“定位信息与正文范围分开计算”，文档名、标题路径、列表路径、命中来源说明不计入四层正文范围：`docs/上下文状态渐进显示规则.md:49-52`
- 当前实现把 `document` 作为 `core` 层正式片段，且默认可见、可搜索：`src/service/backlink/backlink-context-rules.js:11-18`
- `buildBacklinkContextBundle` 直接把 `documentBlock` 物化为上下文片段，默认 visible fragments 也包含 `document`：`src/service/backlink/backlink-context.js:169-181`
- 测试已把 `["self", "document"]` 固化为默认 `core` 可见片段：`tests/backlink-context-fragments.test.js:79-86`

结论：

- 当前模型把“文档辅助信息”纳入了正文层级，和正式规则冲突
- 这会影响命中解释、预算计算、层级摘要和后续统一规划

### F-002 列表 `core` 仍以整棵子树作为窗口，只是在 DOM 层隐藏后代

- 正式规则要求列表 `core` 显示结构壳；若焦点在子块中，则结构壳和焦点子块必须可见，其他子块默认不全部展开：`docs/上下文状态渐进显示规则.md:118-132`
- 当前 `buildCoreBacklinkSourceWindow` 对列表场景直接把 `endIndex` 设为 `findBlockSubtreeEndIndex(...)`，即完整列表项子树：`src/service/backlink/backlink-source-window.js:609-624`
- 测试也明确断言 `windowBlockIds` 包含整个子树，只是 `visibleBlockIds` 只有壳和焦点子块：`tests/backlink-source-window.test.js:631-660`
- 渲染层在 `scrollAttr` 中仍使用整个 `startId/endId` 窗口，再通过 `hideBlocksOutsideBacklinkSourceWindow` 做隐藏：`src/components/panel/backlink-document-interaction.js:167-188`、`src/components/panel/backlink-protyle-rendering.js:240-257`

结论：

- 用户可见结果接近正式规则，但规划语义仍然是“先拿整棵子树，再事后隐藏”
- 这会让核心层的正文边界、后续拖拽刷新和列表占位折叠语义都不够稳定

### F-003 列表 `nearby` 仍会把邻居深层结构带入窗口，且“可见壳层”超出首层直接子项

- 正式规则要求列表 `nearby` 只显示当前项与前后同级列表项；若邻居包含子项，默认显示标题壳，可附带首层直接子项，不默认展开深层子树：`docs/上下文状态渐进显示规则.md:164-178`
- 当前 `buildNearbyBacklinkSourceWindow` 会把邻居的结束边界扩到 `getBlockRangeEndIndex(endBlockId)`，列表项时即整棵子树：`src/service/backlink/backlink-source-window.js:659-690`
- `resolveReadableListItemShellBlockIds` 会沿着子列表不断向下找“第一个可读子块”，不是只取首层直接子项：`src/service/backlink/backlink-source-window.js:523-558`
- 测试已固化“邻居列表项可以把二层子项 `item-logo/block-logo` 带入 `visibleBlockIds`”：`tests/backlink-source-window.test.js:663-701`

结论：

- 当前实现已经从“整棵邻居子树全开”收敛了一部分，但仍未达到正式规则要求的“默认仅壳层 + 可选首层直接子项”
- 这会在复杂列表里引入超量内容，削弱“最小足够理解”

### F-004 原文窗口渲染与片段预览渲染是两套规则，引用型反链会直接落到拼接预览

- 正式规则明确要求正文必须直接来自原文块，不能用改写或拼接文本替代：`docs/上下文状态渐进显示规则.md:27-33`、`242-252`
- 当前预览路径会移除引用样式、压平列表、拼接多段 markdown，再转成 DOM：`src/service/backlink/backlink-preview-assembly.js:39-83`、`121-153`、`289-340`
- 当前渲染决策在引用型反链下优先直接走 `buildBacklinkPreviewBacklinkData`，跳过 source window 原文渲染：`src/components/panel/backlink-document-interaction.js:150-166`
- 在 source window 缺失时也会回退到同一套预览组装：`src/components/panel/backlink-document-interaction.js:216-231`

结论：

- 这条降级路径直接违背正式规则中的“所有状态都按原文显示和渲染”
- 也是当前最需要优先清理的规则级偏差

### F-005 `contextBundle` 与 `sourceWindow` 没有统一规划器，扩展层语义只能部分一致

- 正式规则要求扩展层表达“所属标题节”与“无标题结构容器兜底”：`docs/上下文状态渐进显示规则.md:180-212`
- 当前 `sourceWindow` 的 `extended` 规划已经基本对齐标题节边界和无标题兜底：`src/service/backlink/backlink-source-window.js:693-777`
- 但 `contextBundle` 仍只有通用 `expanded` 片段，没有直接表达“所属标题节”“前言区”“结构壳折叠”等正式概念：`src/service/backlink/backlink-context-rules.js:65-72`、`src/service/backlink/backlink-context.js:233-245`
- 预览序列也仍以 `parent/sibling/child/expanded` 的旧来源顺序构造，而不是以正式规则定义的正文窗口构造：`src/service/backlink/backlink-preview-assembly.js:4-16`、`220-257`

结论：

- 目前“正文范围”与“命中来源/预览来源”并不是同一个规划结果
- 这会导致说明文案、预算、降级渲染和正文窗口出现语义分叉

### F-006 交互状态没有形成“编辑/拖拽后按当前档位重算范围”的闭环

- 正式规则要求编辑或拖拽后，保持当前档位不变，并以当前焦点重新计算范围：`docs/上下文状态渐进显示规则.md:35-43`
- 当前控制器在切换层级时只是修改 view state 并重渲染已存在的 `documentGroup`：`src/components/panel/backlink-panel-controller.js:497-538`
- `syncBacklinkDocumentProtyleState` 只回收折叠状态和标题 more 展开状态，没有重算 source window 或焦点规划：`src/components/panel/backlink-protyle-rendering.js:1-26`
- `applyCreatedBacklinkProtyleState` 主要是套用折叠/展开和隐藏窗口外块，没有监听编辑后重新规划：`src/components/panel/backlink-protyle-rendering.js:199-324`

结论：

- 当前项目具备“保留折叠状态”的基础，但没有正式规则要求的“同档位、按新焦点重算窗口”机制
- 这一点会在列表拖拽、标题升级/降级、行内编辑后暴露不稳定性

### F-007 上下文层级切换逻辑允许环形跳转，不符合“渐进显示”的心智模型

- 正式规则强调四层是渐进正文范围，不是循环模式：`docs/上下文状态渐进显示规则.md:45-47`、`214-218`
- 当前 `cycleBacklinkDocumentVisibilityLevel` 采用取模运算，`core` 点击“上一步”会跳到 `full`：`src/components/panel/backlink-document-view-state.js:85-105`
- 控制器的上一层/下一层按钮直接使用这套循环逻辑：`src/components/panel/backlink-panel-controller.js:508-515`

结论：

- 这不是正文规则的核心冲突，但会干扰用户对“逐步展开/逐步收起”的理解
- 建议在规则对齐阶段一并收口为有界切换

### F-008 同一条反链内部仍存在多处“不按文档出现顺序显示”的重排路径

用户反馈的“同一条反链在不同上下文状态下，显示块顺序与原文档不一致”并不是单点问题，而是当前架构里有多条会改写块顺序的链路：

#### 1. 正文窗口顺序依赖多级回退排序，存在非原文顺序回退

- `compareBlocksByDocumentOrder` 在拿不到块索引时，会退回 `sort -> path -> id`：`src/service/backlink/backlink-source-window.js:22-40`
- `buildTreeOrderedBlocks` 在不完整索引场景下，会按父子树遍历重建顺序，而不是只信任原文线性顺序：`src/service/backlink/backlink-source-window.js:155-247`
- `loadOrderedBacklinkSourceWindowBlocks` 还会混合 `getChildBlocks`、`getBlockKramdown`、fallback index 共同决定最终顺序：`src/service/backlink/backlink-source-window.js:885-980`

风险：

- 当索引不全、`sort/path` 与真实文档顺序不一致、或父子关系数据不完整时，source window 的 `windowBlockIds` 可能出现顺序漂移
- 这类漂移会直接影响 `core / nearby / extended` 所有层级，因为它们都以 `orderedDocumentBlocks` 为基础切片

#### 2. 预览路径会按“来源优先级”而不是“文档顺序”重排

- `BACKLINK_PREVIEW_SOURCE_ORDER` 明确规定了 `nearby` 和 `extended` 的来源顺序，例如扩展层固定为 `parent -> sibling_prev -> self -> sibling_next -> child_headline -> child_list -> expanded`：`src/service/backlink/backlink-preview-assembly.js:4-16`
- `selectBacklinkPreviewFragments` 会先按来源顺序排序，再按片段 `order` 排：`src/service/backlink/backlink-preview-assembly.js:220-257`
- `dedupePreviewFragments` 在文本重复时，会优先保留来源优先级更高的片段，再按来源顺序输出：`src/service/backlink/backlink-preview-assembly.js:178-218`
- `buildBacklinkPreviewBacklinkData` 在 `previewSequence` 存在时，会直接按 sequence 拼接 markdown：`src/service/backlink/backlink-preview-assembly.js:289-340`

风险：

- 这条链路输出的不是“原文档中的块顺序”，而是“产品定义的来源顺序”
- 在列表、标题、父级路径、扩展片段同时出现时，用户看到的顺序很容易与原文相反

#### 3. 预算裁剪和片段去重会导致“中间块丢失”

- `applyBacklinkContextBudget` 先按 `matched -> budgetPriority -> order` 排序，再决定保留哪些片段：`src/service/backlink/backlink-context-budget.js:24-85`
- 当预算不够时，被裁掉的通常不是末尾片段，而是优先级较低的中间片段
- `dedupeBacklinkContextFragments` 也会按 `sourceType/searchText/anchorText/refBlockIds` 去重：`src/service/backlink/backlink-context.js:24-47`
- 预览层再次按规范化文本去重：`src/service/backlink/backlink-preview-assembly.js:162-218`

风险：

- 即便原文窗口本身是连续的，片段层和预览层仍可能把处于中间位置的块裁掉或合并掉
- 用户感知上会表现为“明明前后块都在，中间解释块或正文块没了”

#### 4. 相邻/扩展兄弟块上下文是按来源分桶采集，再由不同字段拼装

- `buildExpandedSiblingBlocks` 把兄弟块拆成 `beforeSiblingBlocks / afterSiblingBlocks`：`src/service/backlink/backlink-query-loaders.js:198-207`
- `collectSiblingBlocks` 又把这些内容分别写进 `previousSiblingMarkdown`、`nextSiblingMarkdown`、`beforeExpandedMarkdown`、`afterExpandedMarkdown`、`expandedMarkdown`：`src/service/backlink/backlink-panel-data-collectors.js:468-577`

风险：

- 当前数据模型天然是“来源桶”，不是“线性块序列”
- 后续无论渲染还是摘要，只要按来源桶消费，就很容易出现跨桶重排或桶间断裂

#### 5. 反链组内排序与块内顺序目前没有清晰隔离

- `groupBacklinksByDocument` 会按 `sourceDocumentOrder` 重排同一文档下的反链条目：`src/components/panel/backlink-document-navigation.js:56-135`
- 这是“反链条目排序”，本身合理，但当前代码里 `sourceDocumentOrder` 与 `sourceWindow` 共用同一套基础顺序来源

风险：

- 一旦顺序基础数据不稳定，会同时污染“文档内反链条目顺序”和“单条反链正文块顺序”
- 架构上缺少“结果级排序”和“正文级线性顺序”之间的边界

结论：

- 当前系统里至少有四种排序依据同时存在：文档真实顺序、块索引回退顺序、来源优先级顺序、预算/命中优先级顺序
- 这些排序依据没有被严格隔离，所以会在同一条反链的显示过程中互相覆盖
- 要彻底解决“顺序错乱/中间块丢失”，不能只修单个 sort，而要在架构上建立唯一的“正文线性顺序”

### 当前已经基本对齐的部分

- 普通块 `core` 与普通块 `nearby` 的最小窗口规则基本对齐：`src/service/backlink/backlink-source-window.js:627-635`、`638-690`
- 标题节扩展边界已按“下一个同级或更高级标题”截断：`src/service/backlink/backlink-source-window.js:703-777`
- 无标题文档的列表容器兜底已经存在：`src/service/backlink/backlink-source-window.js:751-760`

这意味着本轮工作不应推翻全部实现，而应优先收敛“正文线性顺序”“列表规则”“元信息分层”“统一规划器”“原文渲染降级策略”五块。

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
| RF-CTX-001 | P0 | 元信息与正文范围解耦 | `src/service/backlink/backlink-context-rules.js`, `src/service/backlink/backlink-context.js`, `src/models/backlink-model.ts`, `src/service/backlink/backlink-render-data.js` | 把 `document`、标题路径、列表路径、命中来源从四层正文范围中拆出，建立 `metaInfo`/解释层 | High | - [ ] `core` 默认正文不再包含 `document`；- [ ] 文档名仍可展示；- [ ] 文档名命中不会伪装成正文层级命中；- [ ] 预算不再计入元信息 | pending |
| RF-CTX-002 | P0 | 统一上下文规划器 | `src/service/backlink/backlink-source-window.js`, `src/service/backlink/backlink-context.js`, `src/models/backlink-model.ts` | 用单一 planner 同时产出正文窗口、可见块、折叠块和解释信息，结束 `sourceWindow/contextBundle` 双轨 | High | - [ ] 普通块 6 个正式样例回归；- [ ] 列表/标题/无标题场景全部有金样测试；- [ ] 旧 API 兼容层不破坏现有渲染入口 | pending |
| RF-CTX-003 | P0 | 列表 `core/nearby` 精准收口 | `src/service/backlink/backlink-source-window.js`, `src/components/panel/backlink-protyle-dom.js`, `src/components/panel/backlink-protyle-rendering.js` | 让列表 `core` 只表达结构壳 + 焦点块，让列表 `nearby` 只表达邻居壳层 + 可选首层直接子项 | High | - [ ] 列表标题命中；- [ ] 列表子块命中；- [ ] 邻居有深层子树时不默认展开深层；- [ ] 结构壳仍可见；- [ ] 焦点高亮不丢失 | pending |
| RF-CTX-004 | P0 | 去除常规正文中的拼接预览路径 | `src/service/backlink/backlink-preview-assembly.js`, `src/components/panel/backlink-document-interaction.js`, `tests/backlink-document-interaction.test.js` | 让正式正文层级始终优先原文渲染；预览拼装只保留为异常兜底并显式标识 | High | - [ ] 引用型反链优先落回真实块；- [ ] source window 缺失时有明确异常 UI；- [ ] 不再把拼接 markdown 作为正式正文 | pending |
| RF-CTX-005 | P1 | 编辑/拖拽后的同层级重算 | `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-protyle-rendering.js`, `src/service/backlink/backlink-data.ts` | 建立“保持当前档位 + 按当前焦点重算范围”的重渲染入口 | Medium/High | - [ ] 编辑后层级不变；- [ ] 拖拽后焦点仍可见；- [ ] 只刷新当前文档组；- [ ] 折叠状态与 heading more 状态尽量保留 | pending |
| RF-CTX-006 | P1 | 正式规则级回归测试补齐 | `tests/backlink-source-window.test.js`, `tests/backlink-document-interaction.test.js`, `tests/backlink-context-fragments.test.js`, 新增规则场景测试 | 把正式规则中的 6 个验证样例和 3 个交互样例固化为回归测试 | Medium | - [ ] 普通段落；- [ ] 文档开头段落；- [ ] 列表项标题；- [ ] 列表项子块；- [ ] 标题块；- [ ] 多级标题边界；- [ ] 引用型反链；- [ ] 编辑后重算；- [ ] 层级切换焦点保持 | pending |
| RF-CTX-007 | P2 | 层级切换交互收口 | `src/components/panel/backlink-document-view-state.js`, `src/components/panel/backlink-panel-controller.js`, `src/components/panel/backlink-document-row.js` | 将上下文切换从循环模式改为有界渐进模式，并补充分层反馈文案 | Medium | - [ ] `previous` 在 `core` 停留；- [ ] `next` 在 `full` 停留；- [ ] 层级按钮状态和文案一致；- [ ] 不影响已有点击/导航行为 | pending |
| RF-CTX-008 | P0 | 正文线性顺序统一与非文档顺序重排隔离 | `src/service/backlink/backlink-source-window.js`, `src/service/backlink/backlink-preview-assembly.js`, `src/service/backlink/backlink-context.js`, `src/service/backlink/backlink-context-budget.js`, `src/components/panel/backlink-document-navigation.js`, `src/models/backlink-model.ts` | 建立“单条反链正文只按文档顺序排列”的硬约束，去除或隔离来源优先级、预算优先级、去重逻辑对正文顺序的影响 | High | - [ ] 同一反链在 `core/nearby/extended/full` 的可见块顺序均与原文一致；- [ ] 中间块只允许以折叠占位形式缺省；- [ ] 预览/摘要排序不再影响正文顺序；- [ ] 结果列表排序与正文排序彼此隔离 | pending |
| RF-CTX-009 | P2 | 文档与设计文档同步 | `docs/反链上下文基线与术语表.md`, `docs/统一上下文片段模型设计.md`, `README.md` 如需要 | 在实现落地后同步更新基线、术语和数据模型文档，消除历史文档残差 | Low | - [ ] 术语表与正式规则一致；- [ ] 统一模型文档不再把 `document` 放进正文层级；- [ ] README 不描述过期行为 | pending |

Priority definition:

- `P0`: 规则级偏差明显，且直接影响正文范围正确性或原文渲染契约
- `P1`: 影响交互稳定性与可验证性，应在核心规则落地后立即跟进
- `P2`: 一致性与体验层收口，最后处理

Status definition:

- `pending`
- `in_progress`
- `done`
- `blocked`

## 6. Recommended Delivery Phases

### Phase 0: 先加规则级金样测试

顺序建议：

1. 固化正式规则的 6 个正文样例
2. 补 3 个交互样例：引用型反链、编辑后重算、层级边界切换
3. 明确哪些测试是“当前失败、作为改造目标”的预期失败

原因：

- 当前 `sourceWindow`、`contextBundle`、`preview` 三条链路耦合较深，先用金样固定目标边界，后续调整更安全

### Phase 1: 抽出统一 planner 和元信息分层

目标：

- 正文范围只由 planner 负责
- 命中来源、文档名、标题路径只保留在解释层
- 为现有调用方提供兼容适配，避免一次性全改

输出物：

- `IBacklinkContextPlan`
- `sourceWindow <- plan` 兼容适配器
- `contextBundle.metaInfo` 或等价结构

### Phase 2: 收口正文线性顺序，隔离所有非文档顺序重排

目标：

- 单条反链正文只接受 `document linear ordering`
- 预览、命中、预算都不能再改变正文顺序
- 非文档顺序排序只允许停留在结果列表层和解释层

输出物：

- `orderedVisibleBlockIds`
- “正文排序 / 结果排序 / 解释排序”三层边界
- 被隔离或删除的非正文重排清单

### Phase 3: 收紧列表规则并引入显式折叠占位

目标：

- `core` 列表只显示壳和焦点
- `nearby` 列表默认不越过首层直接子项
- 深层结构用折叠占位表达，而不是“实际加载整个子树再隐藏”

输出物：

- 更精确的 `visibleBlockIds/collapsedBlockIds`
- 列表壳层渲染规则

### Phase 4: 移除正文中的拼接预览常规路径

目标：

- 原文窗口渲染成为默认且唯一的正式正文路径
- 预览仅在异常场景下出现，并在 UI 上被识别为异常降级结果

输出物：

- 新的 `buildBacklinkDocumentRenderOptions`
- 新的异常降级 UI 约定

### Phase 5: 建立编辑/拖拽重算闭环

目标：

- 不改变当前层级
- 按最新焦点或结构重算 planner
- 保留焦点与折叠态

输出物：

- 文档级局部刷新入口
- 必要的脏文档重算策略

## 7. Risk Notes and Open Questions

### 主要风险

- `sourceWindow` 目前已经被多处渲染/排序/导航逻辑消费，统一 planner 时要保留兼容视图
- Protyle DOM 过滤依赖现有节点结构，若从“隐藏”改为“显式折叠占位”，需要谨慎避免破坏编辑能力
- 引用型反链是否总能恢复真实块，需要先确认 API 数据质量边界
- 当前存在多处“正文排序”和“解释排序”耦合的代码，若不先分层，修一个 sort 可能在别处再次被覆盖

### 需要确认的问题

1. 引用型反链在现网数据里，是否都能稳定拿到真实 `blockId/rootId` 以回到原文窗口？
2. “可附带首层直接子项”是否需要做成固定策略，还是按预算动态决定？
3. 编辑/拖拽后的重算，是走当前页局部 planner 重建，还是重新拉取对应文档块快照？
4. `src/service/backlink/backlink-data.ts:375-376` 当前把 `focusBlockId` 直接置空，后续是否还保留这一策略？
5. 当块索引缺失时，是否允许继续使用 `sort/path/id` 回退，还是要明确降级为“仅显示可验证连续区间 + 警告”？
6. 现有 `previewSequence` 是否可以整体降为“异常展示专用”，不再参与正式正文？

## 8. Execution Log

| ID | Start Date | End Date | Test Commands | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| RF-CTX-001 |  |  | `node --test tests/backlink-context-fragments.test.js` | pending | 待执行 |
| RF-CTX-002 |  |  | `node --test tests/backlink-source-window.test.js` | pending | 待执行 |
| RF-CTX-003 |  |  | `node --test tests/backlink-source-window.test.js` | pending | 待执行 |
| RF-CTX-004 | 2026-03-17 |  | `node --test tests/backlink-document-interaction.test.js`; `node --test tests/backlink-context-fragments.test.js`; `node --test tests/backlink-preview-isolation.test.js`; `node --test tests/*.test.js` | in_progress | 已移除正文主路径对 preview assembly 的依赖，且 `previewSequence` 不再自动进入生产 `contextBundle`；新增隔离测试确保生产源文件不再引用 preview assembly；异常态标识尚未补齐 |
| RF-CTX-005 |  |  | `node --test tests/backlink-document-interaction.test.js tests/backlink-document-view-state.test.js` | pending | 待执行 |
| RF-CTX-006 | 2026-03-17 | 2026-03-17 | `node --test tests/backlink-document-interaction.test.js`; `node --test tests/*.test.js` | pass | 已补充 source window 优先于 preview fallback 的规则级测试，并全量通过 |
| RF-CTX-007 |  |  | `node --test tests/backlink-document-view-state.test.js tests/backlink-document-row.test.js` | pending | 待执行 |
| RF-CTX-008 | 2026-03-17 |  | `node --test tests/backlink-document-interaction.test.js`; `node --test tests/backlink-query-loaders.test.js`; `node --test tests/backlink-source-window.test.js`; `node --test tests/backlink-document-navigation.test.js tests/backlink-preview-assembly.test.js`; `node --test tests/backlink-protyle-dom.test.js`; `node --test tests/backlink-context-fragments.test.js`; `node --test tests/backlink-context-budget.test.js`; `node --test tests/backlink-render-data.test.js`; `node --test tests/backlink-preview-isolation.test.js`; `node --test tests/*.test.js` | in_progress | 已隔离十条主要非文档顺序重排链路：1) sourceWindow 存在时正文不再进入 preview 重排；2) fallback 元数据无法证明顺序时，不再用 `id` 强行制造兄弟块/窗口顺序；3) 只有部分块带显式顺序索引时，不再把“有索引块”整体提前；4) 只有部分父级子顺序已知时，不再把“有父级顺序的块”整体提前；5) sourceWindow 已稳定产出 `orderedVisibleBlockIds` 作为线性可见块序列；6) DOM 过滤层已优先消费这条线性序列；7) 文档内反链切换在只有部分 `sourceDocumentOrder` 时不再强排；8) `previewSequence` 已从生产 bundle 自动生成路径中剥离；9) 生产源码与类型层已不再把 preview assembly 作为正式正文模型的一部分；10) 生产说明层已优先使用 `explanationFragments`，`visibleFragments` 退为兼容镜像；正文线性顺序模型尚未完全统一 |
| RF-CTX-009 |  |  | 文档同步，无自动化 | pending | 待执行 |

## 9. Decision and Confirmation

- User approved items: `RF-CTX-006`, `RF-CTX-008`, `RF-CTX-004`
- Deferred items:
- Blocked items and reasons:

建议执行顺序：

1. `RF-CTX-006` 先补规则级测试
2. `RF-CTX-001`、`RF-CTX-002` 和 `RF-CTX-008` 一起做模型与顺序收口
3. `RF-CTX-003` 和 `RF-CTX-004` 处理列表与正文渲染主路径
4. `RF-CTX-005` 处理编辑/拖拽重算
5. `RF-CTX-007`、`RF-CTX-009` 做交互和文档收尾

## 10. Next Actions

1. 当前已完成 `RF-CTX-006`，并对 `RF-CTX-004`、`RF-CTX-008` 完成了十步隔离：正文主路径改为优先 `sourceWindow`；fallback 元数据无法证明顺序时停止使用 `id` 伪顺序；部分块有索引时不再整体提前；部分父级子顺序已知时不再整体提前；`sourceWindow` 已稳定产出 `orderedVisibleBlockIds`；DOM 过滤层已优先消费这条线性序列；文档内反链切换在部分 `sourceDocumentOrder` 缺失时不再强排；`previewSequence` 已从生产 bundle 自动生成路径中剥离；生产源码与类型层已不再把 preview assembly 作为正式正文模型的一部分；说明层已优先使用 `explanationFragments`，`visibleFragments` 仅保留兼容。
2. 下一步建议继续执行 `RF-CTX-008` 的核心部分：把 `visibleFragments` 从兼容镜像进一步降成内部兼容字段，并开始把预算/提示文案从“片段集合”过渡到更明确的说明模型。
3. 在 `RF-CTX-008` 收口后，再推进 `RF-CTX-003`，否则列表壳层收口仍会受现有双轨模型牵制。
