# CarePlus Predict V2 — Plano Técnico e Arquitetura Alvo (v2)

> Documento de fundação. Define **o que vamos construir e por quê**, antes de escrever código.
> Pasta nova do projeto: `/home/lincoln-pereira/VS Code/careplus-predict_2`
> Pasta de referência (legado): `/home/lincoln-pereira/VS Code/careplus-predict`
> Data: maio/2026 · **Versão 2** — integra as duas features de IA, migra para Supabase e fixa as salvaguardas clínicas.

---

## 0. Repositórios e referências do projeto

| Papel | Repositório | Pasta local |
|---|---|---|
| **Careplus V2** (novo, em construção) | `github.com/lincoln743/careplus-predict2` | `/home/lincoln-pereira/VS Code/careplus-predict_2` |
| **Careplus** (legado / referência) | `github.com/lincoln743/careplus-predict` | `/home/lincoln-pereira/VS Code/careplus-predict` |
| **BluaDiagnostics** (IA conversacional — Feature A) | `github.com/lincoln743/bluadiagnostics` | — (consumido por HTTP, não portado) |
| **icrx-crm** ("busca da Cris") | `github.com/lincoln743/icrx-crm` | — (**papel no V2 ainda indefinido** — confirmar) |

GitHub: `lincoln743` · email: `lincoln743@gmail.com` · SO: Ubuntu Linux

> Atenção: o nome do repo novo é `careplus-predict2` (sem underscore), enquanto a pasta local é `careplus-predict_2` (com underscore). Divergência inofensiva, mas registrar para não confundir nos comandos de `git remote`.
>
> O **icrx-crm** não apareceu nos handovers nem nas decisões até aqui. Registrado como referência; se tiver relação com o V2 (ex.: alguma busca/base a reusar), definir o papel antes de integrá-lo ao plano.

---

## Changelog v1 → v2 (leia primeiro)

O que mudou desde a primeira versão do plano, e por quê:

1. **Banco: Postgres+Prisma → Supabase.** Os dois handovers apontam Supabase, ele já está no seu stack. Ganhamos Postgres gerenciado, `pgvector` nativo (essencial para o RAG) e storage de objetos (para os documentos originais) num lugar só. Sai o docker-compose de Postgres local da fundação.
2. **Camada de IA dividida em dois consumidores distintos.** Antes era um `services/ml` genérico "a construir". Agora são duas coisas de natureza diferente: (a) a **IA conversacional BluaDiagnostics**, que já existe e é consumida por HTTP via contrato; e (b) o **RAG da base de conhecimento do médico**, que construímos dentro do projeto com pgvector.
3. **Decisão: a IA externa é reusada por HTTP, não portada.** O código da IA permanece no repo dele; o Careplus chama via contrato `/api/v1/`. Justificativa na seção 11.
4. **Escopo clínico ampliou: prescrição (HITL) e detecção de emergência entram na Fase 1.** Com salvaguardas tratadas como inegociáveis (seção 14).
5. **Modelo de dados cresceu:** tabelas de documentos/chunks/consultas/auditoria (RAG), mapa usuário↔BNF pseudonimizado e fila de prescrição (IA).

As seções de leitura do app, princípios gerais, simulação, tema claro/escuro, mobile, wearable e anamnese seguem como na v1, ajustadas onde a IA toca nelas.

---

## 1. Leitura do produto atual (a partir das telas)

Resumo (inalterado da v1): app com perfis Paciente e Médico. Paciente tem Home (gauge de score, FC, passos, sono), Meus Dados, Métricas, Config e Sobre. Médico tem Dashboard, Pacientes (com "Paciente Demo" hardcoded — origem do botão de simulação), Config e Sobre. Sinais técnicos: "Fonte: backend" em toda tela (resíduo de fallback), "Apple HealthKit" nas integrações divergindo do objetivo Samsung.

**Onde as features novas encaixam nas telas existentes:**
- **Chat da IA (paciente):** nova aba/tela no fluxo do paciente, ao lado de Home/Métricas.
- **Chat da IA + fila de prescrição (médico):** nova área no Dashboard Médico; a fila de "Sugestões pendentes de aprovação" conversa com a lista de "Pacientes que Requerem Atenção" que já existe.
- **Base de conhecimento (médico):** nova área exclusiva do médico — upload, fila de validação e chat RAG com citação.

**Decisão de UI mantida:** não alterar UX/UI sem autorização. As features novas são adições; o visual existente é preservado.

---

## 2. Princípios de arquitetura

