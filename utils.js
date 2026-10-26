// ---------- Datas (sempre strings ISO locais "YYYY-MM-DD") ----------
const pad = (n) => String(n).padStart(2, '0')

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => toISO(new Date())
export const monthKey = (iso) => iso.slice(0, 7) // "2026-10"
export const currentMonthKey = () => monthKey(todayISO())

export const addMonthsKey = (key, delta) => {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

// Soma meses mantendo o dia (ajusta para o último dia quando o mês é menor)
export const addMonthsISO = (iso, delta) => {
  const d = fromISO(iso)
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, last))
  return toISO(target)
}

export const addDaysISO = (iso, delta) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + delta)
  return toISO(d)
}

export const startOfWeekISO = (iso) => addDaysISO(iso, -fromISO(iso).getDay()) // domingo

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number)
  return `${MESES[m - 1]} ${y}`
}
export const monthShort = (key) => MESES[Number(key.split('-')[1]) - 1].slice(0, 3)

export const formatDateBR = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
export const formatDayMonth = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const weekdayLabel = (iso) => DIAS[fromISO(iso).getDay()]

// ---------- Dinheiro ----------
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatBRL = (v) => brl.format(Number(v) || 0)
export const formatBRLCompact = (v) => {
  const n = Number(v) || 0
  return Math.abs(n) >= 100000
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : brl.format(n)
}
export const formatPct = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

// "1.234,56" | "1234.56" | "1234,5" -> 1234.56
export const parseMoney = (s) => {
  if (typeof s === 'number') return s
  if (!s) return 0
  let t = String(s).replace(/[^\d,.-]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`)

export const cx = (...a) => a.filter(Boolean).join(' ')
