import type { InputProps } from '../../types';
import { classNames } from '../../lib/classNames';

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
                    'p-2 border rounded-md',
                    error ? 'border-red-500' : 'border-gray-300',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent', // Default focus
                    'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 read-only:bg-gray-100 read-only:cursor-default read-only:opacity-70', // Disabled and Read-only styles
                    'disabled:focus:ring-0 disabled:focus:border-gray-300 read-only:focus:ring-0 read-only:focus:border-gray-300', // Disable focus styles when disabled/read-only
                    fullWidth ? 'w-full' : '', 
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};