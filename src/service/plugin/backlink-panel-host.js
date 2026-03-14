export function buildBacklinkPanelPageProps({
  rootId,
  focusBlockId = null,
  currentTab = null,
  panelBacklinkViewExpand = true,
} = {}) {
  return {
    rootId,
    focusBlockId,
    currentTab,
    panelBacklinkViewExpand,
  };
}

export function attachBacklinkPanelScrollCleanup({
  element,
  onCleanup,
} = {}) {
  if (!element || typeof element.addEventListener !== "function") {
    return () => {};
  }

  const handleScroll = () => {
    onCleanup?.();
  };

  element.addEventListener("scroll", handleScroll);
  return () => {
    if (typeof element.removeEventListener === "function") {
      element.removeEventListener("scroll", handleScroll);
    }
  };
}

export function destroyBacklinkPanelHost({
  panelInstance,
  detachScrollCleanup,
} = {}) {
  detachScrollCleanup?.();
  panelInstance?.$destroy?.();
}
