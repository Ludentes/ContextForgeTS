import { query, mutation } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { v } from "convex/values"

// ============ Helper Functions ============

/**
 * Cascade delete all data for given session IDs.
 * Uses bulk fetches to avoid N+1 queries.
 *
 * Pattern: Fetch all related data ONCE, then filter and delete.
 * This is O(1) queries + O(N) deletes, not O(N) queries + O(N) deletes.
 */
async function cascadeDeleteSessions(
  ctx: MutationCtx,
  sessionIds: Set<Id<"sessions">>
): Promise<{ deletedBlocks: number; deletedSnapshots: number; deletedGenerations: number }> {
  let deletedBlocks = 0
  let deletedSnapshots = 0
  let deletedGenerations = 0

  // Bulk fetch all related data (3 queries total, regardless of session count)
  const allBlocks = await ctx.db.query("blocks").collect()
  const allSnapshots = await ctx.db.query("snapshots").collect()
  const allGenerations = await ctx.db.query("generations").collect()

  // Filter and delete blocks
  for (const block of allBlocks) {
    if (sessionIds.has(block.sessionId)) {
      await ctx.db.delete(block._id)
      deletedBlocks++
    }
  }

  // Filter and delete snapshots
  for (const snapshot of allSnapshots) {
    if (sessionIds.has(snapshot.sessionId)) {
      await ctx.db.delete(snapshot._id)
      deletedSnapshots++
    }
  }

  // Filter and delete generations
  for (const generation of allGenerations) {
    if (sessionIds.has(generation.sessionId)) {
      await ctx.db.delete(generation._id)
      deletedGenerations++
    }
  }

  return { deletedBlocks, deletedSnapshots, deletedGenerations }
}

// ============ Queries ============

// List all sessions
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sessions").order("desc").collect()
  },
})

// Get a single session by ID
export const get = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// ============ Mutations ============

// Create a new session
export const create = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("sessions", {
      name: args.name,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// Update a session (e.g., rename)
export const update = mutation({
  args: {
    id: v.id("sessions"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id)
    if (!session) throw new Error("Session not found")

    await ctx.db.patch(args.id, {
      name: args.name,
      updatedAt: Date.now(),
    })
    return args.id
  },
})

// Delete a session and all its blocks and snapshots
export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    // Delete all blocks in this session
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect()
    for (const block of blocks) {
      await ctx.db.delete(block._id)
    }

    // Delete all snapshots for this session
    const snapshots = await ctx.db
      .query("snapshots")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect()
    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id)
    }

    // Delete all generations for this session
    const generations = await ctx.db
      .query("generations")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect()
    for (const generation of generations) {
      await ctx.db.delete(generation._id)
    }

    // Delete the session itself
    await ctx.db.delete(args.id)
  },
})

// Delete all sessions (and their blocks, snapshots, generations)
// Uses bulk fetches to avoid N+1 queries
export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect()
    const sessionIds = new Set(sessions.map((s) => s._id))

    // Cascade delete using bulk fetches (avoids N+1)
    const { deletedBlocks, deletedSnapshots, deletedGenerations } =
      await cascadeDeleteSessions(ctx, sessionIds)

    // Delete all sessions
    for (const session of sessions) {
      await ctx.db.delete(session._id)
    }

    return {
      deletedSessions: sessions.length,
      deletedBlocks,
      deletedSnapshots,
      deletedGenerations,
    }
  },
})

// Delete all sessions matching a name (and their blocks, snapshots, generations)
// Uses bulk fetches to avoid N+1 queries
export const removeByName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db.query("sessions").collect()
    const matching = sessions.filter((s) => s.name === args.name)

    if (matching.length === 0) {
      return { deletedSessions: 0, deletedBlocks: 0, deletedSnapshots: 0, deletedGenerations: 0 }
    }

    const sessionIds = new Set(matching.map((s) => s._id))

    // Cascade delete using bulk fetches (avoids N+1)
    const { deletedBlocks, deletedSnapshots, deletedGenerations } =
      await cascadeDeleteSessions(ctx, sessionIds)

    // Delete matching sessions
    for (const session of matching) {
      await ctx.db.delete(session._id)
    }

    return {
      deletedSessions: matching.length,
      deletedBlocks,
      deletedSnapshots,
      deletedGenerations,
    }
  },
})

// Clear all blocks from a session (keep the session itself)
export const clear = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id)
    if (!session) throw new Error("Session not found")

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.id))
      .collect()

    for (const block of blocks) {
      await ctx.db.delete(block._id)
    }

    await ctx.db.patch(args.id, { updatedAt: Date.now() })

    return { deletedBlocks: blocks.length }
  },
})
