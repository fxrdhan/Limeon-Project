import { classNames } from "../../lib/classNames";

export type ButtonVariant =
    | "primary"
    | "secondary"
    | "accent"
    | "outline"
    | "text"
    | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    fullWidth?: boolean;
}

export const Button = ({
    children,
    className,
    variant = "primary",
    size = "md",
    isLoading = false,
    fullWidth = false,
    ...props
}: ButtonProps) => {
    const variants = {
        primary: "rounded-md shadow-md bg-blue-500 flex items-center hover:bg-blue-600 text-white hover:text-white hover:shadow-[0_0_5px_theme(colors.primary),0_0_15px_theme(colors.primary),0_0_30px_theme(colors.primary)]",
        secondary: "rounded-md bg-blue-600 bg-secondary flex items-center hover:bg-blue-700 text-white hover:text-white",
        accent: "bg-accent hover:bg-red-600 text-white",
        outline: "border border-primary text-primary hover:bg-blue-50",
        text: "bg-transparent hover:bg-opacity-10 focus:outline-none focus:ring-0 focus:shadow-none",
        danger: "bg-red-600 hover:bg-red-700 text-white hover:shadow-[0_0_5px_theme(colors.accent),0_0_15px_theme(colors.accent),0_0_30px_theme(colors.accent)]",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2",
        lg: "px-6 py-3 text-lg",
    };

    const baseClasses = "font-medium rounded-md transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden";
    
    return (
        <button
            className={classNames(
                baseClasses,
                variants[variant],
                sizes[size],
                variant !== 'outline' && variant !== 'text' ? 'hover:text-white' : '',
                'focus:outline-none active:scale-95',
                fullWidth ? "w-full" : "",
                className
            )}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center justify-center">
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    Loading...
                </span>
            ) : (
                children
            )}
        </button>
    );
};
