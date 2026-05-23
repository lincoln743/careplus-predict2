# CarePlus Predict — Base de Conhecimento Médica com IA (RAG)
## Handover completo para implementação

> **Como usar este documento:** este é o ponto de partida autossuficiente para a próxima sessão (outro chat) construir a feature. Cole-o no início da conversa nova. Ele contém: o contexto do projeto, a arquitetura decidida, as decisões já fechadas (e o porquê), os princípios inegociáveis, o modelo de dados, e um fluxo de trabalho passo a passo de como começar. Nada aqui depende de conversa anterior — está tudo registrado.
>
> **Projeto:** CarePlus Predict · **Feature:** Base de Conhecimento Médica (RAG) · **Autor:** engenheiro/arquiteto de dados · **Data:** 2026-05-23 · **Status:** especificação pronta, pré-implementação

---

## PARTE 1 — CONTEXTO (o que é e por quê)

### 1.1 O projeto
CarePlus Predict é um aplicativo **mobile de saúde**. Stack: **React Native** (app) + **Node.js** (backend). Esta feature é exclusiva do perfil **médico**.

### 1.2 A feature em uma frase
O médico sobe documentos clínicos (diretrizes, protocolos, artigos, bulas, condutas), **valida cada um**, e a partir daí a IA do app responde perguntas clínicas **fundamentada exclusivamente nesses documentos validados, citando a fonte**.

### 1.3 Por que isto é RAG (e não um catálogo)
Isto é um sistema de **RAG (Retrieval-Augmented Generation)**. Em vez de a IA responder "de cabeça" (com risco de inventar — inaceitável em saúde), ela:
1. **Recupera** os trechos mais relevantes da base validada para a pergunta feita.
2. **Gera** a resposta ancorada nesses trechos, citando de qual documento vieram.

O conteúdo é **não-estruturado** (texto livre em documentos), o que exige um pipeline de ingestão completo: extração de texto → fragmentação (chunking) → vetorização (embeddings) → indexação. Diferente de uma base estruturada (tabela), onde bastaria uma query.

---

## PARTE 2 — PRINCÍPIOS INEGOCIÁVEIS (ler antes de qualquer código)

Estes princípios derivam do domínio (saúde) e guiam toda decisão. Uma banca acadêmica vai cobrar cada um.

1. **A IA não inventa.** Responde **somente** com base nos trechos recuperados da base validada. Sem base suficiente → responde *"não encontrei isso nos documentos validados"*. Nunca preenche a lacuna com conhecimento próprio.

2. **Toda resposta é rastreável (citação obrigatória).** Cada afirmação aponta de qual documento validado veio (título, idealmente trecho/página). O médico audita a origem.

3. **Só conteúdo validado alimenta a IA.** Documento subido ≠ documento ativo. Há uma máquina de estados de validação; **apenas o estado `aprovado` entra no índice consultável**. Esta é a fronteira de segurança da feature.

4. **O médico é a autoridade, a IA é apoio.** Ferramenta de **apoio à decisão**, não de diagnóstico autônomo. Explícito na UI (disclaimer) e na arquitetura (médico valida a base e revisa respostas).

5. **Dado de saúde é dado sensível (LGPD).** Acesso restrito (só médico), criptografia, trilha de auditoria e política de retenção/exclusão são parte da arquitetura, não adendo.

---

## PARTE 3 — DECISÕES JÁ FECHADAS (com justificativa)

Estas decisões já foram tomadas e justificadas. O próximo chat parte delas (pode revisar se o contexto mudar, mas o racional está aqui).

### 3.1 Busca: vetorial via `pgvector` (PostgreSQL)
**Decidido: embeddings + busca semântica com `pgvector`** (extensão do Postgres), índice HNSW.

Por quê vetorial e não palavra-chave: o médico pergunta em linguagem natural ("conduta para crise hipertensiva em gestante") e o documento pode usar outros termos ("emergência hipertensiva na gravidez"). Busca por palavra-chave erra; busca semântica captura o significado.

