import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronRight, Landmark, PiggyBank, TrendingUp, Wallet } from 'lucide-react'
import { Badge, Card, Money, SectionTitle } from './ui'
import MonthSwitcher from './MonthSwitcher'
import { useStore } from './store'
import { STATUS_META, accountBalance, billStatus, investmentSummary, monthSummary, netWorth } from './calc'
import { formatDayMonth, formatPct, monthKey, monthShort, todayISO } from './utils'

export default function Dashboard({ onGo }) {
  const { view, month, userName } = useStore()
  const s = monthSummary(view, month)
  const inv = investmentSummary(view, month)
  const nw = netWorth(view)

  const today = todayISO()
  const upcoming = view.expenses
    .filter((e) => e.status === 'pending' && (monthKey(e.due_date) === month || e.due_date < today))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)

  const totalExp = s.recurring + s.extraordinary
  const recPct = totalExp ? (s.recurring / totalExp) * 100 : 0

  return (
    <div className="space-y-5">
      <MonthSwitcher />

      {/* Saldo do mês */}
      <Card className="overflow-hidden bg-gradient-to-br from-brand to-brand-dark p-5 text-white ring-0">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-white/70">Saldo do mês</p>
        <p className="num mt-1 text-[34px] font-extrabold leading-none tracking-tight">
          <Money value={s.balance} />
        </p>
        <p className="mt-1 text-[12px] text-white/70">Receitas − Despesas lançadas no mês</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-white/70"><ArrowUpRight size={14} /> Receitas</p>
            <p className="mt-0.5 text-[17px] font-bold"><Money value={s.totalIncome} /></p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-white/70"><ArrowDownRight size={14} /> Despesas</p>
            <p className="mt-0.5 text-[17px] font-bold"><Money value={s.totalExpense} /></p>
          </div>
        </div>
      </Card>

      {/* Receitas detalhadas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">Receita fixa (CLT)</p>
          <p className="mt-1 text-[18px] font-extrabold text-gain"><Money value={s.fixed} /></p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">Variável (Uber…)</p>
          <p className="mt-1 text-[18px] font-extrabold text-gain"><Money value={s.variable} /></p>
        </Card>
      </div>

      {/* Despesas: recorrente vs extraordinária */}
      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-bold">Despesas do mês</p>
          <p className="text-[12px] text-ink-mute">
            Pagas <Money value={s.paid} className="font-semibold text-ink" /> · Pendentes <Money value={s.pending} className="font-semibold text-warn" />
          </p>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-black/[0.06]">
          <div className="bg-brand" style={{ width: `${recPct}%` }} />
          <div className="bg-amber-400" style={{ width: `${totalExp ? 100 - recPct : 0}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <p className="flex items-center gap-1.5 text-ink-soft"><span className="h-2.5 w-2.5 rounded-full bg-brand" /> Recorrentes</p>
            <p className="mt-0.5 text-[16px] font-bold"><Money value={s.recurring} /></p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-ink-soft"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Extraordinárias</p>
            <p className="mt-0.5 text-[16px] font-bold"><Money value={s.extraordinary} /></p>
          </div>
        </div>
      </Card>

      {/* Investimentos — destaque */}
      <button onClick={() => onGo('invest')} className="block w-full text-left">
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-brand-soft" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-brand"><PiggyBank size={15} /> Total investido pelo casal</p>
            <p className="num mt-1 text-[28px] font-extrabold tracking-tight"><Money value={inv.total} /></p>
            <div className="mt-3 flex items-center gap-4 text-[13px]">
              <span className="flex items-center gap-1 font-bold text-gain"><TrendingUp size={15} /> +<Money value={inv.monthYield} /> <span className="font-semibold">({formatPct(inv.monthPct)})</span></span>
              <span className="text-ink-mute">rendimento do mês</span>
              <ChevronRight size={16} className="ml-auto text-ink-mute" />
            </div>
          </div>
        </Card>
      </button>

      {/* Patrimônio + contas */}
      <div>
        <SectionTitle action={<button onClick={() => onGo('contas')} className="text-[12px] font-bold text-brand">Gerenciar</button>}>
          Contas e patrimônio
        </SectionTitle>
        <Card className="divide-y divide-black/5">
          <div className="flex items-center justify-between p-4">
            <span className="flex items-center gap-2 text-[13px] font-bold"><Wallet size={16} className="text-brand" /> Patrimônio total</span>
            <span className="text-[18px] font-extrabold"><Money value={nw.total} /></span>
          </div>
          <div className="flex justify-between px-4 py-2 text-[12px] text-ink-soft">
            <span>Em contas <Money value={nw.cash} className="font-semibold text-ink" /></span>
            <span>Investido <Money value={nw.invested} className="font-semibold text-ink" /></span>
          </div>
          {view.accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper"><Landmark size={17} className="text-ink-soft" /></span>
                <div>
                  <p className="text-[14px] font-semibold leading-tight">{a.name}</p>
                  <p className="text-[11px] text-ink-mute">{userName(a.owner_id)}</p>
                </div>
              </div>
              <Money value={accountBalance(view, a)} signed className="text-[15px] font-bold" />
            </div>
          ))}
          {view.accounts.length === 0 && <p className="p-4 text-sm text-ink-mute">Nenhuma conta cadastrada.</p>}
        </Card>
      </div>

      {/* Próximos vencimentos */}
      <div>
        <SectionTitle action={<button onClick={() => onGo('agenda')} className="text-[12px] font-bold text-brand">Ver agenda</button>}>
          Próximos vencimentos
        </SectionTitle>
        <Card className="divide-y divide-black/5">
          {upcoming.length === 0 && <p className="flex items-center gap-2 p-4 text-sm text-ink-mute"><CalendarClock size={16} /> Nada pendente neste mês.</p>}
          {upcoming.map((e) => {
            const st = billStatus(e, today)
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-11 text-center">
                  <p className="text-[15px] font-extrabold leading-none">{formatDayMonth(e.due_date).slice(0, 2)}</p>
                  <p className="text-[10px] font-bold uppercase text-ink-mute">{monthShort(monthKey(e.due_date))}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{e.description}</p>
                  <Badge className={STATUS_META[st].chip}>{STATUS_META[st].label}</Badge>
                </div>
                <Money value={e.amount} className="text-[14px] font-bold" />
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
