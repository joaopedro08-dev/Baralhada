import { describe, expect, it } from "vitest"
import { AddressRoomQuota } from "../../src/adapters/socket/address-room-quota.js"

const setup = (limit = 2) => {
  const rooms = new Set<string>()
  const quota = new AddressRoomQuota(limit, (code) => rooms.has(code))
  const open = (address: string, code: string) => {
    rooms.add(code)
    quota.record(address, code)
  }
  return { rooms, quota, open }
}

describe("limite de salas por IP", () => {
  it("aceita até o limite e recusa depois", () => {
    const { quota, open } = setup()
    expect(quota.hasRoomFor("1.1.1.1")).toBe(true)
    open("1.1.1.1", "A")
    expect(quota.hasRoomFor("1.1.1.1")).toBe(true)
    open("1.1.1.1", "B")
    expect(quota.hasRoomFor("1.1.1.1")).toBe(false)
  })

  it("conta cada IP separadamente", () => {
    const { quota, open } = setup()
    open("1.1.1.1", "A")
    open("1.1.1.1", "B")
    expect(quota.hasRoomFor("2.2.2.2")).toBe(true)
  })

  it("devolve a vaga quando a sala é apagada", () => {
    const { rooms, quota, open } = setup()
    open("1.1.1.1", "A")
    open("1.1.1.1", "B")
    rooms.delete("A")
    expect(quota.hasRoomFor("1.1.1.1")).toBe(true)
  })

  it("não conta a mesma sala duas vezes", () => {
    const { quota, open } = setup()
    open("1.1.1.1", "A")
    open("1.1.1.1", "A")
    expect(quota.hasRoomFor("1.1.1.1")).toBe(true)
  })
})
