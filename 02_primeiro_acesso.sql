-- =====================================================================
--  02 — PRIMEIRO ACESSO + AJUSTES DE SEGURANÇA
--  Rode DEPOIS do schema.sql (SQL Editor -> colar tudo -> Run).
-- =====================================================================

-- 1) A view de saldos precisa respeitar as regras de segurança (RLS)
alter view account_balances set (security_invoker = on);

-- 2) Função chamada pelo app no primeiro login de cada pessoa.
--    Cria o "household" (casal) na 1ª vez e vincula a pessoa como Marido ou Esposa.
create or replace function claim_member(p_role member_role, p_name text)
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_hh     uuid;
  v_member members;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  -- já é membro? devolve o cadastro existente
  select * into v_member from members where auth_user_id = v_uid;
  if found then
    return v_member;
  end if;

  -- usa o único household do projeto (cria na primeira vez)
  select id into v_hh from households order by created_at limit 1;
  if v_hh is null then
    insert into households default values returning id into v_hh;
  end if;

  if exists (select 1 from members where household_id = v_hh and role = p_role) then
    raise exception 'Este perfil já foi escolhido pela outra pessoa';
  end if;

  insert into members (household_id, auth_user_id, role, display_name)
  values (
    v_hh, v_uid, p_role,
    coalesce(nullif(trim(p_name), ''), case when p_role = 'husband' then 'Marido' else 'Esposa' end)
  )
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function claim_member(member_role, text) from public, anon;
grant execute on function claim_member(member_role, text) to authenticated;

-- 3) Os dois são administradores: qualquer um pode renomear o casal,
--    mas SÓ o nome de exibição pode ser alterado (não o perfil nem o login).
drop policy if exists "members: editar o próprio nome" on members;
create policy "members: editar nomes do household" on members
  for update using (household_id = my_household())
  with check (household_id = my_household());

revoke update on members from authenticated;
grant update (display_name) on members to authenticated;
