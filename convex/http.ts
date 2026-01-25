/**
 * HTTP routes for Convex.
 *
 * These endpoints are for:
 * - Testing utilities (/testing/*)
 * - Claude Code health check (/api/health/claude)
 *
 * Note: Claude uses Convex reactive streaming (see generations.ts and claudeNode.ts),
 * not HTTP endpoints. The frontend calls startClaudeGeneration mutation directly.
 *
 * Ollama and OpenRouter are now client-side only - see src/lib/llm/ modules.
 */

import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { api } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { auth } from "./auth"

// Claude health status type (for health check endpoints)
interface ClaudeHealthStatus {
  ok: boolean
  error?: string
  version?: string
}

const http = httpRouter()

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// ============ Testing Endpoints ============

// Reset test data endpoint - only works in development
http.route({
  path: "/testing/reset",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const result = await ctx.runMutation(internal.testing.resetAll)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }),
})

// Handle CORS preflight for reset endpoint
http.route({
  path: "/testing/reset",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// Create a test session - returns session ID for use in tests
http.route({
  path: "/testing/sessions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json()
    const { name } = body as { name?: string }

    const id = await ctx.runMutation(api.sessions.create, {
      name: name ?? "Test Session",
    })

    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }),
})

// Handle CORS preflight for test sessions endpoint
http.route({
  path: "/testing/sessions",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// Create a test block - requires sessionId, automatically marked as testData
http.route({
  path: "/testing/blocks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json()
    const { sessionId, content, type, zone } = body as {
      sessionId: Id<"sessions">
      content: string
      type: string
      zone?: "PERMANENT" | "STABLE" | "WORKING"
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    const id = await ctx.runMutation(api.blocks.create, {
      sessionId,
      content,
      type,
      zone,
      testData: true,
    })

    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }),
})

// Handle CORS preflight for test blocks endpoint
http.route({
  path: "/testing/blocks",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// ============ Health Check Endpoints ============

// Claude Code health check endpoint
http.route({
  path: "/api/health/claude",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const status = await ctx.runAction(api.claudeNode.checkHealth, {}) as ClaudeHealthStatus
    return new Response(JSON.stringify(status), {
      status: status.ok ? 200 : 503,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }),
})

// Handle CORS preflight for Claude health endpoint
http.route({
  path: "/api/health/claude",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// Combined providers health check endpoint (Claude only - Ollama/OpenRouter are client-side)
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const claudeStatus = await ctx.runAction(api.claudeNode.checkHealth, {}) as ClaudeHealthStatus

    return new Response(
      JSON.stringify({
        claude: claudeStatus,
        // Ollama and OpenRouter are now client-side only
        ollama: { ok: false, error: "Client-side only - check Settings page" },
        openrouter: { ok: false, error: "Client-side only - check Settings page" },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    )
  }),
})

// Handle CORS preflight for combined health endpoint
http.route({
  path: "/api/health",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// ============ Testing: Reset Auth ============
// Reset all auth data (for development only)
http.route({
  path: "/testing/reset-auth",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const result = await ctx.runMutation(internal.testing.resetAuth)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }),
})

http.route({
  path: "/testing/reset-auth",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// ============ Auth Endpoints ============
// Add Convex Auth routes for OAuth and password authentication
auth.addHttpRoutes(http)

export default http
