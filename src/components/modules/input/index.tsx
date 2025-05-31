import { forwardRef } from 'react';
import type { InputProps } from '@/types';
import { classNames } from '@/lib/classNames';

const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    className,
    fullWidth = true,
    ...props
}, ref) => {
    return (
        <div className={fullWidth ? 'w-full' : ''}>
            {label && (
                <label className="block text-gray-700 mb-2" htmlFor={props.id}>
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={classNames(
                    'p-2.5 border rounded-lg',
                    'px-3 text-sm',
                    error ? 'border-red-500' : 'border-gray-300',
                    'focus:outline-none focus:border-primary focus:ring focus:ring-teal-100',
                    'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 read-only:bg-gray-100 read-only:cursor-default read-only:opacity-70', // Disabled and Read-only styles
                    'disabled:focus:ring-0 disabled:focus:border-gray-300 read-only:focus:ring-0 read-only:focus:border-gray-300', // Disable focus styles when disabled/read-only
                    'transition duration-200 ease-in-out',
                    fullWidth ? 'w-full' : '', 
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;