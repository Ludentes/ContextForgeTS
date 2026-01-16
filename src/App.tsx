import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../convex/_generated/api"
import { Button } from "@/components/ui/button"

function useTheme() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  )

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  return { isDark, toggle: () => setIsDark(!isDark) }
}

function Counter({ name }: { name: string }) {
  const counter = useQuery(api.counters.get, { name })
  const increment = useMutation(api.counters.increment)
  const decrement = useMutation(api.counters.decrement)
  const reset = useMutation(api.counters.reset)

  const value = counter?.value ?? 0

  return (
    <div className="flex items-center gap-4">
      <span className="text-lg font-medium w-24">{name}:</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => decrement({ name })}
        >
          -
        </Button>
        <span className="text-2xl font-bold w-12 text-center">{value}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => increment({ name })}
        >
          +
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => reset({ name })}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

function ConvexDemo() {
  const counters = useQuery(api.counters.list)

  return (
    <section className="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Convex Counter Demo</h2>
      <p className="text-muted-foreground">
        Real-time counters stored in Convex. Open in multiple tabs to see sync!
      </p>

      <div className="space-y-3">
        <Counter name="clicks" />
        <Counter name="score" />
        <Counter name="visitors" />
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Total counters in database: {counters?.length ?? 0}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Check your Convex dashboard to see the data!
        </p>
      </div>
    </section>
  )
}

function TailwindTest() {
  const { isDark, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground">
            ContextForge TypeScript
          </h1>
          <Button variant="outline" onClick={toggle}>
            {isDark ? "Light" : "Dark"}
          </Button>
        </div>

        {/* Convex Demo - First so it's prominent */}
        <ConvexDemo />

        {/* Tailwind Verification Section */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Tailwind CSS Test</h2>
          <p className="text-muted-foreground">
            If you can see styled boxes below, Tailwind is working.
          </p>

          <div className="flex gap-4">
            <div className="h-16 w-16 rounded bg-red-500" title="Red" />
            <div className="h-16 w-16 rounded bg-green-500" title="Green" />
            <div className="h-16 w-16 rounded bg-blue-500" title="Blue" />
            <div className="h-16 w-16 rounded bg-yellow-500" title="Yellow" />
          </div>

          <p className="text-sm text-muted-foreground">
            You should see: Red, Green, Blue, Yellow boxes above.
          </p>
        </section>

        {/* shadcn/ui Button Test */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-2xl font-semibold">shadcn/ui Test</h2>
          <p className="text-muted-foreground">
            Testing button variants from shadcn/ui.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </section>

        {/* Dark Mode Test */}
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Theme Test</h2>
          <p className="text-muted-foreground">
            Click the button in the header to toggle theme.
          </p>
          <div className="flex gap-4">
            <div className="rounded-lg bg-primary p-4 text-primary-foreground">
              Primary
            </div>
            <div className="rounded-lg bg-secondary p-4 text-secondary-foreground">
              Secondary
            </div>
            <div className="rounded-lg bg-muted p-4 text-muted-foreground">
              Muted
            </div>
          </div>
        </section>

        {/* Stack Info */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">Stack</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>React 19</li>
            <li>TypeScript</li>
            <li>Vite</li>
            <li>Tailwind CSS v4</li>
            <li>shadcn/ui</li>
            <li className="text-green-600 dark:text-green-400">Convex ✓</li>
            <li>TanStack Router (not configured yet)</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function App() {
  return <TailwindTest />
}

export default App
