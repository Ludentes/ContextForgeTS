# N+1 Query Prevention Guide

This document explains how to avoid N+1 query problems in Convex functions.

## What is N+1?

N+1 is a performance anti-pattern where you:
1. Make 1 query to get a list of N items
2. Make N additional queries (one per item) to get related data

```typescript
// ❌ BAD: N+1 pattern
const sessions = await ctx.db.query("sessions").collect()  // 1 query
for (const session of sessions) {
  const blocks = await ctx.db                              // N queries!
    .query("blocks")
    .withIndex("by_session", (q) => q.eq("sessionId", session._id))
    .collect()
}
```

## Convex-Specific Considerations

### No Batch Delete

Convex doesn't have SQL-style `DELETE FROM table WHERE condition`. You must:
1. Query to get document IDs
2. Delete one by one in a loop

This means **1 query + N deletes** is unavoidable and acceptable:

```typescript
// ✅ OK: 1 query + N deletes (unavoidable in Convex)
const blocks = await ctx.db.query("blocks").withIndex(...).collect()
for (const block of blocks) {
  await ctx.db.delete(block._id)
}
```

### The Real Problem: Nested Loops

The issue is when you nest queries inside loops:

```typescript
// ❌ BAD: N+1 in N+1 (quadratic queries!)
for (const session of sessions) {           // N sessions
  const blocks = await ctx.db.query(...)    // N queries for blocks
  for (const block of blocks) {
    await ctx.db.delete(block._id)          // N*M deletes
  }
}
// Total: 1 + N queries, then N*M deletes
```

## Patterns to Follow

### Pattern 1: Use `.first()` Instead of `.collect()` When You Need One Item

```typescript
// ❌ BAD: Fetches all, uses one
const blocks = await ctx.db.query("blocks").withIndex(...).collect()
const maxPosition = Math.max(...blocks.map(b => b.position))

// ✅ GOOD: Fetches only one
const lastBlock = await ctx.db
  .query("blocks")
  .withIndex(...)
  .order("desc")
  .first()
const maxPosition = lastBlock?.position ?? 0
```

### Pattern 2: Bulk Fetch, Then Filter

When deleting across multiple parent IDs, fetch all children once:

```typescript
// ❌ BAD: Query per session
for (const session of sessions) {
  const blocks = await ctx.db
    .query("blocks")
    .withIndex("by_session", (q) => q.eq("sessionId", session._id))
    .collect()
  // delete blocks...
}

// ✅ GOOD: One query, then filter
const sessionIds = new Set(sessions.map(s => s._id))
const allBlocks = await ctx.db.query("blocks").collect()  // 1 query

for (const block of allBlocks) {
  if (sessionIds.has(block.sessionId)) {
    await ctx.db.delete(block._id)
  }
}
```

### Pattern 3: Use Helper Functions for Cascade Deletes

Encapsulate the optimized pattern in a helper:

```typescript
// In sessions.ts
async function cascadeDeleteSessions(
  ctx: MutationCtx,
  sessionIds: Set<Id<"sessions">>
) {
  // Bulk fetch all related data (3 queries total)
  const allBlocks = await ctx.db.query("blocks").collect()
  const allSnapshots = await ctx.db.query("snapshots").collect()
  const allGenerations = await ctx.db.query("generations").collect()

  // Filter and delete
  for (const block of allBlocks) {
    if (sessionIds.has(block.sessionId)) {
      await ctx.db.delete(block._id)
    }
  }
  // ... same for snapshots, generations
}
```

### Pattern 4: Index-Based Single-Parent Queries Are Fine

When operating on a single parent, using an index is efficient:

```typescript
// ✅ GOOD: Single session, uses index
const blocks = await ctx.db
  .query("blocks")
  .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
  .collect()

for (const block of blocks) {
  await ctx.db.delete(block._id)
}
// Total: 1 indexed query + N deletes
```

## Quick Reference

| Scenario | Pattern | Queries |
|----------|---------|---------|
| Get max/min value | `.order().first()` | 1 |
| Delete children of 1 parent | Index query + loop delete | 1 + N deletes |
| Delete children of N parents | Bulk fetch + filter + delete | 1 + N deletes |
| Check if item exists | `.first()` | 1 |
| Count items | `.collect().length` or index | 1 |

## Code Review Checklist

When reviewing Convex functions, check for:

- [ ] **No queries inside loops** - If you see `await ctx.db.query()` inside a `for` loop, it's likely N+1
- [ ] **Using `.first()` for single items** - Don't `.collect()` then `[0]` or `.find()`
- [ ] **Bulk operations use bulk fetches** - Multi-parent deletes should fetch all children once
- [ ] **Index usage** - Single-parent queries should use `.withIndex()`

## Files with N+1 Prevention

These files have been audited and use optimized patterns:

- `convex/blocks.ts` - `getNextPosition()` uses `.first()`
- `convex/sessions.ts` - `removeAll()` and `removeByName()` use `cascadeDeleteSessions()`

## When Bulk Fetch Isn't Better

If you have millions of documents but only need to delete 10, bulk fetching everything is wasteful. In that case, N indexed queries might be better:

```typescript
// If sessions.length is small but blocks table is huge:
// Indexed queries per session might be better than fetching all blocks
```

Use judgment based on your data distribution.
