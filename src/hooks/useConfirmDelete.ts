/**
 * Reusable hook for delete confirmation pattern.
 * Manages the state and logic for confirming destructive delete actions.
 */

import { useState, useCallback } from "react"

interface UseConfirmDeleteOptions<T> {
  onDelete: (item: T) => Promise<void>
  getTitle?: (item: T) => string
  getDescription?: (item: T) => string
}

export function useConfirmDelete<T>({
  onDelete,
  getTitle = () => "Delete item?",
  getDescription = () => "This action cannot be undone.",
}: UseConfirmDeleteOptions<T>) {
  const [itemToDelete, setItemToDelete] = useState<T | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const requestDelete = useCallback((item: T) => {
    setItemToDelete(item)
  }, [])

  const cancelDelete = useCallback(() => {
    if (!isDeleting) {
      setItemToDelete(null)
    }
  }, [isDeleting])

  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await onDelete(itemToDelete)
      setItemToDelete(null)
    } catch (error) {
      // Error will be handled by the mutation
      console.error("Delete failed:", error)
    } finally {
      setIsDeleting(false)
    }
  }, [itemToDelete, onDelete])

  return {
    itemToDelete,
    isDeleting,
    isOpen: itemToDelete !== null,
    title: itemToDelete ? getTitle(itemToDelete) : "",
    description: itemToDelete ? getDescription(itemToDelete) : "",
    requestDelete,
    cancelDelete,
    confirmDelete,
  }
}
