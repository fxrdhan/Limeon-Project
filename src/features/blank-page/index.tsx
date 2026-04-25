import { useNavigate } from 'react-router-dom';
import Badge from '@/components/badge';
import { TbArrowLeft, TbClock, TbTool } from 'react-icons/tb';

interface ComingSoonProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  backButtonText?: string;
  statusText?: string;
  statusDescription?: string;
}

const ComingSoon = ({
  title,
  description,
  showBackButton = true,
  backButtonText = 'Kembali',
  statusText = 'Dalam Pengembangan',
  statusDescription = 'Fitur ini akan segera tersedia dalam pembaruan mendatang',
}: ComingSoonProps) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    void navigate(-1);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
              <TbTool aria-hidden="true" className="h-10 w-10 text-blue-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <TbClock aria-hidden="true" className="h-4 w-4 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-lg">Sedang dalam pengembangan</p>
        </div>

        {description && (
          <p className="text-slate-600 leading-relaxed">{description}</p>
        )}

        <div className="flex justify-center">
          <Badge
            variant="info"
            size="md"
            icon={
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            }
          >
            {statusText}
          </Badge>
        </div>

        <p className="text-slate-600 text-sm">{statusDescription}</p>

        {showBackButton && (
          <button
            onClick={handleGoBack}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 shadow-sm"
          >
            <TbArrowLeft aria-hidden="true" className="h-4 w-4" />
            <span>{backButtonText}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ComingSoon;
