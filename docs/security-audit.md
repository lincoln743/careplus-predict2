# Auditoria de segurança — CarePlus Predict V2

**Data:** 13/09/2026
**Escopo:** backend Fastify (`services/backend`), app mobile (`apps/mobile`), dashboard (`apps/web`),
serviço de IA BluaDiagnostics e a configuração de deploy no Railway.
**Método:** leitura de código, inspeção das variáveis de ambiente em produção via API do Railway,
e testes contra os serviços em produção. Nenhum achado abaixo é especulativo — cada um foi
reproduzido.

Escala: **crítico** (explorável com dano direto a paciente ou ao sistema) · **alto** ·
**médio** · **baixo**.

---

## Resumo

| # | Severidade | Achado | Estado |
|---|---|---|---|
| 1 | crítico | APKs de release assinados com a chave pública de debug | ✅ corrigido |
| 2 | crítico | Red flags cardiovasculares nunca disparavam | ✅ corrigido |
| 3 | alto | Senha do keystore em arquivo versionável | ✅ corrigido antes de vazar |
| 4 | alto | `NODE_ENV=development` em produção → cookie de refresh sem `secure` | 🔴 aberto |
| 5 | médio | Rate limit global, sem limite específico em `/auth/login` | 🔴 aberto |
| 6 | médio | CORS com `origin: true` (reflete qualquer origem) | 🔴 aberto |
| 7 | médio | Falha de infraestrutura devolve `401 Credenciais inválidas` | 🔴 aberto |
| 8 | baixo | `/health/full` exposto sem autenticação | 🔴 aberto |
| 9 | baixo | `select("*")` em `users` carrega o hash de senha para memória | 🔴 aberto |
| 10 | baixo | Variáveis órfãs e placeholder no Railway | 🔴 aberto |

---

## 1. crítico — APKs de release assinados com a chave de debug ✅

**O que era.** Todo APK gerado até o v16, incluindo o que está instalado no aparelho do testador,
saiu assinado com a chave de debug do template do React Native:

```
$ apksigner verify --print-certs app-release.apk
Signer #1 certificate DN: CN=Android Debug, OU=Android, O=Unknown, L=Unknown, ST=Unknown, C=US
Signer #1 certificate SHA-1 digest: 5e8f16062ea3cd2c4a0d547876baa6f38cabf625
```

Esse SHA-1 é o do `android/app/debug.keystore`, não o do `careplus-release.keystore`
(`2F:70:84:ED:...`), que nunca foi usado apesar de ser tratado como crítico no handoff.

**Por que importa.** A chave de debug do template é material público. Qualquer pessoa consegue
assinar um APK malicioso que o Android aceita como atualização legítima do CarePlus, com acesso
a tudo que o app acessa — incluindo os dados de saúde do paciente. Para um piloto com dado
sensível, é inaceitável. Google Play também rejeita binário assinado com chave de debug.

**Causa raiz.** Não era o `build.gradle` — era o config plugin. `plugins/withSamsung.js` injetava
`signingConfig signingConfigs.release` no topo do bloco `buildTypes.release`, mas o template do
Expo já traz `signingConfig signingConfigs.debug` logo abaixo. Em Gradle, a última atribuição
vence. Como `android/` é regenerado pelo `expo prebuild`, qualquer correção feita direto no
`build.gradle` seria desfeita no próximo prebuild.

**Correção.** O plugin passou a **substituir** a linha em vez de acrescentar, e falha alto
(`GradleException`) se as credenciais não estiverem presentes, em vez de cair na chave de debug
silenciosamente. Coberto por teste que roda o plugin contra o `build.gradle` do template original.

**Pendência operacional.** O v17 sairá com a chave de release, portanto **não instala por cima**
de um v16 existente — exige desinstalar antes. Decidido adiar a distribuição para depois da
defesa, para não trocar o binário na véspera.

---

## 2. crítico — Red flags cardiovasculares nunca disparavam ✅

**O que era.** Enviando ao `/ai/chat` em produção:

```
"dor no peito irradiando para o braco"        → red_flags: []
"me falta ar e minha pressao esta 18 por 12"  → red_flags: []
```

**Por que importa.** É o objetivo do produto. O agente de escalada já tinha o template de
`cardiovascular` pronto, com orientação de SAMU 192 — ele simplesmente nunca era alcançado.
Paciente descrevendo sintoma de infarto ou crise hipertensiva recebia triagem comum, e o
dashboard do médico não acendia alerta nenhum.

**Causa raiz — dois defeitos independentes:**

