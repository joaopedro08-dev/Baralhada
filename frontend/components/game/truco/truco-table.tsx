import { AnimatePresence, m } from "framer-motion"
import { Crown, EyeOff, Megaphone } from "lucide-react"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { Badge } from "@/components/ui/badge"
import { cardName, rankName } from "@/lib/game/domain/cards"
import { describeRound, stakeName } from "@/lib/game/domain/truco/guide"
import { nicknameOf, seatsFromViewer } from "@/lib/game/domain/truco/teams"
import type {
  PlayedCard,
  RoundSummary,
  TrucoPlayer,
  TrucoState,
} from "@/lib/game/domain/truco/types"
import type { Card, PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const TEAM_BORDERS = ["border-sky-400", "border-rose-400"] as const

const SLOT_BOX = "h-16 w-12 lg:h-20 lg:w-14"

export const playedCardLayoutId = (card: Card): string => `truco-carta-${card}`

const describePlay = (label: string, play: PlayedCard): string => {
  if (!play.card) return `${label}: carta escondida`
  const hidden = play.covered ? ", escondida" : ""
  return `${label}: ${cardName(play.card)}${hidden}`
}

function PlayedFace({ play }: { play: PlayedCard }) {
  if (!play.card) {
    return (
      <div className={cn("relative", SLOT_BOX)}>
        <CardBack className="size-full" />
        <EyeOff
          aria-hidden
          className="absolute inset-0 m-auto size-6 rounded-full bg-black/60 p-1 text-white"
        />
      </div>
    )
  }
  return (
    <div className="relative">
      <CardFace
        card={play.card}
        size="pile"
        className={cn(play.covered && "opacity-55 grayscale")}
      />
      {play.covered && (
        <EyeOff
          aria-hidden
          className="absolute inset-0 m-auto size-6 rounded-full bg-black/70 p-1 text-white"
        />
      )}
    </div>
  )
}

function PlayedSlot({
  play,
  label,
  winner,
}: {
  play: PlayedCard | null
  label: string
  winner: boolean
}) {
  return (
    <div className={cn("relative", SLOT_BOX)}>
      <div
        aria-hidden
        className="absolute inset-0 rounded-lg border-2 border-dashed border-felt-line"
      />
      <AnimatePresence>
        {play && (
          <m.div
            key={`${play.playerId}:${play.card ?? "escondida"}`}
            layoutId={play.card ? playedCardLayoutId(play.card) : undefined}
            role="img"
            aria-label={describePlay(label, play)}
            className={cn(
              "absolute inset-0 rounded-lg",
              winner && "ring-4 ring-gold"
            )}
            initial={{ y: -36, scale: 0.7, rotate: -10, opacity: 0 }}
            animate={{
              y: 0,
              scale: winner ? 1.08 : 1,
              rotate: 0,
              opacity: 1,
            }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 380, damping: 20 }}
          >
            <PlayedFace play={play} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const SHUFFLE_OFFSETS = [-7, 0, 7] as const

function ShufflingDeck() {
  return (
    <div
      role="img"
      aria-label="Embaralhando a próxima mão"
      className={cn("relative", SLOT_BOX)}
    >
      {SHUFFLE_OFFSETS.map((offset, layer) => (
        <m.div
          key={offset}
          className="absolute inset-0"
          animate={{ x: [0, offset, 0], rotate: [0, offset / 2, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: layer * 0.12,
            ease: "easeInOut",
          }}
        >
          <CardBack className="size-full" />
        </m.div>
      ))}
    </div>
  )
}

function TableCaption({
  game,
  held,
}: {
  game: TrucoState
  held: RoundSummary | null
}) {
  const request = game.request
  const key = request
    ? `pedido:${request.stake}:${request.requesterId}`
    : held
      ? `rodada:${held.handNumber}:${held.round}`
      : null
  return (
    <div className="flex min-h-9 justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {key && (
          <m.p
            key={key}
            role="status"
            initial={{ opacity: 0, scale: 0.8, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold",
              request
                ? "suggest-pulse bg-gold text-gold-foreground"
                : "bg-felt-deep text-felt-foreground ring-1 ring-gold/60"
            )}
          >
            {request ? (
              <>
                <Megaphone aria-hidden className="size-4" />
                {nicknameOf(game, request.requesterId)} pediu{" "}
                {stakeName(request.stake)}
              </>
            ) : (
              <>
                <Crown aria-hidden className="size-4 text-gold" />
                {describeRound(game, held as RoundSummary)}
              </>
            )}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function SeatSpot({
  game,
  player,
  play,
  winner,
  partnerCards,
  dealing,
}: {
  game: TrucoState
  player: TrucoPlayer
  play: PlayedCard | null
  winner: boolean
  partnerCards: readonly Card[] | null
  dealing: boolean
}) {
  const handSize = dealing ? 0 : player.handSize
  const partner = game.viewerTeam !== null && player.team === game.viewerTeam
  const acting = game.actorId === player.id
  return (
    <m.li
      layout="position"
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border-2 bg-felt-deep/70 p-2 text-center transition-shadow",
        TEAM_BORDERS[player.team],
        acting && "suggest-pulse ring-2 ring-gold"
      )}
    >
      <div className="flex max-w-full items-center gap-1.5">
        <PlayerAvatar
          playerId={player.id}
          nickname={player.nickname}
          size="sm"
        />
        <span className="min-w-0 truncate text-sm font-semibold">
          {player.nickname}
        </span>
      </div>
      <Badge variant="outline" className="h-5 text-xs">
        {partner ? "parceiro" : "adversário"}
      </Badge>
      <PlayedSlot
        play={play}
        winner={winner}
        label={`Carta de ${player.nickname}`}
      />
      {partnerCards && !dealing ? (
        <ul aria-label={`Cartas de ${player.nickname}`} className="flex gap-1">
          {partnerCards.map((card) => (
            <li key={card} role="img" aria-label={cardName(card)}>
              <CardFace
                card={card}
                size="pile"
                className="h-12 w-9 lg:h-12 lg:w-9"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div
          role="img"
          aria-label={`${handSize} cartas na mão`}
          className="flex -space-x-3"
        >
          {Array.from({ length: handSize }, (_, slot) => (
            <CardBack key={slot} className="h-9 w-7" />
          ))}
        </div>
      )}
    </m.li>
  )
}

export function TrucoTable({
  game,
  viewerId,
  held,
  dealing,
}: {
  game: TrucoState
  viewerId: PlayerId
  held: RoundSummary | null
  dealing: boolean
}) {
  const seats = seatsFromViewer(game, viewerId)
  const others = seats.filter((player) => player.id !== viewerId)
  const shown = held?.table ?? game.table
  const playedBy = new Map(shown.map((play) => [play.playerId, play]))
  const winnerId = held?.winnerId ?? null
  const partnerCards = new Map(
    game.partnerHands.map((partner) => [partner.playerId, partner.cards])
  )

  return (
    <section
      aria-label="Mesa"
      className="felt-table flex flex-col gap-3 rounded-xl p-3"
    >
      <ul
        className={cn(
          "grid gap-2",
          others.length === 1 ? "grid-cols-1" : "grid-cols-3 max-sm:grid-cols-2"
        )}
      >
        {others.map((player) => (
          <SeatSpot
            key={player.id}
            game={game}
            player={player}
            play={playedBy.get(player.id) ?? null}
            winner={winnerId === player.id}
            partnerCards={partnerCards.get(player.id) ?? null}
            dealing={dealing}
          />
        ))}
      </ul>

      <TableCaption game={game} held={held} />

      <div className="flex items-end justify-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-felt-muted">Vira</span>
          {dealing ? (
            <ShufflingDeck />
          ) : (
            <m.div
              key={game.handNumber}
              role="img"
              aria-label={`Vira: ${cardName(game.vira)}`}
              initial={{ rotateY: 90, y: -20, opacity: 0 }}
              animate={{ rotateY: 0, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            >
              <CardFace card={game.vira} size="pile" />
            </m.div>
          )}
          <span className="text-sm font-semibold">
            {dealing ? (
              "Embaralhando..."
            ) : (
              <>
                Manilha:{" "}
                <span className="text-gold">{rankName(game.manilha)}</span>
              </>
            )}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-felt-muted">
            Sua carta
          </span>
          <PlayedSlot
            play={playedBy.get(viewerId) ?? null}
            winner={winnerId === viewerId}
            label="Sua carta na rodada"
          />
        </div>
      </div>
    </section>
  )
}
