import { TbX } from 'react-icons/tb';
import type { LoadingComposerAttachment } from '../../../types';

const resolveCompressionStatusLabel = (
  phase: LoadingComposerAttachment['loadingPhase']
) => {
  if (phase === 'done') {
    return 'Selesai';
  }

  if (phase === 'processing') {
    return 'Memproses';
  }

  return 'Mengunggah';
};

export const ComposerAttachmentLoadingPreview = ({
  animatedDots,
  attachment,
  onCancelLoadingComposerAttachment,
}: {
  animatedDots: string;
  attachment: LoadingComposerAttachment;
  onCancelLoadingComposerAttachment: (attachmentId: string) => void;
}) => {
  const isPdfCompressionLoading = attachment.loadingKind === 'pdf-compression';

  return (
    <div
      className="h-[54px]"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '54px',
      }}
    >
      <div className="flex h-full w-full items-center gap-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-slate-200" />
          <div className="min-w-0 flex-1">
            {isPdfCompressionLoading ? (
              <>
                <p className="text-sm font-medium text-slate-700">
                  {resolveCompressionStatusLabel(attachment.loadingPhase)}
                  {animatedDots}
                </p>
                <p className="text-xs text-slate-500">Kompres PDF</p>
              </>
            ) : (
              <>
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mt-1 h-3 w-14 animate-pulse rounded bg-slate-200" />
              </>
            )}
          </div>
        </div>
        {isPdfCompressionLoading ? (
          <button
            type="button"
            aria-label="Batalkan kompres PDF"
            onClick={() => {
              onCancelLoadingComposerAttachment(attachment.id);
            }}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-xl text-black transition-colors hover:bg-slate-200 hover:text-black"
          >
            <TbX className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};
