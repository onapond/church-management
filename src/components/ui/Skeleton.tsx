'use client'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-64 md:h-80 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-gray-400 text-sm">차트 로딩 중...</div>
      </div>
    </div>
  )
}

export function MemberGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 lg:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <div className="aspect-square bg-gray-200 animate-pulse" />
          <div className="p-2 lg:p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MemberListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 lg:p-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className="animate-pulse space-y-4 md:space-y-6">
        <div className="h-6 md:h-8 bg-gray-200 rounded w-32"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 md:h-24 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
        <div className="h-48 md:h-64 bg-gray-100 rounded-xl"></div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {Array.from({ length: cols }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
