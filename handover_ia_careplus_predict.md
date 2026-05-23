# Handover Técnico — IA BluaDiagnostics → Feature do Careplus Predict

> **Para:** equipe de engenharia do Careplus Predict (web/mobile, Node.js + React)
> **De:** engenharia/arquitetura da IA BluaDiagnostics
> **Objetivo:** acoplar a IA de saúde existente como uma feature do app, disponível para **dois perfis** — paciente (usuário final) e médico (revisor).

---

## 1. O que é a IA, em uma frase

Um **assistente de saúde multi-agente** que faz triagem clínica, sugere prescrições (sempre com revisão médica obrigatória), reconhece emergências e recusa pedidos fora de escopo — entregando, a cada mensagem, **uma resposta para o paciente + metadados estruturados** que o app pode usar para roteamento, UI e o painel do médico.

O ponto central para a integração: **a IA é um serviço de back-end que recebe uma mensagem e devolve um objeto JSON**. O time de front-end React não precisa entender LangGraph nem prompts — só consumir a API.

---

## 2. Modelo mental para o time (a parte que importa)

A IA hoje é um pipeline em Python. Para o Careplus Predict, o caminho recomendado é **embrulhar esse pipeline atrás de uma API HTTP** e o app Node.js/React conversa com ela como conversa com qualquer microserviço.

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Careplus Predict (cliente) │        │  Serviço de IA (já existe)   │
│                             │        │                              │
│  React Native / React web   │  HTTP  │  Pipeline multi-agente       │
│  - tela de chat do paciente │ <────> │  (Python: supervisor →       │
│  - painel do médico         │  JSON  │   triagem/prescrição/        │
│                             │        │   escalada/fora-escopo)      │
│  Node.js (BFF / API gateway)│        │                              │
└─────────────────────────────┘        └──────────────────────────────┘
```

Node.js não roda o modelo. Ele **chama** o serviço de IA, aplica regras de negócio (auth, quem pode ver o quê) e repassa para o React. Essa separação é o que torna a feature "acoplável": o app não muda quando a IA evolui internamente.

---

## 3. O contrato (a única coisa que o front precisa decorar)

Toda a comunicação gira em torno de **uma chamada**: "mande uma mensagem de um paciente e receba uma resposta + metadados".

### 3.1 Request (app → IA)

```json
POST /api/v1/chat
{
  "paciente_id": "BNF-04821",
  "mensagem": "Estou com dor de cabeça leve desde ontem",
  "thread_id": "conversa-abc123",
  "perfil": "paciente"
}
```

- `paciente_id`: identificador **pseudonimizado** (formato `BNF-XXXXX`). Nunca CPF/nome. O Node.js traduz o usuário logado real → este ID antes de chamar a IA.
- `mensagem`: o texto que o paciente digitou.
- `thread_id`: identifica a conversa. Reusar o mesmo valor mantém o contexto entre mensagens (a IA tem memória por thread).
- `perfil`: `"paciente"` ou `"medico"` — controla o que a IA expõe (ver seção 6).

### 3.2 Response (IA → app)

```json
{
  "resposta": "Oi, Maria! Sinto muito que esteja com dor de cabeça...",
  "intent": "triagem",
  "agentes_acionados": ["supervisor", "triagem"],
  "requer_escalada_humana": false,
  "red_flags": [],
  "sugestao_prescricao": null,
  "tools_usadas": ["consultar_historico_paciente"],
  "docs_consultados": ["kb02_bulas_resumidas.md"],
  "thread_id": "conversa-abc123"
}
```

Os campos que o front-end realmente usa para renderizar:

| Campo | Para que serve no app |
|---|---|
| `resposta` | Texto a exibir no balão do chat (já vem pronto, em PT-BR) |
| `intent` | Categoria da mensagem: `triagem`, `prescricao`, `escalada`, `fora_de_escopo` |
| `requer_escalada_humana` | Se `true`, o app deve abrir fluxo de teleconsulta / revisão médica |
| `red_flags` | Se não-vazio, é **emergência**: o app mostra banner vermelho fixo (SAMU 192 / CVV 188) |
| `sugestao_prescricao` | Objeto JSON estruturado (só quando `intent="prescricao"`) — alimenta o painel do médico |
| `tools_usadas` / `docs_consultados` | Opcionais — para o painel de transparência / debug |

**Regra de ouro de UI:** se `red_flags` vier preenchido, a emergência tem prioridade sobre tudo. Trave a interface normal e destaque a orientação de emergência.

---

## 4. O objeto de sugestão de prescrição (para o painel do médico)

Quando `intent = "prescricao"`, a IA devolve um bloco estruturado pronto para o médico revisar. Formato:

```json
{
  "tipo": "sugestao_prescricao",
  "medicamento": "Losartana",
  "dose": "50mg",
  "via": "oral",
  "frequencia": "1x/dia",
  "duracao": "uso contínuo",
  "justificativa": "Renovação de anti-hipertensivo em uso estável.",
  "alertas": ["Monitorar pressão arterial"],
  "contraindicacoes_identificadas": [],
  "interacoes_identificadas": [],
  "encaminhamento": { "especialidade": "clinica_medica", "urgencia": "rotina" },
  "requer_revisao_medica": true
}
```

`requer_revisao_medica` é **sempre `true`** — é uma garantia da IA, não uma opção. No fluxo do médico, esse objeto vira um card "Sugestão pendente de aprovação" com botões Aprovar / Editar / Recusar. A IA **nunca** emite receita final; quem assina é o médico.

---

## 5. Os quatro caminhos possíveis (e o que o app faz em cada)

A IA sempre classifica a mensagem em um de quatro intents. O front-end pode mapear cada um para um comportamento de UI:

1. **`triagem`** — paciente relatou sintoma/dúvida. App: exibe `resposta` no chat normalmente. Pode haver `docs_consultados` para mostrar "fontes".
2. **`prescricao`** — pedido de receita/renovação. App: exibe `resposta` + cria card de revisão no painel do médico a partir de `sugestao_prescricao`.
3. **`escalada`** — **emergência detectada**. App: banner de emergência (SAMU/CVV), `resposta` já contém as instruções. Não tente "conversar" mais.
4. **`fora_de_escopo`** — pergunta não-clínica. App: exibe a recusa educada (já vem em `resposta`). Nenhuma ação especial.

Isso elimina a necessidade de o front "interpretar" a resposta: o `intent` já diz o que fazer.

---

## 6. Os dois perfis: paciente e médico

A mesma IA serve os dois, mudando o que é exposto:

**Perfil paciente** (`perfil: "paciente"`)
- Recebe `resposta` em linguagem acolhedora e simples.
- Não vê o JSON de prescrição cru — vê "encaminhei sua solicitação para um médico".
- É quem dispara as mensagens no chat.

**Perfil médico** (`perfil: "medico"`)
- Vê a fila de `sugestao_prescricao` pendentes de revisão.
- Vê `tools_usadas`, `docs_consultados`, `red_flags` — a "trilha de raciocínio" da IA para decidir com contexto.
- Aprova/edita/recusa sugestões.

Na prática, o Node.js (BFF) é quem aplica esse filtro: chama a IA, recebe o objeto completo e **decide quais campos enviar para cada tela** com base no perfil autenticado. A IA entrega tudo; o BFF é o guardião.

---

## 7. Como o Node.js conversa com a IA (exemplo conceitual)

No BFF (camada Node.js), uma rota fina que repassa para o serviço de IA:

```javascript
// rota Express no BFF do Careplus Predict
app.post("/chat", autenticar, async (req, res) => {
  const { mensagem, threadId } = req.body;

  // traduz usuário logado real -> ID pseudonimizado
  const pacienteId = await mapearUsuarioParaBNF(req.user.id);

  // chama o serviço de IA (Python) por HTTP interno
  const r = await fetch(`${IA_BASE_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paciente_id: pacienteId,
      mensagem,
      thread_id: threadId,
      perfil: req.user.perfil, // "paciente" | "medico"
    }),
  });
  const dados = await r.json();

  // filtra por perfil antes de devolver ao front
  res.json(filtrarPorPerfil(dados, req.user.perfil));
});
```

E o React consome como qualquer chat:

```javascript
async function enviarMensagem(texto) {
  const r = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensagem: texto, threadId }),
  });
  const dados = await r.json();

  adicionarBalao({ autor: "ia", texto: dados.resposta });

  if (dados.red_flags?.length) {
    mostrarBannerEmergencia(dados.resposta); // SAMU/CVV
  }
  if (dados.intent === "prescricao") {
    notificarPainelMedico(dados.sugestao_prescricao);
  }
}
```

Esses exemplos são **conceituais** — mostram o formato da conversa, não código de produção pronto. O contrato da seção 3 é o que precisa ser respeitado.

---

## 8. O que precisa ser construído para virar feature (lacuna atual)

Hoje a IA é um pipeline Python invocável por uma função. Para acoplar ao app, falta a **camada de serviço HTTP** em volta dela. Em ordem de prioridade:

1. **Expor a IA como API HTTP.** Um servidor leve em Python (FastAPI é o caminho natural) que recebe o request da seção 3.1, chama o pipeline existente e devolve o response da seção 3.2. É um wrapper fino — a lógica de IA já existe.
2. **Persistência de conversas.** Hoje a memória é em-memória por `thread_id` (some ao reiniciar). Para produção, as conversas precisam ir para um banco — o Careplus Predict já usa Supabase, que serve bem (uma tabela de mensagens por thread; opcionalmente outra para sugestões de prescrição pendentes).
3. **Mapa usuário real ↔ ID pseudonimizado.** A IA só conhece `BNF-XXXXX`. O app conhece o usuário real. Essa tradução (e a tabela que a guarda) fica do lado do Careplus Predict, nunca dentro da IA — é o que mantém a conformidade com a LGPD.
4. **Fila de revisão médica.** As `sugestao_prescricao` precisam de uma tabela "pendente → aprovada/recusada por médico X em data Y", que vira o painel do médico.
5. **Autenticação e perfis.** O BFF decide quem é paciente e quem é médico, e filtra a resposta conforme a seção 6.

Itens 1 e 3 são o mínimo para um primeiro protótipo funcional acoplado.

---

## 9. Pontos de atenção (herdados da IA, valem para o novo projeto)

- **Pseudonimização é inegociável.** Nenhum dado pessoal direto (CPF, nome completo, carteirinha) entra na chamada da IA. Só o `BNF-XXXXX`. A tradução fica no app.
- **HITL é garantia, não opção.** Toda sugestão de prescrição vem com `requer_revisao_medica: true`. O app **não pode** ter um caminho que emita receita sem passar por um médico. Não exponha um botão que "aceita automaticamente".
- **Emergência sempre ganha.** `red_flags` preenchido → a UI normal cede lugar à orientação de emergência. Não enfileire, não atrase.
- **Latência varia.** Respostas de triagem com consulta a ferramentas podem levar alguns segundos. Use indicador de "digitando…" no chat; não trave a tela.
- **A IA pode ser trocada por dentro.** Como o contrato (seções 3-4) é estável, a equipe de IA pode melhorar prompts/modelo sem quebrar o app — desde que o formato de entrada/saída seja mantido. Versionar a API (`/api/v1/`) protege isso.

---

## 10. Glossário rápido (para alinhar o time)

- **Intent** — a categoria que a IA atribui à mensagem (triagem, prescrição, escalada, fora de escopo). É o que o front usa para decidir a UI.
- **Red flag** — sinal clínico de emergência (ex.: dor no peito irradiando). Dispara o caminho de escalada.
- **HITL (Human-in-the-Loop)** — humano obrigatório no circuito. Aqui: nenhuma prescrição sai sem médico.
- **Thread** — uma conversa contínua, identificada por `thread_id`. Mantém o contexto entre mensagens.
- **BFF (Backend for Frontend)** — a camada Node.js que fica entre o React e o serviço de IA, aplicando auth e filtros de perfil.
- **Pseudonimização** — substituir o identificador real por um código (`BNF-XXXXX`) para proteger dados sensíveis de saúde.

---

## 11. Resumo de uma página para a primeira reunião

- A IA já existe e funciona; o trabalho agora é **acoplá-la**, não reescrevê-la.
- O front fala com a IA por **uma rota HTTP**: manda `{paciente_id, mensagem, thread_id, perfil}`, recebe `{resposta, intent, red_flags, sugestao_prescricao, ...}`.
- O **intent** na resposta diz ao app o que renderizar — chat normal, banner de emergência, ou card de revisão médica.
- **Dois perfis** (paciente e médico) consomem a mesma IA; o Node.js/BFF filtra o que cada um vê.
- **Prescrição sempre passa por médico** (HITL) e **dados pessoais nunca chegam à IA** (pseudonimização) — essas duas regras orientam toda a arquitetura.
- Para o MVP, basta: (1) embrulhar a IA numa API HTTP, e (2) criar o mapa usuário↔BNF no app.
