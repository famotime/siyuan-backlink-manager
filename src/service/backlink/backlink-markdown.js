function isStrNotBlank(value) {
  return value !== undefined && value !== null && value !== "";
}

export function splitKeywordStringToArray(keywordStr) {
  if (!isStrNotBlank(keywordStr)) {
    return [];
  }

  return Array.from(
    new Set(
      keywordStr
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .filter((keyword) => keyword.length > 0),
    ),
  );
}

export function getRefBlockId(markdown) {
  const matches = [];
  if (!markdown) {
    return matches;
  }

  const regex = /\(\((\d{14}-\w{7})\s['"][^'"]+['"]\)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

export function getMarkdownAnchorTextArray(markdown) {
  const regex = /\(\(\d{14}-\w{7}\s['"]([^'"]+)['"]\)\)/g;
  const result = [];
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    if (match[1]) {
      result.push(match[1]);
    }
  }

  return result;
}

export function removeMarkdownRefBlockStyle(input = "") {
  const regex = /\(\(\d{14}-\w{7}\s['"]([^'"]+)['"]\)\)/g;
  return input.replace(regex, (_, anchorText) => anchorText);
}

export function parseSearchSyntax(query = "") {
  const includeText = [];
  const excludeText = [];
  const includeAnchor = [];
  const excludeAnchor = [];

  const terms = splitKeywordStringToArray(query);
  for (const term of terms) {
    if (term.startsWith("%-") || term.startsWith("-%")) {
      excludeAnchor.push(term.slice(2));
    } else if (term.startsWith("%")) {
      includeAnchor.push(term.slice(1));
    } else if (term.startsWith("-")) {
      excludeText.push(term.slice(1));
    } else {
      includeText.push(term);
    }
  }

  return {
    includeText,
    excludeText,
    includeAnchor,
    excludeAnchor,
  };
}

export function updateDynamicAnchorMap(map, markdown = "") {
  const regex = /\(\((\d{14}-\w{7})\s'([^']+)'\)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const id = match[1];
    const anchor = match[2];
    if (!id || !anchor) {
      continue;
    }

    const anchorSet = map.get(id) || new Set();
    anchorSet.add(anchor);
    map.set(id, anchorSet);
  }
}

export function updateStaticAnchorMap(map, markdown = "") {
  const regex = /\(\((\d{14}-\w{7})\s"([^"]+)"\)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const id = match[1];
    const anchor = match[2];
    if (!id || !anchor) {
      continue;
    }

    const anchorSet = map.get(id) || new Set();
    anchorSet.add(anchor);
    map.set(id, anchorSet);
  }
}
