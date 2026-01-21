/**
 * Projects - Groups related sessions for one game/app/document set.
 *
 * Projects help organize work into logical units and can be linked to
 * workflows for structured document creation pipelines.
 */

import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/**
 * List all projects.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").collect()

    // Enrich with session counts
    const enriched = await Promise.all(
      projects.map(async (project) => {
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect()
        return {
          ...project,
          sessionCount: sessions.length,
        }
      })
    )

    return enriched
  },
})

/**
 * Get a project by ID with its sessions.
 */
export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id)
    if (!project) return null

    // Get associated sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect()

    // Sort sessions by step number if available, then by creation date
    sessions.sort((a, b) => {
      if (a.stepNumber !== undefined && b.stepNumber !== undefined) {
        return a.stepNumber - b.stepNumber
      }
      if (a.stepNumber !== undefined) return -1
      if (b.stepNumber !== undefined) return 1
      return (b.createdAt ?? 0) - (a.createdAt ?? 0)
    })

    // Get workflow if linked
    let workflow = null
    if (project.workflowId) {
      workflow = await ctx.db.get(project.workflowId)
    }

    return {
      ...project,
      sessions,
      workflow,
    }
  },
})

/**
 * Create a new project.
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    workflowId: v.optional(v.id("workflows")),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      workflowId: args.workflowId,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Update project metadata.
 */
export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    workflowId: v.optional(v.id("workflows")),
    currentStep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id)
    if (!project) {
      throw new Error("Project not found")
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.workflowId !== undefined) updates.workflowId = args.workflowId
    if (args.currentStep !== undefined) updates.currentStep = args.currentStep

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

/**
 * Delete a project.
 * Note: Does not delete associated sessions - they become "orphaned".
 */
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    // Unlink all sessions from this project
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect()

    for (const session of sessions) {
      await ctx.db.patch(session._id, { projectId: undefined })
    }

    await ctx.db.delete(args.id)
  },
})

/**
 * Create a new session within a project.
 */
export const createSession = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    templateId: v.optional(v.id("templates")),
    stepNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId)
    if (!project) {
      throw new Error("Project not found")
    }

    const now = Date.now()

    // Create the session
    const sessionId = await ctx.db.insert("sessions", {
      name: args.name ?? `Session ${now}`,
      projectId: args.projectId,
      templateId: args.templateId,
      stepNumber: args.stepNumber,
      createdAt: now,
      updatedAt: now,
    })

    // If a template is specified, apply it
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId)
      if (template) {
        // Create blocks from template
        for (const blockData of template.blocks) {
          await ctx.db.insert("blocks", {
            sessionId,
            content: blockData.content,
            type: blockData.type,
            zone: blockData.zone,
            position: blockData.position,
            createdAt: now,
            updatedAt: now,
          })
        }

        // Set system prompt from template
        if (template.systemPrompt) {
          await ctx.db.patch(sessionId, { systemPrompt: template.systemPrompt })
        }
      }
    }

    return sessionId
  },
})

/**
 * Add an existing session to a project.
 */
export const addSession = mutation({
  args: {
    projectId: v.id("projects"),
    sessionId: v.id("sessions"),
    stepNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId)
    if (!project) {
      throw new Error("Project not found")
    }

    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    await ctx.db.patch(args.sessionId, {
      projectId: args.projectId,
      stepNumber: args.stepNumber,
      updatedAt: Date.now(),
    })

    return args.sessionId
  },
})

/**
 * Remove a session from a project (doesn't delete the session).
 */
export const removeSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    await ctx.db.patch(args.sessionId, {
      projectId: undefined,
      stepNumber: undefined,
      updatedAt: Date.now(),
    })

    return args.sessionId
  },
})
