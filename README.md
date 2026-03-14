# 反链管家

思源笔记插件，用来更高效地查看、筛选和整理反向链接。

如果你经常遇到这些情况，这个插件会比较有用：

- 一篇文档被很多地方引用，但官方反链太杂，难以快速定位
- 你想先看“哪些文档在引用我”，再看文档里的具体反链内容
- 你想只看某一类引用，例如某个概念、某组资料、某个项目相关的反链
- 你希望在当前文档底部直接看反链，而不是频繁切换页面

![预览](preview.png)

## 这个插件能做什么

### 1. 把反链按来源文档整理

插件会先按“来源文档”组织反链，你可以更快判断：

- 是哪些文档在引用当前内容
- 同一篇文档里有几条相关反链
- 是否需要展开整篇来源文档继续查看上下文

这比单纯按反链块平铺浏览更适合做资料回顾、知识梳理和项目排查。

### 2. 用多种条件缩小范围

你可以组合使用这些筛选方式：

- 当前文档定义块
- 关联的定义块
- 反链所在文档
- 关键词搜索
- 排序方式切换

适合的场景包括：

- 在一篇长文档中，只看某个概念相关的反链
- 在项目笔记里，只看来自某个专题文档的引用
- 在文献摘录中，排除无关定义块，保留真正有价值的引用

### 3. 在三个位置查看反链

插件支持三种打开方式：

- 文档底部直接显示
- 停靠栏显示
- 顶栏按钮打开独立页签

你可以按自己的工作方式选择：

- 边写边看：用文档底部反链
- 长时间筛选整理：用停靠栏
- 需要更大空间：用独立页签

### 4. 保存常用筛选条件

如果你经常重复查看同一类反链，可以保存当前条件，下次一键恢复。  
这对固定工作流很有用，比如：

- 每天回顾“某项目相关引用”
- 只检查“某类定义块”的反链变化
- 保留一组用于写作或复盘的筛选视图

## 典型使用场景

### 知识管理

查看某个概念被哪些笔记引用，并快速区分“直接相关”和“顺带提到”。

### 项目复盘

筛出某个项目文档、需求文档或会议纪要中的相关反链，快速回看上下文。

### 写作整理

写文章或做输出时，先找出真正引用当前主题的内容，再按关键词继续缩小范围。

### 大文档清理

当一篇文档的反链非常多时，可以按来源文档、关联定义块和关键词逐层收窄，避免信息过载。

## 上手建议

1. 先在当前文档底部打开反链面板，看整体引用情况。
2. 再用“反链所在文档”或“关联的定义块”缩小范围。
3. 需要长期复用时，保存当前条件。
4. 如果某些文档不想显示底部反链，可在文档级别单独设置显示或隐藏。

## 补充说明

- 关键词搜索支持同时匹配文档名和反链内容
- 可以展开来源文档，直接查看更完整的上下文
- 插件设置中可控制文档底部、停靠栏等显示方式

## 当前实现结构

- `src/components/panel/backlink-filter-panel-page.svelte` 继续保留面板编排，但筛选条件重置、包含/排除切换、已保存条件恢复已拆到 `src/components/panel/backlink-panel-query-params.js`
- `src/service/backlink/backlink-data.ts` 继续负责反链数据主流程，但定义块排序/筛选已拆到 `src/service/backlink/backlink-def-blocks.js`
- markdown 引用解析、锚文本提取和搜索语法解析已拆到 `src/service/backlink/backlink-markdown.js`，供 `backlink-data.ts` 与 `src/models/backlink-model.ts` 复用
- 基线数据装配中的当前文档锚文本回填、关联块物化、来源文档物化和文档块回挂已拆到 `src/service/backlink/backlink-panel-base-data-builder.js`
- `buildBacklinkPanelData` 内部的反链块、标题子块、列表子树和父块遍历已拆到 `src/service/backlink/backlink-panel-data-collectors.js`

## 开发验证

- 全量测试：`node --test tests/*.test.js`
- 本轮新增测试：`tests/backlink-panel-query-params.test.js`、`tests/backlink-def-blocks.test.js`、`tests/backlink-markdown.test.js`、`tests/backlink-panel-base-data-builder.test.js`、`tests/backlink-panel-data-collectors.test.js`
- 构建：`npm run build`
