/**
 * Zone header component displaying token usage and budget progress.
 */

import { cn } from "@/lib/utils"

interface ZoneHeaderProps {
  zone: string
  blockCount: number
  tokens: number
  budget: number
}

export function ZoneHeader({ zone, blockCount, tokens, budget }: ZoneHeaderProps) {
  const percentUsed = Math.round((tokens / budget) * 100)
  const isWarning = percentUsed > 80 && percentUsed <= 95
  const isDanger = percentUsed > 95

  // Format large numbers with K suffix
  const formatTokens = (n: number): string => {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`
    }
    return n.toLocaleString()
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-foreground">{zone}</h3>
        <span className="text-xs text-muted-foreground">
          {blockCount} {blockCount === 1 ? "block" : "blocks"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs font-mono",
            isDanger && "text-destructive",
            isWarning && "text-yellow-600 dark:text-yellow-500"
          )}
        >
          {formatTokens(tokens)} / {formatTokens(budget)}
        </span>
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isDanger
                ? "bg-destructive"
                : isWarning
                  ? "bg-yellow-500"
                  : "bg-primary"
            )}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
        <span
          className={cn(
            "text-xs font-mono w-10 text-right",
            isDanger && "text-destructive",
            isWarning && "text-yellow-600 dark:text-yellow-500"
          )}
        >
          {percentUsed}%
        </span>
      </div>
    </div>
  )
}
