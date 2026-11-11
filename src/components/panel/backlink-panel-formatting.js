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

