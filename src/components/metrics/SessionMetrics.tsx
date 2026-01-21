/**
 * Panel displaying overall session token metrics and budgets.
 */

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { ZoneHeader } from "./ZoneHeader"
import { cn } from "@/lib/utils"

interface SessionMetricsProps {
  sessionId: Id<"sessions">
  collapsed?: boolean
  className?: string
}

// Zone display names
const ZONE_LABELS: Record<string, string> = {
  PERMANENT: "Permanent",
  STABLE: "Stable",
  WORKING: "Working",
}

export function SessionMetrics({
  sessionId,
  collapsed = false,
  className = "",
}: SessionMetricsProps) {
  const metrics = useQuery(api.metrics.getZoneMetrics, { sessionId })

  if (!metrics) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-2 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-full" />
          <div className="h-2 bg-muted rounded w-full" />
        </div>
      </div>
    )
  }

  // Calculate overall status
  const totalPercent = Math.round(
    (metrics.total.tokens / metrics.total.budget) * 100
  )
  const isDanger = totalPercent > 95
  const isWarning = totalPercent > 80 && totalPercent <= 95

  // Format numbers
  const formatTokens = (n: number): string => {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`
    }
    return n.toLocaleString()
  }

  if (collapsed) {
    // Compact view - just total
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 text-sm",
          isDanger && "text-destructive",
          isWarning && "text-yellow-600 dark:text-yellow-500",
          className
        )}
      >
        <span className="font-mono">
          {formatTokens(metrics.total.tokens)} / {formatTokens(metrics.total.budget)}
        </span>
        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isDanger
                ? "bg-destructive"
                : isWarning
                  ? "bg-yellow-500"
                  : "bg-primary"
            )}
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </div>
        <span className="font-mono text-xs">{totalPercent}%</span>
      </div>
    )
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <h3 className="font-semibold mb-3 text-foreground">Context Budget</h3>

      <div className="space-y-3">
        {/* Per-zone metrics */}
        {(Object.keys(metrics.zones) as Array<keyof typeof metrics.zones>).map(
          (zone) => (
            <ZoneHeader
              key={zone}
              zone={ZONE_LABELS[zone] || zone}
              blockCount={metrics.zones[zone].blocks}
              tokens={metrics.zones[zone].tokens}
              budget={metrics.zones[zone].budget}
            />
          )
        )}

        {/* Total - with divider */}
        <div className="pt-2 border-t border-border">
          <ZoneHeader
            zone="Total"
            blockCount={metrics.total.blocks}
            tokens={metrics.total.tokens}
            budget={metrics.total.budget}
          />
        </div>
      </div>
    </div>
  )
}
