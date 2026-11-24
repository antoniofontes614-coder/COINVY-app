/**
 * Formats a number to Brazilian Real (BRL) currency: R$ 1.250,50
 * If hide is true, returns 'R$ ••••••' for privacy.
 */
export function formatCurrency(amount: number | undefined | null, hide = false): string {
  if (hide) {
    return 'R$ ••••••';
  }
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Formats an ISO or YYYY-MM-DD date to Brazilian DD/MM/AAAA format.
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '';
  const clean = dateString.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

/**
 * Formats a date with human-friendly context (e.g. "Hoje", "Ontem", "Segunda, 15 de Nov")
 */
export function formatRelativeDate(dateString: string): string {
  if (!dateString) return '';
  const clean = dateString.split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const yestDate = new Date();
  yestDate.setDate(yestDate.getDate() - 1);
  const yesterday = yestDate.toISOString().split('T')[0];

  if (clean === today) return 'Hoje';
  if (clean === yesterday) return 'Ontem';

  const [y, m, d] = clean.split('-');
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return `${parseInt(d, 10)} de ${monthNames[dateObj.getMonth()]} de ${y}`;
}

/**
 * Returns formatted month name for 'YYYY-MM'
 */
export function formatMonthName(monthKey: string): string {
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [year, month] = monthKey.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mIdx = parseInt(month, 10) - 1;
  return `${monthNames[mIdx]} de ${year}`;
}
