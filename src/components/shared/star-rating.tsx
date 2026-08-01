"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-5 transition-colors",
                n <= value ? "fill-gold text-gold" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
