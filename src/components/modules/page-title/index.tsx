interface PageTitleProps {
    title: string;
}

export const PageTitle: React.FC<PageTitleProps> = ({ title }) => (
    <h1 className="text-2xl font-bold text-gray-800 text-center flex-grow">
        {title}
    </h1>
);