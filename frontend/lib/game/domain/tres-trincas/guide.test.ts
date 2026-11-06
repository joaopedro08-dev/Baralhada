import { describe, expect, it } from "vitest"

import {
  describeJokers,
  describeNextStep,
  describeResult,
  describeTurn,
  explainEnd,
  meldLabel,
  meldSizeFits,
  setLabel,
  setRankOf,
} from "@/lib/game/domain/tres-trincas/guide"
import { groupHand } from "@/lib/game/domain/tres-trincas/hand"
import { trincaNotice } from "@/lib/game/domain/tres-trincas/notice"
import { buildTrincas } from "@/lib/game/domain/tres-trincas/test-fixtures"

describe("TT-RF-02 vez e próximo passo", () => {
  it("diz de quem é a vez", () => {
    expect(describeTurn(buildTrincas(), "eu")).toBe("Sua vez")
    expect(describeTurn(buildTrincas({ currentPlayerId: "beto" }), "eu")).toBe(
      "Vez de Beto"
    )
  })

  it("explica o que fazer em cada momento da vez", () => {
    expect(describeNextStep(buildTrincas(), "eu")).toBe(
      "Compre uma carta ou, se já tiver trinca, baixe sem comprar."
    )
    const four = { draw: true, discard: false, meldLimit: 0 }
    expect(describeNextStep(buildTrincas({ moves: four }), "eu")).toBe(
      "Compre uma carta do monte."
    )
    const drawn = { draw: false, discard: true, meldLimit: 1 }
    expect(describeNextStep(buildTrincas({ moves: drawn }), "eu")).toBe(
      "Baixe uma trinca ou descarte 1 carta."
    )
    const seven = { draw: false, discard: true, meldLimit: 0 }
    expect(describeNextStep(buildTrincas({ moves: seven }), "eu")).toBe(
      "Descarte 1 carta para passar a vez."
    )
    expect(
      describeNextStep(buildTrincas({ currentPlayerId: "beto" }), "eu")
    ).toBe("Aguarde a vez de Beto.")
  })

  it("só libera Baixar com 3 cartas, ou 6 quando cabem duas trincas", () => {
    expect(meldSizeFits(3, 1)).toBe(true)
    expect(meldSizeFits(6, 1)).toBe(false)
    expect(meldSizeFits(6, 2)).toBe(true)
    expect(meldSizeFits(4, 2)).toBe(false)
    expect(meldSizeFits(0, 2)).toBe(false)
    expect(meldLabel(6)).toBe("Baixar as duas trincas")
    expect(meldLabel(3)).toBe("Baixar trinca")
  })

  it("nomeia a trinca pelo valor, mesmo com coringa", () => {
    expect(setLabel(setRankOf(["9C", "2H", "9D"], "2"))).toBe("de 9")
    expect(setLabel(setRankOf(["2C", "2H", "2D"], "2"))).toBe("de 2")
    expect(setLabel(setRankOf(["KC", "JH", "KD"], "J"))).toBe("de reis")
    expect(describeJokers(buildTrincas())).toBe("Coringa: 2 · Morto: 5")
  })
})

describe("TT-RF-07 fim de partida", () => {
  it("mostra o vencedor e o motivo", () => {
    const won = buildTrincas({ winnerId: "beto", endReason: "sets" })
    expect(describeResult(won, "eu")).toBe("Beto venceu")
    expect(describeResult(won, "beto")).toBe("Você venceu!")
    expect(explainEnd(won)).toBe(
      "Baixou as 3 trincas primeiro e ficou com a mão vazia."
    )
    expect(
      explainEnd(buildTrincas({ winnerId: "eu", endReason: "abandoned" }))
    ).toBe("Os outros jogadores saíram, e a partida terminou.")
  })
})

describe("mini placar do Três Trincas", () => {
  it("avisa quem baixou e quantas trincas faltam", () => {
    const before = buildTrincas()
    const after = buildTrincas({
      players: [
        { id: "eu", nickname: "Ana", handSize: 7, sets: [] },
        {
          id: "beto",
          nickname: "Beto",
          handSize: 4,
          sets: [["QC", "QD", "2S"]],
        },
      ],
    })
    expect(trincaNotice(before, after, "eu")).toMatchObject({
      tone: "neutral",
      title: "Beto baixou uma trinca",
      detail: "Trinca de damas. Faltam 2 trincas para vencer.",
      cards: ["QC", "QD", "2S"],
      lines: [
        { label: "Você", before: 0, value: 0, lead: false, mine: true },
        { label: "Beto", before: 0, value: 1, lead: true, mine: false },
      ],
    })
    expect(trincaNotice(after, after, "eu")).toBeNull()
  })

  it("comemora as próprias trincas e alerta quando o outro está perto", () => {
    const before = buildTrincas()
    const mine = buildTrincas({
      players: [
        {
          id: "eu",
          nickname: "Ana",
          handSize: 2,
          sets: [
            ["9C", "9D", "9H"],
            ["KC", "KD", "2H"],
          ],
        },
        { id: "beto", nickname: "Beto", handSize: 7, sets: [] },
      ],
    })
    expect(trincaNotice(before, mine, "eu")).toMatchObject({
      tone: "good",
      title: "Você baixou duas trincas",
      detail: "Trinca de 9 e de reis. Falta 1 trinca para vencer.",
    })
    expect(trincaNotice(before, mine, "beto")?.tone).toBe("bad")
  })
})

describe("TT-RF-10 mão organizada", () => {
  it("agrupa por valor, com pares juntos, coringas e o valor morto no fim", () => {
    expect(
      groupHand(["5D", "KC", "2H", "9C", "KD", "9D", "9H"], "2", "5")
    ).toEqual([
      { rank: "9", role: "natural", cards: ["9C", "9D", "9H"] },
      { rank: "K", role: "natural", cards: ["KC", "KD"] },
      { rank: "2", role: "wild", cards: ["2H"] },
      { rank: "5", role: "dead", cards: ["5D"] },
    ])
  })
})
