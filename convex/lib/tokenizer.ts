import { getEncoding, type Tiktoken } from "js-tiktoken"

// Cache encodings to avoid repeated initialization
const encodingCache = new Map<string, Tiktoken>()

/**
 * Get token count for text using appropriate encoding.
 *
 * Uses cl100k_base encoding which is used by:
 * - GPT-4, GPT-4 Turbo
 * - GPT-3.5 Turbo
 * - Claude models (approximate, but close enough)
 *
 * @param text - Text to count tokens for
 * @param model - Optional model name (currently all map to cl100k_base)
 * @returns Token count
 */
export function countTokens(text: string, model?: string): number {
  const encodingName = getEncodingForModel(model)

  let encoding = encodingCache.get(encodingName)
  if (!encoding) {
    encoding = getEncoding(encodingName)
    encodingCache.set(encodingName, encoding)
  }

  return encoding.encode(text).length
}

/**
 * Map model names to tiktoken encodings.
 * Currently all models use cl100k_base for simplicity.
 */
function getEncodingForModel(model?: string): "cl100k_base" | "p50k_base" | "r50k_base" {
  if (!model) return "cl100k_base"

  // Claude models - use cl100k_base (close approximation)
  if (model.includes("claude")) return "cl100k_base"

  // GPT-4 and GPT-3.5 Turbo
  if (model.includes("gpt-4")) return "cl100k_base"
  if (model.includes("gpt-3.5")) return "cl100k_base"

  // Older models (GPT-3, Codex)
  if (model.includes("davinci") || model.includes("curie")) return "p50k_base"

  // Default to cl100k_base (modern encoding)
  return "cl100k_base"
}

/**
 * Estimate tokens using fast approximation (4 chars/token).
 * Use when speed matters more than accuracy.
 *
 * Accuracy: ~75-80% for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Get the encoding name used for a model.
 * Useful for storing which encoding was used.
 */
export function getTokenModel(model?: string): string {
  return getEncodingForModel(model)
}

/**
 * Count tokens for multiple texts efficiently.
 * Reuses the same encoding instance.
 */
export function countTokensBatch(texts: string[], model?: string): number[] {
  const encodingName = getEncodingForModel(model)

  let encoding = encodingCache.get(encodingName)
  if (!encoding) {
    encoding = getEncoding(encodingName)
    encodingCache.set(encodingName, encoding)
  }

  return texts.map((text) => encoding!.encode(text).length)
}

// Default encoding for export
export const DEFAULT_TOKEN_MODEL = "cl100k_base"
