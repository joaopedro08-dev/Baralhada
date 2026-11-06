import { describe, expect, it } from "vitest"
import { trucoRules } from "../../src/domain/games/truco/rules.js"
import { roubaMonteRules } from "../../src/domain/games/rouba-monte/rules.js"
import { createGameCatalog } from "../../src/domain/room/game-catalog.js"
import { acceptsPlayerCount, maxPlayersOf } from "../../src/domain/room/game-rules.js"
import {
  addPlayer,
  createRoom,
  dropPlayer,
  startProblemOf,
  switchGame,
} from "../../src/domain/room/room.js"
import type { Room, RoomPlayer } from "../../src/domain/room/room.js"
import {
  areTeamsBalanced,
  drawTeams,
  lockTeams,
  moveToTeam,
  teamOf,
  teamsOf,
} from "../../src/domain/room/teams.js"
import { seededRandom } from "../support/game-builder.js"

const player = (id: string): RoomPlayer => ({
  id,
  nickname: id,
  reconnectToken: `token-${id}`,
  connected: true,
  disconnectedAt: null,
})

const trucoRoom = (...ids: string[]): Room =>
  ids.slice(1).reduce(
    (room, id) => {
      const joined = addPlayer(room, player(id), trucoRules)
      if (!joined.ok) throw new Error(joined.error)
      return joined.value
    },
    createRoom(`SALA${ids.length}`, trucoRules.id, player(ids[0] as string))
  )

describe("RF-25 catálogo de jogos", () => {
  it("lista os jogos e usa o primeiro como padrão", () => {
    const catalog = createGameCatalog([roubaMonteRules, trucoRules])
    expect(catalog.defaultGameId).toBe("rouba-monte")
    expect(catalog.find("truco-paulista")).toBe(trucoRules)
    expect(catalog.find("xadrez")).toBeUndefined()
    expect(catalog.games.map((game) => game.id)).toEqual(["rouba-monte", "truco-paulista"])
  })

  it("recusa catálogo vazio ou com jogo repetido", () => {
    expect(() => createGameCatalog([])).toThrow()
    expect(() => createGameCatalog([trucoRules, trucoRules])).toThrow()
  })

  it("cada jogo traz o número de jogadores aceito", () => {
    expect(maxPlayersOf(roubaMonteRules)).toBe(6)
    expect(acceptsPlayerCount(roubaMonteRules, 3)).toBe(true)
    expect(acceptsPlayerCount(trucoRules, 3)).toBe(false)
    expect(acceptsPlayerCount(trucoRules, 4)).toBe(true)
  })

  it("trocar de jogo descarta a partida anterior e os times", () => {
    const room = { ...moveToTeam(trucoRoom("a", "b"), "a", 1, 2), game: { qualquer: true } }
    const switched = switchGame(room, "rouba-monte")
    expect(switched).toMatchObject({ gameId: "rouba-monte", game: null, teamAssignments: null })
    expect(switchGame(switched, "rouba-monte")).toBe(switched)
  })
})

describe("TR-RN-01 e TR-RF-09 formação dos times", () => {
  it("sem mudança, vale a ordem de entrada alternando", () => {
    const room = trucoRoom("a", "b", "c", "d")
    expect(teamsOf(room, 2)).toEqual([
      ["a", "c"],
      ["b", "d"],
    ])
    expect(teamOf(room, "d", 2)).toBe(1)
    expect(teamOf(room, "x", 2)).toBeNull()
  })

  it("o anfitrião move jogadores e quem entra depois vai para o time menor", () => {
    const moved = moveToTeam(trucoRoom("a", "b", "c"), "c", 1, 2)
    expect(teamsOf(moved, 2)).toEqual([["a"], ["b", "c"]])
    const joined = addPlayer(moved, player("d"), trucoRules)
    if (!joined.ok) throw new Error(joined.error)
    expect(teamsOf(joined.value, 2)).toEqual([
      ["a", "d"],
      ["b", "c"],
    ])
  })

  it("o sorteio forma times do mesmo tamanho com todos os jogadores", () => {
    const drawn = drawTeams(trucoRoom("a", "b", "c", "d", "e", "f"), 2, seededRandom(5))
    const teams = teamsOf(drawn, 2)
    expect(teams.map((team) => team.length)).toEqual([3, 3])
    expect(teams.flat().sort()).toEqual(["a", "b", "c", "d", "e", "f"])
  })

  it("quem sai deixa o time, e times desiguais bloqueiam o início", () => {
    const moved = moveToTeam(trucoRoom("a", "b", "c", "d"), "d", 0, 2)
    expect(areTeamsBalanced(moved, 2)).toBe(false)
    expect(startProblemOf(moved, trucoRules)).toBe("TEAMS_UNBALANCED")
    const left = dropPlayer(moved, "d", null, 0)
    expect(left.teamAssignments).not.toHaveProperty("d")
    expect(teamsOf(left, 2)).toEqual([["a", "c"], ["b"]])
  })

  it("com 3 ou 5 jogadores o início fica bloqueado", () => {
    expect(startProblemOf(trucoRoom("a", "b", "c"), trucoRules)).toBe("NOT_ENOUGH_PLAYERS")
    expect(startProblemOf(trucoRoom("a", "b", "c", "d", "e"), trucoRules)).toBe(
      "NOT_ENOUGH_PLAYERS"
    )
    expect(startProblemOf(trucoRoom("a", "b"), trucoRules)).toBeNull()
    expect(startProblemOf(trucoRoom("a", "b", "c", "d", "e", "f"), trucoRules)).toBeNull()
  })

  it("os times ficam fixos depois do início, mesmo se alguém sair", () => {
    const locked = lockTeams(trucoRoom("a", "b", "c", "d"), 2)
    const left = dropPlayer(locked, "b", null, 0)
    expect(teamsOf(left, 2)).toEqual([["a", "c"], ["d"]])
  })

  it("sala sem times ignora a formação", () => {
    const room = createRoom("SALA", roubaMonteRules.id, player("a"))
    expect(dropPlayer(room, "a", null, 0).teamAssignments).toBeNull()
  })
})
