/**
 * Unit tests for context assembly functions.
 */
import { describe, it, expect } from "vitest"
import {
  extractSystemPromptFromBlocks,
  assembleContext,
  assembleContextWithConversation,
  estimateTokenCount,
  getContextStats,
  NO_TOOLS_SUFFIX,
} from "./context"
import type { Doc } from "../_generated/dataModel"

// Helper to create mock blocks
function createBlock(
  overrides: Partial<Doc<"blocks">> & { content: string; zone: string; type?: string }
): Doc<"blocks"> {
  return {
    _id: `block_${Math.random().toString(36).substr(2, 9)}` as Doc<"blocks">["_id"],
    _creationTime: Date.now(),
    sessionId: "session_123" as Doc<"blocks">["sessionId"],
    content: overrides.content,
    type: overrides.type ?? "note",
    zone: overrides.zone,
    position: overrides.position ?? 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe("extractSystemPromptFromBlocks", () => {
  it("returns undefined when no system_prompt blocks exist", () => {
    const blocks = [
      createBlock({ content: "Note 1", zone: "PERMANENT", type: "note" }),
      createBlock({ content: "Note 2", zone: "WORKING", type: "note" }),
    ]
    expect(extractSystemPromptFromBlocks(blocks)).toBeUndefined()
  })

  it("returns the first system_prompt block in PERMANENT zone by position", () => {
    const blocks = [
      createBlock({ content: "Second prompt", zone: "PERMANENT", type: "system_prompt", position: 1 }),
      createBlock({ content: "First prompt", zone: "PERMANENT", type: "system_prompt", position: 0 }),
      createBlock({ content: "Note", zone: "PERMANENT", type: "note", position: 2 }),
    ]
    expect(extractSystemPromptFromBlocks(blocks)).toBe("First prompt")
  })

  it("ignores system_prompt blocks not in PERMANENT zone", () => {
    const blocks = [
      createBlock({ content: "Working prompt", zone: "WORKING", type: "system_prompt" }),
      createBlock({ content: "Stable prompt", zone: "STABLE", type: "system_prompt" }),
      createBlock({ content: "Permanent prompt", zone: "PERMANENT", type: "system_prompt" }),
    ]
    expect(extractSystemPromptFromBlocks(blocks)).toBe("Permanent prompt")
  })

  it("returns undefined when system_prompt blocks exist but none in PERMANENT", () => {
    const blocks = [
      createBlock({ content: "Working prompt", zone: "WORKING", type: "system_prompt" }),
    ]
    expect(extractSystemPromptFromBlocks(blocks)).toBeUndefined()
  })
})

describe("assembleContext", () => {
  it("assembles blocks in order: PERMANENT → STABLE → WORKING → user prompt", () => {
    const blocks = [
      createBlock({ content: "Working content", zone: "WORKING", position: 0 }),
      createBlock({ content: "Permanent content", zone: "PERMANENT", position: 0 }),
      createBlock({ content: "Stable content", zone: "STABLE", position: 0 }),
    ]

    const messages = assembleContext(blocks, "User question")

    expect(messages).toHaveLength(4)
    expect(messages[0]).toEqual({ role: "system", content: "Permanent content" })
    expect(messages[1]).toEqual({ role: "user", content: "Reference Material:\n\nStable content" })
    expect(messages[2]).toEqual({ role: "user", content: "Current Context:\n\nWorking content" })
    expect(messages[3]).toEqual({ role: "user", content: "User question" })
  })

  it("excludes system_prompt blocks from context messages", () => {
    const blocks = [
      createBlock({ content: "System prompt", zone: "PERMANENT", type: "system_prompt", position: 0 }),
      createBlock({ content: "Regular content", zone: "PERMANENT", type: "note", position: 1 }),
    ]

    const messages = assembleContext(blocks, "Question")

    expect(messages).toHaveLength(2)
    expect(messages[0]).toEqual({ role: "system", content: "Regular content" })
    expect(messages[1]).toEqual({ role: "user", content: "Question" })
  })

  it("sorts blocks within each zone by position", () => {
    const blocks = [
      createBlock({ content: "Second", zone: "PERMANENT", position: 1 }),
      createBlock({ content: "First", zone: "PERMANENT", position: 0 }),
      createBlock({ content: "Third", zone: "PERMANENT", position: 2 }),
    ]

    const messages = assembleContext(blocks, "Question")

    expect(messages[0].content).toBe("First\n\nSecond\n\nThird")
  })

  it("skips empty zones", () => {
    const blocks = [
      createBlock({ content: "Working only", zone: "WORKING", position: 0 }),
    ]

    const messages = assembleContext(blocks, "Question")

    expect(messages).toHaveLength(2)
    expect(messages[0]).toEqual({ role: "user", content: "Current Context:\n\nWorking only" })
    expect(messages[1]).toEqual({ role: "user", content: "Question" })
  })

  it("handles empty blocks array", () => {
    const messages = assembleContext([], "Question")

    expect(messages).toHaveLength(1)
    expect(messages[0]).toEqual({ role: "user", content: "Question" })
  })
})

describe("assembleContextWithConversation", () => {
  it("includes conversation history after context blocks", () => {
    const blocks = [
      createBlock({ content: "Permanent", zone: "PERMANENT", position: 0 }),
    ]
    const history = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ]

    const messages = assembleContextWithConversation(blocks, history, "New message")

    expect(messages).toHaveLength(4)
    expect(messages[0]).toEqual({ role: "system", content: "Permanent" })
    expect(messages[1]).toEqual({ role: "user", content: "Hello" })
    expect(messages[2]).toEqual({ role: "assistant", content: "Hi there!" })
    expect(messages[3]).toEqual({ role: "user", content: "New message" })
  })

  it("excludes system_prompt blocks from context", () => {
    const blocks = [
      createBlock({ content: "System prompt", zone: "PERMANENT", type: "system_prompt", position: 0 }),
      createBlock({ content: "Regular", zone: "PERMANENT", type: "note", position: 1 }),
    ]

    const messages = assembleContextWithConversation(blocks, [], "Question")

    expect(messages).toHaveLength(2)
    expect(messages[0]).toEqual({ role: "system", content: "Regular" })
  })

  it("handles empty conversation history", () => {
    const blocks = [
      createBlock({ content: "Context", zone: "STABLE", position: 0 }),
    ]

    const messages = assembleContextWithConversation(blocks, [], "First message")

    expect(messages).toHaveLength(2)
    expect(messages[0].content).toContain("Context")
    expect(messages[1].content).toBe("First message")
  })
})

describe("estimateTokenCount", () => {
  it("estimates ~4 chars per token", () => {
    const messages = [
      { role: "user" as const, content: "1234567890123456" }, // 16 chars = 4 tokens
    ]
    expect(estimateTokenCount(messages)).toBe(4)
  })

  it("rounds up", () => {
    const messages = [
      { role: "user" as const, content: "12345" }, // 5 chars = 2 tokens (rounded up)
    ]
    expect(estimateTokenCount(messages)).toBe(2)
  })

  it("sums all messages", () => {
    const messages = [
      { role: "system" as const, content: "12345678" }, // 8 chars = 2 tokens
      { role: "user" as const, content: "12345678" }, // 8 chars = 2 tokens
    ]
    expect(estimateTokenCount(messages)).toBe(4)
  })
})

describe("getContextStats", () => {
  it("counts blocks and chars per zone", () => {
    const blocks = [
      createBlock({ content: "1234", zone: "PERMANENT" }),
      createBlock({ content: "12345678", zone: "PERMANENT" }),
      createBlock({ content: "12", zone: "STABLE" }),
      createBlock({ content: "123456", zone: "WORKING" }),
    ]

    const stats = getContextStats(blocks)

    expect(stats.permanent).toEqual({ count: 2, chars: 12 })
    expect(stats.stable).toEqual({ count: 1, chars: 2 })
    expect(stats.working).toEqual({ count: 1, chars: 6 })
    expect(stats.total).toEqual({ count: 4, chars: 20 })
  })

  it("handles empty blocks array", () => {
    const stats = getContextStats([])

    expect(stats.total).toEqual({ count: 0, chars: 0 })
  })
})

describe("NO_TOOLS_SUFFIX", () => {
  it("contains anti-agent instructions", () => {
    expect(NO_TOOLS_SUFFIX).toContain("do NOT have access to tools")
    expect(NO_TOOLS_SUFFIX).toContain("Do NOT say")
  })
})
