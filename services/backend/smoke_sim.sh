#!/usr/bin/env bash
# Smoke test do modulo de simulacao. Servidor no ar (npm run dev).
#   bash services/backend/smoke_sim.sh
set -uo pipefail
BASE="${1:-http://localhost:3000}"

EMAIL="medico_$(date +%s)@careplus.com"
SENHA="senhaForte123"

echo "=== 1) registrar MEDICO ==="
curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\",\"nome\":\"Dr Teste\",\"role\":\"DOCTOR\",\"crm\":\"CRM-SP 0001\"}" \
  | python3 -m json.tool

echo "=== 2) login ==="
ACCESS=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))")
echo "token obtido: ${ACCESS:0:20}..."

echo "=== 3) estado inicial (espera ativo=false) ==="
curl -s "$BASE/simulation/state" -H "Authorization: Bearer $ACCESS" | python3 -m json.tool

echo "=== 4) pacientes com simulacao DESLIGADA (espera lista vazia) ==="
curl -s "$BASE/simulation/patients" -H "Authorization: Bearer $ACCESS" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('ativo:',d['ativo'],'| qtd pacientes:',len(d['pacientes']))"

echo "=== 5) LIGAR simulacao (semeia pacientes) ==="
curl -s -X POST "$BASE/simulation/toggle" -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" -d '{"ativo":true}' | python3 -m json.tool

echo "=== 6) pacientes com simulacao LIGADA (espera 3 pacientes com biometria) ==="
curl -s "$BASE/simulation/patients" -H "Authorization: Bearer $ACCESS" \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('ativo:',d['ativo'],'| qtd:',len(d['pacientes']))
for p in d['pacientes']:
    u=p['ultima_leitura']
    print(f\"  {p['nome']} ({p['perfil_risco']}) -> {u['passos']} passos, {u['sono_horas']}h sono, FC {u['fc_media']} | historico: {len(p['historico'])} dias\")
    assert p['is_simulated'] == True, 'deve ser marcado simulado'
"

echo "=== 7) paciente NAO pode togglear simulacao (espera 403) ==="
PEMAIL="pac_$(date +%s)@x.com"
curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$PEMAIL\",\"senha\":\"$SENHA\",\"nome\":\"Pac\"}" > /dev/null
PACCESS=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$PEMAIL\",\"senha\":\"$SENHA\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))")
curl -s -o /dev/null -w "HTTP %{http_code} (espera 403)\n" -X POST "$BASE/simulation/toggle" \
  -H "Authorization: Bearer $PACCESS" -H "Content-Type: application/json" -d '{"ativo":true}'

echo "=== 8) DESLIGAR simulacao ==="
curl -s -X POST "$BASE/simulation/toggle" -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" -d '{"ativo":false}' | python3 -m json.tool

echo "=== 9) pacientes apos desligar (espera vazio de novo) ==="
curl -s "$BASE/simulation/patients" -H "Authorization: Bearer $ACCESS" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('ativo:',d['ativo'],'| qtd:',len(d['pacientes']))"

echo "=== fim ==="
