# Implantação

O backend roda no Render e o frontend na Vercel. Os dois leem o repositório no GitHub, então o código precisa estar commitado e enviado antes de começar.

| Lado | Serviço | Configuração | Pasta |
| --- | --- | --- | --- |
| Backend | Render | `render.yaml` | `backend` |
| Frontend | Vercel | `frontend/vercel.json` | `frontend` |

## Ordem

Cada lado precisa do endereço do outro. Por isso o backend sobe primeiro e recebe o endereço da Vercel depois.

1. **Render:** crie um Blueprint a partir do repositório. Ele lê o `render.yaml` e pede `PUBLIC_URL` e `CORS_ORIGIN`. Se ainda não souber o endereço da Vercel, use `https://exemplo.vercel.app` nos dois por enquanto.
2. Copie o endereço do serviço, como `https://rouba-monte-backend.onrender.com`, e confira que `/readyz` responde `ready`.
3. **Vercel:** importe o repositório e defina **Root Directory** como `frontend`. Em **Environment Variables**, crie `NEXT_PUBLIC_SERVER_URL` com o endereço do Render, sem barra no final.
4. Publique e copie o endereço final da Vercel.
5. **Render:** troque `PUBLIC_URL` e `CORS_ORIGIN` pelo endereço da Vercel e salve. O serviço reinicia sozinho.
6. Abra o jogo em dois aparelhos e jogue uma partida.

Sem `NEXT_PUBLIC_SERVER_URL`, a publicação na Vercel falha de propósito, para não entrar no ar uma tela sem servidor. A variável é lida na compilação: ao mudar o endereço, publique o frontend de novo.

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
- O plano tem 0,1 CPU, menos que os 0,5 CPU usados nas medições de [performance](performance.md). Para jogar com mais salas ao mesmo tempo, troque `plan` no `render.yaml`.
- Previews da Vercel têm endereços próprios e são recusados pelo servidor, a menos que entrem em `CORS_ORIGIN`.

## Serviço único

O `docker compose up --build app` continua funcionando como antes: um só processo serve a tela e o jogo no mesmo endereço, sem `NEXT_PUBLIC_SERVER_URL` nem `CORS_ORIGIN`.
