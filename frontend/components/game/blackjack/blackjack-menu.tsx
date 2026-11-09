"use client"

import { MatchMenu } from "@/components/game/table/match-menu"
import { roundLabel } from "@/lib/game/domain/blackjack/guide"
import { BLACKJACK_RULE_SECTIONS } from "@/lib/game/domain/blackjack/how-to-play"
import type {
  BlackjackHints,
  BlackjackState,
} from "@/lib/game/domain/blackjack/types"
import type { RoomState } from "@/lib/game/domain/types"

const LEAVE_NOTICE =
  "Se você sair agora, perde a aposta desta rodada e sai do placar. A partida segue com os outros."

export function BlackjackMenu({
  room,
  game,
  hints,
  hintsEnabled,
  onHintsChange,
}: {
  room: RoomState
  game: BlackjackState
  hints: BlackjackHints | null
  hintsEnabled: boolean
  onHintsChange: (enabled: boolean) => void
}) {
  return (
    <MatchMenu
      room={room}
      subtitle={roundLabel(game).toLowerCase()}
      hintsEnabled={hintsEnabled}
      onHintsChange={onHintsChange}
      hintsReady={hints !== null}
      hintsContent={
        <>
          {hints?.advice && <p className="text-sm">{hints.advice.sentence}</p>}
          <p className="text-sm text-muted-foreground">
            A dica segue a estratégia básica: usa só a sua mão e a carta aberta
            da banca, e o botão sugerido fica dourado.
          </p>
        </>
      }
      rules={BLACKJACK_RULE_SECTIONS}
      history={game.history}
      historyTitle="Histórico da partida"
      leaveNotice={LEAVE_NOTICE}
    />
  )
}
