import { TbCheck, TbChecks, TbClock } from 'react-icons/tb';

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface MessageBubbleMetaProps {
  isCurrentUser: boolean;
  displayTime: string;
  isEdited: boolean;
  messageDeliveryStatus: MessageDeliveryStatus | null;
}

export const MessageBubbleMeta = ({
  isCurrentUser,
  displayTime,
  isEdited,
  messageDeliveryStatus,
}: MessageBubbleMetaProps) => {
  if (isCurrentUser) {
    return (
      <div className="absolute right-full bottom-0 mr-2 flex flex-col items-end text-xs text-slate-500">
        <div className="flex items-center gap-1 whitespace-nowrap">
          {displayTime}
        </div>
        {messageDeliveryStatus || isEdited ? (
          <div className="inline-flex items-center gap-1 whitespace-nowrap">
            {isEdited ? <span className="text-slate-500">Diedit</span> : null}
            {messageDeliveryStatus ? (
              <span
                className={`inline-flex items-center ${
                  messageDeliveryStatus === 'read'
                    ? 'text-primary'
                    : 'text-slate-400'
                }`}
                aria-label={
                  messageDeliveryStatus === 'sending'
                    ? 'Status pesan: mengirim'
                    : messageDeliveryStatus === 'delivered'
                      ? 'Status pesan: diterima'
                      : messageDeliveryStatus === 'read'
                        ? 'Status pesan: dibaca'
                        : 'Status pesan: terkirim'
                }
                title={
                  messageDeliveryStatus === 'sending'
                    ? 'Mengirim'
                    : messageDeliveryStatus === 'delivered'
                      ? 'Diterima'
                      : messageDeliveryStatus === 'read'
                        ? 'Dibaca'
                        : 'Terkirim'
                }
              >
                {messageDeliveryStatus === 'sending' ? (
                  <TbClock className="h-3.5 w-3.5" />
                ) : messageDeliveryStatus === 'delivered' ? (
                  <TbChecks className="h-3.5 w-3.5" />
                ) : messageDeliveryStatus === 'read' ? (
                  <TbChecks className="h-3.5 w-3.5" />
                ) : (
                  <TbCheck className="h-3.5 w-3.5" />
                )}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="absolute left-full bottom-0 ml-2 flex flex-col items-start text-xs text-slate-500">
      <div className="whitespace-nowrap">{displayTime}</div>
      {isEdited ? (
        <div className="whitespace-nowrap text-slate-500">Diedit</div>
      ) : null}
    </div>
  );
};
