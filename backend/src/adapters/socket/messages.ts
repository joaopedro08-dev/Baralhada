import type { PlatformErrorCode } from "../../application/errors.js"

export type TransportErrorCode =
  | "INVALID_PAYLOAD"
  | "NOT_IN_ROOM"
  | "ALREADY_IN_ROOM"
  | "RATE_LIMITED"
  | "TOO_MANY_ROOMS"
  | "INTERNAL_ERROR"

export type ErrorCode = PlatformErrorCode | TransportErrorCode | (string & {})

const PLATFORM_MESSAGES: Readonly<Record<PlatformErrorCode | TransportErrorCode, string>> = {
  ROOM_FULL: "A sala está cheia.",
  GAME_ALREADY_STARTED: "A partida está em andamento. Entre quando ela terminar.",
  NICKNAME_TAKEN: "Esse apelido já está em uso na sala.",
  NOT_HOST: "Só o anfitrião pode fazer isso.",
  NOT_ENOUGH_PLAYERS: "O jogo escolhido não aceita esse número de jogadores.",
  TEAMS_UNBALANCED: "Os times precisam ter o mesmo número de jogadores.",
  PLAYER_NOT_IN_ROOM: "Esse jogador não está na sala.",
  CANNOT_KICK_SELF: "Você não pode remover a si mesmo.",
  UNKNOWN_GAME: "Esse jogo não está disponível.",
  GAME_HAS_NO_TEAMS: "O jogo escolhido não tem times.",
  INVALID_TEAM: "Esse time não existe.",
  ROOM_NOT_FOUND: "Sala não encontrada.",
  SERVER_FULL: "O servidor está cheio. Tente de novo em alguns minutos.",
  ROOM_CODE_UNAVAILABLE: "Não foi possível criar a sala. Tente de novo.",
  INVALID_RECONNECT: "Não foi possível voltar para a sala.",
  GAME_NOT_RUNNING: "Não há partida em andamento.",
  MATCH_STARTING: "A partida está começando.",
  TABLE_PAUSED: "Calma: a mesa libera a próxima jogada em um instante.",
  TABLE_ALREADY_PAUSED: "A partida já está pausada.",
  TABLE_NOT_PAUSED: "A partida não está pausada.",
  HINTS_DISABLED: "O anfitrião desligou as dicas nesta sala.",
  INVALID_PAYLOAD: "Dados inválidos.",
  NOT_IN_ROOM: "Você não está em uma sala.",
  ALREADY_IN_ROOM: "Você já está em uma sala.",
  RATE_LIMITED: "Muitas ações em pouco tempo. Aguarde um instante.",
  TOO_MANY_ROOMS:
    "Já há salas demais abertas nesta conexão. Saia de uma ou aguarde alguns minutos.",
  INTERNAL_ERROR: "Ocorreu um erro inesperado.",
}

const FALLBACK_MESSAGE = "Essa jogada não é permitida agora."

export type ErrorMessages = (code: ErrorCode) => string

export const createErrorMessages = (
  gameMessages: Readonly<Record<string, string>>
): ErrorMessages => {
  const messages = new Map(Object.entries({ ...gameMessages, ...PLATFORM_MESSAGES }))
  return (code) => messages.get(code) ?? FALLBACK_MESSAGE
}

export const platformMessage = (code: PlatformErrorCode | TransportErrorCode): string =>
  PLATFORM_MESSAGES[code]
