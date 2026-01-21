/**
 * Hook for pre-validating content against zone budgets.
 * Estimates token count and checks if adding content would exceed limits.
 */

import { useCallback, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

interface BudgetCheckResult {
  currentTokens: number
  additionalTokens: number
  newTotal: number
  budget: number
  wouldExceed: boolean
  percentUsed: number
  warning: boolean
  danger: boolean
}

interface UseBudgetCheckOptions {
  sessionId: Id<"sessions">
}

interface UseBudgetCheckResult {
  /** Check if content would exceed budget for a zone */
  checkBudget: (zone: string, content: string) => Promise<BudgetCheckResult | null>
  /** Estimate tokens for content (uses query) */
  estimateTokens: (content: string) => Promise<number | null>
  /** Current zone metrics (reactive) */
  metrics: ReturnType<typeof useQuery<typeof api.metrics.getZoneMetrics>> | undefined
  /** Loading state */
  isLoading: boolean
}

// Simple client-side token estimation (4 chars/token approximation)
// This avoids a round-trip for estimation
function quickEstimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function useBudgetCheck({ sessionId }: UseBudgetCheckOptions): UseBudgetCheckResult {
  const [isLoading, setIsLoading] = useState(false)

  // Get zone metrics reactively
  const metrics = useQuery(api.metrics.getZoneMetrics, { sessionId })

  const checkBudget = useCallback(
    async (zone: string, content: string): Promise<BudgetCheckResult | null> => {
      if (!metrics) return null

      // Use quick client-side estimation
      const additionalTokens = quickEstimateTokens(content)

      // Get zone data
      const zoneKey = zone.toUpperCase() as keyof typeof metrics.zones
      const zoneData = metrics.zones[zoneKey]

      if (!zoneData) return null

      const newTotal = zoneData.tokens + additionalTokens
      const percentUsed = Math.round((newTotal / zoneData.budget) * 100)

      return {
        currentTokens: zoneData.tokens,
        additionalTokens,
        newTotal,
        budget: zoneData.budget,
        wouldExceed: newTotal > zoneData.budget,
        percentUsed,
        warning: percentUsed > 80 && percentUsed <= 95,
        danger: percentUsed > 95,
      }
    },
    [metrics]
  )

  const estimateTokens = useCallback(
    async (content: string): Promise<number | null> => {
      setIsLoading(true)
      try {
        // Use quick client-side estimation
        return quickEstimateTokens(content)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return {
    checkBudget,
    estimateTokens,
    metrics,
    isLoading,
  }
}

/**
 * Get budget status for a zone from metrics.
 */
export function getZoneBudgetStatus(
  metrics: ReturnType<typeof useQuery<typeof api.metrics.getZoneMetrics>> | undefined,
  zone: string
): { warning: boolean; danger: boolean; percentUsed: number } | null {
  if (!metrics) return null

  const zoneKey = zone.toUpperCase() as keyof typeof metrics.zones
  const zoneData = metrics.zones[zoneKey]

  if (!zoneData) return null

  const percentUsed = Math.round((zoneData.tokens / zoneData.budget) * 100)

  return {
    warning: percentUsed > 80 && percentUsed <= 95,
    danger: percentUsed > 95,
    percentUsed,
  }
}
