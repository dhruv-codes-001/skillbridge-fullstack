import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number | string;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function StarRating({
  rating,
  maxStars = 5,
  size = "md",
  showValue = false,
  className,
}: StarRatingProps) {
  const numRating =
    typeof rating === "string" ? parseFloat(rating) : rating ?? 0;
  const safeRating = isNaN(numRating) ? 0 : numRating;

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: maxStars }).map((_, i) => {
        const filled = i < Math.floor(safeRating);
        const partial = !filled && i < safeRating;
        return (
          <span key={i} className="relative inline-flex">
            <Star
              className={cn(sizeClasses[size], "text-gray-200")}
              fill="currentColor"
            />
            {(filled || partial) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? "100%" : `${(safeRating % 1) * 100}%` }}
              >
                <Star
                  className={cn(sizeClasses[size], "text-amber-400")}
                  fill="currentColor"
                />
              </span>
            )}
          </span>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {safeRating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