1. **Padrões sensíveis a acento.** `\bdor (no |de )?peito\b.*\b(braço|costas|mandíbula|queixo)\b`
   só casa com `braço` com cedilha. Quem digita `braco` — o comportamento normal no teclado do
   celular — passava batido **mesmo descrevendo a irradiação**. Valia também para `torácica`,
   `súbita`, `convulsão`.
2. **Nenhum padrão de pressão arterial.** `18 por 12` é 180/120, exatamente o limiar que o
   protocolo clínico define como emergência hipertensiva.

O fallback por LLM não cobria a lacuna: detectou o caso de saúde mental e deixou passar os
cardiovasculares.

**Correção.** Casamento sobre texto normalizado nos dois lados, com `sem_acento()` preservando o
comprimento da string — assim a `frase_gatilho` continua recortada do texto original acentuado.
Mais padrões de crise hipertensiva para PAS ≥ 180 ou PAD ≥ 120, cobrindo `180/120`, `180 por 120`,
`180x120` e a forma coloquial `18 por 12`. 29 testes de regressão, todos a partir de falhas reais.

**Verificação em produção:**
```
"me falta ar e minha pressao esta 18 por 12"
  → intent=escalada, cardiovascular/critica, fonte=regra, gatilho="18 por 12"
  → "ligue para o SAMU (192) ou vá ao pronto-socorro mais próximo imediatamente"
```

**Calibração deliberada, e o que ela significa para a demo.** `"dor forte no peito"` continua
**não** detectada pela regra: o adjetivo entre "dor" e "peito" quebra a adjacência. Afrouxar
pegaria também `"dor leve no peito"` e geraria escalada falsa — mandar paciente ao SAMU sem
necessidade também é dano. Fica a cargo do detector semântico, que é probabilístico.

➡️ **Consequência prática:** no roteiro da banca, use `"me falta ar e minha pressão está 18 por 12"`
como cenário crítico cardiovascular. `"dor forte no peito"` é a frase mais intuitiva, mas **não
dispara de forma determinística**.

---

## 3. alto — Senha do keystore em arquivo versionável ✅

`apps/mobile/plugins/withSamsung.js` embutia `storePassword 'careplus123'` no código. O arquivo
**não** estava coberto pelo `.gitignore` — o `/apps/mobile/credentials/` protegia a keystore em si,
mas não o plugin que continha a senha dela.

Detectado numa varredura pré-commit. **Nunca chegou a ser publicado**, então não houve vazamento e
não é necessário rotacionar. As credenciais passaram para
`apps/mobile/credentials/keystore.properties` (ignorado), com modelo em
`apps/mobile/keystore.properties.example`.

**Lição de processo:** proteger o diretório de segredos não basta se o código que os consome
também os contém. Vale uma varredura de segredos no CI (ver P3).

---

## 4. alto — `NODE_ENV=development` em produção 🔴

Lendo as variáveis do serviço `careplus-predict2` no Railway:

```
NODE_ENV = development
```

