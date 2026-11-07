import { describe, expect, it } from "vitest"

import {
  lobbySeats,
  readiness,
  seatPosition,
  teamOf,
} from "@/lib/game/domain/lobby"
import { buildRoom } from "@/lib/game/domain/test-fixtures"
import type { RoomPlayer } from "@/lib/game/domain/types"

const player = (id: string): RoomPlayer => ({
  id,
  nickname: id.toUpperCase(),
  connected: true,
})

describe("saguão da sala", () => {
  it("senta quem vê a tela primeiro e completa a mesa com lugares livres", () => {
    const room = buildRoom({
      viewerId: "c",
      players: [player("a"), player("b"), player("c")],
    })
    const seats = lobbySeats(room)
    expect(seats).toHaveLength(6)
    expect(
      seats.map((seat) => (seat.kind === "player" ? seat.player.id : "livre"))
    ).toEqual(["c", "a", "b", "livre", "livre", "livre"])
  })

  it("respeita a lotação de cada jogo", () => {
    const room = buildRoom({
      gameId: "tres-trincas",
      players: [player("eu")],
    })
    expect(lobbySeats(room)).toHaveLength(4)
  })

  it("coloca o primeiro lugar embaixo e distribui os demais em volta", () => {
    expect(seatPosition(0, 4)).toEqual({ left: "50%", top: "88%" })
    expect(seatPosition(2, 4)).toEqual({ left: "50%", top: "12%" })
    expect(seatPosition(1, 4)).toEqual({ left: "10%", top: "50%" })
  })

  it("mede quanto falta para o mínimo de jogadores", () => {
    expect(readiness(buildRoom({ players: [player("eu")] }))).toBe(50)
    expect(
      readiness(
        buildRoom({ players: [player("eu"), player("b"), player("c")] })
      )
    ).toBe(100)
  })

  it("descobre o time de cada jogador no Truco", () => {
    const room = buildRoom({
      gameId: "truco-paulista",
      players: [player("eu"), player("b")],
      teams: [["eu"], ["b"]],
    })
    expect(teamOf(room, "b")).toBe(1)
    expect(teamOf(room, "x")).toBeNull()
  })
})
