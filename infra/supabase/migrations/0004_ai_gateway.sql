-- ============================================================================
-- Migration 0004 — ai-gateway (pseudonimizacao, conversas, fila de prescricao)
-- ============================================================================
-- Suporta a IA conversacional (BluaDiagnostics) acoplada via BFF.
-- Principios LGPD/clinicos:
--   - O mapa usuario<->BNF fica AQUI, nunca na IA (pseudonimizacao).
--   - Conversas persistidas (a Blua so guarda em RAM).
--   - Prescricao em fila HITL: pendente -> aprovada/editada/recusada por medico.
-- ============================================================================

-- ---- Mapa usuario real <-> codigo pseudonimizado (BNF-XXXXX) ----
-- O codigo BNF e aleatorio (nao revela ordem nem quantidade de pacientes).
create table if not exists patient_pseudonyms (
  user_id     uuid primary key references users(id) on delete cascade,
  bnf_code    text not null unique,
  criado_em   timestamptz not null default now()
);

-- ---- Conversas (threads) ----
create table if not exists ai_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  bnf_code    text not null,
  perfil      text not null,            -- 'paciente' | 'medico'
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_ai_threads_user on ai_threads (user_id);

-- ---- Mensagens por thread (persiste o que a Blua so tem em RAM) ----
create table if not exists ai_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references ai_threads(id) on delete cascade,
  autor       text not null,            -- 'paciente' | 'ia'
  texto       text not null,
  intent      text,
  red_flags   jsonb,                    -- snapshot (so quando houver emergencia)
  criado_em   timestamptz not null default now()
);
create index if not exists idx_ai_messages_thread on ai_messages (thread_id, criado_em);

-- ---- Fila de prescricao (HITL — Human In The Loop) ----
-- Toda sugestao da IA entra aqui como 'pendente'. So um medico aprova/edita/recusa.
-- NUNCA existe caminho que emita receita sem passar por esta fila.
create table if not exists prescriptions (
  id                  uuid primary key default gen_random_uuid(),
  paciente_user_id    uuid references users(id) on delete set null,
  paciente_bnf        text not null,
  thread_id           uuid references ai_threads(id) on delete set null,
  sugestao            jsonb not null,    -- objeto sugestao_prescricao da IA
  status              text not null default 'pendente',  -- pendente|aprovada|editada|recusada
  revisado_por_medico uuid references users(id) on delete set null,
  revisado_em         timestamptz,
  observacao_medico   text,
  criado_em           timestamptz not null default now()
);
create index if not exists idx_prescriptions_status on prescriptions (status, criado_em);

-- ---- RLS ----
alter table patient_pseudonyms enable row level security;
alter table ai_threads enable row level security;
alter table ai_messages enable row level security;
alter table prescriptions enable row level security;
-- Backend (service_role) bypassa; acesso so via aplicacao com RBAC.

-- Verificacao:
--   select count(*) from prescriptions where status = 'pendente';
