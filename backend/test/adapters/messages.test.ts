import { describe, expect, it } from "vitest"
import {
  describeEvent,
  describePlay,
  describeRisk,
  ROUBA_MONTE_ERRORS,
} from "../../src/adapters/socket/games/rouba-monte/messages.js"
import { createErrorMessages } from "../../src/adapters/socket/messages.js"
import type { GameEvent } from "../../src/domain/games/rouba-monte/model.js"
import type { Play } from "../../src/domain/games/rouba-monte/hints.js"

const names: Readonly<Record<string, string>> = { ana: "Ana", beto: "Beto" }
const nameOf = (id: string) => names[id] ?? "Jogador"

describe("RF-13 frases do histórico", () => {
  it.each<[GameEvent, string]>([
    [
      { type: "captured", playerId: "ana", card: "7C", tableCards: ["7H", "7S"] },
      "Ana capturou 2 cartas da mesa com o 7 de paus",
    ],
    [{ type: "stacked", playerId: "ana", card: "QD" }, "Ana pôs a dama de ouros no próprio monte"],
    [{ type: "drew", playerId: "ana" }, "Ana comprou 1 carta"],
    [
      { type: "stole", playerId: "ana", targetId: "beto", card: "9C", stolenCount: 12 },
      "Ana roubou o monte de Beto (12 cartas)",
    ],
    [{ type: "discarded", playerId: "beto", card: "AS" }, "Beto descartou o ás de espadas"],
    [{ type: "handRefilled", playerId: "beto", count: 4 }, "Beto completou a mão com 4 cartas"],
    [{ type: "tableReplenished", count: 1 }, "A mesa recebeu 1 carta do baralho"],
    [{ type: "turnTimedOut", playerId: "ana" }, "O tempo de Ana acabou"],
    [{ type: "playerLeft", playerId: "beto", returnedCount: 3 }, "Beto saiu da partida"],
  ])("descreve %j", (event, sentence) => {
    expect(describeEvent(event, nameOf)).toBe(sentence)
  })
})

describe("RF-17 e RF-18 frases das dicas", () => {
  const play = (changes: Partial<Play>): Play => ({
    action: { type: "discard", card: "KH" },
    kind: "discard",
    rank: "K",
    targetId: null,
    gainedCards: 0,
    score: 0,
    ...changes,
  })

  it.each<[Partial<Play>, string]>([
    [
      { action: { type: "steal", card: "9C", targetId: "beto" }, gainedCards: 5 },
      "Rouba o monte de Beto com o 9 e leva 5 cartas.",
    ],
    [
      { action: { type: "capture", card: "JC", tableCards: ["JD"] }, gainedCards: 2 },
      "Captura o valete da mesa e leva 2 cartas para o seu monte.",
    ],
    [{ action: { type: "stack", card: "4C" } }, "Põe o 4 no seu monte, que mantém o mesmo topo."],
    [{}, "Descarta o rei, a carta que menos ajuda os adversários agora."],
    [{ action: { type: "draw" } }, "Compra 1 carta do baralho para ter mais opções."],
  ])("descreve %j", (changes, sentence) => {
    expect(describePlay(play(changes), nameOf)).toBe(sentence)
  })

  it("explica o risco do monte", () => {
    expect(describeRisk({ rank: "7", pileSize: 6, unseenCards: 1 })).toBe(
      "Seu monte de 6 cartas pode ser roubado com o 7: 1 carta desse valor ainda não apareceu."
    )
  })

  it("explica as recusas em português", () => {
    const errorMessage = createErrorMessages(ROUBA_MONTE_ERRORS)
    expect(errorMessage("TOP_MISMATCH")).toBe("A carta precisa ter o mesmo valor do topo do monte.")
    expect(errorMessage("ROOM_FULL")).toBe("A sala está cheia.")
    expect(errorMessage("CODIGO_QUE_NAO_EXISTE")).toBe("Essa jogada não é permitida agora.")
  })
})
