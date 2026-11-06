const ROOM_CODE_PATTERN = /^[23456789A-HJ-NP-Z]{6}$/
const NICKNAME_PATTERN = /^[^\p{C}<>]+$/u

export const ROOM_CODE_LENGTH = 6
export const NICKNAME_MAX_LENGTH = 20

export const normalizeRoomCode = (code: string): string =>
  code.toUpperCase().replace(/[^0-9A-Z]/g, "")

export const isValidRoomCode = (code: string): boolean =>
  ROOM_CODE_PATTERN.test(code)

export const nicknameProblem = (nickname: string): string | null => {
  if (!nickname) return "Digite um apelido para entrar."
  if (!NICKNAME_PATTERN.test(nickname)) return "O apelido não pode ter < nem >."
  return null
}

export const roomCodeProblem = (code: string): string | null =>
  isValidRoomCode(code)
    ? null
    : `Digite o código da sala, com ${ROOM_CODE_LENGTH} caracteres.`
