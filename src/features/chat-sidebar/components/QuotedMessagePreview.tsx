import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";

interface QuotedMessagePreviewProps {
  authorLabel: string;
  previewText: string;
  isAuthorCurrentUser: boolean;
  isHighlighted?: boolean;
  surface?: "composer" | "current-user-message" | "other-user-message";
  action?: ReactNode;
  ariaLabel?: string;
  title?: string;
  interactiveElement?: "button" | "div";
  containerClassName?: string;
  contentClassName?: string;
  onActivate?: (event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) => void;
}

const getSurfaceClassName = (
  surface: NonNullable<QuotedMessagePreviewProps["surface"]>,
  isHighlighted: boolean,
) => {
  if (isHighlighted) {
    return "bg-white/10";
  }

  return surface === "current-user-message" ? "bg-emerald-50" : "bg-slate-50";
};

export const QuotedMessagePreview = ({
  authorLabel,
  previewText,
  isAuthorCurrentUser,
  isHighlighted = false,
  surface = "composer",
  action,
  ariaLabel,
  title,
  interactiveElement = "button",
  containerClassName = "",
  contentClassName = "min-w-0 pt-0.5 pr-1.5 pb-0.5 pl-2.5",
  onActivate,
}: QuotedMessagePreviewProps) => {
  const surfaceClassName = getSurfaceClassName(surface, isHighlighted);
  const stripeClassName = isHighlighted
    ? "bg-white/20"
    : isAuthorCurrentUser
      ? "bg-olive-500"
      : "bg-emerald-500";
  const labelClassName = isHighlighted
    ? "text-white/80"
    : isAuthorCurrentUser
      ? "text-olive-700"
      : "text-emerald-600";
  const previewClassName = isHighlighted ? "text-white" : "text-slate-600";
  const sharedClassName = `relative min-w-0 overflow-hidden rounded-lg text-left transition-colors ${surfaceClassName} ${
    onActivate ? "cursor-pointer" : ""
  } ${containerClassName}`;
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${stripeClassName}`}
      />
      <div className={contentClassName}>
        <p className={`truncate text-[11px] font-semibold ${labelClassName}`}>{authorLabel}</p>
        <p className={`truncate text-xs leading-relaxed ${previewClassName}`}>{previewText}</p>
      </div>
      {action}
    </>
  );

  if (!onActivate) {
    return (
      <div className={sharedClassName} data-chat-quoted-message-preview="true">
        {content}
      </div>
    );
  }

  if (interactiveElement === "div") {
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate(event);
      }
    };

    return (
      <div
        className={sharedClassName}
        data-chat-quoted-message-preview="true"
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        title={title}
        onClick={(event) => onActivate(event)}
        onKeyDown={handleKeyDown}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`block w-full ${sharedClassName}`}
      data-chat-quoted-message-preview="true"
      aria-label={ariaLabel}
      title={title}
      onClick={(event) => onActivate(event)}
    >
      {content}
    </button>
  );
};
