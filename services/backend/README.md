# Backend (Fastify)

Tres papeis: dominio do app, BFF da IA (ai-gateway) e motor de RAG (knowledge).

## Modulos
- `auth` — login, refresh, RBAC (PATIENT/DOCTOR/ADMIN)
- `users` — perfis, consentimento LGPD
- `health` — series temporais biometricas, agregacoes
- `wearable` — ingestao (MockWearableProvider agora)
- `anamnesis` — questionario, baseline, risco inicial
- `simulation` — liga/desliga, pacientes sinteticos
- `ai-gateway` — BFF da Blua: pseudonimizacao + filtro por perfil + persistencia
- `prescriptions` — fila HITL (pendente -> aprovada/recusada)
- `knowledge` — RAG: ingestao, validacao, consulta (pgvector)
- `audit` — trilha LGPD
