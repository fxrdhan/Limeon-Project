import Button from '@/components/button';
import Loading from '@/components/loading';
import { Card } from '@/components/card';
import { TbArrowLeft, TbPrinter, TbZoomIn, TbZoomOut } from 'react-icons/tb';
import { formatDateOnlyDisplayValue } from '@/lib/formatters';
import {
  formatPurchaseDocumentCurrency,
  getPurchaseDocumentItemCode,
  getPurchaseDocumentItemName,
  getPurchaseDocumentPaymentMethodLabel,
  getPurchaseDocumentPaymentStatusClass,
  getPurchaseDocumentPaymentStatusLabel,
  getPurchaseDocumentPositivePercentageLabel,
} from '../purchaseDocument';
import { useViewPurchasePage } from './useViewPurchasePage';

const ViewPurchase = () => {
  const {
    purchase,
    items,
    loading,
    scale,
    printRef,
    subtotals,
    navigateToPurchaseList,
    openPrintableVersion,
    increaseScale,
    decreaseScale,
  } = useViewPurchasePage();

  if (loading) {
    return <Loading message="Memuat data pembelian..." />;
  }

  if (!purchase) {
    return (
      <div className="text-center p-6">
        <p className="text-red-500 mb-4">Data pembelian tidak ditemukan</p>
        <Button onClick={navigateToPurchaseList}>
          <TbArrowLeft className="mr-2" /> Kembali ke Daftar Pembelian
        </Button>
      </div>
    );
  }

  const { baseTotal, discountTotal, afterDiscountTotal, vatTotal, grandTotal } =
    subtotals;

  return (
    <Card>
      <div className="flex justify-between items-center mb-4 print:hidden">
        <Button
          type="button"
          variant="secondary"
          onClick={navigateToPurchaseList}
        >
          <div className="flex items-center">
            <TbArrowLeft className="mr-2" /> <span>Kembali</span>
          </div>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={decreaseScale}
            title="Perkecil"
          >
            <TbZoomOut />
          </Button>
          <span className="mx-1 text-sm">{Math.round(scale * 100)}%</span>
          <Button
            type="button"
            variant="secondary"
            onClick={increaseScale}
            title="Perbesar"
          >
            <TbZoomIn />
          </Button>
          <Button onClick={openPrintableVersion} variant="primary">
            <TbPrinter className="mr-2" /> Print View
          </Button>
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: '85vh' }}>
        <div
          ref={printRef}
          className="bg-white p-6 shadow-xs print:shadow-none transition-transform duration-200"
          style={{
            width: '215mm',
            minHeight: '330mm',
            margin: '0 auto',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-center mb-2">
              FAKTUR PEMBELIAN
            </h1>
            <div className="border-b-2 border-slate-400 mb-4"></div>

            <div className="flex justify-between gap-4">
              <div className="w-1/2">
                <div className="text-left mb-4">
                  <h2 className="font-bold text-lg text-slate-800">
                    {purchase.supplier?.name || 'Supplier'}
                  </h2>
                  <div className="text-sm text-slate-600">
                    <p>{purchase.supplier?.address || ''}</p>
                  </div>
                </div>

                <div className="text-left">
                  <h2 className="text-sm text-slate-600">Customer:</h2>
                  <div className="text-sm ">
                    <p className="font-bold">
                      {purchase.customer_name || 'Data belum tersedia'}
                    </p>
                    <p className="text-slate-600">
                      {purchase.customer_address || 'Alamat belum tersedia'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-1/2">
                <div className="bg-slate-50 p-3 rounded-md text-sm">
                  <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                    <span className="text-left font-bold">No. Faktur</span>
                    <span className="px-2">:</span>
                    <span>{purchase.invoice_number}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                    <span className="text-left">Tanggal</span>
                    <span className="px-2">:</span>
                    <span>{formatDateOnlyDisplayValue(purchase.date)}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                    <span className="text-left">Jatuh Tempo</span>
                    <span className="px-2">:</span>
                    <span>
                      {purchase.due_date
                        ? formatDateOnlyDisplayValue(purchase.due_date)
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 text-xs">
                  <th className="border p-1 text-left">No.</th>
                  <th className="border p-1 text-left">Kode</th>
                  <th className="border p-1 text-left">Nama Item</th>
                  <th className="border p-1 text-center">Batch</th>
                  <th className="border p-1 text-center">Exp</th>
                  <th className="border p-1 text-center">Qty</th>
                  <th className="border p-1 text-center">Satuan</th>
                  <th className="border p-1 text-right">Harga</th>
                  <th className="border p-1 text-right">Disc</th>
                  {!purchase.is_vat_included && (
                    <th className="border p-1 text-right">PPN</th>
                  )}
                  <th className="border p-1 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={purchase.is_vat_included ? 10 : 11}
                      className="border p-2 text-center text-slate-500 text-xs"
                    >
                      Tidak ada item
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50 text-xs">
                      <td className="border p-1 text-center">{index + 1}</td>
                      <td className="border p-1">
                        {getPurchaseDocumentItemCode(item)}
                      </td>
                      <td className="border p-1">
                        {getPurchaseDocumentItemName(item)}
                      </td>
                      <td className="border p-1 text-center">
                        {item.batch_no || '-'}
                      </td>
                      <td className="border p-1 text-center">
                        {item.expiry_date
                          ? formatDateOnlyDisplayValue(item.expiry_date, {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="border p-1 text-center">
                        {item.quantity}
                      </td>
                      <td className="border p-1 text-center">{item.unit}</td>
                      <td className="border p-1 text-right">
                        {formatPurchaseDocumentCurrency(item.price)}
                      </td>
                      <td className="border p-1 text-right">
                        {getPurchaseDocumentPositivePercentageLabel(
                          item.discount
                        )}
                      </td>
                      {!purchase.is_vat_included && (
                        <td className="border p-1 text-right">
                          {getPurchaseDocumentPositivePercentageLabel(
                            item.vat_percentage
                          )}
                        </td>
                      )}
                      <td className="border p-1 text-right">
                        {formatPurchaseDocumentCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-8">
            <div className="max-w-md">
              <div className="grid grid-cols-[1fr_auto_1fr] mb-1 text-sm">
                <span className="text-left">Diperiksa oleh</span>
                <span className="px-2">:</span>
                <span>
                  {purchase.supplier?.contact_person ||
                    purchase.checked_by ||
                    '-'}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] mb-1 text-sm">
                <span className="text-left">Status Pembayaran</span>
                <span className="px-2">:</span>
                <span
                  className={getPurchaseDocumentPaymentStatusClass(
                    purchase.payment_status
                  )}
                >
                  {getPurchaseDocumentPaymentStatusLabel(
                    purchase.payment_status
                  )}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] mb-1 text-sm">
                <span className="text-left">Metode Pembayaran</span>
                <span className="px-2">:</span>
                <span>
                  {getPurchaseDocumentPaymentMethodLabel(
                    purchase.payment_method
                  )}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] mb-1 text-sm">
                <span className="text-left">Catatan</span>
                <span className="px-2">:</span>
                <span>{purchase.notes || '-'}</span>
              </div>
              {purchase.is_vat_included && (
                <div className="grid grid-cols-[1fr_auto_1fr] mt-2">
                  <span className="text-left"></span>
                  <span className="px-2"></span>
                  <span className="text-sm">
                    * PPN sudah termasuk dalam harga
                  </span>
                </div>
              )}
            </div>

            <div className="border p-4 min-w-[250px] text-sm">
              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left">Subtotal</span>
                <span className="px-2">:</span>
                <span className="text-right">
                  {formatPurchaseDocumentCurrency(baseTotal)}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left">Diskon</span>
                <span className="px-2">:</span>
                <span className="text-right">
                  {formatPurchaseDocumentCurrency(discountTotal, '-')}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left">Setelah Diskon</span>
                <span className="px-2">:</span>
                <span className="text-right">
                  {formatPurchaseDocumentCurrency(afterDiscountTotal)}
                </span>
              </div>

              {!purchase.is_vat_included && (
                <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                  <span className="text-left">PPN</span>
                  <span className="px-2">:</span>
                  <span className="text-right">
                    {formatPurchaseDocumentCurrency(vatTotal, '+')}
                  </span>
                </div>
              )}

              <div className="border-t pt-2 grid grid-cols-[1fr_auto_1fr] font-bold">
                <span className="text-left">TOTAL</span>
                <span className="px-2">:</span>
                <span className="text-right">
                  {formatPurchaseDocumentCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ViewPurchase;
