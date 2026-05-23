#!/usr/bin/env bash
# Smoke test do modulo de auth. Servidor deve estar no ar (npm run dev).
#   bash services/backend/smoke_auth.sh
# Requer: curl. Usa um cookie jar para o fluxo de refresh.
set -uo pipefail
BASE="${1:-http://localhost:3000}"
JAR="/tmp/cp2_cookies.txt"
rm -f "$JAR"

EMAIL="teste_$(date +%s)@careplus.com"
SENHA="senhaForte123"

echo "=== 1) health ==="
curl -s "$BASE/health"; echo

echo "=== 2) registrar paciente ==="
curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\",\"nome\":\"Teste\"}" | python3 -m json.tool

echo "=== 3) login (guarda cookie de refresh) ==="
RESP=$(curl -s -c "$JAR" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\"}")
echo "$RESP" | python3 -m json.tool
ACCESS=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))")

echo "=== 4) /auth/me com access token (espera o usuario) ==="
curl -s "$BASE/auth/me" -H "Authorization: Bearer $ACCESS" | python3 -m json.tool

echo "=== 5) /auth/me SEM token (espera 401) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/auth/me"

echo "=== 6) refresh (rotaciona o token) ==="
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/auth/refresh" | python3 -m json.tool

echo "=== 7) login com senha errada (espera 401) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"errada\"}"

echo "=== 8) registrar com email duplicado (espera 409) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\",\"nome\":\"Dup\"}"

echo "=== 9) logout ==="
curl -s -b "$JAR" -X POST "$BASE/auth/logout" | python3 -m json.tool

echo "=== fim ==="
