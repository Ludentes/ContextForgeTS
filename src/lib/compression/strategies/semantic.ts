/**
 * Semantic compression strategy using LLM summarization.
 * Preserves meaning while reducing token count.
 */

import type { CompressionProvider, CompressionPromptVars } from "../types"
import * as ollama from "@/lib/llm/ollama"
import * as openrouter from "@/lib/llm/openrouter"

/**
 * Default compression prompt template.
 * Optimized to preserve critical information while reducing tokens.
 */
export const SEMANTIC_PROMPT_TEMPLATE = `You are a compression specialist. Compress the following {contentType} content from {originalTokens} tokens to approximately {originalTokens}/{targetRatio} tokens while preserving all critical information.

CRITICAL RULES:
- Keep ALL specific names, numbers, dates, and decisions
- Maintain chronological order
- Preserve technical terms and key concepts
- Remove redundant explanations and examples
- Keep conclusions and results
- Output ONLY the compressed content (no meta-commentary)
- If the same phrase is repeated, keep only the first occurrence

CONTENT TO COMPRESS:
{content}

COMPRESSED VERSION:`

/**
 * Compress content using semantic (LLM-based) strategy.
 */
export async function compressSemantic(
  content: string,
  options: {
    provider: CompressionProvider
    targetRatio?: number
    contentType?: string
    // Provider-specific options
    ollamaModel?: string
    ollamaUrl?: string
    openrouterModel?: string
  }
): Promise<string> {
  const targetRatio = options.targetRatio || 2.0
  const contentType = options.contentType || "text"

  // Build prompt
  const prompt = formatPrompt({
    content,
    originalTokens: estimateTokens(content),
    targetRatio,
    contentType,
  })

  // Route to appropriate provider
  switch (options.provider) {
    case "ollama":
      return compressWithOllama(prompt, options)
    case "openrouter":
      return compressWithOpenRouter(prompt, options)
    case "claude-code":
      throw new Error(
        "Claude Code compression must be called via Convex action"
      )
    default:
      throw new Error(`Unknown provider: ${options.provider}`)
  }
}

/**
 * Compress using Ollama (client-side).
 */
async function compressWithOllama(
  prompt: string,
  options: {
    ollamaModel?: string
    ollamaUrl?: string
  }
): Promise<string> {
  const messages: ollama.OllamaMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ]

  let compressed = ""

  // Stream and collect full response
  const generator = ollama.streamChat(messages, {
    model: options.ollamaModel,
    temperature: 0.2, // Low temperature for deterministic compression
    topP: 0.95,
  })

  for await (const chunk of generator) {
    compressed += chunk
  }

  return compressed.trim()
}

/**
 * Compress using OpenRouter (client-side).
 * Note: API key is retrieved from settings, not passed as parameter.
 */
async function compressWithOpenRouter(
  prompt: string,
  options: {
    openrouterModel?: string
  }
): Promise<string> {
  const messages: openrouter.OpenRouterMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ]

  let compressed = ""

  // Stream and collect full response
  const generator = openrouter.streamChat(messages, {
    model: options.openrouterModel,
    temperature: 0.2, // Low temperature for deterministic compression
    topP: 0.95,
  })

  for await (const chunk of generator) {
    compressed += chunk
  }

  return compressed.trim()
}

/**
 * Format the compression prompt with variables.
 */
function formatPrompt(vars: CompressionPromptVars): string {
  return SEMANTIC_PROMPT_TEMPLATE.replace(/\{(\w+)\}/g, (_, key) => {
    return String(vars[key as keyof CompressionPromptVars] || "")
  })
}

/**
 * Estimate token count (approximate: chars / 4).
 * This matches the approach in convex/lib/tokenizer.ts.
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4)
}

/**
 * Extract important words for quality checking.
 * Used to validate that compression preserved key information.
 */
export function extractImportantWords(text: string): string[] {
  const important: string[] = []

  // Numbers (important data points)
  const numbers = text.match(/\b\d+(?:\.\d+)?\b/g) || []
  important.push(...numbers)

  // Proper nouns (capitalized words)
  const properNouns = text.match(/\b[A-Z][a-z]+\b/g) || []
  important.push(...properNouns.slice(0, 10))

  // Technical terms (all caps, 2+ letters)
  const technical = text.match(/\b[A-Z]{2,}\b/g) || []
  important.push(...technical.slice(0, 5))

  return important
}

/**
 * Estimate quality of compression by checking information preservation.
 * Returns score from 0.0 to 1.0.
 */
export function estimateQuality(
  original: string,
  compressed: string
): number {
  const importantWords = extractImportantWords(original)

  if (importantWords.length === 0) {
    return 0.8 // No important words to check, assume decent quality
  }

  const compressedLower = compressed.toLowerCase()
  const preserved = importantWords.filter((word) =>
    compressedLower.includes(word.toLowerCase())
  ).length

  return Math.min(1.0, preserved / importantWords.length)
}
