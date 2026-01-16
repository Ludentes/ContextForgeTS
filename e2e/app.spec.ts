import { test, expect } from "@playwright/test"

test.describe("App", () => {
  test("should display the title", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1")).toContainText("ContextForge TypeScript")
  })

  test("should toggle theme", async ({ page }) => {
    await page.goto("/")

    // Find the theme toggle button
    const themeButton = page.getByRole("button", { name: /light|dark/i })
    await expect(themeButton).toBeVisible()

    // Click to toggle
    await themeButton.click()

    // Button text should change
    await expect(themeButton).toBeVisible()
  })

  test("should show Tailwind color boxes", async ({ page }) => {
    await page.goto("/")

    // Check for the colored boxes (Tailwind test)
    await expect(page.locator('[title="Red"]')).toBeVisible()
    await expect(page.locator('[title="Green"]')).toBeVisible()
    await expect(page.locator('[title="Blue"]')).toBeVisible()
    await expect(page.locator('[title="Yellow"]')).toBeVisible()
  })

  test("should show shadcn button variants", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("button", { name: "Default" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Secondary" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Destructive" })
    ).toBeVisible()
  })
})

test.describe("Convex Counter", () => {
  test("should display counter section", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator("text=Convex Counter Demo")).toBeVisible()
  })

  test("should increment counter", async ({ page }) => {
    await page.goto("/")

    // Find the clicks counter row and its + button
    const clicksRow = page.locator("text=clicks:").locator("..")
    const incrementButton = clicksRow.getByRole("button", { name: "+" })

    // Get initial value
    const valueSpan = clicksRow.locator(".text-2xl")
    const initialValue = await valueSpan.textContent()

    // Click increment
    await incrementButton.click()

    // Wait for value to update (Convex real-time)
    await expect(valueSpan).not.toHaveText(initialValue ?? "0", {
      timeout: 5000,
    })
  })
})
