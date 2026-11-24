# COINVY — Inteligência para Cuidar do Seu Dinheiro

> **COINVY** é um aplicativo financeiro pessoal completo, moderno, minimalista e profissional, adaptado 100% à realidade e aos padrões do Brasil (formatação monetária `R$`, datas `DD/MM/AAAA`, PIX, bancos digitais e categorias brasileiras). Inspirado na agilidade e simplicidade do Monefy, com acabamento refinado de fintech premium.

---

## 💎 Identidade Visual e Marca

- **Nome Oficial:** **COINVY**
- **Slogan:** *Inteligência para cuidar do seu dinheiro.*
- **Paleta de Cores Oficial:**
  - **Verde Esmeralda Principal:** `#059669`
  - **Verde Complementar / Destaques:** `#10B981`
  - **Grafite Escuro / Textos e Superfícies:** `#0F172A`
  - **Fundo Claro:** `#F8FAFC`
  - **Branco Puro:** `#FFFFFF`
  - **Vermelho para Despesas e Alertas:** `#F43F5E`
- **Ícone e Símbolo Oficial:** Símbolo 3D "C" em moeda verde esmeralda com gráfico de barras ascendente e seta de crescimento financeiro.
- **Botão de Privacidade:** Oculte ou exiba instantaneamente seus saldos (`R$ ••••••`) com um clique no ícone de olho.
- **Temas:** Suporte nativo completo a **Modo Claro** e **Modo Escuro** com persistência automática.
- **Mobile First:** Interface totalmente responsiva otimizada para smartphones com barra inferior de navegação (Bottom Bar) e botão central destacado para adicionar movimentações em segundos.

---

## 🚀 Funcionalidades Principais

### 1. Dashboard Principal Inteligente
- Saldo total consolidado disponível.
- Cards dedicados de **Receitas** e **Despesas** do período.
- **Taxa de Economia** e balanço líquido do mês.
- Seletor rápido de período: *Hoje*, *Esta semana*, *Este mês*, *Mês anterior* e *Personalizado*.
- Gráfico Donut interativo de **Distribuição de Despesas por Categoria** com legenda percentual.
- Carrossel horizontal de **Contas Financeiras** com saldo em tempo real.
- Histórico das últimas movimentações com acesso direto à edição e detalhes.

### 2. Lançamento Rápido de Movimentações
- 3 modalidades: **🔴 Despesa**, **🟢 Receita** e **⇄ Transferência entre contas**.
- **Teclado numérico próprio integrado** na tela com cálculo instantâneo (ex: `45 + 15 = 60`).
- Seleção visual de categorias com ícones coloridos e criação inline rápida de novas categorias.
- Seleção de contas de origem e destino com validação de contas distintas.
- Sugestões de descrições frequentes com 1 clique (ex: *Almoço*, *Supermercado*, *Combustível*, *Salário*).

### 3. Categorias Financeiras Pré-configuradas (CRUD Completo)
- **Despesas:** Alimentação, Mercado, Moradia, Transporte, Saúde, Educação, Lazer, Compras, Assinaturas, Contas domésticas, Cartão de crédito e Outros.
- **Receitas:** Salário, Trabalho extra, Vendas, Investimentos, Benefícios e Outros.
- Permite criar, editar cores/ícones e excluir categorias personalizadas.

### 4. Contas e Carteiras Financeiras
- Suporte a Conta Corrente, Dinheiro em Espécie (Carteira), Poupança/Reserva, Cartão de Crédito e Investimentos.
- **Transferências inteligentes:** Realizam o débito e o crédito entre as contas sem impactar falsamente os totais de receitas ou despesas do período.
- Recálculo matemático em nível de banco de dados (`better-sqlite3`) garantindo precisão monetária a cada centavo.

### 5. Contas Recorrentes e Assinaturas
- Agendamento de despesas e receitas fixas (Aluguel, Internet, Netflix, Salário, etc.).
- Frequências: Semanal, Mensal ou Anual.
- Processador automático idempotente: não duplica transações e prevê os próximos vencimentos.

### 6. Orçamentos Mensais (Budgets)
- Orçamento geral do mês e limites individuais por categoria (ex: Alimentação: R$ 800, Lazer: R$ 250).
- Barras de progresso com alerta visual dinâmico:
  - 🟢 Normal (< 80%)
  - 🟡 Alerta / Atenção (80% a 99%)
  - 🔴 Estourado (> 100%)

### 7. Metas Financeiras (Sonhos e Poupança)
- Cadastro de metas (Reserva de Emergência, Carro, Viagem, etc.) com valor alvo e prazo.
- Botões de **Guardar Dinheiro** (Aporte) e **Resgatar Valor**.
- Animação de comemoração com chuva de confetes quando uma meta atinge 100%!

### 8. Relatórios e Gráficos Avançados
- Comparativo mensal de receitas vs despesas (últimos 6 meses).
- Gráfico de tendência de evolução do saldo líquido.
- Tabela de despesas por categoria com percentual e quantidade de lançamentos.
- Exportação de dados:
  - **Planilha Excel (CSV)** com formatação brasileira (separador `;`, datas `DD/MM/AAAA` e codificação UTF-8 com BOM).
  - **Backup Completo em JSON** para restauração.

### 9. Autenticação e Gestão de Dados
- Cadastro e login seguro com hash de senha `bcryptjs` e token `JWT`.
- **Botão de Demonstração em 1 Clique:** Acesse instantaneamente com dados pré-populados para avaliar o app sem precisar preencher formulários.
- Opção para limpar todos os lançamentos demonstrativos e começar do zero.

---

## 🛠️ Arquitetura Técnica

- **Backend:** Node.js, Express 5, TypeScript (`tsx`), SQLite (`better-sqlite3` com modo WAL e integridade referencial), Zod, JWT e Bcrypt.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts e Canvas Confetti.
- **Armazenamento:** Banco de dados relacional persistente em `./data/nexo_finance.db`.

---

## 📦 Como Executar o Projeto

### Pré-requisitos
- Node.js v18+ instalado.

### 1. Iniciar em Modo de Desenvolvimento (Frontend + Backend juntos)
```bash
npm run dev
```
O backend rodará em `http://localhost:3001` e o frontend Vite em `http://localhost:5173`.

### 2. Iniciar em Modo de Produção
```bash
# Compilar o frontend
npm run build

# Iniciar o servidor integrado
npm start
```
Abra o navegador em `http://localhost:3001`.
