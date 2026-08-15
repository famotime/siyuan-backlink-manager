# 反链管家 UI/UX 评审与优化方案

> 评审视角：互联网应用资深 UX 设计师
> 评审对象：反链面板（Dock / 文档底部 / 独立页签共用同一套组件）
> 依据：当前 UI 截图 + `src/components/panel/`、`src/index.scss`、`backlink-filter-panel-page.css` 代码调研
> 日期：2026-08-15

---

## 一、总体评价

面板整体信息架构清晰（工具栏 → 全局上下文切换 → 文档卡片列表），配色完全基于思源主题变量（`--b3-theme-*`），能跟随用户主题明暗切换，这是正确的技术路线。按钮全部为图标化呈现，方向符合"图标 + tooltip"的轻量工具栏范式。

但从专业 UX 角度看，当前 UI 存在 **视觉层级拥挤、控件尺寸偏小、图标体系不统一、tooltip 行为不一致、字号体系缺失** 五类系统性问题。窄栏（约 320px）场景下问题被进一步放大。

---

## 二、问题清单（按严重度排序）

### P0 — 影响可用性

**1. 触控/点击热区过小**
- 上下文切换 chip（核心/近邻/扩展/全文）高度由 `--backlink-chip-height` 控制，实测视觉高度约 20–22px；左右步进箭头按钮 `--backlink-btn-size: 22px`。
- 远低于主流规范（WCAG 2.5.5 建议 ≥ 44px，思源自身 `block__icon` 为 24–28px）。Dock 窄栏中鼠标精准点击成本高。
- 证据：截图中 chip 与箭头排成一行仅约 24px 高，文字 11px。

**2. 双套上下文切换条造成视觉噪音**
- 全局切换条（面板头部）+ 每个文档卡片各一条切换条，样式相同、纵向间距极小。截图中"核心/近邻/扩展/全文"在首屏出现 2 次，用户难以立刻分辨"上面那条控制全局、下面这条控制本文档"。
- 无分组标题或视觉区分，属于典型的"重复控件歧义"问题。

**3. 卡片内信息层级混乱**
- 第二个文档卡片（~Skills-llm-wiki）中，面包屑、正文标题"页面头信息"、列表正文、HTML 注释残留 `<!-- network-lens-wiki-section:intro -->` 混排。注释文本直接暴露给最终用户，属于渲染数据未清洗的缺陷。
- 长 ISO 时间戳 `2026-05-10T05:30:36.345Z` 未格式化，破坏阅读节奏并造成文本折行。

### P1 — 影响一致性

**4. 图标双轨制**
- 面板内部按钮（刷新/重置/折叠/展开全部）使用内联 feather 风格 stroke SVG（`stroke="currentColor"`，viewBox 24×24）；
- 文档卡片左右箭头、文档图标却用思源 sprite（`<use xlink:href="#iconLeft"/#iconFile">`）——思源 sprite 多为填充型或混合风格；
- `CUSTOM_ICON_MAP`（`src/models/icon-constant.ts`）已注册 5 个自定义 symbol，但面板内按钮并未复用。
- 结果：同一屏内线宽、端点、尺寸基准不一致（14px 内联 vs 思源原生尺寸），细看能感到"两套图标拼在一起"。

**5. Tooltip 行为不可控且不一致**
- 全部 tooltip 依赖思源 `aria-label` + `b3-tooltips b3-tooltips__sw` class，无 `title` 兜底；方向全部硬编码为 `__sw`（左下），在独立页签宽场景下位置并不总是最优。
- 展开/折叠按钮 aria-label 为多行文本（区分左右键），提示冗长。
- 面包屑、"1/1" 分页进度等可悬停元素无 tooltip（如"1/1"未说明是"第 1 条 / 共 1 条反链"）。

**6. 字号无体系，硬编码散落**
- 无全局 font-size 定义；CSS 中硬编码 12px（搜索框、排序、进度、摘要）、11px（chip、面包屑）、10px（面包屑分隔符）共 3 档+，未抽象为 token。
- 10px 已低于多数系统 UI 可读性下限。

**7. 样式工程债**
- 两份样式文件（`index.scss` 84 行 + `backlink-filter-panel-page.css` 497 行）职责交叠；SCSS 未使用变量/嵌套等任何 SCSS 特性。
- 文档卡片 HTML 由 `backlink-document-row.js` 字符串模板生成（非 Svelte），与面板其余 Svelte 组件并存，样式覆盖与排查成本高。
- design token（`--backlink-chip-*` 等）只定义在 `.backlink-panel__area` 作用域，未形成全局 token 层。

