import clsx from "clsx";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "neutral";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", loading = false, className, children, ...props },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1";
    const styles = {
      primary:
        "bg-[#E98C00] text-white hover:bg-[#cc7a00] focus:ring-[#E98C00] disabled:opacity-60",
      secondary:
        "bg-gray-50 text-gray-700 hover:bg-gray-100 focus:ring-gray-300 disabled:opacity-60",
      neutral:
        "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300 disabled:opacity-60",
    }[variant];

    return (
      <button
        ref={ref}
        {...props}
        disabled={loading || props.disabled}
        className={clsx(base, styles, className)}
      >
        {loading ? "Even geduld…" : children}
      </button>
    );
  }
);

Button.displayName = "Button";
