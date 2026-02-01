"use node"

/**
 * Compression actions for server-side Claude Code integration.
 * Used when CLAUDE_CODE_ENABLED=true (local development).
 */

import { action } from "./_generated/server"
import { v } from "convex/values"
import { api } from "./_generated/api"
import { query as claudeQuery } from "@anthropic-ai/claude-agent-sdk"
import { execSync } from "child_process"
import * as fs from "fs"
import * as os from "os"
import { createGeneration, flushLangfuse } from "./lib/langfuse"

// Get Claude Code executable path by trying to locate it
const getClaudeCodePath = (): string | undefined => {
  // First try environment variable
  if (process.env.CLAUDE_CODE_PATH) {
    return process.env.CLAUDE_CODE_PATH
  }

  // Try using 'which' to find claude
  try {
    const result = execSync("which claude", { encoding: "utf8", timeout: 3000 })
    const path = result.trim()
    if (path && fs.existsSync(path)) {
      return path
    }
  } catch {
    // which failed
  }

  // Try common locations
  const home = os.homedir()
  const commonPaths = [
    `${home}/.local/bin/claude`,
    "/usr/local/bin/claude",
    "/usr/bin/claude",
  ]

  for (const path of commonPaths) {
    try {
      if (fs.existsSync(path)) {
        return path
      }
    } catch {
      // Path doesn't exist or not accessible
    }
  }

  return undefined
}

/**
 * Compress a block using Claude Code CLI (server-side).
 * Only works when running locally with Claude Code installed.
 */
