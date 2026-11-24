import { Transaction } from '../types';

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(transactions: Transaction[]) {
  const typeLabels: Record<string, string> = {
    income: 'Receita',
    expense: 'Despesa',
    transfer: 'Transferência',
  };

  const rows = [
    ['Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Categoria', 'Conta', 'Conta Destino', 'Observações'].join(';')
  ];

  for (const t of transactions) {
    const [y, m, d] = t.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const formattedAmount = t.amount.toFixed(2).replace('.', ',');
    const typeLabel = typeLabels[t.type] || t.type;
    const dest = t.destination_account_name || '-';
    const cat = t.category_name || '-';
    const notes = (t.notes || '').replace(/;/g, ' ');

    rows.push([
      formattedDate,
      typeLabel,
      `"${t.description.replace(/"/g, '""')}"`,
      formattedAmount,
      `"${cat}"`,
      `"${t.account_name || ''}"`,
      `"${dest}"`,
      `"${notes}"`
    ].join(';'));
  }

  const csvContent = '\uFEFF' + rows.join('\r\n');
  downloadFile(csvContent, `coinvy_movimentacoes_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}
