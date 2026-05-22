import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
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
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "");
}
