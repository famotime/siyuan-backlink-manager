# 反链页签上下文规则差异分析与改进计划

## 1. Snapshot

- Generated on: 2026-03-18
- Scope: 反链页签 `core / nearby / extended / full` 正文范围、定位信息、DOM 过滤、渲染入口、测试基线
- Goal: 让当前实现重新严格对齐 `docs/上下文状态渐进显示规则.md`
- Note: 这份计划以当前仓库代码为准。旧计划里已标记 `done` 的条目，如果与当前实现或用户反馈不一致，不再视为已完成。

## 2. Hard Constraints

后续调整必须同时满足以下硬约束：

1. 正文主链只能来自原文块和原文 DOM，不能回退到 preview/fragment 重组。
2. `bodyRange.windowBlockIds` 必须代表单一连续原文区间。
3. `startBlockId / endBlockId` 必须与实际加载区间一致，不能跳过结构壳或标题行。
4. `orderedVisibleBlockIds / collapsedBlockIds` 只负责结构展开策略，不能改写正文顺序，也不能让正文脱离 `bodyRange`。
5. 标题路径、列表路径、命中来源、摘要属于定位/解释层，不计入正文范围，但必须可见。
6. 切换档位、切换反链、编辑或拖拽后，必须保持当前档位并按最新原文重新计算。

## 3. Verified Gaps

| ID | Priority | Rule Reference | Current Code | Problem | Impact |
| --- | --- | --- | --- | --- | --- |
| GAP-001 | P0 | 正文必须是连续原文；大范围允许折叠占位 | `src/service/backlink/backlink-source-window.js`, `src/components/panel/backlink-protyle-dom.js` | planner 仍生成 `orderedVisibleBlockIds / collapsedBlockIds`，但渲染层没有真正消费 `collapsedBlockIds`；列表 `core/nearby` 实际显示会退化成“整个 bodyRange 全开” | 核心层和近邻层无法按规则只保留壳层、焦点块和有限邻居，用户看到的范围过大且不稳定 |
| GAP-002 | P0 | 标题块 `nearby` 应显示“前一个段落 + 当前标题 + 后一个正文块” | `src/service/backlink/backlink-source-window.js` | 标题 `nearby` 目前只是向前/向后找“最近的非标题兄弟块”，没有区分“段落/正文块”和“结构容器块”，规则语义被简化了 | 标题行反链在列表、表格、容器邻接场景下会取错上下文，用户反馈的“标题行近邻不对”与此一致 |
| GAP-003 | P0 | `startBlockId / endBlockId` 必须反映真实正文边界 | `src/service/backlink/backlink-source-window.js`, `src/components/panel/backlink-document-interaction.js` | 非列表 `nearby` 会把 `startBlockId` 改写为列表项的第一个子块，而不是结构壳本身；渲染层又直接拿这个值作为 `scrollAttr.startId` | 会出现标题壳、列表项壳或标题前衔接块被跳过，形成“标题内容缺失未显示”或边界内容不完整 |
| GAP-004 | P0 | 正文区间外内容不能被偷偷带回正文 | `src/components/panel/backlink-protyle-dom.js` | `collectVisibleBlockIdsFromExpandedListShells` 会把不在 `windowBlockIds` 内的列表项内联后代重新加回可见集合 | `bodyRange` 不再是唯一事实来源，正文边界会被 DOM 展开逻辑突破，导致“显示内容不完全按规则区间” |
| GAP-005 | P1 | 定位信息与正文范围分开计算 | `src/service/backlink/backlink-context.js`, `src/components/panel/backlink-document-row.js` | 当前 `metaInfo` 只有 `documentTitle`，UI 头部也只渲染“来源标签 + 摘要”；标题路径、列表路径没有建模也没有展示 | 用户缺少“这条反链属于哪个标题节/列表层级”的定位线索，容易误判正文是否正确 |
| GAP-006 | P1 | 标题块 `extended` 应从“标题前一个段落所在标题节”向上扩展 | `src/service/backlink/backlink-source-window.js` | 标题 `extended` 向上扩展时仅依据 `focusIndex - 1` 所在位置反推最近标题；当标题前没有正文、只有另一个标题时，仍可能把前一节硬带入 | 标题节扩展边界在连续标题场景下不稳定，和正式规则仍有偏差 |
| GAP-007 | P1 | 正文顺序与规则必须以真实渲染链路验证 | `tests/backlink-source-window.test.js`, `tests/backlink-protyle-dom.test.js`, `tests/backlink-document-interaction.test.js` | 现有测试大多是 planner 级合成数组，缺少 `scrollAttr + Protyle DOM + sourceWindow` 联合验证，也缺少标题路径/列表路径 UI 断言 | 旧测试可以通过，但用户仍能在真实界面看到标题缺失、边界错位、展开态不符合规则 |

## 4. Module Analysis

