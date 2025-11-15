import { useEffect, useState } from 'react';
import type { PurchaseData, PurchaseItem, Subtotals } from '@/types';

const PrintPurchase = () => {
  // Use lazy initializers to load from sessionStorage once
  const [purchase] = useState<PurchaseData | null>(() => {
    const storedData = sessionStorage.getItem('purchaseData');
    return storedData ? JSON.parse(storedData).purchase : null;
  });
  const [items] = useState<PurchaseItem[]>(() => {
    const storedData = sessionStorage.getItem('purchaseData');
    return storedData ? JSON.parse(storedData).items : [];
  });
  const [subtotals] = useState<Subtotals | null>(() => {
    const storedData = sessionStorage.getItem('purchaseData');
    return storedData ? JSON.parse(storedData).subtotals : null;
  });
  const [loading] = useState(false);

  const formatCurrency = (value: number | bigint, prefix = '') => {
    const formatter = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${prefix}${formatter.format(value)}`;
  };

  // Trigger print after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className="text-center p-6">Memuat data...</div>;
  }

  if (!purchase) {
    return (
      <div className="text-center p-6 text-red-500">
        Data faktur tidak ditemukan. Silakan kembali ke halaman sebelumnya.
      </div>
    );
  }

  return (
    <div className="faktur-a4 bg-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          FAKTUR PEMBELIAN
        </h1>
        <div className="border-b-2 border-gray-400 mb-4"></div>

        <div className="flex justify-between gap-4">
          <div className="w-1/2">
            <div className="text-left mb-4">
              <h2 className="font-bold text-lg text-gray-800">
                {purchase.supplier?.name || 'Supplier'}
              </h2>
              <div className="text-sm text-gray-600">
                <p>{purchase.supplier?.address || ''}</p>
              </div>
            </div>

            <div className="text-left">
              <h2 className="text-sm text-gray-600">Customer:</h2>
              <div className="text-sm">
                <p className="font-bold">
                  {purchase.customer_name || 'Data belum tersedia'}
                </p>
                <p className="text-gray-600">
                  {purchase.customer_address || 'Alamat belum tersedia'}
                </p>
              </div>
            </div>
          </div>

          <div className="w-1/2">
            <div className="bg-gray-50 p-3 rounded-sm text-sm">
              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left font-bold">No. Faktur</span>
                <span className="px-2">:</span>
                <span>{purchase.invoice_number}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left">Tanggal</span>
                <span className="px-2">:</span>
                <span>
                  {new Date(purchase.date).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left">Jatuh Tempo</span>
                <span className="px-2">:</span>
                <span>
                  {purchase.due_date
                    ? new Date(purchase.due_date).toLocaleDateString('id-ID')
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
            <tr className="bg-gray-100 text-xs">
              <th className="border p-1 pt-2 pb-2 text-left">No.</th>
              <th className="border p-1 pt-2 pb-2 text-left">Kode</th>
              <th className="border p-1 pt-2 pb-2 text-left">Nama Item</th>
              <th className="border p-1 pt-2 pb-2 text-center">Batch</th>
              <th className="border p-1 pt-2 pb-2 text-center">Exp</th>
              <th className="border p-1 pt-2 pb-2 text-center">Qty</th>
              <th className="border p-1 pt-2 pb-2 text-center">Satuan</th>
              <th className="border p-1 pt-2 pb-2 text-right">Harga</th>
              <th className="border p-1 pt-2 pb-2 text-right">Disc</th>
              {!purchase.is_vat_included && (
                <th className="border p-1 pt-2 pb-2 text-right">PPN</th>
              )}
              <th className="border p-1 pt-2 pb-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={purchase.is_vat_included ? 10 : 11}
                  className="border p-2 pt-3 pb-3 text-center text-gray-500 text-xs"
                >
                  Tidak ada item
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 text-xs">
                  <td className="border p-1 pt-2 pb-2 text-center">
                    {index + 1}
                  </td>
                  <td className="border p-1 pt-2 pb-2">
                    {item.item?.code || '-'}
                  </td>
                  <td className="border p-1 pt-2 pb-2">
                    {item.item?.name || 'Item tidak ditemukan'}
                  </td>
                  <td className="border p-1 pt-2 pb-2 text-center">
                    {item.batch_no || '-'}
                  </td>
                  <td className="border p-1 pt-2 pb-2 text-center">
                    {item.expiry_date
                      ? new Date(item.expiry_date).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td className="border p-1 pt-2 pb-2 text-center">
                    {item.quantity}
                  </td>
                  <td className="border p-1 pt-2 pb-2 text-center">
                    {item.unit}
                  </td>
                  <td className="border p-1 pt-2 pb-2 text-right">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="border p-1 pt-2 pb-2 text-right">
                    {item.discount > 0 ? `${item.discount}%` : '-'}
                  </td>
                  {!purchase.is_vat_included && (
                    <td className="border p-1 pt-2 pb-2 text-right">
                      {item.vat_percentage > 0
                        ? `${item.vat_percentage}%`
                        : '-'}
                    </td>
                  )}
                  <td className="border p-1 pt-2 pb-2 text-right">
                    {formatCurrency(item.subtotal)}
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
              {purchase.supplier?.contact_person || purchase.checked_by || '-'}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] mb-1 text-sm">
            <span className="text-left">Status Pembayaran</span>
            <span className="px-2">:</span>
            <span
              className={`${
                purchase.payment_status === 'paid'
                  ? 'text-green-600'
                  : purchase.payment_status === 'partial'
                    ? 'text-orange-600'
                    : 'text-red-600'
              }`}
            >
              {purchase.payment_status === 'paid'
                ? 'Lunas'
                : purchase.payment_status === 'partial'
                  ? 'Sebagian'
                  : 'Belum Dibayar'}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] mb-1 text-sm">
            <span className="text-left">Metode Pembayaran</span>
            <span className="px-2">:</span>
            <span>
              {purchase.payment_method === 'cash'
                ? 'Tunai'
                : purchase.payment_method === 'transfer'
                  ? 'Transfer'
                  : purchase.payment_method === 'credit'
                    ? 'Kredit'
                    : purchase.payment_method}
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
              <span className="text-sm">* PPN sudah termasuk dalam harga</span>
            </div>
          )}
        </div>

        {subtotals && (
          <div className="border p-4 min-w-[250px] text-sm">
            <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
              <span className="text-left">Subtotal</span>
              <span className="px-2">:</span>
              <span className="text-right">
                {formatCurrency(subtotals.baseTotal)}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
              <span className="text-left">Diskon</span>
              <span className="px-2">:</span>
              <span className="text-right">
                {formatCurrency(subtotals.discountTotal, '-')}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
              <span className="text-left">Setelah Diskon</span>
              <span className="px-2">:</span>
              <span className="text-right">
                {formatCurrency(subtotals.afterDiscountTotal)}
              </span>
            </div>

            {!purchase.is_vat_included && (
              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left">PPN</span>
                <span className="px-2">:</span>
                <span className="text-right">
                  {formatCurrency(subtotals.vatTotal, '+')}
                </span>
              </div>
            )}

            <div className="border-t pt-2 grid grid-cols-[1fr_auto_1fr] font-bold">
              <span className="text-left">TOTAL</span>
              <span className="px-2">:</span>
              <span className="text-right">
                {formatCurrency(subtotals.grandTotal)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintPurchase;
