"use client"

import { useRef, useState } from "react"

import { useGame } from "@/hooks/use-game"
import type { Refusal } from "@/lib/game/application/game-session"
import { DEFAULT_GAME_ID } from "@/lib/game/domain/catalog"
import { nicknameProblem, roomCodeProblem } from "@/lib/game/domain/room-entry"
import type { GameId } from "@/lib/game/domain/types"
import { gameSession } from "@/lib/game/session"

export type EntryMode = "criar" | "entrar"

export const ENTRY_ANCHOR = "entrar"

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth"

export const useEntry = () => {
  const { connection, inviteCode, notice } = useGame()
  const nicknameInput = useRef<HTMLInputElement>(null)
  const [typedCode, setTypedCode] = useState<string | null>(null)
  const [chosenMode, setChosenMode] = useState<EntryMode | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [gameId, setGameId] = useState<GameId>(DEFAULT_GAME_ID)

  const code = typedCode ?? inviteCode ?? ""
  const mode = chosenMode ?? (inviteCode ? "entrar" : "criar")

  const enter = async (run: (name: string) => Promise<Refusal>) => {
    const name = nicknameInput.current?.value.trim() ?? ""
    const invalid = nicknameProblem(name)
    setProblem(invalid)
    gameSession.dismissNotice()
    if (invalid) return
    setBusy(true)
    setProblem(await run(name))
    setBusy(false)
  }

  const focusEntry = () => {
    document
      .getElementById(ENTRY_ANCHOR)
      ?.scrollIntoView({ behavior: scrollBehavior(), block: "center" })
    nicknameInput.current?.focus({ preventScroll: true })
  }

  const join = () => {
    const invalid = roomCodeProblem(code)
    if (invalid) return setProblem(invalid)
    void enter((name) => gameSession.joinRoom(code, name))
  }

  const entry = {
    connection,
    inviteCode,
    code,
    mode,
    gameId,
    busy,
    blocked: busy || connection !== "online",
    invited: mode === "entrar" && inviteCode !== null && code === inviteCode,
    message: problem ?? notice,
    setCode: setTypedCode,
    setGameId,
    changeMode: (next: EntryMode) => {
      setChosenMode(next)
      setProblem(null)
    },
    create: () => void enter((name) => gameSession.createRoom(name, gameId)),
    join,
    chooseGame: (next: GameId) => {
      setGameId(next)
      setChosenMode("criar")
      setProblem(null)
    },
    pickGame: (next: GameId) => {
      setGameId(next)
      setChosenMode("criar")
      setProblem(null)
      focusEntry()
    },
    openEntry: (next: EntryMode) => {
      setChosenMode(next)
      setProblem(null)
      focusEntry()
    },
  }
  return [entry, nicknameInput] as const
}

export type Entry = ReturnType<typeof useEntry>[0]