Por quê `pgvector` e não vetorial dedicado (Pinecone/Weaviate/Qdrant):
- **Um banco só** — vetores e metadados (status de validação, autor, auditoria) juntos no Postgres, com integridade referencial e transações.
- **Escala suficiente** para uma base por médico/clínica; Postgres cresce quando precisar.
- **Menos infra e custo** — sem mais um serviço/conta/SLA.

Reconsiderar vetorial dedicado só se a base chegar a dezenas de milhões de chunks ou exigir busca distribuída multi-tenant pesada. (Evolução futura, não necessidade inicial.)

### 3.2 Stack de IA: OpenAI atrás de interface trocável
**Decidido: OpenAI para embeddings e geração, isolado atrás de uma interface.**
- **Embeddings:** `text-embedding-3-small` (1536 dim; barato, boa qualidade). `large` se a precisão exigir.
- **Geração:** `gpt-4o-mini` na maioria; `gpt-4o` se a complexidade clínica justificar.

Por quê: menor atrito, alta qualidade, sem hospedar modelo (backend enxuto). **Mas isolar atrás de `EmbeddingProvider` / `LLMProvider`** para permitir trocar por modelo open-source/self-hosted depois — em saúde, manter o dado "em casa" é diferencial. Deixar a porta aberta.

### 3.3 Escopo: produto real (arquitetura robusta/escalável)
**Decidido: priorizar arquitetura robusta e escalável** (o projeto pode virar produto), entregue em fases — demo funcional primeiro, caminho para produto documentado.

---

## PARTE 4 — ARQUITETURA

### 4.1 Componentes
```
App Mobile (React Native) — perfil MÉDICO
  • Upload de documento   • Tela de validação (aprovar/rejeitar/revogar)
  • Chat com a IA (respostas com citação)
        │ HTTPS (JWT, RBAC: só médico)
        ▼
Backend Node.js (API)
  • Ingestão (pipeline)   • Validação (state machine)   • Consulta (RAG)
        │
        ▼
PostgreSQL + pgvector
  documentos · chunks(embedding) · consultas · auditoria
  + Storage de objetos (S3/equivalente) para os arquivos originais
        │
        ▼
OpenAI API (embeddings + geração) — atrás de interface trocável
```

### 4.2 Pipeline de ingestão (upload → base consultável)
Nada entra na base consultável antes da validação (Parte 5).

1. **Upload + storage do original.** Arquivo (PDF/DOCX/TXT) vai para storage de objetos. Registro em `documentos` com status `pendente`. Original preservado (auditoria + reprocessamento).
2. **Extração de texto.** Para PDF, biblioteca robusta. **PDFs escaneados exigem OCR** — tratar cedo, muito material clínico é imagem. Registrar se OCR foi usado.
3. **Chunking.** Quebrar em pedaços de ~500–800 tokens com **sobreposição** (~10–15%), preferindo fronteiras naturais (parágrafos/seções). Determinante para a qualidade da recuperação — iterar.
4. **Embeddings.** Cada chunk vira vetor (`text-embedding-3-small`). Guardar vetor + texto do chunk + referência ao documento + posição (página/offset para citação).
5. **Indexação.** Chunks na tabela `chunks` com índice HNSW, **marcados inativos** até a validação.

### 4.3 Fluxo de consulta (RAG)
1. **Embedding da pergunta** (mesmo modelo dos chunks).
2. **Recuperação:** top `k` chunks por similaridade (ex. 5–8), **filtrando só documentos aprovados/ativos**. Opcional: limiar de similaridade mínima → se nada passa, "base não cobre".
3. **Montagem do contexto + system prompt rigoroso:** "responda só com base nos trechos; se não houver, diga que não há na base validada, não use conhecimento externo; cite a fonte; isto é apoio à decisão, o médico é responsável".
4. **Geração** (`gpt-4o-mini`) ancorada nos trechos.
5. **Resposta com citação** — UI mostra resposta + fontes (documentos de onde veio), permitindo abrir o original.

