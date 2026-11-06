import {
  membersOf,
  nicknameOf,
  sideLabel,
  teamNames,
} from "@/lib/game/domain/truco/teams"
import type {
  HandSummary,
  RoundSummary,
  Stake,
  TeamIndex,
  TrucoState,
} from "@/lib/game/domain/truco/types"
import type { PlayerId } from "@/lib/game/domain/types"

const STAKE_NAMES: Readonly<Record<Stake, string>> = {
  1: "um",
  3: "truco",
  6: "seis",
  9: "nove",
  12: "doze",
}

export const ROUNDS_PER_HAND = 3

export const stakeName = (stake: Stake): string => STAKE_NAMES[stake]

export const raiseLabel = (stake: Stake): string => `Pedir ${stakeName(stake)}`

export const pointsLabel = (points: number): string =>
  points === 1 ? "1 ponto" : `${points} pontos`

const isPair = (game: TrucoState): boolean => game.players.length > 2

const scored = (game: TrucoState, team: TeamIndex): string => {
  if (!isPair(game)) return "marcou"
  return team === game.viewerTeam ? "marcamos" : "marcaram"
}

export const describeTurn = (game: TrucoState, viewerId: PlayerId): string => {
  if (game.endReason) return "Partida encerrada"
  const actor =
    game.actorId === viewerId ? null : nicknameOf(game, game.actorId)
  if (game.request) {
    return actor
      ? `${actor} responde ao ${stakeName(game.request.stake)}`
      : `Responda ao ${stakeName(game.request.stake)}`
  }
  if (game.elevenDeciderId) {
    return actor ? `${actor} decide a mão de onze` : "Decida a mão de onze"
  }
  return actor ? `Vez de ${actor}` : "Sua vez"
}

const playPrompt = (game: TrucoState): string => {
  if (game.blind)
    return "Mão de ferro: ninguém vê as cartas. Escolha uma delas."
  const raise = game.moves.raiseTo
  return raise === null
    ? "Sua vez: toque em uma carta para jogar."
    : `Sua vez: jogue uma carta ou peça ${stakeName(raise)}.`
}

const answerPrompt = (game: TrucoState): string => {
  const request = game.request
  if (!request) return ""
  const asker = nicknameOf(game, request.requesterId)
  const raise = game.moves.raiseTo
  const options =
    raise === null
      ? "Aceite ou corra."
      : `Aceite, corra ou peça ${stakeName(raise)}.`
  return `${asker} pediu ${stakeName(request.stake)}. ${options}`
}

const waitingPrompt = (game: TrucoState): string => {
  const actor = nicknameOf(game, game.actorId)
  if (game.request)
    return `Aguardando ${actor} responder ao ${stakeName(game.request.stake)}.`
  if (game.elevenDeciderId)
    return `Mão de onze: aguardando ${actor} decidir se o time joga.`
  return `Aguardando ${actor} jogar.`
}

export const describeNextStep = (game: TrucoState): string => {
  if (game.endReason) return "A partida terminou."
  if (game.moves.decideEleven) {
    const partners =
      game.partnerHands.length > 0 ? " Veja as cartas do parceiro e" : ""
    return `Mão de onze: seu time tem 11 pontos.${partners} decida: jogar vale 3 pontos, correr dá 1 ponto aos adversários.`
  }
  if (game.moves.answer) return answerPrompt(game)
  if (game.moves.play) return playPrompt(game)
  return waitingPrompt(game)
}

export const describeHandSummary = (
  game: TrucoState,
  summary: HandSummary
): string => {
  if (summary.winnerTeam === null) return "Mão empatada: ninguém marcou ponto."
  const who = sideLabel(game, summary.winnerTeam)
  const how =
    summary.ending === "ran"
      ? " (o outro time correu)"
      : summary.ending === "elevenRan"
        ? " (correram da mão de onze)"
        : ""
  return `${who} ${scored(game, summary.winnerTeam)} ${pointsLabel(summary.points)}${how}.`
}

export const describeRound = (game: TrucoState, round: RoundSummary): string =>
  round.winnerId === null
    ? `A ${round.round}ª rodada empatou`
    : `${nicknameOf(game, round.winnerId)} levou a ${round.round}ª rodada`

export type RoundMark = "won" | "lost" | "tie" | "pending"

export const roundMarks = (game: TrucoState): readonly RoundMark[] =>
  Array.from({ length: ROUNDS_PER_HAND }, (_, round) => {
    const result = game.rounds[round]
    if (result === undefined) return "pending"
    if (result === "tie") return "tie"
    if (game.viewerTeam === null) return result === 0 ? "won" : "lost"
    return result === game.viewerTeam ? "won" : "lost"
  })

export const describeTrucoResult = (game: TrucoState): string => {
  if (game.winnerTeam === null) return "Partida encerrada"
  if (game.winnerTeam === game.viewerTeam) {
    return isPair(game) ? "Seu time venceu!" : "Você venceu!"
  }
  const names = teamNames(game, game.winnerTeam)
  return membersOf(game, game.winnerTeam).length > 1
    ? `${names} venceram`
    : `${names} venceu`
}

export const explainTrucoEnd = (game: TrucoState): string | null => {
  if (game.endReason === "abandoned") {
    return "A partida acabou porque um jogador saiu, e o time dele perdeu."
  }
  if (game.endReason === "score") return "Chegou a 12 pontos primeiro."
  return null
}

export const modeLabel = (game: TrucoState): string | null => {
  if (game.mode === "eleven") return "Mão de onze"
  if (game.mode === "iron") return "Mão de ferro"
  return null
}