### P2 — 体验优化空间

**8. 搜索框与排序控件**
- 搜索框 placeholder "搜索关键词…"未说明支持多词过滤；清除按钮（×）仅在聚焦/有值时出现，发现性弱。
- 排序 `<select>` 仅显示"修改时间降序"，无前导图标，与其他图标化控件风格断裂。

**9. 统计文案弱化**
- "共 2 个反链文档"为普通 12px 灰字，夹在工具栏与全局切换条之间，缺乏"结果摘要"的层级定位。

**10. 空态/加载态未在截图中体现**，代码中亦未见独立的空态插画/引导设计（建议补查 `backlink-results-panel.svelte` 空列表分支）。

---

## 三、优化方案

### 3.1 建立设计 Token 层（地基，优先做）

新建 `src/styles/tokens.scss`，把散落的硬编码值收敛为语义化 token，全部基于思源变量派生：

```scss
.backlink-panel__area {
  /* 尺寸体系 —— 以思源 block__icon 为基准 */
  --bl-control-height: 28px;        // 所有可点控件最小高度（原 22px）
  --bl-icon-size: 16px;             // 面板内图标统一基准（原 14px 混用）
  --bl-chip-height: 26px;           // 上下文 chip 高度（原 ~21px）
  --bl-radius-s: 6px;
  --bl-radius-m: 10px;

  /* 字号阶梯（4 档，消灭 10px） */
  --bl-font-xs: 11px;   // 辅助信息（面包屑、进度）
  --bl-font-s: 12px;    // 正文辅助（摘要、输入框）
  --bl-font-m: 13px;    // 正文
  --bl-font-l: 15px;    // 卡片标题

  /* 间距阶梯 4px 基网 */
  --bl-space-1: 4px; --bl-space-2: 8px; --bl-space-3: 12px; --bl-space-4: 16px;

  /* 颜色全部引用思源变量，禁止新增 hex */
  --bl-active-bg: color-mix(in srgb, var(--b3-theme-primary) 12%, transparent);
}
```

规则：**面板内新增样式只允许引用 token，禁止字面量 px 颜色/字号**；将 `index.scss` 与 `backlink-filter-panel-page.css` 合并为 `styles/panel.scss` + `styles/tokens.scss` 两个文件。

### 3.2 统一图标体系（线框图标 + 统一 tooltip）

1. **收编到 symbol 雪碧图**：将面板内所有内联 feather SVG 迁入 `CUSTOM_ICON_MAP`（`src/models/icon-constant.ts`），统一 `viewBox="0 0 24 24"`、`stroke-width="2"`、圆角端点、填充 `none` 的显式线框风格；文档卡片内的 `#iconLeft/#iconRight` 替换为同风格自绘 chevron symbol，仅文档类型图标（`#iconFile` 等）保留思源 sprite（因需跟随块类型映射）。
2. **新增 `src/utils/svg-icon.ts`**：`renderIcon(name, size?)` 输出 `<svg class="bl-icon"><use xlink:href="#iconBl{name}"/></svg>`，一处定义尺寸与 class，消灭内联 path 复制。
3. **Tooltip 封装**：统一使用思源 `aria-label` + `b3-tooltips` 机制，但新增 helper `withTooltip(el, text, dir?)`：
   - 方向按宿主自动选择（Dock 窄栏用 `__sw`，独立页签用 `__s`）；
   - 单行短文案（≤12 字），禁止多行；
   - 补齐缺失 tooltip：`1/1` → "第 1 条 / 共 1 条反链"、面包屑末级 → 完整路径、统计行 → "当前文档被 2 篇文档引用"。

### 3.3 布局与层级重构

```
┌─────────────────────────────┐
│ 反链管家          ⟳ ↺ ⤢ ▲   │  ← 标题栏：图标按钮 28px 热区
│ 🔍 搜索(支持多词,空格分隔) ⬇│  ← 工具栏：搜索 + 排序合并一行
│ 共 2 个反链文档              │  ← 结果摘要：--bl-font-xs，左对齐
│─────────────────────────────│
│ [全局] ‹ 核心 近邻 扩展 全文 ›│  ← 全局条加"全局"前缀标签，与卡片条区分
│─────────────────────────────│
│ ▼ 📄 文档标题          ‹1/1› │
│   ‹ 核心 近邻 扩展 全文 ›    │  ← 卡片条缩进一级，视觉上从属于卡片
│   面包屑(可悬停看完整路径)    │
│   ┌─ 渲染内容（清洗后） ─┐   │
└─────────────────────────────┘
```

