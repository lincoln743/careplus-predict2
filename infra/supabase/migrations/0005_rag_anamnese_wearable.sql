-- ============================================================================
-- Migration 0005 — RAG do medico, anamnese e wearable real
-- ============================================================================
-- Reconstroi as 4 tabelas que existiam no Supabase antigo mas NUNCA foram
-- versionadas como migration (foram criadas direto no painel durante o
-- desenvolvimento dos modulos rag/, anamnesis/ e wearable/).
--
-- Fonte de cada coluna: codigo do backend que le/escreve a tabela. Referencias
-- exatas em docs/schema-v2.md.
--
-- Convencao herdada de 0002/0004: RLS habilitado SEM policies. O backend fala
-- com o Supabase pela service_role key (que bypassa RLS); a anon key nao tem
-- nenhuma policy que a autorize, entao fica com acesso negado por padrao.
-- NAO usar policies com auth.uid(): este projeto nao usa Supabase Auth, e sim
-- tabela users propria + JWT emitido pelo backend, logo auth.uid() e sempre NULL.
-- ============================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists vector;      -- embeddings 384d

-- ============================================================================
-- Tabela: rag_documents — documentos clinicos curados pelo medico
-- ============================================================================
-- Isolamento por owner_id (o medico logado). Fonte: rag_service.ts
-- (ingerirDocumento / listarDocumentos / removerDocumento).
create table if not exists rag_documents (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references users(id) on delete cascade,
  titulo        text not null,
  nome_arquivo  text not null,
  tipo          text not null,                        -- 'pdf' | 'texto'
  status        text not null default 'processando',  -- processando|pronto|erro
  num_chunks    integer,
  erro          text,                                 -- msg de falha ou aviso de truncagem
  criado_em     timestamptz not null default now(),
  constraint rag_documents_tipo_chk   check (tipo in ('pdf', 'texto')),
  constraint rag_documents_status_chk check (status in ('processando', 'pronto', 'erro'))
);

create index if not exists idx_rag_documents_owner on rag_documents (owner_id, criado_em desc);

-- ============================================================================
-- Tabela: rag_chunks — trechos vetorizados (pgvector 384d)
-- ============================================================================
-- 384 dims: modelo paraphrase-multilingual-MiniLM-L12-v2 servido pela Blua em
-- /api/v1/embed. blua_embed_client.ts rejeita qualquer dim != 384.
-- owner_id e desnormalizado (vem de rag_documents) porque match_rag_chunks
-- filtra por dono ANTES da busca vetorial — evita join no caminho quente.
create table if not exists rag_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references rag_documents(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  ordem        integer not null,           -- posicao do chunk no documento
  conteudo     text not null,
  embedding    vector(384),
  criado_em    timestamptz not null default now()
);

create index if not exists idx_rag_chunks_document on rag_chunks (document_id, ordem);
create index if not exists idx_rag_chunks_owner    on rag_chunks (owner_id);

-- Indice vetorial. HNSW e preferido: nao precisa de dados pre-existentes para
-- treinar (ivfflat com tabela vazia gera indice degenerado) e aceita insercao
-- incremental. Cai para ivfflat se a versao do pgvector nao tiver HNSW.
do $$
begin
  begin
    create index if not exists idx_rag_chunks_embedding
      on rag_chunks using hnsw (embedding vector_cosine_ops);
  exception when others then
    create index if not exists idx_rag_chunks_embedding
      on rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
  end;
end $$;

-- ============================================================================
-- Funcao: match_rag_chunks — busca vetorial por similaridade de cosseno
-- ============================================================================
-- Chamada via supabase.rpc("match_rag_chunks", {...}) em rag_service.perguntar.
-- Os nomes dos parametros PRECISAM bater com as chaves do objeto enviado pelo
-- PostgREST: query_embedding, p_owner_id, match_count, min_similarity.
--
-- <=> e a distancia de cosseno (0 = identico, 2 = oposto), entao
-- similaridade = 1 - distancia.
create or replace function match_rag_chunks(
  query_embedding vector(384),
  p_owner_id      uuid,
  match_count     integer default 5,
  min_similarity  double precision default 0.25
)
returns table (
  conteudo     text,
  titulo       text,
  nome_arquivo text,
  similaridade double precision
)
language sql
stable
as $$
  select
    c.conteudo,
    d.titulo,
    d.nome_arquivo,
    1 - (c.embedding <=> query_embedding) as similaridade
  from rag_chunks c
  join rag_documents d on d.id = c.document_id
  where c.owner_id = p_owner_id
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================================
-- Tabela: anamnese — ficha clinica, uma por paciente
-- ============================================================================
-- Fonte: anamnese_service.ts. O upsert usa onConflict "user_id", logo user_id
-- precisa de constraint UNIQUE (aqui: primary key natural em user_id nao serve
-- porque o service le a coluna id de volta — mantemos id sintetico + unique).
create table if not exists anamnese (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references users(id) on delete cascade,
  versao_questionario text not null,
  respostas           jsonb not null default '{}'::jsonb,  -- so campos de CAMPOS_VALIDOS
  completa            boolean not null default false,      -- true se queixa_principal preenchida
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

drop trigger if exists trg_anamnese_atualizado on anamnese;
create trigger trg_anamnese_atualizado
  before update on anamnese
  for each row execute function set_atualizado_em();

-- ============================================================================
-- Tabela: health_readings — leituras REAIS de wearable
-- ============================================================================
-- Separada de sim_readings de proposito: dado real de paciente nunca se mistura
-- com dado de simulacao. is_simulated fica como discriminador explicito para o
-- dashboard poder rotular a origem sem inferencia.
-- Fonte: wearable_service.ts (gravarLeituras/listarLeituras) e health_service.ts
-- (listarPacientes/buscarSeriePorChave).
create table if not exists health_readings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  data_ref      date not null,                 -- dia da leitura (YYYY-MM-DD)
  passos        integer,
  sono_horas    numeric(4,1),                  -- ex: 7.5
  fc_media      integer,
  fc_min        integer,
  fc_max        integer,
  origem        text not null default 'samsung_health',
  is_simulated  boolean not null default false,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint health_readings_origem_chk
    check (origem in ('samsung_health', 'apple_health', 'manual')),
  -- Chave do upsert em gravarLeituras: reenviar o mesmo dia atualiza a linha
  -- em vez de duplicar. Sem isto, o onConflict do supabase-js falha.
  constraint health_readings_user_data_origem_uq unique (user_id, data_ref, origem)
);

create index if not exists idx_health_readings_user_data
  on health_readings (user_id, data_ref desc);

drop trigger if exists trg_health_readings_atualizado on health_readings;
create trigger trg_health_readings_atualizado
  before update on health_readings
  for each row execute function set_atualizado_em();

-- ============================================================================
-- RLS — mesma postura de 0002/0004: habilitado, sem policies (nega anon key).
-- ============================================================================
alter table rag_documents   enable row level security;
alter table rag_chunks      enable row level security;
alter table anamnese        enable row level security;
alter table health_readings enable row level security;

-- Verificacao:
--   select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;
--   select proname from pg_proc where proname = 'match_rag_chunks';
