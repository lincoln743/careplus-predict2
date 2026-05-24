# CarePlus Predict V2 — Plano Técnico e Arquitetura Alvo (v3)

> Documento de fundação. Define **o que vamos construir e por quê**, antes de escrever código.
> Pasta nova do projeto: `/home/lincoln-pereira/VS Code/careplus-predict_2`
> Pasta de referência (legado): `/home/lincoln-pereira/VS Code/careplus-predict`
> Data: maio/2026 · **Versão 5** — backend (auth+sim+ai-gateway) E2E + app mobile completo (6 blocos de UI). App roda no celular.

---

## ⚡ Estado da execução (atualizado em 23/05/2026)

Esta seção é o **ponto de retomada**. Se abrir um chat novo, reanexe este documento e continue daqui.

### Concluído e validado

**ai-gateway (item 9 COMPLETO)** — conecta a Blua ao backend, validado E2E com IA real.
- `services/backend/src/modules/ai-gateway/`: pseudonymizer (BNF aleatório), blua_client (HTTP), gw_service (orquestração), gw_routes.
- Pseudonimização usuário↔BNF (mapa só no nosso banco; IA nunca vê nome/UUID).
- Filtro por perfil: paciente não vê prescrição crua nem trilha; médico vê tudo; ambos veem red_flags (banner emergência).
- Persistência de conversa (ai_threads/ai_messages) — resolve o "Blua só guarda em RAM".
- Fila de prescrição HITL (pendente→aprovada/editada/recusada), com auditoria.
- Migration 0004 aplicada no rev2. Instalado via `install_item9_gateway.sh`.
- **Validado:** triagem (paciente, filtrado), emergência (red_flags), prescrição (médico, vira card na fila). Confirmado no banco: 6 pseudônimos, threads/mensagens persistidas, 1 prescrição pendente.
- **Comportamento clínico seguro observado:** sem histórico do paciente, a IA recusou prescrever e encaminhou para teleconsulta (não alucinou dose). Exatamente o esperado.

**Wrapper HTTP da BluaDiagnostics (item 9, parte 1)** — feito e commitado.
- A IA agora fala HTTP via `app/api/` no repo da Blua (branch `sprint2`, commit `fdebbb8`).
- Endpoints: `GET /health` e `POST /api/v1/chat`. Roda em `http://localhost:8001`.
- Traduz `BluaState` → contrato; extrai o bloco `<sugestao>` do texto; força `requer_revisao_medica: true`.
- Testado: triagem, emergência (red flag → escalada), prescrição (com HITL). Todos os caminhos OK.
- **Stack real da Blua (diverge do handover):** Groq + LangGraph + Chroma + sentence-transformers (NÃO OpenAI+pgvector). A IA fica intocada; só embrulhamos.
- Pasta local da Blua: `~/VS Code/CP_01_Prompteia_ BluaDiagnostics` · repo: `github.com/lincoln743/bluadiagnostics` (branch sprint2).

**Esqueleto do monorepo (item 1)** — feito e no GitHub.
- Estrutura `apps/`, `services/`, `packages/`, `infra/` criada via `bootstrap_careplus_v2.sh`.
- `.env.example`, `.gitignore` (protege `.env`), contrato da IA em `packages/shared-types/src/index.ts`.
- Repo: `github.com/lincoln743/careplus-predict2`, branch `main` (renomeada de master).
- Handovers e plano organizados em `docs/`.

**Auth + RBAC + Users + Consentimento LGPD (item 2)** — feito e validado contra banco real.
- `services/backend`: Fastify + supabase-js + argon2id + JWT (access 15m + refresh com rotação).
- Detecção de reuso de refresh token (revoga a família). Guards `autenticar` / `exigirPapel`.
- Validação zod, anti-enumeração no login, auditoria de eventos, `env.ts` falha-alto sem fallback.
- Smoke test passou nos 9 casos. Auditoria gravando (`user.registered`, `login.success`, etc.).
- Instalado via `install_item2_auth.sh`.

### Infraestrutura provisionada

**Supabase projeto `rev2`** (novo, separado do legado):
- Project ref: `jcksmlsxndjnanjalvqz` · URL: `https://jcksmlsxndjnanjalvqz.supabase.co`
- Org: `lincoln743's Org` (`gbflvovepsrvqsqtzgnd`) · plano free · região us-east-1 · custo $0.
- Migrations aplicadas: `0001` (pgvector) e `0002` (users, refresh_tokens, consents, auditoria + RLS).
- **Não confundir** com o projeto legado `krgdwqatialqsocwuzox` nem com `falago` (pausado).

### Decisões tomadas nesta sessão

1. **IA reusada por HTTP, wrapper dentro da Blua** (opção A). Código da IA não é portado.
2. **Supabase via supabase-js + migrations SQL puro** (não Prisma) — coerente com RLS + pgvector.
3. **Mobile começa em Expo managed/Go** (hot reload rápido no celular) e migra para **bare/dev build** só quando o Samsung Health SDK entrar (que exige módulo nativo). Wearable é mock até lá.
4. **Node 20** exige o pacote `ws` para o supabase-js (realtime desligado, não usamos).
5. **Regra de trabalho:** toda alteração de arquivo vem como comando colável (EOF/sed), nunca "ache e troque manualmente".

