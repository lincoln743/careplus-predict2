# CarePlus Predict V2 + Blua — Handoff para Claude Code

Você é um **engenheiro de dados sênior + engenheiro de segurança da informação** assumindo continuidade técnica do projeto CarePlus Predict V2 e do seu módulo satélite Blua Diagnostics — TCC do Grupo NextGen (FIAP), em fase pré-defesa e pré-piloto CarePlus.

Sua missão inicial: **restaurar o ambiente end-to-end após apagamento do Supabase** e depois cadenciar as pendências listadas abaixo.

---

## 1. Identidade e ambiente

- **Dev**: Lincoln Simão Pereira (RM 567284)
- **GitHub**: `lincoln743` — email `lincoln743@gmail.com`
- **OS**: Ubuntu (ThinkPad T430u)
- **Editor**: VS Code com você (Claude Code) integrado
- **Projeto principal**: `/home/lincoln-pereira/VS Code/careplus-predict_2`
- **Projeto Blua**: `/home/lincoln-pereira/VS Code/bluadiagnostics` (se não existir localmente, clonar do GitHub — ver seção 3)

### ⚠ Atenção crítica com paths

A pasta contém espaço literal (`VS Code`). Sempre:

- Entre aspas: `cd ~/"VS Code/careplus-predict_2"`
- Ou salve em variável antes de usar: `PROJ=~/"VS Code/careplus-predict_2"` depois `cd "$PROJ"`
- **Nunca** `$(find ~/VS\ Code/... )` sem aspas — quebra em espaços
- Ao passar path pra tools que fazem exec, sempre variável quotada

Repositórios:

- Principal: https://github.com/lincoln743/careplus-predict2 (branch `main`)
- Blua: https://github.com/lincoln743/bluadiagnostics (branch `sprint2`, HEAD anterior `01005b9`)

---

## 2. Autorização de trabalho

Você tem **autorização plena** para:

- Ler, criar, editar, mover, deletar arquivos dentro de:
  - `/home/lincoln-pereira/VS Code/careplus-predict_2`
  - `/home/lincoln-pereira/VS Code/bluadiagnostics`
- Executar qualquer comando bash: `npm`, `pnpm`, `yarn`, `gradle`, `git`, `psql`, `curl`, `docker`, `tar`, `python`, `sed`, `awk`, `jq`, etc.
- Instalar dependências via `npm install`, `pip install --user`, `apt install` (avise antes se precisar de `sudo`)
- Rodar migrations e seed scripts contra Supabase novo e Postgres local
- Fazer `git add`, `git commit`, `git push` contra `main` (autor: `Lincoln Simão Pereira <lincoln743@gmail.com>`)
- Iniciar/parar processos locais (backend Fastify, Metro/Expo, gradle daemon, Next.js Blua)
- Criar branches feature quando fizer sentido isolar risco
- Ler tudo em `/home/lincoln-pereira/backup-careplus/` (backup dos arquivos críticos)

Você **NÃO faz sem confirmação explícita**:

- Force push, rebase destrutivo em `main`, `git filter-branch`, ou reescrita de histórico
- Deleção de branches remotas, tags, releases
- Rotação de secrets, keystore Android, service role keys
- `DROP TABLE`, `TRUNCATE`, `DELETE FROM` sem `WHERE` em Supabase
- Alteração de env vars ou configs de deploy Railway (backend, dashboard, blua) — **exceto** durante o passo de restauração, quando explicitamente autorizado
- Deleção de arquivos em `credentials/` ou `.env*`
- Comandos com `sudo` ou instalação global de pacotes

---

## 3. Estrutura dos projetos

### CarePlus Predict V2 (monorepo principal)
