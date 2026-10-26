import { useMemo, useState } from 'react'
import { PiggyBank, Plus, Trash2, TrendingUp, ArrowUpFromLine } from 'lucide-react'
import { Button, Card, Empty, Field, Input, Money, MoneyInput, SectionTitle, Select, Sheet } from '../components/ui'
import MonthSwitcher from '../components/MonthSwitcher'
import { useStore } from '../lib/store'
import { investmentBalance, investmentSummary } from '../lib/calc'
import { formatDateBR, formatPct, monthKey, monthLabel, parseMoney, round2, todayISO, uid } from '../lib/utils'

export default function Investments() {
  const { view, raw, month, userName, actor, remove } = useStore()
  const [sheet, setSheet] = useState(null) // {type:'new'|'contrib'|'yield', inv?}
  const sum = investmentSummary(view, month)

  return (
    <div className="space-y-5">
      <MonthSwitcher />

      {/* Card de destaque: total investido pelo casal */}
      <Card className="bg-gradient-to-br from-ink to-[#23403B] p-5 text-white ring-0">
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-white/60"><PiggyBank size={15} /> Total investido pelo casal</p>
        <p className="num mt-1 text-[34px] font-extrabold leading-none tracking-tight"><Money value={sum.total} /></p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-semibold text-white/60">Rendimento líquido em {monthLabel(month).split(' ')[0]}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[16px] font-bold text-emerald-300"><TrendingUp size={15} /> +<Money value={sum.monthYield} /></p>
            <p className="text-[11px] font-semibold text-white/70">{formatPct(sum.monthPct)} no mês</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-semibold text-white/60">Aportes no mês</p>
            <p className="mt-0.5 text-[16px] font-bold"><Money value={sum.monthContrib} /></p>
          </div>
        </div>
      </Card>

      <SectionTitle action={<button onClick={() => setSheet({ type: 'new' })} className="flex items-center gap-1 text-[12px] font-bold text-brand"><Plus size={14} /> Novo CDB</button>}>
        Meus investimentos
      </SectionTitle>

      {view.investments.length === 0 && <Card><Empty icon={PiggyBank}>Nenhum investimento. Cadastre seu primeiro CDB.</Empty></Card>}

      {view.investments.map((inv) => (
        <InvestmentCard key={inv.id} inv={inv} month={month} state={view} owner={userName(inv.owner_id)}
          onContrib={() => setSheet({ type: 'contrib', inv })} onYield={() => setSheet({ type: 'yield', inv })}
          onRemove={() => { if (confirm(`Excluir "${inv.name}" e todo o histórico?`)) remove('investments', inv.id) }} />
      ))}

      <NewInvestment open={sheet?.type === 'new'} onClose={() => setSheet(null)} actor={actor} />
      <ContribSheet open={sheet?.type === 'contrib'} inv={sheet?.inv} onClose={() => setSheet(null)} />
      <YieldSheet open={sheet?.type === 'yield'} inv={sheet?.inv} month={month} onClose={() => setSheet(null)} />
    </div>
  )
}

