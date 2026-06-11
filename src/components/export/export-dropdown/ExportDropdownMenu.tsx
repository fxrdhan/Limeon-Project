import Button from '@/components/button';
import { AnimatePresence, motion } from 'motion/react';
import type { CSSProperties, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { TbBrandGoogle, TbCsv, TbJson, TbTableFilled } from 'react-icons/tb';

interface ExportDropdownMenuProps {
  isOpen: boolean;
  isAvailable: boolean;
  portalStyle: CSSProperties;
  dropdownRef: RefObject<HTMLDivElement | null>;
  isGoogleSheetsInitializing: boolean;
  isGoogleSheetsLoading: boolean;
  isAuthenticating: boolean;
  onCsvExport: () => void;
  onExcelExport: () => void;
  onJsonExport: () => void;
  onGoogleSheetsExport: () => void;
}

const EXPORT_DROPDOWN_OPTION_CLASS =
  'w-full px-3 py-2 text-left text-slate-700 hover:text-slate-900 hover:bg-slate-200 flex items-center gap-2 justify-start first:rounded-t-lg last:rounded-b-lg group';

export const ExportDropdownMenu = ({
  isOpen,
  isAvailable,
  portalStyle,
  dropdownRef,
  isGoogleSheetsInitializing,
  isGoogleSheetsLoading,
  isAuthenticating,
  onCsvExport,
  onExcelExport,
  onJsonExport,
  onGoogleSheetsExport,
}: ExportDropdownMenuProps) => {
  if (!isAvailable || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          style={portalStyle}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="origin-top bg-white rounded-xl border border-slate-200 shadow-xl"
          role="menu"
          tabIndex={-1}
          onClick={event => event.stopPropagation()}
        >
          <div className="px-1 py-1">
            <Button
              variant="text"
              size="sm"
              withUnderline={false}
              onClick={onCsvExport}
              className={EXPORT_DROPDOWN_OPTION_CLASS}
            >
              <TbCsv className="h-6 w-6 text-slate-500 group-hover:text-primary" />
              <span>Export ke CSV</span>
            </Button>

            <Button
              variant="text"
              size="sm"
              withUnderline={false}
              onClick={onExcelExport}
              className={EXPORT_DROPDOWN_OPTION_CLASS}
            >
              <TbTableFilled className="h-6 w-6 text-slate-500 group-hover:text-primary" />
              <span>Export ke Excel</span>
            </Button>

            <Button
              variant="text"
              size="sm"
              withUnderline={false}
              onClick={onJsonExport}
              className={EXPORT_DROPDOWN_OPTION_CLASS}
            >
              <TbJson className="h-6 w-6 text-slate-500 group-hover:text-primary" />
              <span>Export ke JSON</span>
            </Button>

            <Button
              variant="text"
              size="sm"
              withUnderline={false}
              onClick={onGoogleSheetsExport}
              disabled={
                isGoogleSheetsInitializing ||
                isGoogleSheetsLoading ||
                isAuthenticating
              }
              className={`${EXPORT_DROPDOWN_OPTION_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <TbBrandGoogle className="h-5 w-5 text-slate-500 group-hover:text-primary" />
              <span>
                {isGoogleSheetsInitializing
                  ? 'Menyiapkan Google...'
                  : isAuthenticating
                    ? 'Authenticating...'
                    : isGoogleSheetsLoading
                      ? 'Exporting...'
                      : 'Export ke Google Sheets'}
              </span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
