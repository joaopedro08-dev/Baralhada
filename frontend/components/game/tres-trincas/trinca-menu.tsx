"use client"

import { MatchMenu } from "@/components/game/table/match-menu"
import { TRES_TRINCAS_RULE_SECTIONS } from "@/lib/game/domain/tres-trincas/how-to-play"
import type {
  TresTrincasHints,
  TresTrincasState,
} from "@/lib/game/domain/tres-trincas/types"
import type { RoomState } from "@/lib/game/domain/types"

const LEAVE_NOTICE =
  "Se você sair agora, suas cartas e trincas voltam ao monte e a partida segue sem você."

export function TrincaMenu({
  room,
  game,
  hints,
  hintsEnabled,
  onHintsChange,
}: {
  room: RoomState
  game: TresTrincasState
  hints: TresTrincasHints | null
  hintsEnabled: boolean
  onHintsChange: (enabled: boolean) => void
}) {
  return (
    <MatchMenu
      room={room}
      gameId="tres-trincas"
      gameName="Três Trincas"
      subtitle={`vez ${game.turnNumber}`}
      hintsEnabled={hintsEnabled}
      onHintsChange={onHintsChange}
      hintsReady={hints !== null}
      hintsContent={
        hints && (
          <>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              {hints.suggestions.map((suggestion) => (
                <li key={suggestion.sentence}>{suggestion.sentence}</li>
              ))}
            </ol>
            <p className="text-sm text-muted-foreground">
              Sua mão aparece agrupada por valor. As trincas prontas brilham e
              as cartas mortas ficam marcadas.
            </p>
          </>
        )
      }
      rules={TRES_TRINCAS_RULE_SECTIONS}
      history={game.history}
      historyTitle="Histórico da partida"
      leaveNotice={LEAVE_NOTICE}
    />
  )
}
