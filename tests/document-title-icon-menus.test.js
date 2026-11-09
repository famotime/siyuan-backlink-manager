import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createDocumentTitleIconMenuHandlers } from "../src/service/plugin/document-title-icon-menus.js";

function buildMenuCapture() {
    const items = [];
    return {
        items,
        menu: {
            addItem(item) {
                items.push(item);
            },
        },
    };
}

test("文档标题图标菜单注册反链管案子菜单且包含三个层级动作", () => {
    const { items, menu } = buildMenuCapture();
    const handlers = createDocumentTitleIconMenuHandlers({
        updateDocumentBottomShowPanel: async () => {},
        isDocumentBottomDisplayEnabled: () => true,
        refreshBacklinkPanelToBottom: async () => {},
        handleDestroyProtyle: () => {},
        destroyPanel: () => {},
    });

    handlers.handleClickEditorTitleIcon({
        detail: { menu, data: { rootID: "doc-1" }, protyle: {} },
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].label, "反链管家");
    assert.equal(items[0].icon, "iconBacklinkPanelFilter");
    assert.equal(items[0].type, "submenu");
    assert.deepEqual(
        items[0].submenu.map((entry) => entry.label),
        ["恢复默认", "始终显示该文档底部反链", "始终隐藏该文档底部反链"],
    );
});

test("文档缺少 rootID 时仅注册无子菜单的入口项（与原行为一致）", () => {
    const { items, menu } = buildMenuCapture();
    const handlers = createDocumentTitleIconMenuHandlers({});

    handlers.handleClickEditorTitleIcon({
        detail: { menu, data: {} },
    });

    // 历史行为：addItem 无条件调用，rootId 缺失时 submenu 为 undefined
    assert.equal(items.length, 1);
    assert.equal(items[0].submenu, undefined);
});

test("「恢复默认」按设置开关决定刷新或销毁底部面板", async () => {
    const calls = [];
    const makeHandlers = (displayEnabled) =>
        createDocumentTitleIconMenuHandlers({
            updateDocumentBottomShowPanel: async (rootId, value) =>
                calls.push(["update", rootId, value]),
            isDocumentBottomDisplayEnabled: () => displayEnabled,
            refreshBacklinkPanelToBottom: async (contentElement, rootId) =>
                calls.push(["refresh", contentElement, rootId]),
            handleDestroyProtyle: (e) => calls.push(["destroyProtyle", e]),
            destroyPanel: (contentElement) =>
                calls.push(["destroyPanel", contentElement]),
        });
    const contentElement = { name: "content" };

    // 开启 documentBottomDisplay -> 恢复默认后刷新底部面板
    let capture = buildMenuCapture();
    makeHandlers(true).handleClickEditorTitleIcon({
        detail: { menu: capture.menu, data: { rootID: "doc-1" }, protyle: { contentElement } },
    });
    await capture.items[0].submenu[0].click();
    assert.deepEqual(calls, [
        ["update", "doc-1", null],
        ["refresh", contentElement, "doc-1"],
    ]);

    // 关闭 documentBottomDisplay -> 恢复默认后销毁面板
    calls.length = 0;
    capture = buildMenuCapture();
    const destroyEvent = {
        detail: { menu: capture.menu, data: { rootID: "doc-2" }, protyle: { contentElement } },
    };
    makeHandlers(false).handleClickEditorTitleIcon(destroyEvent);
    await capture.items[0].submenu[0].click();
    assert.deepEqual(calls, [
        ["update", "doc-2", null],
        ["destroyProtyle", destroyEvent],
    ]);
});

test("「始终显示/始终隐藏」分别刷新与销毁对应文档底部面板", async () => {
    const calls = [];
    const handlers = createDocumentTitleIconMenuHandlers({
        updateDocumentBottomShowPanel: async (rootId, value) =>
            calls.push(["update", rootId, value]),
        isDocumentBottomDisplayEnabled: () => true,
        refreshBacklinkPanelToBottom: async (contentElement, rootId) =>
            calls.push(["refresh", contentElement, rootId]),
        handleDestroyProtyle: () => {},
        destroyPanel: (contentElement) => calls.push(["destroyPanel", contentElement]),
    });
    const contentElement = { name: "content" };
    const capture = buildMenuCapture();
    handlers.handleClickEditorTitleIcon({
        detail: { menu: capture.menu, data: { rootID: "doc-3" }, protyle: { contentElement } },
    });

    await capture.items[0].submenu[1].click();
    assert.deepEqual(calls, [
        ["update", "doc-3", 1],
        ["refresh", contentElement, "doc-3"],
    ]);

    calls.length = 0;
    await capture.items[0].submenu[2].click();
    assert.deepEqual(calls, [
        ["update", "doc-3", -1],
        ["destroyPanel", contentElement],
    ]);
});

test("DocumentService 通过工厂接入标题图标菜单并使用修正后的拼写", () => {
    const source = readFileSync(
        new URL("../src/service/plugin/DocumentService.ts", import.meta.url),
        "utf8",
    );

    assert.match(
        source,
        /import\s*\{\s*createDocumentTitleIconMenuHandlers\s*\}\s*from "\.\/document-title-icon-menus\.js";/,
    );
    // 拼写修正守护：不再出现历史错误拼写
    assert.doesNotMatch(source, /hadnleClickEditorTitleIcon/);
    assert.doesNotMatch(source, /docuemntContentElement/);
    assert.doesNotMatch(source, /destory/);
});
