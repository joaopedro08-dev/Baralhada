import { describe, expect, it } from "vitest"

import {
  describeResult,
  explainEnd,
  rankPlayers,
} from "@/lib/game/domain/scoreboard"
import { buildGame, buildPlayer } from "@/lib/game/domain/test-fixtures"

describe("placar", () => {
  it("ordena pelo tamanho do monte", () => {
    const ranking = rankPlayers([
      buildPlayer("eu", { pileSize: 3 }),
      buildPlayer("ana", { pileSize: 12 }),
      buildPlayer("bia"),
    ])
    expect(ranking.map((player) => player.id)).toEqual(["ana", "eu", "bia"])
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

describe("motivo do fim", () => {
  it("explica cada forma de terminar", () => {
    expect(explainEnd(buildGame({ endReason: "noPlaysLeft" }))).toContain(
      "O baralho acabou"
    )
    expect(explainEnd(buildGame({ endReason: "handsEmpty" }))).toContain(
      "Todas as cartas"
    )
    expect(explainEnd(buildGame({ endReason: "abandoned" }))).toContain(
      "saíram"
    )
    expect(explainEnd(buildGame())).toBeNull()
  })
})
