"use client"

import { MatchMenu } from "@/components/game/table/match-menu"
import { cardName, rankName } from "@/lib/game/domain/cards"
import { TRUCO_RULE_SECTIONS } from "@/lib/game/domain/truco/how-to-play"
import type { TrucoHints, TrucoState } from "@/lib/game/domain/truco/types"
import type { RoomState, Suit } from "@/lib/game/domain/types"

const LEAVE_NOTICE =
  "Se você sair agora, o seu time perde e a partida termina para todos."

const SUIT_LABELS: Readonly<Record<Suit, string>> = {
  C: "paus",
  H: "copas",
  S: "espadas",
  D: "ouros",
}

function StrengthRuler({ hints }: { hints: TrucoHints }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Da mais fraca à mais forte:{" "}
        <span className="font-semibold">
          {hints.order.map(rankName).join(", ")}
        </span>
        , e no topo a manilha{" "}
        <span className="font-semibold">{rankName(hints.manilha)}</span> (
        {[...hints.manilhaSuits]
          .reverse()
          .map((suit) => SUIT_LABELS[suit])
          .join(", ")}
        ).
      </p>
      {hints.hand.length > 0 && (
        <ul className="flex flex-col gap-1">
          {hints.hand.map((entry) => (
            <li key={entry.card} className="flex justify-between gap-2">
              <span>
                {cardName(entry.card)}
                {entry.manilha && " (manilha)"}
              </span>
              <span className="text-muted-foreground tabular-nums">
                força {entry.position} de 13
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TrucoMenu({
  room,
  game,
  hints,
  hintsEnabled,
  onHintsChange,
}: {
  room: RoomState
  game: TrucoState
  hints: TrucoHints | null
  hintsEnabled: boolean
  onHintsChange: (enabled: boolean) => void
}) {
  return (
    <MatchMenu
      room={room}
      subtitle={`mão ${game.handNumber}`}
      hintsEnabled={hintsEnabled}
      onHintsChange={onHintsChange}
      hintsReady={hints !== null}
      hintsContent={
        hints && (
          <>
            {hints.suggestions.length > 0 && (
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                {hints.suggestions.map((suggestion) => (
                  <li key={suggestion.sentence}>{suggestion.sentence}</li>
                ))}
              </ol>
            )}
            <StrengthRuler hints={hints} />
          </>
        )
      }
      rules={TRUCO_RULE_SECTIONS}
      history={game.history}
      historyTitle="Histórico da mão"
      leaveNotice={LEAVE_NOTICE}
    />
  )
}
