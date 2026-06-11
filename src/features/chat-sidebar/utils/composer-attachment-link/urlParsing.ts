const SUPPORTED_URL_PROTOCOLS = new Set(['http:', 'https:']);
const HTML_ATTACHMENT_PATTERNS = [
  /<(?:img|iframe|embed|source)\b[^>]*\bsrc=(['"])(.*?)\1/i,
  /<object\b[^>]*\bdata=(['"])(.*?)\1/i,
];

export const stripWrappingQuotes = (value: string) =>
  value.replace(/^['"]+|['"]+$/g, '').trim();

export const normalizeUrlPathSegments = (pathname: string) =>
  pathname
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean);

export const resolveComposerAttachmentUrl = (rawValue: string) => {
  const normalizedValue = stripWrappingQuotes(rawValue);
  if (!normalizedValue) return null;

  try {
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.href
        : 'https://example.com/';
    const resolvedUrl = new URL(normalizedValue, baseUrl);
    if (!SUPPORTED_URL_PROTOCOLS.has(resolvedUrl.protocol)) {
      return null;
    }

    return resolvedUrl.toString();
  } catch {
    return null;
  }
};

export const extractUrlFromHtmlFragment = (html: string) => {
  for (const pattern of HTML_ATTACHMENT_PATTERNS) {
    const attachmentUrl = html.match(pattern)?.[2];
    if (!attachmentUrl) continue;

    const resolvedUrl = resolveComposerAttachmentUrl(attachmentUrl);
    if (resolvedUrl) {
      return resolvedUrl;
    }
  }

  return null;
};

const extractVisibleTextFromHtml = (html: string) => {
  let visibleText = '';
  let isInsideTag = false;

  for (const character of html) {
    if (character === '<') {
      isInsideTag = true;
      continue;
    }

    if (character === '>') {
      isInsideTag = false;
      continue;
    }

    if (!isInsideTag) {
      visibleText += character;
    }
  }

  return visibleText.replace(/\s+/g, ' ').trim();
};

export const extractComposerLinkFromHtmlAnchor = (html: string) => {
  const normalizedHtml = html.trim();
  if (!normalizedHtml) return null;

  if (typeof DOMParser !== 'undefined') {
    const parsedDocument = new DOMParser().parseFromString(
      normalizedHtml,
      'text/html'
    );
    const anchorElement = parsedDocument.querySelector('a[href]');
    const anchorHref = anchorElement?.getAttribute('href');
    const resolvedUrl = anchorHref
      ? resolveComposerAttachmentUrl(anchorHref)
      : null;

    if (resolvedUrl) {
      return {
        text: anchorElement?.textContent?.replace(/\s+/g, ' ').trim() || '',
        url: resolvedUrl,
      };
    }
  }

  const anchorMatch = normalizedHtml.match(
    /<a\b[^>]*\bhref=(['"])(.*?)\1[^>]*>(.*?)<\/a>/is
  );
  if (!anchorMatch?.[2]) {
    return null;
  }

  const resolvedUrl = resolveComposerAttachmentUrl(anchorMatch[2]);
  if (!resolvedUrl) {
    return null;
  }

  return {
    text: extractVisibleTextFromHtml(anchorMatch[3]),
    url: resolvedUrl,
  };
};
