import React from 'react';
import { TbShoppingBag, TbShoppingCart } from 'react-icons/tb';
import { formatCurrency } from '../constants';
import type { LowStockItem, RecentTransaction } from '../types';
import { PanelMessage, SectionHeader } from './DashboardPrimitives';

interface OperationsSectionProps {
  recentTransactions: RecentTransaction[];
  lowStockItems: LowStockItem[];
  isRecentTransactionsLoading: boolean;
  isLowStockLoading: boolean;
  recentTransactionsErrorMessage?: string | null;
  lowStockErrorMessage?: string | null;
}

const OperationsSection: React.FC<OperationsSectionProps> = ({
  recentTransactions,
  lowStockItems,
  isRecentTransactionsLoading,
  isLowStockLoading,
  recentTransactionsErrorMessage,
  lowStockErrorMessage,
}) => {
  return (
    <section className="grid gap-10 py-10 xl:grid-cols-12">
      <div className="space-y-8 xl:col-span-8 xl:border-r xl:border-slate-200 xl:pr-8">
        <SectionHeader
          eyebrow="Activity"
          title="Transaksi Terbaru"
          description="Feed transaksi terakhir untuk melihat arus penjualan dan pembelian tanpa membuka halaman detail."
        />

        {isRecentTransactionsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse border-b border-slate-200 bg-slate-100/70"
              />
            ))}
          </div>
        ) : recentTransactionsErrorMessage ? (
          <PanelMessage
            message={`Error: ${recentTransactionsErrorMessage}`}
            tone="error"
          />
        ) : recentTransactions.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {recentTransactions.slice(0, 8).map(transaction => (
              <div
                key={`${transaction.type}-${transaction.id}`}
                className="grid gap-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <div
                  className={`pt-1 ${
                    transaction.type === 'sale'
                      ? 'text-emerald-700'
                      : 'text-sky-700'
                  }`}
                >
                  {transaction.type === 'sale' ? (
                    <TbShoppingBag className="h-5 w-5" />
                  ) : (
                    <TbShoppingCart className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {transaction.invoice_number ||
                      `${transaction.type === 'sale' ? 'Sale' : 'Purchase'} #${transaction.id.slice(0, 8)}`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {transaction.counterparty} •{' '}
                    {new Date(transaction.date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                      transaction.type === 'sale'
                        ? 'text-emerald-700'
                        : 'text-sky-700'
                    }`}
                  >
                    {transaction.type === 'sale' ? 'Penjualan' : 'Pembelian'}
                  </p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {formatCurrency(transaction.total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PanelMessage message="Belum ada transaksi terbaru yang bisa ditampilkan." />
        )}
      </div>

      <div className="space-y-8 xl:col-span-4 xl:pl-8">
        <SectionHeader
          eyebrow="Restock"
          title="Watchlist Stok Kritis"
          description="Item dengan stok terendah untuk mempercepat prioritas pembelian ulang."
        />

        {isLowStockLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse border-b border-rose-200 bg-rose-50/70"
              />
            ))}
          </div>
        ) : lowStockErrorMessage ? (
          <PanelMessage
            message={`Error: ${lowStockErrorMessage}`}
            tone="error"
          />
        ) : lowStockItems.length > 0 ? (
          <div className="divide-y divide-rose-200">
            {lowStockItems.slice(0, 6).map(item => {
              const meta = [
                item.item_categories?.[0]?.name,
                item.item_packages?.[0]?.name,
              ]
                .filter(Boolean)
                .join(' • ');

              return (
                <div
                  key={item.id}
                  className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0 border-l-2 border-rose-400 pl-4">
                    <p className="truncate font-medium text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {meta || 'Butuh pengecekan kategori dan kemasan'}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-semibold tracking-tight text-rose-600">
                      {item.stock}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-rose-400">
                      tersisa
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <PanelMessage message="Tidak ada item yang masuk watchlist stok kritis." />
        )}
      </div>
    </section>
  );
};

export default OperationsSection;
