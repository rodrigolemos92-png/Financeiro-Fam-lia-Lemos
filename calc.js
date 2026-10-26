import { monthKey, todayISO, round2 } from './utils'

// ======================= Contas =======================
export function accountBalance(state, account) {
  const inc = state.incomes
    .filter((i) => i.account_id === account.id && i.status === 'received')
    .reduce((s, i) => s + i.amount, 0)
  const exp = state.expenses
    .filter((e) => e.account_id === account.id && e.status === 'paid')
    .reduce((s, e) => s + e.amount, 0)
  const inv = state.contributions
    .filter((c) => c.from_account === account.id)
    .reduce((s, c) => s + c.amount, 0)
  return round2(account.initial_balance + inc - exp - inv)
}

// ======================= Despesas / Agenda =======================
// a_vencer | atrasada | paga_no_prazo | paga_atrasada
export function billStatus(exp, today = todayISO()) {
  if (exp.status === 'paid') return exp.paid_date <= exp.due_date ? 'paid_on_time' : 'paid_late'
  return exp.due_date < today ? 'overdue' : 'upcoming'
}

export const STATUS_META = {
  upcoming: { label: 'A vencer', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
  overdue: { label: 'Atrasada', dot: 'bg-red-600', chip: 'bg-red-50 text-red-800 ring-red-200' },
  paid_on_time: { label: 'Paga no prazo', dot: 'bg-emerald-600', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  paid_late: { label: 'Paga com atraso', dot: 'bg-sky-600', chip: 'bg-sky-50 text-sky-800 ring-sky-200' },
}

// ======================= Filtro por visão (Casal | membro) =======================
export function scoped(state, view) {
  if (view === 'all') return state
  const myAccounts = new Set(state.accounts.filter((a) => a.owner_id === view).map((a) => a.id))
  return {
    ...state,
    accounts: state.accounts.filter((a) => a.owner_id === view),
    incomes: state.incomes.filter((i) => myAccounts.has(i.account_id)),
    expenses: state.expenses.filter((e) => e.paid_by === view),
    investments: state.investments.filter((v) => v.owner_id === view),
    contributions: state.contributions.filter((c) => state.investments.find((v) => v.id === c.investment_id)?.owner_id === view),
    yields: state.yields.filter((y) => state.investments.find((v) => v.id === y.investment_id)?.owner_id === view),
  }
}

// ======================= Resumo do mês =======================
export function monthSummary(state, mKey) {
  const incomes = state.incomes.filter((i) => monthKey(i.date) === mKey)
  const expenses = state.expenses.filter((e) => monthKey(e.due_date) === mKey)

  const fixed = sum(incomes.filter((i) => i.kind === 'fixed'))
  const variable = sum(incomes.filter((i) => i.kind === 'variable'))
  const recurring = sum(expenses.filter((e) => e.type === 'recurring'))
  const extraordinary = sum(expenses.filter((e) => e.type === 'extraordinary'))
  const paid = sum(expenses.filter((e) => e.status === 'paid'))
  const pending = sum(expenses.filter((e) => e.status === 'pending'))

  const totalIncome = fixed + variable
  const totalExpense = recurring + extraordinary
  return {
    fixed, variable, totalIncome,
    recurring, extraordinary, totalExpense, paid, pending,
    balance: round2(totalIncome - totalExpense),
  }
}
const sum = (arr) => round2(arr.reduce((s, x) => s + x.amount, 0))

// ======================= Investimentos =======================
export function investmentBalance(state, inv, upToMonthExclusive = null) {
  const before = (d) => (upToMonthExclusive ? monthKey(d) < upToMonthExclusive : true)
  const contrib = state.contributions.filter((c) => c.investment_id === inv.id && before(c.date)).reduce((s, c) => s + c.amount, 0)
  const yld = state.yields.filter((y) => y.investment_id === inv.id && before(y.month)).reduce((s, y) => s + y.amount, 0)
  return round2(inv.initial_balance + contrib + yld)
}

export function investmentSummary(state, mKey) {
  const total = round2(state.investments.reduce((s, v) => s + investmentBalance(state, v), 0))
  const monthYield = round2(
    state.yields.filter((y) => monthKey(y.month) === mKey).reduce((s, y) => s + y.amount, 0),
  )
  const monthContrib = round2(
    state.contributions.filter((c) => monthKey(c.date) === mKey).reduce((s, c) => s + c.amount, 0),
  )
  // % do mês sobre o saldo do início do mês
  const startBase = round2(state.investments.reduce((s, v) => s + investmentBalance(state, v, mKey), 0))
  const monthPct = startBase > 0 ? (monthYield / startBase) * 100 : 0
  return { total, monthYield, monthContrib, monthPct }
}

// ======================= Patrimônio =======================
export function netWorth(state) {
  const cash = round2(state.accounts.reduce((s, a) => s + accountBalance(state, a), 0))
  const invested = investmentSummary(state, '9999-99').total
  return { cash, invested, total: round2(cash + invested) }
}
