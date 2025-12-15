import type { MerchantInsight } from '../../utils/trendCalculations';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  merchants: MerchantInsight[];
}

export function TopMerchantsTable({ merchants }: Props) {
  if (merchants.length === 0) {
    return <div className="text-text-muted text-sm">No merchant data available</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-medium text-text-muted uppercase">
              Merchant
            </th>
            <th className="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase">
              Total
            </th>
            <th className="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase hidden sm:table-cell">
              Avg
            </th>
            <th className="text-right py-2 px-3 text-xs font-medium text-text-muted uppercase hidden md:table-cell">
              Count
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {merchants.map((merchant, index) => (
            <tr key={merchant.merchant} className="hover:bg-muted/30 transition-colors">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {merchant.merchant}
                    </div>
                    <div className="text-xs text-text-muted">
                      {merchant.category}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-right">
                <div className="text-sm font-semibold text-text-primary">
                  {formatCurrency(merchant.totalSpent)}
                </div>
              </td>
              <td className="py-3 px-3 text-right hidden sm:table-cell">
                <div className="text-sm text-text-secondary">
                  {formatCurrency(merchant.averageTransaction)}
                </div>
              </td>
              <td className="py-3 px-3 text-right hidden md:table-cell">
                <div className="text-sm text-text-secondary">
                  {merchant.transactionCount}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