**Anti-alucinação na prática** (a banca vai cobrar): RAG estrito + citação obrigatória + limiar de similaridade para acionar "não sei" + exibição das fontes + (opcional) verificação de *groundedness* (a resposta está suportada pelos trechos?). Melhor a IA dizer "não encontrei" do que arriscar.

---

## PARTE 5 — MÁQUINA DE VALIDAÇÃO (coração da confiança)

```
   upload
     │
     ▼
 ┌─────────┐   médico aprova    ┌──────────┐
 │ pendente │ ─────────────────▶ │ aprovado │ ──▶ alimenta a IA (chunks ativos)
 └─────────┘                    └──────────┘
     │                                │ médico revoga
     │ médico rejeita                 ▼
     ▼                          ┌──────────┐
 ┌──────────┐                   │ revogado │ ──▶ sai da base na hora (chunks inativos)
 │ rejeitado │                  └──────────┘
 └──────────┘
```

- **`pendente`** — ingerido, chunks **inativos**, não alimenta a IA. Aparece na fila de revisão do médico.
- **`aprovado`** — médico validou; chunks **ativos** e recuperáveis. Registrar quem aprovou e quando.
- **`rejeitado`** — médico recusou; chunks descartados/inativos; sai da fila.
- **`revogado`** — documento antes aprovado, tirado de circulação (ex. diretriz desatualizada); chunks **desativados na hora** — a IA para de usar imediatamente.

**Regra de ouro da recuperação:** a busca filtra `WHERE documento.status = 'aprovado' AND chunk.ativo = true`. Nenhum trecho não-aprovado é jamais recuperado.

---

## PARTE 6 — MODELO DE DADOS (esboço)

```
documentos
  id, titulo, arquivo_url, tipo (pdf/docx/...),
  status (pendente|aprovado|rejeitado|revogado),
  medico_id (autor/dono), validado_por_id, validado_em,
  ocr_usado (bool), criado_em, atualizado_em, versao

chunks
  id, documento_id (FK),
  conteudo (texto do trecho),
  embedding (vector(1536)),    -- pgvector, índice HNSW
  posicao (pagina/offset p/ citação),
  ativo (bool),                -- só true se documento aprovado
  criado_em

consultas            -- log de perguntas (auditoria + melhoria)
  id, medico_id, pergunta, resposta,
  chunks_usados (refs), modelo_usado, criado_em

auditoria            -- trilha LGPD: quem fez o quê
  id, ator_id, acao, entidade, entidade_id, detalhe, criado_em
```

> **Multi-tenant:** tudo escopado por médico/clínica. Cada médico vê e consulta **apenas a própria base**. A cláusula de tenant entra em toda query.

---

## PARTE 7 — SEGURANÇA, LGPD E ÉTICA (obrigatório para defesa)

- **RBAC:** feature exclusiva do perfil médico; JWT + autorização por papel em cada rota.
- **Isolamento por tenant:** base de um médico nunca vaza para outro; filtro `medico_id`/`clinica_id` em toda consulta e recuperação.
- **Dado sensível (LGPD):** criptografia em repouso e em trânsito, trilha de auditoria, política de retenção/exclusão (médico pode apagar documento + chunks definitivamente).
- **Soberania do dado:** enviar trechos a API externa (OpenAI) significa que o trecho sai do ambiente. Avaliar anonimização e manter a porta para self-hosted (3.2).
- **Disclaimer clínico:** UI explícita — apoio à decisão, não diagnóstico; médico valida e é responsável.
- **Auditabilidade:** toda aprovação, revogação, consulta e exclusão registrada.

---

## PARTE 8 — ROADMAP (demo funcional → produto)

**Fase 1 — Núcleo funcional (demonstrável):**
1. Upload + extração + chunking + embeddings + pgvector.
2. Máquina de validação (pendente → aprovado), com fila de revisão.
3. Chat RAG: retrieve (só aprovados) + generate com citação + "não encontrei na base".
4. RBAC (só médico) + isolamento por tenant.

**Fase 2 — Robustez clínica:**
5. OCR para PDFs escaneados.
6. Limiar de similaridade + verificação de groundedness.
7. Revogação de documentos (some da IA na hora).
8. Auditoria completa + retenção/exclusão (LGPD).

