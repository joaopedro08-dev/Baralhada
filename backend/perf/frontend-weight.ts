const TARGET = process.env["TARGET_URL"] ?? "http://localhost:3000"
const RTT_SECONDS = 0.15
const THROUGHPUT_BYTES_PER_SECOND = (1.6 * 1_000_000) / 8
const HANDSHAKE_ROUND_TRIPS = 3

const fetchAsset = async (url: string) => {
  const startedAt = performance.now()
  const response = await fetch(url, { headers: { "accept-encoding": "gzip, br" } })
  const firstByteMs = performance.now() - startedAt
  const body = await response.text()
  const encoding = response.headers.get("content-encoding")
  const declared = Number(response.headers.get("content-length") ?? 0)
  return {
    status: response.status,
    firstByteMs,
    encoding,
    body,
    bytes: declared > 0 ? declared : Buffer.byteLength(body),
    rawBytes: Buffer.byteLength(body),
  }
}

const compressedSize = async (body: string): Promise<number> => {
  const stream = new Blob([body]).stream().pipeThrough(new CompressionStream("gzip"))
  return (await new Response(stream).arrayBuffer()).byteLength
}

const page = await fetchAsset(TARGET)
const assetUrls = [
  ...new Set(
    [...page.body.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css|woff2))"/g)].map(
      (match) => match[1] as string
    )
  ),
]

const assets = await Promise.all(
  assetUrls.map(async (path) => {
    const asset = await fetchAsset(`${TARGET}${path}`)
    const transfer = path.endsWith(".woff2") ? asset.bytes : await compressedSize(asset.body)
    return { path, rawBytes: asset.rawBytes, transferBytes: transfer }
  })
)

const htmlTransfer = await compressedSize(page.body)
const byKind = (suffix: string) => assets.filter((asset) => asset.path.endsWith(suffix))
const sum = (items: readonly { transferBytes: number }[]) =>
  items.reduce((total, item) => total + item.transferBytes, 0)
const transferTotal = htmlTransfer + sum(assets)
const estimatedSeconds =
  HANDSHAKE_ROUND_TRIPS * RTT_SECONDS + RTT_SECONDS + transferTotal / THROUGHPUT_BYTES_PER_SECOND

console.log(
  JSON.stringify(
    {
      target: TARGET,
      status: page.status,
      firstByteMs: Number(page.firstByteMs.toFixed(1)),
      serverCompression: page.encoding,
      htmlTransferKb: Number((htmlTransfer / 1024).toFixed(1)),
      jsTransferKb: Number((sum(byKind(".js")) / 1024).toFixed(1)),
      cssTransferKb: Number((sum(byKind(".css")) / 1024).toFixed(1)),
      fontTransferKb: Number((sum(byKind(".woff2")) / 1024).toFixed(1)),
      totalTransferKb: Number((transferTotal / 1024).toFixed(1)),
      requests: assets.length + 1,
      estimated4gSeconds: Number(estimatedSeconds.toFixed(2)),
      goalSeconds: 3,
    },
    null,
    2
  )
)