### Pendências e cuidados

- **🔴 DEPLOY PARA PRODUÇÃO / 4G (decisão arquitetural importante, planejar antes do APK).** Hoje tudo roda local: backend (`localhost:3000`), Blua (`localhost:8001`), e o app aponta para o IP da rede (`192.168.0.200`). Isso só funciona com PC e celular na mesma Wi-Fi. Para o APK rodar no 4G **sem depender da máquina**, é preciso hospedar os serviços na nuvem:
  - **Backend Fastify** → deploy (ex: Render, Railway, Fly.io). Vira uma URL pública `https://...`.
  - **Blua (wrapper FastAPI)** → deploy próprio (Render, etc.). O `BLUA_API_URL` do backend aponta para essa URL pública.
  - **Supabase** → já é nuvem (rev2), nada muda.
  - **App mobile** → o `EXPO_PUBLIC_API_BASE_URL` passa a ser a URL pública do backend (HTTPS), não o IP local. Aí o APK funciona em qualquer rede.
  - **Ordem sugerida:** deixar o app maduro localmente primeiro; quando estável, fazer o deploy dos dois serviços e trocar a URL. O APK gerado com a URL pública roda no 4G sem os 3 terminais.
  - Atenção: HTTPS obrigatório em produção (já é princípio do projeto); a Blua precisa de auth na frente (hoje roda aberta em rede interna — em nuvem, expor `/api/v1/chat` exige proteção, ex: o backend ser o único a chamá-la, com a Blua em rede privada ou com chave).

- **Investigação de latência da prescrição (decidida: otimizar depois).** Medido: triagem ~1,8s, prescrição ~57s. Causa provável: modelo premium da Groq (`llama-3.3-70b-versatile`) + encadeamento raciocínio→tool→RAG→geração. Opções futuras: modelo intermediário, streaming, paralelizar. **No produto:** chat já mostra "analisando... pode levar até 1 min".
- **Melhoria do ai-gateway:** health check da Blua + erro claro ("serviço de IA indisponível") em vez de timeout genérico.
- **`.env.example` deve trazer `BLUA_API_TIMEOUT_MS=120000`** (estava 30000, curto demais para prescrição).
- **Orquestração local exige 3 serviços no ar:** Blua (8001), backend (3000), Supabase (remoto). Mudança em `.env` NÃO é hot-reload — reiniciar o backend.
- Apagar os backups `.env.BACKUP_SPRINT1` e `.env.before_sprint2_merge` na pasta da Blua.
- Divergência de nome: repo `careplus-predict2` vs. pasta `careplus-predict_2`. Inofensivo.

### App Mobile — CONSTRUÍDO E RODANDO NO CELULAR (itens 5 e 6)

Stack: Expo SDK 54, React 19, react-native-svg, @expo/vector-icons, zustand, react-navigation.
Pasta: `apps/mobile`. Roda via `npx expo start` + Expo Go. `.env`: `EXPO_PUBLIC_API_BASE_URL=http://192.168.0.200:3000`.

**Decisões de mobile:**
- Expo SDK 54 (bate com o Expo Go do usuário — iPhone e Xiaomi). Versões resolvidas por `npx expo install` (não fixar à mão). Instalar com `--legacy-peer-deps`.
- Entry: `main: "index.js"` + `index.js` com `registerRootComponent(App)`. Imports relativos SEM `.js` (Metro). Arquivos na raiz de `apps/mobile` usam `./`, em subpastas usam `../`.
- Cor da marca: **#0179CF** (azul CarePlus/Bupa, extraído do logo). NÃO azul-petróleo.
- Validação offline de sintaxe: `esbuild` com os imports marcados como `--external` (rápido, pega typos antes de entregar).

**Blocos de UI entregues (todos via tarball, aplicados com sucesso):**
- Bloco 1: cor da marca, login pré-preenchido (paciente/médico), splash 5s, safe area/notch, fontes iOS.
- Bloco 2: motor de simulação (`store/simulation.ts`) — fonte única, dados interligados, atualiza 5s. Toggle "Modo Simulado" nas Config. Home/MeusDados/Métricas ligadas ao motor.
- Bloco 3: gráficos animados — AreaChart (passos semanais, sono — spline suave) e BarChart (atividade física), grade tracejada. Gauge anima de 0 ao valor.
- Bloco 4: área do médico — Dashboard, Pacientes (filtros + 3 pacientes ao vivo do motor), IA Médico (placeholder "em breve" honesto). Chat IA removido do médico.
- Bloco 5: indicadores tempo real — LiveIndicator (chip smartwatch + hora ao vivo, só no simulado), LiveValue (fade sutil quando número muda).
- Bloco 6 + ajustes: telas completas reconstruídas (Config paciente/médico com Notificações/Integrações/Funcionalidades, Métricas médico com filtros período/Pacientes/Consultas/Alertas/Evolução, Sobre médico e paciente completas). Tema virou toggle "Modo Escuro". Samsung Health + Apple HealthKit. Teclado do chat corrigido (iOS offset).