Em [`modules/auth/routes.ts:28`](../services/backend/src/modules/auth/routes.ts#L28):

```ts
secure: env.NODE_ENV === "production",
```

O cookie `cp_refresh`, que é o token de sessão de longa duração, sai **sem a flag `secure`**. Ele
não exige HTTPS e pode ser transmitido em claro se algo rebaixar a conexão.

**Correção:** definir `NODE_ENV=production` no Railway. Baixo risco de regressão — o Railway serve
só HTTPS, então o cookie continua funcionando. Não alterado por ora para não introduzir variável
nova durante a restauração.

---

## 5. médio — Rate limit global, sem proteção específica de autenticação 🔴

[`server.ts:33`](../services/backend/src/server.ts#L33):

```ts
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
```

100 requisições por minuto por IP, para **toda** a API. Significa até 100 tentativas de senha por
minuto num único endereço — 144 mil por dia. Para senhas fracas, é suficiente.

**Correção sugerida:** limite dedicado em `/auth/login` e `/auth/refresh` (algo como 5–10 por
minuto por IP), com bloqueio progressivo. O `@fastify/rate-limit` aceita config por rota.

---

## 6. médio — CORS reflete qualquer origem 🔴

[`server.ts:29`](../services/backend/src/server.ts#L29):

```ts
await app.register(cors, {
  origin: true, // ajustar para os dominios do app/web em producao
  credentials: true,
});
```

`origin: true` reflete o `Origin` da requisição e, combinado com `credentials: true`, permite que
qualquer site faça requisições autenticadas por cookie em nome de um usuário logado. O próprio
comentário no código reconhece a pendência.

**Correção sugerida:** allowlist explícita — `dashboard-medico-production.up.railway.app` e o
domínio da Blua. O app mobile não envia `Origin`, então não é afetado pela restrição.

---

## 7. médio — Falha de infraestrutura devolve `401 Credenciais inválidas` 🔴

Com o backend apontando para um Supabase inexistente:

```
GET  /health/full → "supabase": {"ok": false, "erro": "TypeError: fetch failed"}
POST /auth/login  → 401 {"code":"UNAUTHORIZED","message":"Credenciais invalidas"}
```

A busca do usuário falha, volta vazia, e o código trata "não encontrei o usuário" como "senha
errada". Uma queda total de banco é reportada ao usuário como erro de credencial.

**Por que importa.** Não é vulnerabilidade, é armadilha operacional: mascara incidente de
infraestrutura como erro do usuário. Custou tempo de diagnóstico nesta própria restauração, e num
piloto levaria pacientes a trocar senha achando que erraram.

**Correção sugerida:** distinguir "usuário não encontrado" de "falha ao consultar o banco" no
`auth/service.ts`, devolvendo `503` no segundo caso. O `401` genérico deve continuar para senha
errada — aí a indistinção é proposital, para não permitir enumeração de e-mails.

---

## 8. baixo — `/health/full` sem autenticação 🔴

```
$ curl https://careplus-predict2-production.up.railway.app/health/full
{"status":"ok","dependencias":{"supabase":{"ok":true,"latencia_ms":559},"blua":{"ok":true}}}
```

Expõe publicamente quais dependências existem e se estão de pé. Útil para um atacante mapear a
superfície e cronometrar indisponibilidades.

**Correção sugerida:** manter `/health` público (necessário para o healthcheck do Railway) e exigir
autenticação de ADMIN em `/health/full`.

---

## 9. baixo — `select("*")` em `users` 🔴

[`auth/service.ts:120`](../services/backend/src/modules/auth/service.ts#L120) e `:182` trazem todas
as colunas, incluindo `password_hash`, para a memória do processo.

**Verificado:** o hash **não** vaza na resposta — a serialização monta explicitamente
`{id, email, role, nome}`, confirmado no retorno real do `/auth/login`. É defesa em profundidade,
não vazamento: reduz o risco de um `return user` distraído em manutenção futura.

**Correção sugerida:** selecionar colunas explícitas, trazendo `password_hash` apenas no caminho
que de fato verifica a senha.

---

## 10. baixo — Variáveis órfãs e placeholder no Railway 🔴

| Serviço | Variável | Situação |
|---|---|---|
| `careplus-predict2` | `DATABASE_URL` | `postgresql://postgres:SENHA@db.SEU_PROJETO.supabase.co` — placeholder literal. Não é lido pelo `env.ts`; se algum dia for, falha de forma confusa. |
| `careplus-predict2` | `API_BASE_URL` | `http://localhost:3000` em produção. Validado pelo schema mas nunca usado — inofensivo hoje, enganoso na leitura. |
| `bluadiagnostics` | `MODEL_ID` | Não aparece em nenhum branch do repositório. Resto de deploy antigo. |

Nenhuma causa dano. Ruído de configuração custa tempo em diagnóstico — foi o caso do `MODEL_ID`,
que parecia ser a variável do modelo e não era.

---

## O que foi verificado e está correto

Vale registrar o que **não** é problema, para a banca:

- **RBAC funciona.** `GET /rag/documents` com token de paciente devolve
  `403 FORBIDDEN "Requer papel: DOCTOR ou ADMIN"`. Sem token, `401 "Token ausente"`. Testado em
  produção.
- **Senhas com argon2id.** `hashPassword` usa `argon2.hash(senha, { type: argon2.argon2id })`.
  Nenhuma senha em texto puro no banco.
- **Refresh tokens guardados como hash.** O banco guarda SHA-256 do token, nunca o token. Vazamento
  do banco não produz tokens utilizáveis.
- **Pseudonimização na fronteira da IA.** A Blua recebe `BNF-XXXXXXXX`, nunca nome, e-mail ou UUID.
  O mapa fica só em `patient_pseudonyms`. Verificado no `pseudonymizer.ts` e nas chamadas reais.
- **Validação de entrada com zod** em todas as rotas inspecionadas, com schema por endpoint.
- **Prescrição sempre via HITL.** Não existe caminho que emita receita sem passar pela fila
  `prescriptions` com revisão de médico.
- **RLS habilitado nas 15 tabelas.** Ver `docs/schema-v2.md` para por que sem policies.

---

## Prioridade sugerida

**Antes do piloto CarePlus** (não bloqueiam a defesa): itens 4, 5 e 6. São três mudanças pequenas
e bem delimitadas.

**Antes da defesa:** nada aberto é bloqueante. Vale apenas ter ciência do ajuste de calibração do
item 2 ao montar o roteiro da demo.
