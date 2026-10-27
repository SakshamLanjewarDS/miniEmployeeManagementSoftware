"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
} from "lucide-react";

export interface AdvancedPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  showPageSizeSelector?: boolean;
  showJumpToPage?: boolean;
  showTotalInfo?: boolean;
  className?: string;
  /**
   * Optional HTML element ID or ref to smoothly scroll to when the page changes
   */
  scrollTargetId?: string;
}

export function AdvancedPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = "items",
  showPageSizeSelector = true,
  showJumpToPage = true,
  showTotalInfo = true,
  className = "",
  scrollTargetId,
}: AdvancedPaginationProps) {
  const [jumpPage, setJumpPage] = useState<string>("");

  // Keep jump input in sync with currentPage
  useEffect(() => {
    setJumpPage("");
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    onPageChange(newPage);
    if (scrollTargetId) {
      const el = document.getElementById(scrollTargetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPage, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      handlePageChange(parsed);
      setJumpPage("");
    }
  };

  // Calculate slice range numbers
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

    if (currentPage <= 4) {
      // Near start: 1, 2, 3, 4, 5, ..., totalPages
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("ellipsis-end");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Near end: 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
      pages.push(1);
      pages.push("ellipsis-start");
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Middle: 1, ..., cur-1, cur, cur+1, ..., totalPages
      pages.push(1);
      pages.push("ellipsis-start");
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push("ellipsis-end");
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalItems === 0 && totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={`bg-white border-t border-slate-200/80 px-4 py-3 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 select-none ${className}`}
    >
      {/* Left side: Range Info & Page Size */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 w-full md:w-auto justify-between md:justify-start">
        {showTotalInfo && (
          <div className="flex items-center gap-1.5 font-medium">
            <span>Showing</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {startIndex}
            </span>
            <span>to</span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {endIndex}
            </span>
            <span>of</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {totalItems}
            </span>
            <span>{itemName}</span>
          </div>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <span className="text-slate-400 font-medium">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation & Direct Jump */}
      <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 w-full md:w-auto">
        {/* Navigation Buttons */}
        <div className="inline-flex items-center gap-1 bg-slate-50/70 p-1 rounded-xl border border-slate-200/70">
          {/* First Page */}
          <button
            type="button"
            onClick={() => handlePageChange(1)}
            disabled={currentPage <= 1}
            title="First page"
            aria-label="First page"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:cursor-not-allowed transition-all shadow-none hover:shadow-xs"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous page"
            aria-label="Previous page"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:cursor-not-allowed transition-all shadow-none hover:shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Numeric Page Buttons */}
          <div className="flex items-center gap-1 px-1">
            {pageNumbers.map((p, idx) => {
              if (p === "ellipsis-start" || p === "ellipsis-end") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1.5 text-slate-400 font-bold select-none text-xs"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`min-w-[30px] h-[30px] px-2 text-xs font-semibold rounded-lg transition-all ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25 scale-[1.02]"
                      : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-xs"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Next page"
            aria-label="Next page"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:cursor-not-allowed transition-all shadow-none hover:shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Last page"
            aria-label="Last page"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:cursor-not-allowed transition-all shadow-none hover:shadow-xs"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Jump to Page */}
        {showJumpToPage && totalPages > 2 && (
          <form
            onSubmit={handleJumpSubmit}
            className="flex items-center gap-1.5 ml-1 text-xs text-slate-500"
          >
            <span className="text-slate-400 font-medium hidden sm:inline">Go to:</span>
            <div className="relative flex items-center">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                placeholder={`${currentPage}`}
                className="w-14 bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 tabular-nums transition-colors text-center"
              />
              {jumpPage && (
                <button
                  type="submit"
                  title="Jump to page"
                  className="ml-1 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Convenient React Hook to handle client-side array pagination with advanced features.
 * Auto-corrects page number when array length shrinks (e.g. after search filtering).
 */
export function usePagination<T>(
  items: T[],
  options: {
    initialPageSize?: number;
    initialPage?: number;
    itemName?: string;
  } = {}
) {
  const { initialPageSize = 10, initialPage = 1, itemName = "items" } = options;
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If items shrink and currentPage is out of bounds, adjust safely
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const paginationProps: AdvancedPaginationProps = {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange: setCurrentPage,
    onPageSizeChange: (newSize) => {
      setPageSize(newSize);
      setCurrentPage(1);
    },
    itemName,
  };

  return {
    paginatedItems,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    setCurrentPage,
    setPageSize,
    paginationProps,
  };
}
