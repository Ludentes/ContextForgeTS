/**
 * Dialog for saving the current session as a template.
 * Supports creating new templates or overwriting existing ones.
 */

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { DebouncedButton } from "@/components/ui/debounced-button"
import type { Id, Doc } from "../../../convex/_generated/dataModel"

interface SaveTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  sessionId: Id<"sessions">
  onSuccess?: (templateId: Id<"templates">) => void
}

export function SaveTemplateDialog({
  isOpen,
  onClose,
  sessionId,
  onSuccess,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"templates"> | "new">("new")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const templates = useQuery(api.templates.list)
  const createFromSession = useMutation(api.templates.createFromSession)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const templateId = await createFromSession({
        sessionId,
        name: name.trim(),
        description: description.trim() || undefined,
        overwriteTemplateId: selectedTemplateId === "new" ? undefined : selectedTemplateId,
      })
      onSuccess?.(templateId)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setSelectedTemplateId("new")
    setError(null)
    onClose()
  }

  // When selecting an existing template, populate the name and description
  const handleTemplateSelect = (value: string) => {
    if (value === "new") {
      setSelectedTemplateId("new")
      setName("")
      setDescription("")
    } else {
      const templateId = value as Id<"templates">
      setSelectedTemplateId(templateId)
      const template = templates?.find((t: Doc<"templates">) => t._id === templateId)
      if (template) {
        setName(template.name)
        setDescription(template.description ?? "")
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Save as Template</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create a new template or overwrite an existing one with the current session's blocks.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template selection */}
          <div>
            <label htmlFor="template-select" className="block text-sm font-medium mb-1">
              Save To
            </label>
            <select
              id="template-select"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="new">Create new template</option>
              {templates && templates.length > 0 && (
                <optgroup label="Overwrite existing">
                  {templates.map((template: Doc<"templates">) => (
                    <option key={template._id} value={template._id}>
                      {template.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="template-name" className="block text-sm font-medium mb-1">
              Template Name *
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Persona Generation Setup"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="template-description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          {selectedTemplateId !== "new" && (
            <div className="p-3 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 text-sm">
              This will overwrite the existing template's blocks.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <DebouncedButton type="submit" disabled={!name.trim() || isLoading} debounceMs={500}>
              {isLoading
                ? "Saving..."
                : selectedTemplateId === "new"
                  ? "Save Template"
                  : "Overwrite Template"}
            </DebouncedButton>
          </div>
        </form>
      </div>
    </div>
  )
}
