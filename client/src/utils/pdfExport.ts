import jsPDF from 'jspdf';
import { Transaction, Category, Goal, Account, DashboardSummary, User } from '../types';
import { formatCurrency, formatDate } from './formatters';

interface ExportPDFParams {
  user: User | null;
  summary: DashboardSummary | null;
  transactions: Transaction[];
  goals?: Goal[];
  accounts?: Account[];
}

// Converte URL da imagem em base64 para o jsPDF
async function getBase64Image(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateDIMReportPDF({
  user,
  summary,
  transactions,
  goals = [],
  accounts = []
}: ExportPDFParams): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = 14;

  const totalBalance = summary?.totalBalance ?? 0;
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const netSavings = totalIncome - totalExpense;

  // Carrega logotipo do DIM+
  const logoData = await getBase64Image('/dim-logo.png');

  // Helper para verificar nova página
  const checkNewPage = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      y = 16;
      drawPageFooter();
    }
  };

  const drawPageFooter = () => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 145);

    // Linha inferior
    doc.setDrawColor(220, 228, 224);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.text('DIM+ • Seu dinheiro, sob controle.', margin, pageHeight - 7);
    doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  // ==========================================
  // 1. CABEÇALHO DO RELATÓRIO
  // ==========================================
  // Fundo superior suave
  doc.setFillColor(11, 31, 23); // #0B1F17 (Tema escuro DIM+)
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

  // Logotipo
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin + 4, y + 3, 22, 22);
    } catch {
      // Fallback visual
    }
  }

  // Título e Subtítulo
  const textStartX = logoData ? margin + 29 : margin + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0, 230, 118); // Verde Neon DIM+
  doc.text('DIM+', textStartX, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Relatório Financeiro Consolidado', textStartX, y + 16);

  doc.setFontSize(7.5);
  doc.setTextColor(170, 190, 180);
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Emitido em: ${dateStr}`, textStartX, y + 21);

  // Usuário à direita
  if (user?.email) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 230, 118);
    doc.text(user.name || 'Usuário DIM+', pageWidth - margin - 5, y + 11, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 195, 190);
    doc.text(user.email, pageWidth - margin - 5, y + 17, { align: 'right' });
  }

  y += 33;

  // ==========================================
  // 2. CARDS DE RESUMO FINANCEIRO (KPIs)
  // ==========================================
  checkNewPage(26);
  const cardWidth = (contentWidth - 6) / 4; // 4 cards lado a lado

  const kpis = [
    { title: 'Saldo Geral', value: totalBalance, color: [0, 200, 100], bg: [240, 253, 244] },
    { title: 'Total Entradas', value: totalIncome, color: [5, 150, 105], bg: [236, 253, 245] },
    { title: 'Total Saídas', value: totalExpense, color: [225, 29, 72], bg: [255, 241, 242] },
    { title: 'Balanço Líquido', value: netSavings, color: netSavings >= 0 ? [5, 150, 105] : [225, 29, 72], bg: [248, 250, 252] },
  ];

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (cardWidth + 2);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(215, 228, 222);
    doc.setLineWidth(0.3);
    doc.roundedRect(kpiX, y, cardWidth, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title.toUpperCase(), kpiX + 3, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(formatCurrency(kpi.value), kpiX + 3, y + 14);
  });

  y += 25;

  // ==========================================
  // 3. DESPESAS POR CATEGORIA
  // ==========================================
  const catExpenses = summary?.categoryExpenses || [];
  if (catExpenses.length > 0) {
    checkNewPage(35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(11, 31, 23);
    doc.text('Distribuição de Gastos por Categoria', margin, y);
    y += 5;

    // Tabela de categorias
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('CATEGORIA', margin + 4, y + 4.2);
    doc.text('PERCENTUAL', margin + 95, y + 4.2);
    doc.text('VALOR TOTAL', pageWidth - margin - 4, y + 4.2, { align: 'right' });
    y += 7;

    catExpenses.forEach((cat, index) => {
      checkNewPage(7);
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 1, contentWidth, 6, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(cat.name, margin + 4, y + 3.2);

      // Barra de progresso visual no PDF
      const barMaxWidth = 45;
      const barFillWidth = Math.max(1, (cat.percentage / 100) * barMaxWidth);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin + 95, y + 0.8, barMaxWidth, 3, 1, 1, 'F');
      doc.setFillColor(0, 200, 100);
      doc.roundedRect(margin + 95, y + 0.8, barFillWidth, 3, 1, 1, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${cat.percentage}%`, margin + 95 + barMaxWidth + 3, y + 3.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72);
      doc.text(formatCurrency(cat.amount), pageWidth - margin - 4, y + 3.2, { align: 'right' });

      y += 6;
    });

    y += 5;
  }

  // ==========================================
  // 4. METAS FINANCEIRAS (SE HOUVER)
  // ==========================================
  if (goals.length > 0) {
    checkNewPage(30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(11, 31, 23);
    doc.text('Metas e Sonhos Financeiros', margin, y);
    y += 5;

    // Cabeçalho da tabela de metas
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('META', margin + 4, y + 4.2);
    doc.text('VALOR ALVO', margin + 65, y + 4.2);
    doc.text('ACUMULADO', margin + 105, y + 4.2);
    doc.text('PROCESSO (%)', pageWidth - margin - 4, y + 4.2, { align: 'right' });
    y += 7;

    goals.forEach((goal, idx) => {
      checkNewPage(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 1, contentWidth, 6, 'F');
      }

      const target = Number(goal.target_amount) || 0;
      const current = Number(goal.current_amount) || 0;
      const pct = target > 0 ? Math.min(100, Number(((current / target) * 100).toFixed(1))) : 0;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(goal.name, margin + 4, y + 3.2);

      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(target), margin + 65, y + 3.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(formatCurrency(current), margin + 105, y + 3.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(pct >= 100 ? 5 : 30, pct >= 100 ? 150 : 41, pct >= 100 ? 105 : 59);
      doc.text(`${pct}% ${pct >= 100 ? '✓' : ''}`, pageWidth - margin - 4, y + 3.2, { align: 'right' });

      y += 6;
    });

    y += 5;
  }

  // ==========================================
  // 5. TODAS AS MOVIMENTAÇÕES DETALHADAS
  // ==========================================
  checkNewPage(35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 31, 23);
  doc.text(`Detalhamento dos Lançamentos (${transactions.length})`, margin, y);
  y += 5;

  // Cabeçalho da tabela de movimentações
  doc.setFillColor(11, 31, 23);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 230, 118);
  doc.text('DATA', margin + 3, y + 4.5);
  doc.text('TIPO', margin + 26, y + 4.5);
  doc.text('DESCRIÇÃO', margin + 48, y + 4.5);
  doc.text('CATEGORIA', margin + 105, y + 4.5);
  doc.text('VALOR (R$)', pageWidth - margin - 3, y + 4.5, { align: 'right' });
  y += 7.5;

  if (transactions.length === 0) {
    checkNewPage(12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 150, 155);
    doc.text('Nenhuma movimentação registrada no período.', margin + 4, y + 4);
    y += 10;
  } else {
    transactions.forEach((tx, idx) => {
      checkNewPage(6.5);

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 1, contentWidth, 6, 'F');
      }

      const isInc = tx.type === 'income';
      const isTrf = tx.type === 'transfer';

      // Data
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(formatDate(tx.date), margin + 3, y + 3.2);

      // Tipo badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      if (isInc) {
        doc.setTextColor(5, 150, 105);
        doc.text('RECEITA', margin + 26, y + 3.2);
      } else if (isTrf) {
        doc.setTextColor(99, 102, 241);
        doc.text('TRANSF.', margin + 26, y + 3.2);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text('DESPESA', margin + 26, y + 3.2);
      }

      // Descrição
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      const desc = tx.description || tx.category_name || 'Movimentação';
      const truncatedDesc = desc.length > 32 ? desc.substring(0, 30) + '...' : desc;
      doc.text(truncatedDesc, margin + 48, y + 3.2);

      // Categoria
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const cat = tx.category_name || '-';
      doc.text(cat.length > 18 ? cat.substring(0, 16) + '...' : cat, margin + 105, y + 3.2);

      // Valor
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      if (isInc) {
        doc.setTextColor(5, 150, 105);
        doc.text(`+ ${formatCurrency(tx.amount)}`, pageWidth - margin - 3, y + 3.2, { align: 'right' });
      } else if (isTrf) {
        doc.setTextColor(99, 102, 241);
        doc.text(formatCurrency(tx.amount), pageWidth - margin - 3, y + 3.2, { align: 'right' });
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text(`- ${formatCurrency(tx.amount)}`, pageWidth - margin - 3, y + 3.2, { align: 'right' });
      }

      y += 6;
    });
  }

  // Desenha rodapés em todas as páginas
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 150, 155);
    doc.setDrawColor(220, 228, 224);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text('DIM+ • Seu dinheiro, sob controle.', margin, pageHeight - 7);
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // Baixa o arquivo PDF formatado
  const fileNameDate = new Date().toISOString().slice(0, 10);
  doc.save(`DIM_Plus_Relatorio_${fileNameDate}.pdf`);
}