要点：
- 全局切换条左侧增加 11px 灰色"全局"前缀，卡片切换条增加 12px 左缩进，消除重复控件歧义（问题 2）；
- chip 高度提升至 26px、字号 12px，选中态保留 `color-mix` 浅底 + 600 字重；
- 所有图标按钮热区 ≥ 28px（视觉图标 16px + padding），相邻按钮间距 ≥ 4px。

### 3.4 内容渲染清洗

- 渲染管线出口（`backlink-render-data.js`）增加 `sanitizeContent()`：剥离 HTML 注释节点、连续空行；这是 bug 级修复（问题 3）。
- 时间戳统一 `formatDateTime()` → `2026-05-10 05:30`（本地时区，秒与毫秒省略）。
- 面包屑超过 3 级时折叠为 `首级 › … › 末级`，悬停 tooltip 显示完整路径。

### 3.5 搜索与排序

- placeholder 改为"搜索关键词，空格分隔多词"；
- 排序 select 前加排序线框图标（已有 symbol 可复用），保持工具栏视觉语言一致；
- 输入有值时清除按钮常驻显示（不仅聚焦时）。

### 3.6 空态与加载态

- 空列表：居中线框图标（link-slash 风格）+ "当前文档暂无反向链接" + 一行灰色提示；
- 加载：骨架屏 2 条卡片占位，避免布局跳动。

### 3.7 落地节奏建议

| 阶段 | 内容 | 涉及文件 |
|---|---|---|
| 第一步 | token 层 + 热区/字号提升 + 注释清洗 + 时间格式化 | `styles/tokens.scss`、`backlink-filter-panel-page.css`、`backlink-render-data.js` |
| 第二步 | 图标 symbol 收编 + `svg-icon.ts` + tooltip helper | `icon-constant.ts`、新增 `utils/svg-icon.ts`、panel 各组件 |
| 第三步 | 全局/卡片切换条视觉区分 + 空态骨架屏 | `backlink-results-panel.svelte`、`backlink-document-row.js` |
| 持续 | 字符串模板卡片逐步 Svelte 化（降低维护成本） | `backlink-document-row.js` → `.svelte` |

每步均需按仓库规范在 `tests/` 补充/更新 `node:test` 用例（尤其 sanitize 与时间格式化纯函数），并同步 `public/i18n/` 文案与 `plugin.json`。

---

## 四、验收清单

- [ ] 面板内无任何硬编码 hex 颜色与 10px 字号
- [ ] 所有可点元素热区 ≥ 28px，chip ≥ 26px
- [ ] 同一屏内图标全部为线框风格、同一尺寸基准（文档类型图标除外）
- [ ] 所有图标按钮与进度/面包屑均有单行 tooltip，方向随宿主自适应
- [ ] 渲染内容中不再出现 HTML 注释与未格式化时间戳
- [ ] 全局与卡片上下文切换条在 320px 窄栏下可一眼区分
- [ ] 明暗两套思源主题下对比度均通过目测检查

---

## 五、实施记录

> 实施日期：2026-08-15。以下记录每步实际落地的文件与相对原方案的偏差。

### 第一步：token 层 + 热区/字号提升 + 内容清洗

- 新增 `src/styles/tokens.scss`：`.backlink-panel__area` 作用域定义 `--bl-control-height: 28px`、`--bl-icon-size: 16px`、`--bl-chip-height: 26px`、字号阶梯 `--bl-font-xs/s/m/l`（11/12/13/15px）、4px 基网间距、`--bl-active-bg`（color-mix + `--b3-theme-primary`）；旧 `--backlink-*` 变量全部保留并引用新 token 做兼容层。
- `src/index.scss` 顶部 `@use "./styles/tokens.scss";` 引入 token 层。
- `src/components/panel/backlink-filter-panel-page.css`：chip 26px/12px、按钮热区 28px、文档导航箭头以 padding+负 margin 扩热区至 28px（布局不变）、搜索/排序框 28px、全部硬编码字号替换为 token（消灭 10px）；配色仍全部走思源变量。
- 新增 `src/service/backlink/backlink-content-sanitize.js`：`sanitizeBacklinkContent()`（剥离 HTML 注释、压缩连续空行、内联 ISO 时间戳格式化）与 `formatBacklinkDateTime()`（ISO → 本地 `YYYY-MM-DD HH:mm`）。
- 接线点：`src/service/backlink/backlink-render-data.js` 的 `getBatchBacklinkDoc`（内核 dom 唯一赋值点，与原有 `search-mark` 清理同处）。
- 测试：`tests/backlink-content-sanitize.test.js` 新增 8 用例。
- 偏差：css→scss 合并按约定留待后续；卡片内导航箭头热区采用 padding 扩展而非改 DOM 结构。

