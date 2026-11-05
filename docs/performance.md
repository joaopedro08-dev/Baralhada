# Rouba Monte: performance e capacidade

Medido em 2026-11-03. Um servidor de 0,5 CPU e 512 MB segura 200 salas com 6 jogadores (20 vezes a meta da RNF-06), com cada ação chegando a todos em 711 ms no p95. A meta de 1 s estoura entre 200 e 400 salas.

## Como foi medido

- **Servidor:** imagem de produção com Next.js e Socket.io no mesmo processo.
- **Máquina:** Docker Desktop no Windows 11, com 2 CPUs e 4 GB na VM.
- **Carga:** bots com Socket.io real, em outro contêiner, jogando por dicas e pedindo jogada a cada 1 s.
- **Latência de broadcast:** do envio do comando até cada outro jogador da sala receber o novo estado.

Limites desta medição:

- Servidor e gerador dividem a mesma VM, sem latência de internet. Em produção, some o tempo de rede.
- Cada cenário rodou uma vez, em um notebook. Trate os números como ordem de grandeza.

## RNF-06: 10 salas com 6 jogadores em 0,5 CPU

| Métrica | Resultado | Meta |
| --- | --- | --- |
| Broadcast p50 | 3,8 ms | |
| Broadcast p95 | 16 ms | até 1 s |
| Broadcast p99 | 29 ms | |
| Maior broadcast | 45 ms | |
| CPU do processo | 8,6% de 1 núcleo | |
| Memória (RSS) | 142 MB de 512 MB | |

## Capacidade

Cada etapa teve 45 s de medição, depois de 10 s de estabilização.

| CPU | Salas | Jogadores | Mensagens/s | Broadcast p50 | Broadcast p95 | Broadcast p99 | CPU | RSS | Meta de 1 s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0,5 | 50 | 300 | 257 | 3 ms | 59 ms | 195 ms | 25% | 155 MB | Atende |
| 0,5 | 100 | 600 | 496 | 6 ms | 158 ms | 303 ms | 36% | 166 MB | Atende |
| 0,5 | 200 | 1.200 | 737 | 101 ms | 711 ms | 1.100 ms | 48% | 184 MB | Atende |
| 0,5 | 400 | 2.400 | 743 | 607 ms | 2.411 ms | 2.801 ms | 49% | 215 MB | Falha |
| 1,0 | 100 | 600 | 522 | 3 ms | 40 ms | 108 ms | 37% | 164 MB | Atende |
| 1,0 | 200 | 1.200 | 996 | 6 ms | 127 ms | 380 ms | 62% | 186 MB | Atende |
| 1,0 | 400 | 2.400 | 1.746 | 31 ms | 357 ms | 593 ms | 88% | 224 MB | Atende |

- **Gargalo:** é a CPU. A memória fica folgada, com cerca de 185 KB por sala ocupada.
- **Escala vertical:** com 1 CPU a vazão chegou a 1.746 mensagens por segundo, contra o teto de cerca de 740 com 0,5 CPU.
- **Sob sobrecarga:** o serviço fica lento, mas nenhuma etapa de capacidade teve recusa nem timeout de ack.

## Plano gratuito do Render (0,1 CPU)

Medido em 2026-11-04 com a mesma imagem, limitada a 0,1 CPU, em etapas de 45 s. A meta de 1 s no p95 vale até 10 salas com estes bots.

| Salas | Jogadores | Comandos/s | Broadcast p95 | Broadcast p99 | Meta de 1 s |
| --- | --- | --- | --- | --- | --- |
| 5 | 30 | 8,3 | 696 ms | 2.698 ms | Atende |
| 10 | 60 | 14,7 | 591 ms | 1.897 ms | Atende |
| 20 | 120 | 22,9 | 1.309 ms | 2.504 ms | Falha |
| 40 | 240 | 11,5 | 6.056 ms | 9.385 ms | Falha |

- **Picos:** mesmo com poucas salas, o p99 passa de 1 s. Com 0,1 CPU, o processo fica pausado boa parte do tempo, então espere travadas curtas ocasionais.
- **Bots contra pessoas:** cada sala de bots gerou de 1 a 2 comandos por segundo. Pessoas jogam bem mais devagar, então o limite real deve ser maior, mas isso é estimativa, não medição.
- **Limite no Render:** o `render.yaml` usa `MAX_ROOMS=10`, o maior número medido que atendeu à meta de 1 s no p95. Decidido em 2026-11-04. Suba o limite só depois de medir no próprio Render ou trocar de plano.
- **Medição conservadora:** a imagem inclui o Next.js no mesmo processo, e no Render o servidor roda sem ele.

## Partidas completas pela rede

Em 10 salas com 6 jogadores e 25 ms entre ações, 58 partidas terminaram em 75 s, sem erro interno nem timeout. O p95 de broadcast foi de 153 ms, com pico de 1,12 s.

As 58 recusas `GAME_NOT_RUNNING` vêm dos bots pedindo dica logo depois do fim da partida: exatamente uma por partida.

## Motor de regras

Medido em 1 thread na máquina de desenvolvimento, sem limite de CPU.

