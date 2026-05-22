const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "section",
  "strong",
  "ul",
]);

const ALLOWED_LINK_TARGETS = new Set(["_blank", "_self", "_parent", "_top"]);
const ALLOWED_REL_TOKENS = new Set([
  "alternate",
  "author",
  "bookmark",
  "external",
  "help",
  "license",
  "next",
  "nofollow",
  "noopener",
  "noreferrer",
  "prev",
  "search",
  "tag",
]);

const TAG_PATTERN = /<\/?([a-z0-9]+)([^>]*)>/gi;
const ATTRIBUTE_PATTERN =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
const BLOCKED_CONTENT_PATTERN =
  /<\s*(script|style|iframe|object|embed|noscript|template)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

function escapeAttributeValue(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function isSafeHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.toLowerCase();

  if (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("vbscript:")
  ) {
    return false;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^(https?:|mailto:|tel:)/i.test(trimmed);
  }

  return true;
}

function sanitizeAnchorAttributes(attributeSource: string) {
  let href: string | null = null;
  let target: string | null = null;
  let rel: string | null = null;

  ATTRIBUTE_PATTERN.lastIndex = 0;

  for (const match of attributeSource.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1]?.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";

    if (name === "href" && isSafeHref(value)) {
      href = value.trim();
    }

    if (name === "target" && ALLOWED_LINK_TARGETS.has(value.trim())) {
      target = value.trim();
    }

    if (name === "rel") {
      const tokens = value
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token && ALLOWED_REL_TOKENS.has(token));

      rel = tokens.length > 0 ? tokens.join(" ") : null;
    }
  }

  if (target === "_blank") {
    const relTokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
    relTokens.add("noopener");
    relTokens.add("noreferrer");
    rel = Array.from(relTokens).join(" ");
  }

  const attributes: string[] = [];

  if (href) {
    attributes.push(`href="${escapeAttributeValue(href)}"`);
  }

  if (target) {
    attributes.push(`target="${escapeAttributeValue(target)}"`);
  }

  if (rel) {
    attributes.push(`rel="${escapeAttributeValue(rel)}"`);
  }

  return attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) {
    return "";
  }

  return dirty
    .replace(BLOCKED_CONTENT_PATTERN, "")
    .replace(COMMENT_PATTERN, "")
    .replace(TAG_PATTERN, (fullMatch, rawTagName: string, rawAttributes = "") => {
      const tagName = rawTagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tagName)) {
        return "";
      }

      if (fullMatch.startsWith("</")) {
        return `</${tagName}>`;
      }

      if (tagName === "a") {
        return `<a${sanitizeAnchorAttributes(rawAttributes)}>`;
      }

      return `<${tagName}>`;
    });
}

export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "");
}
