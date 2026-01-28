import { useNavigate } from 'react-router-dom';
import { TbArrowLeft, TbClock, TbTools } from 'react-icons/tb';
import Badge from '@/components/badge';

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
    navigate(-1);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
              <TbTools className="w-10 h-10 text-blue-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <TbClock className="w-4 h-4 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
          <p className="text-slate-500 text-lg">Sedang dalam pengembangan</p>
        </div>

        {/* Description */}
        {description && (
          <p className="text-slate-600 leading-relaxed">{description}</p>
        )}

        {/* Status Badge */}
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

        {/* Status Description */}
        <p className="text-slate-600 text-sm">{statusDescription}</p>

        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={handleGoBack}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 shadow-sm"
          >
            <TbArrowLeft className="w-4 h-4" />
            <span>{backButtonText}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ComingSoon;
