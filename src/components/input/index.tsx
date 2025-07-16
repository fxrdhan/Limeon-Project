import { forwardRef, useState } from "react";
import type { InputProps } from "@/types";
import { classNames } from "@/lib/classNames";

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, fullWidth = true, ...props }, ref) => {
    const [isHovered, setIsHovered] = useState(false);

    const shouldShowOverlay = () => {
      if (!props.value || typeof props.value !== "string" || !isHovered)
        return false;

      // Create a temporary element to measure text width
      const tempElement = document.createElement("span");
      tempElement.style.font = "14px system-ui, -apple-system, sans-serif"; // text-sm
      tempElement.style.visibility = "hidden";
      tempElement.style.position = "absolute";
      tempElement.style.whiteSpace = "nowrap";
      tempElement.textContent = props.value;

      document.body.appendChild(tempElement);
      const textWidth = tempElement.offsetWidth;
      document.body.removeChild(tempElement);

      // Calculate available width (input width - padding)
      const inputWidth = fullWidth ? 300 : 200; // approximate widths
      const availableWidth = inputWidth - 24; // 12px padding on each side

      return textWidth > availableWidth;
    };

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label className="block text-gray-700 mb-2" htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={classNames(
              "p-2.5 border rounded-lg",
              "px-3 text-sm",
              "text-ellipsis overflow-hidden whitespace-nowrap",
              "h-[2.5rem]",
              error ? "border-red-500" : "border-gray-300",
              "focus:outline-hidden focus:border-primary focus:ring-3 focus:ring-emerald-200",
              "disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 read-only:bg-gray-100 read-only:cursor-default read-only:opacity-70",
              "disabled:focus:ring-0 disabled:focus:border-gray-300 read-only:focus:ring-0 read-only:focus:border-gray-300",
              "transition-all duration-200 ease-in-out",
              fullWidth ? "w-full" : "",
              className,
            )}
            {...props}
          />
          {shouldShowOverlay() && (
            <div
              className={classNames(
                "absolute bottom-full left-0 right-0 z-10 mb-1",
                "p-2.5 px-3 text-sm",
                "border rounded-lg bg-white/50 backdrop-blur-md",
                "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),4px_0_6px_-1px_rgba(0,0,0,0.1),-4px_0_6px_-1px_rgba(0,0,0,0.1)]",
                "whitespace-pre-wrap break-words",
                "min-h-[2.5rem] max-h-32 overflow-y-auto",
                error ? "border-red-500" : "border-gray-300",
                "pointer-events-none",
              )}
            >
              {props.value}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