| Operação | Operações/s | Tempo |
| --- | --- | --- |
| Visão de um jogador | 1.675.752 | 0,6 µs |
| Aplicar uma ação | 559.032 | 1,8 µs |
| Embaralhar e distribuir | 54.913 | 18 µs |
| Calcular dicas | 24.038 | 42 µs |
| Montar e serializar estado para 6 jogadores | 13.815 | 72 µs |
| Partida inteira | 233 | 4,3 ms |

O motor não é o gargalo: montar o estado da sala leva 72 µs. O custo dominante está fora dele, provavelmente no envio por WebSocket. Um perfil de CPU confirmaria isso.

O estado enviado a cada jogador tem cerca de 1 KB no início da partida e cresce com o histórico, limitado a 50 frases.

## Limpeza de salas (RNF-07)

Medido em 2026-11-04 com `MAX_ROOMS=10`, no build de produção. Com o prazo antigo de 10 min, uma pessoa ocupou as 10 vagas em 27 s, e as salas abandonadas prendiam as vagas: a 11ª sala só entrou entre 591 s e 622 s depois de as abas fecharem.

Com a correção:

| Situação | Vaga liberada |
| --- | --- |
| O último jogador clica em "Sair da sala" | Na hora |
| Todos fecham a aba | Entre 146 s e 157 s depois |

O prazo de 150 s fica acima dos 120 s de reconexão, então quem cai ainda consegue voltar. Para quem mantém salas abertas de propósito, `MAX_ROOMS_PER_IP=3` limita cada IP a 3 das 10 vagas. Quem usa vários IPs ainda consegue ocupar todas.

## O que as medições encontraram

| Achado | Efeito | Ação |
| --- | --- | --- |
| O healthcheck abria um processo Node a cada 15 s, consumindo a cota de 0,5 CPU e chegando a marcar o contêiner como `unhealthy` | Em 10 salas, o p99 caiu de 323 ms para 29 ms. Em 200 salas, o p95 caiu de 1.056 ms para 711 ms e passou a atender a meta | Trocado por `wget` |
| Quem criava ou entrava na sala não recebia o primeiro estado | Tela sem dados até a próxima atualização | Corrigido e coberto por teste |

Na comparação do healthcheck, cada lado teve uma única rodada, então parte da diferença pode ser ruído.

## Ocorrências durante os testes

O notebook entrou em suspensão várias vezes (17:17, 18:16, 20:31 e 20:35). Isso congela a VM do Docker. As rodadas atingidas foram descartadas e repetidas.

Uma rodada de partidas às 20:39 teve 10 timeouts de ack e paradas de 5,8 s e 8,7 s no event loop, sem evento de energia registrado nesse intervalo. A mesma carga e a mesma imagem, repetidas às 20:43 com vigias no Windows e na VM, não tiveram nenhum timeout. O Prometheus teve lacunas de 46 s e 54 s pouco antes, o que sugere congelamento da máquina, mas a causa não foi provada. Vale observar esse sinal num servidor real.

## Frontend

Medido em 2026-11-04 com a tela do jogo pronta.

| Métrica | Resultado |
| --- | --- |
| Transferência total | 348 KB |
| Estimativa em 4G (1,6 Mbps, 150 ms de RTT) | 2,38 s, meta de 3 s |

A estimativa é um cálculo a partir do tamanho transferido, não uma medição em rede 4G real. As animações ficam em um arquivo de cerca de 137 KB, baixado em segundo plano depois que a página abre.

## Imagem Docker

A imagem tem 1,08 GB, dos quais 600 MB são o `node_modules` do frontend. O próprio Next representa 209 MB, e o compilador SWC, 94 MB. O backend ocupa só 22 MB de dependências. Mover `shadcn` para `devDependencies` tira do contêiner ferramentas que só servem no desenvolvimento, como o `ts-morph`; o ganho não foi medido.

## Plano de escala

| Situação | Ação |
| --- | --- |
| Até 200 salas simultâneas | 0,5 CPU e 512 MB bastam |
| Até 400 salas simultâneas | Subir para 1 CPU |
| Acima de 400 salas | Dividir por código de sala: várias instâncias, com o proxy encaminhando cada código sempre para a mesma |

A divisão entre instâncias não foi construída porque o escopo é de amigos e a RNF-06 pede 10 salas. O estado em memória continua sendo um limite aceito pelo documento de requisitos: reiniciar o servidor perde as partidas.

`MAX_ROOMS` vale 10 por padrão, o mesmo do plano gratuito. Em 0,5 CPU, dá para usar 200 e recusar salas novas antes de degradar as partidas em andamento.

## Como repetir

Desative a suspensão do computador antes de rodar. Suba o app com `MAX_ROOMS` acima do maior passo, senão as salas extras são recusadas.

```bash
ROOM_STEPS=10 STEP_SECONDS=60 LABEL=rnf06 docker compose --profile perf run --rm --no-deps loadtest
```

```bash
ROOM_STEPS=50,100,200,400 STEP_SECONDS=45 LABEL=capacidade docker compose --profile perf run --rm --no-deps loadtest
```

```bash
APP_CPUS=1 MAX_ROOMS=1000 MAX_ROOMS_PER_IP=100000 MAX_CONNECTIONS_PER_IP=100000 ROOM_CREATIONS_PER_MINUTE=100000 ROOM_JOINS_PER_MINUTE=100000 docker compose up -d app
```

Os resultados ficam em `backend/perf/results`. Para acompanhar ao vivo, suba o perfil `observability` e abra o painel em `localhost:3001`.
