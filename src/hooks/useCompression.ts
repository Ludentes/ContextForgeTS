/**
 * Hook for block compression with automatic provider routing.
 *
 * Supports two modes:
 * 1. Client-side (remote): Direct HTTP calls to Ollama/OpenRouter
 * 2. Server-side (local): Convex action calling Claude Code CLI
 *
 * The mode is determined by the CLAUDE_CODE_ENABLED feature flag.
 */

import { useState, useCallback } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import {
  CompressionService,
  type CompressionResult,
  type CompressionStrategy,
} from "@/lib/compression"
import { compression as compressionSettings } from "@/lib/llm/settings"

interface UseCompressionOptions {
  sessionId: Id<"sessions">
  onSuccess?: (result: CompressionResult) => void
  onError?: (error: string) => void
}

interface UseCompressionResult {
  // Single block compression
  compressSingle: (
    block: CompressableBlock,
    strategy?: CompressionStrategy
  ) => Promise<void>

  // Multi-block merge compression
  compressAndMerge: (
    blocks: CompressableBlock[],
    options: MergeOptions
  ) => Promise<void>

  // Zone compression (all blocks in zone)
  compressZone: (options: ZoneCompressionOptions) => Promise<void>

  // State
  isCompressing: boolean
  error: string | null
  result: CompressionResult | null
}

interface CompressableBlock {
  _id: Id<"blocks">
  content: string
  type: string
  tokens?: number
  isCompressed?: boolean
}

interface MergeOptions {
  strategy?: CompressionStrategy
  targetZone: string
  targetType: string
  targetTitle?: string
}

interface ZoneCompressionOptions {
  zone: string
  sessionId: Id<"sessions">
  strategy?: CompressionStrategy
}

/**
 * Hook for block compression with dual-mode support.
 *
 * Usage:
 * ```tsx
 * const { compressSingle, isCompressing } = useCompression({ sessionId })
 *
 * // Compress a single block
 * await compressSingle(block, "semantic")
 * ```
 */
