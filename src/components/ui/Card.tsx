// src/components/ui/Card.tsx
import { classNames } from '../../lib/classNames';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card = ({ children, className }: CardProps) => {
    return (
        <div className={classNames('bg-white p-6 rounded-lg shadow', className)}>
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className }: CardProps) => {
    return (
        <div className={classNames('mb-4', className)}>
            {children}
        </div>
    );
};

export const CardTitle = ({ children, className }: CardProps) => {
    return (
        <h2 className={classNames('text-lg font-semibold text-gray-800', className)}>
            {children}
        </h2>
    );
};

export const CardContent = ({ children, className }: CardProps) => {
    return (
        <div className={classNames('', className)}>
            {children}
        </div>
    );
};

export const CardFooter = ({ children, className }: CardProps) => {
    return (
        <div className={classNames('mt-4 pt-4 border-t', className)}>
            {children}
        </div>
    );
};