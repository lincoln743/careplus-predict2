# CarePlus Mobile — setup

App Expo (managed) com tema claro/escuro, login Paciente/Médico e chat com a IA.

## 1. Colocar os arquivos no lugar

Descompacte o conteúdo em `apps/mobile/` do monorepo:

```bash
cd ~/"VS Code/careplus-predict_2/apps/mobile"
# extraia o careplus_mobile.tar.gz aqui (os arquivos vao na raiz de apps/mobile)
tar -xzf ~/Downloads/careplus_mobile.tar.gz -C .
```

## 2. Instalar dependências

```bash
cd ~/"VS Code/careplus-predict_2/apps/mobile"
npm install
```

## 3. Configurar o IP da API (CRÍTICO)

O celular não enxerga "localhost" do PC. Descubra o IP da sua máquina na rede:

```bash
hostname -I | awk '{print $1}'
# exemplo de saida: 192.168.0.10
```

Crie o `.env` do mobile com esse IP:

```bash
cp .env.example .env
# edite o .env e troque SEU_IP_LOCAL pelo IP acima, ex:
# EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:3000
```

## 4. Garantir que o backend aceita conexao externa

O backend já escuta em `0.0.0.0:3000` (confirmado no server.ts), então aceita
conexões da rede local. Garanta que ele está rodando:

```bash
cd ~/"VS Code/careplus-predict_2/services/backend" && npm run dev
```

## 5. Rodar o app

```bash
cd ~/"VS Code/careplus-predict_2/apps/mobile"
npx expo start
```

Leia o QR code com o Expo Go (celular na mesma rede) ou pressione `a` para o emulador.

## O que testar

- **Login**: use um usuário criado no backend (ex: registre via curl, ou crie pela tela).
- **Tema**: Config → Aparência → Claro / Escuro / Sistema (funciona de verdade agora).
- **Chat IA**: precisa da Blua no ar (porta 8001) + ai-gateway. Banner de emergência
  aparece se você mandar algo com red flag.

## Estrutura

```
apps/mobile/
  App.tsx                 # raiz: decide login vs app
  app.config.ts           # config Expo (apiBaseUrl via env)
  navigation.tsx          # tabs (adapta a paciente/medico)
  theme/                  # tokens + ThemeProvider (claro/escuro)
  api/client.ts           # cliente HTTP (URL via config, sem hardcode)
  store/auth.ts           # sessao (Zustand)
  screens/                # Login, Home, Settings, Chat
```

## Notas

- **Managed workflow** por enquanto (Expo Go). Migra para bare/dev build quando
  o Samsung Health SDK entrar (precisa de modulo nativo).
- O chat mostra "analisando... pode levar até 1 min" porque a prescrição da IA
  demora ~57s (latência da Blua, documentada no plano).
