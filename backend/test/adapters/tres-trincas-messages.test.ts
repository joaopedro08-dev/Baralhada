import { describe, expect, it } from "vitest"
import {
  describeTrincaEvent,
  describeTrincaSuggestion,
  TRES_TRINCAS_ERRORS,
} from "../../src/adapters/socket/games/tres-trincas/messages.js"
import type { TrincaSuggestion } from "../../src/domain/games/tres-trincas/hints.js"
import type { TrincaEvent } from "../../src/domain/games/tres-trincas/model.js"
import { buildTrincas } from "../support/trincas-builder.js"

const game = buildTrincas({ players: { ana: {}, beto: {} }, vira: "7H" })
const nameOf = (id: string) => ({ ana: "Ana", beto: "Beto" })[id] ?? "Jogador"

describe("TT-RF-09 frases do histórico", () => {
  it.each<[TrincaEvent, string]>([
    [
      { type: "dealt", vira: "7H" },
      "A vira é o 7 de copas: esse valor fica morto e o 2 é o coringa",
    ],
    [{ type: "drew", playerId: "ana" }, "Ana comprou 1 carta"],
    [{ type: "discarded", playerId: "beto", card: "QS" }, "Beto descartou a dama de espadas"],
    [{ type: "melded", playerId: "ana", sets: [["9C", "9D", "2H"]] }, "Ana baixou uma trinca de 9"],
    [
      {
        type: "melded",
        playerId: "ana",
        sets: [
          ["KC", "KD", "KH"],
          ["2C", "2D", "2S"],
        ],
      },
      "Ana baixou duas trincas: de reis e de 2",
    ],
    [
      { type: "restocked", count: 12 },
      "O descarte foi embaralhado e virou o monte de compra (12 cartas)",
    ],
    [{ type: "timedOut", playerId: "beto" }, "O tempo de Beto acabou"],
    [
      { type: "playerLeft", playerId: "beto", returnedCount: 1 },
      "Beto saiu da partida e 1 carta voltou ao monte",
    ],
    [{ type: "won", playerId: "ana" }, "Ana venceu a partida"],
  ])("%j vira frase", (event, sentence) => {
    expect(describeTrincaEvent(game, event, nameOf)).toBe(sentence)
  })

  it("com vira 2, avisa que o valete é o coringa", () => {
    expect(describeTrincaEvent(game, { type: "dealt", vira: "2C" }, nameOf)).toBe(
      "A vira é o 2 de paus: esse valor fica morto e o valete é o coringa"
    )
  })
})

describe("TT-RF-10 e TT-RF-11 frases das dicas", () => {
  it.each<[TrincaSuggestion, string]>([
    [
      { action: { type: "meld", cards: ["AC", "AD", "AH"] }, advice: "meldOne", ranks: ["A"] },
      "Baixe a trinca de ases.",
    ],
    [
      { action: { type: "meld", cards: [] }, advice: "meldTwo", ranks: ["9", "Q"] },
      "Baixe as duas trincas, de 9 e de damas, e compre 1 carta.",
    ],
    [
      { action: { type: "meld", cards: [] }, advice: "meldLast", ranks: ["J"] },
      "Baixe a trinca de valetes e vença a partida!",
    ],
    [{ action: { type: "draw" }, advice: "draw", ranks: [] }, "Compre uma carta do monte."],
    [
      { action: { type: "discard", card: "7S" }, advice: "discardDead", ranks: ["7"] },
      "Descarte o 7 de espadas: o valor do vira está morto.",
    ],
    [
      { action: { type: "discard", card: "4D" }, advice: "discardKeepingSet", ranks: ["4"] },
      "Descarte o 4 de ouros e guarde a trinca para baixar no começo da próxima vez.",
    ],
    [
      { action: { type: "discard", card: "KS" }, advice: "discardLoose", ranks: ["K"] },
      "Descarte o rei de espadas: é a carta com menos chance de formar trinca.",
    ],
  ])("%j vira frase", (suggestion, sentence) => {
    expect(describeTrincaSuggestion(suggestion)).toBe(sentence)
  })

  it("explica cada recusa em português", () => {
    expect(Object.values(TRES_TRINCAS_ERRORS).every((text) => text.endsWith("."))).toBe(true)
  })
})
