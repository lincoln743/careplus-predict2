#!/usr/bin/env bash
# Instalador do modulo RAG no backend — tudo automatico, sem abrir arquivos.
set -e
cd ~/"VS Code/careplus-predict_2/services/backend"

echo ">> 1. Extraindo o modulo rag..."
tar -xzf ~/Downloads/rag_module.tar.gz -C src/modules/
echo "   modulo em src/modules/rag/: $(ls src/modules/rag/ | tr '\n' ' ')"

echo ">> 2. Instalando dependencias (pdf-parse, @fastify/multipart)..."
npm install pdf-parse @fastify/multipart >/dev/null 2>&1
npm install -D @types/pdf-parse >/dev/null 2>&1 || true
echo "   deps instaladas"

echo ">> 3. Registrando no server.ts (via python, sem duplicar)..."
python3 << 'PYEOF'
p = "src/server.ts"
s = open(p).read()
orig = s

# (a) imports — inserir apos o ultimo import de modulo, se ainda nao existir
if 'modules/rag/rag_routes.js' not in s:
    anchor = 'import { aiGatewayRoutes } from "./modules/ai-gateway/gw_routes.js";'
    add = (anchor
           + '\nimport multipart from "@fastify/multipart";'
           + '\nimport { ragRoutes } from "./modules/rag/rag_routes.js";')
    s = s.replace(anchor, add)

# (b) register — inserir apos o register do ai-gateway, se ainda nao existir
if 'app.register(ragRoutes)' not in s:
    anchor2 = 'await app.register(aiGatewayRoutes);'
    add2 = (anchor2
            + '\nawait app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });'
            + '\nawait app.register(ragRoutes);')
    s = s.replace(anchor2, add2)

if s != orig:
    open(p, "w").write(s)
    print("   server.ts atualizado (imports + register do RAG)")
else:
    print("   server.ts ja estava configurado (nada a fazer)")
PYEOF

echo ">> 4. Conferindo..."
grep -n "ragRoutes\|multipart" src/server.ts || echo "   (atencao: nao encontrou — confira manualmente)"
echo ""
echo ">> PRONTO. Reinicie o backend (Ctrl+C no terminal dele e suba de novo)."
