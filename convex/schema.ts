import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { zoneValidator } from "./lib/validators"

export default defineSchema({
  // Demo table - can be removed along with convex/counters.ts
  // @deprecated For demo/testing only
  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }),

  // Sessions - isolated workspaces for context management
  sessions: defineTable({
    name: v.optional(v.string()), // Optional display name
    createdAt: v.number(),
    updatedAt: v.number(),
    // Token budget configuration (optional, uses defaults if not set)
    budgets: v.optional(
      v.object({
        permanent: v.number(), // Default: 50000
        stable: v.number(), // Default: 100000
        working: v.number(), // Default: 100000
        total: v.number(), // Default: 500000
      })
    ),
  }),

  // Core blocks table - content blocks within sessions
  blocks: defineTable({
    sessionId: v.id("sessions"), // Required - blocks belong to a session
    content: v.string(),
    type: v.string(),
    zone: zoneValidator,
    position: v.number(), // Order within zone (lower = higher in list)
    createdAt: v.number(),
    updatedAt: v.number(),
    // Test data flag - marked records can be bulk deleted
    testData: v.optional(v.boolean()),
    // Token tracking
    tokens: v.optional(v.number()), // Current token count
    originalTokens: v.optional(v.number()), // Original token count (before compression)
    tokenModel: v.optional(v.string()), // Model used for counting (e.g., "cl100k_base")
  })
    .index("by_zone", ["zone", "position"]) // Legacy index
    .index("by_session", ["sessionId"])
    .index("by_session_zone", ["sessionId", "zone", "position"]),

  // Snapshots - saved copies of session state for testing/restore
  snapshots: defineTable({
    sessionId: v.id("sessions"),
    name: v.string(), // e.g., "before-llm-test-1"
    createdAt: v.number(),
    // Serialized block data (denormalized for easy restore)
    blocks: v.array(
      v.object({
        content: v.string(),
        type: v.string(),
        zone: zoneValidator,
        position: v.number(),
        // Token tracking (optional for backwards compatibility)
        tokens: v.optional(v.number()),
        originalTokens: v.optional(v.number()),
        tokenModel: v.optional(v.string()),
      })
    ),
  }).index("by_session", ["sessionId"]),

  // Streaming generations - tracks LLM generation with real-time text updates
  generations: defineTable({
    sessionId: v.id("sessions"),
    provider: v.string(), // "ollama" | "claude"
    status: v.union(
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("error")
    ),
    text: v.string(), // Accumulated text, updated as chunks arrive
    error: v.optional(v.string()), // Error message if status is "error"
    createdAt: v.number(),
    updatedAt: v.number(),
    // Usage tracking
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  }).index("by_session", ["sessionId", "createdAt"]),
})
