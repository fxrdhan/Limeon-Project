import type { ChangeEvent } from "react";
import { useCallback, useRef } from "react";
import type { ComposerPendingFileKind } from "../types";

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "ppt",
  "pptx",
]);

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const isAllowedDocumentFile = (file: File) => {
  const extension = file.name.split(".").pop()?.trim().toLowerCase() || "";
  const mimeType = file.type.trim().toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.has(extension) || ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType);
};

interface UseComposerAttachmentPickersProps {
  closeAttachModal: () => void;
  queueComposerImage: (file: File, replaceAttachmentId?: string) => boolean;
  queueComposerFile: (
    file: File,
    fileKind: ComposerPendingFileKind,
    replaceAttachmentId?: string,
  ) => boolean;
}

export const useComposerAttachmentPickers = ({
  closeAttachModal,
  queueComposerImage,
  queueComposerFile,
}: UseComposerAttachmentPickersProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const replaceComposerImageAttachmentIdRef = useRef<string | null>(null);
  const replaceComposerDocumentAttachmentIdRef = useRef<string | null>(null);

  const clearReplaceComposerAttachmentTargets = useCallback((attachmentId?: string) => {
    if (
      attachmentId === undefined ||
      replaceComposerImageAttachmentIdRef.current === attachmentId
    ) {
      replaceComposerImageAttachmentIdRef.current = null;
    }

    if (
      attachmentId === undefined ||
      replaceComposerDocumentAttachmentIdRef.current === attachmentId
    ) {
      replaceComposerDocumentAttachmentIdRef.current = null;
    }
  }, []);

  const handleAttachImageClick = useCallback(
    (replaceAttachmentId?: string) => {
      replaceComposerImageAttachmentIdRef.current = replaceAttachmentId ?? null;
      replaceComposerDocumentAttachmentIdRef.current = null;
      closeAttachModal();
      imageInputRef.current?.click();
    },
    [closeAttachModal],
  );

  const handleAttachDocumentClick = useCallback(
    (replaceAttachmentId?: string) => {
      replaceComposerImageAttachmentIdRef.current = null;
      replaceComposerDocumentAttachmentIdRef.current = replaceAttachmentId ?? null;
      closeAttachModal();
      documentInputRef.current?.click();
    },
    [closeAttachModal],
  );

  const handleAttachAudioClick = useCallback(() => {
    closeAttachModal();
    clearReplaceComposerAttachmentTargets();
    audioInputRef.current?.click();
  }, [clearReplaceComposerAttachmentTargets, closeAttachModal]);

  const handleImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (selectedFiles.length === 0) {
        return;
      }

      const replaceAttachmentId = replaceComposerImageAttachmentIdRef.current;
      clearReplaceComposerAttachmentTargets();

      for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
        const didQueue = queueComposerImage(
          selectedFile,
          fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined,
        );
        if (!didQueue) {
          break;
        }
      }
    },
    [clearReplaceComposerAttachmentTargets, queueComposerImage],
  );

  const handleDocumentFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (selectedFiles.length === 0) {
        return;
      }

      const replaceAttachmentId = replaceComposerDocumentAttachmentIdRef.current;
      replaceComposerDocumentAttachmentIdRef.current = null;

      for (const [fileIndex, selectedFile] of selectedFiles.entries()) {
        if (!isAllowedDocumentFile(selectedFile)) {
          continue;
        }

        const didQueue = queueComposerFile(
          selectedFile,
          "document",
          fileIndex === 0 ? (replaceAttachmentId ?? undefined) : undefined,
        );
        if (!didQueue) {
          break;
        }
      }
    },
    [queueComposerFile],
  );

  const handleAudioFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (selectedFiles.length === 0) {
        return;
      }

      replaceComposerDocumentAttachmentIdRef.current = null;
      for (const selectedFile of selectedFiles) {
        const didQueue = queueComposerFile(selectedFile, "audio");
        if (!didQueue) {
          break;
        }
      }
    },
    [queueComposerFile],
  );

  return {
    imageInputRef,
    documentInputRef,
    audioInputRef,
    clearReplaceComposerAttachmentTargets,
    handleAttachImageClick,
    handleAttachDocumentClick,
    handleAttachAudioClick,
    handleImageFileChange,
    handleDocumentFileChange,
    handleAudioFileChange,
  };
};
