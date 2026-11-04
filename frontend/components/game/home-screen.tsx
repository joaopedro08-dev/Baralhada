"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { BookOpen, DoorOpen, Plus } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import { GameButton } from "@/components/game/game-button"
import { RefusalMessage } from "@/components/game/refusal-message"
import { SiteFooter } from "@/components/game/site-footer"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGame } from "@/hooks/use-game"
import type { Refusal } from "@/lib/game/application/game-session"
import {
  NICKNAME_MAX_LENGTH,
  nicknameProblem,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
  roomCodeProblem,
} from "@/lib/game/domain/room-entry"
import { gameSession } from "@/lib/game/session"

type EntryMode = "criar" | "entrar"

const LONG_WAIT_MS = 8000

const ROOM_CODE_SLOTS = Array.from(
  { length: ROOM_CODE_LENGTH },
  (_, slot) => slot
)

function CardFan() {
  return (
    <div
      aria-hidden
      className="flex h-24 items-center justify-center short:hidden"
    >
      <div className="fan-card fan-left">
        <CardFace card="7C" size="flying" />
      </div>
      <div className="fan-card fan-center z-10 -mx-3">
        <CardFace card="7H" size="flying" />
      </div>
      <div className="fan-card fan-right">
        <CardFace card="7S" size="flying" />
      </div>
    </div>
  )
}

const describeConnection = (
  connection: string,
  waitedLong: boolean
): string => {
  if (waitedLong) {
    return "Ainda conectando. Se o servidor estava parado, isso pode levar cerca de 1 minuto."
  }
  return connection === "connecting"
    ? "Conectando ao servidor..."
    : "Sem conexão com o servidor. Tentando de novo..."
}

function ConnectionHint({ connection }: { connection: string }) {
  const online = connection === "online"
  const [waitedLong, setWaitedLong] = useState(false)

  useEffect(() => {
    if (online) return
    const timer = setTimeout(() => setWaitedLong(true), LONG_WAIT_MS)
    return () => clearTimeout(timer)
  }, [online])

  if (online) return null
  return (
    <p role="status" className="text-center text-sm text-muted-foreground">
      {describeConnection(connection, waitedLong)}
    </p>
  )
}

function RoomCodeField({
  code,
  onChange,
}: {
  code: string
  onChange: (code: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="codigo" className="text-sm">
        Código da sala
      </Label>
      <InputOTP
        id="codigo"
        aria-label="Código da sala"
        maxLength={ROOM_CODE_LENGTH}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        value={code}
        onChange={(value) => onChange(normalizeRoomCode(value))}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        pushPasswordManagerStrategy="none"
        containerClassName="justify-center"
      >
        <InputOTPGroup>
          {ROOM_CODE_SLOTS.map((slot) => (
            <InputOTPSlot
              key={slot}
              index={slot}
              className="size-11 font-mono text-lg font-bold"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  )
}

export function HomeScreen() {
  const { connection, inviteCode, notice } = useGame()
  const nicknameInput = useRef<HTMLInputElement>(null)
  const [typedCode, setTypedCode] = useState<string | null>(null)
  const [chosenMode, setChosenMode] = useState<EntryMode | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const code = typedCode ?? inviteCode ?? ""
  const mode = chosenMode ?? (inviteCode ? "entrar" : "criar")
  const invited =
    mode === "entrar" && inviteCode !== null && code === inviteCode
  const blocked = busy || connection !== "online"
  const message = problem ?? notice

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

  const create = () => void enter(gameSession.createRoom)

  const join = () => {
    const invalid = roomCodeProblem(code)
    if (invalid) return setProblem(invalid)
    void enter((name) => gameSession.joinRoom(code, name))
  }

  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-4 py-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <CardFan />
          <h1 className="animate-in font-heading text-4xl font-bold duration-500 fade-in slide-in-from-bottom-2 short:text-2xl">
            Rouba Monte
          </h1>
          <p className="text-sm text-felt-muted short:hidden">
            Junte quadras, roube as dos amigos e vença a mesa.
          </p>
        </header>

        <Card className="animate-in shadow-xl duration-500 fade-in slide-in-from-bottom-4">
          <CardContent>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                if (mode === "entrar") join()
                else create()
              }}
              className="flex flex-col gap-4"
            >
              {invited && (
                <p className="text-center text-base">
                  Você foi convidado para a sala{" "}
                  <strong className="font-mono">{inviteCode}</strong>.
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="apelido" className="text-sm">
                  Seu apelido
                </Label>
                <Input
                  id="apelido"
                  ref={nicknameInput}
                  maxLength={NICKNAME_MAX_LENGTH}
                  autoComplete="nickname"
                  enterKeyHint="go"
                  className="h-11 px-3 text-base md:text-base"
                />
              </div>

              {message && <RefusalMessage>{message}</RefusalMessage>}
              <ConnectionHint connection={connection} />

              <Tabs
                value={mode}
                onValueChange={(value) => {
                  setChosenMode(value as EntryMode)
                  setProblem(null)
                }}
                className="gap-4"
              >
                <TabsList className="h-12 w-full group-data-horizontal/tabs:h-12">
                  <TabsTrigger value="criar" className="min-h-11 text-sm">
                    Nova sala
                  </TabsTrigger>
                  <TabsTrigger value="entrar" className="min-h-11 text-sm">
                    Tenho um código
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="criar">
                  <GameButton
                    type="submit"
                    tone="gold"
                    disabled={blocked}
                    className="w-full"
                  >
                    <Plus aria-hidden />
                    Criar sala
                  </GameButton>
                </TabsContent>

                <TabsContent value="entrar" className="flex flex-col gap-4">
                  {!invited && (
                    <RoomCodeField code={code} onChange={setTypedCode} />
                  )}
                  <GameButton
                    type="submit"
                    tone="gold"
                    disabled={blocked}
                    className="w-full"
                  >
                    <DoorOpen aria-hidden />
                    Entrar na sala
                  </GameButton>
                </TabsContent>
              </Tabs>
            </form>
          </CardContent>
        </Card>

        <GameButton asChild>
          <Link href="/informacoes">
            <BookOpen aria-hidden />
            Regras e informações
          </Link>
        </GameButton>
      </main>
      <SiteFooter />
    </div>
  )
}