**Fase 3 — Produto/escala:**
9. Interface trocável de provedor (caminho self-hosted).
10. Versionamento de documentos + reprocessamento de chunking.
11. Métricas de qualidade da recuperação (médico marca útil/errado → melhora o sistema).
12. Avaliar vetorial dedicado se a escala exigir.

---

## PARTE 9 — RISCOS E PONTOS DE ATENÇÃO

- **Alucinação em saúde** — maior risco. Mitigação: RAG estrito + citação + "não sei" + groundedness.
- **Qualidade do chunking** — chunk ruim = recuperação ruim. Iterar e medir.
- **PDFs escaneados** — boa parte do material é imagem; sem OCR a extração falha silenciosamente. Tratar cedo.
- **Custo de embeddings** — re-embedar tudo ao trocar de modelo custa; versionar e reprocessar com critério.
- **Dado sensível saindo para API externa** — decisão consciente; documentar e manter porta self-hosted.
- **Responsabilidade legal** — enquadramento "apoio à decisão + médico valida + médico responsável" é central.

---

## PARTE 10 — FLUXO PARA O PRÓXIMO CHAT (como começar)

### 10.1 Como anexar este handover na conversa nova
1. Abra um chat novo.
2. Cole este documento inteiro (ou anexe o `.md`) logo na primeira mensagem.
3. Diga o objetivo da sessão (ex.: *"vamos implementar a Fase 1, começando pelo modelo de dados + pgvector"*).
4. O assistente lê o documento, confirma o entendimento, e parte das decisões já fechadas (Parte 3) — sem refazer o desenho.

### 10.2 Ordem de implementação sugerida (Fase 1)
Construir e validar cada etapa **isoladamente antes de integrar** (princípio de engenharia: não empilhar peças não testadas).

1. **Modelo de dados + pgvector.** Criar as tabelas (Parte 6), habilitar a extensão `vector`, criar o índice HNSW. Validar com inserts/queries manuais.
2. **Pipeline de ingestão.** Upload → extração → chunking → embeddings → inserção (chunks inativos). Testar com **um** documento: conferir que os chunks e vetores chegam ao banco corretamente, antes de plugar qualquer IA.
3. **Recuperação isolada.** Dado uma pergunta, gerar embedding e recuperar os top-k chunks (filtrando aprovados). Testar a *qualidade* da recuperação com perguntas reais **antes** de gerar respostas.
4. **Máquina de validação.** Estados + transições (Parte 5) + a fila de revisão do médico. Validar que só `aprovado` ativa os chunks.
5. **Geração (RAG completo).** Montar o prompt com os trechos + system prompt rigoroso + citação. Testar o "não encontrei na base" (pergunta fora do que a base cobre).
6. **RBAC + tenant.** Garantir que só médico acessa e que a base é isolada por médico.

### 10.3 Decisões que a próxima sessão deve fechar (ficaram em aberto)
- Tamanho exato de chunk e overlap (depende do tipo de documento — testar).
- `k` da recuperação (quantos trechos recuperar).
- Limiar de similaridade para acionar o "não sei".
- Se a Fase 1 já inclui OCR ou deixa para a Fase 2.
- Biblioteca de extração de PDF e de chunking (avaliar no ecossistema Node).

### 10.4 Princípio de trabalho (carregar para a próxima sessão)
- **Investigar o que já existe antes de criar** — checar o que o backend/app já tem.
- **Testar cada etapa isolada antes de integrar** — especialmente a recuperação (qualidade) antes da geração.
- **Validar com dado real** — um documento clínico de verdade revela problemas que dado sintético não mostra (ex.: PDF escaneado).
- **Em saúde, segurança > conveniência** — quando em dúvida entre "a IA arrisca uma resposta" e "a IA diz que não sabe", escolher o "não sabe".

---

*Fim do handover. Este documento é a fonte da verdade da arquitetura da feature. Diagramas visuais (pipeline RAG e máquina de validação) foram gerados à parte e podem acompanhar a apresentação/TCC.*
