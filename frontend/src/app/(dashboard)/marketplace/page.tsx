"use client";

import { useEffect, useState, useCallback } from "react";
import { tutorService, TutorSearchParams } from "@/services/tutor.service";
import { TutorCard } from "@/components/marketplace/TutorCard";
import { SearchBar } from "@/components/marketplace/SearchBar";
import { FilterSidebar } from "@/components/marketplace/FilterSidebar";
import { PageSpinner } from "@/components/common/Spinner";
import { Users, AlertCircle, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import type { TutorMarketplaceCard, PaginatedTutorsResponse } from "@/types";

interface Filters {
  subject: string;
  minRating: number;
}

function TutorCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-14 w-14 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-100" />
        </div>
        <div className="h-5 w-16 rounded bg-gray-100" />
      </div>
      <div className="h-3 w-28 rounded bg-gray-200 mb-3" />
      <div className="h-3 w-full rounded bg-gray-100 mb-1" />
      <div className="h-3 w-3/4 rounded bg-gray-100 mb-4" />
      <div className="flex gap-1 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 w-16 rounded-full bg-indigo-100" />
        ))}
      </div>
      <div className="h-9 w-full rounded-lg bg-indigo-100" />
    </div>
  );
}

export default function MarketplacePage() {
  const [data, setData] = useState<PaginatedTutorsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ subject: "", minRating: 0 });
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const fetchTutors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: TutorSearchParams = { page, size: 12 };
      if (search) params.search = search;
      if (filters.subject) params.subject = filters.subject;
      if (filters.minRating > 0) params.min_rating = filters.minRating;
      const result = await tutorService.searchTutors(params);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tutors.");
    } finally {
      setIsLoading(false);
    }
  }, [search, filters, page]);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  // Reset to page 1 on search/filter change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const totalPages = data?.pages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tutor Marketplace</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find the perfect peer tutor for your academic needs
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-6 flex gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          className="flex-1"
        />
        {/* Mobile filters toggle */}
        <button
          onClick={() => setMobileFiltersOpen((v) => !v)}
          className="lg:hidden flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {(filters.subject || filters.minRating > 0) && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {(filters.subject ? 1 : 0) + (filters.minRating > 0 ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Mobile filters panel */}
      {mobileFiltersOpen && (
        <div className="lg:hidden mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-700">Filters</span>
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <FilterSidebar
            filters={filters}
            onChange={handleFilterChange}
            resultCount={data?.total}
          />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <FilterSidebar
              filters={filters}
              onChange={handleFilterChange}
              resultCount={data?.total}
            />
          </div>
        </div>

        {/* Main content */}
        <div>
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
              <button
                onClick={fetchTutors}
                className="ml-auto text-red-700 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <TutorCardSkeleton key={i} />
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((tutor: TutorMarketplaceCard) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      const isActive = p === page;
                      const isNear = Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                      if (!isNear && p !== page) {
                        if (p === 2 || p === totalPages - 1) return <span key={p} className="px-1 text-gray-400">…</span>;
                        return null;
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-indigo-600 text-white"
                              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
              <Users className="mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-700">No tutors found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {search || filters.subject || filters.minRating > 0
                  ? "Try adjusting your search or filters."
                  : "No tutors are available yet. Check back soon!"}
              </p>
              {(search || filters.subject || filters.minRating > 0) && (
                <button
                  onClick={() => { setSearch(""); setFilters({ subject: "", minRating: 0 }); }}
                  className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
