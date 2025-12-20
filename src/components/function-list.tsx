import * as React from "react"
import { useProject } from "@/contexts/project-context"
import { useEditor } from "@/contexts/editor-context"
import { cn } from "@/lib/utils"
import { FileCode, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FunctionList() {
    const { project, removeFunction } = useProject()
    const { loadFunction, activeFunctionFilename } = useEditor()
    const [hoveredFilename, setHoveredFilename] = React.useState<string | null>(null)

    const handleFunctionClick = (filename: string) => {
        loadFunction(filename)
    }

    const handleRemove = (e: React.MouseEvent, filename: string) => {
        e.stopPropagation()
        if (confirm(`Are you sure you want to delete "${filename}"?`)) {
            removeFunction(filename)
        }
    }

    if (project.functions.length === 0) {
        return (
            <div className="px-4 py-2 text-sm text-muted-foreground">No functions available</div>
        )
    }

    return (
        <div className="space-y-2">
            {project.functions.map((func) => {
                const isActive = activeFunctionFilename === func.filename

                return (
                    <div
                        key={func.filename}
                        className={cn(
                            "group relative flex flex-col gap-2 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors cursor-pointer",
                            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                            isActive && "ring-2 ring-ring ring-offset-2 bg-muted"
                        )}
                        onClick={() => handleFunctionClick(func.filename)}
                        onMouseEnter={() => setHoveredFilename(func.filename)}
                        onMouseLeave={() => setHoveredFilename(null)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleFunctionClick(func.filename)
                            }
                        }}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-sm font-medium font-mono">
                                    {func.filename}.ts
                                </span>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className={cn(
                                    "h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                    hoveredFilename === func.filename && "opacity-100"
                                )}
                                onClick={(e) => handleRemove(e, func.filename)}
                                onKeyDown={(e) => e.stopPropagation()}
                            >
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
