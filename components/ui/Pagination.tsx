import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-[#E5E7EB] text-xs text-[#737B89]">
      <div>
        {totalItems !== undefined && pageSize !== undefined ? (
          <span>
            Showing <strong className="text-[#20242C] font-semibold">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-[#20242C] font-semibold">{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
            <strong className="text-[#20242C] font-semibold">{totalItems}</strong> entries
          </span>
        ) : (
          <span>
            Page <strong className="text-[#20242C] font-semibold">{currentPage}</strong> of{' '}
            <strong className="text-[#20242C] font-semibold">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] bg-white text-[#20242C] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="px-2 font-medium text-[#20242C]">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] bg-white text-[#20242C] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer font-medium"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
