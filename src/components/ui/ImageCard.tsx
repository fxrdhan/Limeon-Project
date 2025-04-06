import React from 'react';

interface ImageCardProps {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    fallbackImage?: string;
    onClick?: () => void;
    className?: string;
}

const ImageCard: React.FC<ImageCardProps> = ({
    id,
    title,
    subtitle,
    imageUrl,
    fallbackImage,
    onClick,
    className
}) => {
    return (
        <div
            className={`group relative aspect-video h-48 md:h-56 bg-gray-300 rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-xl ${className || ''}`}
            onClick={onClick}
        >
            {/* Background Image */}
            <img
                src={imageUrl || fallbackImage || `https://picsum.photos/seed/${id}/400/300`}
                alt={`Image for ${title}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            />

            {/* Overlay with content on hover */}
            <div className="absolute inset-0 p-4 bg-white/70 backdrop-blur-sm flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out">
                <h3 className="text-gray-800 font-semibold truncate text-lg mb-1">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-gray-600 text-sm line-clamp-3">{subtitle}</p>
                )}
            </div>
        </div>
    );
};

export default ImageCard;