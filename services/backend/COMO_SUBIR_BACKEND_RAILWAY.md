# Subir o BACKEND no Railway — passo a passo

## IMPORTANTE: monorepo
O backend esta em services/backend dentro do repo careplus-predict2.
No Railway, configure ROOT DIRECTORY = services/backend (senao nao acha o package.json).

## 1. Aplicar arquivos no repo (na pasta services/backend)
```bash
cd ~/"VS Code/careplus-predict_2/services/backend"
tar -xzf ~/Downloads/backend_deploy.tar.gz -C .
# aplica o patch da porta (env.ts + server.ts aceitam PORT do Railway)
bash patch_porta.sh
cd ~/"VS Code/careplus-predict_2"
git add services/backend/railway.json services/backend/nixpacks.toml services/backend/src/infra/env.ts services/backend/src/server.ts
git commit -m "chore(deploy): config Railway do backend (PORT, nixpacks)"
git push origin main
```

## 2. No Railway: novo servico no MESMO projeto da Blua (ou novo projeto)
1. New -> GitHub repo -> lincoln743/careplus-predict2
2. Settings -> ROOT DIRECTORY = services/backend   (CRITICO no monorepo)
3. Settings -> Branch: main
4. Settings -> Networking -> Generate Domain (e depois Target Port: ver passo 5)

## 3. Variables (todas obrigatorias — backend falha-alto sem elas)
```
SUPABASE_URL                = https://jcksmlsxndjnanjalvqz.supabase.co
SUPABASE_SERVICE_ROLE_KEY   = <a service_role key do Supabase (painel Supabase > Settings > API)>
JWT_ACCESS_SECRET           = <string aleatoria >=16 chars>
JWT_REFRESH_SECRET          = <outra string aleatoria >=16 chars>
BLUA_API_URL                = https://bluadiagnostics-production.up.railway.app
BLUA_API_TIMEOUT_MS         = 120000
API_BASE_URL                = https://<dominio-que-o-railway-gerar-para-o-backend>
NODE_ENV                    = production
```
Dica: gere os JWT secrets com  openssl rand -hex 32

## 4. Deploy + porta
- O backend agora le PORT (Railway injeta). Em Networking, se der 502,
  defina Target Port = a porta do log (ex: 8080) — igual fizemos na Blua.

## 5. Testar
```bash
curl https://<dominio-backend>/health           # {"status":"ok"}
curl https://<dominio-backend>/health/full       # checa Supabase + Blua
```
O /health/full deve mostrar supabase ok E blua ok (a Blua ja esta no ar).

## Observacao sobre API_BASE_URL
E uma referencia circular: voce so sabe o dominio do backend DEPOIS de criar o servico.
Solucao: cria o servico, gera o dominio, e SO ENTAO seta API_BASE_URL com esse dominio
(o servico reinicia). Ou poe um valor temporario e ajusta depois.
