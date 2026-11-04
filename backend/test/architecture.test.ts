import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceRoot = join(root, "src")

const listFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? listFiles(path) : path.endsWith(".ts") ? [path] : []
  })

const importsOf = (file: string): string[] =>
  ts
    .preProcessFile(readFileSync(file, "utf8"), true, true)
    .importedFiles.map((imported) => imported.fileName)

const layerOf = (file: string): string => relative(sourceRoot, file).split(sep)[0] as string

const ALLOWED_LAYERS: Readonly<Record<string, readonly string[]>> = {
  domain: ["domain"],
  application: ["application", "domain"],
  adapters: ["adapters", "application", "domain"],
  infrastructure: ["infrastructure", "adapters", "application", "domain"],
  main: ["main", "infrastructure", "adapters", "application", "domain"],
}

const ALLOWED_PACKAGES: Readonly<Record<string, readonly string[]>> = {
  domain: [],
  application: [],
  adapters: ["zod"],
  infrastructure: ["node:", "pino", "prom-client", "socket.io"],
  main: ["zod"],
}

const commentsIn = (file: string): number => {
  const text = readFileSync(file, "utf8")
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const positions = new Set<number>()
  const visit = (node: ts.Node): void => {
    const ranges = [
      ...(ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []),
      ...(ts.getTrailingCommentRanges(text, node.getEnd()) ?? []),
    ]
    for (const range of ranges) positions.add(range.pos)
    node.getChildren(source).forEach(visit)
  }
  visit(source)
  return positions.size
}

describe("arquitetura limpa", () => {
  const files = listFiles(sourceRoot)

  it.each(files.map((file) => [relative(root, file), file] as const))(
    "%s respeita a regra de dependência",
    (_name, file) => {
      const layer = layerOf(file)
      for (const specifier of importsOf(file)) {
        if (specifier.startsWith(".")) {
          const target = layerOf(resolve(dirname(file), specifier))
          expect(ALLOWED_LAYERS[layer], `${layer} -> ${target}`).toContain(target)
        } else {
          const allowed = ALLOWED_PACKAGES[layer] ?? []
          expect(
            allowed.some((prefix) => specifier.startsWith(prefix)),
            `${layer} -> ${specifier}`
          ).toBe(true)
        }
      }
    }
  )
})

const GAME_SPECIFIC = [join("domain", "games"), join("use-cases", "rouba-monte")]

const isGameSpecific = (file: string): boolean =>
  GAME_SPECIFIC.some((part) => relative(sourceRoot, file).includes(part))

describe("plataforma separada dos jogos", () => {
  const platformFiles = listFiles(sourceRoot).filter(
    (file) => ["domain", "application"].includes(layerOf(file)) && !isGameSpecific(file)
  )

  it.each(platformFiles.map((file) => [relative(root, file), file] as const))(
    "%s não depende de um jogo específico",
    (_name, file) => {
      for (const specifier of importsOf(file).filter((imported) => imported.startsWith("."))) {
        expect(isGameSpecific(resolve(dirname(file), specifier)), specifier).toBe(false)
      }
    }
  )
})

describe("código limpo", () => {
  const directories = ["src", "test", "perf"].map((directory) => join(root, directory))
  const files = directories.flatMap(listFiles)

  it.each(files.map((file) => [relative(root, file), file] as const))(
    "%s não tem comentários",
    (_name, file) => {
      expect(commentsIn(file)).toBe(0)
    }
  )
})
