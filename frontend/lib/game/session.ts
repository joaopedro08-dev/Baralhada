import { createGameSession } from "@/lib/game/application/game-session"
import { createBrowserAddressBar } from "@/lib/game/infrastructure/browser-address-bar"
import { createLocalSeatStore } from "@/lib/game/infrastructure/local-seat-store"
import { createSocketGateway } from "@/lib/game/infrastructure/socket-gateway"

export const gameSession = createGameSession({
  gateway: createSocketGateway(),
  seats: createLocalSeatStore(),
  address: createBrowserAddressBar(),
})
