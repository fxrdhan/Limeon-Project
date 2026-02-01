import React from 'react';
import type { InvoiceLayoutProps } from '@/types';

const InvoiceLayout: React.FC<InvoiceLayoutProps> = ({
  purchase,
  items,
  subtotals,
  printRef,
  title = 'FAKTUR PEMBELIAN',
}) => {
  return (
    <div
      ref={printRef}
      className="faktur-a4 bg-white p-6 shadow-xs print:shadow-none"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-2">{title}</h1>
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
            <div className="bg-slate-50 p-3 rounded-sm text-sm">
              <div className="grid grid-cols-[auto_auto_1fr] mb-1">
                <span className="text-left font-bold w-[100px]">
                  No. Faktur
                </span>
                <span className="px-2">:</span>
                <span>{purchase.invoice_number}</span>
              </div>
              <div className="grid grid-cols-[auto_auto_1fr] mb-1">
                <span className="text-left w-[100px]">Tanggal</span>
                <span className="px-2">:</span>
                <span>
                  {new Date(purchase.date).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div className="grid grid-cols-[auto_auto_1fr] mb-1">
                <span className="text-left w-[100px]">Jatuh Tempo</span>
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
            <tr className="bg-slate-100 text-xs">
              <th className="border p-1 pt-2 pb-2 text-center w-[5%]">No.</th>
              <th className="border p-1 pt-2 pb-2 text-left w-[10%]">Kode</th>
              <th className="border p-1 pt-2 pb-2 text-left">Nama Item</th>
              <th className="border p-1 pt-2 pb-2 text-center w-[10%]">
                Batch
              </th>
              <th className="border p-1 pt-2 pb-2 text-center w-[10%]">Exp</th>
              <th className="border p-1 pt-2 pb-2 text-center w-[8%]">Qty</th>
              <th className="border p-1 pt-2 pb-2 text-center w-[8%]">
                Satuan
              </th>
              <th className="border p-1 pt-2 pb-2 text-right w-[12%]">Harga</th>
              <th className="border p-1 pt-2 pb-2 text-right w-[8%]">Disc</th>
              {!purchase.is_vat_included && (
                <th className="border p-1 pt-2 pb-2 text-right w-[8%]">PPN</th>
              )}
              <th className="border p-1 pt-2 pb-2 text-right w-[12%]">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={purchase.is_vat_included ? 10 : 11}
                  className="border p-2 pt-3 pb-3 text-center text-slate-500 text-xs"
                >
                  Tidak ada item
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 text-xs">
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
                    {item.price.toLocaleString('id-ID')}
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
                    {item.subtotal.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between mt-8">
        <div className="max-w-md">
          <div className="grid grid-cols-[auto_auto_1fr] mb-1 text-sm">
            <span className="text-left w-[120px]">Diperiksa oleh</span>
            <span className="px-2">:</span>
            <span>
              {purchase.supplier?.contact_person || purchase.checked_by || '-'}
            </span>
          </div>

          <div className="grid grid-cols-[auto_auto_1fr] mb-1 text-sm">
            <span className="text-left w-[120px]">Status Pembayaran</span>
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

          <div className="grid grid-cols-[auto_auto_1fr] mb-1 text-sm">
            <span className="text-left w-[120px]">Metode Pembayaran</span>
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

          <div className="grid grid-cols-[auto_auto_1fr] mb-1 text-sm">
            <span className="text-left w-[120px]">Catatan</span>
            <span className="px-2">:</span>
            <span>{purchase.notes || '-'}</span>
          </div>
          {purchase.is_vat_included && (
            <div className="grid grid-cols-[auto_auto_1fr] mt-2">
              <span className="text-left w-[120px]"></span>
              <span className="px-2"></span>
              <span className="text-sm italic">
                * PPN sudah termasuk dalam harga
              </span>
            </div>
          )}
        </div>

        <div className="border p-4 min-w-[250px] text-sm">
          <div className="grid grid-cols-[1fr_auto_auto] mb-1">
            <span className="text-left">Subtotal</span>
            <span className="px-2">:</span>
            <span className="text-right">
              {subtotals.baseTotal.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] mb-1">
            <span className="text-left">Diskon</span>
            <span className="px-2">:</span>
            <span className="text-right">
              -{subtotals.discountTotal.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] mb-1">
            <span className="text-left">Setelah Diskon</span>
            <span className="px-2">:</span>
            <span className="text-right">
              {subtotals.afterDiscountTotal.toLocaleString('id-ID')}
            </span>
          </div>

          {!purchase.is_vat_included && (
            <div className="grid grid-cols-[1fr_auto_auto] mb-1">
              <span className="text-left">PPN</span>
              <span className="px-2">:</span>
              <span className="text-right">
                +{subtotals.vatTotal.toLocaleString('id-ID')}
              </span>
            </div>
          )}

          <div className="border-t pt-2 grid grid-cols-[1fr_auto_auto] font-bold">
            <span className="text-left">TOTAL</span>
            <span className="px-2">:</span>
            <span className="text-right">
              {subtotals.grandTotal.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceLayout;
