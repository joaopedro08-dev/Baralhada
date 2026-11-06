import { describe, expect, it } from "vitest"
import {
  describeSuggestion,
  describeTrucoEvent,
  describeTrucoHistory,
  namesOf,
  stakeName,
  TRUCO_ERRORS,
} from "../../src/adapters/socket/games/truco/messages.js"
import { trucoAdapter } from "../../src/adapters/socket/games/truco/adapter.js"
import { playTruco } from "../../src/domain/games/truco/actions.js"
import type { TrucoAction } from "../../src/domain/games/truco/actions.js"
import { computeTrucoHints } from "../../src/domain/games/truco/hints.js"
import type { TrucoEvent, TrucoGame } from "../../src/domain/games/truco/model.js"
import { toTrucoView } from "../../src/domain/games/truco/player-view.js"
import { dealHand } from "../../src/domain/games/truco/setup.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { buildTruco, duel, foursome } from "../support/truco-builder.js"

const random = seededRandom(3)
const act = (game: TrucoGame, playerId: string, action: TrucoAction) =>
  unwrap(playTruco(game, playerId, action, random))
const hintsOf = (game: TrucoGame, viewerId: string) =>
  computeTrucoHints(toTrucoView(game, viewerId))
const firstAdvice = (game: TrucoGame, viewerId: string) =>
  hintsOf(game, viewerId).suggestions[0]?.advice

describe("TR-RF-13 régua de força", () => {
  it("mostra a ordem sem a manilha e a posição das cartas da mão", () => {
    const hints = hintsOf(duel(["5H", "3C", "4D"], ["7C"]), "a")
    expect(hints.manilha).toBe("5")
    expect(hints.order).toEqual(["4", "6", "7", "Q", "J", "K", "A", "2", "3"])
    expect(hints.manilhaSuits).toEqual(["D", "S", "H", "C"])
    expect(hints.hand).toEqual([
      { card: "5H", position: 12, manilha: true },
      { card: "3C", position: 9, manilha: false },
      { card: "4D", position: 1, manilha: false },
    ])
  })
})

describe("TR-RF-14 e RF-20 sugestões com a própria mão", () => {
  it("abre com a mais forte e pede truco com mão forte", () => {
    const strong = duel(["5H", "3C", "4D"], ["7C", "6C", "QC"])
    const [raise, card] = hintsOf(strong, "a").suggestions
    expect(raise).toMatchObject({ advice: "raise", stake: 3 })
    expect(card).toMatchObject({ advice: "leadStrongest", action: { type: "play", card: "5H" } })
    expect(firstAdvice(duel(["4H", "6C", "7D"], ["7C"]), "a")).toBe("leadStrongest")
  })

  it("ganha com a carta mais barata ou joga a mais fraca", () => {
    const played = act(duel(["7H", "6C", "QC"], ["4C", "AC", "3D"]), "a", {
      type: "play",
      card: "QC",
    })
    const [beat] = hintsOf(played, "b").suggestions
    expect(beat).toMatchObject({ advice: "beatCheapest", action: { card: "AC" } })

    const lost = act(duel(["3H", "6C", "QC"], ["4C", "7C", "6D"]), "a", {
      type: "play",
      card: "3H",
    })
    expect(hintsOf(lost, "b").suggestions[0]).toMatchObject({
      advice: "cannotBeat",
      action: { card: "4C" },
    })
  })

  it("guarda as cartas fortes quando o parceiro já ganha", () => {
    let game = foursome([["3H"], ["4C"], ["2C", "KD"], ["7C"]])
    game = act(act(game, "a", { type: "play", card: "3H" }), "b", { type: "play", card: "4C" })
    expect(hintsOf(game, "c").suggestions[0]).toMatchObject({
      advice: "partnerWinning",
      action: { card: "KD" },
    })
  })

  it("responde ao pedido conforme a força da mão", () => {
    const ask = (hand: Parameters<typeof duel>[1]) =>
      act(duel(["3H", "2H", "4H"], hand), "a", { type: "raise" })
    expect(firstAdvice(ask(["5C", "3C", "2C"]), "b")).toBe("raiseBack")
    expect(firstAdvice(ask(["3C", "4C", "6C"]), "b")).toBe("accept")
    expect(firstAdvice(ask(["4C", "6C", "7C"]), "b")).toBe("run")
  })

  it("decide a mão de onze olhando as cartas do time", () => {
    const base = foursome([[], [], [], []])
    const { hand: _hand, ...rest } = { ...base, scores: [11, 2] as const }
    const game = dealHand(rest, 1, "a", seededRandom(9))
    const advice = firstAdvice(game, "a")
    expect(["playEleven", "runEleven"]).toContain(advice)
    expect(hintsOf(game, "b").suggestions).toEqual([])
  })

  it("na mão de ferro só lembra que as cartas estão viradas", () => {
    const base = duel([], [])
    const { hand: _hand, ...rest } = { ...base, scores: [11, 11] as const }
    const game = dealHand(rest, 1, "a", seededRandom(9))
    expect(firstAdvice(game, "a")).toBe("blindPick")
  })
})

