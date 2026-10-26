import { useStore } from '../lib/store'
import { cx } from '../lib/utils'
import { Users } from 'lucide-react'

const COLORS = { 'u-husband': 'bg-brand text-white', 'u-wife': 'bg-rose-500 text-white' }

export function Avatar({ id, name, size = 28 }) {
  return (
    <span
      className={cx('inline-flex items-center justify-center rounded-full text-[12px] font-extrabold', COLORS[id] ?? 'bg-ink text-white')}
      style={{ width: size, height: size }}
    >
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  )
}

/**
 * Visão do painel: Casal | Marido | Esposa
 * Também define quem está realizando as ações (pré-seleciona "Quem pagou").
 */
export default function UserSwitcher() {
  const { state, viewId, setView, actor, setActor } = useStore()
  const select = (id) => {
    setView(id)
    if (id !== 'all') setActor(id)
  }
  const options = [{ id: 'all', name: 'Casal' }, ...state.users]
  return (
    <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-black/5" role="tablist" aria-label="Visão">
      {options.map((o) => {
        const active = viewId === o.id
        return (
          <button
            key={o.id} role="tab" aria-selected={active} onClick={() => select(o.id)}
            className={cx('flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[13px] font-bold transition',
              active ? 'bg-ink text-white' : 'text-ink-soft')}
          >
            {o.id === 'all'
              ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand"><Users size={14} /></span>
              : <Avatar id={o.id} name={o.name} />}
            <span className="max-w-[72px] truncate">{o.name}</span>
          </button>
        )
      })}
    </div>
  )
}
