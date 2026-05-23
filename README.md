# CarePlus Predict V2

Monorepo: mobile (React Native/Expo) + web (Next.js) + backend (Fastify) + Supabase.

## Estrutura
- `apps/mobile` — app do paciente e do medico
- `apps/web` — dashboard do medico
- `services/backend` — API, BFF da IA, motor de RAG
- `packages/shared-types` — contratos TS compartilhados
- `packages/config` — tsconfig/eslint base
- `infra/supabase` — migrations e setup do banco
- `docs` — plano tecnico e arquitetura

## Primeiros passos
1. `cp .env.example .env` e preencha os valores.
2. Instale dependencias (a definir por workspace).
3. Veja `docs/PLANO_TECNICO.md` para o backlog.

## Principios inegociaveis
- Sem URL/secret hardcoded — tudo via `.env`.
- IA e apoio a decisao, nunca diagnostico autonomo.
- HITL: nenhuma prescricao sai sem medico aprovar.
- Emergencia (red_flags nao-vazio) trava a UI normal -> SAMU 192 / CVV 188.
- RAG estrito: so responde com base validada + citacao, ou "nao encontrei".
- Pseudonimizacao: CPF/nome nunca chegam a IA.
