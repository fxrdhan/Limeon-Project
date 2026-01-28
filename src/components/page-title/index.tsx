import type { PageTitleProps } from '@/types';

const PageTitle: React.FC<PageTitleProps> = ({ title }) => (
  <h1 className="text-2xl! font-semibold text-slate-800 text-center grow">
    {title}
  </h1>
);

export default PageTitle;