Os da v1 continuam: sem dependência de máquina local, sem fallback silencioso, simulação explícita e isolada, segurança/LGPD desde o início, wearable atrás de interface, observabilidade incorporada, tipagem ponta a ponta.

**Acrescentados na v2 (por causa da IA):**
8. **A IA é apoio à decisão, nunca diagnóstico autônomo.** Vale para os dois lados (paciente e médico) e para as duas features.
9. **Pseudonimização inegociável.** Nenhum dado pessoal direto (CPF, nome, carteirinha) chega à IA. O backend traduz usuário real → `BNF-XXXXX` antes de qualquer chamada.
10. **HITL (humano no circuito) é garantia, não opção.** Nenhuma prescrição sai sem médico aprovar. Não existe caminho de "aceite automático".
11. **Emergência sempre ganha.** `red_flags` preenchido trava a UI normal e mostra orientação de emergência (SAMU 192 / CVV 188).
12. **A IA não inventa (RAG estrito).** A base de conhecimento responde só com trecho validado e citado, ou diz "não encontrei na base validada".

---

## 3. Topologia do monorepo alvo (v2)

```text
careplus-predict_2/
  apps/
    mobile/            # React Native (Expo bare) — paciente + médico
    web/               # Next.js — dashboard administrativo/médico
  services/
    backend/           # Fastify + TypeScript — BFF + domínio + RAG
  packages/
    shared-types/      # contratos TS (DTOs, enums de risco, contrato da IA)
    config/            # eslint, tsconfig base, prettier
  infra/
    supabase/          # migrations SQL, setup pgvector, policies RLS
  docs/
    PLANO_TECNICO.md   # este documento
    CONTRATO_IA.md     # cópia do contrato da BluaDiagnostics (fonte da verdade)
    SEGURANCA_LGPD.md
  .env.example
  README.md
```

**Mudanças vs. v1:** sai `services/ml` (a IA conversacional é externa). O RAG vive **dentro de `services/backend`** como um módulo, porque ele precisa de acesso transacional ao Postgres/pgvector e às tabelas de validação — não faz sentido separá-lo num serviço Python. `infra/docker` vira `infra/supabase` (migrations + RLS).

---

## 4. Banco de dados — Supabase

**Stack:** Supabase (PostgreSQL gerenciado), extensão `pgvector` com índice HNSW, Supabase Storage para arquivos originais, Row Level Security (RLS) para isolamento por tenant.

**Decisões:**
- **pgvector** para a busca semântica do RAG (justificado no handover: o médico pergunta em linguagem natural e o documento usa outros termos; busca por palavra-chave erra).
- **Um banco só** para vetores + metadados + auditoria, com integridade referencial e transações. Sem serviço vetorial dedicado (Pinecone/Qdrant) agora — reconsiderar só em escala de dezenas de milhões de chunks.
- **RLS** para garantir, no nível do banco, que um médico nunca lê a base de outro. Defesa em profundidade além do RBAC da aplicação.
- **Storage de objetos** para os PDFs/DOCX originais (auditoria + reprocessamento de chunking).

**Sobre o Supabase MCP:** está conectado neste ambiente. Posso usá-lo para criar projeto, rodar migrations, habilitar a extensão `vector` e validar as tabelas — quando chegarmos na fase de fundação, te aviso antes de qualquer operação que escreva no seu projeto.

---

## 5. Backend / BFF — Fastify

O backend acumula três papéis: domínio do app (auth, health, simulação), **BFF da IA** (ponte para a BluaDiagnostics) e **motor de RAG** (base de conhecimento do médico).

```text
services/backend/src/
  modules/
    auth/         # login, refresh, RBAC (PATIENT/DOCTOR/ADMIN), argon2
    users/        # perfis, consentimento LGPD
    health/       # séries temporais biométricas, agregações
    wearable/     # ingestão (MockWearableProvider agora)
    anamnesis/    # questionário, baseline, risco inicial
    simulation/   # liga/desliga, pacientes sintéticos
    ai-gateway/   # BFF da IA externa: pseudonimização + filtro por perfil
    prescriptions/# fila HITL: pendente → aprovada/recusada
    knowledge/    # RAG: ingestão, validação, consulta (pgvector)
    audit/        # trilha LGPD
  infra/          # supabase client, redis, otel, config de env
  shared/         # erros, schemas zod, middlewares
  server.ts
```

---

## 6. Feature A — Assistente IA BluaDiagnostics (paciente + médico)

**O que é:** assistente multi-agente que já existe (supervisor → triagem/prescrição/escalada/fora-de-escopo). Serve os dois perfis. Entrega `resposta` + metadados estruturados. **Reusado por HTTP, não portado.**