export function useCompression(
  options: UseCompressionOptions
): UseCompressionResult {
  const { sessionId, onSuccess, onError } = options

  const [isCompressing, setIsCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompressionResult | null>(null)

  // Convex mutations
  const compressMutation = useMutation(api.blocks.compress)
  const compressAndMergeMutation = useMutation(api.blocks.compressAndMerge)

  // Convex actions for Claude Code (server-side)
  const compressWithClaudeCodeAction = useAction(
    api.compression.compressWithClaudeCode
  )
  const compressAndMergeWithClaudeCodeAction = useAction(
    api.compression.compressAndMergeWithClaudeCode
  )

  /**
   * Compress a single block.
   */
  const compressSingle = useCallback(
    async (
      block: CompressableBlock,
      strategy: CompressionStrategy = "semantic"
    ) => {
      setIsCompressing(true)
      setError(null)
      setResult(null)

      // Get compression provider setting
      const compressionProvider = compressionSettings.getProvider()

      console.log(`[Compression Client] Starting single block compression`)
      console.log(`[Compression Client] Block ID: ${block._id}, Strategy: ${strategy}`)
      console.log(`[Compression Client] Compression provider: ${compressionProvider}`)

      try {
        let compressionResult: CompressionResult

        if (compressionProvider === "claude-code") {
          // Server-side mode: Use Convex action → Claude Code CLI
          console.log(`[Compression Client] Using SERVER-SIDE Claude Code action`)
          const actionResult = await compressWithClaudeCodeAction({
            blockId: block._id,
            strategy,
          })

          compressionResult = {
            success: actionResult.success,
            blockId: actionResult.blockId,
            originalTokens: actionResult.originalTokens,
            compressedTokens: actionResult.compressedTokens,
            compressionRatio: actionResult.compressionRatio,
            tokensSaved: actionResult.tokensSaved,
            strategy,
            provider: "claude-code",
          }
        } else {
          // Client-side mode: Use compression service (Ollama/OpenRouter)
          console.log(`[Compression Client] Using CLIENT-SIDE compression service (${compressionProvider})`)
          const service = new CompressionService(compressionProvider)
          compressionResult = await service.compressBlock(block, strategy)

          if (!compressionResult.success) {
            throw new Error(
              compressionResult.error || "Compression failed"
            )
          }

          // Save to database
          await compressMutation({
            blockId: block._id,
            compressedContent: compressionResult.compressedContent!,
            originalTokens: compressionResult.originalTokens,
            compressedTokens: compressionResult.compressedTokens,
            compressionRatio: compressionResult.compressionRatio,
            strategy,
          })
        }

        console.log(`[Compression Client] Single block compression completed successfully`)
        console.log(`[Compression Client] Ratio: ${compressionResult.compressionRatio.toFixed(2)}x, Saved: ${compressionResult.tokensSaved} tokens`)

        setResult(compressionResult)
        onSuccess?.(compressionResult)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        console.error(`[Compression Client] Single block compression failed:`, message)
        setError(message)
        onError?.(message)
      } finally {
        setIsCompressing(false)
      }
    },
    [
      compressMutation,
      compressWithClaudeCodeAction,
      onSuccess,
      onError,
    ]
  )

  /**
   * Compress and merge multiple blocks into one.
   */
  const compressAndMerge = useCallback(
    async (blocks: CompressableBlock[], options: MergeOptions) => {
      if (blocks.length === 0) {
        const message = "No blocks to merge"
        setError(message)
        onError?.(message)
        return
      }

      setIsCompressing(true)
      setError(null)
      setResult(null)

      // Get compression provider setting
      const compressionProvider = compressionSettings.getProvider()

      console.log(`[Compression Client Merge] Starting multi-block compression`)
      console.log(`[Compression Client Merge] Block count: ${blocks.length}, Strategy: ${options.strategy || "semantic"}`)
      console.log(`[Compression Client Merge] Compression provider: ${compressionProvider}`)

      try {
        const strategy = options.strategy || "semantic"

        let compressedContent: string
        let originalTokens: number
        let compressedTokens: number
        let compressionRatio: number

        if (compressionProvider === "claude-code") {
          // Server-side: Use Claude Code action for merge compression
          console.log(`[Compression Client Merge] Using SERVER-SIDE Claude Code action`)
          const actionResult = await compressAndMergeWithClaudeCodeAction({
            blockIds: blocks.map((b) => b._id),
            strategy,
          })

          if (!actionResult.success) {
            throw new Error("Compression action failed")
          }

          compressedContent = actionResult.compressedContent
          originalTokens = actionResult.originalTokens
          compressedTokens = actionResult.compressedTokens
          compressionRatio = actionResult.compressionRatio
        } else {
          // Client-side mode: Combine and compress using service (Ollama/OpenRouter)
          console.log(`[Compression Client Merge] Using CLIENT-SIDE compression service (${compressionProvider})`)
          const combinedContent = blocks
            .map((block, index) => {
              const header = `## Block ${index + 1} (${block.type})`
              return `${header}\n\n${block.content}`
            })
            .join("\n\n---\n\n")

          const service = new CompressionService(compressionProvider)
          const compressResult = await service.compressText(
            combinedContent,
            strategy,
            "merged_blocks"
          )

          compressedContent = compressResult.compressedContent
          originalTokens = compressResult.originalTokens
          compressedTokens = compressResult.compressedTokens
          compressionRatio = compressResult.compressionRatio
        }

        // Validate compression
        if (compressionRatio < 1.2) {
          throw new Error(
            `Compression ratio ${compressionRatio.toFixed(
              2
            )}x is below minimum 1.2x`
          )
        }

        // Save merged block and delete originals
        const mergeResult = await compressAndMergeMutation({
          blockIds: blocks.map((b) => b._id),
          compressedContent,
          originalTokens,
          compressedTokens,
          compressionRatio,
          strategy,
          targetZone: options.targetZone,
          targetType: options.targetType,
          targetPosition: 0,
        })

        const compressionResult: CompressionResult = {
          success: true,
          newBlockId: mergeResult.newBlockId,
          originalTokens,
          compressedTokens,
          compressionRatio,
          tokensSaved: originalTokens - compressedTokens,
          strategy,
          provider: compressionProvider,
        }

        console.log(`[Compression Client Merge] Multi-block compression completed successfully`)
        console.log(`[Compression Client Merge] Ratio: ${compressionRatio.toFixed(2)}x, Saved: ${originalTokens - compressedTokens} tokens`)

        setResult(compressionResult)
        onSuccess?.(compressionResult)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        console.error(`[Compression Client Merge] Multi-block compression failed:`, message)
        setError(message)
        onError?.(message)
      } finally {
        setIsCompressing(false)
      }
    },
    [
      compressAndMergeWithClaudeCodeAction,
      compressAndMergeMutation,
      onSuccess,
      onError,
    ]
  )

  /**
   * Compress all blocks in a zone into one merged block.
   * Note: Blocks should be fetched by the caller and passed to compressAndMerge directly.
   * This function is kept for backward compatibility but is not the recommended approach.
   */
  const compressZone = useCallback(
    async (zoneOptions: ZoneCompressionOptions) => {
      const message = "compressZone is deprecated. Use compressAndMerge with zone blocks directly."
      setError(message)
      onError?.(message)
    },
    [onError]
  )

  return {
    compressSingle,
    compressAndMerge,
    compressZone,
    isCompressing,
    error,
    result,
  }
}
