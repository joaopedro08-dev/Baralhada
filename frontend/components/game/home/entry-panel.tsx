"use client"

import { useEffect, useState } from "react"
import { m } from "framer-motion"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { DoorOpen, Plus } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { GamePicker } from "@/components/game/game-picker"
import { ENTRY_ANCHOR } from "@/components/game/home/use-entry"
import type { Entry, EntryMode } from "@/components/game/home/use-entry"
import { RefusalMessage } from "@/components/game/refusal-message"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  return (
    <m.div
      id={ENTRY_ANCHOR}
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.15 }}
      className="w-full scroll-mt-6"
    >
      <Card className="shadow-2xl ring-2 ring-gold/40">
        <CardHeader>
          <CardTitle className="font-heading text-2xl font-bold">
            Sente-se à mesa
          </CardTitle>
          <CardDescription className="text-sm">
            Escolha um apelido e comece em segundos. Não precisa de conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              if (mode === "entrar") entry.join()
              else entry.create()
            }}
            className="flex flex-col gap-4"
          >
            {invited && (
              <p className="rounded-lg bg-gold/20 px-3 py-2 text-center text-base">
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
                placeholder="Como os amigos te chamam?"
                className="h-11 px-3 text-base md:text-base"
              />
            </div>

            {message && <RefusalMessage>{message}</RefusalMessage>}
            <ConnectionHint connection={connection} />

            <Tabs
              value={mode}
              onValueChange={(value) => entry.changeMode(value as EntryMode)}
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

              <TabsContent value="criar" className="flex flex-col gap-4">
                <GamePicker
                  detailed
                  value={gameId}
                  onChange={entry.setGameId}
                  disabled={busy}
                />
                <GameButton
                  type="submit"
                  tone="gold"
                  disabled={blocked}
                  className="h-12 w-full text-base"
                >
                  {busy ? <Spinner aria-hidden /> : <Plus aria-hidden />}
                  Criar sala
                </GameButton>
              </TabsContent>

              <TabsContent value="entrar" className="flex flex-col gap-4">
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
          </form>
        </CardContent>
      </Card>
    </m.div>
  )
}
