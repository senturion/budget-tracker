export function formatCurrency(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(Math.abs(amount));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
  });
}

export function getMonthStart(date: Date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

export function getMonthEnd(date: Date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

export function getPreviousMonth(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr);
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return {
    start: getMonthStart(prevMonth),
    end: getMonthEnd(prevMonth),
  };
}

export function getNextMonth(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr);
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    start: getMonthStart(nextMonth),
    end: getMonthEnd(nextMonth),
  };
}
