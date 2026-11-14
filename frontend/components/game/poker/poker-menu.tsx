"use client"

import { MatchMenu } from "@/components/game/table/match-menu"
import { describeBlinds, HAND_NAMES } from "@/lib/game/domain/poker/guide"
import { POKER_RULE_SECTIONS } from "@/lib/game/domain/poker/how-to-play"
import type { PokerHints, PokerState } from "@/lib/game/domain/poker/types"
import type { RoomState } from "@/lib/game/domain/types"

const LEAVE_NOTICE =
  "Se você sair agora, desiste da mão, é eliminado e suas fichas saem da mesa."

export function PokerMenu({
  room,
  game,
  hints,
  hintsEnabled,
  onHintsChange,
}: {
  room: RoomState
  game: PokerState
  hints: PokerHints | null
  hintsEnabled: boolean
  onHintsChange: (enabled: boolean) => void
}) {
  return (
    <MatchMenu
      room={room}
      gameId="poker-texas-holdem"
      gameName="Poker Texas Hold'em"
      subtitle={`mão ${game.handNumber} · ${describeBlinds(game)}`}
      hintsEnabled={hintsEnabled}
      onHintsChange={onHintsChange}
      hintsReady={hints !== null && hints.sentences.length > 0}
      hintsContent={
        hints && (
          <>
            <ul className="flex flex-col gap-1 text-sm">
              {hints.sentences.map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
            {hints.outs && hints.outs.byCategory.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {hints.outs.byCategory.map((entry) => (
                  <li
                    key={entry.category}
                    className="rounded-full bg-muted px-2 py-0.5 font-medium"
                  >
                    {HAND_NAMES[entry.category]}: {entry.count}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              As dicas usam só as suas cartas e a mesa. As cartas dos outros
              nunca chegam ao seu navegador.
            </p>
          </>
        )
      }
      rules={POKER_RULE_SECTIONS}
      history={game.history}
      historyTitle="Histórico da partida"
      leaveNotice={LEAVE_NOTICE}
    />
  )
}