### 第二步：图标体系统一 + tooltip 封装

- `src/models/icon-constant.ts`：新增 11 个统一线框 symbol（`iconBlPanelLogo/Refresh/ExpandAll/CollapseAll/ChevronUp/Down/Left/Right/Search/Clear/EmptyLink`，viewBox 24×24、stroke-width 2、圆角端点、fill none），随既有 `addIcons` 循环自动注册；文档类型图标 `#iconFile` 保留思源 sprite。
- 新增 `src/utils/svg-icon.ts`：`renderIcon(iconId, size?)` 输出 `<svg class="bl-icon"><use .../></svg>`，默认尺寸 `var(--bl-icon-size)`。
- 新增 `src/utils/tooltip.ts`：`getBacklinkTooltipDirection()` / `buildBacklinkTooltipClass()`（dock→`__sw`，其余→`__s`）、`buildBacklinkProgressTooltip()`（"1/1"→"第 1 条 / 共 1 条反链"）。
- `backlink-results-panel.svelte`：全部内联 feather SVG 替换为 `{@html renderIcon(...)}`；展开/折叠全部按钮的多行 aria-label 拆为单行短文案（右键说明移至 title）；搜索 placeholder 改走 i18n `searchPlaceholder`；排序 select 前加 `iconContentSort` 前导图标；统计行补 aria-label（i18n `backlinkSummaryTooltip`）。
- `backlink-document-row.js`：卡片内左右箭头与上下文步进箭头从思源 `#iconLeft/#iconRight` 换成 `iconBlChevron*` symbol；文档标题 tooltip 缩短为「左键打开，右键右侧打开」；分页进度补 tooltip。
- i18n：`public/i18n/` 与 `src/i18n/` 两份 zh_CN/en_US 各新增 `searchPlaceholder`、`globalContextPrefix`、`backlinkSummaryTooltip`、`emptyBacklinkTitle`、`emptyBacklinkHint`。plugin.json 无需变更（无新增设置项）。
- 偏差：① 面板宿主类型当前无运行时标识（dock/tab/bottom 共用同一组件），tooltip 方向 helper 已实现但 Svelte 模板暂统一用默认 `__sw`，待宿主标识接入后按方向自适应；② `backlink-document-row.js` 为 node --test 兼容，以带 `.ts` 扩展名方式导入 svg-icon/tooltip（Node 24 原生 type-stripping 与 Vite 均支持）；③ 卡片展开箭头 `.b3-list-item__arrow` 因控制器依赖其 class 做旋转，保留内联 svg 仅替换 symbol 引用。

### 第三步：全局/卡片切换条视觉区分 + 空态

- 全局切换条左侧新增 `backlink-context-global-label`「全局」前缀（i18n `globalContextPrefix`，11px 灰字）；卡片内切换条左缩进改为 12px（`--bl-space-3`），窄屏媒体查询缩至 8px。
- 面包屑折叠：`backlink-document-row.js` 新增纯函数 `collapseBacklinkBreadcrumbItems()`（超过 3 级折叠为「首级 › … › 末级」，省略项不可点击）与 `buildBacklinkBreadcrumbFullPath()`；面包屑行容器与末级项悬停展示完整路径。
- 空态：`backlink-results-panel.svelte` 新增居中 `iconBlEmptyLink` 线框图标 + 主文案 + 灰色辅助提示；加载态新增 2 条骨架屏卡片（shimmer 动画，纯思源变量配色）。
- 测试：新增 `tests/backlink-tooltip-icon.test.js`（renderIcon、tooltip 方向/进度文案、面包屑折叠与完整路径）；更新 `backlink-document-row.test.js` 标题 tooltip 断言。
- 收尾：全部 349 个 node:test 用例通过；`npm run build` 编译通过（dist/index.css 14.90 kB / index.js 189.41 kB）。