**O contrato (fonte da verdade — não reinterpretar):**

Request (BFF → IA):
```json
{ "paciente_id": "BNF-XXXXX", "mensagem": "...", "thread_id": "...", "perfil": "paciente|medico" }
```
Response (IA → BFF):
```json
{ "resposta": "...", "intent": "triagem|prescricao|escalada|fora_de_escopo",
  "requer_escalada_humana": false, "red_flags": [], "sugestao_prescricao": null,
  "tools_usadas": [], "docs_consultados": [], "thread_id": "..." }
```

**O papel do `ai-gateway` (BFF):**
1. Traduz usuário real → `BNF-XXXXX` (pseudonimização; o mapa fica no Careplus, nunca na IA).
2. Chama a IA por HTTP com o `perfil` autenticado.
3. **Filtra a resposta por perfil** antes de devolver ao front: paciente não vê o JSON de prescrição cru ("encaminhei ao médico"); médico vê a trilha (`tools_usadas`, `docs_consultados`, `red_flags`) e a fila de prescrição.
4. Persiste a conversa (tabela de mensagens por thread no Supabase — hoje a IA guarda em memória, some ao reiniciar).

**Mapeamento intent → UI (o front não interpreta, só obedece o intent):**
- `triagem` → exibe resposta no chat, opcionalmente com fontes.
- `prescricao` → exibe resposta + cria card na fila de revisão do médico a partir de `sugestao_prescricao`.
- `escalada` → **banner de emergência** (SAMU/CVV), não conversa mais.
- `fora_de_escopo` → exibe a recusa educada.

**Estado do repo da IA (primeira tarefa da fase):** verificar se já tem API HTTP (`fastapi`/`uvicorn`/`@app.post`) ou se é só pipeline Python. Se faltar, construir o wrapper FastAPI fino (a única lacuna que o handover aponta). A lógica de IA fica intocada nos dois casos.

---

## 7. Feature B — Base de conhecimento do médico (RAG)

**O que é:** o médico sobe documentos clínicos, **valida cada um**, e a IA responde perguntas clínicas fundamentada **só** nesses documentos validados, **citando a fonte**. Exclusiva do perfil médico. Construída dentro de `services/backend/modules/knowledge`.

**Pipeline de ingestão (upload → base consultável):**
1. Upload → Supabase Storage (original preservado). Registro em `documentos` com status `pendente`.
2. Extração de texto (PDF/DOCX/TXT). OCR para escaneados — Fase 2, mas a flag `ocr_usado` já existe no schema.
3. Chunking (~500–800 tokens, sobreposição ~10–15%, fronteiras naturais).
4. Embeddings (`text-embedding-3-small`, 1536 dim) atrás de uma interface `EmbeddingProvider`.
5. Indexação em `chunks` com HNSW, **inativos** até validação.

**Fluxo de consulta (RAG):**
1. Embedding da pergunta.
2. Recuperação top-k (5–8) por similaridade, **filtrando só `status='aprovado' AND ativo=true`**.
3. System prompt rigoroso: responda só com os trechos; se não houver, diga "não encontrei na base validada"; cite a fonte; apoio à decisão.
4. Geração (`gpt-4o-mini`, atrás de `LLMProvider`).
5. Resposta com citação — UI mostra resposta + fontes, com link pro original.

**Máquina de validação (coração da confiança):**
```text
pendente ──médico aprova──▶ aprovado ──▶ alimenta a IA (chunks ativos)
   │                            │ médico revoga
   │ médico rejeita             ▼
   ▼                         revogado ──▶ sai da base na hora (chunks inativos)
rejeitado
```
**Regra de ouro:** a busca filtra `WHERE documento.status='aprovado' AND chunk.ativo=true`. Nenhum trecho não-aprovado é jamais recuperado.

**Provedores atrás de interface:** OpenAI agora (`EmbeddingProvider`/`LLMProvider`), com a porta aberta para modelo self-hosted depois — em saúde, manter o dado "em casa" é diferencial.

---

## 8. Modo de simulação de pacientes (botão liga/desliga) — inalterado da v1

Backend é a fonte de verdade do flag (auditado, default desligado, só DOCTOR/ADMIN liga). Pacientes sintéticos marcados `isSimulated`, nunca misturados aos reais. Banner "MODO SIMULAÇÃO ATIVO" no mobile (Config) e na web (header). Substitui o "Paciente Demo" hardcoded.

**Interação com a IA:** em modo simulação, o chat da IA pode usar pacientes sintéticos, sempre rotulados. Nunca gera prescrição "real" a partir de paciente simulado.

