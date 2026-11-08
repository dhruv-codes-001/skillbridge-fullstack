"use client";

import { ACADEMIC_SUBJECTS } from "@/lib/constants";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Filters {
  subject: string;
  minRating: number;
}

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount?: number;
}

const ratingOptions = [0, 3, 3.5, 4, 4.5];

export function FilterSidebar({ filters, onChange, resultCount }: FilterSidebarProps) {
  const hasActiveFilters = filters.subject !== "" || filters.minRating > 0;

  const clear = () => onChange({ subject: "", minRating: 0 });

  return (
    <aside className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Filters</span>
        {hasActiveFilters && (
          <button
            onClick={clear}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {resultCount !== undefined && (
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{resultCount}</span> tutor{resultCount !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Subject */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Subject
        </label>
        <div className="space-y-1">
          {ACADEMIC_SUBJECTS.map((subject) => {
            const val = subject === "All Subjects" ? "" : subject;
            const active = filters.subject === val;
            return (
              <button
                key={subject}
                onClick={() => onChange({ ...filters, subject: val })}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-indigo-600 text-white font-medium"
                    : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
                )}
              >
                {subject}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min Rating */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Minimum Rating
        </label>
        <div className="space-y-1">
          {ratingOptions.map((r) => (
            <button
              key={r}
              onClick={() => onChange({ ...filters, minRating: r })}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                filters.minRating === r
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
              )}
            >
              {r === 0 ? (
                "Any Rating"
              ) : (
                <>
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {r}+ stars
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
