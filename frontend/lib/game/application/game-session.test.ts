import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createGameSession,
  RESTORE_RETRY_MS,
} from "@/lib/game/application/game-session"
import type {
  Ack,
  AddressBar,
  GameGateway,
  GatewayListeners,
  GrantedSeat,
  SeatStore,
} from "@/lib/game/application/ports"
import { buildRoom } from "@/lib/game/domain/test-fixtures"
import type { Seat } from "@/lib/game/domain/types"

const SEAT: Seat = {
  code: "ABC234",
  nickname: "Ana",
  playerId: "ana",
  reconnectToken: "token-com-tamanho-valido",
  inviteUrl: "http://localhost/?sala=ABC234",
}

const grantedSeat: GrantedSeat = {
  code: SEAT.code,
  playerId: SEAT.playerId,
  reconnectToken: SEAT.reconnectToken,
}

const refused = (code: string, message = code): Ack<never> => ({
  ok: false,
  error: { code, message },
})

const setup = ({
  stored = null,
  invited = null,
}: { stored?: Seat | null; invited?: string | null } = {}) => {
  let listeners: GatewayListeners | null = null
  const send = vi.fn<(...args: unknown[]) => Promise<Ack<unknown>>>()
  const connected = { value: true }
  const gateway = {
    connect: (given: GatewayListeners) => {
      listeners = given
    },
    resume: vi.fn(),
    restart: vi.fn(),
    isConnected: () => connected.value,
    send,
  } as unknown as GameGateway
  const seats: SeatStore = {
    load: () => stored,
    save: vi.fn(),
    forget: vi.fn(),
  }
  const address: AddressBar = {
    invitedRoomCode: () => invited,
    showRoom: vi.fn(),
    inviteLink: (code) => `http://localhost/?sala=${code}`,
  }
  const session = createGameSession({
    gateway,
    seats,
    address,
    now: () => 0,
  })
  return {
    session,
    seats,
    address,
    send,
    gateway,
    connected,
    server: () => listeners as unknown as GatewayListeners,
  }
}

