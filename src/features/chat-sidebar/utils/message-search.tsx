import {
  Fragment,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

const SEARCH_HIGHLIGHT_CLASS =
  'rounded-[4px] bg-amber-200 px-0.5 text-slate-900';
const MESSAGE_LINK_PATTERN = /https?:\/\/[^\s<]+/gi;
const TRAILING_LINK_PUNCTUATION_PATTERN = /[),.!?;:]+$/;
const SUPPORTED_MESSAGE_LINK_PROTOCOLS = new Set(['http:', 'https:']);
const MESSAGE_LINK_HOVER_COLOR = '#0369a1';

interface RenderHighlightedTextOptions {
  linkify?: boolean;
}

interface MessageTextSegment {
  type: 'text' | 'link';
  text: string;
  href?: string;
}

const getSearchMatchIndex = (text: string, normalizedSearchQuery: string) => {
  if (!normalizedSearchQuery) return -1;

  return text.toLowerCase().indexOf(normalizedSearchQuery);
};

export const buildCollapsedSearchSnippet = (
  text: string,
  normalizedSearchQuery: string,
  maxMessageChars: number
) => {
  if (text.length <= maxMessageChars) {
    return { text, hasLeadingEllipsis: false, hasTrailingEllipsis: false };
  }

  const matchIndex = getSearchMatchIndex(text, normalizedSearchQuery);
  if (matchIndex === -1 || matchIndex < maxMessageChars) {
    return {
      text: text.slice(0, maxMessageChars).trimEnd(),
      hasLeadingEllipsis: false,
      hasTrailingEllipsis: true,
    };
  }

  const desiredStart = Math.max(
    0,
    matchIndex -
      Math.floor((maxMessageChars - normalizedSearchQuery.length) / 2)
  );
  const maxStart = Math.max(0, text.length - maxMessageChars);
  const startIndex = Math.min(desiredStart, maxStart);
  const endIndex = Math.min(text.length, startIndex + maxMessageChars);

  return {
    text: text.slice(startIndex, endIndex).trim(),
    hasLeadingEllipsis: startIndex > 0,
    hasTrailingEllipsis: endIndex < text.length,
  };
};

const renderHighlightedPlainText = (
  text: string,
  normalizedSearchQuery: string
): ReactNode => {
  if (!normalizedSearchQuery) return text;

  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(normalizedSearchQuery);
  if (matchIndex === -1) return text;

  const beforeMatch = text.slice(0, matchIndex);
  const matchText = text.slice(
    matchIndex,
    matchIndex + normalizedSearchQuery.length
  );
  const afterMatch = text.slice(matchIndex + normalizedSearchQuery.length);

  return (
    <>
      {beforeMatch}
      <mark className={SEARCH_HIGHLIGHT_CLASS}>{matchText}</mark>
      {renderHighlightedPlainText(afterMatch, normalizedSearchQuery)}
    </>
  );
};

const splitTrailingLinkPunctuation = (value: string) => {
  const trailingMatch = value.match(TRAILING_LINK_PUNCTUATION_PATTERN);
  if (!trailingMatch) {
    return {
      linkText: value,
      trailingText: '',
    };
  }

  return {
    linkText: value.slice(0, -trailingMatch[0].length),
    trailingText: trailingMatch[0],
  };
};

const resolveMessageLink = (value: string) => {
  try {
    const resolvedUrl = new URL(value);
    if (!SUPPORTED_MESSAGE_LINK_PROTOCOLS.has(resolvedUrl.protocol)) {
      return null;
    }

    return resolvedUrl.toString();
  } catch {
    return null;
  }
};

const buildMessageTextSegments = (text: string): MessageTextSegment[] => {
  const segments: MessageTextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MESSAGE_LINK_PATTERN)) {
    const matchText = match[0];
    const matchIndex = match.index ?? -1;

    if (!matchText || matchIndex < 0) continue;
    if (matchIndex > lastIndex) {
      segments.push({
        type: 'text',
        text: text.slice(lastIndex, matchIndex),
      });
    }

    const { linkText, trailingText } = splitTrailingLinkPunctuation(matchText);
    const href = resolveMessageLink(linkText);

    if (href) {
      segments.push({
        type: 'link',
        text: linkText,
        href,
      });
    } else {
      segments.push({
        type: 'text',
        text: matchText,
      });
    }

    if (trailingText) {
      segments.push({
        type: 'text',
        text: trailingText,
      });
    }

    lastIndex = matchIndex + matchText.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      text: text.slice(lastIndex),
    });
  }

  return segments.length > 0
    ? segments
    : [
        {
          type: 'text',
          text,
        },
      ];
};

const stopLinkEventPropagation = (
  event: MouseEvent<HTMLAnchorElement> | KeyboardEvent<HTMLAnchorElement>
) => {
  event.stopPropagation();
};

const setMessageLinkHoverState = (
  element: HTMLAnchorElement,
  isActive: boolean
) => {
  element.style.color = isActive ? MESSAGE_LINK_HOVER_COLOR : 'inherit';
  element.style.textDecoration = isActive ? 'underline' : 'none';
};

const handleMessageLinkMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
  setMessageLinkHoverState(event.currentTarget, true);
};

const handleMessageLinkMouseLeave = (event: MouseEvent<HTMLAnchorElement>) => {
  setMessageLinkHoverState(event.currentTarget, false);
};

const handleMessageLinkFocus = (event: FocusEvent<HTMLAnchorElement>) => {
  setMessageLinkHoverState(event.currentTarget, true);
};

const handleMessageLinkBlur = (event: FocusEvent<HTMLAnchorElement>) => {
  setMessageLinkHoverState(event.currentTarget, false);
};

export const renderHighlightedText = (
  text: string,
  normalizedSearchQuery: string,
  options: RenderHighlightedTextOptions = {}
): ReactNode => {
  if (!options.linkify) {
    return renderHighlightedPlainText(text, normalizedSearchQuery);
  }

  const segments = buildMessageTextSegments(text);
  const hasLinkSegment = segments.some(segment => segment.type === 'link');

  if (!hasLinkSegment) {
    return renderHighlightedPlainText(text, normalizedSearchQuery);
  }

  return (
    <>
      {segments.map((segment, index) => {
        const content = renderHighlightedPlainText(
          segment.text,
          normalizedSearchQuery
        );

        if (segment.type !== 'link' || !segment.href) {
          return <Fragment key={`message-text-${index}`}>{content}</Fragment>;
        }

        return (
          <a
            key={`message-link-${segment.href}-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              textUnderlineOffset: '2px',
              transition: 'color 150ms ease, text-decoration-color 150ms ease',
            }}
            onClick={stopLinkEventPropagation}
            onKeyDown={stopLinkEventPropagation}
            onMouseEnter={handleMessageLinkMouseEnter}
            onMouseLeave={handleMessageLinkMouseLeave}
            onFocus={handleMessageLinkFocus}
            onBlur={handleMessageLinkBlur}
          >
            {content}
          </a>
        );
      })}
    </>
  );
};
