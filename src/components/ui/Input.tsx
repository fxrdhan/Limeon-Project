// src/components/ui/Input.tsx
import { classNames } from '../../lib/classNames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

export const Input = ({
    label,
    error,
    className,
    fullWidth = true,
    ...props
}: InputProps) => {
    return (
        <div className={fullWidth ? 'w-full' : ''}>
            {label && (
                <label className="block text-gray-700 mb-2" htmlFor={props.id}>
                    {label}
                </label>
            )}
            <input
                className={classNames(
                    'p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                    error ? 'border-red-500' : 'border-gray-300',
                    fullWidth ? 'w-full' : '',
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};