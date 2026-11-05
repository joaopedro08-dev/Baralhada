# Rouba Monte: arquitetura do backend

O backend é um único processo Node.js 24 que mantém todo o estado em memória e fala com o navegador por Socket.io. Ele segue a Arquitetura Limpa: as regras do jogo não conhecem rede, tela, relógio nem aleatoriedade.

O código é dividido em plataforma e jogos. A plataforma cuida de sala, convite, entrada, saída, reconexão, prazo do turno e contagem regressiva, e não sabe qual jogo está rodando. Cada jogo entra por uma interface comum, a `GameRules`. Hoje o único jogo é o Rouba Monte.

Em produção, a tela fica na Vercel e o servidor no Render, como serviços separados. Localmente, o `docker compose` sobe os dois num processo só.

## Camadas

```mermaid
flowchart TB
  subgraph main["main: composição"]
    server["server.ts · app.ts · container.ts · config.ts"]
  end
  subgraph infra["infrastructure: frameworks e drivers"]
    sio["socket.io"]
    next["Next.js"]
    prom["prom-client"]
    pino["pino"]
    repo["repositório em memória"]
    timer["setTimeout · crypto"]
  end
  subgraph adapters["adapters: interface"]
    ctrl["SocketController"]
    notif["SocketNotifier"]
    pres["Presenter · mensagens pt-BR"]
    zod["Schemas Zod"]
  end
  subgraph app["application: casos de uso"]
    uc["CreateRoom · JoinRoom · PlayTurn · ExpireTurn · SweepRooms ..."]
    ports["Portas"]
  end
  subgraph domain["domain: regras puras"]
    rules["turn-actions · turn-flow · hints · player-view · room"]
  end
  main --> infra
  main --> adapters
  infra --> adapters
  adapters --> app
  app --> domain
  infra -. implementa .-> ports
```

| Camada | Pasta | Pode importar | Responsabilidade |
| --- | --- | --- | --- |
| Domínio | `src/domain` | só ela mesma, sem pacotes | Sala e `GameRules` em `room`; regras RN-01 a RN-17, visão por jogador e dicas em `games/rouba-monte` |
| Aplicação | `src/application` | domínio | Casos de uso e portas |
| Adaptadores | `src/adapters` | aplicação, domínio, `zod` | Contrato, validação, tradução para pt-BR |
| Infraestrutura | `src/infrastructure` | camadas internas e bibliotecas | Socket.io, HTTP, Next, métricas, logs, relógio |
| Composição | `src/main` | todas | Monta o grafo e sobe o servidor |

A regra de dependência é verificada em `test/architecture.test.ts`. O mesmo teste reprova qualquer comentário no código e qualquer import de um jogo específico dentro da plataforma.

## Plataforma e jogos

| Parte | Pasta | Conhece o jogo? |
| --- | --- | --- |
| Contrato de um jogo | `src/domain/room/game-rules.ts` | Não. Define o que todo jogo precisa ter |
| Sala, ordem de início | `src/domain/room` | Não |
| Sessão e casos de uso comuns | `src/application/room-session.ts`, `src/application/use-cases` | Não |
| Regras do Rouba Monte | `src/domain/games/rouba-monte` | Sim |
| Dicas do Rouba Monte | `src/application/use-cases/rouba-monte` | Sim |
| Contrato do Socket.io, mensagens e telas | `src/adapters/socket` | Sim, ligado ao Rouba Monte por `game.ts` |
| Escolha do jogo | `src/main/container.ts` | Sim, é onde as regras são ligadas |

A `GameRules` pede limites de jogadores e seis operações: começar, jogar, estourar o tempo, tirar um jogador, dizer de quem é o turno e dizer se a partida acabou. A sala usa esses limites para aceitar ou recusar entradas, e a sessão usa o número do turno para o relógio.

`test/application/second-game.test.ts` prova a separação: um jogo de mentira, a corrida até 5, roda pela mesma sala e pelos mesmos casos de uso, sem nenhuma mudança neles.

### Como adicionar um jogo

1. Criar `src/domain/games/<jogo>` com o estado, as ações e um objeto `GameRules`.
2. Criar a visão por jogador e, se o jogo tiver, as dicas.
3. Criar no adaptador o esquema Zod das ações, o presenter e as mensagens em pt-BR.
4. Ligar as regras no `container.ts`.

