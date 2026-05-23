-- ============================================================================
-- Migration 0003 — simulacao de pacientes (demo)
-- ============================================================================
-- Estado de simulacao POR MEDICO + pacientes sinteticos marcados.
-- Principio: pacientes simulados NUNCA se misturam aos reais. Toda query de
-- producao filtra is_simulated = false por padrao. O estado e auditado.
-- ============================================================================

-- ---- Estado de simulacao por medico ----
create table if not exists simulation_state (
  medico_id       uuid primary key references users(id) on delete cascade,
  ativo           boolean not null default false,
  ligado_em       timestamptz,
  atualizado_em   timestamptz not null default now()
);

-- ---- Pacientes sinteticos (fixos, marcados) ----
-- Existem no banco para aparecer nas queries do medico quando a simulacao
-- esta ligada, mas sempre com is_simulated = true.
create table if not exists sim_patients (
  id              uuid primary key default gen_random_uuid(),
  chave           text not null unique,   -- 'joao', 'maria', 'carlos'
  nome            text not null,
  idade           int not null,
  perfil_risco    text not null,          -- 'saudavel' | 'risco_medio' | 'risco_alto'
  is_simulated    boolean not null default true,
  criado_em       timestamptz not null default now()
);

-- ---- Leituras biometricas sinteticas (serie temporal) ----
-- Geradas deterministicamente; persistidas para a demo ter historico estavel.
create table if not exists sim_readings (
  id              uuid primary key default gen_random_uuid(),
  sim_patient_id  uuid not null references sim_patients(id) on delete cascade,
  data_ref        date not null,          -- dia da leitura
  passos          int not null,
  sono_horas      numeric(3,1) not null,
  fc_media        int not null,
  fc_min          int not null,
  fc_max          int not null,
  is_simulated    boolean not null default true,
  criado_em       timestamptz not null default now(),
  unique (sim_patient_id, data_ref)
);

create index if not exists idx_sim_readings_patient on sim_readings (sim_patient_id, data_ref);

-- ---- RLS ----
alter table simulation_state enable row level security;
alter table sim_patients enable row level security;
alter table sim_readings enable row level security;
-- Backend (service_role) bypassa; acesso so via aplicacao com RBAC.

-- Verificacao:
--   select chave, nome, perfil_risco from sim_patients;
