/**
 * Main compression service with provider routing.
 * Handles single block, multi-block merge, and zone compression.
 */

import type { Id } from "../../../convex/_generated/dataModel"
import type {
  CompressionProvider,
  CompressionResult,
  CompressionStrategy,
  ProviderConfig,
} from "./types"
import {
  compressSemantic,
  estimateTokens,
  estimateQuality,
} from "./strategies/semantic"
import * as settings from "@/lib/llm/settings"

/**
 * Block interface (subset of Convex block type).
 */
export interface Block {
  _id: Id<"blocks">
  content: string
  type: string
  tokens?: number
  isCompressed?: boolean
}

/**
 * Minimum token count for compression (avoid overhead for small blocks).
 */
const MIN_TOKENS_FOR_COMPRESSION = 100

/**
 * Minimum compression ratio to be considered "effective" (1.2x = 20% reduction).
 */
const MIN_COMPRESSION_RATIO = 1.2

/**
 * CompressionService handles all compression operations.
 */
export class CompressionService {
  private provider: CompressionProvider
  private providerConfig: ProviderConfig

  constructor(provider?: CompressionProvider, config?: Partial<ProviderConfig>) {
    // Auto-detect provider if not specified
    this.provider = provider || this.detectProvider()

    // Build provider config
    this.providerConfig = {
      provider: this.provider,
      ollamaUrl: config?.ollamaUrl || settings.ollama.getUrl(),
      ollamaModel: config?.ollamaModel || settings.ollama.getModel(),
      openrouterModel: config?.openrouterModel || settings.openrouter.getModel(),
    }
  }

  /**
   * Auto-detect best available provider based on configuration.
   */
  private detectProvider(): CompressionProvider {
    // Check if OpenRouter is configured
    if (settings.openrouter.isConfigured()) {
      return "openrouter"
    }

    // Default to Ollama (assumes it's available locally)
    return "ollama"

    // Note: Claude Code provider is handled separately via Convex action
    // and requires feature flag check on backend
  }

  /**
   * Compress a single block.
   */
  async compressBlock(
    block: Block,
    strategy: CompressionStrategy = "semantic"
  ): Promise<CompressionResult> {
    const startTime = Date.now()

    // Validate block is suitable for compression
    const validation = this.validateBlock(block)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason || "Block validation failed",
        originalTokens: block.tokens || 0,
        compressedTokens: 0,
        compressionRatio: 1,
        tokensSaved: 0,
        strategy,
      }
    }

    try {
      // Compress based on strategy
      const compressedContent = await this.compressContent(
        block.content,
        strategy,
        block.type
      )

      // Count tokens
      const originalTokens = block.tokens || estimateTokens(block.content)
      const compressedTokens = estimateTokens(compressedContent)
      const compressionRatio = originalTokens / compressedTokens

      // Validate compression was effective
      if (compressionRatio < MIN_COMPRESSION_RATIO) {
        return {
          success: false,
          error: `Compression ratio ${compressionRatio.toFixed(
            2
          )}x is below minimum ${MIN_COMPRESSION_RATIO}x`,
          originalTokens,
          compressedTokens,
          compressionRatio,
          tokensSaved: 0,
          strategy,
        }
      }

      // Check quality
      const quality = estimateQuality(block.content, compressedContent)
      if (quality < 0.6) {
        return {
          success: false,
          error: `Compression quality ${(quality * 100).toFixed(
            0
          )}% is too low`,
          originalTokens,
          compressedTokens,
          compressionRatio,
          tokensSaved: 0,
          strategy,
        }
      }

      return {
        success: true,
        blockId: block._id,
        originalTokens,
        compressedTokens,
        compressionRatio,
        tokensSaved: originalTokens - compressedTokens,
        compressedContent,
        strategy,
        provider: this.provider,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        originalTokens: block.tokens || 0,
        compressedTokens: 0,
        compressionRatio: 1,
        tokensSaved: 0,
        strategy,
      }
    }
  }

  /**
   * Compress raw text content (used for merge operations).
   */
  async compressText(
    content: string,
    strategy: CompressionStrategy = "semantic",
    contentType: string = "text"
  ): Promise<{
    compressedContent: string
    originalTokens: number
    compressedTokens: number
    compressionRatio: number
  }> {
    const compressedContent = await this.compressContent(
      content,
      strategy,
      contentType
    )

    const originalTokens = estimateTokens(content)
    const compressedTokens = estimateTokens(compressedContent)
    const compressionRatio = originalTokens / compressedTokens

    return {
      compressedContent,
      originalTokens,
      compressedTokens,
      compressionRatio,
    }
  }

  /**
   * Compress content using the specified strategy.
   */
  private async compressContent(
    content: string,
    strategy: CompressionStrategy,
    contentType: string
  ): Promise<string> {
    switch (strategy) {
      case "semantic":
        return compressSemantic(content, {
          provider: this.provider,
          targetRatio: 2.0, // Target 50% reduction
          contentType,
          ollamaModel: this.providerConfig.ollamaModel,
          ollamaUrl: this.providerConfig.ollamaUrl,
          openrouterModel: this.providerConfig.openrouterModel,
        })

      case "structural":
        throw new Error("Structural compression not yet implemented")

      case "statistical":
        throw new Error("Statistical compression not yet implemented")

      default:
        throw new Error(`Unknown strategy: ${strategy}`)
    }
  }

  /**
   * Validate that a block is suitable for compression.
   */
  private validateBlock(block: Block): {
    valid: boolean
    reason?: string
  } {
    // Allow re-compression of already compressed blocks
    // The new compression will overwrite the previous data

    // Check minimum token count
    const tokens = block.tokens || estimateTokens(block.content)
    if (tokens < MIN_TOKENS_FOR_COMPRESSION) {
      return {
        valid: false,
        reason: `Block has only ${tokens} tokens (minimum: ${MIN_TOKENS_FOR_COMPRESSION})`,
      }
    }

    // Check content exists
    if (!block.content || block.content.trim().length === 0) {
      return { valid: false, reason: "Block has no content" }
    }

    return { valid: true }
  }

  /**
   * Get current provider configuration.
   */
  getProvider(): CompressionProvider {
    return this.provider
  }

  /**
   * Get current provider config (for debugging).
   */
  getProviderConfig(): ProviderConfig {
    return this.providerConfig
  }
}

/**
 * Create a compression service with auto-detected provider.
 */
export function createCompressionService(
  provider?: CompressionProvider,
  config?: Partial<ProviderConfig>
): CompressionService {
  return new CompressionService(provider, config)
}
