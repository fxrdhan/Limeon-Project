import Button from '@/components/button';
import Loading from '@/components/loading';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/card';
import DataGrid from '@/components/ag-grid/DataGrid';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  TbArrowLeft,
  TbCheck,
  TbCircleX,
  TbClock,
  TbRefresh,
} from 'react-icons/tb';
import {
  saveInvoiceToDatabase,
  regenerateInvoiceData,
} from '@/services/invoiceExtractor';
import type { ExtractedInvoiceData, ProductListItem } from '@/types';
import type { ColDef } from 'ag-grid-community';

type ProductListGridRow = ProductListItem & {
  gridId: string;
};

const ConfirmInvoicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoiceData, setInvoiceData] = useState<ExtractedInvoiceData | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [imageIdentifier, setImageIdentifier] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.extractedData) {
      setInvoiceData(JSON.parse(JSON.stringify(location.state.extractedData)));
      if (location.state.processingTime) {
        setProcessingTime(location.state.processingTime);
      }
      if (location.state.imageIdentifier) {
        setImageIdentifier(location.state.imageIdentifier);
      }
    } else {
      console.warn(
        'Tidak ada data faktur yang diterima. Kembali ke halaman purchase list.'
      );
      void navigate('/purchases');
    }
  }, [location.state, navigate]);

  const formatCurrency = (
    value: number | string | undefined | null,
    prefix = ''
  ) => {
    if (value === null || value === undefined) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '-';

    const formatter = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${prefix}${formatter.format(numValue)}`;
  };

  const handleRegenerate = async () => {
    if (!imageIdentifier) {
      setError(
        'Tidak dapat memproses ulang: Identifier gambar tidak ditemukan.'
      );
      return;
    }
    setIsRegenerating(true);
    setError(null);
    try {
      const startTime = Date.now();
      const regeneratedData = await regenerateInvoiceData(imageIdentifier);
      const newProcessingTime = (Date.now() - startTime) / 1000;
      setInvoiceData(regeneratedData);
      setProcessingTime(newProcessingTime.toFixed(1));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Gagal memproses ulang data faktur'
      );
      console.error('Error regenerating invoice:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!invoiceData || !imageIdentifier) return;
    try {
      setIsSaving(true);
      setError(null);
      await saveInvoiceToDatabase(invoiceData, imageIdentifier);
      alert('Faktur berhasil disimpan!');
      void navigate('/purchases');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan data faktur'
      );
      console.error('Error saving invoice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!invoiceData) {
    return <Loading message="Memuat data konfirmasi..." />;
  }

  const renderField = (
    label: string,
    value: string | number | undefined | null
  ) => {
    const displayValue = value ?? '-';
    return (
      <div className="mb-2">
        <span className="font-medium text-slate-600">{label}:</span>{' '}
        <span className="text-slate-800">{displayValue}</span>
      </div>
    );
  };

  const renderProductField = (
    value: string | number | undefined | null | boolean,
    isDiscount = false
  ) => {
    const displayValue = value ?? '-';
    return isDiscount && displayValue !== '-'
      ? `${displayValue}%`
      : displayValue.toLocaleString();
  };

  const renderCurrencyField = (
    label: string,
    value: number | string | undefined | null
  ) => {
    return (
      <div className="mb-2">
        <span className="font-medium text-slate-600">{label}:</span>{' '}
        <span className="text-slate-800">Rp {formatCurrency(value)}</span>
      </div>
    );
  };

  const SectionTitle = ({
    number,
    title,
  }: {
    number: string;
    title: string;
  }) => (
    <h4 className="font-medium text-slate-700 mb-2 flex items-center">
      <span className="inline-block w-6 h-6 text-xs items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2">
        {number}
      </span>
      {title}
    </h4>
  );
  const productRows: ProductListGridRow[] = (
    invoiceData.product_list ?? []
  ).map((product, index) => ({
    ...product,
    gridId: product.sku
      ? `product-${product.sku}-${index}`
      : `product-${product.product_name ?? 'unknown'}-${index}`,
  }));
  const productColumnDefs: ColDef<ProductListGridRow>[] = [
    {
      field: 'sku',
      headerName: 'SKU',
      minWidth: 100,
      valueFormatter: params => String(renderProductField(params.value)),
    },
    {
      field: 'product_name',
      headerName: 'Nama Produk',
      minWidth: 220,
      flex: 1,
      valueFormatter: params => String(renderProductField(params.value)),
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      minWidth: 80,
      cellStyle: { textAlign: 'center' },
      valueFormatter: params => String(renderProductField(params.value)),
    },
    {
      field: 'unit',
      headerName: 'Satuan',
      minWidth: 90,
      cellStyle: { textAlign: 'center' },
      valueFormatter: params => String(renderProductField(params.value)),
    },
    {
      field: 'batch_number',
      headerName: 'No. Batch',
      minWidth: 110,
      cellStyle: { textAlign: 'center' },
      valueFormatter: params => String(renderProductField(params.value)),
    },
    {
      field: 'expiry_date',
      headerName: 'Exp',
      minWidth: 110,
      cellStyle: { textAlign: 'center' },
      valueFormatter: params => String(renderProductField(params.value)),
    },
    {
      field: 'unit_price',
      headerName: 'Harga',
      minWidth: 110,
      cellStyle: { textAlign: 'right' },
      valueFormatter: params => String(renderProductField(params.value)),
    },
    {
      field: 'discount',
      headerName: 'Disk',
      minWidth: 80,
      cellStyle: { textAlign: 'right' },
      valueFormatter: params => String(renderProductField(params.value, true)),
    },
    {
      field: 'total_price',
      headerName: 'Total',
      minWidth: 120,
      cellStyle: { textAlign: 'right' },
      valueFormatter: params => String(renderProductField(params.value)),
    },
  ];

  return (
    <Card className="shadow-lg max-w-7xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Konfirmasi Data Faktur
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-slate-300"></div>
            <div className="h-[2px] w-12 bg-slate-300"></div>
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Silakan periksa data yang terekstrak dari faktur Anda.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center">
            <TbCircleX className="mr-2 h-5 w-5 text-red-500" />
            {error}
          </div>
        )}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Data yang Diekstraksi:</h3>
              {processingTime && (
                <div className="inline-flex items-center px-2.5 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <TbClock className="mr-1.5" />
                  Data selesai diekstraksi dalam {processingTime}s
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <SectionTitle number="1" title="Informasi Perusahaan" />
                <div className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-1 text-sm">
                    {renderField('Nama', invoiceData.company_details?.name)}
                    {renderField(
                      'Alamat',
                      invoiceData.company_details?.address
                    )}
                  </div>
                </div>
              </div>
              <div>
                <SectionTitle number="2" title="Informasi Faktur" />
                <div className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-1 text-sm">
                    {renderField(
                      'No. Faktur',
                      invoiceData.invoice_information?.invoice_number
                    )}
                    {renderField(
                      'Tanggal',
                      invoiceData.invoice_information?.invoice_date
                    )}
                    {renderField(
                      'Jatuh Tempo',
                      invoiceData.invoice_information?.due_date
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <SectionTitle number="3" title="Informasi Pelanggan" />
              <div className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="space-y-1 text-sm">
                  {renderField(
                    'Nama',
                    invoiceData.customer_information?.customer_name
                  )}
                  {renderField(
                    'Alamat',
                    invoiceData.customer_information?.customer_address
                  )}
                </div>
              </div>
            </div>
            <div className="mb-6">
              <SectionTitle number="4" title="Daftar Produk" />
              <DataGrid
                rowData={productRows}
                columnDefs={productColumnDefs}
                disableFiltering={true}
                suppressMovableColumns={true}
                overlayNoRowsTemplate="<span style='padding: 10px; color: oklch(55.4% 0.041 257.4);'>Tidak ada produk di faktur ini</span>"
                domLayout="normal"
                getRowId={params => params.data?.gridId}
                style={{
                  width: '100%',
                  height: Math.min(
                    420,
                    Math.max(160, productRows.length * 32 + 88)
                  ),
                }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <SectionTitle number="5" title="Informasi Tambahan" />
                <div className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-1 text-sm">
                    {renderField(
                      'Diperiksa oleh',
                      invoiceData.additional_information?.checked_by
                    )}
                  </div>
                </div>
              </div>
              <div>
                <SectionTitle number="6" title="Ringkasan Pembayaran" />
                <div className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-1 text-sm">
                    {renderCurrencyField(
                      'Total Harga',
                      invoiceData.payment_summary?.total_price
                    )}
                    {renderCurrencyField(
                      'PPN',
                      invoiceData.payment_summary?.vat
                    )}
                    <p className="font-medium text-base">
                      Total Faktur:
                      <span className="text-blue-600 ml-2">
                        Rp{' '}
                        {formatCurrency(
                          invoiceData.payment_summary?.invoice_total
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/purchases')}
        >
          <span className="flex items-center">
            <TbArrowLeft className="mr-2" />
            <span>Kembali</span>
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleRegenerate}
          disabled={isRegenerating || isSaving || !imageIdentifier}
          isLoading={isRegenerating}
          className="mx-2"
          aria-live="polite"
        >
          <TbRefresh className="mr-2" />
          Generate Ulang
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving}
          isLoading={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          aria-live="polite"
        >
          <TbCheck className="mr-2" />
          Konfirmasi & Simpan
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ConfirmInvoicePage;
