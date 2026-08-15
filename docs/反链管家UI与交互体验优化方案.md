# 反链管家 UI 与交互体验优化方案

> **文档版本**：v1.0.0  
> **设计视角**：资深互联网应用 UX/UI 设计师  
> **适用范围**：思源笔记反链管家插件（侧边栏 Dock、文档底部嵌入、独立 Tab 页签、移动端）

---

## 目录

- [一、 体验愿景与设计总则](#一-体验愿景与设计总则)
- [二、 现状深度诊断与问题剖析](#二-现状深度诊断与问题剖析)
  - [1. 图标系统与渲染缺陷（高优先级）](#1-图标系统与渲染缺陷高优先级)
  - [2. Tooltip 提示系统与双重提示 Bug](#2-tooltip-提示系统与双重提示-bug)
  - [3. 布局与信息层次（窄侧栏 vs 宽底栏）](#3-布局与信息层次窄侧栏-vs-宽底栏)
  - [4. 上下文层级控制条的认知负荷](#4-上下文层级控制条的认知负荷)
  - [5. 色彩系统与主题兼容性（Token 机制）](#5-色彩系统与主题兼容性token-机制)
  - [6. 交互手势与可发现性（Discoverability）](#6-交互手势与可发现性discoverability)
- [三、 核心设计规范与重构方案](#三-核心设计规范与重构方案)
  - [1. 显式线框图标系统规范（Explicit Wireframe Icons）](#1-显式线框图标系统规范explicit-wireframe-icons)
  - [2. 直观图标 + 统一 Tooltip 交互矩阵](#2-直观图标--统一-tooltip-交互矩阵)
  - [3. 上下文控制器（Segmented Control）重塑](#3-上下文控制器segmented-control重塑)
  - [4. 响应式布局与控件自适应策略](#4-响应式布局与控件自适应策略)
  - [5. 统一色彩与无障碍（Accessibility）Token](#5-统一色彩与无障碍accessibilitytoken)
- [四、 模块级优化蓝图与代码范式](#四-模块级优化蓝图与代码范式)
  - [1. 面板头部与过滤工具栏（Svelte）](#1-面板头部与过滤工具栏svelte)
  - [2. 单文档卡片与列表行构造（JS DOM）](#2-单文档卡片与列表行构造js-dom)
  - [3. 全局 CSS 隔离与线框图标防护补丁](#3-全局-css-隔离与线框图标防护补丁)
- [五、 实施演进路线图（Roadmap）](#五-实施演进路线图roadmap)

---

## 一、 体验愿景与设计总则

反链管家作为思源笔记中链接知识网络的核心辅助工具，其体验愿景为：**“清晰聚焦、无缝融入、直观敏捷、精致克制”**。

```
                   ┌────────────────────────────────────────┐
                   │          反链管家 UX 核心原则          │
                   └───────────────────┬────────────────────┘
                                       │
         ┌──────────────────┬──────────┴─────────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
   【无缝融入】        【直观敏捷】         【清晰聚焦】        【精致克制】
 与思源原生风格契合   图标+提示即看即用    层级明确无视觉杂音   减少硬编码与厚重装饰
```

1. **原生融入感（Native Integration）**：深度继承思源笔记的设计语言（SiYuan Design Tokens），支持所有官方与社区第三方主题（浅色/深色/高对比度），不引入突兀的第三方样式风格。
2. **轻量与直观（Direct & Frictionless）**：操作按钮尽量采用“**直观线框图标 + 统一气泡 Tooltip**”呈现，减少文字占用空间，扩大可视阅读区。
3. **环境自适应（Context-Aware Layout）**：针对 Dock 侧边栏（狭窄）、正文底部（宽阔）、独立 Tab 页签（全屏）三种完全不同的宿主空间，提供针对性的信息密度与排版弹性。
4. **确定性与可预期反馈（Predictable Feedback）**：每一次状态切换（如上下文层级调整、文档折叠、翻页）都有明确的视觉指示，杜绝隐蔽且无提示的交互手势。

---

## 二、 现状深度诊断与问题剖析

### 1. 图标系统与渲染缺陷（高优先级）

* **思源全局 CSS 污染导致线框图标变成黑色色块**：
  * 思源笔记全局样式对 `svg`、`.b3-list-item__graphic`、`.block__icon svg` 等存在 `fill: currentColor` 的强制设定。
  * 现有的线框图标（基于 stroke 描边设计）在渲染时，被全局 CSS 强制填充了封闭区域，导致线框图标失真或变成纯黑块面。
* **图标风格混杂，视觉语言割裂**：
  * 目前混合使用了思源内置符号（如 `#iconLink`, `#iconRefresh`, `#iconUp`, `#iconDown`, `#iconContract`, `#iconExpand`）以及自定义的复杂面性图标（如 `#iconResetInitialization` 是一个 1024x1024 复杂实心魔棒图案）。
  * 图标在笔画粗细（stroke-width）、视觉重心、端点样式（round vs square）上缺乏统一规范。
* **按钮点击热区（Hitbox）不合格**：
  * 在单文档行中的翻页按钮（`previous-backlink-icon`、`next-backlink-icon`）直接使用原生 `<svg>` 挂载点击事件，没有包裹容器，导致触控/点击面积过小（仅约 12px~14px），极易误触，且缺少 Hover 背景圆角反馈。

### 2. Tooltip 提示系统与双重提示 Bug

* **双重 Tooltip 冲突（原生 Title 与主题气泡叠加）**：
  * 在 `backlink-document-row.js` 中，文档标题同时设置了 `aria-label="${truncatedAriaText}"` 与 `title="${BACKLINK_DOCUMENT_TITLE_TOOLTIP}"`，且带有 `ariaLabel` 类。
  * **后果**：鼠标悬停时，浏览器原生的黄色/黑色方形悬浮框与思源的主题黑色圆角气泡同时弹出，两者重叠错位，产生严重视觉瑕疵。
* **Tooltip 机制分裂**：
  * 视图中混用了两种思源机制：一处使用 `.b3-tooltips.b3-tooltips__sw`（CSS 伪元素驱动），另一处使用 `.ariaLabel`（思源 JS 驱动），导致气泡延迟时间、动画、位置方向不统一。
* **重要高级操作缺少 Tooltip 发现途径**：
  * 折叠/展开全部按钮支持**右键（Context Menu）折叠或展开列表项节点**，但目前 Tooltip 只写了“折叠所有文档”，用户完全无法感知到右键功能的存在。
  * 文档标题支持“左键在主窗口打开，右键在右侧分屏打开”，提示文案仅在 title 中且容易被截断。

### 3. 布局与信息层次（窄侧栏 vs 宽底栏）

```
[ 当前窄侧栏工具栏拥挤现状 ]
┌──────────────────────────────────────────────────────────┐
│ [搜索关键词...            ] [按原文内容顺序 ▼] [折叠图标] │  ← 在 260px 宽度下
└──────────────────────────────────────────────────────────┘     选择框文本严重截断！
```

* **窄侧边栏（宽度 240px~320px）工具栏横向挤压**：
  * 搜索输入框、排序下拉框（`select`）、全部折叠按钮被强行挤在单行（`padding: 5px 15px; gap: 8px;`）。当侧边栏较窄时，下拉选择框的文字会被裁切成省略号，搜索框也被压至极窄。
* **顶部 TitleBar 间距硬编码**：
  * 标题栏使用了 `<span class="fn__space"></span>` 进行多重占位，间距不均匀，在不同分辨率下容易发生按钮换行或溢出。
* **正文底部嵌入时的边缘留白不统一**：
  * 目前采用定时轮询（`intervalSetNodePaddingBottom` 50ms）动态获取正文 padding，存在微小的布局抖动（Layout Shift）风险。

### 4. 上下文层级控制条的认知负荷

```
[ 当前上下文层级条现状 ]
( < )  [ 核心 ]  [ 近邻 ]  [ 扩展 ]  [ 全文 ]  ( > )  预算提示文本
```

* **状态 Chip 尺寸过小与排版失调**：
  * 胶囊 Chip（`backlink-chip--flat`）的高度仅为 14px~18px，字体 12px，内边距过窄，部分系统默认字体渲染时文字会上下偏离基准线。
* **层级含义缺乏即时解释**：
  * “核心 / 近邻 / 扩展 / 全文” 4 个状态对于新用户而言较为抽象，鼠标悬停在各 Chip 上时没有任何 Tooltip 说明该档位的作用范围（如：“近邻：显示前后关联段落与父级结构”）。
* **全局控制器与单文档控制器视觉样式未分级**：
  * 全局控制器与每个文档卡片内的局部控制器样式完全相同，缺乏主从层次区分，界面重复元素过多，容易产生“视觉噪音”。

### 5. 色彩系统与主题兼容性（Token 机制）

* **硬编码颜色导致主题割裂**：
  * `backlink-filter-panel-page.css` 中存在多处写死色值：
    * `--backlink-chip-primary-surface: rgba(26, 188, 156, 0.12);`（固定青绿色）
    * `--backlink-chip-primary-border: rgba(26, 188, 156, 0.24);`
  * 当用户使用思源官方或社区的蓝色、紫色、暖橙色或深黑主题时，该青绿色无法自适应，破坏整体视觉协调。
* **高亮标色与暗黑模式适配**：
  * 搜索关键字高亮采用 `::highlight(search-result-mark)`，在部分不支持 Custom Highlight API 的旧版内核下缺少降级背景色保障。

### 6. 交互手势与可发现性（Discoverability）

* 缺乏清晰的空状态（Empty State）插画或引导图文。
* 搜索框缺少一键清空（Clear）按钮，用户修改关键词必须手动全选删除。

---

## 三、 核心设计规范与重构方案

### 1. 显式线框图标系统规范（Explicit Wireframe Icons）

针对思源笔记全局 CSS 会强行覆盖 `fill` 的问题，建立**显式线框图标规范**：

#### 强制防御规则
1. **行内关键属性防御**：在每个 `<svg>` 标签上显式声明 `style="fill: none !important;"`。
2. **统一描边与几何网格**：
   * `viewBox="0 0 24 24"`（统一采用 24x24 矢量网格）
   * `stroke="currentColor"`（颜色跟随当前文本色或主题强调色）
   * `stroke-width="1.75"`（保持适中的精细度，既不过粗也不过细）
   * `stroke-linecap="round"`、`stroke-linejoin="round"`（圆润优雅的端点）

```html
<!-- 标准显式线框图标代码范例 -->
<svg class="b3-icon b3-icon--wireframe" viewBox="0 0 24 24" style="fill: none !important;" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="..."/>
</svg>
```

#### 统一线框图标字典（Icon System Mapping）

| 功能 | 原图标使用 | 规范重构后（显式线框 SVG） | 视觉语义 |
| :--- | :--- | :--- | :--- |
| **反链管家 Logo** | `#iconLink` (面性) | `<svg viewBox="0 0 24 24" style="fill:none!important;" ...><path d="M9 15l6-6M11 6l2-2a4.24 4.24 0 0 1 6 6l-2 2M13 18l-2 2a4.24 4.24 0 0 1-6-6l2-2"/></svg>` | 双环链接 |
| **刷新反链** | `#iconRefresh` (部分填充) | `<svg viewBox="0 0 24 24" style="fill:none!important;" ...><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8M21 3v5h-5"/></svg>` | 旋转循环箭头 |
| **恢复默认** | `#iconResetInitialization` (复杂实心魔棒) | `<svg viewBox="0 0 24 24" style="fill:none!important;" ...><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M3 12a9 9 0 0 0 15 6.7L21 16M21 21v-5h-5"/></svg>` 或 简约旋转重置 | 状态重置 |
| **搜索与清空** | 无清空图标 | `<svg viewBox="0 0 24 24" style="fill:none!important;" ...><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>` / `<path d="M18 6L6 18M6 6l12 12"/>` | 放大镜 / 叉号 |
| **展开/折叠全部** | `#iconContract`/`#iconExpand` | `<svg viewBox="0 0 24 24" style="fill:none!important;" ...><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>` | 四角向内/向外汇聚 |
| **上下文层级步进** | `#iconLeft`/`#iconRight` (填充箭头) | `<svg viewBox="0 0 24 24" style="fill:none!important;" ...><path d="M15 18l-6-6 6-6"/></svg>` / `<path d="M9 18l6-6-6-6"/>` | 简约线框 Chevron |
| **上一块/下一块** | 直接点击 svg 无边框 | `<button class="backlink-nav-btn"><svg viewBox="0 0 24 24" style="fill:none!important;" ...><path d="M15 18l-6-6 6-6"/></svg></button>` | 容器化触控键 |

---

### 2. 直观图标 + 统一 Tooltip 交互矩阵

#### Tooltip 技术规范
1. **统一使用思源原生气泡体系**：
   * 优先使用 class 标记：`class="block__icon ariaLabel"` 或 `class="b3-tooltips b3-tooltips__sw"`。
   * 必须**移除所有 HTML 原生 `title` 属性**，杜绝浏览器原生黄色方形提示与思源气泡发生双重渲染。
2. **气泡方向规则**：
   * 顶部/工具栏按钮：`b3-tooltips__sw`（左下方弹出）或 `b3-tooltips__s`（正下方弹出）。
   * 列表项内右侧按钮：`b3-tooltips__w`（左侧弹出）或 `b3-tooltips__nw`（左上方弹出），防止被窗口边缘裁切。
   * 底部悬浮控制项：`b3-tooltips__n`（上方弹出）。

#### 交互与 Tooltip 矩阵一览表

| 控件位置 | 形式 | 推荐 Tooltip 文案 | 快捷手势 / 辅助说明 |
| :--- | :--- | :--- | :--- |
| **顶部 Logo** | 图标 + 标题 | `反链管家 (点击折叠/展开面板)` | 单击切换面板收起状态 |
| **顶部刷新按钮** | 显式线框刷新图标 | `刷新反链 (重新查询当前文档)` | 强制重新执行 SQL 查询 |
| **顶部恢复默认** | 显式线框重设图标 | `恢复默认设置与筛选条件` | 重置所有搜索词、排序与上下文层级 |
| **搜索框清空按钮** | 显式线框叉号图标 | `清空搜索内容` | 仅在有输入内容时显示 |
| **折叠/展开全部** | 显式线框聚合/展开 | `左键：折叠全部文档\n右键：折叠列表项节点` | **显式标明右键隐藏功能** |
| **全局上下文：上一步** | 显式线框 ChevronLeft | `全部文档：缩减一级上下文` | 快捷降级 |
| **全局上下文：下一步** | 显式线框 ChevronRight | `全部文档：扩展一级上下文` | 快捷升级 |
| **上下文 Chip：核心** | 胶囊按钮 (标签) | `核心层：仅展示直接命中的反链块` | 极致紧凑 |
| **上下文 Chip：近邻** | 胶囊按钮 (标签) | `近邻层：展示前后相邻段落及父级结构` | 推荐日常阅读 |
| **上下文 Chip：扩展** | 胶囊按钮 (标签) | `扩展层：展开所在章节完整内容` | 深度理解语境 |
| **上下文 Chip：全文** | 胶囊按钮 (标签) | `全文层：显示来源文档全部正文` | 完整审阅 |
| **单文档卡片：标题** | 文本超链接 | `左键：主窗口打开\n右键：右侧分屏打开` | 消除双重 title 干扰 |
| **单文档卡片：上一个** | 圆角容器线框图标 | `定位到上一条反链块 (P)` | 快捷翻页 |
| **单文档卡片：下一个** | 圆角容器线框图标 | `定位到下一条反链块 (N)` | 快捷翻页 |
| **单文档卡片：折叠箭头** | 显式线框旋转箭头 | `展开 / 折叠此文档的反链内容` | 独立控制该文档 |

---

### 3. 上下文控制器（Segmented Control）重塑

原有的上下文层级展示松散且尺寸偏小，重构为现代的**分段胶囊控制器（Segmented Control）**：

```
┌─────────────────────────────────────────────────────────────┐
│  ( < )  ┌────────┬─────────┬─────────┬────────┐  ( > )      │
│  上一级 │  核心  │ *近邻*  │  扩展   │  全文  │  下一级     │
│         └────────┴─────────┴─────────┴────────┘             │
└─────────────────────────────────────────────────────────────┘
  Hover 提示：近邻层：展示前后相邻段落及父级结构
```

* **视觉重构要点**：
  1. 采用外层浅色凹槽（`background: var(--b3-theme-surface-lighter)`）包裹 4 个子选项。
  2. 选中的项（Active State）使用浮起卡片效果（`background: var(--b3-theme-surface); box-shadow: 0 1px 3px rgba(0,0,0,0.1); color: var(--b3-theme-primary); font-weight: 500;`），并在切换时带有平滑过渡（`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`）。
  3. 控制器总高度提升至 `24px`，文字区域内边距适度放宽，保证垂直居中与舒适的视觉呼吸感。

---

### 4. 响应式布局与控件自适应策略

根据宿主容器宽度（通过 CSS Container Query 或 Flex 自动折行）自适应调整工具栏排版：

```
【宽屏模式 (>= 320px，如文档底部或宽侧栏)】
┌─────────────────────────────────────────────────────────────┐
│ [ 🔍 搜索关键词...      ⨂ ]  [ 排序方式 ▼ ]  [ ⤢ 全部折叠 ] │
└─────────────────────────────────────────────────────────────┘

【超窄侧栏模式 (< 320px)】
┌─────────────────────────────────────────────────────────────┐
│ [ 🔍 搜索关键词...                                      ⨂ ] │
├─────────────────────────────────────────────────────────────┤
│ [ 排序方式 ▼                       ]  [ ⤢ 全部折叠/展开 ]   │
└─────────────────────────────────────────────────────────────┘
```

* 当容器宽度受限时，搜索框自占一行，排序与操作按钮自动流式下沉，彻底解决下拉框文本截断的问题。

---

### 5. 统一色彩与无障碍（Accessibility）Token

彻底移除写死的 RGBA 颜色，全部映射至思源设计变量：

```css
/* 设计系统语义化 Token 映射 */
.backlink-panel__area {
    /* 胶囊背景：使用思源主题主色与透明度动态混合 */
    --backlink-active-bg: color-mix(in srgb, var(--b3-theme-primary) 12%, transparent);
    --backlink-active-border: color-mix(in srgb, var(--b3-theme-primary) 28%, transparent);
    --backlink-active-text: var(--b3-theme-primary);
    
    /* 容器与交互表面 */
    --backlink-surface-hover: var(--b3-list-icon-hover);
    --backlink-border-subtle: var(--b3-border-color);
    
    /* 按钮微交互 */
    --backlink-btn-size: 24px;
    --backlink-btn-radius: 6px;
    --backlink-transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 四、 模块级优化蓝图与代码范式

### 1. 面板头部与过滤工具栏（Svelte）

修改 `src/components/panel/backlink-results-panel.svelte` 中的图标与提示结构：

```html
<!-- 优化后的头部操作栏范例 -->
<div class="backlink-panel__header backlink-results-panel__header">
    <div
        class="panel__title backlink-panel__title"
        on:click={() => { panelBacklinkViewExpand = !panelBacklinkViewExpand; }}
        on:keydown={handleKeyDownDefault}
    >
        <!-- Logo 使用显式线框图标 -->
        <div class="block__logo fn__flex-center">
            <svg class="b3-icon b3-icon--wireframe" style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span style="font-weight: 600; margin-left: 6px;">反链管家</span>
        </div>
        <span class="fn__flex-1"></span>

        <!-- 刷新按钮：显式线框 + 规范 Tooltip -->
        <button
            type="button"
            class="block__icon b3-tooltips b3-tooltips__sw"
            aria-label="刷新反链 (重新检索当前文档)"
            on:click|stopPropagation={refreshBacklinkPanelToCurrentMainDocument}
        >
            <svg class="b3-icon b3-icon--wireframe" style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/>
                <path d="M21 3v5h-5"/>
            </svg>
        </button>

        <!-- 重置按钮：显式线框 + 规范 Tooltip -->
        <button
            type="button"
            class="block__icon b3-tooltips b3-tooltips__sw"
            aria-label="恢复默认设置与筛选条件"
            on:click|stopPropagation={resetBacklinkQueryParametersToDefault}
        >
            <svg class="b3-icon b3-icon--wireframe" style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                <path d="M3 21v-5h5"/>
            </svg>
        </button>

        <!-- 面板折叠/展开指示图标 -->
        <span class="block__icon b3-tooltips b3-tooltips__sw" aria-label={panelBacklinkViewExpand ? "折叠面板" : "展开面板"}>
            <svg class="b3-icon b3-icon--wireframe" style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                {#if panelBacklinkViewExpand}
                    <path d="M18 15l-6-6-6 6"/>
                {:else}
                    <path d="M6 9l6 6 6-6"/>
                {/if}
            </svg>
        </span>
    </div>

    <!-- 响应式搜索与筛选条 -->
    {#if panelBacklinkViewExpand && queryParams}
        <div class="backlink-toolbar-row">
            <div class="backlink-search-input-wrap">
                <svg class="backlink-search-icon" style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                    class="b3-text-field backlink-search-input"
                    placeholder="搜索关键词..."
                    on:input={handleBacklinkKeywordInput}
                    bind:value={queryParams.backlinkKeywordStr}
                />
                {#if queryParams.backlinkKeywordStr}
                    <button
                        type="button"
                        class="backlink-search-clear b3-tooltips b3-tooltips__s"
                        aria-label="清空搜索"
                        on:click={() => { queryParams.backlinkKeywordStr = ''; updateRenderData(); }}
                    >
                        <svg style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                {/if}
            </div>

            <div class="backlink-toolbar-actions">
                <select
                    class="b3-select backlink-sort-select"
                    bind:value={queryParams.backlinkBlockSortMethod}
                    on:change={updateRenderData}
                >
                    {#each BACKLINK_BLOCK_SORT_METHOD_ELEMENT() as element}
                        <option value={element.value}>{element.name}</option>
                    {/each}
                </select>

                <button
                    type="button"
                    class="block__icon b3-tooltips b3-tooltips__sw"
                    aria-label={isAllExpanded ? "折叠所有文档 (右键：折叠列表项)" : "展开所有文档 (右键：展开列表项)"}
                    on:click={toggleAllBacklinkDocuments}
                    on:contextmenu={handleToggleContextMenu}
                >
                    <svg class="b3-icon b3-icon--wireframe" style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                        {#if isAllExpanded}
                            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
                        {:else}
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                        {/if}
                    </svg>
                </button>
            </div>
        </div>
    {/if}
</div>
```

---

### 2. 单文档卡片与列表行构造（JS DOM）

修改 `src/components/panel/backlink-document-row.js` 中的 HTML 模版构造，彻底消除 `title` 冲突并规范化图标容器：

```javascript
// 优化后的 buildBacklinkDocumentListItemHtml 范例
export function buildBacklinkDocumentListItemHtml({
  documentName = "",
  docAriaText = "",
  progressText = "",
  breadcrumbItems = [],
  contextControlState = {},
} = {}) {
  // 彻底剔除原生 title 属性，避免与思源自定义气泡产生双重遮挡
  const safeDocTip = docAriaText ? docAriaText.substring(0, 100).replace(/"/g, '&quot;') : "";
  const documentOpenTip = "左键：在主窗口打开文档&#10;右键：在右侧分屏打开文档";

  return `
<div class="backlink-document-header-row">
  <div class="backlink-document-title-row">
    <!-- 折叠箭头 -->
    <button type="button" class="b3-list-item__toggle b3-list-item__toggle--hl" aria-label="展开/折叠文档">
      <svg class="b3-list-item__arrow b3-list-item__arrow--open" style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
    
    <!-- 文档图标 -->
    <svg class="b3-list-item__graphic popover__block" style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>

    <!-- 文档名称：仅挂载统一 ariaLabel 机制 -->
    <span class="b3-list-item__text ariaLabel" aria-label="${documentOpenTip}">
      ${documentName}
    </span>

    <!-- 导航翻页组：按钮容器化 + 显式线框图标 + 触控热区 -->
    <div class="backlink-document-nav-group">
      <button type="button" class="backlink-nav-btn previous-backlink-icon ariaLabel" aria-label="上一条反链块">
        <svg style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <span class="b3-list-item__meta backlink-nav-progress">${progressText}</span>
      <button type="button" class="backlink-nav-btn next-backlink-icon ariaLabel" aria-label="下一条反链块">
        <svg style="fill: none !important;" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  </div>

  ${buildBacklinkContextControlRowHtml(contextControlState)}

  <div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap backlink-breadcrumb-row">
    ${buildBacklinkBreadcrumbItemsHtml(breadcrumbItems)}
  </div>
</div>
`;
}
```

---

### 3. 全局 CSS 隔离与线框图标防护补丁

在 `src/components/panel/backlink-filter-panel-page.css` 中注入高优先级的显式线框与微交互样式：

```css
/* ==========================================================================
   显式线框图标防护层（防御思源全局 fill: currentColor 污染）
   ========================================================================== */
.backlink-panel__area svg.b3-icon--wireframe,
.backlink-panel__area .block__icon svg,
.backlink-panel__area .backlink-nav-btn svg,
.backlink-panel__area .backlink-context-step-button svg {
    fill: none !important;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    transition: transform 0.15s ease, stroke 0.15s ease;
}

/* ==========================================================================
   按钮触控热区与微交互
   ========================================================================== */
.backlink-panel__area .backlink-nav-btn,
.backlink-panel__area .backlink-context-step-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: var(--b3-theme-on-surface);
    transition: var(--backlink-transition);
}

.backlink-panel__area .backlink-nav-btn:hover:not(:disabled),
.backlink-panel__area .backlink-context-step-button:hover:not(:disabled) {
    background-color: var(--b3-list-icon-hover);
    color: var(--b3-theme-primary);
}

.backlink-panel__area .backlink-nav-btn:disabled,
.backlink-panel__area .backlink-context-step-button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

/* ==========================================================================
   重构分段胶囊控制器（Segmented Control）
   ========================================================================== */
.backlink-panel__area .backlink-context-state-group {
    display: inline-flex;
    align-items: center;
    padding: 2px;
    background-color: var(--b3-theme-surface-lighter);
    border-radius: 6px;
    gap: 2px;
}

.backlink-panel__area .backlink-context-state {
    appearance: none;
    border: none;
    outline: none;
    cursor: pointer;
    font-size: 11px;
    line-height: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 4px;
    color: var(--b3-theme-on-surface-light);
    background: transparent;
    font-weight: 400;
    transition: all 0.16s ease;
    user-select: none;
}

.backlink-panel__area .backlink-context-state:hover:not(.active) {
    color: var(--b3-theme-on-surface);
    background: rgba(128, 128, 128, 0.08);
}

.backlink-panel__area .backlink-context-state.active {
    color: var(--b3-theme-primary);
    background-color: var(--b3-theme-surface);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    font-weight: 600;
}

/* ==========================================================================
   工具栏弹性与响应式设计
   ========================================================================== */
.backlink-panel__area .backlink-toolbar-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
}

.backlink-panel__area .backlink-search-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1 1 140px;
    min-width: 120px;
}

.backlink-panel__area .backlink-search-input {
    width: 100%;
    padding-left: 24px;
    padding-right: 20px;
    height: 26px;
    font-size: 12px;
}

.backlink-panel__area .backlink-search-icon {
    position: absolute;
    left: 6px;
    width: 12px;
    height: 12px;
    color: var(--b3-theme-on-surface-light);
    pointer-events: none;
}

.backlink-panel__area .backlink-search-clear {
    position: absolute;
    right: 4px;
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: var(--b3-theme-on-surface-light);
    display: flex;
    align-items: center;
    justify-content: center;
}

.backlink-panel__area .backlink-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
}
```

---

## 五、 实施演进路线图（Roadmap）

为了保证重构过程稳定可靠且不影响现有反链查询与上下文渲染核心逻辑，建议分阶段实施：

```
┌─────────────────────────┐
│ 阶段一：图标与提示重构  │  → 显式线框 SVG 替换、清除原生 title 冲突、统一 Tooltip
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 阶段二：排版与控制器重构│  → 分段胶囊控制器、工具栏响应式换行、色彩 Token 统一
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 阶段三：空状态与精细动画│  → 优雅的空状态占位、键盘快捷键映射、平滑微动效
└─────────────────────────┘
```

1. **阶段一（高优先级 · 快速见效）**：
   - 替换所有面性/混合图标为规范的**显式线框图标**，在 `<svg>` 上注入 `fill: none !important;`。
   - 清除 `backlink-document-row.js` 中的 `title` 属性，统一 Tooltip 文案规范并补充右键手势说明。
   - 将翻页与上下文步进节点改为标准 `<button>` 容器。
2. **阶段二（中优先级 · 体验提升）**：
   - 重构分段胶囊（Segmented Control）样式，接入思源主题变量 `color-mix`。
   - 优化窄侧边栏与宽底栏的响应式工具栏布局，增加搜索清空按钮。
3. **阶段三（低优先级 · 细节打磨）**：
   - 优化空状态图文展示。
   - 增加键盘快捷键导航支持与微动效过渡。

---
