import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TbChevronDown, TbTrash } from 'react-icons/tb';
import { AnimatePresence, motion } from 'motion/react';
import {
  ColDef,
  ColGroupDef,
  type ColumnState,
  type FirstDataRenderedEvent,
} from 'ag-grid-community';
import Button from '@/components/button';
import { PackageConversionInput } from '../atoms';
import {
  DataGrid,
  createTextColumn,
  createCurrencyColumn,
} from '@/components/ag-grid';
import type { AgGridReact } from 'ag-grid-react';
import type {
  PackageConversion,
  PackageConversionLogicFormData,
} from '../../shared/types';
import type { ItemPackage } from '@/types/database';

const DeleteButton = React.memo(
  ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
    <Button
      variant="text-danger"
      size="sm"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled}
    >
      <TbTrash />
    </Button>
  )
);

DeleteButton.displayName = 'DeleteButton';

const parseCurrencyValue = (value: unknown) => {
  if (typeof value === 'number') return Math.max(0, value);
  if (typeof value === 'string') {
    const numeric = value.replace(/[^0-9]/g, '');
    const parsed = Number(numeric);
    return Math.max(0, Number.isNaN(parsed) ? 0 : parsed);
  }
  return 0;
};

interface LocalItemPackageConversionManagerProps {
  isExpanded?: boolean;
  onExpand?: () => void;
  stackClassName?: string;
  stackStyle?: React.CSSProperties;
  baseUnit: string;
  availableUnits: ItemPackage[];
  conversions: PackageConversion[];
  formData: PackageConversionLogicFormData;
  onFormDataChange: (data: PackageConversionLogicFormData) => void;
  onAddConversion: () => void;
  onRemoveConversion: (id: string) => void;
  onUpdateSellPrice: (id: string, sellPrice: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  disabled?: boolean;
}

export default function ItemPackageConversionManager({
  isExpanded = true,
  onExpand,
  stackClassName,
  stackStyle,
  baseUnit,
  availableUnits,
  conversions,
  formData,
  onFormDataChange,
  onAddConversion,
  onRemoveConversion,
  onUpdateSellPrice,
  onInteractionStart,
  onInteractionEnd,
  disabled = false,
}: LocalItemPackageConversionManagerProps) {
  const gridRef = useRef<AgGridReact>(null);
  const columnStateRef = useRef<ColumnState[] | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hasAutoSizedRef = useRef(false);
  const [popupParent, setPopupParent] = useState<HTMLElement | null>(null);
  const filteredAvailableUnits = useMemo(
    () =>
      availableUnits
        .filter(unit => unit.name !== baseUnit)
        .filter(unit => !conversions.some(uc => uc.unit.name === unit.name)),
    [availableUnits, baseUnit, conversions]
  );

  const filteredConversions = useMemo(
    () =>
      conversions.filter(
        (uc, index, self) =>
          index === self.findIndex(u => u.unit.name === uc.unit.name) && uc.unit
      ),
    [conversions]
  );

  const handleFirstDataRendered = useCallback(
    (event: FirstDataRenderedEvent) => {
      const api = event.api;
      if (!api || api.isDestroyed()) return;

      if (columnStateRef.current) {
        api.applyColumnState({
          state: columnStateRef.current,
          applyOrder: true,
        });
      } else {
        columnStateRef.current = api.getColumnState();
      }
      if (sectionRef.current) {
        api.setGridOption('popupParent', sectionRef.current);
      }
      api.autoSizeAllColumns();
    },
    []
  );

  const autoSizeAllColumns = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed()) return;
    api.autoSizeAllColumns();
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      hasAutoSizedRef.current = false;
      return;
    }
    if (!hasAutoSizedRef.current) {
      autoSizeAllColumns();
      hasAutoSizedRef.current = true;
    }
  }, [autoSizeAllColumns, isExpanded]);

  const handleFocusCapture = useCallback(() => {
    if (disabled) return;
    onInteractionStart?.();
  }, [disabled, onInteractionStart]);

  const handleBlurCapture = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      if (disabled) return;
      const nextTarget = event.relatedTarget as Node | null;
      const activeElement = document.activeElement as Node | null;
      const isAgPopupTarget = (node: Node | null) => {
        if (!node || !(node instanceof HTMLElement)) return false;
        return Boolean(
          node.closest('.ag-popup, .ag-menu, .ag-dialog, .ag-tooltip')
        );
      };

      if (
        sectionRef.current?.contains(nextTarget) ||
        sectionRef.current?.contains(activeElement) ||
        isAgPopupTarget(nextTarget) ||
        isAgPopupTarget(activeElement)
      ) {
        return;
      }
      if (!sectionRef.current?.contains(nextTarget)) {
        onInteractionEnd?.();
      }
    },
    [disabled, onInteractionEnd]
  );

  const handleCellEditingStarted = useCallback(() => {
    if (disabled) return;
    onInteractionStart?.();
  }, [disabled, onInteractionStart]);

  const handleCellEditingStopped = useCallback(() => {
    if (disabled) return;
    onInteractionEnd?.();
  }, [disabled, onInteractionEnd]);

  const handleCellValueChanged = useCallback(
    (event: {
      colDef: { field?: string };
      data?: { id: string };
      newValue?: unknown;
    }) => {
      if (event.colDef.field !== 'sell_price') return;
      if (!event.data) return;
      const nextValue = parseCurrencyValue(event.newValue);
      onUpdateSellPrice(event.data.id, nextValue);
    },
    [onUpdateSellPrice]
  );

  const columnDefs = useMemo(
    () =>
      [
        {
          ...createTextColumn({
            field: 'unit.name',
            headerName: 'Turunan',
          }),
          enableCellChangeFlash: false,
          suppressHeaderContextMenu: true,
        },
        {
          ...createTextColumn({
            field: 'conversion_rate',
            headerName: 'Konversi',
            cellStyle: { textAlign: 'center' },
          }),
          enableCellChangeFlash: false,
          suppressHeaderContextMenu: true,
        },
        {
          ...createCurrencyColumn({
            field: 'base_price',
            headerName: 'H. Pokok',
          }),
          enableCellChangeFlash: false,
          suppressHeaderContextMenu: true,
        },
        {
          ...createCurrencyColumn({
            field: 'sell_price',
            headerName: 'H. Jual',
          }),
          enableCellChangeFlash: false,
          editable: !disabled,
          valueParser: params => parseCurrencyValue(params.newValue),
          suppressHeaderContextMenu: true,
        },
        {
          field: 'actions',
          headerName: 'Aksi',
          sortable: false,
          resizable: false,
          cellStyle: { textAlign: 'center' },
          enableCellChangeFlash: false,
          suppressHeaderContextMenu: true,
          cellRenderer: (params: { data?: { id: string } }) =>
            params.data ? (
              <DeleteButton
                onClick={() => onRemoveConversion(params.data!.id)}
                disabled={disabled}
              />
            ) : null,
        },
      ] as (ColDef | ColGroupDef)[],
    [disabled, onRemoveConversion]
  );

  useEffect(() => {
    if (sectionRef.current && popupParent !== sectionRef.current) {
      setPopupParent(sectionRef.current);
    }
  }, [popupParent]);

  return (
    <section
      ref={sectionRef}
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${stackClassName || ''}`}
      style={stackStyle}
      data-stack-card="true"
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <div
        className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
        onClick={() => onExpand?.()}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Konversi Kemasan
        </h2>
        <TbChevronDown
          size={16}
          className={`text-slate-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="conversion-content"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-4 md:p-5 flex flex-col gap-4">
              <div className="w-full">
                <PackageConversionInput
                  baseUnit={baseUnit}
                  availableUnits={filteredAvailableUnits}
                  formData={formData}
                  onFormDataChange={onFormDataChange}
                  onAddConversion={onAddConversion}
                  tabIndex={18}
                  disabled={disabled}
                />
              </div>
              {filteredConversions.length > 0 ? (
                <div className="w-full flex flex-col">
                  <div className="overflow-hidden" style={{ height: '130px' }}>
                    <DataGrid
                      ref={gridRef}
                      disableFiltering={true}
                      rowData={filteredConversions}
                      onFirstDataRendered={handleFirstDataRendered}
                      animateRows={false}
                      suppressAnimationFrame={true}
                      suppressColumnMoveAnimation={true}
                      columnDefs={columnDefs}
                      domLayout="normal"
                      overlayNoRowsTemplate="<span class='text-slate-500'>Belum ada data konversi</span>"
                      rowClass=""
                      getRowId={params => params.data?.id}
                      suppressMovableColumns={true}
                      suppressAutoSize={true}
                      cellSelection={false}
                      rowSelection={undefined}
                      onCellValueChanged={handleCellValueChanged}
                      onCellEditingStarted={handleCellEditingStarted}
                      onCellEditingStopped={handleCellEditingStopped}
                      popupParent={popupParent || undefined}
                      className="ag-theme-quartz h-full"
                      style={{ height: '100%' }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
