import Badge from '@/components/badge';
import { cn } from '@/lib/utils';
import type { HoverDetailData } from '@/types/components';

const getDisplayCode = (data: HoverDetailData) =>
  data.display?.code ?? data.code;

const getDisplayDescription = (data: HoverDetailData) =>
  data.display?.description ?? data.description;

const getDisplayBadgeLabel = (data: HoverDetailData) =>
  data.display?.badgeLabel ?? data.metaLabel;

const getDisplayBadgeTone = (data?: HoverDetailData | null) =>
  data?.display?.badgeTone ?? data?.metaTone ?? 'default';

const getHoverDetailMetaBadgeVariant = (data?: HoverDetailData | null) => {
  const tone = getDisplayBadgeTone(data);
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'info') return 'info';
  return 'default';
};

export function ComboboxHoverDetailContent({
  className,
  data,
  width,
}: {
  className?: string;
  data: HoverDetailData;
  width?: number;
}) {
  const code = getDisplayCode(data);
  const description = getDisplayDescription(data);
  const metaLabel = getDisplayBadgeLabel(data);
  const metaBadgeVariant = getHoverDetailMetaBadgeVariant(data);

  return (
    <div
      className={cn(
        'pointer-events-auto max-h-[calc(100vh-24px)] min-w-0 overflow-hidden',
        className
      )}
      style={width ? { width } : undefined}
    >
      <div
        className={cn(
          'flex min-w-0 items-start justify-between gap-3',
          description && 'mb-3'
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {code ? (
            <span data-hover-detail-code-badge="" className="shrink-0">
              <Badge
                variant="success"
                size="sm"
                className="shrink-0 rounded-md"
              >
                {code}
              </Badge>
            </span>
          ) : null}
          <h3 className="min-w-0 flex-1 whitespace-normal break-words font-semibold text-slate-900">
            <span data-hover-detail-line="" data-hover-detail-title-line="">
              {data.name}
            </span>
          </h3>
        </div>
        {metaLabel ? (
          <Badge
            variant={metaBadgeVariant}
            size="sm"
            className="shrink-0 rounded-md uppercase tracking-wide"
          >
            {metaLabel}
          </Badge>
        ) : null}
      </div>
      {description ? (
        <p className="whitespace-normal break-words text-sm leading-relaxed text-slate-600">
          <span data-hover-detail-line="">{description}</span>
        </p>
      ) : null}
    </div>
  );
}
