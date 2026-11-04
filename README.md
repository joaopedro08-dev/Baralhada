# Rouba Monte

Jogo de cartas online para 2 a 6 amigos, no PC ou no celular. Não há cadastro: uma pessoa cria a sala e manda o código ou o link para os outros.

O objetivo é fechar quadras, 4 cartas do mesmo valor. Vence quem tiver mais quando as 13 quadras estiverem fechadas. Cada turno tem 1 jogada e 60 segundos, e as regras completas ficam na página `/informacoes` do jogo.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| [`backend`](backend/README.md) | Servidor do jogo em Node.js 24, Socket.io e TypeScript. Guarda o estado em memória e confere cada jogada |
| [`frontend`](frontend/README.md) | Interface em Next.js, shadcn/ui, framer-motion e GSAP. Mostra o estado que o servidor envia |
| `infra` | Prometheus e Grafana para observar o serviço |
| `docs` | Arquitetura, medições de desempenho e implantação |

## Rodar localmente

O caminho mais simples precisa só do Docker. Um único serviço entrega a tela e o jogo em `http://localhost:3000`:

```bash
docker compose up --build app
```

Para desenvolver, instale as dependências com pnpm e copie os arquivos de exemplo de cada pasta:

```bash
cp backend/.env.example backend/.env
```

```bash
cp frontend/.env.example frontend/.env.local
```

```bash
pnpm --dir backend install
```

```bash
pnpm --dir frontend install
```

Depois rode cada comando em um terminal. A tela abre em `http://localhost:3000` e o servidor fica em `http://localhost:4000`:

```bash
pnpm --dir backend dev
```

```bash
pnpm --dir frontend dev
```

## Verificação

Cada pasta tem os mesmos comandos. Troque `backend` por `frontend` para verificar a outra:

```bash
pnpm --dir backend typecheck
```

```bash
pnpm --dir backend lint
```

```bash
pnpm --dir backend test
```

## Implantação

O backend vai para o Render (`render.yaml`) e o frontend para a Vercel (`frontend/vercel.json`). A ordem dos passos e as variáveis estão em [docs/implantacao.md](docs/implantacao.md).

## Documentação

- [Arquitetura do backend](docs/arquitetura-backend.md), com o contrato do Socket.io e as regras confirmadas
- [Desempenho](docs/performance.md)
- [Implantação](docs/implantacao.md)

## Licença

[MIT](LICENSE)
