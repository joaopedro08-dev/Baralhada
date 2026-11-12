# Naipe Real

Site para jogar baralho online com os amigos, no PC ou no celular. Não há cadastro: uma pessoa cria a sala, escolhe o jogo e manda o código ou o link para os outros. Jogue em [naipe-real.vercel.app](https://naipe-real.vercel.app).

| Jogo | Jogadores | Resumo |
| --- | --- | --- |
| Rouba Monte | 2 a 6 | Capture cartas da mesa e roube o monte dos adversários. Vence o maior monte. Turno de 60 s |
| Truco Paulista | 2, 4 ou 6, em times | 40 cartas, manilha pela vira, truco, seis, nove e doze. Vence quem chega a 12 pontos. Jogada de 30 s |
| Três Trincas | 2 a 4 | 52 cartas, 2 como coringa e o valor do vira morto. Compre, descarte e vença baixando 3 trincas primeiro. Vez de 30 s |
| Poker Texas Hold'em | 2 a 6 | 52 cartas e 1000 fichas de mentira, sem limite de aposta e com potes paralelos. Blinds dobram a cada 10 mãos e vence quem ficar com todas as fichas. Vez de 30 s |
| Cacheta | 2 a 4 | 2 baralhos (104 cartas), coringa pelo vira. Feche 9 cartas em trincas e sequências e bata: os outros perdem 1 ponto, ou 2 se for limpo. Vence o último com pontos. Vez de 30 s |
| Blackjack | 1 a 6, inclusive sozinho | 52 cartas e 1000 fichas de mentira, todos contra a banca. Peça, pare, dobre ou divida; blackjack paga 3 para 2. Vence quem tiver mais fichas depois de 10 rodadas. Vez de 30 s |

Cada jogo é um módulo registrado num catálogo; a sala, o tempo real e o relógio são comuns. As regras completas ficam na página `/informacoes`.

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

Para relatar uma falha, veja [SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE)