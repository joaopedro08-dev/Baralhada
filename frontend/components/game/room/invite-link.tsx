"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { AnimatePresence, m } from "framer-motion"
import { Check, Copy, Share2 } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { Input } from "@/components/ui/input"

const FEEDBACK_MS = 2600

const subscribeToNothing = () => () => undefined
const canShareNatively = () => "share" in navigator
const cannotShareOnServer = () => false

type CopyFeedback = "copied" | "selected" | null

const FEEDBACK_TEXT: Readonly<Record<Exclude<CopyFeedback, null>, string>> = {
  copied: "Link copiado! Mande para os amigos.",
  selected: "Link selecionado. Copie e mande para os amigos.",
}

export function InviteLink({ url }: { url: string }) {
  const field = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<CopyFeedback>(null)
  const canShare = useSyncExternalStore(
    subscribeToNothing,
    canShareNatively,
    cannotShareOnServer
  )

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [feedback])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setFeedback("copied")
    } catch {
      field.current?.select()
      setFeedback("selected")
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: "Baralhada", url })
    } catch {
      return
    }
  }

  const copied = feedback === "copied"

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Input
          ref={field}
          readOnly
          value={url}
          aria-label="Link de convite"
          onFocus={(event) => event.target.select()}
          className="h-11 min-w-0 flex-1 px-3 text-sm md:text-sm"
        />
        <GameButton
          tone={copied ? "gold" : "panel"}
          variant="secondary"
          onClick={() => void copy()}
          className="min-w-28"
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copiado" : "Copiar"}
        </GameButton>
        {canShare && (
          <GameButton
            tone="panel"
            variant="secondary"
            aria-label="Compartilhar link"
            onClick={() => void share()}
            className="px-0"
          >
            <Share2 aria-hidden />
          </GameButton>
        )}
      </div>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        <AnimatePresence mode="wait">
          {feedback && (
            <m.span
              key={feedback}
              className="block"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {FEEDBACK_TEXT[feedback]}
            </m.span>
          )}
        </AnimatePresence>
      </p>
    </div>
  )
}
