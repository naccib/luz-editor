import * as React from "react"
import { useEditor, type ImageLayout } from "@/contexts/editor-context"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import {
  Columns2Icon,
  Rows2Icon,
  ImageIcon,
  CodeIcon,
  Undo2Icon,
  Redo2Icon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const layoutOptions: Array<{
  value: ImageLayout
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
    { value: "side-by-side", label: "Side by Side", icon: Columns2Icon },
    { value: "stacked", label: "Stacked", icon: Rows2Icon },
    { value: "image-only", label: "Image Only", icon: ImageIcon },
    { value: "code-only", label: "Code Only", icon: CodeIcon },
  ]

interface EditorToolbarProps {
  position?: "top" | "bottom"
}

export function EditorToolbar({ position = "top" }: EditorToolbarProps) {
  const { imageLayout, setImageLayout, revert, restore, toolbarVisible, toggleToolbar, canRevert, canRestore } = useEditor()

  // Keyboard shortcut: Escape to toggle toolbar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleToolbar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleToolbar])

  const positionClasses =
    position === "bottom"
      ? "absolute left-1/2 bottom-4 z-50 -translate-x-1/2"
      : "absolute left-1/2 top-4 z-50 -translate-x-1/2"

  if (!toolbarVisible) {
    return (
      <div className={positionClasses}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleToolbar}
                className="rounded-2xl bg-background/80 backdrop-blur-md border border-border/50 shadow-lg hover:bg-muted/50"
                aria-label="Show toolbar"
              >
                <EyeIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show toolbar (Esc)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div className={positionClasses}>
      <TooltipProvider>
        <div className="rounded-2xl bg-background/80 backdrop-blur-md border border-border/50 shadow-lg p-1">
          <ButtonGroup className="bg-transparent border-0 shadow-none">
            {layoutOptions.map((option) => {
              const Icon = option.icon
              const isActive = imageLayout === option.value
              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setImageLayout(option.value)}
                      aria-label={option.label}
                      className={isActive ? "" : "hover:bg-muted/50"}
                    >
                      <Icon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{option.label}</TooltipContent>
                </Tooltip>
              )
            })}
            <ButtonGroupSeparator />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={revert}
                  disabled={!canRevert}
                  aria-label="Revert"
                  className="hover:bg-muted/50"
                >
                  <Undo2Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Revert</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={restore}
                  disabled={!canRestore}
                  aria-label="Restore"
                  className="hover:bg-muted/50"
                >
                  <Redo2Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore</TooltipContent>
            </Tooltip>
            <ButtonGroupSeparator />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleToolbar}
                  aria-label="Hide toolbar"
                  className="hover:bg-muted/50"
                >
                  <EyeOffIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hide toolbar (Esc)</TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </div>
      </TooltipProvider>
    </div>
  )
}

