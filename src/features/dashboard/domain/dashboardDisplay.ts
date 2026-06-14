export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(amount);
};

export const formatPercentage = (percentage: number) => {
  return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
};
