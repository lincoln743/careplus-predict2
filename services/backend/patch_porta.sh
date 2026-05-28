#!/usr/bin/env bash
set -e
cd ~/"VS Code/careplus-predict_2/services/backend"
echo ">> Ajustando env.ts para aceitar PORT (Railway) com fallback para API_PORT..."
python3 << 'PYEOF'
p = "src/infra/env.ts"
s = open(p).read(); orig = s

# Adiciona PORT ao schema (Railway injeta PORT). Mantem API_PORT como fallback.
s = s.replace(
    'API_PORT: z.coerce.number().default(3000),',
    'PORT: z.coerce.number().optional(),        // Railway/nuvem injeta esta\n  API_PORT: z.coerce.number().default(3000), // fallback local'
)
if s != orig:
    open(p,"w").write(s); print("   env.ts: PORT adicionado ao schema")
else:
    print("   ja aplicado")
PYEOF

echo ">> Ajustando server.ts para usar PORT||API_PORT..."
python3 << 'PYEOF'
p = "src/server.ts"
s = open(p).read(); orig = s
# Troca o uso de env.API_PORT por (env.PORT ?? env.API_PORT)
s = s.replace("const port = env.API_PORT;", "const port = env.PORT ?? env.API_PORT;")
if s != orig:
    open(p,"w").write(s); print("   server.ts: usa PORT ?? API_PORT")
else:
    print("   server.ts: padrao nao encontrado — verifique manualmente")
PYEOF
echo ">> PRONTO."