---

## 9. Tema claro/escuro (mobile) — inalterado da v1

ThemeProvider com `system`/`light`/`dark`, tokens centralizados, persistência local segura, paleta clara derivada da marca com contraste AA. O toggle "Modo Escuro" da Config passa a funcionar de verdade, com opção "Seguir sistema".

---

## 10. Mobile, Wearable, Anamnese — como na v1 (ajustes pontuais)

- **Mobile:** Expo bare, TS, Zustand, React Query, token em storage seguro, sem URL hardcoded. Acrescenta telas de chat (paciente e médico) e a área de base de conhecimento (médico).
- **Wearable:** `WearableProvider` com `MockWearableProvider` agora, `SamsungHealthProvider` depois. Sem mudança.
- **Anamnese:** questionário versionado → baseline clínico. **Agora também alimenta o contexto do chat do paciente** (a IA recebe contexto via o `paciente_id` pseudonimizado; o baseline melhora a triagem).

---

## 11. Decisão registrada: IA reusada por HTTP (não portada)

**Decisão:** o Careplus chama a IA BluaDiagnostics por HTTP através do `ai-gateway` (BFF). O código da IA permanece no repositório dela.

**Justificativa (longo prazo):**
- O valor da IA está no **contrato estável** (`/api/v1/`), não no código. Versionar a API protege o app de mudanças internas da IA.
- Portar o código casaria os dois projetos: cada evolução da IA viraria merge manual e os repos divergiriam.
- Reuso por HTTP dá **deploy e escala independentes** — a IA escala conforme a carga de inferência sem arrastar o backend.
- É exatamente o desenho dos dois handovers (BFF como guardião de auth/perfil/pseudonimização).

**Quando reconsiderar:** só se o projeto da IA for descontinuado e você assumir a manutenção dele permanentemente dentro do Careplus.

---

## 12. Modelo de dados (v2)

Domínio do app (v1): `users`, `consents`, `biometric_readings`, `aggregations`, `anamnesis`, `simulation_state`, `audit`.

**Acrescentado pela IA conversacional:**
```text
patient_pseudonyms     -- mapa usuário real ↔ BNF-XXXXX (NUNCA vai para a IA)
  id, user_id (FK), bnf_code (único), criado_em

ai_threads             -- conversas
  id, user_id, bnf_code, perfil, criado_em

ai_messages            -- mensagens por thread (persiste o que hoje some)
  id, thread_id (FK), autor (paciente|ia), texto, intent,
  red_flags (jsonb), criado_em

prescriptions          -- fila HITL
  id, paciente_bnf, sugestao (jsonb), status (pendente|aprovada|editada|recusada),
  revisado_por_medico_id, revisado_em, criado_em
```

**Acrescentado pelo RAG (do handover, escopado por tenant):**
```text
documentos
  id, titulo, arquivo_url, tipo, status (pendente|aprovado|rejeitado|revogado),
  medico_id, validado_por_id, validado_em, ocr_usado, versao, criado_em, atualizado_em

chunks
  id, documento_id (FK), conteudo, embedding vector(1536), posicao, ativo, criado_em

consultas
  id, medico_id, pergunta, resposta, chunks_usados (refs), modelo_usado, criado_em

auditoria
  id, ator_id, acao, entidade, entidade_id, detalhe, criado_em
```

Tudo escopado por tenant (médico) via RLS + filtro de aplicação.

---

## 13. IA clínica — visão consolidada

```text
                         ┌──────────────────────────────┐
   App (RN / Next.js)    │  IA BluaDiagnostics (externa) │
        │                │  pipeline multi-agente        │
        ▼                └──────────────▲────────────────┘
   ai-gateway (BFF) ─────HTTP /api/v1───┘
        │  pseudonimiza, filtra por perfil, persiste thread
        │
        ├── prescriptions (fila HITL)
        │
        └── knowledge (RAG) ──▶ pgvector (Supabase) ──▶ OpenAI (atrás de interface)
                                  só chunks aprovados
```

Dois consumidores de IA, naturezas diferentes: o **conversacional** é externo e estável por contrato; o **RAG** é interno porque precisa de transação com o banco de validação.

---

## 14. Segurança, LGPD e salvaguardas clínicas (inegociáveis)

Os da v1 (JWT+refresh, argon2, HTTPS, consentimento, audit logs, secrets só via env, RBAC, sem log sensível) **mais** os pilares clínicos:

