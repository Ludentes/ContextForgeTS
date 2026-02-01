/**
 * Compression types and interfaces.
 */

/**
 * Available compression strategies.
 */
export type CompressionStrategy = "semantic" | "structural" | "statistical"

/**
 * LLM providers that can perform compression.
 */
export type CompressionProvider = "ollama" | "openrouter" | "claude-code"

/**
 * Request to compress one or more blocks.
 */
export interface CompressionRequest {
  blockIds: string[] // One or more block IDs
  strategy?: CompressionStrategy // Auto-select if not specified
  targetRatio?: number // Target compression ratio (e.g., 2.0 for 50% reduction)
}

/**
 * Result of a compression operation.
 */
export interface CompressionResult {
  success: boolean
  blockId?: string // For single block compression
  newBlockId?: string // For merge operations
  error?: string

  // Metrics
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
  tokensSaved: number

  // Content (optional, for preview)
  compressedContent?: string
  strategy: CompressionStrategy

  // Metadata
  provider?: CompressionProvider
  model?: string
  durationMs?: number
}

/**
 * Result of a batch compression operation (multi-block or zone).
 */
export interface BatchCompressionResult {
  success: boolean
  error?: string

  // Results for individual blocks (for multi-block without merge)
  results?: CompressionResult[]

  // Merged result (for merge operations)
  mergedResult?: CompressionResult

  // Summary
  blocksProcessed: number
  blocksCompressed: number
  blocksFailed: number
  totalTokensSaved: number
  newBlockId?: string // ID of merged block
}

/**
 * Options for merge compression.
 */
export interface MergeCompressionOptions {
  blockIds: string[]
  strategy?: CompressionStrategy
  targetZone: string
  targetType: string
  targetTitle?: string
}

/**
 * Options for zone compression.
 */
export interface ZoneCompressionOptions {
  zone: string
  sessionId: string
  strategy?: CompressionStrategy
  newBlockTitle?: string
  newBlockType?: string
}

/**
 * Provider configuration for compression.
 */
export interface ProviderConfig {
  provider: CompressionProvider
  // Ollama
  ollamaUrl?: string
  ollamaModel?: string
  // OpenRouter
  openrouterApiKey?: string
  openrouterModel?: string
}

/**
 * Compression prompt template variables.
 */
export interface CompressionPromptVars {
  content: string
  originalTokens: number
  targetRatio: number
  contentType: string
}
