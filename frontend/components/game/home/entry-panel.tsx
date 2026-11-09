"use client"

import { useEffect, useState } from "react"
import { m } from "framer-motion"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { DoorOpen, Mail, Plus } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { GamePicker } from "@/components/game/game-picker"
import { ENTRY_ANCHOR } from "@/components/game/home/use-entry"
import type { Entry, EntryMode } from "@/components/game/home/use-entry"
import { RefusalMessage } from "@/components/game/refusal-message"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { gameInfo } from "@/lib/game/domain/catalog"
import {
  NICKNAME_MAX_LENGTH,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
} from "@/lib/game/domain/room-entry"

const LONG_WAIT_MS = 8000

const ROOM_CODE_SLOTS = Array.from(
  { length: ROOM_CODE_LENGTH },
  (_, slot) => slot
)

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
    <p
      role="status"
      className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"
    >
      <Spinner aria-hidden className="size-4" />
      {describeConnection(connection, waitedLong)}
    </p>
  )
}

function StepBullet({ step }: { step: number }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-felt-deep font-heading text-xs font-bold text-gold"
    >
      {step}
    </span>
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
              className="h-12 w-11 font-mono text-lg font-bold sm:w-12"
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <p className="text-center text-xs text-muted-foreground">
        São {ROOM_CODE_LENGTH} letras e números. Peça a quem criou a sala.
      </p>
    </div>
  )
}

function InviteTicket({ code }: { code: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-xl bg-felt-deep p-4 text-center text-felt-foreground ring-2 ring-gold/70"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-gold">
        <Mail aria-hidden className="size-4" />
        Você recebeu um convite
      </span>
      <p className="sr-only">Código da sala: {code}</p>
      <span aria-hidden className="flex gap-1 [perspective:600px]">
        {[...code].map((letter, position) => (
          <m.span
            key={position}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 0.15 + position * 0.06 }}
            className="flex h-11 w-8 items-center justify-center rounded-md bg-playing-card font-mono text-xl font-bold text-suit-black shadow-md sm:w-9"
          >
            {letter}
          </m.span>
        ))}
      </span>
      <p className="text-sm text-felt-muted">
        Escolha seu apelido e toque em Entrar na sala.
      </p>
    </m.div>
  )
}

export function EntryPanel({
  entry,
  nicknameInput,
}: {
  entry: Entry
  nicknameInput: React.RefObject<HTMLInputElement | null>
}) {
  const {
    mode,
    invited,
    inviteCode,
    code,
    gameId,
    busy,
    blocked,
    message,
    connection,
  } = entry
  const game = gameInfo(gameId)

  return (
    <m.div
      id={ENTRY_ANCHOR}
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.15 }}
      className="relative w-full scroll-mt-24 pt-3"
    >
      <div
        aria-hidden
        className="card-back absolute inset-x-8 top-0 h-8 rotate-2 rounded-xl shadow-lg sm:inset-x-12"
      />
      <div
        aria-hidden
        className="card-back absolute inset-x-5 top-1.5 h-8 -rotate-1 rounded-xl shadow-lg sm:inset-x-8"
      />
      <Card className="relative gap-0 overflow-hidden py-0 shadow-2xl ring-2 ring-gold/50">
        <div className="relative flex flex-col gap-1 bg-felt-deep px-5 py-4 text-felt-foreground">
          <h2 className="font-heading text-2xl font-bold">
            {invited ? "Sua cadeira está guardada" : "Sente-se à mesa"}
          </h2>
          <p className="text-sm text-felt-muted">
            Sem conta e sem senha. Só um apelido e você está dentro.
          </p>
          <span
            aria-hidden
            className="absolute top-3 right-4 hidden font-heading text-xl tracking-widest text-felt-line select-none min-[400px]:block"
          >
            ♠♥♦♣
          </span>
        </div>
        <CardContent className="py-5">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              if (mode === "entrar") entry.join()
              else entry.create()
            }}
            className="flex flex-col gap-5"
          >
            {invited && inviteCode && <InviteTicket code={inviteCode} />}

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="apelido"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <StepBullet step={1} />
                Seu apelido
              </Label>
              <Input
                id="apelido"
                ref={nicknameInput}
                maxLength={NICKNAME_MAX_LENGTH}
                autoComplete="nickname"
                enterKeyHint="go"
                placeholder="Como os amigos te chamam?"
                className="h-12 px-3 text-base md:text-base"
              />
            </div>

            <Tabs
              value={mode}
              onValueChange={(value) => entry.changeMode(value as EntryMode)}
              className="gap-3"
            >
              <p
                id="titulo-modo"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <StepBullet step={2} />O que vamos fazer?
              </p>
              <TabsList
                aria-labelledby="titulo-modo"
                className="h-12 w-full group-data-horizontal/tabs:h-12"
              >
                <TabsTrigger value="criar" className="min-h-11 gap-1.5 text-sm">
                  <Plus aria-hidden />
                  Nova sala
                </TabsTrigger>
                <TabsTrigger
                  value="entrar"
                  className="min-h-11 gap-1.5 text-sm"
                >
                  <DoorOpen aria-hidden />
                  Tenho um código
                </TabsTrigger>
              </TabsList>

              <TabsContent value="criar" className="flex flex-col gap-3">
                <GamePicker
                  value={gameId}
                  onChange={entry.setGameId}
                  disabled={busy}
                  label="Jogo da nova sala"
                />
                <p className="text-xs text-muted-foreground">
                  Dá para trocar de jogo depois, no saguão da sala.
                </p>
                <GameButton
                  type="submit"
                  tone="gold"
                  disabled={blocked}
                  className="h-12 w-full text-base"
                >
                  {busy ? <Spinner aria-hidden /> : <Plus aria-hidden />}
                  Criar sala de {game.name}
                </GameButton>
              </TabsContent>

              <TabsContent value="entrar" className="flex flex-col gap-3">
                {!invited && (
                  <RoomCodeField code={code} onChange={entry.setCode} />
                )}
                <GameButton
                  type="submit"
                  tone="gold"
                  disabled={blocked}
                  className="h-12 w-full text-base"
                >
                  {busy ? <Spinner aria-hidden /> : <DoorOpen aria-hidden />}
                  Entrar na sala
                </GameButton>
              </TabsContent>
            </Tabs>

            {message && <RefusalMessage>{message}</RefusalMessage>}
            <ConnectionHint connection={connection} />
          </form>
        </CardContent>
      </Card>
    </m.div>
  )
}
