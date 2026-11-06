export const POKER_RULE_SECTIONS = [
  {
    title: "Objetivo",
    text: "Vence quem ficar com todas as fichas. Jogam de 2 a 6 pessoas, cada uma por si, com 1000 fichas de mentira e um baralho de 52 cartas embaralhado a cada mão. Quem fica sem fichas é eliminado e passa a assistir.",
  },
  {
    title: "Blinds e botão",
    text: "O botão (D) marca quem distribui e passa para o próximo jogador a cada mão. O jogador depois do botão paga a small blind e o seguinte paga a big blind, apostas obrigatórias que começam em 10 e 20 e dobram a cada 5 mãos. Com 2 jogadores, o botão paga a small blind e fala primeiro antes do flop.",
  },
  {
    title: "Uma mão",
    text: "Cada um recebe 2 cartas fechadas, que só ele vê. A mesa abre 5 cartas comuns em 3 etapas: flop (3 cartas), turn (1) e river (1). Antes do flop e depois de cada etapa há uma rodada de apostas. Antes do flop começa o jogador depois da big blind; nas outras rodadas, o primeiro ainda na mão depois do botão.",
  },
  {
    title: "Sua vez",
    text: "Passe quando ninguém apostou, aposte, pague a aposta, aumente ou desista. Não há limite: a aposta mínima é a big blind, o aumento mínimo é o tamanho do último aumento e o máximo é tudo o que você tem (all-in). Os atalhos ½ pote, Pote e All-in preenchem o valor por você.",
  },
  {
    title: "Showdown e potes",
    text: "Se todos desistem menos um, ele leva o pote sem mostrar as cartas. Senão, quem chegou ao fim mostra as cartas e vence o melhor jogo de 5 entre as suas 2 e as 5 da mesa. Quem está all-in só disputa o que conseguiu cobrir; o resto vira um pote paralelo. Empate divide o pote, e a ficha que sobra vai para o primeiro depois do botão.",
  },
  {
    title: "Hierarquia das mãos",
    text: "Da mais fraca para a mais forte: carta alta, par, dois pares, trinca, sequência, flush (5 do mesmo naipe), full house (trinca e par), quadra, straight flush (sequência do mesmo naipe) e royal flush (10, J, Q, K e A do mesmo naipe). O A fecha tanto a sequência mais alta quanto a mais baixa (A, 2, 3, 4, 5). Com o mesmo jogo, desempatam as cartas mais altas (kicker).",
  },
  {
    title: "Tempo e saída",
    text: "Cada vez tem 30 segundos. Se o tempo acabar, o sistema passa se puder; se houver aposta, você desiste da mão. Quem sai no meio da partida desiste da mão e é eliminado. Sobrando 1 jogador, ele vence.",
  },
] as const
