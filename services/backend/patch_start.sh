#!/usr/bin/env bash
set -e
cd ~/"VS Code/careplus-predict_2/services/backend"
echo ">> Ajustando package.json para o deploy..."
python3 << 'PYEOF'
import json
p = "package.json"
d = json.load(open(p))

# 1. script start de producao (tsx direto, sem --env-file)
d["scripts"]["start"] = "tsx src/server.ts"

# 2. mover tsx para dependencies (senao NODE_ENV=production pula devDeps e tsx some)
dev = d.get("devDependencies", {})
deps = d.get("dependencies", {})
for pkg in ["tsx"]:
    if pkg in dev:
        deps[pkg] = dev.pop(pkg)
d["dependencies"] = deps
d["devDependencies"] = dev

json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
print("   start = 'tsx src/server.ts'")
print("   tsx movido para dependencies (sobrevive a NODE_ENV=production)")
print("   deps:", ", ".join(sorted(d["dependencies"].keys())))
PYEOF
echo ">> PRONTO."
