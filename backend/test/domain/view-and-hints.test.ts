import { describe, expect, it } from "vitest"
import { computeHints } from "../../src/domain/game/hints.js"
import { toPlayerView } from "../../src/domain/game/player-view.js"
import { startGame } from "../../src/domain/game/setup.js"
import { buildGame, meldOf, quadOf, seededRandom } from "../support/game-builder.js"

describe("RN-18 e RNF-04 visibilidade", () => {
  const seats = ["a", "b", "c"].map((id) => ({ id, nickname: id }))
  const started = startGame(seats, "a", seededRandom(5))
  if (!started.ok) throw new Error(started.error)
  const game = started.value

  it("mostra só a mão do próprio jogador", () => {
    const serialized = JSON.stringify(toPlayerView(game, "a"))
    const others = game.players.filter((player) => player.id !== "a")
    for (const card of others.flatMap((player) => player.hand)) {
      expect(serialized).not.toContain(`"${card}"`)
    }
    for (const card of game.players[0]?.hand ?? []) expect(serialized).toContain(`"${card}"`)
  })

  it("nunca revela a ordem do monte", () => {
    const serialized = JSON.stringify(toPlayerView(game, "b"))
    for (const card of game.deck) expect(serialized).not.toContain(`"${card}"`)
  })

  it("mostra o tamanho das mãos e do monte", () => {
    const view = toPlayerView(game, "b")
    expect(view.deckSize).toBe(game.deck.length)
    expect(view.players.map((player) => player.handSize)).toEqual([4, 4, 4])
  })

  it("quem saiu da partida vira espectador sem cartas", () => {
    expect(toPlayerView(game, "ausente").hand).toEqual([])
  })

  it("libera encerrar turno só para o jogador da vez", () => {
    expect(toPlayerView(game, "a").canEndTurn).toBe(true)
    expect(toPlayerView(game, "b").canEndTurn).toBe(false)
  })
})

describe("RF-16 e RF-17 jogadas possíveis", () => {
  const scene = buildGame({
    players: {
      a: { hand: ["5C", "5D", "3C", "KS"] },
      b: { melds: [meldOf("3D", "3H")] },
      c: { melds: [quadOf("7")] },
    },
    table: ["5H", "9C", "9D"],
  })

  it("ordena da melhor para a pior", () => {
    const { plays } = computeHints(toPlayerView(scene, "a"))
    const scores = plays.map((play) => play.score)

    expect(scores).toEqual([...scores].sort((first, second) => second - first))
    expect(plays[0]?.kind).toBe("steal")
    expect(plays.at(-1)?.kind).toBe("discard")
  })

  it("prioriza fechar quadra", () => {
    const withMeld = buildGame({
      players: {
        a: { hand: ["5C", "3C"], melds: [meldOf("5D", "5H", "5S")] },
        b: { melds: [meldOf("3D", "3H")] },
      },
      table: ["9C", "9D", "9H"],
    })

    expect(computeHints(toPlayerView(withMeld, "a")).plays[0]?.kind).toBe("complete")
  })

  it("sugere pegar todas as cartas iguais da mesa", () => {
    const game = buildGame({
      players: { a: { hand: ["5C", "KS"] }, b: {} },
      table: ["5H", "5S", "9C"],
    })
    const { plays, highlights } = computeHints(toPlayerView(game, "a"))

    expect(plays[0]?.action).toEqual({
      type: "takeFromTable",
      tableCards: ["5H", "5S"],
      handCards: ["5C"],
    })
    expect(highlights.tableCards).toEqual(["5H", "5S"])
  })

  it("com um par igual em cada área, sugere pegar o par do outro e fechar", () => {
    const game = buildGame({
      players: {
        a: { hand: ["KS"], melds: [meldOf("7C", "7D")] },
        b: { melds: [meldOf("7H", "7S")] },
      },
      table: ["9C", "9D", "2C"],
    })
    const { plays, highlights } = computeHints(toPlayerView(game, "a"))

    expect(plays[0]).toMatchObject({
      kind: "complete",
      action: { type: "steal", targetId: "b", rank: "7", handCards: [] },
    })
    expect(highlights.stealableMelds).toEqual([{ playerId: "b", rank: "7" }])
  })

  it("destaca cartas da mão, da mesa e quadras roubáveis", () => {
    const { highlights } = computeHints(toPlayerView(scene, "a"))

    expect(highlights.handCards).toEqual(expect.arrayContaining(["5C", "5D", "3C"]))
    expect(highlights.tableCards).toEqual(["5H"])
    expect(highlights.stealableMelds).toEqual([{ playerId: "b", rank: "3" }])
  })

  it("não sugere quadra completa nem ações já usadas", () => {
    const used = {
      ...scene,
      turn: { ...scene.turn, usedActions: ["steal", "discard", "draw"] as const },
    }
    const kinds = computeHints(toPlayerView(used, "a")).plays.map((play) => play.action.type)

    expect(kinds).not.toContain("steal")
    expect(kinds).not.toContain("discard")
    expect(kinds).not.toContain("draw")
  })

  it("depois de comprar, sugere pegar da mesa quando a carta combina", () => {
    const drew = {
      ...scene,
      turn: { ...scene.turn, usedActions: ["draw"] as const },
    }
    const { plays } = computeHints(toPlayerView(drew, "a"))
    const kinds = new Set(plays.map((play) => play.action.type))

    expect(kinds).toEqual(new Set(["takeFromTable", "discard"]))
    expect(plays[0]?.action.type).toBe("takeFromTable")
  })

  it("não sugere abrir quadra com uma carta só", () => {
    const { plays } = computeHints(toPlayerView(scene, "a"))
    expect(plays.some((play) => play.action.type === "layDown" && play.rank === "K")).toBe(false)
  })

  it("não sugere nada fora da vez ou com partida encerrada", () => {
    expect(computeHints(toPlayerView(scene, "b")).plays).toEqual([])
    const finished = { ...scene, endReason: "abandoned" as const }
    expect(computeHints(toPlayerView(finished, "a")).plays).toEqual([])
  })

  it("não sugere comprar com monte vazio", () => {
    const empty = { ...scene, deck: [] }
    const kinds = computeHints(toPlayerView(empty, "a")).plays.map((play) => play.kind)
    expect(kinds).not.toContain("draw")
  })
})

