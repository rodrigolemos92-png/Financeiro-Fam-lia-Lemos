import { useMemo, useState } from 'react'
import { Button, Field, Input, MoneyInput, Segmented, Select, Sheet } from './ui'
import { CATEGORIES, INCOME_TAGS, useStore } from '../lib/store'
import { addMonthsISO, parseMoney, todayISO, uid } from '../lib/utils'

/**
 * Formulário único para lançar Despesa ou Receita (e editar).
 * `edit` = { kind: 'expense' | 'income', item }
 */
export default function TransactionForm({ open, onClose, edit }) {
  const { state, actor } = useStore()
  const [mode, setMode] = useState(edit?.kind ?? 'expense')
  // remonta o conteúdo ao trocar de item para resetar os campos
  const key = edit ? edit.item.id : 'new'
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Editar lançamento' : 'Novo lançamento'}>
      {!edit && (
        <Segmented
          className="mb-4" value={mode} onChange={setMode}
          options={[{ value: 'expense', label: '− Despesa' }, { value: 'income', label: '+ Receita' }]}
        />
      )}
      {(edit?.kind ?? mode) === 'expense'
        ? <ExpenseFields key={key + 'e'} state={state} actor={actor} item={edit?.item} onDone={onClose} />
        : <IncomeFields key={key + 'i'} state={state} actor={actor} item={edit?.item} onDone={onClose} />}
    </Sheet>
  )
}

