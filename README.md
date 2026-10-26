# Finanças da Família

App web mobile-first (React + Vite + Tailwind + lucide-react) para controle financeiro do casal.

## Rodar

```bash
npm install
npm run dev      # abre em http://localhost:5173 (use o IP da rede para testar no celular)
npm run build    # gera /dist para hospedar (Vercel, Netlify, Cloudflare Pages)
```

## Estado atual: modo demonstração
Os dados ficam no `localStorage` do aparelho (com dados de exemplo; em **Ajustes** há "Limpar tudo").
Nesse modo os dois celulares **não sincronizam**. Para uso real do casal, ligue ao Supabase:

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor.
2. Crie os 2 usuários em Authentication e insira 1 `household` + 2 `members` (marido/esposa).
3. Em `src/lib/store.jsx`, troque `load()` e as ações (`upsert`, `remove`...) por chamadas `supabase.from(tabela)`
   e assine o Realtime. O formato do estado já espelha as tabelas.

## Estrutura
```
supabase/schema.sql        tabelas, enums, view de saldos, RLS (ambos admin)
src/lib/utils.js           datas (ISO local), moeda BRL, parse
src/lib/calc.js            saldo por conta, status de vencimento, resumo do mês, CDB, patrimônio
src/lib/store.jsx          estado + persistência + visão Casal/Marido/Esposa
src/components/            ui, UserSwitcher, BottomNav, TransactionForm, MonthSwitcher
src/screens/               Dashboard, Agenda, Statement (extrato), Investments (CDB), Accounts
```

## Regras de negócio
- Saldo da conta = inicial + receitas **recebidas** − despesas **pagas** − aportes debitados da conta.
- Vencimento: `A vencer` (pendente, no futuro) · `Atrasada` (pendente, vencida) · `Paga no prazo` · `Paga com atraso`.
- Receita fixa e despesa recorrente podem ser repetidas por N meses (1 lançamento por mês).
- Rendimento do CDB: informe R$ **ou** %; o outro é calculado sobre o saldo do início do mês.
