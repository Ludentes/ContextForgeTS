/**
 * Button component with built-in debouncing to prevent accidental multiple clicks.
 * Use this for critical actions like delete, save, submit, etc.
 */

import { useState, useCallback, useRef } from "react"
import { Button, type ButtonProps } from "./button"

interface DebouncedButtonProps extends ButtonProps {
  debounceMs?: number
}

export function DebouncedButton({
  onClick,
  disabled,
  debounceMs = 500,
  children,
  ...props
}: DebouncedButtonProps) {
  const [isDebouncing, setIsDebouncing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDebouncing || disabled) return

      // Call the original onClick handler
      onClick?.(e)

      // Start debounce period
      setIsDebouncing(true)

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        setIsDebouncing(false)
      }, debounceMs)
    },
    [onClick, disabled, isDebouncing, debounceMs]
  )

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || isDebouncing}
    >
      {children}
    </Button>
  )
}
