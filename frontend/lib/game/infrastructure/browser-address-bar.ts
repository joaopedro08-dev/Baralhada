import type { AddressBar } from "@/lib/game/application/ports"
import {
  isValidRoomCode,
  normalizeRoomCode,
} from "@/lib/game/domain/room-entry"

const ROOM_PARAM = "sala"

export const createBrowserAddressBar = (): AddressBar => ({
  invitedRoomCode() {
    const linked = new URLSearchParams(window.location.search).get(ROOM_PARAM)
    const code = linked ? normalizeRoomCode(linked) : ""
    return isValidRoomCode(code) ? code : null
  },

  showRoom(code) {
    const target = code ? `/?${ROOM_PARAM}=${code}` : "/"
    window.history.replaceState(null, "", target)
  },

  inviteLink: (code) => `${window.location.origin}/?${ROOM_PARAM}=${code}`,
})
