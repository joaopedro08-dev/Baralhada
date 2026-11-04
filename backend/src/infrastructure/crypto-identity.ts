import { randomBytes, randomInt, randomUUID } from "node:crypto"
import type { IdentityGenerator } from "../application/ports.js"
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "../adapters/socket/schemas.js"
import type { RandomSource } from "../domain/shared/random.js"

export const cryptoRandomSource: RandomSource = {
  nextInt: (maxExclusive) => randomInt(maxExclusive),
}

export const cryptoIdentityGenerator: IdentityGenerator = {
  roomCode: () =>
    Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
    ).join(""),
  playerId: () => randomUUID(),
  reconnectToken: () => randomBytes(24).toString("base64url"),
}