describe("sessão do jogo", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("volta para a sala guardada ao conectar", async () => {
    const { session, send, server } = setup({ stored: SEAT })
    send.mockResolvedValue({ ok: true, data: grantedSeat })
    session.start()
    expect(session.getState().restoring).toBe(true)

    server().onConnected()
    await vi.advanceTimersByTimeAsync(0)

    expect(send).toHaveBeenCalledWith("room:reconnect", {
      code: SEAT.code,
      nickname: SEAT.nickname,
      reconnectToken: SEAT.reconnectToken,
    })
    expect(session.getState().restoring).toBe(false)
    expect(session.getState().seat).toEqual(SEAT)
  })

  it("esquece o lugar quando a sala não existe mais", async () => {
    const { session, send, seats, address, server } = setup({ stored: SEAT })
    send.mockResolvedValue(refused("ROOM_NOT_FOUND", "Sala não encontrada."))
    session.start()
    server().onConnected()
    await vi.advanceTimersByTimeAsync(0)

    expect(seats.forget).toHaveBeenCalled()
    expect(address.showRoom).toHaveBeenLastCalledWith(null)
    expect(session.getState()).toMatchObject({
      seat: null,
      room: null,
      restoring: false,
      inviteCode: null,
      notice: "Essa sala foi encerrada. Crie uma nova para jogar de novo.",
    })
  })

  it("mantém o código no formulário quando o prazo de volta acabou", async () => {
    const { session, send, server } = setup({ stored: SEAT })
    send.mockResolvedValue(refused("INVALID_RECONNECT"))
    session.start()
    server().onConnected()
    await vi.advanceTimersByTimeAsync(0)

    expect(session.getState().seat).toBeNull()
    expect(session.getState().inviteCode).toBe(SEAT.code)
  })

  it("tenta de novo depois de uma falha passageira", async () => {
    const { session, send, server } = setup({ stored: SEAT })
    send
      .mockResolvedValueOnce(refused("TIMEOUT"))
      .mockResolvedValueOnce({ ok: true, data: grantedSeat })
    session.start()
    server().onConnected()
    await vi.advanceTimersByTimeAsync(RESTORE_RETRY_MS)

    expect(send).toHaveBeenCalledTimes(2)
    expect(session.getState().restoring).toBe(false)
  })

  it("para de tentar quando o servidor já devolveu o lugar", async () => {
    const { session, send, server } = setup({ stored: SEAT })
    send
      .mockResolvedValueOnce(refused("TIMEOUT"))
      .mockResolvedValueOnce(refused("ALREADY_IN_ROOM"))
    session.start()
    server().onConnected()
    await vi.advanceTimersByTimeAsync(RESTORE_RETRY_MS * 3)

    expect(send).toHaveBeenCalledTimes(2)
    expect(session.getState().restoring).toBe(false)
    expect(session.getState().seat).toEqual(SEAT)
  })

  it("permite desistir de voltar para a sala", () => {
    const { session, seats } = setup({ stored: SEAT })
    session.start()
    session.giveUpRestoring()

    expect(seats.forget).toHaveBeenCalled()
    expect(session.getState()).toMatchObject({ seat: null, restoring: false })
  })

  it("não volta para a sala se o jogador desistiu durante a tentativa", async () => {
    const { session, send, gateway, server } = setup({ stored: SEAT })
    let answer: (result: Ack<GrantedSeat>) => void = () => undefined
    send.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve
      })
    )
    session.start()
    server().onConnected()
    session.giveUpRestoring()
    answer({ ok: true, data: grantedSeat })
    await vi.advanceTimersByTimeAsync(0)

    expect(gateway.restart).toHaveBeenCalled()
    expect(session.getState()).toMatchObject({ seat: null, restoring: false })
  })

  it("troca de sala quando o convite aponta para outra", () => {
    const { session, seats } = setup({ stored: SEAT, invited: "XYZ234" })
    session.start()

    expect(seats.forget).toHaveBeenCalled()
    expect(session.getState()).toMatchObject({
      seat: null,
      restoring: false,
      inviteCode: "XYZ234",
    })
  })

  it("ignora estado antigo da mesma sala", () => {
    const { session, server } = setup()
    session.start()
    server().onRoomState(buildRoom({ version: 5 }))
    server().onRoomState(buildRoom({ version: 4, canStart: true }))

    expect(session.getState().room?.version).toBe(5)
  })

  it("aceita estado de versão menor quando a sala é outra", () => {
    const { session, server } = setup()
    session.start()
    server().onRoomState(buildRoom({ version: 5 }))
    server().onRoomState(buildRoom({ code: "XYZ234", version: 1 }))

    expect(session.getState().room?.code).toBe("XYZ234")
  })

  it("avisa e limpa tudo quando o anfitrião remove o jogador", () => {
    const { session, seats, server } = setup({ stored: SEAT })
    session.start()
    server().onRoomState(buildRoom())
    server().onRemoved()

    expect(seats.forget).toHaveBeenCalled()
    expect(session.getState()).toMatchObject({
      room: null,
      seat: null,
      notice: "O anfitrião removeu você da sala.",
    })
  })

  it("distingue outra aba de queda de rede", () => {
    const { session, server } = setup()
    session.start()
    server().onDisconnected("lost")
    expect(session.getState().connection).toBe("offline")
    server().onDisconnected("replaced")
    expect(session.getState().connection).toBe("replaced")
  })

  it("libera a sala ao sair, mesmo sem resposta do servidor", async () => {
    const { session, send, gateway, seats, server } = setup({ stored: SEAT })
    session.start()
    server().onRoomState(buildRoom())
    send.mockResolvedValue(refused("TIMEOUT"))
    await session.leaveRoom()

    expect(seats.forget).toHaveBeenCalled()
    expect(gateway.restart).toHaveBeenCalled()
    expect(session.getState()).toMatchObject({ room: null, seat: null })
  })

  it("devolve o motivo da recusa ao entrar na sala", async () => {
    const { session, send } = setup()
    send.mockResolvedValue(refused("ROOM_FULL", "A sala está cheia."))
    expect(await session.joinRoom("ABC234", "Bia")).toBe("A sala está cheia.")
    expect(session.getState().seat).toBeNull()
  })

  it("guarda o apelido junto do lugar concedido", async () => {
    const { session, send, seats, address } = setup()
    send.mockResolvedValue({ ok: true, data: grantedSeat })
    expect(await session.createRoom("Ana")).toBeNull()

    expect(seats.save).toHaveBeenCalledWith(SEAT)
    expect(address.showRoom).toHaveBeenCalledWith(SEAT.code)
  })
})
