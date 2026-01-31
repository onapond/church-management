'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface WeeklyStats {
  week: string
  worship: number
  meeting: number
  total: number
}

interface DepartmentStats {
  department: string
  code: string
  totalMembers: number
  worshipCount: number
  meetingCount: number
  worshipRate: number
  meetingRate: number
}

const CHART_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

interface WeeklyTrendChartProps {
  data: WeeklyStats[]
}

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 md:py-8 text-sm text-gray-500">
        해당 기간의 출결 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 라인 차트 */}
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="worship"
              name="예배"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="meeting"
              name="모임"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 바 차트 (비교용) */}
      <div className="h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar dataKey="worship" name="예배" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="meeting" name="모임" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface AttendanceDistributionChartsProps {
  data: DepartmentStats[]
}

export function AttendanceDistributionCharts({ data }: AttendanceDistributionChartsProps) {
  if (data.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">예배 출석 분포</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter(d => d.worshipCount > 0)}
                dataKey="worshipCount"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}회`, '출석']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">모임 출석 분포</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter(d => d.meetingCount > 0)}
                dataKey="meetingCount"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}회`, '출석']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

interface DepartmentComparisonChartProps {
  data: DepartmentStats[]
}

export function DepartmentComparisonChart({ data }: DepartmentComparisonChartProps) {
  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">부서별 출석률 비교</h3>
      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="department"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              width={50}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, '']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="worshipRate" name="예배 출석률" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="meetingRate" name="모임 출석률" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
