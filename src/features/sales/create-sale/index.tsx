import React from 'react';

const ComingSoon = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <p className="text-xl">Fitur ini akan segera hadir!</p>
      <div className="mt-8 p-4 border border-blue-300 rounded-lg bg-blue-50 max-w-md">
        <p className="text-blue-600 text-center">
          Halaman ini sedang dalam pengembangan.
        </p>
      </div>
    </div>
  );
};

const CreateSalePage: React.FC = () => {
  return <ComingSoon title="Tambah Penjualan" />;
};

export default CreateSalePage;