O passo 3 ainda é por jogo: o contrato do Socket.io só conhece o Rouba Monte. Rodar dois jogos no mesmo servidor exige escolher o jogo ao criar a sala e despachar `game:action` para o adaptador certo. Isso fica para quando o segundo jogo for escolhido.

## Decisões

| Decisão | Motivo | Alternativa descartada |
| --- | --- | --- |
| Estado imutável no motor | Ação inválida não muda nada (RF-09) | Mutação com rollback manual |
| Carta como texto (`"7H"`) | Comparação e serialização diretas, mensagens pequenas | Objetos com valor e naipe |
| Dicas recebem só `PlayerView` | RF-20 garantido pelo tipo: a função não tem acesso às outras mãos | Filtrar o estado completo |
| Conexão abstraída em `ClientConnection` | Socket.io fica só na infraestrutura | Controller acoplado ao `Socket` |
| Dicas sob demanda (`game:hints`) | Não gasta CPU com quem deixou as dicas desligadas | Calcular a cada atualização |
| Prazo do turno enviado uma vez | O cliente conta o tempo sozinho, sem mensagem por segundo | Enviar o relógio pela rede |
| Métricas em porta interna (9464) | `/metrics` não fica exposto na internet | Rota na porta pública |
| Compressão do WebSocket desligada | Mensagens pequenas não compensam a CPU gasta | `perMessageDeflate` |
| `next()` como custom server | Atende "um `server.ts` sobe os dois" | `output: standalone`, incompatível com custom server |

## Contrato

Todo comando recebe um `ack`: `{ ok: true, data }` ou `{ ok: false, error: { code, message } }`. Os tipos estão em `src/adapters/socket/contract.ts` e a validação em `schemas.ts`.

| Comando | Entrada | Resposta | Requisito |
| --- | --- | --- | --- |
| `room:create` | `{ nickname }` | código, jogador, token, convite | RF-01 |
| `room:join` | `{ code, nickname }` | igual | RF-02 |
| `room:reconnect` | `{ code, nickname, reconnectToken }` | igual | RF-06 |
| `room:leave` | nenhuma | `null` | RN-16 |
| `room:kick` | `{ playerId }` | `null` | RF-05 |
| `game:start` | nenhuma | `null` | RF-04, RF-15 |
| `game:action` | `capture { card, tableCards }`, `stack { card }`, `steal { card, targetId }` ou `discard { card }`. A jogada fecha o turno | `null` | RF-09, RF-10 |
| `game:hints` | nenhuma | jogadas, destaques, risco do monte, contador | RF-16 a RF-19 |

| Evento do servidor | Conteúdo |
| --- | --- |
| `room:state` | Estado da sala e visão da partida daquele jogador, com `version` crescente |
| `room:removed` | `{ reason: "kicked" }` |

| HTTP | Porta | Uso |
| --- | --- | --- |
| `GET /healthz` | 3000 | Processo vivo |
| `GET /readyz` | 3000 | Pronto para receber tráfego |
| `GET /metrics` | 9464 | Prometheus |

O contrato HTTP tem só esses três caminhos sem regra de negócio, então não há coleção Postman nem OpenAPI: o contrato real é o de Socket.io, validado por `test/integration/socket.test.ts`.

## Regras confirmadas

As regras seguem a atualização do documento de requisitos de 2026-11-05: o Rouba-monte tradicional, em que vence quem termina com o maior monte.

