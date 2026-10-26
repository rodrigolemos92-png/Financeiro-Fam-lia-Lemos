import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { currentMonthKey, uid } from './utils'
import { scoped } from './calc'
import { supabase } from './supabase'

/**
 * CAMADA DE DADOS — Supabase (Postgres + Auth + Realtime)
 * O estado local espelha as tabelas de supabase/schema.sql. Escritas são otimistas
 * (a tela atualiza na hora) e, em caso de erro, os dados são recarregados do servidor.
 */
const ACTOR_KEY = 'financas-familia:actor'

export const CATEGORIES = [
  'Moradia', 'Contas de consumo', 'Internet/Telefone', 'Mercado', 'Transporte', 'Veículo',
  'Saúde/Farmácia', 'Educação', 'Lazer', 'Restaurante', 'Assinaturas', 'Impostos', 'Outros',
]
export const INCOME_TAGS = ['CLT', 'Uber', '99', 'iFood', 'Freela', 'Outros']

const EMPTY = { users: [], accounts: [], incomes: [], expenses: [], investments: [], contributions: [], yields: [] }

// coleção do app -> tabela do banco
const TABLE = {
  accounts: 'accounts', incomes: 'incomes', expenses: 'expenses', investments: 'investments',
  contributions: 'investment_contributions', yields: 'investment_yields',
}
const n = (v) => Number(v) || 0

// ---------- banco -> app ----------
const from = {
  members: (r) => ({ id: r.id, role: r.role, name: r.display_name, auth_user_id: r.auth_user_id, household_id: r.household_id }),
  accounts: (r) => ({ id: r.id, owner_id: r.owner_member_id, name: r.name, bank: r.bank ?? '', initial_balance: n(r.initial_balance) }),
  incomes: (r) => ({ ...r, amount: n(r.amount) }),
  expenses: (r) => ({ ...r, amount: n(r.amount) }),
  investments: (r) => ({ id: r.id, owner_id: r.owner_member_id, name: r.name, kind: r.kind, institution: r.institution ?? '', initial_balance: n(r.initial_balance) }),
  contributions: (r) => ({ id: r.id, investment_id: r.investment_id, date: r.date, amount: n(r.amount), from_account: r.from_account, note: r.note ?? '' }),
  yields: (r) => ({ id: r.id, investment_id: r.investment_id, month: r.month, amount: n(r.amount), percent: n(r.percent) }),
}

// ---------- app -> banco ----------
const to = (coll, i, ctx) => {
  const base = { id: i.id, household_id: ctx.householdId }
  switch (coll) {
    case 'accounts':
      return { ...base, owner_member_id: i.owner_id, name: i.name, bank: i.bank || null, initial_balance: i.initial_balance }
    case 'incomes':
      return { ...base, description: i.description, kind: i.kind, origin_tag: i.origin_tag || null, amount: i.amount, account_id: i.account_id, received_by: i.received_by ?? ctx.actor, date: i.date, status: i.status, series_id: i.series_id ?? null }
    case 'expenses':
      return { ...base, description: i.description, category: i.category, amount: i.amount, type: i.type, paid_by: i.paid_by, account_id: i.account_id, due_date: i.due_date, status: i.status, paid_date: i.paid_date ?? null, series_id: i.series_id ?? null }
    case 'investments':
      return { ...base, owner_member_id: i.owner_id, name: i.name, kind: i.kind ?? 'cdb', institution: i.institution || null, initial_balance: i.initial_balance }
    case 'contributions':
      return { ...base, investment_id: i.investment_id, date: i.date, amount: i.amount, from_account: i.from_account || null, note: i.note || null }
    case 'yields':
      return { ...base, investment_id: i.investment_id, month: i.month, amount: i.amount, percent: i.percent }
    default:
      throw new Error('Coleção desconhecida: ' + coll)
  }
}

async function fetchAll() {
  const q = (t) => supabase.from(t).select('*').limit(5000)
  const [m, a, i, e, v, c, y] = await Promise.all([
    q('members'), q('accounts'), q('incomes'), q('expenses'), q('investments'), q('investment_contributions'), q('investment_yields'),
  ])
  const err = [m, a, i, e, v, c, y].find((r) => r.error)?.error
  if (err) throw err
  return {
    users: m.data.map(from.members).sort((x, z) => (x.role === 'husband' ? -1 : 1) - (z.role === 'husband' ? -1 : 1)),
    accounts: a.data.map(from.accounts),
    incomes: i.data.map(from.incomes),
    expenses: e.data.map(from.expenses),
    investments: v.data.map(from.investments),
    contributions: c.data.map(from.contributions),
    yields: y.data.map(from.yields),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'set':
      return action.state
    case 'upsert': {
      const list = state[action.coll]
      const exists = list.some((x) => x.id === action.item.id)
      return { ...state, [action.coll]: exists ? list.map((x) => (x.id === action.item.id ? action.item : x)) : [...list, action.item] }
    }
    case 'upsertMany':
      return { ...state, [action.coll]: [...state[action.coll], ...action.items] }
    case 'remove':
      return { ...state, [action.coll]: state[action.coll].filter((x) => x.id !== action.id) }
    case 'rename':
      return { ...state, users: state.users.map((u) => (u.id === action.id ? { ...u, name: action.name } : u)) }
    default:
      return state
  }
}

