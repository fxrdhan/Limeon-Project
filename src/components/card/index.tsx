import type { CardProps } from "@/types";
import { classNames } from "@/lib/classNames";

export const Card = ({ children, className }: CardProps) => {
  return (
    <div className={classNames("bg-white p-6 rounded-lg shadow-xs", className)}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }: CardProps) => {
  return <div className={classNames("mb-4", className)}>{children}</div>;
};

export const CardTitle = ({ children, className }: CardProps) => {
  return (
    <h2
      className={classNames("text-xl font-semibold text-gray-800", className)}
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
    <div className={classNames("mt-0 pt-4 border-t", className)}>
      {children}
    </div>
  );
};
