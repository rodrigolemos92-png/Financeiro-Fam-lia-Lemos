import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../lib/store'
import { Button, Field, Input, Segmented } from '../components/ui'

function Frame({ title, subtitle, children }) {
  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30"><Wallet size={30} /></span>
        <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[14px] text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function Splash({ text = 'Carregando…' }) {
  return (
    <div className="flex min-h-full items-center justify-center">
      <p className="animate-pulse text-sm font-semibold text-ink-mute">{text}</p>
    </div>
  )
}

export function LoadFailed({ message, onRetry, onSignOut }) {
  return (
    <Frame title="Sem conexão com os dados" subtitle="Verifique a internet e tente de novo.">
      <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-[13px] text-loss">{message}</p>
      <div className="grid gap-2">
        <Button onClick={onRetry}>Tentar de novo</Button>
        <Button variant="ghost" onClick={onSignOut}>Sair</Button>
      </div>
      {/relation .* does not exist|schema cache/i.test(message) && (
        <p className="mt-4 text-[12px] text-ink-soft">Parece que as tabelas ainda não foram criadas no Supabase. Rode os arquivos <b>schema.sql</b> e <b>02_primeiro_acesso.sql</b> no SQL Editor.</p>
      )}
    </Frame>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setErr(/invalid login/i.test(error.message) ? 'E-mail ou senha incorretos.' : error.message)
    setBusy(false)
  }

  return (
    <Frame title="Finanças da Família" subtitle="Entre com o e-mail e a senha de vocês.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-mail"><Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
        <Field label="Senha"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-loss">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
      </form>
    </Frame>
  )
}

/** Primeiro acesso de cada pessoa: escolher se é Marido ou Esposa */
export function Onboarding() {
  const { claim, signOut, authUser, raw } = useStore()
  const taken = raw.users.map((u) => u.role)
  const [role, setRole] = useState(taken.includes('husband') ? 'wife' : 'husband')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try { await claim(role, name) } catch (ex) { setErr(ex.message || String(ex)) }
    setBusy(false)
  }

  return (
    <Frame title="Primeiro acesso" subtitle={`Olá! Você entrou como ${authUser.email}.`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Você é o…">
          <Segmented value={role} onChange={setRole} options={[
            { value: 'husband', label: 'Marido', disabled: taken.includes('husband') },
            { value: 'wife', label: 'Esposa', disabled: taken.includes('wife') },
          ]} />
        </Field>
        <Field label="Seu nome (como aparece no app)"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={role === 'husband' ? 'Ex.: Rodrigo' : 'Ex.: Maria'} maxLength={20} autoFocus /></Field>
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-loss">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Salvando…' : 'Continuar'}</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={signOut}>Sair</Button>
      </form>
    </Frame>
  )
}