| Module | Files | Current Responsibility | Main Issue | Target State |
| --- | --- | --- | --- | --- |
| planner | `src/service/backlink/backlink-source-window.js` | 生成 `bodyRange / orderedVisibleBlockIds / collapsedBlockIds` | 边界、壳层、折叠策略没有形成单一可执行契约 | 输出“连续区间 + 合法折叠策略 + 不跳壳层”的统一 planner |
| DOM filtering | `src/components/panel/backlink-protyle-dom.js` | 根据窗口隐藏或保留 DOM 块 | 仍存在把窗口外后代重新带回来的逻辑 | 只隐藏窗口外块；结构展开不能突破 `bodyRange` |
| render entry | `src/components/panel/backlink-document-interaction.js` | 生成 `scrollAttr` 并驱动 Protyle 加载 | 直接信任被改写过的 `startBlockId / endBlockId`，导致边界块缺失 | 渲染入口严格加载 planner 定义的真实区间 |
| explanation/meta | `src/service/backlink/backlink-context.js`, `src/components/panel/backlink-document-row.js` | 生成来源摘要并在头部展示 | 缺少标题路径、列表路径等定位元信息 | 正文与定位信息严格分层，且头部能完整解释“这条反链属于哪里” |
| tests | `tests/backlink-source-window.test.js`, `tests/backlink-protyle-dom.test.js`, `tests/backlink-document-interaction.test.js`, `tests/backlink-document-row.test.js` | 规则回归保护 | 真实渲染链路覆盖不足，旧断言掩盖了 integration gap | 用规则样例覆盖 planner、渲染、DOM、头部四层 |

## 5. Prioritized Backlog

| ID | Priority | Scope | Files | Objective | Risk | Pre-Implementation Checklist | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF-CTX-011 | P0 | 折叠策略真正落地 | `src/service/backlink/backlink-source-window.js`, `src/components/panel/backlink-protyle-dom.js`, `src/components/panel/backlink-protyle-rendering.js`, 相关测试 | 让 `orderedVisibleBlockIds / collapsedBlockIds` 真正驱动列表 `core/nearby` 的展开范围，但绝不突破 `bodyRange` | High | - [x] 列表 `core` 只见壳层 + 焦点 + 必要标题文本; - [x] 列表 `nearby` 只见邻居壳层和允许的首层直接子项; - [x] 不再默认显示整棵子树 | done |
| RF-CTX-012 | P0 | 标题 `nearby` 专用 planner | `src/service/backlink/backlink-source-window.js`, `tests/backlink-source-window.test.js`, `tests/backlink-document-interaction.test.js` | 不再用“最近非标题块”代替正式规则，改成“前一个段落 + 当前标题 + 后一个正文块”的显式算法 | High | - [x] 前一块为列表容器; - [x] 前一块为连续标题; - [x] 后一块为列表/表格/引述; - [x] 无前段落时不能误拉上一个标题节 | done |
| RF-CTX-013 | P0 | 修正 `startBlockId / endBlockId` 与真实区间的一致性 | `src/service/backlink/backlink-source-window.js`, `src/components/panel/backlink-document-interaction.js`, 相关测试 | 移除会跳过壳层的边界改写，保证 `scrollAttr` 加载的区间与正文规则一致 | High | - [x] 标题前列表项不会被截掉壳层; - [x] 邻居为列表项时标题文本不丢; - [x] Protyle 首次渲染包含边界结构块 | done |
| RF-CTX-014 | P0 | DOM 不能突破 planner 窗口 | `src/components/panel/backlink-protyle-dom.js`, `tests/backlink-protyle-dom.test.js` | 移除“可见列表壳自动把窗口外内联后代带回”这类越界逻辑 | High | - [x] 所有可见块都属于 `windowBlockIds` 或祖先容器; - [x] 展开列表壳不会额外露出窗口外正文; - [x] 正文顺序保持原文顺序 | done |
| RF-CTX-015 | P1 | 标题节扩展规则补齐 | `src/service/backlink/backlink-source-window.js`, `tests/backlink-source-window.test.js` | 把标题 `extended` 改为严格基于“标题前一个段落所在节 + 当前标题节”，避免连续标题误扩展 | Medium | - [x] 当前标题前仅有标题时不误拉上节; - [x] 当前标题前有正文时按正文所属节向上扩; - [x] 多级标题边界保持同级或更高级切断 | done |
| RF-CTX-016 | P1 | 增加标题路径/列表路径定位层 | `src/service/backlink/backlink-context.js`, `src/components/panel/backlink-document-row.js`, `src/models/backlink-model.ts`, 相关测试 | 在 explanation/meta 层补齐 `headingPath`、`listPath`，头部显式展示定位信息 | Medium | - [x] 文档名、标题路径、列表路径不进入正文; - [x] 头部能解释“所属标题节”; - [x] 搜索命中摘要与路径信息分层显示 | done |
| RF-CTX-017 | P1 | 规则样例 integration 回归 | `tests/backlink-source-window.test.js`, `tests/backlink-protyle-dom.test.js`, `tests/backlink-document-interaction.test.js`, `tests/backlink-document-row.test.js` | 把用户反馈场景做成跨 planner/DOM/UI 的回归测试矩阵 | Medium | - [x] 扩展态按所属标题节显示; - [x] 标题内容不缺失; - [x] 标题行近邻正确; - [x] 内容顺序与原文一致; - [x] 中间无缺口 | done |
| RF-CTX-018 | P2 | 清理旧计划与兼容语义 | `docs/refactor-plan.md`, `docs/反链上下文基线与术语表.md`, 相关注释 | 把“已完成但未闭环”的旧描述清理掉，避免后续判断失真 | Low | - [x] 文档状态与代码状态一致; - [x] 保留兼容说明但不再误标 done | done |

