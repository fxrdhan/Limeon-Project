import { UploadInvoiceDialogPortal } from './upload-invoice/UploadInvoiceDialogPortal';
import { InvoiceFullPreviewPortal } from './upload-invoice/InvoiceFullPreviewPortal';
import { useUploadInvoicePortal } from './useUploadInvoicePortal';

interface UploadInvoicePortalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadInvoicePortal = ({ isOpen, onClose }: UploadInvoicePortalProps) => {
  const { fullPreviewPortalProps, uploadDialogPortalProps } =
    useUploadInvoicePortal({
      isOpen,
      onClose,
    });

  return (
    <>
      <UploadInvoiceDialogPortal {...uploadDialogPortalProps} />

      <InvoiceFullPreviewPortal {...fullPreviewPortalProps} />
    </>
  );
};

export default UploadInvoicePortal;
