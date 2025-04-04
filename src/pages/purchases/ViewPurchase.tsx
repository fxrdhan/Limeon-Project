// src/pages/purchases/ViewPurchase.tsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Loading } from "../../components/ui/Loading";
import { formatRupiah } from "../../lib/formatters";
import { FaArrowLeft, FaPrint, FaFilePdf } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PurchaseData {
    id: string;
    invoice_number: string;
    date: string;
    due_date: string | null;
    so_number: string | null;
    total: number;
    payment_status: string;
    payment_method: string;
    vat_percentage: number;
    is_vat_included: boolean;
    vat_amount: number;
    notes: string | null;
    supplier: {
        name: string;
        address: string | null;
        contact_person: string | null;
    };
}

interface PurchaseItem {
    id: string;
    item_id: string;
    item: {
        name: string;
        code: string;
    };
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    vat_percentage: number;
    unit: string;
    batch_no: string | null;
    expiry_date: string | null;
}

const ViewPurchase = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const printRef = useRef<HTMLDivElement>(null);

    const [purchase, setPurchase] = useState<PurchaseData | null>(null);
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchPurchaseData(id);
        }
    }, [id]);

    const fetchPurchaseData = async (purchaseId: string) => {
        try {
            setLoading(true);

            // Fetch purchase data with supplier information
            const { data: purchaseData, error: purchaseError } = await supabase
                .from("purchases")
                .select(`
          *,
          supplier:suppliers(
            name,
            address,
            contact_person
          )
        `)
                .eq("id", purchaseId)
                .single();

            if (purchaseError) throw purchaseError;

            // Fetch purchase items with item information
            const { data: itemsData, error: itemsError } = await supabase
                .from("purchase_items")
                .select(`
          *,
          item:items(
            name,
            code
          )
        `)
                .eq("purchase_id", purchaseId)
                .order("id");

            if (itemsError) throw itemsError;

            setPurchase(purchaseData);
            setItems(itemsData || []);
        } catch (error) {
            console.error("Error fetching purchase data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate subtotals
    const calculateSubtotals = () => {
        // Base prices total (before discounts and VAT)
        const baseTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Total discounts
        const discountTotal = items.reduce((sum, item) => {
            const itemTotal = item.price * item.quantity;
            const discountAmount = (itemTotal * item.discount) / 100;
            return sum + discountAmount;
        }, 0);

        // Total after discounts
        const afterDiscountTotal = baseTotal - discountTotal;

        // Total VAT
        const vatTotal = purchase?.is_vat_included
            ? 0 // If VAT included, it's already in the item prices
            : items.reduce((sum, item) => {
                const itemTotal = item.price * item.quantity;
                const afterDiscount = itemTotal - (itemTotal * item.discount / 100);
                const vatAmount = afterDiscount * (item.vat_percentage / 100);
                return sum + vatAmount;
            }, 0);

        // Grand total
        const grandTotal = purchase?.is_vat_included
            ? afterDiscountTotal // If VAT included, no need to add VAT
            : afterDiscountTotal + vatTotal;

        return {
            baseTotal,
            discountTotal,
            afterDiscountTotal,
            vatTotal,
            grandTotal
        };
    };

    const handlePrint = () => {
        if (printRef.current) {
            window.print();
        }
    };

    const handleGeneratePDF = async () => {
        if (!printRef.current) return;

        const element = printRef.current;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');

        // A4 dimensions: 210 x 297 mm
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210;
        const imgHeight = canvas.height * imgWidth / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`purchase-${purchase?.invoice_number}.pdf`);
    };

    if (loading) {
        return <Loading message="Memuat data pembelian..." />;
    }

    if (!purchase) {
        return (
            <div className="text-center p-6">
                <p className="text-red-500 mb-4">Data pembelian tidak ditemukan</p>
                <Button onClick={() => navigate("/purchases")}>
                    <FaArrowLeft className="mr-2" /> Kembali ke Daftar Pembelian
                </Button>
            </div>
        );
    }

    const {
        baseTotal,
        discountTotal,
        afterDiscountTotal,
        vatTotal,
        grandTotal
    } = calculateSubtotals();

    return (
        <Card>
            <div className="flex justify-between items-center mb-4 print:hidden">
                <Button onClick={() => navigate("/purchases")} variant="outline">
                    <FaArrowLeft className="mr-2" /> Kembali
                </Button>

                <div className="flex space-x-3">
                    <Button onClick={handlePrint} variant="secondary">
                        <FaPrint className="mr-2" /> Cetak
                    </Button>
                    <Button onClick={handleGeneratePDF}>
                        <FaFilePdf className="mr-2" /> Download PDF
                    </Button>
                </div>
            </div>

            <div
                ref={printRef}
                className="bg-white p-8 shadow print:shadow-none"
                style={{ width: "210mm", minHeight: "297mm", margin: "0 auto" }}
            >
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-center mb-2">FAKTUR PEMBELIAN</h1>
                    <div className="border-b-2 border-gray-400 mb-4"></div>

                    <div className="flex justify-between">
                        <div>
                            <h2 className="font-bold">Supplier:</h2>
                            <p>{purchase.supplier?.name || 'Tidak ada supplier'}</p>
                            <p className="text-sm">{purchase.supplier?.address || ''}</p>
                            <p className="text-sm">Kontak: {purchase.supplier?.contact_person || '-'}</p>
                        </div>

                        <div className="text-right">
                            <p><span className="font-bold">No. Faktur:</span> {purchase.invoice_number}</p>
                            <p><span className="font-bold">Tanggal:</span> {new Date(purchase.date).toLocaleDateString('id-ID')}</p>
                            {purchase.so_number && (
                                <p><span className="font-bold">No. SO:</span> {purchase.so_number}</p>
                            )}
                            {purchase.due_date && (
                                <p><span className="font-bold">Jatuh Tempo:</span> {new Date(purchase.due_date).toLocaleDateString('id-ID')}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-left">No.</th>
                                <th className="border p-2 text-left">Kode</th>
                                <th className="border p-2 text-left">Nama Item</th>
                                <th className="border p-2 text-center">Batch</th>
                                <th className="border p-2 text-center">Exp</th>
                                <th className="border p-2 text-center">Qty</th>
                                <th className="border p-2 text-center">Satuan</th>
                                <th className="border p-2 text-right">Harga</th>
                                <th className="border p-2 text-right">Disc %</th>
                                {!purchase.is_vat_included && (
                                    <th className="border p-2 text-right">PPN %</th>
                                )}
                                <th className="border p-2 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={purchase.is_vat_included ? 10 : 11} className="border p-3 text-center text-gray-500">
                                        Tidak ada item
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="border p-2 text-center">{index + 1}</td>
                                        <td className="border p-2">{item.item?.code || '-'}</td>
                                        <td className="border p-2">{item.item?.name || 'Item tidak ditemukan'}</td>
                                        <td className="border p-2 text-center">{item.batch_no || '-'}</td>
                                        <td className="border p-2 text-center">
                                            {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit' }) : '-'}
                                        </td>
                                        <td className="border p-2 text-center">{item.quantity}</td>
                                        <td className="border p-2 text-center">{item.unit}</td>
                                        <td className="border p-2 text-right">{formatRupiah(item.price)}</td>
                                        <td className="border p-2 text-right">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                                        {!purchase.is_vat_included && (
                                            <td className="border p-2 text-right">{item.vat_percentage > 0 ? `${item.vat_percentage}%` : '-'}</td>
                                        )}
                                        <td className="border p-2 text-right">{formatRupiah(item.subtotal)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between">
                    <div className="max-w-md">
                        <h3 className="font-bold mb-2">Catatan:</h3>
                        <p className="text-sm">{purchase.notes || '-'}</p>

                        <div className="mt-4">
                            <p className="font-bold">Status Pembayaran:
                                <span className={`ml-2 ${purchase.payment_status === 'paid' ? 'text-green-600' :
                                        purchase.payment_status === 'partial' ? 'text-orange-600' : 'text-red-600'
                                    }`}>
                                    {purchase.payment_status === 'paid' ? 'Lunas' :
                                        purchase.payment_status === 'partial' ? 'Sebagian' : 'Belum Dibayar'}
                                </span>
                            </p>
                            <p className="font-bold">Metode Pembayaran:
                                <span className="ml-2">{
                                    purchase.payment_method === 'cash' ? 'Tunai' :
                                        purchase.payment_method === 'transfer' ? 'Transfer' :
                                            purchase.payment_method === 'credit' ? 'Kredit' : purchase.payment_method
                                }</span>
                            </p>
                            {purchase.is_vat_included && (
                                <p className="text-sm mt-2">* PPN sudah termasuk dalam harga</p>
                            )}
                        </div>
                    </div>

                    <div className="border p-4 min-w-[250px]">
                        <div className="flex justify-between mb-2">
                            <span>Subtotal:</span>
                            <span>{formatRupiah(baseTotal)}</span>
                        </div>

                        <div className="flex justify-between mb-2">
                            <span>Diskon:</span>
                            <span>({formatRupiah(discountTotal)})</span>
                        </div>

                        <div className="flex justify-between mb-2">
                            <span>Setelah Diskon:</span>
                            <span>{formatRupiah(afterDiscountTotal)}</span>
                        </div>

                        {!purchase.is_vat_included && (
                            <div className="flex justify-between mb-2">
                                <span>PPN ({purchase.vat_percentage}%):</span>
                                <span>{formatRupiah(vatTotal)}</span>
                            </div>
                        )}

                        <div className="border-t pt-2 flex justify-between font-bold">
                            <span>TOTAL:</span>
                            <span>{formatRupiah(grandTotal)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-16 flex justify-end">
                    <div className="text-center">
                        <p>Penerima,</p>
                        <div className="h-16"></div>
                        <p>(_________________)</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default ViewPurchase;