| Regra | Como funciona |
| --- | --- |
| Uma jogada por turno (RN-04) | Capturar, pôr no próprio monte, roubar ou descartar fecha o turno na hora. Não existe comprar nem passar a vez |
| Capturar (RN-05) | 1 carta da mão e 1 ou mais cartas de mesmo valor da mesa, à escolha do jogador, vão para o topo do monte dele. A carta da mão fica por cima |
| Pôr no próprio monte (RN-06) | Uma carta da mão igual ao topo vai para cima do monte. Com o monte vazio, a jogada é recusada |
| Roubar (RN-07, RN-08) | A carta da mão vai para cima do monte do adversário, e esse monte inteiro vai para cima do monte de quem roubou. Cada jogada rouba 1 monte |
| Descartar (RN-09) | Sempre permitido, mesmo com captura ou roubo possível |
| Mão vazia (RN-10) | Ao fechar o turno, quem está sem cartas recebe 4 do baralho de compra, ou as que restarem |
| Mesa (RN-11) | Com menos de 3 cartas, a mesa volta a 8 enquanto houver baralho |
| Baralho vazio (RN-12) | Quem está sem cartas tem a vez pulada |
| Fim (RN-13, RN-14) | Ao fechar cada turno, o servidor encerra a partida se todas as mãos estão vazias ou se o baralho acabou e ninguém tem carta para capturar, pôr no monte ou roubar. Vence o maior monte, e os empatados vencem juntos |
| Saída (RN-16) | Mão e monte de quem sai voltam ao baralho, que é embaralhado de novo |
| Tempo (RN-17) | Ao estourar os 60 s, 1 carta aleatória da mão vai para a mesa e o turno fecha |
| Contagem regressiva (RF-24) | A partida começa depois de 3 segundos, contados pelo servidor. O relógio do turno só começa depois dela, e jogadas enviadas antes são recusadas |
| Desfazer (RF-12) | Removido: não sobra ação para desfazer, porque a jogada fecha o turno |
| Entrar na sala (RF-02) | Vale na sala de espera e entre uma partida e outra. Só a partida em andamento recusa a entrada |
| Ordem dos turnos (RN-03) | "Para a direita" é a ordem de entrada na sala: depois do último, volta para o primeiro. Quem sai não muda a ordem dos outros |
| Baralho (seção 8) | Um baralho de 52 cartas para qualquer número de jogadores, de 2 a 6 |
| Limite de salas | `MAX_ROOMS=10` no plano gratuito, o maior número medido que atendeu à meta de 1 s. Decidido em 2026-11-04 |
| Sala vazia (RNF-07) | Quando o último jogador sai pelo botão, a sala é apagada na hora. Sem ninguém conectado, ela é apagada depois de 150 s |

Toda jogada tira 1 carta de alguma mão, e as mãos só recebem cartas do baralho, que só cresce quando alguém sai. Por isso a partida sempre termina, sem precisar reciclar a mesa.

## Decisões onde os requisitos eram omissos

O documento de requisitos do projeto não está neste repositório; os códigos RN, RF e RNF apontam para ele.

| Ponto | Lacuna | O que foi implementado |
| --- | --- | --- |
| Contador e alerta de risco (RF-18, RF-19) | A RN-15 esconde as cartas abaixo do topo, mas todas foram vistas por todos quando entraram no monte | As dicas contam como já vistas as cartas da própria mão, da mesa e de todos os montes, somadas por valor. Nenhuma carta abaixo do topo é enviada ao navegador |
| Ordem da reposição (RN-10, RN-11) | Não há regra | Primeiro as mãos, a partir do jogador seguinte, depois a mesa |
| Reconexão por apelido | Com só o apelido, qualquer um da sala assumiria a mão de quem caiu, contrariando a RNF-04 | Exige apelido e um token entregue ao entrar na sala. O frontend guarda o token no navegador |
| Só 1 jogador restante | Não há regra | A partida encerra por abandono e quem ficou vence. Quem saiu, ou outro amigo, pode entrar de novo na sala |
| Anfitrião sai da sala | Não há regra | O jogador seguinte vira anfitrião |

## Limites de segurança

- Mensagem de até 4 KB, com esquema estrito por comando.
- Até 20 comandos por segundo por conexão, com rajada de 40.
- Até 30 conexões simultâneas, 10 salas novas por minuto e 3 salas abertas ao mesmo tempo por IP. Atrás de proxy, ligue `TRUST_PROXY`.
- Conexão de outro site é recusada: a origem precisa ser o próprio endereço do jogo ou estar em `CORS_ORIGIN`.
- Falha ao servir uma página responde 500 e não derruba o processo nem as salas.
- Código de sala com 6 caracteres de um alfabeto de 32 (cerca de 1 bilhão de combinações).
- Apelido nunca é registrado em log (RNF-11).
- Contêiner sem root, sistema de arquivos somente leitura e sem capabilities.
