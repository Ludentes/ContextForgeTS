/**
 * Compression library - entry point.
 * Provides block compression with multiple strategies and providers.
 */

// Main service
export { CompressionService, createCompressionService } from "./compressionService"
export type { Block } from "./compressionService"

// Types
export type {
  CompressionStrategy,
  CompressionProvider,
  CompressionRequest,
  CompressionResult,
  BatchCompressionResult,
  MergeCompressionOptions,
  ZoneCompressionOptions,
  ProviderConfig,
  CompressionPromptVars,
} from "./types"

// Strategies
export {
  compressSemantic,
  estimateTokens,
  estimateQuality,
  extractImportantWords,
  SEMANTIC_PROMPT_TEMPLATE,
} from "./strategies/semantic"
