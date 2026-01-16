/**
 * Testing utilities for E2E tests.
 *
 * These functions are only meant to be used in development/testing.
 * The HTTP endpoint checks for a test environment before allowing reset.
 */

import { internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"

// Reset test blocks - for use in E2E tests
// Deletes blocks where:
// - testData === true, OR
// - content starts with "E2E Test:" (for UI-created blocks)
export const resetBlocks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const blocks = await ctx.runQuery(internal.blocks.listAll)
    const testBlocks = blocks.filter(
      (b) => b.testData === true || b.content.startsWith("E2E Test:")
    )
    for (const block of testBlocks) {
      await ctx.runMutation(internal.blocks.removeInternal, { id: block._id })
    }
    return { deleted: testBlocks.length }
  },
})

// Reset all data (can expand to include other tables)
export const resetAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const result = await ctx.runMutation(internal.testing.resetBlocks)
    return result
  },
})
