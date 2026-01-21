/**
 * Small badge displaying token count for a block.
 */

interface BlockTokenBadgeProps {
  tokens: number | null | undefined
  className?: string
}

export function BlockTokenBadge({ tokens, className = "" }: BlockTokenBadgeProps) {
  if (tokens == null) return null

  // Format large numbers
  const formatTokens = (n: number): string => {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`
    }
    return n.toLocaleString()
  }

  return (
    <span
      className={`inline-flex items-center text-xs text-muted-foreground font-mono ${className}`}
    >
      {formatTokens(tokens)} tokens
    </span>
  )
}
