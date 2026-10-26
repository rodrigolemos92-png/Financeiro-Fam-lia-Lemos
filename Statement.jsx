import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from 'lucide-react'
import { Badge, Card, Empty, Money, Segmented } from '../components/ui'
import MonthSwitcher from '../components/MonthSwitcher'
import { BillRow } from './Agenda'
import { useStore } from '../lib/store'
import { monthKey, formatDateBR, todayISO, cx } from '../lib/utils'

/** Extrato do mês: todos os lançamentos, com editar / excluir / marcar como pago */
export default function Statement({ onEdit }) {
  const { view, month, upsert, remove, accountName, userName } = useStore()
  const [tab, setTab] = useState('expenses')
  const today = todayISO()

  const expenses = view.expenses.filter((e) => monthKey(e.due_date) === month).sort((a, b) => a.due_date.localeCompare(b.due_date))
  const incomes = view.incomes.filter((i) => monthKey(i.date) === month).sort((a, b) => a.date.localeCompare(b.date))

  const togglePaid = (e) =>
    upsert('expenses', e.status === 'paid' ? { ...e, status: 'pending', paid_date: null } : { ...e, status: 'paid', paid_date: today })

  const del = (coll, id, label) => { if (confirm(`Excluir "${label}"?`)) remove(coll, id) }

  return (
    <div className="space-y-4">
      <MonthSwitcher />
      <Segmented value={tab} onChange={setTab}
        options={[{ value: 'expenses', label: `Despesas (${expenses.length})` }, { value: 'incomes', label: `Receitas (${incomes.length})` }]} />

      {tab === 'expenses' && (
        <Card className="divide-y divide-black/5">
          {expenses.length === 0 && <Empty icon={ArrowDownCircle}>Nenhuma despesa neste mês.</Empty>}
          {expenses.map((e) => (
            <div key={e.id} className="relative">
              <BillRow e={e} today={today} onToggle={() => togglePaid(e)} onEdit={() => onEdit({ kind: 'expense', item: e })} />
              <button onClick={() => del('expenses', e.id, e.description)} aria-label="Excluir"
                className="absolute bottom-3 right-4 text-ink-mute"><Trash2 size={14} /></button>
            </div>
          ))}
        </Card>
      )}

      {tab === 'incomes' && (
        <Card className="divide-y divide-black/5">
          {incomes.length === 0 && <Empty icon={ArrowUpCircle}>Nenhuma receita neste mês.</Empty>}
          {incomes.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', i.kind === 'fixed' ? 'bg-brand-soft text-brand' : 'bg-amber-50 text-amber-700')}>
                <ArrowUpCircle size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{i.description}</p>
                <p className="truncate text-[11px] text-ink-mute">{formatDateBR(i.date).slice(0, 5)} · {accountName(i.account_id)}</p>
                <div className="mt-1 flex gap-1.5">
                  {i.origin_tag && <Badge className="bg-black/5 text-ink-soft ring-black/5">{i.origin_tag}</Badge>}
                  <Badge className={i.status === 'received' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}>
                    {i.status === 'received' ? 'Recebida' : 'A receber'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Money value={i.amount} className="text-[14px] font-bold text-gain" />
                <span className="flex gap-3 text-ink-mute">
                  <button onClick={() => onEdit({ kind: 'income', item: i })} aria-label="Editar"><Pencil size={14} /></button>
                  <button onClick={() => del('incomes', i.id, i.description)} aria-label="Excluir"><Trash2 size={14} /></button>
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