describe("TR-RF-12 frases do histórico e das dicas", () => {
  const game = buildTruco({
    players: { ana: { team: 0 }, beto: { team: 1 }, caio: { team: 0 }, duda: { team: 1 } },
  })
  const names = namesOf(game)

  it.each<[TrucoEvent, string]>([
    [{ type: "handDealt", number: 2, vira: "7H", mode: "normal" }, "Mão 2: a vira é o 7 de copas"],
    [
      { type: "handDealt", number: 5, vira: "KS", mode: "eleven" },
      "Mão 5 (mão de onze): a vira é o rei de espadas",
    ],
    [{ type: "played", playerId: "ana", card: "QD" }, "ANA jogou a dama de ouros"],
    [{ type: "roundWon", round: 1, playerId: "beto" }, "BETO venceu a 1ª rodada"],
    [{ type: "roundWon", round: 2, playerId: null }, "A 2ª rodada empatou"],
    [{ type: "raised", playerId: "ana", stake: 3 }, "ANA pediu truco"],
    [{ type: "raised", playerId: "beto", stake: 6 }, "BETO pediu seis"],
    [{ type: "accepted", playerId: "beto", stake: 3 }, "BETO aceitou: a mão vale 3 pontos"],
    [{ type: "ran", playerId: "beto" }, "BETO correu"],
    [{ type: "elevenAccepted", playerId: "caio" }, "CAIO decidiu jogar a mão de onze"],
    [{ type: "handWon", team: 0, points: 1 }, "ANA e CAIO marcaram 1 ponto"],
    [{ type: "handWon", team: null, points: 0 }, "Ninguém marcou ponto nesta mão"],
    [{ type: "timedOut", playerId: "duda" }, "O tempo de DUDA acabou"],
    [{ type: "playerLeft", playerId: "duda" }, "DUDA saiu da partida"],
    [{ type: "matchWon", team: 1 }, "BETO e DUDA venceram a partida"],
  ])("descreve %j", (event, sentence) => {
    expect(describeTrucoEvent(event, names)).toBe(sentence)
  })

  it("lista o histórico do mais recente para o mais antigo", () => {
    const played = act(act(duel(["3H"], ["7C"]), "a", { type: "raise" }), "b", { type: "accept" })
    expect(describeTrucoHistory(played, 10)).toEqual([
      "B aceitou: a mão vale 3 pontos",
      "A pediu truco",
    ])
    expect(describeTrucoEvent({ type: "matchWon", team: 0 }, namesOf(played))).toBe(
      "A venceu a partida"
    )
    expect(stakeName(12)).toBe("doze")
    expect(TRUCO_ERRORS.NOT_YOUR_RAISE).toMatch(/outro time/)
  })

  it("explica cada sugestão em uma frase", () => {
    const sentence = describeSuggestion({
      action: { type: "play", card: "AC" },
      advice: "beatCheapest",
      stake: null,
    })
    expect(sentence).toBe("Jogue o ás de paus: é a carta mais fraca que ganha a rodada.")
    for (const advice of [
      "leadStrongest",
      "partnerWinning",
      "cannotBeat",
      "blindPick",
      "raise",
      "accept",
      "raiseBack",
      "run",
      "playEleven",
      "runEleven",
    ] as const) {
      expect(describeSuggestion({ action: { type: "raise" }, advice, stake: 6 })).toMatch(/\.$/)
    }
  })
})

describe("adaptador do Truco", () => {
  it("valida as ações e apresenta a visão sem a lista de eventos", () => {
    expect(trucoAdapter.actionSchema.safeParse({ type: "play", card: "9H" }).success).toBe(false)
    expect(trucoAdapter.actionSchema.safeParse({ type: "playBlind", slot: 3 }).success).toBe(false)
    expect(trucoAdapter.actionSchema.safeParse({ type: "raise", extra: 1 }).success).toBe(false)
    expect(trucoAdapter.actionSchema.safeParse({ type: "play", card: "QH" }).success).toBe(true)

    const game = duel(["3H"], ["7C"])
    const state = trucoAdapter.presenter(game)("a")
    expect(state.kind).toBe("truco-paulista")
    expect(state).not.toHaveProperty("events")
    expect(state).not.toHaveProperty("viewerId")
    const hints = trucoAdapter.hints(game, "a")
    expect(hints.suggestions[0]?.sentence).toMatch(/\.$/)
  })
})
