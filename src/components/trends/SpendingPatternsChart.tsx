import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SpendingPattern } from '../../utils/trendCalculations';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  data: SpendingPattern;
}

export function SpendingPatternsChart({ data }: Props) {
  const dayData = data.dayOfWeek.map(d => ({
    name: d.day.slice(0, 3),
    amount: d.amount,
    count: d.count,
  }));

  const timeData = data.timeOfMonth.map(t => ({
    name: t.period.charAt(0).toUpperCase() + t.period.slice(1),
    amount: t.amount,
    count: t.count,
  }));

  return (
    <div className="space-y-6">
      {/* Day of Week */}
      <div>
        <h4 className="text-sm font-medium text-text-secondary mb-3">By Day of Week</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                style={{ fontSize: '11px' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '11px' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'amount') return formatCurrency(value);
                  return value;
                }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {dayData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill="#f59e0b" opacity={0.7 + (index * 0.05)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time of Month */}
      <div>
        <h4 className="text-sm font-medium text-text-secondary mb-3">By Time of Month</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                style={{ fontSize: '11px' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '11px' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f3f4f6',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'amount') return formatCurrency(value);
                  return value;
                }}
              />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
