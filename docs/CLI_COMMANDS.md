# CLI Commands Reference

Quick reference for managing ContextForgeTS via the Convex CLI.

All commands use `npx convex run` which executes Convex functions directly from the terminal.

---

## Sessions

### List all sessions

```bash
npx convex run sessions:list
```

### Create a session

```bash
npx convex run sessions:create '{"name": "My Session"}'
```

### Rename a session

```bash
npx convex run sessions:update '{"id": "SESSION_ID", "name": "New Name"}'
```

### Delete a session by ID

Deletes the session and all its blocks, snapshots, and generations.

```bash
npx convex run sessions:remove '{"id": "SESSION_ID"}'
```

### Delete sessions by name

Deletes all sessions matching the exact name (and their data).

```bash
npx convex run sessions:removeByName '{"name": "Test Session"}'
```

### Delete ALL sessions

**Warning:** This deletes everything in the database.

```bash
npx convex run sessions:removeAll
```

### Clear blocks from a session

Deletes all blocks but keeps the session itself.

```bash
npx convex run sessions:clear '{"id": "SESSION_ID"}'
```

---

## Blocks

### List all blocks in a session

```bash
npx convex run blocks:list '{"sessionId": "SESSION_ID"}'
```

### List blocks by zone

```bash
npx convex run blocks:listByZone '{"sessionId": "SESSION_ID", "zone": "WORKING"}'
npx convex run blocks:listByZone '{"sessionId": "SESSION_ID", "zone": "STABLE"}'
npx convex run blocks:listByZone '{"sessionId": "SESSION_ID", "zone": "PERMANENT"}'
```

### Create a block

```bash
npx convex run blocks:create '{"sessionId": "SESSION_ID", "content": "Hello", "type": "NOTE", "zone": "WORKING"}'
```

### Update a block

```bash
npx convex run blocks:update '{"id": "BLOCK_ID", "content": "Updated content"}'
```

### Delete a block

```bash
npx convex run blocks:remove '{"id": "BLOCK_ID"}'
```

### Move a block to another zone

```bash
npx convex run blocks:move '{"id": "BLOCK_ID", "zone": "STABLE"}'
```

---

## Snapshots

### List snapshots for a session

```bash
npx convex run snapshots:list '{"sessionId": "SESSION_ID"}'
```

### Create a snapshot

```bash
npx convex run snapshots:create '{"sessionId": "SESSION_ID", "name": "before-experiment"}'
```

### Restore a snapshot

**Warning:** This deletes current blocks and recreates from snapshot.

```bash
npx convex run snapshots:restore '{"id": "SNAPSHOT_ID"}'
```

### Delete a snapshot

```bash
npx convex run snapshots:remove '{"id": "SNAPSHOT_ID"}'
```

---

## Generations

### Get latest generation for a session

```bash
npx convex run generations:getLatest '{"sessionId": "SESSION_ID"}'
```

### Get a specific generation

```bash
npx convex run generations:get '{"generationId": "GENERATION_ID"}'
```

### Save generation to blocks

```bash
npx convex run generations:saveToBlocks '{"generationId": "GENERATION_ID"}'
```

---

## Health Checks

### Check Claude Code CLI

```bash
npx convex run claudeNode:checkHealth
```

Or via HTTP:

```bash
curl http://localhost:3211/api/health/claude
curl http://localhost:3211/api/health/ollama
curl http://localhost:3211/api/health
```

---

## Testing / Cleanup

### Reset test data only

Deletes items marked as test data or with test naming conventions.

```bash
curl -X POST http://localhost:3211/testing/reset
```

### Nuclear option: Delete everything

```bash
npx convex run sessions:removeAll
```

---

## Tips

### Finding IDs

Session and block IDs look like `jd7abc123...`. To find them:

```bash
# List sessions and copy the _id field
npx convex run sessions:list

# List blocks in a session
npx convex run blocks:list '{"sessionId": "jd7..."}'
```

### Using jq for filtering

```bash
# Get just session names and IDs
npx convex run sessions:list | jq '.[] | {id: ._id, name: .name}'

# Count blocks per zone
npx convex run blocks:list '{"sessionId": "..."}' | jq 'group_by(.zone) | map({zone: .[0].zone, count: length})'
```

### Convex Dashboard

For a visual interface, use the Convex dashboard:

```bash
npx convex dashboard
```

Or visit the URL shown when running `npx convex dev`.

---

## Common Workflows

### Fresh start (delete everything)

```bash
npx convex run sessions:removeAll
npx convex run sessions:create '{"name": "Fresh Session"}'
```

### Reset a session (keep session, delete blocks)

```bash
npx convex run sessions:clear '{"id": "SESSION_ID"}'
```

### Backup before experiment

```bash
npx convex run snapshots:create '{"sessionId": "SESSION_ID", "name": "pre-experiment"}'
# ... do risky things ...
npx convex run snapshots:restore '{"id": "SNAPSHOT_ID"}'  # if needed
```

### Clean up test sessions

```bash
npx convex run sessions:removeByName '{"name": "Test Session"}'
```
