export function createBacklinkPanelOpenActions({
  state,
  getBacklinkDocumentTargetRole,
  shouldHandleBacklinkDocumentClick,
  getBacklinkDocumentClickAction,
  getBacklinkDocumentOpenArea,
  resolveBacklinkDocumentOpenArea,
  resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache,
  getBacklinkDocumentPreClickOpenArea,
  getBacklinkDocumentWndElementFromTarget,
  getBacklinkDocumentWndElementFromProtyle,
  openBlockTab,
  toggleBacklinkDocument,
  setPreClickOpenArea,
  getPreClickOpenArea,
  setLastKnownFocusedWndElement,
  getLastKnownFocusedWndElement,
  currentTab,
  documentRef = globalThis.document,
} = {}) {
  function updateFocusedWndCache(wndElement) {
    if (!wndElement) {
      return;
    }
    setLastKnownFocusedWndElement(wndElement);
  }

  function handleFocusIn(event) {
    updateFocusedWndCache(
      getBacklinkDocumentWndElementFromTarget(event.target, event),
    );
  }

  function handleMouseDownCapture(event) {
    const targetRole = getBacklinkDocumentTargetRole(event.target);
    const isBacklinkTitleCtrlLeftClick =
      event.button === 0 &&
      event.ctrlKey &&
      targetRole === "title" &&
      state.backlinkULElement?.contains?.(event.target);
    if (isBacklinkTitleCtrlLeftClick) {
      return;
    }

    updateFocusedWndCache(
      getBacklinkDocumentWndElementFromTarget(event.target, event),
    );
  }

  function handleProtyleFocus(event) {
    const protyle = event?.detail?.protyle;
    updateFocusedWndCache(getBacklinkDocumentWndElementFromProtyle(protyle));
  }

  function clickBacklinkDocumentLiElement(event) {
    const target = event.currentTarget;
    const targetRole = getBacklinkDocumentTargetRole(event.target);
    if (!shouldHandleBacklinkDocumentClick({ targetRole })) {
      return;
    }
    const action = getBacklinkDocumentClickAction({
      ctrlKey: event.ctrlKey,
      targetRole,
    });

    if (action === "open-block") {
      const requestedOpenArea = getBacklinkDocumentOpenArea({
        trigger: "click",
        ctrlKey: event.ctrlKey,
        targetRole,
      });
      const resolvedOpenArea = resolveBacklinkDocumentOpenArea(
        requestedOpenArea,
        getPreClickOpenArea(),
      );
      openBlockTab(
        target.getAttribute("data-node-id"),
        target.getAttribute("data-backlink-block-id"),
        {
          openArea: resolvedOpenArea,
        },
      );
      setPreClickOpenArea("focus");
      return;
    }

    if (action === "toggle-fold") {
      toggleBacklinkDocument(target);
    }
  }

  function mouseDownBacklinkDocumentLiElement(event) {
    const targetRole = getBacklinkDocumentTargetRole(event.target);
    if (event.button !== 0 || targetRole !== "title") {
      return;
    }

    const currentWndElement = currentTab?.tab?.parent?.element ||
      currentTab?.parent?.element ||
      null;
    setPreClickOpenArea(
      event.ctrlKey
        ? resolveBacklinkDocumentCtrlLeftClickOpenAreaFromCache({
            currentWndElement,
            cachedFocusedWndElement: getLastKnownFocusedWndElement(),
            documentRef,
          })
        : getBacklinkDocumentPreClickOpenArea({
            currentTab,
            documentRef,
          }),
    );
  }

  function contextmenuBacklinkDocumentLiElement(event) {
    const target = event.currentTarget;
    const targetRole = getBacklinkDocumentTargetRole(event.target);
    const openArea = getBacklinkDocumentOpenArea({
      trigger: "contextmenu",
      ctrlKey: event.ctrlKey,
      targetRole,
    });
    if (!openArea) {
      return;
    }
    event.preventDefault();
    openBlockTab(
      target.getAttribute("data-node-id"),
      target.getAttribute("data-backlink-block-id"),
      { openArea },
    );
    setPreClickOpenArea("focus");
  }

  return {
    handleFocusIn,
    handleMouseDownCapture,
    handleProtyleFocus,
    clickBacklinkDocumentLiElement,
    mouseDownBacklinkDocumentLiElement,
    contextmenuBacklinkDocumentLiElement,
  };
}
