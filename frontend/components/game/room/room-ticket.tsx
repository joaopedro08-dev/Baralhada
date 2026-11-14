"use client"

import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { InviteLink } from "@/components/game/room/invite-link"
import {
  RoomCodeVisibility,
  useRoomVisibility,
} from "@/components/game/room/room-code-visibility"
import { loadPlayerPreferences } from "@/lib/game/infrastructure/player-preferences"

const FEEDBACK_MS = 2200

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <GameButton
      tone={copied ? "gold" : "felt"}
      onClick={() => void copy()}
      aria-live="polite"
      className="min-w-40"
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Código copiado" : "Copiar código"}
    </GameButton>
  )
}

export function RoomTicket({
  code,
  inviteUrl,
}: {
  code: string
  inviteUrl: string | null
}) {
  const [visible, setVisible] = useRoomVisibility(
    loadPlayerPreferences().showRoomCodeByDefault
  )
  return (
    <section
      aria-label="Convite da sala"
      className="relative grid overflow-hidden rounded-3xl bg-felt-deep text-felt-foreground shadow-xl ring-1 ring-gold/40 md:grid-cols-[auto_1fr]"
    >
      <div className="flex flex-col items-center gap-3 p-5 sm:items-start">
        <p className="text-sm font-semibold tracking-widest text-gold uppercase">
          Código da sala
        </p>
        <h1>
          <RoomCodeVisibility
            code={code}
            variant="tiles"
            visible={visible}
            onVisibleChange={setVisible}
          />
        </h1>
        <CopyCodeButton code={code} />
      </div>
      <div className="relative flex flex-col justify-center gap-2 border-t-2 border-dashed border-felt-line/70 p-5 md:border-t-0 md:border-l-2">
        <span
          aria-hidden
          className="absolute -top-3 -left-3 size-6 rounded-full bg-felt"
        />
        <span
          aria-hidden
          className="absolute -top-3 -right-3 size-6 rounded-full bg-felt md:top-auto md:right-auto md:-bottom-3 md:-left-3"
        />
        <p className="font-heading text-lg font-semibold">Chame a turma</p>
        <p className="text-sm text-felt-muted">
          Mande o link no grupo. Quem abrir cai direto aqui, com o código
          preenchido.
        </p>
        {inviteUrl && (
          <div className="mt-1 [&_[role=status]]:text-felt-muted [&_input]:bg-felt [&_input]:text-felt-foreground">
            <InviteLink url={inviteUrl} visible={visible} />
          </div>
        )}
      </div>
    </section>
  )
}
