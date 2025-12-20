import * as React from "react"
import { useProject } from "@/contexts/project-context"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { SourceList } from "@/components/source-list"
import { AddSourceDialog } from "@/components/add-source-dialog"
import { FunctionList } from "@/components/function-list"
import { AddFunctionDialog } from "@/components/add-function-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronRight, Edit2, Plus, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function EditorSidebar() {
    const { project, updateProjectName } = useProject()
    const [isOpen, setIsOpen] = React.useState(true)
    const [isEditingName, setIsEditingName] = React.useState(false)
    const [editedName, setEditedName] = React.useState(project.name)
    const [addSourceOpen, setAddSourceOpen] = React.useState(false)
    const [addFunctionOpen, setAddFunctionOpen] = React.useState(false)
    const [sourcesOpen, setSourcesOpen] = React.useState(true)
    const [codeOpen, setCodeOpen] = React.useState(true)

    // Sync edited name when project name changes externally
    React.useEffect(() => {
        setEditedName(project.name)
    }, [project.name])

    const handleSaveName = () => {
        if (editedName.trim()) {
            updateProjectName(editedName.trim())
        } else {
            setEditedName(project.name)
        }
        setIsEditingName(false)
    }

    const handleCancelEdit = () => {
        setEditedName(project.name)
        setIsEditingName(false)
    }

    return (
        <div className={cn("flex h-full flex-col border-r border-border bg-background transition-all", isOpen ? "w-80" : "w-12")}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex h-full flex-col">
                <CollapsibleTrigger className="flex h-12 items-center gap-2 border-b border-border px-4 hover:bg-muted/50 transition-colors">
                    <ChevronRight
                        className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")}
                    />
                    {isOpen && <span className="text-sm font-medium">Project</span>}
                </CollapsibleTrigger>

                <CollapsibleContent className="flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-4 p-4">
                        {/* Project identifier - shown above name in small monospace */}
                        <div className="space-y-2">
                            <div className="text-[10px] font-mono text-muted-foreground leading-tight">
                                {project.identifier}
                            </div>

                            {/* Project name - editable */}
                            <div className="flex items-center gap-2">
                                {isEditingName ? (
                                    <div className="flex flex-1 items-center gap-2">
                                        <Input
                                            value={editedName}
                                            onChange={(e) => setEditedName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    handleSaveName()
                                                } else if (e.key === "Escape") {
                                                    handleCancelEdit()
                                                }
                                            }}
                                            className="h-8 text-base font-semibold"
                                            autoFocus
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={handleSaveName}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={handleCancelEdit}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="flex-1 text-base font-semibold">{project.name}</h2>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => setIsEditingName(true)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>

                            {project.description && (
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                            )}
                        </div>

                        {/* Sources section */}
                        <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
                            <div className="space-y-2">
                                <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-muted/50 rounded px-2 py-1.5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <ChevronRight
                                            className={cn("h-3 w-3 transition-transform", sourcesOpen && "rotate-90")}
                                        />
                                        <h3 className="text-sm font-medium text-muted-foreground">Sources</h3>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setAddSourceOpen(true)
                                        }}
                                        className="h-7 gap-1.5 px-2 text-xs"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SourceList />
                                </CollapsibleContent>
                            </div>
                        </Collapsible>

                        {/* Code section */}
                        <Collapsible open={codeOpen} onOpenChange={setCodeOpen}>
                            <div className="space-y-2">
                                <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-muted/50 rounded px-2 py-1.5 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <ChevronRight
                                            className={cn("h-3 w-3 transition-transform", codeOpen && "rotate-90")}
                                        />
                                        <h3 className="text-sm font-medium text-muted-foreground">Code</h3>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setAddFunctionOpen(true)
                                        }}
                                        className="h-7 gap-1.5 px-2 text-xs"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <FunctionList />
                                </CollapsibleContent>
                            </div>
                        </Collapsible>
                    </div>
                </CollapsibleContent>
            </Collapsible>
            <AddSourceDialog open={addSourceOpen} onOpenChange={setAddSourceOpen} />
            <AddFunctionDialog open={addFunctionOpen} onOpenChange={setAddFunctionOpen} />
        </div>
    )
}
