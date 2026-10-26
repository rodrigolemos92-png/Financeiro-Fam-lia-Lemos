import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cx } from '../lib/utils'

export function Card({ className, children, ...p }) {
  return <div className={cx('rounded-2xl bg-white shadow-card ring-1 ring-black/[0.04]', className)} {...p}>{children}</div>
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">{children}</h2>
      {action}
    </div>
  )
}

export function Badge({ className, children }) {
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', className)}>{children}</span>
}

export function Button({ variant = 'primary', className, ...p }) {
  const styles = {
    primary: 'bg-brand text-white active:bg-brand-dark',
    soft: 'bg-brand-soft text-brand-dark active:bg-brand/20',
    ghost: 'bg-transparent text-ink-soft active:bg-black/5',
    danger: 'bg-red-50 text-loss active:bg-red-100',
  }
  return (
    <button
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold transition disabled:opacity-40', styles[variant], className)}
      {...p}
    />
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-mute">{hint}</span>}
    </label>
  )
}

const inputCls = 'w-full rounded-xl border-0 bg-paper px-3.5 py-3 text-ink ring-1 ring-inset ring-black/10 placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-brand'
export const Input = (p) => <input className={inputCls} {...p} />
export const Select = ({ children, ...p }) => <select className={inputCls + ' appearance-none'} {...p}>{children}</select>

export function MoneyInput({ value, onChange, ...p }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute">R$</span>
      <input
        inputMode="decimal" placeholder="0,00" value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        className={inputCls + ' pl-10 num font-semibold'} {...p}
      />
    </div>
  )
}

export function Segmented({ value, onChange, options, className }) {
  return (
    <div className={cx('grid gap-1 rounded-xl bg-black/[0.05] p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value} type="button" disabled={o.disabled} onClick={() => onChange(o.value)}
          className={cx('rounded-lg px-2 py-2 text-[13px] font-semibold transition disabled:opacity-35',
            value === o.value ? 'bg-white text-ink shadow-sm' : 'text-ink-soft')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Bottom sheet modal (padrão mobile) */
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full bg-black/5 p-2"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-safe pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ icon: Icon, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-ink-mute">
      {Icon && <Icon size={28} strokeWidth={1.5} />}
      <p>{children}</p>
    </div>
  )
}

export function Money({ value, className, signed }) {
  const n = Number(value) || 0
  const color = signed ? (n > 0 ? 'text-gain' : n < 0 ? 'text-loss' : '') : ''
  const s = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  return <span className={cx('num', color, className)}>{s}</span>
}
