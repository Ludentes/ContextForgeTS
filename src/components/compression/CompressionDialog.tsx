/**
 * Compression Dialog - UI for merging and compressing multiple blocks.
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Id } from "../../../convex/_generated/dataModel"
import type { CompressionResult } from "@/lib/compression"
import { Minimize2, X } from "lucide-react"

interface BlockInfo {
  _id: Id<"blocks">
  content: string
  type: string
  tokens?: number
  isCompressed?: boolean
}

interface CompressionDialogProps {
  isOpen: boolean
  onClose: () => void
  blocks: BlockInfo[]
  onCompress: (targetZone: string, targetType: string) => Promise<void>
  isCompressing: boolean
  result: CompressionResult | null
  error: string | null
}

type Zone = "WORKING" | "STABLE" | "PERMANENT"

const ZONE_INFO: Record<Zone, { label: string; description: string }> = {
  PERMANENT: { label: "Permanent", description: "Always included" },
  STABLE: { label: "Stable", description: "Reference material" },
  WORKING: { label: "Working", description: "Draft content" },
}

export function CompressionDialog({
  isOpen,
  onClose,
  blocks,
  onCompress,
  isCompressing,
  result,
  error,
}: CompressionDialogProps) {
  const [targetZone, setTargetZone] = useState<Zone>("WORKING")
  const [targetType, setTargetType] = useState("note")

  if (!isOpen) return null

  // Calculate total tokens
  const totalTokens = blocks.reduce(
    (sum, block) => sum + (block.tokens || 0),
    0
  )

  const handleCompress = async () => {
    await onCompress(targetZone, targetType)
  }

  const handleClose = () => {
    if (!isCompressing) {
      onClose()
    }
  }

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !isCompressing) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Minimize2 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Compress & Merge Blocks</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isCompressing}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary */}
          <div className="rounded-lg border border-border p-3 bg-muted/50">
            <div className="text-sm font-medium mb-2">Merge Summary</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Blocks:</span>{" "}
                <span className="font-medium">{blocks.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total tokens:</span>{" "}
                <span className="font-medium">{totalTokens}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Expected ratio:</span>{" "}
                <span className="font-medium">~2.0x</span>
              </div>
              <div>
                <span className="text-muted-foreground">Target tokens:</span>{" "}
                <span className="font-medium">~{Math.ceil(totalTokens / 2)}</span>
              </div>
            </div>
          </div>

          {/* Block preview */}
          <div>
            <div className="text-sm font-medium mb-2">Blocks to merge:</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {blocks.map((block, index) => (
                <div
                  key={block._id}
                  className="rounded border border-border p-2 bg-card"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Block {index + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {block.type}
                    </span>
                    {block.tokens && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {block.tokens}t
                      </span>
                    )}
                    {block.isCompressed && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                        Compressed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground line-clamp-2">
                    {block.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Target zone and type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Target Zone
              </label>
              <select
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value as Zone)}
                disabled={isCompressing}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {Object.entries(ZONE_INFO).map(([zone, info]) => (
                  <option key={zone} value={zone}>
                    {info.label} - {info.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">
                Block Type
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                disabled={isCompressing}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="note">Note</option>
                <option value="summary">Summary</option>
                <option value="context">Context</option>
              </select>
            </div>
          </div>

          {/* Result display */}
          {result && result.success && (
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
              <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                ✓ Compression successful!
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Ratio:</span>{" "}
                  <span className="font-medium">
                    {result.compressionRatio.toFixed(1)}x
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Saved:</span>{" "}
                  <span className="font-medium">{result.tokensSaved} tokens</span>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            This will merge all blocks into one compressed block.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isCompressing}
            >
              {result?.success ? "Close" : "Cancel"}
            </Button>
            {!result?.success && (
              <Button
                onClick={handleCompress}
                disabled={isCompressing || blocks.length === 0}
              >
                {isCompressing ? "Compressing..." : "Compress & Merge"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