// ======================================================= DESPESA
function ExpenseFields({ state, actor, item, onDone }) {
  const { upsert, upsertMany } = useStore()
  const isEdit = !!item
  const [f, setF] = useState(() => item ? {
    description: item.description, category: item.category, amount: String(item.amount).replace('.', ','),
    type: item.type, paid_by: item.paid_by, account_id: item.account_id, due_date: item.due_date,
    status: item.status, paid_date: item.paid_date ?? todayISO(), repeat: 1,
  } : {
    description: '', category: CATEGORIES[0], amount: '', type: 'recurring', paid_by: actor,
    account_id: state.accounts.find((a) => a.owner_id === actor)?.id ?? state.accounts[0]?.id ?? '',
    due_date: todayISO(), status: 'pending', paid_date: todayISO(), repeat: 1,
  })
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  const [err, setErr] = useState('')

  // Contas do pagador aparecem primeiro
  const accounts = useMemo(
    () => [...state.accounts].sort((a, b) => (b.owner_id === f.paid_by) - (a.owner_id === f.paid_by)),
    [state.accounts, f.paid_by],
  )

  const changeStatus = (s) => setF((p) => ({ ...p, status: s, paid_date: s === 'paid' ? (p.paid_date || todayISO()) : p.paid_date }))

  const submit = (e) => {
    e.preventDefault()
    const amount = parseMoney(f.amount)
    if (!f.description.trim()) return setErr('Informe a descrição.')
    if (amount <= 0) return setErr('Informe um valor maior que zero.')
    if (!f.account_id) return setErr('Cadastre uma conta bancária primeiro (menu Contas).')
    const base = {
      description: f.description.trim(), category: f.category, amount, type: f.type,
      paid_by: f.paid_by, account_id: f.account_id,
      status: f.status, paid_date: f.status === 'paid' ? f.paid_date : null,
    }
    if (isEdit) {
      upsert('expenses', { ...item, ...base, due_date: f.due_date })
    } else {
      const n = f.type === 'recurring' ? Math.max(1, Math.min(60, Number(f.repeat) || 1)) : 1
      const series_id = n > 1 ? uid() : null
      const list = Array.from({ length: n }, (_, i) => ({
        id: uid(), ...base, series_id,
        due_date: addMonthsISO(f.due_date, i),
        // só a 1ª parcela herda "pago"; as futuras nascem pendentes
        status: i === 0 ? base.status : 'pending',
        paid_date: i === 0 ? base.paid_date : null,
      }))
      upsertMany('expenses', list)
    }
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Descrição">
        <Input value={f.description} onChange={(e) => set('description')(e.target.value)} placeholder="Ex.: Aluguel, Luz, Farmácia" autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor"><MoneyInput value={f.amount} onChange={set('amount')} /></Field>
        <Field label="Categoria">
          <Select value={f.category} onChange={(e) => set('category')(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Tipo">
        <Segmented value={f.type} onChange={set('type')}
          options={[{ value: 'recurring', label: 'Fixa / Recorrente' }, { value: 'extraordinary', label: 'Extraordinária' }]} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quem pagou">
          <Select value={f.paid_by} onChange={(e) => set('paid_by')(e.target.value)}>
            {state.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Conta de origem">
          <Select value={f.account_id} onChange={(e) => set('account_id')(e.target.value)}>
            {accounts.length === 0 && <option value="">Sem contas</option>}
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vencimento"><Input type="date" value={f.due_date} onChange={(e) => set('due_date')(e.target.value)} /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => changeStatus(e.target.value)}>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
          </Select>
        </Field>
      </div>
      {f.status === 'paid' && (
        <Field label="Data efetiva do pagamento">
          <Input type="date" value={f.paid_date} onChange={(e) => set('paid_date')(e.target.value)} />
        </Field>
      )}
      {!isEdit && f.type === 'recurring' && (
        <Field label="Repetir por quantos meses?" hint="Cria um vencimento por mês, todos pendentes (exceto o 1º, se marcado como pago).">
          <Input type="number" min="1" max="60" value={f.repeat} onChange={(e) => set('repeat')(e.target.value)} />
        </Field>
      )}
      {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-loss">{err}</p>}
      <Button type="submit" className="w-full">{isEdit ? 'Salvar alterações' : 'Lançar despesa'}</Button>
    </form>
  )
}

// ======================================================= RECEITA
function IncomeFields({ state, actor, item, onDone }) {
  const { upsert, upsertMany } = useStore()
  const isEdit = !!item
  const [f, setF] = useState(() => item ? {
    description: item.description, kind: item.kind, origin_tag: item.origin_tag ?? '',
    amount: String(item.amount).replace('.', ','), account_id: item.account_id, date: item.date,
    status: item.status, repeat: 1,
  } : {
    description: '', kind: 'fixed', origin_tag: 'CLT', amount: '',
    account_id: state.accounts.find((a) => a.owner_id === actor)?.id ?? state.accounts[0]?.id ?? '',
    date: todayISO(), status: 'received', repeat: 1,
  })
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  const [err, setErr] = useState('')

  const setKind = (kind) => setF((p) => ({
    ...p, kind, origin_tag: kind === 'fixed' ? 'CLT' : 'Uber',
  }))

  const submit = (e) => {
    e.preventDefault()
    const amount = parseMoney(f.amount)
    if (!f.description.trim()) return setErr('Informe a descrição.')
    if (amount <= 0) return setErr('Informe um valor maior que zero.')
    if (!f.account_id) return setErr('Cadastre uma conta bancária primeiro (menu Contas).')
    const base = { description: f.description.trim(), kind: f.kind, origin_tag: f.origin_tag, amount, account_id: f.account_id }
    if (isEdit) {
      upsert('incomes', { ...item, ...base, date: f.date, status: f.status })
    } else {
      const n = f.kind === 'fixed' ? Math.max(1, Math.min(60, Number(f.repeat) || 1)) : 1
      const series_id = n > 1 ? uid() : null
      const today = todayISO()
      upsertMany('incomes', Array.from({ length: n }, (_, i) => {
        const date = addMonthsISO(f.date, i)
        return { id: uid(), ...base, series_id, date, status: i === 0 ? f.status : date <= today ? 'received' : 'expected' }
      }))
    }
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tipo de receita">
        <Segmented value={f.kind} onChange={setKind}
          options={[{ value: 'fixed', label: 'Fixa (salário)' }, { value: 'variable', label: 'Variável (Uber…)' }]} />
      </Field>
      <Field label="Descrição">
        <Input value={f.description} onChange={(e) => set('description')(e.target.value)}
          placeholder={f.kind === 'fixed' ? 'Ex.: Salário CLT' : 'Ex.: Uber — fechamento da semana'} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor"><MoneyInput value={f.amount} onChange={set('amount')} /></Field>
        <Field label="Origem (tag)">
          <Select value={f.origin_tag} onChange={(e) => set('origin_tag')(e.target.value)}>
            {INCOME_TAGS.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Conta de destino">
          <Select value={f.account_id} onChange={(e) => set('account_id')(e.target.value)}>
            {state.accounts.length === 0 && <option value="">Sem contas</option>}
            {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label={f.kind === 'fixed' ? 'Data programada' : 'Data'}>
          <Input type="date" value={f.date} onChange={(e) => set('date')(e.target.value)} />
        </Field>
      </div>
      <Field label="Situação">
        <Segmented value={f.status} onChange={set('status')}
          options={[{ value: 'received', label: 'Já recebi' }, { value: 'expected', label: 'A receber' }]} />
      </Field>
      {!isEdit && f.kind === 'fixed' && (
        <Field label="Repetir por quantos meses?" hint="Programa o salário nos próximos meses (aparece como “a receber”).">
          <Input type="number" min="1" max="60" value={f.repeat} onChange={(e) => set('repeat')(e.target.value)} />
        </Field>
      )}
      {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-loss">{err}</p>}
      <Button type="submit" className="w-full">{isEdit ? 'Salvar alterações' : 'Lançar receita'}</Button>
    </form>
  )
}

