import { query, mutation, internalQuery, internalMutation } from "./_generated/server"
import { v } from "convex/values"

// ============ Internal functions (for use by other Convex functions) ============

// Internal: list all blocks (for testing/admin)
export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("blocks").collect()
  },
})

// Internal: delete a block by ID
export const removeInternal = internalMutation({
  args: { id: v.id("blocks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

// ============ Public functions ============

// List all blocks, ordered by creation time (newest first)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("blocks").order("desc").collect()
  },
})

// Get a single block by ID
export const get = query({
  args: { id: v.id("blocks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Create a new block
export const create = mutation({
  args: {
    content: v.string(),
    type: v.string(),
    testData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("blocks", {
      content: args.content,
      type: args.type,
      createdAt: now,
      updatedAt: now,
      testData: args.testData,
    })
  },
})

// Delete a block
export const remove = mutation({
  args: { id: v.id("blocks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})