function InvestmentCard({ inv, state, month, owner, onContrib, onYield, onRemove }) {
  const { remove } = useStore()
  const balance = investmentBalance(state, inv)
  const history = useMemo(() => {
    const c = state.contributions.filter((x) => x.investment_id === inv.id).map((x) => ({ ...x, kind: 'contrib', sort: x.date }))
    const y = state.yields.filter((x) => x.investment_id === inv.id).map((x) => ({ ...x, kind: 'yield', sort: x.month }))
    return [...c, ...y].sort((a, b) => b.sort.localeCompare(a.sort))
  }, [state, inv.id])
  const monthY = state.yields.find((y) => y.investment_id === inv.id && monthKey(y.month) === month)

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[15px] font-extrabold">{inv.name}</p>
          <p className="text-[12px] text-ink-mute">{inv.institution || 'CDB'} · {owner}</p>
        </div>
        <button onClick={onRemove} aria-label="Excluir investimento" className="rounded-lg p-2 text-ink-mute active:bg-black/5"><Trash2 size={16} /></button>
      </div>
      <p className="num mt-2 text-[26px] font-extrabold tracking-tight"><Money value={balance} /></p>
      <p className="text-[12px] text-ink-mute">Saldo acumulado (inicial + aportes + rendimentos)</p>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2.5 text-[13px]">
        <span className="font-semibold text-brand-dark">Rendimento de {monthLabel(month).split(' ')[0]}</span>
        {monthY
          ? <span className="font-bold text-gain">+<Money value={monthY.amount} /> · {formatPct(monthY.percent)}</span>
          : <span className="font-semibold text-ink-mute">não lançado</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="soft" onClick={onContrib} className="!py-2.5 text-[14px]"><ArrowUpFromLine size={16} /> Aporte</Button>
        <Button variant="soft" onClick={onYield} className="!py-2.5 text-[14px]"><TrendingUp size={16} /> Rendimento</Button>
      </div>

      {history.length > 0 && (
        <details className="mt-3 group">
          <summary className="cursor-pointer list-none text-[12px] font-bold text-ink-soft">Histórico ({history.length}) <span className="text-brand group-open:hidden">ver</span><span className="hidden text-brand group-open:inline">ocultar</span></summary>
          <ul className="mt-2 divide-y divide-black/5">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-[13px]">
                <div>
                  <p className="font-semibold">{h.kind === 'contrib' ? 'Aporte' : `Rendimento ${monthLabel(monthKey(h.month))}`}</p>
                  <p className="text-[11px] text-ink-mute">
                    {h.kind === 'contrib' ? formatDateBR(h.date) + (h.note ? ` · ${h.note}` : '') : formatPct(h.percent)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={h.kind === 'yield' ? 'font-bold text-gain' : 'font-bold'}>{h.kind === 'yield' ? '+' : ''}<Money value={h.amount} /></span>
                  <button onClick={() => remove(h.kind === 'contrib' ? 'contributions' : 'yields', h.id)} aria-label="Remover" className="text-ink-mute"><Trash2 size={14} /></button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}

// ---------- Novo CDB ----------
function NewInvestment({ open, onClose, actor }) {
  const { raw, upsert } = useStore()
  const [f, setF] = useState({ name: '', institution: '', balance: '', owner_id: actor })
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    upsert('investments', { id: uid(), owner_id: f.owner_id, name: f.name.trim(), institution: f.institution.trim(), kind: 'cdb', initial_balance: parseMoney(f.balance) })
    setF({ name: '', institution: '', balance: '', owner_id: actor })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Novo CDB / Renda Fixa">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome"><Input value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="Ex.: CDB 110% CDI" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Instituição"><Input value={f.institution} onChange={(e) => set('institution')(e.target.value)} placeholder="Banco Inter" /></Field>
          <Field label="Titular">
            <Select value={f.owner_id} onChange={(e) => set('owner_id')(e.target.value)}>
              {raw.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Saldo acumulado atual" hint="Quanto já está investido hoje."><MoneyInput value={f.balance} onChange={set('balance')} /></Field>
        <Button type="submit" className="w-full">Cadastrar</Button>
      </form>
    </Sheet>
  )
}

// ---------- Aporte ----------
function ContribSheet({ open, inv, onClose }) {
  const { raw, upsert } = useStore()
  const [f, setF] = useState({ amount: '', date: todayISO(), from: '', note: '' })
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  if (!inv) return null
  const submit = (e) => {
    e.preventDefault()
    const amount = parseMoney(f.amount)
    if (amount <= 0) return
    upsert('contributions', { id: uid(), investment_id: inv.id, date: f.date, amount, from_account: f.from || null, note: f.note.trim() })
    setF({ amount: '', date: todayISO(), from: '', note: '' })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={`Aporte — ${inv.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor do aporte"><MoneyInput value={f.amount} onChange={set('amount')} autoFocus /></Field>
          <Field label="Data"><Input type="date" value={f.date} onChange={(e) => set('date')(e.target.value)} /></Field>
        </div>
        <Field label="Debitar de qual conta?" hint="Opcional. Se escolher, o saldo da conta diminui automaticamente.">
          <Select value={f.from} onChange={(e) => set('from')(e.target.value)}>
            <option value="">Não debitar</option>
            {raw.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Observação"><Input value={f.note} onChange={(e) => set('note')(e.target.value)} placeholder="Ex.: sobra do mês" /></Field>
        <Button type="submit" className="w-full">Registrar aporte</Button>
      </form>
    </Sheet>
  )
}

// ---------- Rendimento mensal líquido (R$ e %) ----------
function YieldSheet({ open, inv, month, onClose }) {
  const { raw, upsert, remove } = useStore()
  const [f, setF] = useState({ amount: '', percent: '' })
  if (!inv) return null
  const base = investmentBalance(raw, inv, month) // saldo no início do mês
  const existing = raw.yields.find((y) => y.investment_id === inv.id && monthKey(y.month) === month)

  // Digita R$ -> calcula %; digita % -> calcula R$ (sobre o saldo do início do mês)
  const onAmount = (v) => {
    const a = parseMoney(v)
    setF({ amount: v, percent: base > 0 && a ? String(((a / base) * 100).toFixed(2)).replace('.', ',') : '' })
  }
  const onPercent = (v) => {
    const p = parseMoney(v)
    setF({ percent: v, amount: base > 0 && p ? String(round2((p / 100) * base)).replace('.', ',') : '' })
  }
  const submit = (e) => {
    e.preventDefault()
    const amount = parseMoney(f.amount)
    const percent = parseMoney(f.percent) || (base > 0 ? (amount / base) * 100 : 0)
    if (!amount) return
    upsert('yields', { id: existing?.id ?? uid(), investment_id: inv.id, month: `${month}-01`, amount, percent: round2(percent * 100) / 100 })
    setF({ amount: '', percent: '' })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={`Rendimento — ${monthLabel(month)}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-xl bg-paper px-3 py-2.5 text-[13px] text-ink-soft">
          Saldo no início do mês: <b className="text-ink"><Money value={base} /></b>. Informe o valor <b>líquido</b> (já descontado IR/IOF) — a porcentagem é calculada sozinha.
        </p>
        {existing && <p className="text-[12px] font-semibold text-warn">Já existe um lançamento neste mês: <Money value={existing.amount} /> ({formatPct(existing.percent)}). Salvar vai substituí-lo.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rendimento líquido (R$)"><MoneyInput value={f.amount} onChange={onAmount} autoFocus /></Field>
          <Field label="Rendimento (%)">
            <div className="relative">
              <input inputMode="decimal" placeholder="0,00" value={f.percent} onChange={(e) => onPercent(e.target.value.replace(/[^\d.,]/g, ''))}
                className="num w-full rounded-xl border-0 bg-paper px-3.5 py-3 pr-9 font-semibold ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand" />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-mute">%</span>
            </div>
          </Field>
        </div>
        <Button type="submit" className="w-full">Salvar rendimento</Button>
        {existing && <Button type="button" variant="danger" className="w-full" onClick={() => { remove('yields', existing.id); onClose() }}>Remover lançamento do mês</Button>}
      </form>
    </Sheet>
  )
}