describe("RF-18 alerta de risco", () => {
  it("avisa quantas cartas do valor ainda não apareceram", () => {
    const game = buildGame({
      players: { a: { hand: ["2C"], melds: [meldOf("5C", "5D")] }, b: {} },
      table: ["5H", "9C", "9D"],
    })
    expect(computeHints(toPlayerView(game, "a")).risks).toEqual([
      { rank: "5", cardsInMeld: 2, unseenCards: 1 },
    ])
  })

  it("não avisa quando as cartas restantes já estão visíveis", () => {
    const game = buildGame({
      players: { a: { hand: ["5S"], melds: [meldOf("5C", "5D")] }, b: {} },
      table: ["5H", "9C", "9D"],
    })
    expect(computeHints(toPlayerView(game, "a")).risks).toEqual([])
  })
})

describe("RF-19 contador de cartas", () => {
  it("conta visíveis e faltantes por valor", () => {
    const game = buildGame({
      players: { a: { hand: ["5S"] }, b: { melds: [quadOf("7")] } },
      table: ["5H", "9C", "9D"],
    })
    const { cardCounts } = computeHints(toPlayerView(game, "a"))

    expect(cardCounts).toHaveLength(13)
    expect(cardCounts.find((count) => count.rank === "5")).toEqual({
      rank: "5",
      visible: 2,
      missing: 2,
    })
    expect(cardCounts.find((count) => count.rank === "7")?.missing).toBe(0)
  })
})

describe("RF-20 dicas só com informação pública", () => {
  it("o resultado não muda quando a mão alheia e o monte mudam", () => {
    const base = {
      table: ["9C", "9D", "9H"] as const,
      current: "a",
    }
    const first = buildGame({
      ...base,
      players: { a: { hand: ["5C", "3C"] }, b: { hand: ["5D", "5H", "5S"] } },
      deck: ["KC"],
    })
    const second = buildGame({
      ...base,
      players: { a: { hand: ["5C", "3C"] }, b: { hand: ["2C", "2D", "2H"] } },
      deck: ["QC"],
    })

    expect(computeHints(toPlayerView(first, "a"))).toEqual(computeHints(toPlayerView(second, "a")))
  })
})
