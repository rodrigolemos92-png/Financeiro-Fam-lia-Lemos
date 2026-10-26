import { useState } from 'react'
import { ArrowLeft, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Card, Empty, Field, Input, Money, MoneyInput, SectionTitle, Select, Sheet } from '../components/ui'
import { Avatar } from '../components/UserSwitcher'
import { useStore } from '../lib/store'
import { accountBalance, netWorth } from '../lib/calc'
import { parseMoney, uid } from '../lib/utils'

export default function Accounts({ onBack }) {
  const { raw, upsert, remove, rename, actor, clearAll, signOut, authUser } = useStore()
  const [edit, setEdit] = useState(null) // account | {} (novo)
  const nw = netWorth(raw)

  const del = (a) => {
    const used = raw.incomes.some((i) => i.account_id === a.id) || raw.expenses.some((e) => e.account_id === a.id)
      || raw.contributions.some((c) => c.from_account === a.id)
    if (used) return alert('Esta conta tem lançamentos vinculados. Edite ou exclua os lançamentos antes de removê-la.')
    if (confirm(`Excluir a conta "${a.name}"?`)) remove('accounts', a.id)
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[14px] font-bold text-brand"><ArrowLeft size={18} /> Voltar</button>

      <Card className="p-5">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink-mute">Patrimônio total do casal</p>
        <p className="num mt-1 text-[30px] font-extrabold tracking-tight"><Money value={nw.total} /></p>
        <p className="mt-1 text-[12px] text-ink-soft">Contas <Money value={nw.cash} className="font-semibold text-ink" /> + Investimentos <Money value={nw.invested} className="font-semibold text-ink" /></p>
      </Card>

      <SectionTitle action={<button onClick={() => setEdit({})} className="flex items-center gap-1 text-[12px] font-bold text-brand"><Plus size={14} /> Nova conta</button>}>
        Contas bancárias
      </SectionTitle>

      {raw.users.map((u) => {
        const list = raw.accounts.filter((a) => a.owner_id === u.id)
        return (
          <div key={u.id}>
            <p className="mb-1.5 flex items-center gap-2 px-1 text-[13px] font-bold"><Avatar id={u.id} name={u.name} size={22} /> {u.name}</p>
            <Card className="divide-y divide-black/5">
              {list.length === 0 && <Empty icon={Landmark}>Sem contas para {u.name}.</Empty>}
              {list.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper"><Landmark size={17} className="text-ink-soft" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{a.name}</p>
                    <p className="text-[11px] text-ink-mute">Saldo inicial <Money value={a.initial_balance} /></p>
                  </div>
                  <Money value={accountBalance(raw, a)} signed className="text-[15px] font-bold" />
                  <button onClick={() => setEdit(a)} aria-label="Editar" className="p-1.5 text-ink-mute"><Pencil size={15} /></button>
                  <button onClick={() => del(a)} aria-label="Excluir" className="p-1.5 text-ink-mute"><Trash2 size={15} /></button>
                </div>
              ))}
            </Card>
          </div>
        )
      })}

      {/* Ajustes */}
      <div>
        <SectionTitle>Ajustes</SectionTitle>
        <Card className="space-y-3 p-4">
          {raw.users.map((u) => (
            <Field key={u.id} label={u.role === 'husband' ? 'Nome do marido' : 'Nome da esposa'}>
              {/* salva ao sair do campo (evita uma gravação por letra digitada) */}
              <Input key={u.name} defaultValue={u.name} maxLength={20}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== u.name) rename(u.id, v) }} />
            </Field>
          ))}
          <p className="text-[11px] text-ink-mute">Ambos têm acesso de administrador a todos os registros.</p>
        </Card>
        <p className="mt-3 px-1 text-[12px] text-ink-mute">Conectado como <b className="text-ink-soft">{authUser.email}</b></p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={signOut}>Sair</Button>
          <Button variant="danger" onClick={() => {
            if (prompt('Isto apaga TODOS os lançamentos, contas e investimentos do casal, nos dois celulares.\nPara confirmar, digite APAGAR:') === 'APAGAR') clearAll()
          }}>Apagar tudo</Button>
        </div>
      </div>

      <AccountSheet account={edit} onClose={() => setEdit(null)} users={raw.users} actor={actor} onSave={(a) => upsert('accounts', a)} />
    </div>
  )
}

function AccountSheet({ account, onClose, users, actor, onSave }) {
  const open = !!account
  return (
    <Sheet open={open} onClose={onClose} title={account?.id ? 'Editar conta' : 'Nova conta'}>
      {open && <AccountForm key={account.id ?? 'new'} account={account} users={users} actor={actor} onClose={onClose} onSave={onSave} />}
    </Sheet>
  )
}

function AccountForm({ account, users, actor, onClose, onSave }) {
  const [f, setF] = useState({
    name: account.name ?? '', bank: account.bank ?? '', owner_id: account.owner_id ?? actor,
    initial_balance: account.initial_balance != null ? String(account.initial_balance).replace('.', ',') : '',
  })
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))
  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    onSave({ id: account.id ?? uid(), name: f.name.trim(), bank: f.bank.trim(), owner_id: f.owner_id, initial_balance: parseMoney(f.initial_balance) })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome da conta"><Input value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="Ex.: Nubank Marido" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Banco"><Input value={f.bank} onChange={(e) => set('bank')(e.target.value)} placeholder="Nubank" /></Field>
        <Field label="Titular">
          <Select value={f.owner_id} onChange={(e) => set('owner_id')(e.target.value)}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Saldo inicial" hint="Saldo da conta hoje. Receitas e despesas pagas vão ajustando a partir daqui."><MoneyInput value={f.initial_balance} onChange={set('initial_balance')} /></Field>
      <Button type="submit" className="w-full">Salvar conta</Button>
    </form>
  )
}
