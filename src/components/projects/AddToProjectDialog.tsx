/**
 * Dialog for adding an existing session to a project.
 */

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import type { Id } from "../../../convex/_generated/dataModel"

interface AddToProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  sessionId: Id<"sessions">
  onSuccess?: () => void
}

export function AddToProjectDialog({
  isOpen,
  onClose,
  sessionId,
  onSuccess,
}: AddToProjectDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | "">("")
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")

  const projects = useQuery(api.projects.list)
  const session = useQuery(api.sessions.get, { id: sessionId })
  const addSession = useMutation(api.projects.addSession)
  const createProject = useMutation(api.projects.create)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProjectId && !showCreateNew) return

    setIsLoading(true)
    try {
      let projectId = selectedProjectId as Id<"projects">

      // Create new project if requested
      if (showCreateNew && newProjectName.trim()) {
        projectId = await createProject({
          name: newProjectName.trim(),
        })
      }

      // Add session to project
      await addSession({
        projectId,
        sessionId,
      })

      setSelectedProjectId("")
      setNewProjectName("")
      setShowCreateNew(false)
      onSuccess?.()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const currentProjectId = session?.projectId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Add Session to Project</h2>

        {currentProjectId && (
          <div className="mb-4 p-3 rounded-md bg-muted">
            <p className="text-sm text-muted-foreground">
              This session is currently in a project. Adding it to another project will move it.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!showCreateNew ? (
            <>
              <div>
                <label htmlFor="project-select" className="block text-sm font-medium mb-1">
                  Select Project
                </label>
                <select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value as Id<"projects"> | "")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose a project...</option>
                  {projects?.map((project) => (
                    <option
                      key={project._id}
                      value={project._id}
                      disabled={project._id === currentProjectId}
                    >
                      {project.name} ({project.sessionCount} sessions)
                      {project._id === currentProjectId ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center">
                <span className="text-sm text-muted-foreground">or</span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowCreateNew(true)}
              >
                + Create New Project
              </Button>
            </>
          ) : (
            <div>
              <label htmlFor="new-project-name" className="block text-sm font-medium mb-1">
                New Project Name
              </label>
              <input
                id="new-project-name"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="My New Project"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoFocus
              />
              <Button
                type="button"
                variant="link"
                className="mt-2 p-0 h-auto text-sm"
                onClick={() => setShowCreateNew(false)}
              >
                Back to project list
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                (!showCreateNew && !selectedProjectId) ||
                (showCreateNew && !newProjectName.trim())
              }
            >
              {isLoading ? "Adding..." : "Add to Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
