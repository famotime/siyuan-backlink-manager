import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ListItemTreeNode } from "../src/models/list-item-tree-node.ts";

// 思源引用块语法：((20240101120000-abcdef "锚文本"))
const refA = '((20240101120000-aaaaaa1 "引用A"))';
const refB = '((20240101130000-bbbbbb2 "引用B"))';
const refC = '((20240101140000-cccccc3 "引用C"))';

function buildSampleTree() {
    // 结构：root-a -> child-b -> leaf-c1 / leaf-c2，root-a2 为平级第二棵树
    // 注意：buildTree 只为路径终点节点写入属性，因此每个节点都需要自身对应行
    return ListItemTreeNode.buildTree([
        {
            id: "row-0",
            parent_id: "",
            type: "i",
            parentIdPath: "root-a",
            parentInAttrConcat: "",
            subMarkdown: `根节点 ${refA}`,
            subInAttrConcat: "",
        },
        {
            id: "row-1",
            parent_id: "root-a",
            type: "i",
            parentIdPath: "root-a->child-b",
            parentInAttrConcat: "",
            subMarkdown: "子节点",
            subInAttrConcat: "",
        },
        {
            id: "row-2",
            parent_id: "root-a",
            type: "i",
            parentIdPath: "root-a->child-b->leaf-c1",
            parentInAttrConcat: "",
            subMarkdown: `叶子一 ${refB}`,
            subInAttrConcat: "",
        },
        {
            id: "row-3",
            parent_id: "root-a",
            type: "i",
            parentIdPath: "root-a->child-b->leaf-c2",
            parentInAttrConcat: "",
            subMarkdown: `叶子二 ${refC}`,
            subInAttrConcat: "",
        },
        {
            id: "row-4",
            parent_id: "",
            type: "i",
            parentIdPath: "root-a2",
            parentInAttrConcat: "",
            subMarkdown: `平级根 ${refA}`,
            subInAttrConcat: "",
        },
    ]);
}

test("ListItemTreeNode.buildTree 按parentIdPath构建嵌套树并解析引用块ID", () => {
    const tree = buildSampleTree();

    assert.equal(tree.length, 2);
    const rootA = tree.find((node) => node.id === "root-a");
    const rootA2 = tree.find((node) => node.id === "root-a2");
    assert.ok(rootA && rootA2);

    assert.deepEqual(rootA.children.map((node) => node.id), ["child-b"]);
    assert.deepEqual(
        rootA.children[0].children.map((node) => node.id),
        ["leaf-c1", "leaf-c2"],
    );
    assert.deepEqual(Array.from(rootA.includeDefBlockIds), [
        "20240101120000-aaaaaa1",
    ]);
    assert.equal(rootA.children[0].parentId, "root-a");
});

test("ListItemTreeNode.existsKeywords 匹配自身与后代节点文本", () => {
    const tree = buildSampleTree();
    const rootA = tree.find((node) => node.id === "root-a");

    // 自身 subMarkdown 命中
    assert.equal(rootA.existsKeywords(["引用A"]), true);
    // 后代命中
    assert.equal(rootA.existsKeywords(["引用B"]), true);
    // 多关键词分散在父链不同层级时逐层收敛命中
    assert.equal(rootA.existsKeywords(["引用A", "引用C"]), true);
    // 全部未命中
    assert.equal(rootA.existsKeywords(["引用X"]), false);
});

test("ListItemTreeNode.getAllChildIds 返回全部后代ID", () => {
    const tree = buildSampleTree();
    const rootA = tree.find((node) => node.id === "root-a");

    assert.deepEqual(rootA.getAllChildIds(), [
        "child-b",
        "leaf-c1",
        "leaf-c2",
    ]);
});

