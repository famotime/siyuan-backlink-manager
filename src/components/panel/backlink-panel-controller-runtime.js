export function createEditorRegistry(state) {
  function getEditors() {
    if (state.currentTab) {
      if (!Array.isArray(state.currentTab.editors)) {
        state.currentTab.editors = [];
      }
      return state.currentTab.editors;
    }
    return state.defalutEditors;
  }

  function addEditor(editor) {
    const editors = getEditors();
    editors.push(editor);
  }

  function removeEditor(editor) {
    const editors = getEditors();
    const editorIndex = editors.indexOf(editor);
    if (editorIndex >= 0) {
      editors.splice(editorIndex, 1);
    }
  }

  function clearEditors() {
    if (state.currentTab) {
      state.currentTab.editors = [];
    }
    state.defalutEditors = [];
  }

  return {
    getEditors,
    addEditor,
    removeEditor,
    clearEditors,
  };
}

export function createDocumentGroupRefreshTracker({
  state,
  refreshBacklinkDocumentGroupDataById,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  const detachDocumentGroupRefreshTrackingMap = new Map();
  const backlinkDocumentGroupRefreshTimeoutMap = new Map();

  function clearBacklinkDocumentGroupRefreshTimeout(documentId) {
    const timeoutId = backlinkDocumentGroupRefreshTimeoutMap.get(documentId);
    if (timeoutId) {
      clearTimeoutImpl(timeoutId);
      backlinkDocumentGroupRefreshTimeoutMap.delete(documentId);
    }
  }

  function scheduleBacklinkDocumentGroupRefresh(
    documentId,
    delay = 0,
    {
      focusBlockId = null,
    } = {},
  ) {
    if (!documentId) {
      return;
    }

    clearBacklinkDocumentGroupRefreshTimeout(documentId);
    const timeoutId = setTimeoutImpl(() => {
      backlinkDocumentGroupRefreshTimeoutMap.delete(documentId);
      refreshBacklinkDocumentGroupDataById(documentId, { focusBlockId });
    }, delay);
    backlinkDocumentGroupRefreshTimeoutMap.set(documentId, timeoutId);
  }

  function detachDocumentGroupRefreshTracking(documentId) {
    detachDocumentGroupRefreshTrackingMap.get(documentId)?.();
  }

  function detachAllDocumentGroupRefreshTracking() {
    for (const documentId of detachDocumentGroupRefreshTrackingMap.keys()) {
      detachDocumentGroupRefreshTracking(documentId);
    }
  }

  function attachBacklinkDocumentGroupRefreshTracking(editor, documentId) {
    if (!editor?.protyle?.contentElement || !documentId) {
      return () => {};
    }

    detachDocumentGroupRefreshTracking(documentId);

    const contentElement = editor.protyle.contentElement;
    const handleFocusOut = () => {
      const focusBlockId = editor?.protyle?.block?.id || state.focusBlockId;
      scheduleBacklinkDocumentGroupRefresh(documentId, 80, { focusBlockId });
    };
    const handleDrop = () => {
      const focusBlockId = editor?.protyle?.block?.id || state.focusBlockId;
      scheduleBacklinkDocumentGroupRefresh(documentId, 0, { focusBlockId });
    };

    contentElement.addEventListener("focusout", handleFocusOut);
    contentElement.addEventListener("drop", handleDrop);

    const detach = () => {
      clearBacklinkDocumentGroupRefreshTimeout(documentId);
      contentElement.removeEventListener("focusout", handleFocusOut);
      contentElement.removeEventListener("drop", handleDrop);
      detachDocumentGroupRefreshTrackingMap.delete(documentId);
    };

    detachDocumentGroupRefreshTrackingMap.set(documentId, detach);
    return detach;
  }

  return {
    attachBacklinkDocumentGroupRefreshTracking,
    scheduleBacklinkDocumentGroupRefresh,
    clearBacklinkDocumentGroupRefreshTimeout,
    detachDocumentGroupRefreshTracking,
    detachAllDocumentGroupRefreshTracking,
  };
}
