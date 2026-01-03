// src/components/Loader.tsx
import { Loader2 } from "lucide-react";

interface LoaderProps {
  label?: string;
  color?: string;
  size?: number;
  className?: string;
}

export function Loader({
  label,
  color = "#E98C00",
  size = 48,
  className = "",
}: LoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-gray-600 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="animate-spin mb-2"
        style={{ color, width: size, height: size }}
      />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}
