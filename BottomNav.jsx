import { Home, CalendarDays, Plus, ListChecks, PiggyBank } from 'lucide-react'
import { cx } from './utils'

const ITEMS = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'add', label: 'Lançar', icon: Plus, fab: true },
  { id: 'extrato', label: 'Extrato', icon: ListChecks },
  { id: 'invest', label: 'CDB', icon: PiggyBank },
]

export default function BottomNav({ tab, onTab, onAdd }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/90 pb-safe backdrop-blur-xl">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pb-1.5 pt-1.5">
        {ITEMS.map(({ id, label, icon: Icon, fab }) =>
          fab ? (
            <button key={id} onClick={onAdd} aria-label="Novo lançamento" className="flex flex-col items-center">
              <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 ring-4 ring-paper active:scale-95">
                <Icon size={26} strokeWidth={2.4} />
              </span>
              <span className="mt-0.5 text-[10.5px] font-bold text-brand">{label}</span>
            </button>
          ) : (
            <button
              key={id} onClick={() => onTab(id)}
              className={cx('flex flex-col items-center gap-0.5 py-1.5', tab === id ? 'text-brand' : 'text-ink-mute')}
            >
              <Icon size={22} strokeWidth={tab === id ? 2.4 : 1.8} />
              <span className="text-[10.5px] font-bold">{label}</span>
            </button>
          ),
        )}
      </div>
    </nav>
  )
}