const Ctx = createContext(null)

export function StoreProvider({ authUser, children }) {
  const [state, dispatch] = useReducer(reducer, EMPTY)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')
  const [actorState, setActor] = useState(() => { try { return localStorage.getItem(ACTOR_KEY) } catch { return null } })
  const [view, setView] = useState('all')
  const [month, setMonth] = useState(currentMonthKey())

  const me = state.users.find((u) => u.auth_user_id === authUser.id) ?? null
  const householdId = me?.household_id ?? state.users[0]?.household_id ?? null
  const actor = state.users.some((u) => u.id === actorState) ? actorState : me?.id ?? null

  // refs para os callbacks sempre enxergarem o valor mais recente
  const ctxRef = useRef({})
  ctxRef.current = { householdId, actor }

  const reload = useCallback(async () => {
    try {
      const data = await fetchAll()
      dispatch({ type: 'set', state: data })
      setStatus('ready')
      setLoadError('')
    } catch (e) {
      setLoadError(e.message || String(e))
      setStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [])

  // carga inicial
  useEffect(() => { reload() }, [reload])

  // sincronização em tempo real entre os dois celulares + ao voltar para o app
  useEffect(() => {
    let timer
    const soon = () => { clearTimeout(timer); timer = setTimeout(reload, 350) }
    const channel = supabase.channel('familia-sync').on('postgres_changes', { event: '*', schema: 'public' }, soon).subscribe()
    const onVisible = () => { if (document.visibilityState === 'visible') soon() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', soon)
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', soon)
    }
  }, [reload])

  useEffect(() => { try { if (actor) localStorage.setItem(ACTOR_KEY, actor) } catch { /* ignore */ } }, [actor])

  const fail = useCallback((e) => {
    alert('Não foi possível salvar: ' + (e?.message || e) + '\nOs dados serão recarregados.')
    reload()
  }, [reload])

  // ---------- ações (otimistas) ----------
  const upsert = useCallback(async (coll, item) => {
    const full = { ...item, id: item.id ?? uid() }
    dispatch({ type: 'upsert', coll, item: full })
    const { error } = await supabase.from(TABLE[coll]).upsert(to(coll, full, ctxRef.current))
    if (error) fail(error)
  }, [fail])

  const upsertMany = useCallback(async (coll, items) => {
    dispatch({ type: 'upsertMany', coll, items })
    const { error } = await supabase.from(TABLE[coll]).insert(items.map((i) => to(coll, i, ctxRef.current)))
    if (error) fail(error)
  }, [fail])

  const remove = useCallback(async (coll, id) => {
    dispatch({ type: 'remove', coll, id })
    const { error } = await supabase.from(TABLE[coll]).delete().eq('id', id)
    if (error) fail(error)
    else if (coll === 'investments' || coll === 'accounts') reload() // cascatas
  }, [fail, reload])

  const rename = useCallback(async (id, name) => {
    dispatch({ type: 'rename', id, name })
    const { error } = await supabase.from('members').update({ display_name: name }).eq('id', id)
    if (error) fail(error)
  }, [fail])

  const clearAll = useCallback(async () => {
    const hid = ctxRef.current.householdId
    for (const t of ['investment_yields', 'investment_contributions', 'investments', 'expenses', 'incomes', 'accounts']) {
      const { error } = await supabase.from(t).delete().eq('household_id', hid)
      if (error) return fail(error)
    }
    reload()
  }, [fail, reload])

  const claim = useCallback(async (role, name) => {
    const { error } = await supabase.rpc('claim_member', { p_role: role, p_name: name })
    if (error) throw error
    await reload()
  }, [reload])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = useMemo(() => {
    const userName = (id) => state.users.find((u) => u.id === id)?.name ?? '—'
    const accountName = (id) => state.accounts.find((a) => a.id === id)?.name ?? '—'
    return {
      state, raw: state, view: scoped(state, view),
      status, loadError, me, authUser, householdId,
      viewId: view, setView, actor, setActor, month, setMonth,
      upsert, upsertMany, remove, rename, clearAll, claim, signOut, reload, userName, accountName,
    }
  }, [state, view, status, loadError, me, authUser, householdId, actor, month, upsert, upsertMany, remove, rename, clearAll, claim, signOut, reload])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
