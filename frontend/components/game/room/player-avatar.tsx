import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const AVATAR_TONES = [
  "bg-amber-200 text-amber-950",
  "bg-sky-200 text-sky-950",
  "bg-rose-200 text-rose-950",
  "bg-violet-200 text-violet-950",
  "bg-lime-200 text-lime-950",
  "bg-orange-200 text-orange-950",
] as const

const toneOf = (playerId: PlayerId): string => {
  const hash = [...playerId].reduce(
    (total, letter) => total + letter.charCodeAt(0),
    0
  )
  return AVATAR_TONES[hash % AVATAR_TONES.length] as string
}

const initialsOf = (nickname: string): string => {
  const [first, second] = nickname.trim().split(/\s+/)
  return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase()
}

export function PlayerAvatar({
  playerId,
  nickname,
  size,
}: {
  playerId: PlayerId
  nickname: string
  size?: "sm" | "default" | "lg"
}) {
  return (
    <Avatar size={size} aria-hidden>
      <AvatarFallback
        className={cn("font-heading font-bold", toneOf(playerId))}
      >
        {initialsOf(nickname)}
      </AvatarFallback>
    </Avatar>
  )
}
