#!/usr/bin/env bash
# Smoke test do ai-gateway. REQUER:
#   - backend no ar (npm run dev, porta 3000)
#   - Blua no ar (uvicorn app.api.main:app --port 8001)
#   - BLUA_API_URL=http://localhost:8001 no .env
#   bash services/backend/smoke_gw.sh
set -uo pipefail
BASE="${1:-http://localhost:3000}"

PEMAIL="pac_gw_$(date +%s)@x.com"
MEMAIL="med_gw_$(date +%s)@x.com"
SENHA="senhaForte123"

echo "=== setup: registrar paciente e medico ==="
curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$PEMAIL\",\"senha\":\"$SENHA\",\"nome\":\"Maria\"}" > /dev/null
curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMAIL\",\"senha\":\"$SENHA\",\"nome\":\"Dr Teste\",\"role\":\"DOCTOR\"}" > /dev/null

PAC=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$PEMAIL\",\"senha\":\"$SENHA\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
MED=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$MEMAIL\",\"senha\":\"$SENHA\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
echo "tokens obtidos."

echo ""
echo "=== 1) PACIENTE: triagem (sintoma leve) — espera resposta, SEM prescricao/trilha ==="
curl -s -X POST "$BASE/ai/chat" -H "Authorization: Bearer $PAC" \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"Estou com dor de cabeca leve desde ontem"}' \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  intent:',d.get('intent'))
print('  tem resposta:',bool(d.get('resposta')))
print('  ve prescricao? (deve ser False):', 'sugestao_prescricao' in d)
print('  ve trilha tools? (deve ser False):', 'tools_usadas' in d)
"

echo ""
echo "=== 2) PACIENTE: emergencia (dor no peito) — espera red_flags + banner ==="
curl -s -X POST "$BASE/ai/chat" -H "Authorization: Bearer $PAC" \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"Dor forte no peito irradiando para o braco esquerdo e falta de ar"}' \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  intent:',d.get('intent'))
print('  red_flags (deve ser >0):', len(d.get('red_flags',[])))
print('  requer_escalada_humana:', d.get('requer_escalada_humana'))
"

echo ""
echo "=== 3) MEDICO: pedido de prescricao — espera VER prescricao + trilha ==="
curl -s -X POST "$BASE/ai/chat" -H "Authorization: Bearer $MED" \
  -H "Content-Type: application/json" \
  -d '{"mensagem":"Renovar receita de losartana 50mg para o paciente"}' \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  intent:',d.get('intent'))
print('  medico ve prescricao? (deve ser True):', d.get('sugestao_prescricao') is not None)
print('  medico ve trilha? (deve ser True):', 'tools_usadas' in d)
"

echo ""
echo "=== 4) MEDICO: fila de prescricoes pendentes (espera >=1 da etapa 3) ==="
curl -s "$BASE/ai/prescriptions" -H "Authorization: Bearer $MED" \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
ps=d.get('pendentes',[])
print('  pendentes:',len(ps))
if ps:
    p=ps[-1]
    print('  ultima -> status:',p['status'],'| bnf:',p['paciente_bnf'],'| medicamento:',p['sugestao'].get('medicamento'))
    print('  PRESC_ID='+p['id'])
" | tee /tmp/gw_presc.txt

echo ""
echo "=== 5) PACIENTE nao acessa fila de prescricao (espera 403) ==="
curl -s -o /dev/null -w "  HTTP %{http_code} (espera 403)\n" "$BASE/ai/prescriptions" -H "Authorization: Bearer $PAC"

echo ""
echo "=== 6) MEDICO aprova a prescricao pendente ==="
PID=$(grep PRESC_ID /tmp/gw_presc.txt | cut -d= -f2)
if [ -n "$PID" ]; then
  curl -s -X POST "$BASE/ai/prescriptions/$PID/review" -H "Authorization: Bearer $MED" \
    -H "Content-Type: application/json" \
    -d '{"decisao":"aprovada","observacao":"Renovacao adequada, paciente estavel"}' \
    | python3 -m json.tool
else
  echo "  (sem prescricao pendente para aprovar)"
fi

echo ""
echo "=== fim ==="
