/**
 * Protyle DOM 相关的共享 mock 工厂。
 *
 * 用于 backlink-protyle-visibility 等测试：生产代码通过可选链
 * （`blockElement?.getAttribute?.(...)`、`classList?.add?.(...)`、
 * `querySelectorAll?.(...) || []`、`removeAttribute?.(...)`）访问块级元素，
 * 因此 mock 只需提供被测分支实际读取的字段。
 */

/**
 * 录制型 classList：add/remove 分别记入 added/removed 数组，供断言回放。
 */
export function makeRecordingClassList() {
  return {
    added: [],
    removed: [],
    add(name) {
      this.added.push(name);
    },
    remove(name) {
      this.removed.push(name);
    },
  };
}

/**
 * 构造反链窗口过滤用的块级元素 mock。
 *
 * @param {string} id - data-node-id 返回的块 ID
 * @param {object} [options]
 * @param {string|null} [options.dataType] - data-type 属性（NodeListItem/NodeList/NodeParagraph 等），
 *   未提供时 getAttribute("data-type") 返回 null，与仅支持 data-node-id 的旧变体行为一致
 * @param {boolean} [options.folded] - 初始 fold 状态；removeAttribute("fold") 会同步清除该状态，
 *   与「展开后重新快照」类用例（动态 querySelectorAll 依赖实时 fold 状态）保持一致
 * @param {object|null} [options.parentElement] - 父元素，默认 null
 * @returns 块元素 mock；querySelectorAll 默认返回 []，需要后代时在用例内直接覆盖该属性
 */
export function makeProtyleBlock(id, { dataType = null, folded = false, parentElement = null } = {}) {
  let isFolded = folded;
  return {
    id,
    parentElement,
    getAttribute(name) {
      if (name === "data-node-id") {
        return id;
      }
      if (name === "data-type") {
        return dataType;
      }
      if (name === "fold") {
        return isFolded ? "1" : null;
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    classList: makeRecordingClassList(),
    removedAttributes: [],
    removeAttribute(name) {
      this.removedAttributes.push(name);
      if (name === "fold") {
        isFolded = false;
      }
    },
  };
}

/**
 * 构造 protyle 内容容器 mock：生产代码经
 * `element?.querySelector?.("div.protyle-wysiwyg.protyle-wysiwyg--attr")` 取 wysiwyg 根节点。
 */
export function makeProtyleContentElement(wysiwygElement) {
  return {
    querySelector() {
      return wysiwygElement;
    },
  };
}
