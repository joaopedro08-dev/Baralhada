import { describe, expect, it } from "vitest"

import {
  describePlayerCounts,
  describeStartProblem,
  gameInfo,
  GAMES,
  maxPlayersOf,
} from "@/lib/game/domain/catalog"
import { buildRoom } from "@/lib/game/domain/test-fixtures"
import type { RoomPlayer } from "@/lib/game/domain/types"

const players = (count: number): readonly RoomPlayer[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    connected: true,
  }))

describe("RF-25 catálogo de jogos", () => {
  it("lista os três jogos com o número de jogadores", () => {
    expect(GAMES.map((game) => game.id)).toEqual([
      "rouba-monte",
      "truco-paulista",
      "tres-trincas",
    ])
    expect(describePlayerCounts(gameInfo("tres-trincas"))).toBe(
      "2 a 4 jogadores"
    )
    expect(describePlayerCounts(gameInfo("rouba-monte"))).toBe(
      "2 a 6 jogadores"
    )
    expect(describePlayerCounts(gameInfo("truco-paulista"))).toBe(
      "2, 4 ou 6 jogadores"
    )
    expect(maxPlayersOf(gameInfo("truco-paulista"))).toBe(6)
  })

  it("explica por que a partida não pode começar", () => {
    expect(describeStartProblem(buildRoom({ players: players(1) }))).toBe(
      "Falta 1 jogador para começar. Rouba Monte aceita 2 a 6 jogadores."
    )
    expect(
      describeStartProblem(
        buildRoom({ gameId: "truco-paulista", players: players(3) })
      )
    ).toBe(
      "Falta 1 jogador para começar. Truco Paulista aceita 2, 4 ou 6 jogadores."
    )
    expect(
      describeStartProblem(
        buildRoom({
          gameId: "truco-paulista",
          players: players(4),
          startProblem: "TEAMS_UNBALANCED",
        })
      )
    ).toBe("Os times precisam ter o mesmo número de jogadores.")
    expect(describeStartProblem(buildRoom({ startProblem: null }))).toBeNull()
  })
})
