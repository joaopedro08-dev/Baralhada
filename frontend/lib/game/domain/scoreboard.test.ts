import { describe, expect, it } from "vitest"

import { describeResult, rankPlayers } from "@/lib/game/domain/scoreboard"
import { buildGame, buildPlayer } from "@/lib/game/domain/test-fixtures"
import type { GamePlayer } from "@/lib/game/domain/types"

const withQuad = (id: string): GamePlayer =>
  buildPlayer(id, { melds: [{ rank: "7", cards: ["7C", "7D", "7H", "7S"] }] })

describe("placar", () => {
  it("ordena por quadras completas", () => {
    const ranking = rankPlayers([buildPlayer("eu"), withQuad("ana")])
    expect(ranking.map((player) => player.id)).toEqual(["ana", "eu"])
  })

  it("ignora quadra incompleta", () => {
    const partial = buildPlayer("eu", {
      melds: [{ rank: "7", cards: ["7C", "7D", "7H"] }],
    })
    const ranking = rankPlayers([partial, withQuad("ana")])
    expect(ranking[0]?.id).toBe("ana")
  })
})

describe("título do resultado", () => {
  it("parabeniza quem venceu", () => {
    expect(describeResult(buildGame({ winnerIds: ["eu"] }), "eu")).toBe(
      "Você venceu!"
    )
  })

  it("nomeia o vencedor para os outros", () => {
    expect(describeResult(buildGame({ winnerIds: ["ana"] }), "eu")).toBe(
      "ANA venceu"
    )
  })

  it("lista os empatados", () => {
    const game = buildGame({
      players: [buildPlayer("eu"), buildPlayer("ana"), buildPlayer("bia")],
      winnerIds: ["eu", "ana", "bia"],
    })
    expect(describeResult(game, "eu")).toBe(
      "Você empatou! Vencem EU, ANA e BIA"
    )
    expect(describeResult(game, "caio")).toBe("Empate: vencem EU, ANA e BIA")
  })

  it("mantém o resultado para quem entrou depois da partida", () => {
    const game = buildGame({ winnerIds: ["ana"] })
    expect(describeResult(game, "recem-chegado")).toBe("ANA venceu")
  })
})
