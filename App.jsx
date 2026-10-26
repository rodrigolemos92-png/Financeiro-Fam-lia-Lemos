import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { supabase } from './lib/supabase'
import { StoreProvider, useStore } from './lib/store'
import BottomNav from './components/BottomNav'
import UserSwitcher from './components/UserSwitcher'
import TransactionForm from './components/TransactionForm'
import Dashboard from './screens/Dashboard'
import Agenda from './screens/Agenda'
import Statement from './screens/Statement'
import Investments from './screens/Investments'
import Accounts from './screens/Accounts'
import { LoadFailed, Login, Onboarding, Splash } from './screens/Auth'

function Shell() {
  const [tab, setTab] = useState('home')
  const [form, setForm] = useState({ open: false, edit: null })
  const openNew = () => setForm({ open: true, edit: null })
  const openEdit = (edit) => setForm({ open: true, edit })
  const closeForm = () => setForm({ open: false, edit: null })

  return (
    <div className="mx-auto min-h-full max-w-lg">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-paper/90 px-4 pb-3 pt-safe backdrop-blur-xl">
        <div className="pt-3"><UserSwitcher /></div>
        <button onClick={() => setTab('contas')} aria-label="Contas e ajustes" className="mt-3 rounded-full bg-white p-2.5 shadow-card ring-1 ring-black/5"><Settings size={18} /></button>
      </header>

      <main className="px-4 pb-32 pt-1">
        {tab === 'home' && <Dashboard onGo={setTab} />}
        {tab === 'agenda' && <Agenda onEdit={openEdit} />}
        {tab === 'extrato' && <Statement onEdit={openEdit} />}
        {tab === 'invest' && <Investments />}
        {tab === 'contas' && <Accounts onBack={() => setTab('home')} />}
      </main>

      <BottomNav tab={tab} onTab={setTab} onAdd={openNew} />
      {/* key força remontar o formulário para cada abertura */}
      <TransactionForm key={form.edit?.item?.id ?? (form.open ? 'new' : 'closed')} open={form.open} onClose={closeForm} edit={form.edit} />
    </div>
  )
}

/** Decide o que mostrar depois do login: carregando, erro, primeiro acesso ou o app */
function Gate() {
  const { status, loadError, me, reload, signOut } = useStore()
  if (status === 'loading') return <Splash text="Carregando seus dados…" />
  if (status === 'error') return <LoadFailed message={loadError} onRetry={reload} onSignOut={signOut} />
  if (!me) return <Onboarding />
  return <Shell />
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = verificando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Splash />
  if (!session) return <Login />
  // key: ao trocar de usuário, todo o estado é recriado do zero
  return (
    <StoreProvider key={session.user.id} authUser={session.user}>
      <Gate />
    </StoreProvider>
  )
}