**Telas mobile (apps/mobile):**
- App.tsx (splash 5s, sem login automático, SafeAreaProvider), index.js, app.config.ts, navigation.tsx
- theme/ (tokens #0179CF, ThemeProvider com toggleDark), api/client.ts, store/auth.ts, store/simulation.ts
- components/ (ScoreGauge, AreaChart, BarChart, LiveIndicator, LiveValue)
- screens/ paciente: Splash, Login, Home, MeusDados, Metricas, Chat, Settings, Sobre
- screens/ médico: MedicoDashboard, MedicoPacientes, MedicoMetricas, MedicoIA, MedicoConfig

**Pendências do mobile (retomar amanhã):**
- AUDITORIA DE BOTÕES (ver seção no fim — requisito do usuário: tudo funcionando).
- Filtros de período (7d/30d/3m/1a) na Métricas do médico são visuais (não recalculam dados).
- Botões de lista na Sobre (Treinamento Médico, Diretrizes, etc.) não navegam — decidir na auditoria.
- Ações Rápidas do Dashboard médico (Relatório/Críticos/Agenda/Exportar) são visuais.
- Cards de paciente: decidir se abrem detalhe.
- Médico tem 6 abas — verificar se a tab bar não fica apertada.
- IA do Médico (upload + RAG) depende do item 10 (RAG) no backend, ainda não feito.

### Próximos itens do backlog (ordem sugerida)
- **Item 4 — simulação** (liga/desliga, pacientes sintéticos): destrava a demo no celular.
- **Item 3 — health** (séries temporais biométricas + agregações): base de dados clínicos.
- **Item 9 (continuação) — ai-gateway**: BFF que chama a Blua, com pseudonimização usuário↔BNF.
- Demais: tema claro/escuro, telas mobile, wearable mock, anamnese, RAG, web, observabilidade.

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

**Estado do repo da IA — RESOLVIDO (ver seção de execução no topo).** A Blua era um app Streamlit sem API HTTP. Construímos o wrapper FastAPI (`app/api/` na branch sprint2), que importa `build_graph`/`invoke_with_message` e traduz a saída. Descoberta importante: a `sugestao_prescricao` do contrato **não vem pronta** — vem como bloco `<sugestao>` embutido no texto; o wrapper extrai e estrutura. A stack real é Groq+LangGraph+Chroma (não OpenAI+pgvector); a IA fica intocada. O HITL (`requer_revisao_medica` sempre true) e a detecção de emergência por regra já estavam no código da Blua — confirmados, não precisamos adicionar.

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

## 15. Backlog priorizado (status atualizado v3)

1. ✅ **CONCLUÍDO** — Esqueleto do monorepo + `.env.example` + setup Supabase (pgvector, RLS).
2. ✅ **CONCLUÍDO** — Backend: auth + RBAC + users + consentimento LGPD. (validado contra `rev2`)
3. ⬜ **Backend: health (séries temporais) + agregações.**
4. ✅ **CONCLUÍDO** — Backend: simulação (liga/desliga, pacientes sintéticos). (validado, migration 0003)
5. ✅ **CONCLUÍDO** — Mobile: tema claro/escuro + ThemeProvider (toggle Modo Escuro).
6. ✅ **CONCLUÍDO** — Mobile: client de API (URL via config), auth, telas paciente E médico completas, simulação, gráficos, tempo real. App roda no celular. Falta: auditoria de botões.
7. ⬜ **Mobile: WearableProvider (mock).**
8. ⬜ **Anamnese: backend + onboarding (alimenta o contexto da IA).**
9. ✅ **CONCLUÍDO** — IA conversacional Fase 1: wrapper FastAPI + ai-gateway (pseudonimização, filtro de perfil, persistência, fila HITL, emergência). Validado E2E com IA real, migrations 0004.
10. ⬜ **RAG — Fase 1:** modelo de dados + pgvector → ingestão (1 documento, validar chunks) → recuperação isolada (testar qualidade) → máquina de validação → geração com citação + "não encontrei" → RBAC + tenant.
11. ⬜ **Web: dashboard médico + simulação + gráficos + chat + base de conhecimento.**
12. ⬜ **Observabilidade + audit completo + hardening + (Fase 2) OCR, groundedness, revogação.**

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

---

## 🔍 AUDITORIA FINAL DE BOTÕES (pendente — antes de fechar o app)
Requisito do Lincoln: **nada de enfeite, tudo funcionando.** Antes de considerar o app pronto, varrer TODOS os botões/toques e classificar:
- ✅ Funciona (faz ação real)
- ⚠️ Placeholder honesto (marcado "em breve" — ex: IA Médico upload, Ações Rápidas do dashboard)
- ❌ Enfeite (parece clicável mas não faz nada → CORRIGIR: ou fazer funcionar, ou remover, ou marcar "em breve")

Telas a auditar: Login (Esqueceu senha?), Home, Meus Dados, Métricas, Chat IA, Config, Sobre, Dashboard médico (Ações Rápidas: Relatório/Críticos/Agenda/Exportar), Pacientes (cards — abrem detalhe?), IA Médico (upload/pesquisa).
