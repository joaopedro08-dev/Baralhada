"use client"

import { useEffect, useState } from "react"
import { m } from "framer-motion"
import { Check, Copy } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { InviteLink } from "@/components/game/room/invite-link"

const FEEDBACK_MS = 2200

function CodeTiles({ code }: { code: string }) {
  return (
    <h1 className="flex justify-center gap-1.5 sm:justify-start">
      <span className="sr-only">Sala {code}</span>
      {[...code].map((letter, position) => (
        <m.span
          key={position}
          aria-hidden
          initial={{ y: 16, opacity: 0, rotate: -8 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{
            delay: position * 0.05,
            type: "spring",
            stiffness: 300,
          }}
          className="flex h-14 w-11 items-center justify-center rounded-lg bg-playing-card font-mono text-3xl font-bold text-suit-black shadow-md ring-1 ring-black/20 sm:h-16 sm:w-12"
        >
          {letter}
        </m.span>
      ))}
    </h1>
  )
}

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
  return (
    <section
      aria-label="Convite da sala"
      className="relative grid overflow-hidden rounded-3xl bg-felt-deep text-felt-foreground shadow-xl ring-1 ring-gold/40 md:grid-cols-[auto_1fr]"
    >
      <div className="flex flex-col items-center gap-3 p-5 sm:items-start">
        <p className="text-sm font-semibold tracking-widest text-gold uppercase">
          Código da sala
        </p>
        <CodeTiles code={code} />
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
            <InviteLink url={inviteUrl} />
          </div>
        )}
      </div>
    </section>
  )
}
