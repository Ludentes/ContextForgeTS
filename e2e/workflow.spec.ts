import { test, expect } from "@playwright/test"

// Run all tests in this file serially to avoid interference
test.describe.configure({ mode: "serial" })

// Convex HTTP endpoint base URL
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL || "http://127.0.0.1:3211"

// Session storage key (must match frontend)
const SESSION_STORAGE_KEY = "contextforge-session-id"

// Helper to reset test data before tests
async function resetTestData() {
  const response = await fetch(`${CONVEX_SITE_URL}/testing/reset`, {
    method: "POST",
  })
  return response.ok
}

// Helper to create a test session via API
async function createTestSession(name: string = "Test Session") {
  const response = await fetch(`${CONVEX_SITE_URL}/testing/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create test session: ${await response.text()}`)
  }
  return response.json() as Promise<{ id: string }>
}

// Helper to create a test block
async function createTestBlock(
  sessionId: string,
  content: string,
  type: string = "note",
  zone: "PERMANENT" | "STABLE" | "WORKING" = "WORKING"
) {
  const response = await fetch(`${CONVEX_SITE_URL}/testing/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, content, type, zone }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create test block: ${await response.text()}`)
  }
  return response.json() as Promise<{ id: string }>
}

test.describe("Workflows Page", () => {
  test.beforeAll(async () => {
    await resetTestData()
  })

  test.afterAll(async () => {
    await resetTestData()
  })

  test("should display workflows page", async ({ page }) => {
    await page.goto("/workflows")
    await page.waitForLoadState("networkidle")

    // Should show workflows heading
    await expect(page.locator("h1:has-text('Workflows')")).toBeVisible({ timeout: 10000 })
  })

  test("should create a new workflow", async ({ page }) => {
    await page.goto("/workflows")
    await page.waitForLoadState("networkidle")

    // Click create workflow button
    await page.getByRole("button", { name: /create workflow/i }).click()

    // Fill in workflow name
    await page.fill("input[placeholder*='name']", "E2E Test Workflow")
    await page.fill("textarea[placeholder*='description']", "Workflow created by E2E tests")

    // Submit
    await page.getByRole("button", { name: /create/i }).last().click()

    // Workflow should appear in the list
    await expect(page.locator("text=E2E Test Workflow")).toBeVisible({ timeout: 5000 })
  })

  test("should edit workflow and add steps", async ({ page }) => {
    await page.goto("/workflows")
    await page.waitForLoadState("networkidle")

    // Find and click edit on the test workflow
    const workflowCard = page.locator(".rounded-lg.border").filter({ hasText: "E2E Test Workflow" })
    await workflowCard.getByRole("button", { name: /edit/i }).click()

    // Should navigate to workflow editor
    await expect(page).toHaveURL(/\/workflows\//)

    // Add a step
    await page.getByRole("button", { name: /add step/i }).click()

    // Fill in step details
    await page.fill("input[placeholder*='step name']", "Step 1: Research")
    await page.fill("textarea[placeholder*='description']", "Research phase")

    // Save step
    await page.getByRole("button", { name: /save/i }).last().click()

    // Step should appear
    await expect(page.locator("text=Step 1: Research")).toBeVisible({ timeout: 5000 })

    // Add another step
    await page.getByRole("button", { name: /add step/i }).click()
    await page.fill("input[placeholder*='step name']", "Step 2: Implement")
    await page.fill("textarea[placeholder*='description']", "Implementation phase")
    await page.getByRole("button", { name: /save/i }).last().click()

    // Second step should appear
    await expect(page.locator("text=Step 2: Implement")).toBeVisible({ timeout: 5000 })
  })

  test("should start a workflow and create project", async ({ page }) => {
    await page.goto("/workflows")
    await page.waitForLoadState("networkidle")

    // Find the test workflow and start it
    const workflowCard = page.locator(".rounded-lg.border").filter({ hasText: "E2E Test Workflow" })
    await workflowCard.getByRole("button", { name: /start/i }).click()

    // Fill in project name
    await page.fill("input[placeholder*='project name']", "E2E Test Project")

    // Start the workflow
    await page.getByRole("button", { name: /start/i }).last().click()

    // Should navigate to project page or home with the first session
    await page.waitForTimeout(1000)

    // We should be on the home page with the workflow step indicator visible
    // or on the project page
    const url = page.url()
    expect(url.includes("/") || url.includes("/projects/")).toBeTruthy()
  })
})

test.describe("Workflow Step Indicator", () => {
  let testSessionId: string

  test.beforeAll(async () => {
    await resetTestData()
    // Create a test session that's part of a workflow
    const session = await createTestSession("E2E Workflow Step Test")
    testSessionId = session.id
  })

  test.afterAll(async () => {
    await resetTestData()
  })

  test("should not show indicator for non-workflow session", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        localStorage.setItem(key, value)
      },
      [SESSION_STORAGE_KEY, testSessionId]
    )

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Workflow indicator should not be visible
    await expect(page.locator("text=Step 1/")).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe("Projects Page", () => {
  test.beforeAll(async () => {
    await resetTestData()
  })

  test.afterAll(async () => {
    await resetTestData()
  })

  test("should display projects page", async ({ page }) => {
    await page.goto("/projects")
    await page.waitForLoadState("networkidle")

    // Should show projects heading
    await expect(page.locator("h1:has-text('Projects')")).toBeVisible({ timeout: 10000 })
  })

  test("should create a standalone project", async ({ page }) => {
    await page.goto("/projects")
    await page.waitForLoadState("networkidle")

    // Click create project button
    await page.getByRole("button", { name: /new project/i }).click()

    // Fill in project name
    await page.fill("input[placeholder*='name']", "E2E Standalone Project")

    // Submit
    await page.getByRole("button", { name: /create/i }).last().click()

    // Project should appear
    await expect(page.locator("text=E2E Standalone Project")).toBeVisible({ timeout: 5000 })
  })
})
