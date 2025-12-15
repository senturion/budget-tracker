import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { CategoryTrend } from '../../utils/trendCalculations';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  data: CategoryTrend[];
}

const COLORS = [
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#10b981', // green
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
];

export function CategoryTrendsChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="text-text-muted text-sm">No category data available</div>;
  }

  // Transform data for stacked bar chart by month
  const allMonths = new Set<string>();
  data.forEach(cat => {
    cat.months.forEach(m => allMonths.add(m.month));
  });

  const chartData = Array.from(allMonths)
    .sort()
    .map(month => {
      const monthData: Record<string, any> = {
        month: new Date(month + '-01').toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
      };

      data.forEach(cat => {
        const monthEntry = cat.months.find(m => m.month === month);
        monthData[cat.category] = monthEntry?.amount || 0;
      });

      return monthData;
    });

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="month"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f3f4f6',
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend
            wrapperStyle={{ color: '#f3f4f6', fontSize: '12px' }}
          />
          {data.map((cat, index) => (
            <Bar
              key={cat.category}
              dataKey={cat.category}
              stackId="a"
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
