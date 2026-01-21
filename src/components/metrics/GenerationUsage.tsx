/**
 * Component displaying generation usage statistics.
 * Shows input tokens, output tokens, cost, and duration.
 */

interface GenerationUsageProps {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  costUsd?: number
  durationMs?: number
  className?: string
}

export function GenerationUsage({
  inputTokens,
  outputTokens,
  totalTokens,
  costUsd,
  durationMs,
  className = "",
}: GenerationUsageProps) {
  // Don't render if no usage data
  if (!inputTokens && !outputTokens && !totalTokens) return null

  const formatTokens = (n: number): string => {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`
    }
    return n.toLocaleString()
  }

  const formatDuration = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`
    }
    return `${ms}ms`
  }

  const formatCost = (usd: number): string => {
    if (usd < 0.01) {
      return `$${usd.toFixed(4)}`
    }
    return `$${usd.toFixed(2)}`
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-3 text-xs text-muted-foreground ${className}`}
    >
      {inputTokens != null && (
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground/70">In:</span>
          <span className="font-mono">{formatTokens(inputTokens)}</span>
        </span>
      )}
      {outputTokens != null && (
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground/70">Out:</span>
          <span className="font-mono">{formatTokens(outputTokens)}</span>
        </span>
      )}
      {totalTokens != null && (
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground/70">Total:</span>
          <span className="font-mono">{formatTokens(totalTokens)}</span>
        </span>
      )}
      {costUsd != null && costUsd > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground/70">Cost:</span>
          <span className="font-mono">{formatCost(costUsd)}</span>
        </span>
      )}
      {durationMs != null && (
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground/70">Time:</span>
          <span className="font-mono">{formatDuration(durationMs)}</span>
        </span>
      )}
    </div>
  )
}
