import {
  TbCopy,
  TbDownload,
  TbEye,
  TbFileTypeCsv,
  TbFileTypeDoc,
  TbFileTypeDocx,
  TbFileTypeJpg,
  TbFileTypePdf,
  TbFileTypePng,
  TbFileTypePpt,
  TbFileTypeTxt,
  TbFileTypeXls,
  TbFileTypeZip,
  TbFileUnknown,
  TbMusic,
  TbPencil,
  TbTrash,
} from 'react-icons/tb';
import type { PopupMenuAction } from '@/components/image-manager/PopupMenuContent';
import type {
  ComposerPendingFileKind,
  MenuPlacement,
  MenuSideAnchor,
} from '../../types';
import { openChatFileInNewTab } from '../../utils/message-file';
import type { ChatMessage } from '../../data/chatSidebarGateway';

export const getFileIcon = (
  fileExtension: string,
  isAudioFileMessage: boolean
) => {
  if (isAudioFileMessage) {
    return <TbMusic className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
    return <TbFileTypeJpg className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'png') {
    return <TbFileTypePng className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'pdf') {
    return <TbFileTypePdf className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'docx') {
    return <TbFileTypeDocx className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'doc') {
    return <TbFileTypeDoc className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'csv') {
    return <TbFileTypeCsv className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'ppt' || fileExtension === 'pptx') {
    return <TbFileTypePpt className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'txt') {
    return <TbFileTypeTxt className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (
    fileExtension === 'xls' ||
    fileExtension === 'xlsx' ||
    fileExtension === 'x'
  ) {
    return <TbFileTypeXls className="h-8 w-8 shrink-0 text-slate-600" />;
  }
  if (fileExtension === 'zip') {
    return <TbFileTypeZip className="h-8 w-8 shrink-0 text-slate-600" />;
  }

  return <TbFileUnknown className="h-8 w-8 shrink-0 text-slate-600" />;
};

interface BuildMessageMenuActionsProps {
  message: ChatMessage;
  resolvedMessageUrl?: string | null;
  isCurrentUser: boolean;
  isImageMessage: boolean;
  isFileMessage: boolean;
  isImageFileMessage: boolean;
  isPdfFileMessage: boolean;
  fileKind: ComposerPendingFileKind;
  fileName: string | null;
  openImageInPortal: (
    message: Pick<
      ChatMessage,
      'message' | 'file_storage_path' | 'file_mime_type'
    >,
    previewName: string
  ) => Promise<void>;
  openDocumentInPortal: (
    message: Pick<ChatMessage, 'message' | 'file_storage_path'>,
    previewName: string,
    forcePdfMime?: boolean
  ) => Promise<void>;
  handleEditMessage: (targetMessage: ChatMessage) => void;
  handleCopyMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDownloadMessage: (targetMessage: ChatMessage) => Promise<void>;
  handleDeleteMessage: (targetMessage: ChatMessage) => Promise<boolean>;
}

export const buildMessageMenuActions = ({
  message,
  resolvedMessageUrl,
  isCurrentUser,
  isImageMessage,
  isFileMessage,
  isImageFileMessage,
  isPdfFileMessage,
  fileKind,
  fileName,
  openImageInPortal,
  openDocumentInPortal,
  handleEditMessage,
  handleCopyMessage,
  handleDownloadMessage,
  handleDeleteMessage,
}: BuildMessageMenuActionsProps): PopupMenuAction[] => {
  const menuActions: PopupMenuAction[] = [
    {
      label: 'Salin',
      icon: <TbCopy className="h-4 w-4" />,
      onClick: () => {
        void handleCopyMessage(
          isImageMessage && resolvedMessageUrl
            ? {
                ...message,
                message: resolvedMessageUrl,
              }
            : message
        );
      },
    },
  ];

  if (isImageMessage || isFileMessage) {
    menuActions.unshift({
      label: 'Buka',
      icon: <TbEye className="h-4 w-4" />,
      onClick: () => {
        if (isImageMessage || isImageFileMessage) {
          void openImageInPortal(
            resolvedMessageUrl
              ? {
                  ...message,
                  message: resolvedMessageUrl,
                }
              : message,
            fileName || 'Gambar'
          );
          return;
        }
        if (isFileMessage && fileKind === 'document' && isPdfFileMessage) {
          void openDocumentInPortal(
            message,
            fileName || 'Dokumen',
            isPdfFileMessage
          );
          return;
        }
        void openChatFileInNewTab(
          message.message,
          message.file_storage_path,
          message.file_mime_type
        );
      },
    });
  }

  if (isFileMessage) {
    menuActions.splice(1, 0, {
      label: 'Download',
      icon: <TbDownload className="h-4 w-4" />,
      onClick: () => {
        void handleDownloadMessage(message);
      },
    });
  }

  if (isCurrentUser && (isImageMessage || isFileMessage)) {
    menuActions.push({
      label: 'Hapus',
      icon: <TbTrash className="h-4 w-4" />,
      onClick: () => {
        void handleDeleteMessage(message);
      },
      tone: 'danger',
    });
    return menuActions;
  }

  if (isCurrentUser) {
    if (!message.id.startsWith('temp_')) {
      menuActions.push({
        label: 'Edit',
        icon: <TbPencil className="h-4 w-4" />,
        onClick: () => handleEditMessage(message),
      });
    }

    menuActions.push({
      label: 'Hapus',
      icon: <TbTrash className="h-4 w-4" />,
      onClick: () => {
        void handleDeleteMessage(message);
      },
      tone: 'danger',
    });
  }

  return menuActions;
};

export const getMessageMenuClasses = (
  menuPlacement: MenuPlacement,
  menuSideAnchor: MenuSideAnchor
) => {
  const sideMenuPositionClass =
    menuSideAnchor === 'bottom'
      ? 'bottom-0'
      : menuSideAnchor === 'top'
        ? 'top-0'
        : 'top-1/2 -translate-y-1/2';
  const sidePlacementClass =
    menuPlacement === 'left'
      ? `right-full mr-2 ${sideMenuPositionClass} ${
          menuSideAnchor === 'bottom'
            ? 'origin-bottom-right'
            : menuSideAnchor === 'top'
              ? 'origin-top-right'
              : 'origin-right'
        }`
      : menuPlacement === 'right'
        ? `left-full ml-2 ${sideMenuPositionClass} ${
            menuSideAnchor === 'bottom'
              ? 'origin-bottom-left'
              : menuSideAnchor === 'top'
                ? 'origin-top-left'
                : 'origin-left'
          }`
        : menuPlacement === 'down'
          ? 'bottom-full mb-2 left-0 origin-bottom-left'
          : 'top-full mt-2 left-0 origin-top-left';
  const sideArrowAnchorClass =
    menuSideAnchor === 'bottom'
      ? 'top-[78%] -translate-y-1/2'
      : menuSideAnchor === 'top'
        ? 'top-[22%] -translate-y-1/2'
        : 'top-1/2 -translate-y-1/2';

  return {
    sidePlacementClass,
    sideArrowAnchorClass,
  };
};
