export interface ParsedLink {
  raw: string;
  pathPart: string;
  fragment: string | null;
  isExternal: boolean;
  isAnchorOnly: boolean;
}

const EXTERNAL_LINK_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeFragment(value: string): string | null {
  const decoded = decodePart(value);

  return decoded === "" ? null : decoded;
}

export function parseHref(href: string): ParsedLink {
  const isAnchorOnly = href.startsWith("#");
  const hashIndex = href.indexOf("#");
  const isExternal = EXTERNAL_LINK_PATTERN.test(href);

  if (isAnchorOnly) {
    return {
      raw: href,
      pathPart: "",
      fragment: decodeFragment(href.slice(1)),
      isExternal,
      isAnchorOnly: true
    };
  }

  if (hashIndex >= 0) {
    return {
      raw: href,
      pathPart: decodePart(href.slice(0, hashIndex)),
      fragment: decodeFragment(href.slice(hashIndex + 1)),
      isExternal,
      isAnchorOnly: false
    };
  }

  return {
    raw: href,
    pathPart: decodePart(href),
    fragment: null,
    isExternal,
    isAnchorOnly: false
  };
}
