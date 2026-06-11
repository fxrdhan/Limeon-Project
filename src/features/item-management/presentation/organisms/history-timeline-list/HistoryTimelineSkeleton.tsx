interface HistoryTimelineSkeletonProps {
  scrollContainerMaxHeight?: number;
}

export function HistoryTimelineSkeleton({
  scrollContainerMaxHeight,
}: HistoryTimelineSkeletonProps) {
  return (
    <div className="p-6">
      <div className="relative animate-pulse">
        <div className="absolute left-[5.4px] top-8 bottom-0 z-0 w-0.5 bg-slate-200" />
        <div
          className="relative max-h-96 space-y-3 overflow-hidden"
          style={
            scrollContainerMaxHeight
              ? { maxHeight: `${scrollContainerMaxHeight}px` }
              : undefined
          }
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`relative ${index === 0 ? 'pt-2' : ''} ${
                index === 4 ? 'pb-2' : ''
              }`}
            >
              <span className="absolute left-0 top-5 block h-3 w-3 rounded-full border-2 border-slate-200 bg-white" />
              <div className="ml-6 rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-[62px] rounded bg-slate-200" />
                    <div className="h-4 w-[104px] rounded bg-slate-200" />
                  </div>
                  <div className="h-6 w-8 rounded bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
