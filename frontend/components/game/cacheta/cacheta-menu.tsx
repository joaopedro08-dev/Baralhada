"use client"

import { MatchMenu } from "@/components/game/table/match-menu"
import { CACHETA_RULE_SECTIONS } from "@/lib/game/domain/cacheta/how-to-play"
import type {
  CachetaHints,
  CachetaState,
} from "@/lib/game/domain/cacheta/types"
import type { RoomState } from "@/lib/game/domain/types"

const LEAVE_NOTICE =
  "Se você sair agora, é eliminado: suas cartas voltam ao monte e a partida segue sem você."

export function CachetaMenu({
  room,
  game,
  hints,
  hintsEnabled,
  onHintsChange,
}: {
  room: RoomState
  game: CachetaState
  hints: CachetaHints | null
  hintsEnabled: boolean
  onHintsChange: (enabled: boolean) => void
}) {
  return (
    <MatchMenu
      room={room}
      subtitle={`rodada ${game.round}`}
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
              Os jogos prontos brilham na mão e a ordem Jogos junta cada um.
              Quando der para bater, o botão Bater fica dourado.
            </p>
          </>
        )
      }
      rules={CACHETA_RULE_SECTIONS}
      history={game.history}
      historyTitle="Histórico da partida"
      leaveNotice={LEAVE_NOTICE}
    />
  )
}