Priority definition:

- `P0`: 直接影响规则正确性或用户当前可见行为
- `P1`: 影响定位解释、边界稳定性和回归保护
- `P2`: 文档与兼容清理

## 6. Pre-Refactor Test Matrix

### Planner

1. 标题块 `nearby` 前一块是段落、列表、连续标题三种情况。
2. 标题块 `extended` 前面有正文、没有正文、前面只有低级标题三种情况。
3. 普通块 `nearby` 邻居为列表项、列表容器、标题三种情况。
4. 列表子块 `core` 只展示壳层、必要标题文本和焦点块，其他后代默认折叠。
5. 列表子块 `nearby` 只展示当前项、前后同级项，以及规则允许的直接子项。

### DOM / Rendering

1. `scrollAttr.startId / endId` 与 `bodyRange.startBlockId / endBlockId` 一致。
2. `windowBlockIds` 内不允许缺口，窗口外块不允许回流进入正文。
3. 展开可见列表壳时，窗口外后代不能被补回。
4. 标题壳、列表壳、焦点块在首次渲染时都能出现在 DOM 中。

### Header / Meta

1. 文档头部显示文档名、标题路径、列表路径、命中来源、摘要。
2. 标题路径和列表路径不参与正文裁剪。
3. 没有路径信息时有明确降级行为，不伪装成正文。

## 7. Execution Order

1. 先做 `RF-CTX-017` 中最小失败测试，复现用户反馈的 5 类问题。
2. 再执行 `RF-CTX-013` 和 `RF-CTX-012`，先把错误边界和缺失标题修正。
3. 接着执行 `RF-CTX-011` 和 `RF-CTX-014`，让折叠策略和 DOM 过滤重新闭环。
4. 然后执行 `RF-CTX-015`，补齐标题节扩展边界。
5. 最后执行 `RF-CTX-016` 和 `RF-CTX-018`，补定位层和文档同步。

## 8. Approval Gate

建议先批准以下实现顺序：

1. `RF-CTX-017`
2. `RF-CTX-013`
3. `RF-CTX-012`
4. `RF-CTX-011`
5. `RF-CTX-014`

这五项先完成后，才能判断“扩展态不按标题节显示、标题内容缺失、标题近邻错误、顺序异常、内容缺口”是否已经被根治；`RF-CTX-015` 和 `RF-CTX-016` 适合在主链稳定后继续推进。

## 9. Execution Log

| ID | Date | Result | Evidence |
| --- | --- | --- | --- |
| RF-CTX-011 | 2026-03-18 | done | `node --test tests/backlink-protyle-rendering.test.js`; `node --test tests/*.test.js`; `npm run build` |
| RF-CTX-012 | 2026-03-18 | done | `node --test tests/backlink-source-window.test.js`; `node --test tests/*.test.js` |
| RF-CTX-013 | 2026-03-18 | done | `node --test tests/backlink-source-window.test.js`; `node --test tests/backlink-document-interaction.test.js`; `node --test tests/*.test.js` |
| RF-CTX-014 | 2026-03-18 | done | `node --test tests/backlink-protyle-dom.test.js`; `node --test tests/*.test.js` |
| RF-CTX-015 | 2026-03-18 | done | `node --test tests/backlink-source-window.test.js`; `node --test tests/*.test.js` |
| RF-CTX-016 | 2026-03-18 | done | `node --test tests/backlink-document-row.test.js tests/backlink-context-fragments.test.js`; `node --test tests/*.test.js` |
| RF-CTX-017 | 2026-03-18 | done | `node --test tests/backlink-source-window.test.js tests/backlink-protyle-dom.test.js tests/backlink-protyle-rendering.test.js tests/backlink-document-row.test.js tests/backlink-context-fragments.test.js`; `node --test tests/*.test.js` |
| RF-CTX-018 | 2026-03-18 | done | 文档已同步更新本计划与基线说明 |
