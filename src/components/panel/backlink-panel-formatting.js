export function sanitizeBacklinkKeywords(keywordArray = []) {
  return keywordArray.map((keyword) => {
    if (keyword.startsWith("-%") || keyword.startsWith("%-")) {
      return keyword.slice(2);
    }

    if (keyword.startsWith("%") || keyword.startsWith("-")) {
      return keyword.slice(1);
    }

    return keyword;
  });
}

export function buildDefBlockAriaLabel(
  defBlock,
  languages = {},
  showContent = false,
) {
  if (!defBlock) {
    return "";
  }

  const rows = [];

  if (defBlock.name) {
    rows.push(`<br>${languages.name}: ${defBlock.name}`);
  }

  if (defBlock.alias) {
    rows.push(`<br>${languages.alias}: ${defBlock.alias}`);
  }

  if (defBlock.staticAnchor) {
    rows.push(`<br>${languages.anchor}: ${defBlock.staticAnchor}`);
  }

  if (showContent) {
    rows.push(`<br> ${defBlock.content.substring(0, 100)}`);
  }

  return rows.join("").replace(/^<br>/, "").replace(/<br>$/, "");
}
