import { cn } from "@/lib/utils"

export function HistoryList({ history }: { history: readonly string[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma jogada ainda.</p>
    )
  }
  return (
    <ol className="flex flex-col gap-1 text-sm">
      {history.map((entry, position) => (
        <li
          key={`${history.length - position}-${entry}`}
          className={cn(position === 0 && "font-semibold")}
        >
          {entry}
        </li>
      ))}
    </ol>
  )
}
