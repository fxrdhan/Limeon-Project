import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';

interface AddItemCardProps {
    label: string;
    to: string;
    className?: string;
}

const AddItemCard: React.FC<AddItemCardProps> = ({ label, to, className }) => {
    return (
        <Link
            to={to}
            className={`group aspect-video h-48 md:h-56 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:bg-blue-50/50 hover:shadow-lg transition-all duration-500 ease-in-out cursor-pointer transform hover:scale-105 ${className || ''}`}
        >
            <FaPlus className="text-4xl mb-2 transition-all duration-500 ease-in-out group-hover:scale-125 group-hover:rotate-90" />
            <span className="text-sm font-medium transition-all duration-500 ease-in-out group-hover:font-bold">{label}</span>
        </Link>
    );
};

export default AddItemCard;