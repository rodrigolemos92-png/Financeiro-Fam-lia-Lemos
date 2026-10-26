import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pencil, Undo2 } from 'lucide-react'
import { Badge, Card, Empty, Money, Segmented } from './ui'
import { STATUS_META, billStatus } from './calc'
import { useStore } from './store'
import {
  addDaysISO, addMonthsKey, cx, formatDateBR, fromISO, monthKey, monthLabel,
  startOfWeekISO, toISO, todayISO, weekdayLabel,
} from './utils'

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function buildDays(mode, anchor, month) {
  if (mode === 'week') {
    const start = startOfWeekISO(anchor)
    return Array.from({ length: 7 }, (_, i) => addDaysISO(start, i))
  }
  const first = `${month}-01`
  const lead = fromISO(first).getDay()
  const total = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()
  const cells = Array(lead).fill(null)
  for (let d = 1; d <= total; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  return cells
}

export default function Agenda({ onEdit }) {
  const { view, upsert } = useStore()
  const today = todayISO()
  const [mode, setMode] = useState('month')
  const [anchor, setAnchor] = useState(today)       // dia selecionado
  const [month, setMonth] = useState(monthKey(today))
  const [filter, setFilter] = useState('all')       // all | upcoming | overdue | paid

  const byDay = useMemo(() => {
    const map = {}
    view.expenses.forEach((e) => { (map[e.due_date] ||= []).push(e) })
    return map
  }, [view.expenses])

  const matches = (e) => {
    const st = billStatus(e, today)
    if (filter === 'all') return true
    if (filter === 'paid') return st === 'paid_on_time' || st === 'paid_late'
    return st === filter
  }

  const days = buildDays(mode, anchor, month)

  const go = (dir) => {
    if (mode === 'week') {
      const next = addDaysISO(anchor, dir * 7)
      setAnchor(next); setMonth(monthKey(next))
    } else {
      const m = addMonthsKey(month, dir)
      setMonth(m); setAnchor(`${m}-01`)
    }
  }

  const title = mode === 'week'
    ? `${formatDateBR(days[0]).slice(0, 5)} – ${formatDateBR(days[6]).slice(0, 5)}`
    : monthLabel(month)

  // Resumo do período exibido
  const period = days.filter(Boolean).flatMap((d) => byDay[d] ?? [])
  const totals = {
    upcoming: period.filter((e) => billStatus(e, today) === 'upcoming').reduce((s, e) => s + e.amount, 0),
    overdue: period.filter((e) => billStatus(e, today) === 'overdue').reduce((s, e) => s + e.amount, 0),
    paid: period.filter((e) => e.status === 'paid').reduce((s, e) => s + e.amount, 0),
  }

  const selected = (byDay[anchor] ?? []).filter(matches)

  const togglePaid = (e) => {
    if (e.status === 'paid') upsert('expenses', { ...e, status: 'pending', paid_date: null })
    else upsert('expenses', { ...e, status: 'paid', paid_date: today })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Segmented className="flex-1" value={mode} onChange={(m) => { setMode(m); setMonth(monthKey(anchor)) }}
          options={[{ value: 'month', label: 'Mês' }, { value: 'week', label: 'Semana' }]} />
        <button onClick={() => { setAnchor(today); setMonth(monthKey(today)) }} className="rounded-xl bg-white px-3.5 py-2.5 text-[13px] font-bold shadow-card ring-1 ring-black/5">Hoje</button>
      </div>

      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={() => go(-1)} aria-label="Anterior" className="rounded-xl p-2 active:bg-black/5"><ChevronLeft size={20} /></button>
          <span className="text-[15px] font-extrabold">{title}</span>
          <button onClick={() => go(1)} aria-label="Próximo" className="rounded-xl p-2 active:bg-black/5"><ChevronRight size={20} /></button>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-ink-mute">
          {WEEK.map((w, i) => <span key={i} className="py-1">{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((d, i) => {
            if (!d) return <span key={i} />
            const list = (byDay[d] ?? [])
            const statuses = [...new Set(list.map((e) => billStatus(e, today)))]
            const isSel = d === anchor
            const isToday = d === today
            return (
              <button key={d} onClick={() => setAnchor(d)}
                className={cx('mx-auto flex h-12 w-11 flex-col items-center justify-center rounded-xl transition',
                  isSel ? 'bg-ink text-white' : isToday ? 'bg-brand-soft text-brand-dark' : 'active:bg-black/5')}>
                <span className="text-[14px] font-bold leading-none">{Number(d.slice(8))}</span>
                <span className="mt-1.5 flex h-1.5 gap-0.5">
                  {statuses.slice(0, 4).map((s) => <i key={s} className={cx('h-1.5 w-1.5 rounded-full', STATUS_META[s].dot)} />)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Legenda */}
        <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 border-t border-black/5 pt-3 text-[11px] font-semibold text-ink-soft">
          {Object.entries(STATUS_META).map(([k, m]) => (
            <span key={k} className="flex items-center gap-1"><i className={cx('h-2 w-2 rounded-full', m.dot)} />{m.label}</span>
          ))}
        </div>
      </Card>

      {/* Resumo do período */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Card className="p-3"><p className="text-[10px] font-bold uppercase text-amber-700">A vencer</p><p className="mt-0.5 text-[13px] font-extrabold"><Money value={totals.upcoming} /></p></Card>
        <Card className="p-3"><p className="text-[10px] font-bold uppercase text-red-700">Atrasadas</p><p className="mt-0.5 text-[13px] font-extrabold"><Money value={totals.overdue} /></p></Card>
        <Card className="p-3"><p className="text-[10px] font-bold uppercase text-emerald-700">Pagas</p><p className="mt-0.5 text-[13px] font-extrabold"><Money value={totals.paid} /></p></Card>
      </div>

      {/* Filtro por status */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[['all', 'Todas'], ['upcoming', 'A vencer'], ['overdue', 'Atrasadas'], ['paid', 'Pagas']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold ring-1 ring-inset',
              filter === v ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-black/10')}>{l}</button>
        ))}
      </div>

      {/* Contas do dia selecionado */}
      <div>
        <h3 className="mb-2 px-1 text-[13px] font-bold text-ink-soft">
          {weekdayLabel(anchor)}, {formatDateBR(anchor)}
        </h3>
        <Card className="divide-y divide-black/5">
          {selected.length === 0 && <Empty>Nenhum vencimento neste dia.</Empty>}
          {selected.map((e) => <BillRow key={e.id} e={e} today={today} onToggle={() => togglePaid(e)} onEdit={() => onEdit({ kind: 'expense', item: e })} />)}
        </Card>
      </div>
    </div>
  )
}

export function BillRow({ e, today, onToggle, onEdit }) {
  const { userName, accountName } = useStore()
  const st = billStatus(e, today)
  const paid = e.status === 'paid'
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button onClick={onToggle} aria-label={paid ? 'Desfazer pagamento' : 'Marcar como pago'}
        className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition',
          paid ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-ink-mute ring-black/15')}>
        {paid ? <Check size={18} strokeWidth={3} /> : <Undo2 size={0} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-[14px] font-semibold', paid && 'text-ink-soft line-through decoration-black/20')}>{e.description}</p>
        <p className="truncate text-[11px] text-ink-mute">
          {e.category} · {userName(e.paid_by)} · {accountName(e.account_id)}
          {paid && ` · pago em ${formatDateBR(e.paid_date).slice(0, 5)}`}
        </p>
        <Badge className={cx(STATUS_META[st].chip, 'mt-1')}>{STATUS_META[st].label}</Badge>
      </div>
      <div className="text-right">
        <Money value={e.amount} className="text-[14px] font-bold" />
        <button onClick={onEdit} aria-label="Editar" className="mt-1 block w-full text-right text-ink-mute"><Pencil size={14} className="ml-auto" /></button>
      </div>
    </div>
  )
}
