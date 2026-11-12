# Implantação

O backend roda no Render e o frontend na Vercel. Os dois leem o repositório no GitHub, então o código precisa estar commitado e enviado antes de começar.

| Lado | Serviço | Configuração | Pasta |
| --- | --- | --- | --- |
| Backend | Render | `render.yaml` | `backend` |
| Frontend | Vercel | `frontend/vercel.json` | `frontend` |

## Ordem

Cada lado precisa do endereço do outro. Por isso o backend sobe primeiro e recebe o endereço da Vercel depois.

1. **Render:** crie um Blueprint a partir do repositório. Ele lê o `render.yaml` e pede `PUBLIC_URL` e `CORS_ORIGIN`. Se ainda não souber o endereço da Vercel, use `https://exemplo.vercel.app` nos dois por enquanto.
2. Copie o endereço do serviço, como `https://naipe-real-backend.onrender.com`, e confira que `/readyz` responde `ready`.
3. **Vercel:** importe o repositório e defina **Root Directory** como `frontend`. Em **Environment Variables**, crie `NEXT_PUBLIC_SERVER_URL` com o endereço do Render, sem barra no final.
4. Publique e copie o endereço final da Vercel.
5. **Render:** troque `PUBLIC_URL` e `CORS_ORIGIN` pelo endereço da Vercel e salve. O serviço reinicia sozinho.
6. Abra o jogo em dois aparelhos e jogue uma partida.

Sem `NEXT_PUBLIC_SERVER_URL`, a publicação na Vercel falha de propósito, para não entrar no ar uma tela sem servidor. A variável é lida na compilação: ao mudar o endereço, publique o frontend de novo.

## Troca do nome Rouba Monte para Naipe Real

Quem já tinha o Rouba Monte publicado precisa repetir a troca de nome fora do código. O endereço `.onrender.com` é fixado na criação do serviço e o `.vercel.app` vem do domínio cadastrado no projeto: renomear no painel não muda nenhum dos dois.

| Onde | Antes | Depois |
| --- | --- | --- |
| GitHub | `joaopedro08-dev/RoubaMonte` | `joaopedro08-dev/NaipeReal` |
| Serviço no Render | `rouba-monte-backend` | `naipe-real-backend` |
| Projeto na Vercel | `rouba-monte.vercel.app` | `naipe-real`, com o domínio `naipe-real.vercel.app` |
| Imagens Docker locais | `rouba-monte:local`, `rouba-monte-perf:local` | `naipe-real:local`, `naipe-real-perf:local` |
| Painel do Grafana e job do Prometheus | `rouba-monte` | `naipe-real` |
| Métricas | `roubamonte_*` | `naipe_real_*` |
| Chaves no navegador | `rouba-monte:assento`, `rouba-monte:dicas` | `naipe-real:assento`, `naipe-real:dicas` |

1. **GitHub:** em **Settings > General**, renomeie o repositório para `NaipeReal`. O endereço antigo redireciona, e Render e Vercel continuam ligados ao repositório. No seu computador, aponte o Git para o novo nome:

   ```bash
   git remote set-url origin https://github.com/joaopedro08-dev/NaipeReal.git
   ```

2. **Render:** depois do merge na `main`, abra o Blueprint e clique em **Manual Sync**. Como o nome no `render.yaml` mudou, o Render cria o serviço `naipe-real-backend` e pede `PUBLIC_URL` e `CORS_ORIGIN`: use `https://naipe-real.vercel.app` nos dois. Confira que `https://naipe-real-backend.onrender.com/readyz` responde `ready`.
3. **Vercel:** em **Settings > General**, troque o nome do projeto para `naipe-real`. Em **Settings > Domains**, adicione `naipe-real.vercel.app` e marque como produção. Em **Settings > Environment Variables**, troque `NEXT_PUBLIC_SERVER_URL` para `https://naipe-real-backend.onrender.com` e publique de novo, porque a variável é lida na compilação.
4. Abra `https://naipe-real.vercel.app`, crie uma sala de cada jogo e jogue uma mão.
5. **Render:** apague o serviço antigo `rouba-monte-backend` só depois do passo 4. Para não quebrar links antigos, deixe `rouba-monte.vercel.app` em **Domains** com redirecionamento para `naipe-real.vercel.app`.

Se você usa dashboards ou alertas próprios com as métricas antigas, troque o prefixo `roubamonte_` por `naipe_real_`. As salas ficam na memória, então a troca das chaves do navegador não derruba ninguém: a nova publicação já reinicia as partidas. Quem tinha as dicas desligadas precisa desligar de novo.

## Variáveis de produção

| Variável | Onde | Valor |
| --- | --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | Vercel | Endereço do backend no Render |
| `CORS_ORIGIN` | Render | Endereço do frontend. Para mais de um, separe por vírgula |
| `PUBLIC_URL` | Render | Endereço do frontend |
| `TRUST_PROXY`, `CLIENT_IP_HEADER`, `NODE_ENV`, `NODE_VERSION`, `NODE_OPTIONS`, `LOG_LEVEL` | Render | Já definidas no `render.yaml` |

As demais variáveis estão no [README do backend](../backend/README.md#configuração). Nenhuma delas é secreta hoje.

## Arquivos `.env`

`backend/.env` e `frontend/.env.local` servem só para desenvolvimento e ficam fora do Git e da imagem Docker. Render e Vercel não leem esses arquivos: os valores de produção ficam nos painéis. Para recriar os arquivos locais, copie os `.env.example` de cada pasta.

Para desenvolver com os dois separados:

```bash
pnpm --dir backend dev
```

```bash
pnpm --dir frontend dev
```

A tela abre em `http://localhost:3000` e o servidor fica em `http://localhost:4000`.

## Limites do plano gratuito do Render

- O serviço adormece depois de 15 minutos sem tráfego, e a primeira conexão leva cerca de 1 minuto para acordá-lo. A tela fica em "Conectando ao servidor" e tenta de novo sozinha.
- As salas ficam só na memória, então reinício, nova publicação ou adormecer encerra as partidas em andamento. Partidas com jogadores conectados mantêm o serviço acordado.
- O plano tem 0,1 CPU. Nas [medições](performance.md), a meta de 1 s valeu até 10 salas com bots agressivos, com travadas curtas ocasionais. Para jogar com mais salas ao mesmo tempo, troque `plan` no `render.yaml`.
- Previews da Vercel têm endereços próprios e são recusados pelo servidor, a menos que entrem em `CORS_ORIGIN`.

## Serviço único

O `docker compose up --build app` continua funcionando como antes: um só processo serve a tela e o jogo no mesmo endereço, sem `NEXT_PUBLIC_SERVER_URL` nem `CORS_ORIGIN`.
