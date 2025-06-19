import type { CardProps } from "@/types";
import { classNames } from "@/lib/classNames";

export const Card = ({ children, className }: CardProps) => {
  return (
    <div
      className={classNames(
        "p-6 outline-none bg-white shadow-lg rounded-xl!",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }: CardProps) => {
  return (
    <div
      className={classNames(
        "mb-4 bg-gray-100! rounded-t-xl border-b-2 border-gray-200",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className }: CardProps) => {
  return (
    <h2
      className={classNames(
        "text-2xl font-semibold text-gray-800 outline-none",
        className,
      )}
    >
      {children}
    </h2>
  );
};

export const CardContent = ({ children, className }: CardProps) => {
  return <div className={classNames("", className)}>{children}</div>;
};

export const CardFooter = ({ children, className }: CardProps) => {
  return (
    <div
      className={classNames(
        "mt-0 pt-4 rounded-b-xl border-t-2! border-gray-200",
        className,
      )}
    >
      {children}
    </div>
  );
};
