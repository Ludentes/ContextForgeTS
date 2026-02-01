/**
 * Zone header component displaying token usage and budget progress.
 */

import { cn } from "@/lib/utils"
import { Minimize2 } from "lucide-react"

interface ZoneHeaderProps {
  zone: string
  blockCount: number
  tokens: number
  budget: number
  onCompress?: () => void
  isCompressing?: boolean
}

export function ZoneHeader({
  zone,
  blockCount,
  tokens,
  budget,
  onCompress,
  isCompressing,
}: ZoneHeaderProps) {
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
        {onCompress && blockCount > 1 && (
          <button
            onClick={onCompress}
            disabled={isCompressing}
            className="px-1.5 py-0.5 text-[10px] rounded border border-input hover:bg-muted disabled:opacity-50 flex items-center gap-1"
            title="Compress all blocks in this zone"
          >
            <Minimize2 className="w-2.5 h-2.5" />
            {isCompressing ? "..." : "Compress"}
          </button>
        )}
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
