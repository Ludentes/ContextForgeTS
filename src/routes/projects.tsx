/**
 * Projects layout route - wraps all /projects/* routes.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router"

function ProjectsLayout() {
  return <Outlet />
}

export const Route = createFileRoute("/projects")({
  component: ProjectsLayout,
})
