import { describe, expect, it } from "vitest"
import {
  addPlayer,
  canStart,
  createRoom,
  dropPlayer,
  hostIdOf,
  markDisconnected,
  markReconnected,
  statusOf,
} from "../../src/domain/room/room.js"
import type { Room, RoomPlayer } from "../../src/domain/room/room.js"
import type { Game } from "../../src/domain/games/rouba-monte/model.js"
import { roubaMonteRules as rules } from "../../src/domain/games/rouba-monte/rules.js"
import { buildGame } from "../support/game-builder.js"

const player = (id: string, nickname = id): RoomPlayer => ({
  id,
  nickname,
  reconnectToken: `token-${id}`,
  connected: true,
  disconnectedAt: null,
})

const roomWith = (...ids: string[]): Room<Game> =>
  ids.slice(1).reduce(
    (room, id) => {
      const joined = addPlayer(room, player(id), rules)
      if (!joined.ok) throw new Error(joined.error)
      return joined.value
    },
    createRoom<Game>("ABC234", rules.id, player(ids[0] as string))
  )

describe("RF-02 entrada na sala", () => {
  it("recusa sala cheia", () => {
    const room = roomWith("a", "b", "c", "d", "e", "f")
    expect(addPlayer(room, player("g"), rules)).toEqual({ ok: false, error: "ROOM_FULL" })
  })

  it("recusa apelido repetido ignorando caixa e espaços", () => {
    const room = roomWith("Ana")
    expect(addPlayer(room, player("x", " ana "), rules)).toEqual({
      ok: false,
      error: "NICKNAME_TAKEN",
    })
  })

  it("recusa entrada com a partida em andamento", () => {
    const room = { ...roomWith("a", "b"), game: buildGame({ players: { a: {}, b: {} } }) }
    expect(addPlayer(room, player("c"), rules)).toEqual({
      ok: false,
      error: "GAME_ALREADY_STARTED",
    })
  })

  it("aceita entrada depois que a partida terminou", () => {
    const finished = {
      ...buildGame({ players: { a: {}, b: {} } }),
      endReason: "abandoned" as const,
    }
    const joined = addPlayer({ ...roomWith("a"), game: finished }, player("b"), rules)
    expect(joined.ok).toBe(true)
  })
})

describe("RF-04 início", () => {
  it("só libera com 2 a 6 jogadores", () => {
    expect(canStart(roomWith("a"), rules)).toBe(false)
    expect(canStart(roomWith("a", "b"), rules)).toBe(true)
    expect(canStart(roomWith("a", "b", "c", "d", "e", "f"), rules)).toBe(true)
  })

  it("não libera com partida em andamento", () => {
    const room = { ...roomWith("a", "b"), game: buildGame({ players: { a: {}, b: {} } }) }
    expect(statusOf(room, rules)).toBe("playing")
    expect(canStart(room, rules)).toBe(false)
  })

  it("libera jogar de novo depois do fim (RF-15)", () => {
    const game = { ...buildGame({ players: { a: {}, b: {} } }), endReason: "abandoned" as const }
    const room = { ...roomWith("a", "b"), game }
    expect(statusOf(room, rules)).toBe("finished")
    expect(canStart(room, rules)).toBe(true)
  })
})

describe("anfitrião", () => {
  it("é o primeiro jogador e passa para o seguinte quando ele sai", () => {
    const room = roomWith("a", "b")
    expect(hostIdOf(room)).toBe("a")
    expect(hostIdOf(dropPlayer(room, "a", null, 0))).toBe("b")
  })

  it("não existe em sala vazia", () => {
    expect(hostIdOf(dropPlayer(roomWith("a"), "a", null, 0))).toBeNull()
  })
})

describe("RNF-07 sala vazia", () => {
  it("marca quando o último jogador desconecta", () => {
    const room = markDisconnected(markDisconnected(roomWith("a", "b"), "a", 100), "b", 200)
    expect(room.emptySince).toBe(200)
  })

  it("mantém a primeira marca se alguém sai depois", () => {
    const room = markDisconnected(roomWith("a"), "a", 100)
    expect(dropPlayer(room, "a", null, 500).emptySince).toBe(100)
  })

  it("limpa quando alguém volta", () => {
    const room = markDisconnected(roomWith("a"), "a", 100)
    const back = markReconnected(room, "a", 200)
    expect(back.emptySince).toBeNull()
    expect(back.players[0]?.connected).toBe(true)
    expect(back.players[0]?.disconnectedAt).toBeNull()
  })

  it("limpa quando alguém novo entra", () => {
    const room = dropPlayer(roomWith("a"), "a", null, 100)
    const joined = addPlayer(room, player("b"), rules)
    expect(joined.ok && joined.value.emptySince).toBeNull()
  })
})
