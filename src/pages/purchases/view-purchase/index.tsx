import Button from '@/components/button';
import Loading from '@/components/loading';
import { Card } from '@/components/card';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { PurchaseData, PurchaseItem } from '@/types';
import { TbArrowLeft, TbPrinter, TbZoomIn, TbZoomOut } from 'react-icons/tb';

const ViewPurchase = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (id) {
      fetchPurchaseData(id);
    }
  }, [id]);

  const fetchPurchaseData = async (purchaseId: string) => {
    try {
      setLoading(true);

      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .select(
          `
                    *,
                    supplier:suppliers(
                    name,
                    address,
                    contact_person
                    )
        `
        )
        .eq('id', purchaseId)
        .single();

      if (purchaseError) throw purchaseError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_items')
        .select(
          `
                    *,
                    item:items(
                        name,
                        code
                    )
        `
        )
        .eq('purchase_id', purchaseId)
        .order('id');

      if (itemsError) throw itemsError;

      setPurchase(purchaseData);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching purchase data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotals = () => {
    const baseTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const discountTotal = items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const discountAmount = (itemTotal * item.discount) / 100;
      return sum + discountAmount;
    }, 0);

    const afterDiscountTotal = baseTotal - discountTotal;

    const vatTotal = purchase?.is_vat_included
      ? 0
      : items.reduce((sum, item) => {
          const itemTotal = item.price * item.quantity;
          const afterDiscount = itemTotal - (itemTotal * item.discount) / 100;
          const vatAmount = afterDiscount * (item.vat_percentage / 100);
          return sum + vatAmount;
        }, 0);

    const grandTotal = purchase?.is_vat_included
      ? afterDiscountTotal
      : afterDiscountTotal + vatTotal;

    return {
      baseTotal,
      discountTotal,
      afterDiscountTotal,
      vatTotal,
      grandTotal,
    };
  };

  const openPrintableVersion = () => {
    sessionStorage.setItem(
      'purchaseData',
      JSON.stringify({
        purchase: purchase,
        items: items,
        subtotals: calculateSubtotals(),
      })
    );

    const printWindow = window.open('/purchases/print-view', '_blank');
    if (printWindow) printWindow.focus();
  };

  const increaseScale = () => {
    setScale(prev => Math.min(prev + 0.1, 1.5));
  };

  const decreaseScale = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const formatCurrency = (value: number | bigint, prefix = '') => {
    const formatter = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${prefix}${formatter.format(value)}`;
  };

  if (loading) {
    return <Loading message="Memuat data pembelian..." />;
  }

  if (!purchase) {
    return (
      <div className="text-center p-6">
        <p className="text-red-500 mb-4">Data pembelian tidak ditemukan</p>
        <Button onClick={() => navigate('/purchases')}>
          <TbArrowLeft className="mr-2" /> Kembali ke Daftar Pembelian
        </Button>
      </div>
    );
  }

  const { baseTotal, discountTotal, afterDiscountTotal, vatTotal, grandTotal } =
    calculateSubtotals();

  return (
    <Card>
      <div className="flex justify-between items-center mb-4 print:hidden">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/purchases')}
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
                  <div className="text-sm ">
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
                        ? new Date(purchase.due_date).toLocaleDateString(
                            'id-ID'
                          )
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
                      className="border p-2 text-center text-gray-500 text-xs"
                    >
                      Tidak ada item
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 text-xs">
                      <td className="border p-1 text-center">{index + 1}</td>
                      <td className="border p-1">{item.item?.code || '-'}</td>
                      <td className="border p-1">
                        {item.item?.name || 'Item tidak ditemukan'}
                      </td>
                      <td className="border p-1 text-center">
                        {item.batch_no || '-'}
                      </td>
                      <td className="border p-1 text-center">
                        {item.expiry_date
                          ? new Date(item.expiry_date).toLocaleDateString(
                              'id-ID',
                              {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              }
                            )
                          : '-'}
                      </td>
                      <td className="border p-1 text-center">
                        {item.quantity}
                      </td>
                      <td className="border p-1 text-center">{item.unit}</td>
                      <td className="border p-1 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="border p-1 text-right">
                        {item.discount > 0 ? `${item.discount}%` : '-'}
                      </td>
                      {!purchase.is_vat_included && (
                        <td className="border p-1 text-right">
                          {item.vat_percentage > 0
                            ? `${item.vat_percentage}%`
                            : '-'}
                        </td>
                      )}
                      <td className="border p-1 text-right">
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
                  {purchase.supplier?.contact_person ||
                    purchase.checked_by ||
                    '-'}
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
                <span className="text-right">{formatCurrency(baseTotal)}</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left">Diskon</span>
                <span className="px-2">:</span>
                <span className="text-right">
                  {formatCurrency(discountTotal, '-')}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                <span className="text-left">Setelah Diskon</span>
                <span className="px-2">:</span>
                <span className="text-right">
                  {formatCurrency(afterDiscountTotal)}
                </span>
              </div>

              {!purchase.is_vat_included && (
                <div className="grid grid-cols-[1fr_auto_1fr] mb-1">
                  <span className="text-left">PPN</span>
                  <span className="px-2">:</span>
                  <span className="text-right">
                    {formatCurrency(vatTotal, '+')}
                  </span>
                </div>
              )}

              <div className="border-t pt-2 grid grid-cols-[1fr_auto_1fr] font-bold">
                <span className="text-left">TOTAL</span>
                <span className="px-2">:</span>
                <span className="text-right">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ViewPurchase;
