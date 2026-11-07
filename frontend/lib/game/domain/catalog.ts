import type { Card, GameId, RoomState } from "@/lib/game/domain/types"

export interface GameInfo {
  readonly id: GameId
  readonly name: string
  readonly tagline: string
  readonly playerCounts: readonly number[]
  readonly teamCount: number | null
  readonly deck: string
  readonly turnSeconds: number
  readonly mode: string
  readonly highlights: readonly string[]
  readonly sample: readonly Card[]
  readonly rulesAnchor: string
}

export const GAMES: readonly GameInfo[] = [
  {
    id: "rouba-monte",
    name: "Rouba Monte",
    tagline: "Capture cartas, roube o monte dos amigos e termine com o maior.",
    playerCounts: [2, 3, 4, 5, 6],
    teamCount: null,
    deck: "52 cartas",
    turnSeconds: 60,
    mode: "Cada um por si",
    highlights: [
      "Capture cartas iguais às da mesa",
      "Roube o monte de quem tem a mesma carta no topo",
      "Vence quem termina com o maior monte",
    ],
    sample: ["7C", "KH", "AS"],
    rulesAnchor: "regras-rouba-monte",
  },
  {
    id: "truco-paulista",
    name: "Truco Paulista",
    tagline: "Duplas ou trios, manilha pela vira e truco até 12 pontos.",
    playerCounts: [2, 4, 6],
    teamCount: 2,
    deck: "40 cartas, sem 8, 9 e 10",
    turnSeconds: 30,
    mode: "Em times",
    highlights: [
      "A manilha muda a cada mão, de acordo com a vira",
      "Peça truco, seis, nove e doze para blefar ou pressionar",
      "Vence o time que chega primeiro a 12 pontos",
    ],
    sample: ["4C", "7H", "3D"],
    rulesAnchor: "regras-truco",
  },
  {
    id: "tres-trincas",
    name: "Três Trincas",
    tagline: "Compre, descarte e baixe 3 trincas antes de todo mundo.",
    playerCounts: [2, 3, 4],
    teamCount: null,
    deck: "52 cartas, 2 como coringa",
    turnSeconds: 30,
    mode: "Cada um por si",
    highlights: [
      "O 2 é coringa e completa qualquer trinca",
      "O valor do vira fica morto na partida",
      "Vence quem baixar 3 trincas primeiro",
    ],
    sample: ["9C", "9H", "2D"],
    rulesAnchor: "regras-tres-trincas",
  },
  {
    id: "poker-texas-holdem",
    name: "Poker Texas Hold'em",
    tagline: "Fichas de mentira, blefe de verdade: fique com todas as fichas.",
    playerCounts: [2, 3, 4, 5, 6],
    teamCount: null,
    deck: "52 cartas, 1000 fichas",
    turnSeconds: 30,
    mode: "Eliminação",
    highlights: [
      "Duas cartas suas e cinco na mesa formam o seu jogo",
      "Sem limite: aposte, aumente ou vá all-in",
      "As blinds dobram a cada 10 mãos e vence quem ficar com tudo",
    ],
    sample: ["AS", "KS", "QH"],
    rulesAnchor: "regras-poker",
  },
  {
    id: "cacheta",
    name: "Cacheta",
    tagline:
      "Feche a mão em trincas e sequências, bata e tire pontos de todos.",
    playerCounts: [2, 3, 4],
    teamCount: null,
    deck: "2 baralhos, 104 cartas",
    turnSeconds: 30,
    mode: "Eliminação",
    highlights: [
      "O valor seguinte ao vira vira coringa a cada rodada",
      "Bata com 9 cartas em jogos e descarte a 10ª",
      "Bater limpo, sem coringa, tira 2 pontos de cada um",
    ],
    sample: ["4S", "5S", "6S"],
    rulesAnchor: "regras-cacheta",
  },
  {
    id: "blackjack",
    name: "Blackjack",
    tagline:
      "Todos contra a banca: chegue a 21 sem passar e saia com mais fichas.",
    playerCounts: [1, 2, 3, 4, 5, 6],
    teamCount: null,
    deck: "52 cartas, 1000 fichas",
    turnSeconds: 30,
    mode: "Contra a banca",
    highlights: [
      "Dá para jogar sozinho contra a banca",
      "Peça, pare, dobre ou divida o par",
      "Blackjack paga 3 para 2 e vence quem tiver mais fichas em 10 rodadas",
    ],
    sample: ["AS", "KH", "7D"],
    rulesAnchor: "regras-blackjack",
  },
]

export const DEFAULT_GAME_ID: GameId = "rouba-monte"

export const gameInfo = (gameId: GameId): GameInfo =>
  GAMES.find((game) => game.id === gameId) ?? (GAMES[0] as GameInfo)

export const maxPlayersOf = (game: GameInfo): number =>
  Math.max(...game.playerCounts)

export const describePlayerCounts = ({ playerCounts }: GameInfo): string => {
  const first = playerCounts[0] ?? 0
  const last = playerCounts.at(-1) ?? 0
  const consecutive = last - first + 1 === playerCounts.length
  if (consecutive) return `${first} a ${last} jogadores`
  return `${playerCounts.slice(0, -1).join(", ")} ou ${last} jogadores`
}

export const describeStartProblem = (room: RoomState): string | null => {
  const game = gameInfo(room.gameId)
  if (room.startProblem === "TEAMS_UNBALANCED") {
    return "Os times precisam ter o mesmo número de jogadores."
  }
  if (room.startProblem !== "NOT_ENOUGH_PLAYERS") return null
  const accepted = `${game.name} aceita ${describePlayerCounts(game)}.`
  const next = game.playerCounts.find((count) => count > room.players.length)
  if (next === undefined) return accepted
  const missing = next - room.players.length
  return missing === 1
    ? `Falta 1 jogador para começar. ${accepted}`
    : `Faltam ${missing} jogadores para começar. ${accepted}`
}
