#!/usr/bin/env bash
#
# Gera as conversas de IA da demo (ai_threads / ai_messages).
# ---------------------------------------------------------------------------
# Roda o chat DE VERDADE contra o backend, para que o intent e as red_flags
# gravadas sejam a saida real do modelo — nao linha forjada a mao. Numa banca,
# dado inventado no banco nao prova nada.
#
# Pre-requisitos:
#   - backend no ar (local ou producao)
#   - seed-demo.ts ja executado (usuarios existem)
#   - Blua com LLM funcionando (GROQ_MODEL_PRINCIPAL valido)
#
# Uso:
#   ./scripts/seed-chat.sh                                   # localhost:3000
#   API=https://careplus-predict2-production.up.railway.app ./scripts/seed-chat.sh
#
set -uo pipefail

API="${API:-http://localhost:3000}"
SENHA="${SENHA:-senha123}"

login() { # email -> accessToken
  curl -s -m 30 -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"senha\":\"$SENHA\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))"
}

chat() { # token, mensagem
  curl -s -m 180 -X POST "$API/ai/chat" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $1" \
    -d "$(python3 -c "import json,sys;print(json.dumps({'mensagem':sys.argv[1]}))" "$2")"
}

resumo() { # json da resposta
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print('      resposta nao-JSON'); raise SystemExit
if 'code' in d and 'message' in d:
    print(f\"      ERRO: {d['code']} — {d['message']}\"); raise SystemExit
flags = d.get('red_flags') or []
print(f\"      intent={d.get('intent')}  escalada={d.get('requer_escalada_humana')}  red_flags={len(flags)}\")
for f in flags:
    print(f\"        - {f.get('categoria')}/{f.get('severidade')} ({f.get('fonte_deteccao')})\")
r = (d.get('resposta') or '').replace(chr(10), ' ')
print(f\"      \\\"{r[:150]}...\\\"\")
"
}

echo ""
echo "Seed de conversas — API: $API"
echo ""

# ---------------------------------------------------------------------------
# Paciente — casos de triagem.
# As frases de risco sao as MINIMAS necessarias para o classificador disparar.
# ---------------------------------------------------------------------------
TOK_PACIENTE=$(login "paciente@careplus.com")
if [ -z "$TOK_PACIENTE" ]; then
  echo "FALHOU: login de paciente@careplus.com. Rode o seed-demo antes."
  exit 1
fi

PROMPTS_PACIENTE=(
  "estou com dor forte no peito ha 30 minutos"
  "me falta ar e minha pressao esta 18 por 12"
  "nao aguento mais viver, quero sumir"
  "tenho dor de cabeca leve depois do almoco"
  "qual a capital da Franca?"
)

echo "[paciente] Maria Santos"
for p in "${PROMPTS_PACIENTE[@]}"; do
  echo "  > $p"
  chat "$TOK_PACIENTE" "$p" | resumo
done

# ---------------------------------------------------------------------------
# Medico — consulta a base de conhecimento (perfil=medico).
# ---------------------------------------------------------------------------
TOK_MEDICO=$(login "medico@careplus.com")
if [ -z "$TOK_MEDICO" ]; then
  echo "FALHOU: login de medico@careplus.com."
  exit 1
fi

PROMPTS_MEDICO=(
  "qual a conduta para emergencia hipertensiva?"
  "quando iniciar insulina no diabetes tipo 2?"
  "quais exames de rastreamento anual no diabetico?"
)

echo ""
echo "[medico] Dr. Carlos Mendes"
for p in "${PROMPTS_MEDICO[@]}"; do
  echo "  > $p"
  chat "$TOK_MEDICO" "$p" | resumo
done

echo ""
echo "Pronto. Verifique com:"
echo "  select perfil, count(*) from ai_threads group by perfil;"
echo "  select intent, count(*) from ai_messages where intent is not null group by intent;"
echo ""
