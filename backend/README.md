# Rouba Monte: backend

Servidor de jogo em Node.js 24, Socket.io e TypeScript. A arquitetura está em [docs/arquitetura-backend.md](../docs/arquitetura-backend.md) e as medições em [docs/performance.md](../docs/performance.md).

## Desenvolvimento

```bash
pnpm install
```

```bash
pnpm dev
```

Para o mesmo processo servir o frontend, defina `FRONTEND_DIR=../frontend`. O `pnpm dev` lê `backend/.env`, se existir; copie de `.env.example`. A publicação está em [docs/implantacao.md](../docs/implantacao.md).

## Verificação

```bash
pnpm typecheck
```

```bash
pnpm lint
```

```bash
pnpm test:coverage
```

## Docker

Sobe o serviço único com o frontend, limitado a 0,5 CPU e 512 MB:

```bash
docker compose up --build app
```

Sobe também Prometheus (`localhost:9090`) e Grafana (`localhost:3001`):

```bash
docker compose --profile observability up --build
```

Roda o teste de carga contra o contêiner:

```bash
MAX_CONNECTIONS_PER_IP=100000 ROOM_CREATIONS_PER_MINUTE=100000 ROOM_JOINS_PER_MINUTE=100000 docker compose up -d app
```

```bash
ROOM_STEPS=10,50,100 LABEL=capacidade docker compose --profile perf run --rm --no-deps loadtest
```

## Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta pública |
| `METRICS_PORT` | `9464` | Porta interna do Prometheus |
| `PUBLIC_URL` | `http://localhost:3000` | Base do link de convite |
| `CORS_ORIGIN` | vazio | Origens permitidas com o frontend em outro endereço, separadas por vírgula |
| `FRONTEND_DIR` | vazio | Pasta do Next.js servida pelo mesmo processo |
| `TURN_SECONDS` | `60` | Tempo de turno (RN-21) |
| `MATCH_COUNTDOWN_SECONDS` | `3` | Contagem antes da partida. Jogadas só valem depois dela |
| `RECONNECT_GRACE_SECONDS` | `120` | Prazo de reconexão (RF-06) |
| `EMPTY_ROOM_TTL_SECONDS` | `150` | Tempo até apagar sala sem ninguém conectado (RNF-07). Mantenha acima de `RECONNECT_GRACE_SECONDS`, senão a sala some antes do prazo de reconexão |
| `MAX_ROOMS` | `10` | Limite de salas em memória. 10 é o que o plano gratuito sustentou com a meta de 1 s |
| `TRUST_PROXY` | `false` | Lê o IP real em `X-Forwarded-For`. Ligue em Railway, Render ou atrás de qualquer proxy, senão todos os jogadores contam como um só IP |
| `CLIENT_IP_HEADER` | `x-forwarded-for` | Cabeçalho lido primeiro com `TRUST_PROXY` ligado. Use um que o proxy sobrescreva, como `cf-connecting-ip` no Render, porque o cliente pode falsificar o `X-Forwarded-For` |
| `MAX_CONNECTIONS_PER_IP` | `30` | Conexões simultâneas por IP |
| `ROOM_CREATIONS_PER_MINUTE` | `10` | Salas criadas por minuto, por IP |
| `ROOM_JOINS_PER_MINUTE` | `30` | Tentativas de entrar em sala por minuto, por IP. Dificulta adivinhar códigos |
| `LOG_LEVEL` | `info` | Nível de log |
