import { useConfirmDialog } from '@/components/dialog-box/useConfirmDialog';
import { googleSheetsService } from '@/utils/googleSheetsApi';
import type { GridApi } from 'ag-grid-community';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { processGridDataForGoogleSheets } from './googleSheetsData';

interface UseGoogleSheetsExportProps {
  gridApi: GridApi | null;
  filename: string;
  isOpen: boolean;
  closeDropdown: () => void;
}

const showLoadingInTab = (tab: Window) => {
  try {
    const fontFamily =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--font-sans')
        .trim() || 'system-ui, sans-serif';

    tab.document.write(`
      <html>
        <head><title>Creating Google Sheet...</title></head>
        <body style="font-family: ${fontFamily}; text-align: center; padding: 50px; background: oklch(97% 0 0);">
          <h2>Creating your Google Sheet...</h2>
          <p>Please wait while we prepare your data...</p>
          <div style="margin: 20px auto; width: 50px; height: 50px; border: 3px solid oklch(91.6% 0 0); border-top: 3px solid oklch(65.3% 0.135 242.7); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </body>
      </html>
    `);
  } catch {
    // Ignore best-effort placeholder rendering failures.
  }
};

export const useGoogleSheetsExport = ({
  gridApi,
  filename,
  isOpen,
  closeDropdown,
}: UseGoogleSheetsExportProps) => {
  const [isGoogleSheetsInitializing, setIsGoogleSheetsInitializing] =
    useState(false);
  const [isGoogleSheetsLoading, setIsGoogleSheetsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { openConfirmDialog } = useConfirmDialog();
  const retryExportRef = useRef<() => void>(() => undefined);
  const isGoogleSheetsExportInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      isGoogleSheetsExportInFlightRef.current = false;
    };
  }, []);

  const performExportToTab = useCallback(
    async (placeholderTab: Window | null) => {
      if (!gridApi || gridApi.isDestroyed()) {
        placeholderTab?.close();
        return;
      }

      let exportSuccess = false;

      try {
        if (mountedRef.current) {
          setIsGoogleSheetsLoading(true);
        }

        const { processedData, headers } =
          await processGridDataForGoogleSheets(gridApi);
        const sheetUrl = await googleSheetsService.exportGridDataToSheets(
          processedData,
          headers,
          filename
        );

        if (!mountedRef.current) {
          placeholderTab?.close();
          return;
        }

        if (sheetUrl) {
          if (placeholderTab && !placeholderTab.closed) {
            placeholderTab.location.href = sheetUrl;
          } else {
            const openedSheetTab = window.open(
              sheetUrl,
              '_blank',
              'noopener,noreferrer'
            );
            if (!openedSheetTab) {
              window.location.assign(sheetUrl);
            }
          }
          exportSuccess = true;
        } else {
          console.warn('No sheet URL returned');
          placeholderTab?.close();
          toast.error('Failed to create Google Sheet. Please try again.');
        }
      } catch (error) {
        if (!mountedRef.current) {
          placeholderTab?.close();
          return;
        }

        console.error('Failed to export to Google Sheets:', error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('Authentication token expired')) {
          placeholderTab?.close();
          openConfirmDialog({
            title: 'Google Authentication Expired',
            message:
              'Your Google authentication has expired. Re-authenticate and try again?',
            confirmText: 'Re-authenticate',
            onConfirm: () => {
              retryExportRef.current();
            },
          });
          return;
        } else {
          if (placeholderTab && !placeholderTab.closed) {
            placeholderTab.close();
          }
          toast.error(`Failed to export to Google Sheets: ${errorMessage}`);
        }
      } finally {
        if (mountedRef.current) {
          setIsGoogleSheetsLoading(false);
        }

        if (exportSuccess && mountedRef.current) {
          closeDropdown();
        }
      }
    },
    [closeDropdown, filename, gridApi, openConfirmDialog]
  );

  const handleGoogleSheetsExport = useCallback(async () => {
    if (!gridApi || gridApi.isDestroyed()) {
      return;
    }

    if (isGoogleSheetsExportInFlightRef.current) {
      return;
    }
    isGoogleSheetsExportInFlightRef.current = true;

    try {
      if (!googleSheetsService.isInitialized()) {
        setIsGoogleSheetsInitializing(true);
        await googleSheetsService.initialize();
        if (!mountedRef.current) {
          isGoogleSheetsExportInFlightRef.current = false;
          return;
        }
        setIsGoogleSheetsInitializing(false);
      }

      if (googleSheetsService.isAuthorized()) {
        const placeholderTab = window.open('about:blank', '_blank');
        if (!placeholderTab) {
          isGoogleSheetsExportInFlightRef.current = false;
          toast.error('Please allow popups to open Google Sheets.');
          return;
        }

        showLoadingInTab(placeholderTab);
        void performExportToTab(placeholderTab).finally(() => {
          isGoogleSheetsExportInFlightRef.current = false;
        });
        return;
      }

      setIsAuthenticating(true);

      await googleSheetsService.authorize();
      if (!mountedRef.current) {
        isGoogleSheetsExportInFlightRef.current = false;
        return;
      }
      setIsAuthenticating(false);

      const placeholderTab = window.open('about:blank', '_blank');
      if (placeholderTab) showLoadingInTab(placeholderTab);
      void performExportToTab(placeholderTab).finally(() => {
        isGoogleSheetsExportInFlightRef.current = false;
      });
    } catch (error) {
      if (!mountedRef.current) {
        isGoogleSheetsExportInFlightRef.current = false;
        return;
      }

      console.error('Auth process failed:', error);
      isGoogleSheetsExportInFlightRef.current = false;
      setIsGoogleSheetsInitializing(false);
      setIsAuthenticating(false);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Authentication failed: ${errorMessage}`);
    }
  }, [gridApi, performExportToTab]);

  useEffect(() => {
    retryExportRef.current = () => {
      void handleGoogleSheetsExport();
    };
  }, [handleGoogleSheetsExport]);

  useEffect(() => {
    if (!isOpen || googleSheetsService.isInitialized()) return;

    let isCurrent = true;
    setIsGoogleSheetsInitializing(true);

    googleSheetsService
      .initialize()
      .catch(error => {
        console.error('Failed to initialize Google Sheets service:', error);
      })
      .finally(() => {
        if (isCurrent) setIsGoogleSheetsInitializing(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isOpen]);

  return {
    isGoogleSheetsInitializing,
    isGoogleSheetsLoading,
    isAuthenticating,
    handleGoogleSheetsExport,
  };
};