- **Pseudonimização:** CPF/nome/carteirinha nunca chegam à IA. O `ai-gateway` traduz para `BNF-XXXXX`; o mapa fica no Careplus. (Conformidade LGPD ao mandar trecho para API externa.)
- **HITL obrigatório:** `requer_revisao_medica` é sempre `true`. **Não existe** botão ou rota que emita receita sem médico aprovar. A fila `prescriptions` é o único caminho.
- **Emergência sempre ganha:** `red_flags` não-vazio → UI trava o fluxo normal e mostra SAMU 192 / CVV 188. Não enfileira, não atrasa, não "conversa mais".
- **Anti-alucinação (RAG):** só responde com trecho validado + citação, ou "não encontrei na base validada". Limiar de similaridade para acionar o "não sei" (Fase 2). Melhor dizer "não sei" do que arriscar.
- **Só conteúdo validado alimenta a IA:** apenas `status='aprovado'` entra no índice. Documento subido ≠ ativo.
- **Soberania do dado:** mandar trecho para a OpenAI = o trecho sai do ambiente. Decisão consciente, documentada, com porta aberta para self-hosted.
- **Disclaimer clínico** explícito na UI das duas features: apoio à decisão, médico é responsável.
- **Isolamento por tenant** via RLS: a base de um médico nunca vaza para outro.

---

## 15. Backlog priorizado (v2)

1. **Esqueleto do monorepo + `.env.example` + setup Supabase (pgvector, RLS).**
2. **Backend: auth + RBAC + users + consentimento LGPD.**
3. **Backend: health (séries temporais) + agregações.**
4. **Backend: simulação (liga/desliga, pacientes sintéticos).**
5. **Mobile: tema claro/escuro real + ThemeProvider.**
6. **Mobile: client de API sem URL hardcoded + auth/refresh + telas de paciente.**
7. **Mobile: WearableProvider (mock).**
8. **Anamnese: backend + onboarding (alimenta o contexto da IA).**
9. **IA conversacional — Fase 1:** verificar repo da IA → (wrapper FastAPI se faltar) → `ai-gateway` (pseudonimização + filtro de perfil + persistência) → chat do paciente → fila de prescrição (HITL) → banner de emergência.
10. **RAG — Fase 1:** modelo de dados + pgvector → ingestão (1 documento, validar chunks) → recuperação isolada (testar qualidade) → máquina de validação → geração com citação + "não encontrei" → RBAC + tenant.
11. **Web: dashboard médico + simulação + gráficos + chat + base de conhecimento.**
12. **Observabilidade + audit completo + hardening + (Fase 2) OCR, groundedness, revogação.**

> Ordem dentro de cada feature de IA segue o handover: **testar cada etapa isolada antes de integrar** — especialmente a recuperação do RAG (qualidade) antes de gerar respostas.

---

## 16. Auditorias na sua máquina (rode no seu terminal)

**Projeto antigo do Careplus** (seção 15 da v1 continua válida): grep de `localhost`, `fallback`, secrets, Apple/Samsung.

**Repo da IA BluaDiagnostics** (decide o item 9 do backlog):
```bash
# no repo da IA
grep -RInE "fastapi|flask|uvicorn|@app\.(post|get)|def chat" . \
  --include="*.py" --exclude-dir=node_modules --exclude-dir=.venv | head -30
cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null
ls -la
```
Se aparecer `fastapi`/`uvicorn`/`@app.post` → já tem servidor; só apontamos o BFF. Se for só a lógica dos agentes → construímos o wrapper FastAPI.

---

## 17. Decisões ainda em aberto (fechar antes/durante a implementação)

Herdadas dos handovers, a decidir com dado real:
- Tamanho de chunk e overlap exatos (depende do tipo de documento clínico — testar).
- `k` da recuperação (quantos trechos).
- Limiar de similaridade para o "não sei".
- OCR na Fase 1 ou Fase 2 (handover sugere Fase 2).
- Biblioteca de extração de PDF e chunking no ecossistema Node.
- Estado real do repo da IA (item 16).

---

## 18. Próximo passo concreto

1. (Opcional, ajuda muito) rode as auditorias da seção 16 e cole a saída — principalmente o estado do repo da IA e os `package.json`/`requirements.txt`.
2. Eu gero o **item 1 do backlog**: esqueleto do monorepo + `.env.example` + migrations Supabase com pgvector e RLS, pronto para descompactar em `careplus-predict_2`.
3. Seguimos o backlog, uma entrega validável por vez.

> Ferramenta: para eu navegar e editar arquivos direto na sua máquina (e usar o Supabase MCP com seu projeto real), o **Claude Code** é o caminho. Aqui no chat eu funciono como arquiteto e gerador de código empacotado.
