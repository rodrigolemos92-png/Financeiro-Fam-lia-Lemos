# Finanças da Família

App web para o casal controlar receitas, despesas, vencimentos, contas e CDB. Feito para o celular.
React + Vite + Tailwind + Supabase (banco, login e sincronização em tempo real).

## Colocar no ar (sem instalar nada no computador)

### 1) Supabase (banco + login)
1. No projeto, abra **SQL Editor → New query**.
2. Cole **todo** o conteúdo de `supabase/schema.sql` → **Run**.
3. Nova query: cole `supabase/02_primeiro_acesso.sql` → **Run**.
4. **Authentication → Users → Add user**: crie o usuário do marido e o da esposa (e-mail + senha, marque "Auto Confirm").
5. **Authentication → Sign In / Providers**: desligue **"Allow new users to sign up"**. Assim só vocês dois entram.

### 2) GitHub (guardar o código)
Este pacote **não tem pastas**: são só arquivos soltos, para o upload pelo site funcionar sem erro.
1. Descompacte o zip. Abra a pasta e selecione **todos os arquivos** (Ctrl+A).
2. No repositório do GitHub: **Add file → Upload files** → arraste os arquivos selecionados.
3. Se o GitHub avisar que os nomes já existem, tudo bem: eles serão substituídos.
4. Confira que `index.html`, `main.jsx` e `package.json` aparecem na lista → **Commit changes**.

### 3) Vercel (gerar o link)
1. Entre em vercel.com com a conta do GitHub → **Add New → Project** → escolha o repositório → **Deploy**.
2. Ao terminar, a Vercel mostra o link do app (algo como `financas-familia.vercel.app`).

### 4) Nos dois celulares
Abra o link → **Adicionar à tela inicial** (iPhone: botão Compartilhar; Android: menu ⋮).
No primeiro login cada um escolhe "Marido" ou "Esposa" e digita o nome.

## Segurança
- A chave `anon` que está em `src/lib/supabase.js` é pública por desenho; os dados são protegidos por login + regras do banco (RLS).
- **Nunca** coloque a chave `service_role` no código.
- Cada lançamento fica salvo no Supabase; o app só mostra dados de quem está logado.

## Desenvolvimento local (opcional)
```bash
npm install
npm run dev
```

## Arquivos (todos na raiz)
```
index.html, main.jsx, App.jsx, index.css     entrada do app
supabase.js, store.jsx                       conexão e dados (leitura, gravação, tempo real)
calc.js, utils.js                            saldos, vencimentos, resumo, CDB, datas/moeda
Auth.jsx, Dashboard.jsx, Agenda.jsx,
Statement.jsx, Investments.jsx, Accounts.jsx telas
ui.jsx, UserSwitcher.jsx, BottomNav.jsx,
MonthSwitcher.jsx, TransactionForm.jsx       componentes
schema.sql, 02_primeiro_acesso.sql           banco (rodar no SQL Editor do Supabase)
manifest.webmanifest, icon-*.png             ícone do app no celular
```

## Regras de negócio
- Saldo da conta = inicial + receitas **recebidas** − despesas **pagas** − aportes debitados da conta.
- Vencimento: A vencer · Atrasada · Paga no prazo · Paga com atraso.
- Receita fixa e despesa recorrente podem ser repetidas por N meses (1 lançamento por mês).
- Rendimento do CDB: informe R$ **ou** %; o outro é calculado sobre o saldo do início do mês.
