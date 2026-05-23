-- ============================================================================
-- Migration 0002 — usuarios, papeis (RBAC) e consentimento LGPD
-- ============================================================================
-- Cria a base de identidade e autorizacao do CarePlus Predict V2.
-- Principios: RBAC (PATIENT/DOCTOR/ADMIN), consentimento explicito versionado,
-- e trilha de auditoria. RLS habilitado para defesa em profundidade.
-- ============================================================================

-- ---- Extensoes necessarias ----
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---- Enum de papeis ----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('PATIENT', 'DOCTOR', 'ADMIN');
  end if;
end $$;

-- ============================================================================
-- Tabela: users
-- ============================================================================
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  -- hash argon2id da senha; NUNCA a senha em texto puro
  password_hash   text not null,
  role            user_role not null default 'PATIENT',
  nome            text not null,
  -- medico: dados profissionais (null para paciente)
  crm             text,
  especialidade   text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index if not exists idx_users_email on users (email);
create index if not exists idx_users_role on users (role);

-- ============================================================================
-- Tabela: refresh_tokens (rotacao de refresh — um por sessao)
-- ============================================================================
-- Guardamos o HASH do refresh token, nunca o token em si. Rotacao: a cada
-- refresh, o antigo e revogado e um novo emitido. Permite logout e deteccao
-- de reuso (se um token revogado for usado, invalidamos a familia).
create table if not exists refresh_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  token_hash      text not null,
  revogado        boolean not null default false,
  expira_em       timestamptz not null,
  criado_em       timestamptz not null default now()
);

create index if not exists idx_refresh_user on refresh_tokens (user_id);
create index if not exists idx_refresh_hash on refresh_tokens (token_hash);

-- ============================================================================
-- Tabela: consents (consentimento LGPD explicito e versionado)
-- ============================================================================
-- Principio LGPD: consentimento explicito, com timestamp e versao do termo,
-- ANTES de coletar dado de saude. Cada aceite/revogacao gera um registro novo
-- (historico imutavel — nao se faz UPDATE, so INSERT).
create table if not exists consents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  tipo            text not null,        -- ex: 'coleta_dados_saude', 'uso_ia'
  versao_termo    text not null,        -- ex: 'v1.0'
  concedido       boolean not null,     -- true = aceite, false = revogacao
  ip_origem       text,                 -- evidencia (opcional)
  criado_em       timestamptz not null default now()
);

create index if not exists idx_consents_user on consents (user_id);

-- ============================================================================
-- Tabela: auditoria (trilha LGPD — quem fez o que)
-- ============================================================================
create table if not exists auditoria (
  id              uuid primary key default gen_random_uuid(),
  ator_id         uuid references users(id) on delete set null,
  acao            text not null,        -- ex: 'login', 'consent.granted'
  entidade        text,                 -- ex: 'user', 'consent'
  entidade_id     uuid,
  detalhe         jsonb,                -- SEM dado sensivel (sem senha/saude)
  criado_em       timestamptz not null default now()
);

create index if not exists idx_auditoria_ator on auditoria (ator_id);
create index if not exists idx_auditoria_acao on auditoria (acao);

-- ============================================================================
-- Trigger: atualizar atualizado_em em users
-- ============================================================================
create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_atualizado on users;
create trigger trg_users_atualizado
  before update on users
  for each row execute function set_atualizado_em();

-- ============================================================================
-- RLS (Row Level Security) — defesa em profundidade
-- ============================================================================
-- O backend usa a service_role key (que BYPASSA o RLS) para operacoes de
-- sistema. O RLS aqui protege contra acesso acidental via anon key e prepara
-- o terreno para o isolamento por tenant das proximas tabelas (knowledge).
alter table users enable row level security;
alter table consents enable row level security;
alter table refresh_tokens enable row level security;
alter table auditoria enable row level security;

-- Por padrao, nenhuma policy = ninguem acessa via anon key.
-- O backend (service_role) bypassa RLS e e a unica porta de entrada.
-- Policies especificas por tenant serao adicionadas nas tabelas de dominio.

-- Verificacao:
--   select tablename, rowsecurity from pg_tables where schemaname='public';