test("ListItemTreeNode.getFilterMarkdown 支持include/exclude子节点过滤", () => {
    const tree = buildSampleTree();
    const rootA = tree.find((node) => node.id === "root-a");

    const allMarkdown = rootA.getAllMarkdown();
    assert.ok(allMarkdown.includes("引用A"));
    assert.ok(allMarkdown.includes("引用B"));
    assert.ok(allMarkdown.includes("引用C"));

    // 排除 leaf-c2 分支
    const excludeMarkdown = rootA.getFilterMarkdown(null, ["leaf-c2"]);
    assert.ok(excludeMarkdown.includes("引用B"));
    assert.ok(!excludeMarkdown.includes("引用C"));

    // 仅保留 leaf-c1 分支（注意：include 过滤逐层生效，child-b 无 include 匹配时其子树被裁剪）
    const includeMarkdown = rootA.getFilterMarkdown(["leaf-c1"], null);
    assert.ok(includeMarkdown.includes("引用A"));
});

test("ListItemTreeNode.getFilterDefBlockIds 过滤后重新解析引用块", () => {
    const tree = buildSampleTree();
    const rootA = tree.find((node) => node.id === "root-a");

    assert.deepEqual(rootA.getAllDefBlockIds(), [
        "20240101120000-aaaaaa1",
        "20240101130000-bbbbbb2",
        "20240101140000-cccccc3",
    ]);
    assert.deepEqual(rootA.getFilterDefBlockIds(null, ["leaf-c2"]), [
        "20240101120000-aaaaaa1",
        "20240101130000-bbbbbb2",
    ]);
});

test("ListItemTreeNode.resetIncludeItemIdArray 汇总命中项及其祖先与全部后代", () => {
    const tree = buildSampleTree();
    const rootA = tree.find((node) => node.id === "root-a");

    // 命中引用B所在的 leaf-c1：应包含自身、祖先链与该子树全部子节点
    const includeIds = rootA.resetIncludeItemIdArray(
        [],
        ["20240101130000-bbbbbb2"],
    );
    assert.ok(includeIds.includes("leaf-c1"));
    assert.ok(includeIds.includes("child-b"));
    assert.ok(includeIds.includes("root-a"));

    // 空数组：未配置包含条件 -> 包含条件不生效，返回自身链路 + 全部后代
    const emptyIncludeIds = rootA.resetIncludeItemIdArray([], []);
    assert.deepEqual(emptyIncludeIds, [
        "root-a",
        "child-b",
        "leaf-c1",
        "leaf-c2",
    ]);
});

test("ListItemTreeNode.resetExcludeItemIdArray 命中排除项时裁剪自身及祖先链", () => {
    const tree = buildSampleTree();
    const rootA = tree.find((node) => node.id === "root-a");

    // 排除引用C所在的 leaf-c2：leaf-c2 自身命中，父链 child-b/root-a 不额外命中
    const excludeIds = rootA.resetExcludeItemIdArray(
        [],
        ["20240101140000-cccccc3"],
    );
    assert.ok(excludeIds.includes("leaf-c2"));

    // 空数组：清空排除集合
    assert.deepEqual(rootA.resetExcludeItemIdArray([], []), []);
    assert.deepEqual(rootA.excludeChildIdArray, []);
});

test("backlink-model.ts 以 re-export 保持旧导入路径兼容", () => {
    const source = readFileSync(
        new URL("../src/models/backlink-model.ts", import.meta.url),
        "utf8",
    );

    assert.match(
        source,
        /export\s*\{[^}]*ListItemTreeNode[^}]*\}\s*from\s*"\.\/list-item-tree-node";/,
    );
    assert.match(
        source,
        /export\s*\{[^}]*BacklinkPanelFilterCriteria[^}]*\}\s*from\s*"\.\/backlink-panel-filter-criteria";/,
    );
    // 类本体已迁出，避免模型文件继续膨胀
    assert.doesNotMatch(source, /class ListItemTreeNode/);
    assert.doesNotMatch(source, /class BacklinkPanelFilterCriteria/);
});
