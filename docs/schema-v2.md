# Schema do banco — CarePlus Predict V2

**Última atualização:** 12/09/2026
**Projeto Supabase:** `ikuknnfnqljpiikvosqb` (rev3, recriado após apagamento do projeto anterior `jcksmlsxndjnanjalvqz`)

---

## Contexto da reconstrução

O projeto Supabase anterior foi apagado. Ao auditar o repositório, encontramos migrations versionadas
em `infra/supabase/migrations/` cobrindo **11 das 15 tabelas** que existiam em produção.

As 4 tabelas restantes (`rag_documents`, `rag_chunks`, `anamnese`, `health_readings`) e a função
`match_rag_chunks` **nunca foram versionadas** — foram criadas direto no painel do Supabase durante
o desenvolvimento dos módulos `rag/`, `anamnesis/` e `wearable/`. Foram reconstruídas em
`0005_rag_anamnese_wearable.sql` a partir do código do backend que lê e escreve nelas.

`simulation_state` existe em `0003_simulation.sql` e foi mantida — apesar de estar vazia e marcada
como vestigial no handoff, remover exigiria editar uma migration já aplicada. Fica como dívida
para uma migration de limpeza futura.

---

## Ordem de aplicação

```bash
source ~/.careplus-db.env       # exporta DATABASE_URL (arquivo fora do repo, chmod 600)
for f in infra/supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

| Migration | Tabelas que cria |
|---|---|
| `0001_enable_pgvector.sql` | (extensão `vector`) |
| `0002_auth_users_consent.sql` | `users`, `refresh_tokens`, `consents`, `auditoria` |
| `0003_simulation.sql` | `simulation_state`, `sim_patients`, `sim_readings` |
| `0004_ai_gateway.sql` | `patient_pseudonyms`, `ai_threads`, `ai_messages`, `prescriptions` |
| `0005_rag_anamnese_wearable.sql` | `rag_documents`, `rag_chunks`, `anamnese`, `health_readings` + `match_rag_chunks()` |

`0005` depende de `0002` (FKs para `users` e a função de trigger `set_atualizado_em()`).

---

## Postura de RLS — leia antes de "corrigir"

Todas as 15 tabelas têm `ENABLE ROW LEVEL SECURITY`, **sem nenhuma policy**. Isso é intencional,
não um esquecimento:

- O backend acessa o banco com a **secret key** (`sb_secret_…`, equivalente à service_role), que
  **bypassa RLS** por definição. Toda autorização acontece na camada de aplicação, nos guards de
  RBAC em `services/backend/src/modules/auth/guards.ts`.
- RLS ligado sem policies faz a **publishable/anon key ter acesso negado a tudo** — que é
  exatamente o comportamento desejado, já que nem o app mobile nem o dashboard falam com o
  Supabase diretamente. Ambos passam pelo backend.

**Não adicionar policies do tipo `auth.uid() = user_id`.** Este projeto não usa Supabase Auth:
a identidade vive na tabela `users` própria (hash argon2id) e o JWT é emitido pelo backend.
Dentro do Postgres, `auth.uid()` seria sempre `NULL` — uma policy dessas negaria tudo para todo
mundo e daria uma falsa sensação de proteção em auditoria.

---

## Tabelas reconstruídas em `0005` — fonte de cada coluna

### `rag_documents`
Documentos clínicos curados pelo médico. Isolamento por `owner_id`.

| Coluna | Tipo | Fonte / justificativa |
|---|---|---|
| `id` | uuid PK | `rag_service.ts` faz `.select().single()` e usa `doc.id` |
| `owner_id` | uuid → `users` | `.eq("owner_id", ownerId)` em `listarDocumentos`/`removerDocumento` |
| `titulo` | text | insert em `ingerirDocumento`; devolvido em `perguntar` como fonte |
| `nome_arquivo` | text | insert + select de `listarDocumentos` |
| `tipo` | text | `"pdf" \| "texto"` no `IngerirInput` → check constraint |
| `status` | text | `processando` → `pronto` / `erro` no fluxo de ingestão → check constraint |
| `num_chunks` | integer | update após chunkagem |
| `erro` | text | guarda msg de falha **ou** aviso de truncagem em doc > 400 chunks |
| `criado_em` | timestamptz | `.order("criado_em", desc)` em `listarDocumentos` |

### `rag_chunks`
Trechos vetorizados. `owner_id` é desnormalizado de propósito: `match_rag_chunks` filtra por dono
antes da busca vetorial, evitando join no caminho quente.

| Coluna | Tipo | Fonte / justificativa |
|---|---|---|
| `document_id` | uuid → `rag_documents` ON DELETE CASCADE | comentário em `removerDocumento`: "Chunks caem por cascade" |
| `owner_id` | uuid → `users` | insert em `ingerirDocumento` + filtro na função de match |
| `ordem` | integer | `i + j` na montagem dos lotes |
| `conteudo` | text | texto do chunk; devolvido na busca |
| `embedding` | **vector(384)** | `blua_embed_client.ts` **rejeita `dim != 384`** — modelo `paraphrase-multilingual-MiniLM-L12-v2` servido pela Blua em `/api/v1/embed` |

Índice vetorial: **HNSW** com `vector_cosine_ops`, com fallback automático para `ivfflat` se a
versão do pgvector não suportar. HNSW foi escolhido em vez do `ivfflat` sugerido no handoff porque
**ivfflat criado sobre tabela vazia gera índice degenerado** (os centroides são treinados na
criação) — e aqui o banco começa vazio e cresce por ingestão incremental.

### `anamnese`
Uma ficha por paciente.

| Coluna | Tipo | Fonte / justificativa |
|---|---|---|
| `user_id` | uuid **UNIQUE** → `users` | `upsert(..., { onConflict: "user_id" })` exige constraint única, senão o upsert falha em runtime |
| `versao_questionario` | text | `VERSAO_QUESTIONARIO` de `anamnese_schema.ts` |
| `respostas` | jsonb | só campos de `CAMPOS_VALIDOS` (sanitizados no service); merge com o existente a cada save |
| `completa` | boolean | derivado: true se `queixa_principal` preenchida |
| `criado_em` / `atualizado_em` | timestamptz | ambos no select de `obterAnamnese` |

### `health_readings`
Leituras **reais** de wearable. Separada de `sim_readings` de propósito — dado real de paciente
nunca se mistura com dado de simulação; `is_simulated` é discriminador explícito para o dashboard
rotular a origem sem inferência.

| Coluna | Tipo | Fonte / justificativa |
|---|---|---|
| `user_id` | uuid → `users` | `.eq("user_id", userId)` em todos os acessos |
| `data_ref` | date | `YYYY-MM-DD` no `LeituraWearable` |
| `passos` | integer | nullable — `l.passos ?? null` |
| `sono_horas` | numeric(4,1) | valores como `7.5`; service usa `Number(...)` na leitura |
| `fc_media`/`fc_min`/`fc_max` | integer | nullable |
| `origem` | text | `samsung_health \| apple_health \| manual` → check constraint |
| `is_simulated` | boolean default false | gravado explicitamente como `false` por `gravarLeituras` |
| **UNIQUE (`user_id`,`data_ref`,`origem`)** | | `upsert(..., { onConflict: "user_id,data_ref,origem" })` — **sem esta constraint o upsert quebra**, reenviar o mesmo dia duplicaria linhas |

### `match_rag_chunks(query_embedding, p_owner_id, match_count, min_similarity)`

Busca vetorial por similaridade de cosseno, chamada via `supabase.rpc()` em `rag_service.perguntar`.

Os **nomes** dos parâmetros precisam bater exatamente com as chaves do objeto enviado pelo
PostgREST — renomear qualquer um quebra o RAG silenciosamente (erro só em runtime).

`<=>` é distância de cosseno (0 = idêntico), então `similaridade = 1 - distância`.
Defaults `match_count=5`, `min_similarity=0.25` espelham o que o service passa hoje.

---

## Validação executada (12/09/2026)

As 5 migrations foram aplicadas em ordem contra um Postgres 16 + pgvector local
(`pgvector/pgvector:pg16`) antes de tocar no Supabase. Todas exit 0.

Resultado: **15 tabelas, todas com `rowsecurity = true`**.

Testes funcionais dos caminhos que só quebrariam em runtime:

| Teste | Resultado |
|---|---|
| `match_rag_chunks` com vetor idêntico ao chunk | similaridade `1.0000`, chunk ortogonal filtrado pelo threshold |
| Isolamento: mesma query com outro `owner_id` | `0` linhas |
| Upsert duplo em `health_readings` (mesmo user/dia/origem) | 1 linha, valor atualizado |
| Upsert duplo em `anamnese` (mesmo user) | 1 linha, valor atualizado |
| `DELETE` em `rag_documents` | `0` chunks órfãos (cascade OK) |

---

## Pendências conhecidas

- **Aplicação no Supabase rev3 bloqueada**: a senha do banco fornecida é rejeitada
  (`FATAL: password authentication failed for user "postgres"`). O host resolve e responde via
  IPv6, então é senha mesmo, não rede. Requer reset no painel.
- O pooler (`aws-*.pooler.supabase.com`) responde `tenant not found` para este ref em todas as
  regiões testadas — verificar a região real do projeto no painel se for preciso usar pooled.
- `simulation_state` continua sendo criada apesar de vestigial.