export const compressWithClaudeCode = action({
  args: {
    blockId: v.id("blocks"),
    strategy: v.string(), // "semantic" | "structural" | "statistical"
  },
  handler: async (ctx, args) => {
    console.log(`[Compression Server] Starting single block compression: ${args.blockId}`)
    console.log(`[Compression Server] Strategy: ${args.strategy}`)

    // Fetch block data
    const block = await ctx.runQuery(api.blocks.get, { id: args.blockId })
    if (!block) {
      throw new Error("Block not found")
    }

    console.log(`[Compression Server] Block type: ${block.type}, tokens: ${block.tokens || "unknown"}`)

    // Validate block is suitable for compression
    // Allow re-compression - new compression will overwrite previous data

    const originalTokens = block.tokens || estimateTokens(block.content)
    if (originalTokens < 100) {
      throw new Error(
        `Block has only ${originalTokens} tokens (minimum: 100)`
      )
    }

    if (!block.content || block.content.trim().length === 0) {
      throw new Error("Block has no content")
    }

    // Build compression prompt based on strategy
    const prompt = buildCompressionPrompt({
      content: block.content,
      strategy: args.strategy,
      originalTokens,
      contentType: block.type,
    })

    const startTime = Date.now()
    console.log(`[Compression Server] Starting Claude Code compression...`)

    // Create LangFuse trace for observability
    const trace = createGeneration(
      "compression",
      {
        sessionId: block.sessionId,
        provider: "claude",
        model: "claude-code",
      },
      {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        prompt,
      }
    )

    try {
      // Call Claude Code using the Agent SDK
      let compressedContent = ""
      let hasReceivedStreamEvents = false
      let inputTokens: number | undefined
      let outputTokens: number | undefined
      let costUsd: number | undefined

      // Create timeout promise (5 minutes)
      const timeoutMs = 300000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Compression timed out after 5 minutes")), timeoutMs)
      })

      // Race between compression and timeout
      await Promise.race([
        (async () => {
          for await (const message of claudeQuery({
            prompt,
            options: {
              allowedTools: [], // Text-only mode
              maxTurns: 1,
              pathToClaudeCodeExecutable: getClaudeCodePath(),
              includePartialMessages: false, // Disable streaming for better performance
            },
          })) {
            const msgType = (message as Record<string, unknown>).type as string

            // Handle assistant messages (no streaming, just final result)
            if (msgType === "assistant") {
              const msg = message as Record<string, unknown>
              const msgContent = msg.message as Record<string, unknown> | undefined
              const content = msgContent?.content as Array<Record<string, unknown>> | undefined
              if (content) {
                for (const block of content) {
                  if (block.type === "text" && typeof block.text === "string") {
                    compressedContent += block.text
                  }
                }
              }
            }

            // Capture usage stats from result message
            if (msgType === "result") {
              const msg = message as Record<string, unknown>
              const usage = msg.usage as Record<string, unknown> | undefined
              if (usage) {
                inputTokens = usage.input_tokens as number | undefined
                outputTokens = usage.output_tokens as number | undefined
              }
              costUsd = msg.total_cost_usd as number | undefined
            }
          }
        })(),
        timeoutPromise,
      ])

      compressedContent = compressedContent.trim()

      if (!compressedContent) {
        throw new Error("Claude Code returned empty response")
      }

      // Count tokens and validate compression
      const compressedTokens = estimateTokens(compressedContent)
      const compressionRatio = originalTokens / compressedTokens

      if (compressionRatio < 1.2) {
        throw new Error(
          `Compression ratio ${compressionRatio.toFixed(
            2
          )}x is below minimum 1.2x`
        )
      }

      // Quality check (basic heuristic)
      const quality = estimateQuality(block.content, compressedContent)
      if (quality < 0.6) {
        console.warn(
          `[Compression Server] Warning: Compression quality ${(quality * 100).toFixed(0)}% is below recommended 60%`
        )
      }

      // Save compression result to database
      await ctx.runMutation(api.blocks.compress, {
        blockId: args.blockId,
        compressedContent,
        originalTokens,
        compressedTokens,
        compressionRatio,
        strategy: args.strategy,
      })

      // Complete LangFuse trace
      const durationMs = Date.now() - startTime
      console.log(`[Compression Server] Compression successful! Duration: ${durationMs}ms`)
      console.log(`[Compression Server] Ratio: ${compressionRatio.toFixed(2)}x, Saved: ${originalTokens - compressedTokens} tokens`)

      trace.complete({
        text: compressedContent,
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
        compressionRatio,
        tokensSaved: originalTokens - compressedTokens,
      })
      await flushLangfuse()

      return {
        success: true,
        blockId: args.blockId,
        originalTokens,
        compressedTokens,
        compressionRatio,
        tokensSaved: originalTokens - compressedTokens,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[Compression] Error for block ${args.blockId}:`, errorMessage)

      // Record error in LangFuse
      trace.error(errorMessage)
      await flushLangfuse()

      throw new Error(`Claude Code compression failed: ${errorMessage}`)
    }
  },
})

/**
 * Compress and merge multiple blocks using Claude Code CLI (server-side).
 */
export const compressAndMergeWithClaudeCode = action({
  args: {
    blockIds: v.array(v.id("blocks")),
    strategy: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Compression Server Merge] Starting multi-block compression`)
    console.log(`[Compression Server Merge] Block count: ${args.blockIds.length}`)
    console.log(`[Compression Server Merge] Strategy: ${args.strategy}`)

    // Fetch all blocks
    const blocks = await Promise.all(
      args.blockIds.map((id) => ctx.runQuery(api.blocks.get, { id }))
    )

    // Validate all blocks exist
    if (blocks.some((b) => !b)) {
      throw new Error("One or more blocks not found")
    }

    // Filter out nulls (TypeScript)
    const validBlocks = blocks.filter((b): b is NonNullable<typeof b> => b !== null)
    console.log(`[Compression Server Merge] Valid blocks: ${validBlocks.length}`)

    // Combine content
    const combinedContent = validBlocks
      .map((block, index) => {
        const header = `## Block ${index + 1} (${block.type})`
        return `${header}\n\n${block.content}`
      })
      .join("\n\n---\n\n")

    const originalTokens = validBlocks.reduce(
      (sum, b) => sum + (b.tokens || estimateTokens(b.content)),
      0
    )

    if (originalTokens < 100) {
      throw new Error(
        `Combined blocks have only ${originalTokens} tokens (minimum: 100)`
      )
    }

    // Build compression prompt
    const prompt = buildCompressionPrompt({
      content: combinedContent,
      strategy: args.strategy,
      originalTokens,
      contentType: "merged_blocks",
    })

    const startTime = Date.now()

    // Create LangFuse trace
    const trace = createGeneration(
      "compression-merge",
      {
        sessionId: validBlocks[0].sessionId,
        provider: "claude",
        model: "claude-code",
      },
      {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        prompt,
      }
    )

    try {
      let compressedContent = ""
      let inputTokens: number | undefined
      let outputTokens: number | undefined
      let costUsd: number | undefined

      // Create timeout promise (5 minutes)
      const timeoutMs = 300000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Compression timed out after 5 minutes")), timeoutMs)
      })

      // Race between compression and timeout
      await Promise.race([
        (async () => {
          for await (const message of claudeQuery({
            prompt,
            options: {
              allowedTools: [],
              maxTurns: 1,
              pathToClaudeCodeExecutable: getClaudeCodePath(),
              includePartialMessages: false, // Disable streaming for better performance
            },
          })) {
            const msgType = (message as Record<string, unknown>).type as string

            // Handle assistant messages (no streaming, just final result)
            if (msgType === "assistant") {
              const msg = message as Record<string, unknown>
              const msgContent = msg.message as Record<string, unknown> | undefined
              const content = msgContent?.content as Array<Record<string, unknown>> | undefined
              if (content) {
                for (const block of content) {
                  if (block.type === "text" && typeof block.text === "string") {
                    compressedContent += block.text
                  }
                }
              }
            }

            // Capture usage stats from result message
            if (msgType === "result") {
              const msg = message as Record<string, unknown>
              const usage = msg.usage as Record<string, unknown> | undefined
              if (usage) {
                inputTokens = usage.input_tokens as number | undefined
                outputTokens = usage.output_tokens as number | undefined
              }
              costUsd = msg.total_cost_usd as number | undefined
            }
          }
        })(),
        timeoutPromise,
      ])

      compressedContent = compressedContent.trim()

      if (!compressedContent) {
        throw new Error("Claude Code returned empty response")
      }

      const compressedTokens = estimateTokens(compressedContent)
      const compressionRatio = originalTokens / compressedTokens

      if (compressionRatio < 1.2) {
        throw new Error(
          `Compression ratio ${compressionRatio.toFixed(2)}x is below minimum 1.2x`
        )
      }

      const quality = estimateQuality(combinedContent, compressedContent)
      if (quality < 0.6) {
        console.warn(
          `[Compression Server Merge] Warning: Compression quality ${(quality * 100).toFixed(0)}% is below recommended 60%`
        )
      }

      const durationMs = Date.now() - startTime
      console.log(`[Compression Server Merge] Compression successful! Duration: ${durationMs}ms`)
      console.log(`[Compression Server Merge] Ratio: ${compressionRatio.toFixed(2)}x, Saved: ${originalTokens - compressedTokens} tokens`)

      trace.complete({
        text: compressedContent,
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
      })
      await flushLangfuse()

      return {
        success: true,
        compressedContent,
        originalTokens,
        compressedTokens,
        compressionRatio,
        tokensSaved: originalTokens - compressedTokens,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[Compression Merge] Error:`, errorMessage)

      trace.error(errorMessage)
      await flushLangfuse()

      throw new Error(`Claude Code compression failed: ${errorMessage}`)
    }
  },
})

/**
 * Build compression prompt for Claude Code CLI.
 */
function buildCompressionPrompt(options: {
  content: string
  strategy: string
  originalTokens: number
  contentType: string
}): string {
  const { content, originalTokens, contentType } = options

  const targetRatio = 2.0
  const targetTokens = Math.ceil(originalTokens / targetRatio)

  return `You are a compression specialist. Your task is to compress the following ${contentType} content while preserving all essential information.

ORIGINAL CONTENT (${originalTokens} tokens):
---
${content}
---

COMPRESSION REQUIREMENTS:
- Target length: ~${targetTokens} tokens (${targetRatio}x compression ratio)
- Preserve all key information, facts, and important details
- Remove redundancy, filler words, and verbose explanations
- Maintain technical accuracy and specificity
- Keep the compressed version coherent and readable
- DO NOT add commentary or meta-text (no "Here's the compressed version..." etc.)

COMPRESSED VERSION:`
}

/**
 * Estimate token count (approximate: chars / 4).
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4)
}

/**
 * Estimate compression quality by checking if important words are preserved.
 */
function estimateQuality(original: string, compressed: string): number {
  const importantWords = extractImportantWords(original)

  if (importantWords.length === 0) {
    return 0.8 // Default quality if no important words found
  }

  const compressedLower = compressed.toLowerCase()
  const preserved = importantWords.filter((word) =>
    compressedLower.includes(word.toLowerCase())
  ).length

  return Math.min(1.0, preserved / importantWords.length)
}

/**
 * Extract important words from content (nouns, technical terms, etc.).
 */
function extractImportantWords(content: string): string[] {
  // Remove common words
  const stopWords = new Set([
    "the",
    "is",
    "at",
    "which",
    "on",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "with",
    "to",
    "for",
    "of",
    "as",
    "by",
    "from",
    "that",
    "this",
    "these",
    "those",
    "it",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "may",
    "might",
    "can",
  ])

  // Extract words (alphanumeric sequences)
  const words = content
    .toLowerCase()
    .match(/\b[a-z0-9]+\b/g) || []

  // Filter out stop words and short words, keep unique
  const important = [...new Set(words)]
    .filter((word) => !stopWords.has(word) && word.length > 3)
    .slice(0, 50) // Top 50 important words

  return important
}
