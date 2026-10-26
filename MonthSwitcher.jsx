import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from './store'
import { addMonthsKey, monthLabel } from './utils'

export default function MonthSwitcher() {
  const { month, setMonth } = useStore()
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-1.5 py-1 shadow-card ring-1 ring-black/5">
      <button onClick={() => setMonth(addMonthsKey(month, -1))} aria-label="Mês anterior" className="rounded-xl p-2.5 active:bg-black/5"><ChevronLeft size={20} /></button>
      <span className="text-[15px] font-extrabold">{monthLabel(month)}</span>
      <button onClick={() => setMonth(addMonthsKey(month, 1))} aria-label="Próximo mês" className="rounded-xl p-2.5 active:bg-black/5"><ChevronRight size={20} /></button>
    </div>
  )
}
